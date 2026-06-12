-- client_admins — per-client switchboard for the worker's cron schedules
-- (F06 monitor, F07 followup) and the F05 admin deploy path.
--
-- The worker's schedules (packages/worker/src/schedules/{monitor,followup}.ts)
-- query this table via PostgREST with the service key to decide which slugs
-- to fan out each week, replacing the env-var-only MONITOR_SLUGS /
-- FOLLOWUP_SLUGS lists (those remain as a bootstrap/override UNION'd in).
-- Until this migration is applied the schedules log a one-time warning and
-- fall back to the env lists.
--
-- Column contract (consumed by the schedules + roadmap §4.4):
--   monitor_enabled / followup_enabled — opt-in per schedule; default OFF so
--     a freshly inserted row never surprises a client with email.
--   admin_paused — operator kill-switch; excludes the slug from BOTH
--     schedules without losing the enabled flags. Mirrors the CLI-side
--     `paused` flag in clients/<slug>/admin/state.json (admin/state.ts).
--   monitor_cadence — reserved per-client cron override (roadmap
--     `monitor_schedule`); the scheduler does not read it yet — today every
--     eligible slug runs on the global MONITOR_DEFAULT_CADENCE.
--   notify_email — where monitor reports / followup re-engagement notes go;
--     the schedules pass it to the CLI as `--to`. NULL = worker omits --to
--     and the CLI falls back to UPRIVER_MONITOR_TO / UPRIVER_FOLLOWUP_TO or
--     prints the report for manual forwarding.
--   engagement_ended_at — set manually by the operator when an engagement
--     closes; followup only picks up rows where this is 180+ days ago.
--   form_url / deployed_at — F05 admin-deploy wiring; the worker-side mirror
--     of clients/<slug>/admin/state.json. Repo identity intentionally does
--     NOT live here: the F05 webhook allowlist columns (repo_full_name,
--     webhook_active) are added by the sibling migration
--     20260612000110_client_admins_repo.sql, which is the single source of
--     truth for which repo a slug maps to.
--
-- Writes come exclusively from server-side callers holding the service-role
-- key (which bypasses RLS). RLS is enabled with NO policies, so anon and
-- authenticated roles can neither read nor write.
--
-- Apply via `pnpm dlx supabase db push` or the supabase MCP `apply_migration`
-- tool.

create table if not exists public.client_admins (
  -- Client slug; same kebab-case contract as the worker's event schema.
  slug                 text primary key
                         check (slug ~ '^[a-z0-9][a-z0-9-]*$'),
  monitor_enabled      boolean not null default false,
  followup_enabled     boolean not null default false,
  monitor_cadence      text,
  admin_paused         boolean not null default false,
  notify_email         text,
  engagement_ended_at  timestamptz,
  form_url             text,
  deployed_at          timestamptz,
  created_at           timestamptz not null default now(),
  updated_at           timestamptz not null default now()
);

-- Keep updated_at honest on service-role updates.
create or replace function public.client_admins_touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists client_admins_touch_updated_at on public.client_admins;
create trigger client_admins_touch_updated_at
  before update on public.client_admins
  for each row
  execute function public.client_admins_touch_updated_at();

-- The schedules' two queries are tiny scans gated on booleans; with the
-- expected row count (one per client) the pk suffices. Index the followup
-- date filter anyway so it stays cheap as history accumulates.
create index if not exists client_admins_engagement_ended_idx
  on public.client_admins (engagement_ended_at)
  where engagement_ended_at is not null;

-- RLS on, no policies: service-role only.
alter table public.client_admins enable row level security;
