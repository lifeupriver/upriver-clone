-- Audit log of operator-initiated dashboard actions.
--
-- Records who minted/revoked share tokens, who triggered which pipeline
-- run, etc. Operator-only history — clients never see this.
--
-- Inserts always come from the dashboard's server-side handlers using
-- the service-role key. Operators can SELECT to render the audit view.
-- Apply via `pnpm dlx supabase db push` when ready; the writer-side code
-- gates on `DASHBOARD_EVENTS_ENABLED=true` so this stays inert until
-- applied.

create table if not exists public.dashboard_events (
  id              uuid primary key default gen_random_uuid(),
  actor_user_id   uuid references auth.users (id) on delete set null,
  -- Free-form action verb (e.g. "share_token.mint", "share_token.revoke",
  -- "pipeline.enqueue"). String rather than enum so adding new event
  -- types doesn't require a migration.
  action          text not null,
  -- Slug the action targeted, when applicable. Nullable for system-level
  -- actions that don't bind to a single client.
  slug            text,
  -- Arbitrary structured payload. Schema is per-action; readers are
  -- responsible for handling missing fields gracefully.
  payload         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now()
);

create index if not exists dashboard_events_created_at_idx
  on public.dashboard_events (created_at desc);

create index if not exists dashboard_events_slug_created_idx
  on public.dashboard_events (slug, created_at desc)
  where slug is not null;

create index if not exists dashboard_events_actor_idx
  on public.dashboard_events (actor_user_id, created_at desc);

alter table public.dashboard_events enable row level security;

-- Operators (auth users with app_metadata.role = 'operator') can read.
-- The middleware already gates the dashboard surface on operator role,
-- so this RLS is a defense-in-depth check rather than the primary gate.
drop policy if exists dashboard_events_operator_read on public.dashboard_events;
create policy dashboard_events_operator_read
  on public.dashboard_events
  for select
  using (
    coalesce(
      (auth.jwt() -> 'app_metadata' ->> 'role') = 'operator',
      false
    )
  );

-- No anon/auth insert/update/delete policies — writes go through the
-- dashboard's server-side handlers using the service-role key.
