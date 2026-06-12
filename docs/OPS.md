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
| Worker deploy | `fly deploy --image ghcr.io/lifeupriver/upriver-worker:latest --config packages/worker/fly.toml --ha=false` — ALWAYS `--ha=false`: the worker is a single-machine app (Inngest delivers each step as its own HTTP request and steps share the local work dir; the volume also attaches to exactly one machine) |
| Worker volume | `upriver_data` mounted at `/data` (`UPRIVER_WORK_DIR=/data/upriver`); create once with `fly volumes create upriver_data --region iad --size 10 --app upriver-worker` |
| Migrations | `supabase/migrations/` — apply via `pnpm dlx supabase db push --linked` (see backlog §10 for the planned automation) |
| Rollback dashboard | Vercel → Deployments → ⋯ → Promote a prior deployment |
| Rollback worker | `fly releases --app upriver-worker` then `fly deploy --image <prior tag> --ha=false` |

## Health checks

```bash
curl https://upriver-platform.vercel.app/api/health     # → { ok: true, dataSource: 'supabase', version: '0.1.0' }
curl https://upriver-worker.fly.dev/healthz             # → ok
curl https://upriver-worker.fly.dev/api/inngest         # → JSON manifest
```

If `/api/health` returns 200 but `dataSource !== 'supabase'`, the
`UPRIVER_DATA_SOURCE` env var was reset on Vercel — restore it.

## F05 natural-language admin (change requests → draft PRs)

The worker serves `POST /webhook` (registered by default in
`packages/worker/src/serve.ts`); the `admin-webhook` Inngest function
processes accepted deliveries into **draft PRs** labeled `pending-review`
(blocked runs get a `needs-operator` comment instead). The bot never merges.

Per-client activation (full walkthrough is generated into
`clients/<slug>/admin/OPERATOR_GUIDE.md` by `upriver admin-deploy`):

1. `upriver admin-deploy <slug> --repo=<owner/repo>` — generates issue
   template, labels, the optional Vercel form, and the operator guide.
2. Allowlist the repo — the webhook is ignored until this row is active:

   ```sql
   update public.client_admins
      set repo_full_name = '<owner/repo>', webhook_active = true
    where slug = '<slug>';
   ```

3. Register the GitHub webhook on the client repo:
   - URL `https://upriver-worker.fly.dev/webhook`
   - Content type `application/json`
   - Secret: the worker's `GITHUB_WEBHOOK_SECRET` value
   - Events: **Issues** only

Pause a client: `admin_paused = true` in `client_admins` (webhook path) or
`upriver admin-pause <slug>` (local CLI runs). The repo that gets cloned
always comes from the `client_admins` row, never from the webhook payload.

**PIN story:** the client form PIN is minted with a CSPRNG at
`admin-deploy`, shown once in the operator's terminal, and stored only as a
scrypt hash (`FORM_PIN_HASH`). The form refuses submissions (503) until the
hash is configured, and rate-limits to 5/min per IP. Rotate with
`upriver admin-rotate-pin <slug>` — prints a fresh PIN once plus the new
hash to set on Vercel.

## Secrets reference

Environment variables expected on each surface. Required unless noted.

**Vercel (dashboard):**
- `UPRIVER_DATA_SOURCE=supabase`
- `UPRIVER_SUPABASE_URL`
- `UPRIVER_SUPABASE_PUBLISHABLE_KEY`
- `UPRIVER_SUPABASE_SERVICE_KEY` — required for share-token mint/revoke
- `INNGEST_EVENT_KEY` — required to enqueue jobs
- `INNGEST_SIGNING_KEY` — optional, surfaces auth on the Inngest UI
- `UPRIVER_UNSUBSCRIBE_SECRET` — required for the pitch engine's
  `/api/unsubscribe` endpoint (HMAC verification); **must equal the value
  the operator CLI uses for `pitch approve`**, or unsubscribe links in
  sent emails will 4xx

**Operator CLI (pitch engine sends):**
- `RESEND_API_KEY` — the actual send in `pitch approve`
- `UPRIVER_PITCH_FROM` — sender address (Resend-verified domain;
  falls back to the report-from default)
- `UPRIVER_OUTREACH_POSTAL` — physical-address footer (CAN-SPAM);
  `approve` refuses to send without one
- `UPRIVER_UNSUBSCRIBE_SECRET` — same value as the dashboard (above)
- `UPRIVER_DASHBOARD_BASE_URL` — origin for the preview/questionnaire
  links embedded in outreach email

Pitch takedown on request is `upriver pitch revoke <slug>` — revokes the
preview + questionnaire tokens and unstages the portal preview in one
command. Suppressed addresses live only in the Supabase
`outreach_suppression` table (never in the repo); `pitch approve`
refuses them automatically.

**Fly.io (worker):**
- `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
- `INNGEST_SERVE_HOST=https://upriver-worker.fly.dev`
- `UPRIVER_USE_API_KEY=1` + `ANTHROPIC_API_KEY` — required; there is no
  logged-in Claude session in the container, so the CLI must use the API key
- `FIRECRAWL_API_KEY`
- `UPRIVER_SUPABASE_URL`, `UPRIVER_SUPABASE_SERVICE_KEY` (legacy alias
  `UPRIVER_SUPABASE_SERVICE_ROLE_KEY` still accepted at startup, deprecated)
- `GITHUB_WEBHOOK_SECRET` — required for F05; without it `POST /webhook`
  fails closed (401 on every delivery)
- `UPRIVER_GITHUB_PAT` — required for F05; clone/push + GitHub REST for the
  admin bot. Never passed to the agent subprocess.
- `ADMIN_OPERATOR_SLACK_WEBHOOK` — optional; one-line F05 run summaries
- `RESEND_API_KEY` — optional; lets the monitor/followup crons email reports
- `UPRIVER_REPORT_FROM` — optional sender override (Resend-verified domain;
  default `reports@upriverhudsonvalley.com`)
- `UPRIVER_MONITOR_TO`, `UPRIVER_FOLLOWUP_TO` — optional fallback recipients
  when a client has no `client_admins.notify_email`
- `MONITOR_SLUGS`, `FOLLOWUP_SLUGS` — optional comma-separated slug lists
  UNION'd into cron eligibility alongside the `client_admins` table
  (migration `20260612000003_client_admins.sql`; see "Cron schedules +
  notifications" in `packages/worker/DEPLOY.md` for enable/pause SQL)
- `UPRIVER_WORK_DIR` is set in fly.toml (`/data/upriver`, the mounted
  volume) — not a secret; don't override it

`UPRIVER_RUN_TOKEN` is retired — purge it with `vercel env rm UPRIVER_RUN_TOKEN production --yes`
if it lingers (backlog §20).
