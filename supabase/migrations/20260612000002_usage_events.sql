-- usage_events — the telemetry sink @upriver/core has been writing to all along.
--
-- packages/core/src/usage/logger.ts POSTs to `/rest/v1/usage_events`, but no
-- migration ever created the table, so every insert 404'd and was swallowed by
-- the logger's catch (the local credit log was silently the only record).
--
-- Columns match the inserted record exactly: the `UsageEvent` shape from
-- packages/core/src/types/audit.ts spread together with the computed
-- `cost_usd` and `created_at` (logger.ts builds
-- `{ ...event, cost_usd, created_at }`; optional fields are omitted from the
-- JSON body when unset).
--
-- Writes come exclusively from server-side callers holding the service-role
-- key, which bypasses RLS. RLS is enabled with NO policies, so anon and
-- authenticated roles can neither read nor write.
--
-- Apply via `pnpm dlx supabase db push` or the supabase MCP `apply_migration`
-- tool.

create table if not exists public.usage_events (
  id            uuid primary key default gen_random_uuid(),
  -- Client this spend is attributed to.
  client_slug   text not null,
  -- 'firecrawl_scrape' | 'firecrawl_crawl' | 'firecrawl_map' |
  -- 'firecrawl_batch' | 'claude_api' | 'gsc_api' | 'ahrefs_api' — kept as
  -- plain text (no check constraint) so the logger can grow event types
  -- without a migration.
  event_type    text not null,
  -- CLI command that incurred the spend (e.g. 'scrape', 'audit').
  command       text not null,
  -- Claude model id, when event_type is an LLM call.
  model         text,
  -- Firecrawl credits, when event_type is a Firecrawl call.
  credits_used  numeric,
  input_tokens  bigint,
  output_tokens bigint,
  cost_usd      numeric not null default 0,
  created_at    timestamptz not null default now()
);

-- Cost roll-ups query one client over a time range, newest first.
create index if not exists usage_events_slug_created_idx
  on public.usage_events (client_slug, created_at desc);

-- RLS on, no policies: service-role only.
alter table public.usage_events enable row level security;
