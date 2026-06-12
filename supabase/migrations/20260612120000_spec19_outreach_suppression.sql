-- outreach_suppression (Spec 19 §8) — the do-not-contact list behind the
-- pitch engine's one-click unsubscribe.
--
-- Writes come from the dashboard's /api/unsubscribe endpoint (service-role
-- key, after HMAC verification of the unsubscribe token) and reads from the
-- CLI's `pitch approve`/`pitch batch` suppression check (service-role key).
-- RLS is enabled with NO policies: anon and authenticated roles can neither
-- read nor write — prospect email addresses never reach the browser.
--
-- Apply via `pnpm dlx supabase db push` or the supabase MCP `apply_migration`
-- tool.

create table if not exists public.outreach_suppression (
  id          uuid primary key default gen_random_uuid(),
  -- Stored lowercased; the unique index makes re-unsubscribing idempotent.
  email       text not null,
  -- The prospect slug whose email carried the unsubscribe link. Informational
  -- (suppression is per-EMAIL, not per-slug): one opt-out suppresses the
  -- address everywhere.
  slug        text,
  created_at  timestamptz not null default now()
);

create unique index if not exists outreach_suppression_email_idx
  on public.outreach_suppression (lower(email));

alter table public.outreach_suppression enable row level security;
