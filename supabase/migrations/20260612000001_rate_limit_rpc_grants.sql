-- Lock down the rate-limit RPCs: service-role execute only, plus a daily sweep.
--
-- `rate_limit_hit` and `rate_limit_sweep` (20260605000000_rate_limit_counters.sql)
-- are SECURITY DEFINER and were left with Postgres' default PUBLIC execute
-- grant, so anyone with the public anon key could call them through PostgREST:
-- spam `rate_limit_hit` to pre-fill arbitrary buckets (locking legitimate
-- writers out / growing the table), or invoke `rate_limit_sweep` at will.
--
-- Note on service_role: it bypasses RLS, NOT function ACLs — execute grants
-- still apply to it, so it needs an explicit grant once PUBLIC is revoked.
-- The dashboard's SupabaseRateLimiter (packages/dashboard/src/lib/rate-limit.ts)
-- calls `rate_limit_hit` with the service-role key in production. If a
-- deployment is misconfigured with only the publishable key, the RPC now
-- errors and the limiter degrades to its documented per-instance in-memory
-- fallback — fail safe, not fail open.
--
-- Apply via `pnpm dlx supabase db push` or the supabase MCP `apply_migration`
-- tool.

revoke execute on function public.rate_limit_hit(text, timestamptz, integer)
  from public, anon, authenticated;

revoke execute on function public.rate_limit_sweep()
  from public, anon, authenticated;

grant execute on function public.rate_limit_hit(text, timestamptz, integer)
  to service_role;

grant execute on function public.rate_limit_sweep()
  to service_role;

-- Schedule the sweep so expired buckets are reclaimed even when traffic stops
-- (the next write to a bucket reclaims only that bucket). Mirrors the pg_cron
-- pattern in 20260430024759_token_expiry_sweep.sql; 04:10 UTC keeps it clear
-- of the share-token sweep at 04:00. pg_cron runs jobs as the scheduling
-- (postgres) role, which is unaffected by the revokes above.

create extension if not exists pg_cron;

select cron.schedule(
  'rate_limit_counters_sweep',
  '10 4 * * *',
  $$select public.rate_limit_sweep()$$
);
