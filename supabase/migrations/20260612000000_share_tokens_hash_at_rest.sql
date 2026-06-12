-- Lock down share_tokens: drop the anon-read policy, hash tokens at rest.
--
-- The Phase 4 migration (20260429000001_phase4_share_tokens.sql) enabled RLS
-- but added `share_tokens_anon_read ... for select using (true)` so the
-- dashboard could validate tokens with the anon key. That policy let ANYONE
-- holding the public anon key dump every plaintext token via PostgREST
-- (`GET /rest/v1/share_tokens`) — i.e. a working share link for every client.
--
-- Two changes, shipped together with the dashboard's share-token.ts update:
--
--   1. Drop the anon-read policy (the only policy on the table). With RLS on
--      and no policies, anon/authenticated reads return nothing. The dashboard
--      now validates with the service-role client, which bypasses RLS, so
--      server-side mint/validate/list/revoke keep working.
--
--   2. Hash tokens at rest (sha256 hex). A future leak (backup, dump, misadded
--      policy) yields digests, not usable links. share-token.ts stores
--      sha256(token) on mint, hashes the presented token before the equality
--      lookup on validate, and returns the plaintext exactly once — at mint.
--
-- Deploy the dashboard change in the same window: older dashboard code
-- (anon-key reads, plaintext lookups) stops validating once this lands.
--
-- Apply via `pnpm dlx supabase db push` or the supabase MCP `apply_migration`
-- tool.

drop policy if exists share_tokens_anon_read on public.share_tokens;

-- digest() comes from pgcrypto. Phase 4 already created the extension, but be
-- explicit so this migration stands alone on a fresh database.
create extension if not exists pgcrypto;

-- Hash existing rows in place. Guarded so an accidental re-run can't
-- double-hash: minted plaintext tokens are 32-char base64url and can never
-- match a 64-char lowercase-hex sha256 digest.
update public.share_tokens
set token = encode(digest(token, 'sha256'), 'hex')
where token !~ '^[0-9a-f]{64}$';
