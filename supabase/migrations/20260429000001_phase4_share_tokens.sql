-- Phase 4 — share-token registry for /deliverables/<slug>/*
--
-- Replaces the per-client `share-token.json` flow that lived alongside the
-- local filesystem. Each row authorizes anonymous read access to one slug's
-- deliverables until expiry. Operator-only routes (/clients/*,
-- /api/enqueue/*) are gated by Supabase Auth session role, NOT by this table.
--
-- Apply via:
--   pnpm dlx supabase db push
-- or via the supabase MCP `apply_migration` tool.

create extension if not exists pgcrypto;

create table if not exists public.share_tokens (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null,
  token       text not null,
  created_at  timestamptz not null default now(),
  expires_at  timestamptz,
  -- Free-form label (e.g. operator's note: "alex@client-co.com 2026-05 review").
  label       text,
  -- Operator who minted this token. Nullable for tokens minted before auth
  -- went live; new rows always carry the operator's auth.uid().
  created_by  uuid references auth.users (id) on delete set null
);

-- Lookups always come in as (slug, token) tuples from the route handler.
create unique index if not exists share_tokens_slug_token_uniq
  on public.share_tokens (slug, token);

-- Operator dashboards may want to see all tokens for a slug, ordered by
-- recency.
create index if not exists share_tokens_slug_created_idx
  on public.share_tokens (slug, created_at desc);

-- RLS: anon can SELECT (token validation reads the table directly); only the
-- service-role key can write.
alter table public.share_tokens enable row level security;

drop policy if exists share_tokens_anon_read on public.share_tokens;
create policy share_tokens_anon_read
  on public.share_tokens
  for select
  using (true);

-- No anon insert/update/delete policies — writes go through the dashboard's
-- server-side handlers using the service-role key.
