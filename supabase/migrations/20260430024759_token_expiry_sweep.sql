-- Daily cleanup of expired share_tokens.
--
-- Rows past `expires_at` linger in the table forever today. Operationally
-- harmless at our volume but the operator UI for share tokens shows
-- expired rows alongside live ones, which dilutes the signal. A 7-day
-- grace window keeps them around long enough for an operator to notice
-- accidental expiries before the row is gone.
--
-- pg_cron runs in the postgres database in the supabase Postgres
-- offering. The schedule below runs at 04:00 UTC daily.

create extension if not exists pg_cron;

select cron.schedule(
  'share_tokens_expiry_sweep',
  '0 4 * * *',
  $$delete from public.share_tokens
    where expires_at is not null
      and expires_at < now() - interval '7 days'$$
);
