-- Distributed fixed-window rate-limit counters for the coverage chatbot's
-- profile write endpoint (POST /api/profile/<slug>).
--
-- The endpoint previously rate-limited per token in process memory, which only
-- protects the single Vercel instance serving a given request. Across a fanned-
-- out deployment that multiplies the effective budget by the instance count.
-- This table plus the rate_limit_hit() RPC make the window coherent: each
-- (token, window) bucket is one row, incremented atomically, shared by every
-- instance.
--
-- Nothing here is durable state — rows are disposable counters. The next write
-- to a bucket (or rate_limit_sweep()) reclaims expired ones. Writes come
-- exclusively from the dashboard's server-side handlers using the service-role
-- key, via rpc('rate_limit_hit', ...).
--
-- Apply via `pnpm dlx supabase db push` or the supabase MCP `apply_migration`
-- tool. Until applied, the limiter degrades to per-instance in-memory counting
-- (SupabaseRateLimiter's fail-safe fallback), so shipping the code ahead of the
-- migration does not break the endpoint.

create table if not exists public.rate_limit_counters (
  bucket_key    text primary key,
  count         integer not null default 0,
  window_start  timestamptz not null,
  expires_at    timestamptz not null
);

-- Sweep support: find expired buckets cheaply.
create index if not exists rate_limit_counters_expires_idx
  on public.rate_limit_counters (expires_at);

-- Atomic increment-and-read for one (key, window) bucket. Inserts the row on
-- the first hit and increments it on subsequent hits, returning the
-- post-increment count so the caller can compare against its max. SECURITY
-- DEFINER so a future least-privilege key can call it without direct table
-- grants; the service-role key already bypasses RLS.
create or replace function public.rate_limit_hit(
  p_bucket text,
  p_window_start timestamptz,
  p_ttl_seconds integer
) returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  new_count integer;
begin
  insert into public.rate_limit_counters as c (bucket_key, count, window_start, expires_at)
  values (p_bucket, 1, p_window_start, now() + make_interval(secs => p_ttl_seconds))
  on conflict (bucket_key) do update
    set count = c.count + 1
  returning c.count into new_count;
  return new_count;
end;
$$;

-- Opportunistic GC of expired buckets. Safe to call from a scheduled job
-- (pg_cron / Edge Function); returns how many rows it reclaimed.
create or replace function public.rate_limit_sweep() returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  removed integer;
begin
  delete from public.rate_limit_counters where expires_at < now();
  get diagnostics removed = row_count;
  return removed;
end;
$$;

-- RLS on, with no anon/auth policies: only the service-role key (which bypasses
-- RLS) and the SECURITY DEFINER functions above touch this table. Clients never
-- read or write rate-limit state directly.
alter table public.rate_limit_counters enable row level security;
