# Upriver Operations

Day-2 reference for the hosted Upriver platform. For engineer-facing setup
(local dev, building, testing) see `README.md`. For end-to-end usage see
`docs/USER-GUIDE.md`.

## Hosted environments

| Surface | URL | Notes |
| --- | --- | --- |
| Dashboard | <https://upriver-platform.vercel.app> | Vercel production |
| Worker | <https://upriver-worker.fly.dev> | Fly.io app `upriver-worker`, Inngest serve at `/api/inngest`, healthcheck at `/healthz` |
| Database | Supabase project `qavbpfmhgvkhrnbqalrp` | Postgres + Auth + Storage bucket `upriver` |

## Supabase Auth → Resend SMTP

Supabase's built-in email sender is rate-limited to **4 messages/hour** —
fine for local dev, not enough once magic-link sign-ins and share-link
emails ramp. Production pipes Auth email through Resend.

**Configured at:** Supabase Dashboard → Authentication → Emails →
SMTP Settings.

| Field | Value |
| --- | --- |
| Sender email | `noreply@upriverhudsonvalley.com` |
| Sender name | `Upriver` |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | `RESEND_API_KEY` (the live API key, not the env-var name) |
| Minimum interval | `0` (Resend handles its own rate limiting) |

Wiring this lifts the 4/hour cap and routes deliveries through Resend's
deliverability infrastructure — verified domain (`upriverhudsonvalley.com`),
DKIM, SPF, etc.

If sign-in emails ever stop arriving:

1. Check Resend → Logs for the most recent send.
2. Check Supabase → Authentication → Logs for the OTP request.
3. Confirm `RESEND_API_KEY` hasn't been rotated; reset in the SMTP form
   if it has.

## Operator allowlist

A user becomes an "operator" when their auth row carries
`raw_app_meta_data.role = 'operator'`. Today this is granted manually via
SQL after the user signs in once (which is what creates their `auth.users`
row).

```sql
update auth.users
  set raw_app_meta_data = jsonb_set(coalesce(raw_app_meta_data, '{}'), '{role}', '"operator"')
  where email = 'someone@example.com';
```

Until that update runs the user can sign in but every operator-only path
returns to `/login`. Backlog item §18 tracks moving this to a proper
`operator_allowlist` table with a UI.

## Share tokens

`share_tokens` rows gate `/deliverables/<slug>?t=<token>` access for
non-operators. Mint via the dashboard at `/clients/<slug>/share` (operator
session required) or directly via SQL:

```sql
insert into public.share_tokens (slug, token, expires_at, label)
  values ('audreys', encode(gen_random_bytes(24), 'base64'), now() + interval '90 days', 'launch review');
```

The dashboard's share UI is the recommended path — it copies the URL to
the clipboard and tracks `created_by` automatically.

## Deploy + recovery

| Concern | How |
| --- | --- |
| Dashboard deploy | `git push` to `main` triggers Vercel; preview deploys on every PR |
| Worker image | `.github/workflows/worker-image.yml` builds + pushes to GHCR on `main` push |
| Worker deploy | `fly deploy --image ghcr.io/lifeupriver/upriver-worker:latest --config packages/worker/fly.toml` |
| Migrations | `supabase/migrations/` — apply via `pnpm dlx supabase db push --linked` (see backlog §10 for the planned automation) |
| Rollback dashboard | Vercel → Deployments → ⋯ → Promote a prior deployment |
| Rollback worker | `fly releases --app upriver-worker` then `fly deploy --image <prior tag>` |

## Health checks

```bash
curl https://upriver-platform.vercel.app/api/health     # → { ok: true, dataSource: 'supabase', version: '0.1.0' }
curl https://upriver-worker.fly.dev/healthz             # → ok
curl https://upriver-worker.fly.dev/api/inngest         # → JSON manifest
```

If `/api/health` returns 200 but `dataSource !== 'supabase'`, the
`UPRIVER_DATA_SOURCE` env var was reset on Vercel — restore it.

## Secrets reference

Environment variables expected on each surface. Required unless noted.

**Vercel (dashboard):**
- `UPRIVER_DATA_SOURCE=supabase`
- `UPRIVER_SUPABASE_URL`
- `UPRIVER_SUPABASE_PUBLISHABLE_KEY`
- `UPRIVER_SUPABASE_SERVICE_KEY` — required for share-token mint/revoke
- `INNGEST_EVENT_KEY` — required to enqueue jobs
- `INNGEST_SIGNING_KEY` — optional, surfaces auth on the Inngest UI

**Fly.io (worker):**
- `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
- `INNGEST_SERVE_HOST=https://upriver-worker.fly.dev`
- `ANTHROPIC_API_KEY`
- `FIRECRAWL_API_KEY`
- `UPRIVER_SUPABASE_URL`, `UPRIVER_SUPABASE_SERVICE_ROLE_KEY`

`UPRIVER_RUN_TOKEN` is retired — purge it with `vercel env rm UPRIVER_RUN_TOKEN production --yes`
if it lingers (backlog §20).
