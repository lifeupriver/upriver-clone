-- F05 admin webhook allowlist columns on client_admins.
--
-- The worker's admin-webhook Inngest function resolves every incoming GitHub
-- `issues` event against this table: a change request is processed ONLY when
-- a row exists with `repo_full_name` exactly matching the event's repository
-- AND `webhook_active = true` AND `admin_paused = false`. The webhook payload
-- never chooses the repo — the clone URL is rebuilt from `repo_full_name` on
-- the matched row.
--
-- The base `client_admins` table is created by a sibling migration in this
-- same release window. Guards (`if exists` / `if not exists` / to_regclass)
-- keep this file order-independent and re-runnable.
--
-- Activation per client (operator-run SQL; see docs/OPS.md "F05" section):
--   update public.client_admins
--      set repo_full_name = 'owner/repo', webhook_active = true
--    where slug = '<slug>';

alter table if exists public.client_admins
  add column if not exists repo_full_name text,
  add column if not exists webhook_active boolean not null default false;

-- One client per repo: two rows claiming the same repo_full_name would make
-- the allowlist lookup ambiguous (and let a second slug ride another
-- client's webhook). Partial unique index so unset rows don't collide.
do $$
begin
  if to_regclass('public.client_admins') is not null then
    create unique index if not exists client_admins_repo_full_name_key
      on public.client_admins (repo_full_name)
      where repo_full_name is not null;
  end if;
end $$;
