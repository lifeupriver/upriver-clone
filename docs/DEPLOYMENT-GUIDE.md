# Upriver Deployment Guide — getting client share links live

This is the "everything you need to do outside the codebase" guide.
The goal you set: **work locally on a client, then push the dashboard
to Vercel so you can send a single URL to the client to look at their
deliverables.** Everything below is in the order you should do it.

If you only read one section, read **Part 0 — what state are we in**
and **Part 1 — the minimum path to a client share link.**

---

## Table of contents

- Part 0 — Where we are right now (audit of what's done vs. left)
- Part 1 — Minimum path: dashboard live on Vercel + first share link
- Part 2 — Apply the two pending Supabase migrations
- Part 3 — Resend + email domain (so magic links and report emails work)
- Part 4 — Phase 3 worker (so the dashboard's Run buttons actually run)
- Part 5 — Domains and DNS (`reports.upriverhudsonvalley.com`, etc.)
- Part 6 — Daily client workflow once everything is wired
- Part 7 — What to do when things break
- Part 8 — Optional / later (Sentry, GitHub OAuth, automigrations, etc.)
- Appendix A — Full env-var reference per surface
- Appendix B — Account checklist (every external service you need)

---

## Part 0 — Where we are right now

This is what was already done before this guide was written, so you
can skip steps you already did.

### Already shipped in code (no operator action required)

- `@astrojs/vercel` adapter is in `packages/dashboard` (Phase 1 done).
- Storage abstraction reads from either local disk or Supabase Storage
  bucket `upriver` based on `UPRIVER_DATA_SOURCE` (Phase 2 done).
- `upriver sync push <slug>` / `sync pull <slug>` commands work.
- Supabase Auth + middleware gate `/clients/*` to operators; share
  tokens gate `/deliverables/<slug>?t=<token>` (Phase 4 done).
- `/api/health`, `/api/share-tokens`, branded error pages
  (`/auth/expired`, `/deliverables/expired`, branded 404) all live.
- Two committed-but-unapplied migrations are on the branch:
  - `supabase/migrations/20260430024759_token_expiry_sweep.sql`
  - `supabase/migrations/20260430024807_dashboard_events.sql`
- Worker package (`packages/worker/`) and Inngest serve handler are
  code-complete and Dockerfile is pinned.

### Already provisioned externally (per OPS.md)

- Vercel project at <https://upriver-platform.vercel.app>.
- Supabase project `qavbpfmhgvkhrnbqalrp` (Postgres + Auth + Storage
  bucket `upriver`).
- Resend SMTP wired into Supabase Auth (so magic-link emails go through
  Resend instead of Supabase's 4/hour built-in mailer).
- Operator role granted on `joshua@joshuabrownphotography.com`.

### Still to do (this guide walks through each)

| # | Item | Required for | Effort |
|---|------|--------------|--------|
| 1 | Verify Vercel env vars (especially `UPRIVER_SUPABASE_SERVICE_KEY`) | Minting share links | 5 min |
| 2 | Apply `token_expiry_sweep` migration | Auto-cleanup of expired tokens | 5 min |
| 3 | Apply `dashboard_events` migration + flip `DASHBOARD_EVENTS_ENABLED=true` | Audit log of operator actions | 10 min |
| 4 | Sync your existing local clients to the Supabase bucket | First share link | 5 min per client |
| 5 | Mint share token + send first client URL | Sales motion | 2 min per client |
| 6 | Drop dead `UPRIVER_RUN_TOKEN` env vars | Cleanup | 30 sec |
| 7 | Sign up for Inngest Cloud + Fly.io, deploy worker | Hosted Run buttons | 30–60 min |
| 8 | Verify `reports.upriverhudsonvalley.com` DNS / Resend domain | `report send` emails | 15 min |
| 9 | Set up GitHub Actions secrets for migration workflow | Automated migration deploys | 15 min |
| 10 | (Optional) Sentry, GitHub OAuth, additional operators | Polish | varies |

The bulk of the value — sending a client a dashboard URL — needs only
items 1, 2, 4, and 5. The rest is polish or unblocks the hosted "Run"
button.

---

## Part 1 — Minimum path: dashboard live + first share link

This is the shortest route to "I can send a client a URL and they see
their deliverables." End-to-end ~30 minutes.

### 1.1 Confirm you can sign in to the hosted dashboard

1. Open <https://upriver-platform.vercel.app/login> in a clean browser
   (incognito is fine).
2. Type `joshua@joshuabrownphotography.com` and click **Send magic link**.
3. Open the email Resend delivers. Click the magic link.
4. You should land on `/clients` (the operator home).

If you get bounced back to `/login`, your `auth.users` row exists but
the operator role isn't set. Run this SQL in **Supabase Dashboard →
SQL Editor** (or via the Supabase MCP if it's still wired up):

```sql
update auth.users
  set raw_app_meta_data = jsonb_set(
    coalesce(raw_app_meta_data, '{}'::jsonb),
    '{role}',
    '"operator"'::jsonb
  )
  where email = 'joshua@joshuabrownphotography.com';
```

Then sign out at `/auth/signout` and sign back in so the JWT picks up
the new role.

If the magic-link email never arrives, jump to **Part 3** (Resend +
SMTP).

### 1.2 Verify the four required Vercel env vars

Go to **Vercel → upriver-platform → Settings → Environment Variables**.
You should see, on **Production**:

| Variable | Required | What it is |
|---|---|---|
| `UPRIVER_DATA_SOURCE` | yes | Must be `supabase` |
| `UPRIVER_SUPABASE_URL` | yes | `https://qavbpfmhgvkhrnbqalrp.supabase.co` |
| `UPRIVER_SUPABASE_PUBLISHABLE_KEY` | yes | `sb_publishable_...` (browser-safe) |
| `UPRIVER_SUPABASE_SERVICE_KEY` | yes | `eyJ...` service-role (server-only). **Most likely missing.** |

If `UPRIVER_SUPABASE_SERVICE_KEY` isn't set, share-link minting will
load the page but throw "service-role key required" the moment you
click **Mint share link**.

To grab the service-role key:
1. Open **Supabase Dashboard → Project Settings → API**.
2. Under "Project API keys" copy the **service_role** key (NOT the
   `anon` / publishable key).
3. Back in Vercel: **Add New** → Name `UPRIVER_SUPABASE_SERVICE_KEY`,
   value = the key, environments = Production + Preview.
4. Click **Save**.
5. Trigger a redeploy: **Deployments → ⋯ on the latest → Redeploy**.

You can verify with:

```bash
curl https://upriver-platform.vercel.app/api/health
# → { "ok": true, "dataSource": "supabase", "version": "0.1.0" }
```

### 1.3 Drop the stale `UPRIVER_RUN_TOKEN` env var (cleanup)

It was retired in code months ago. To remove from Vercel without the
Vercel CLI, go to **Settings → Environment Variables**, find
`UPRIVER_RUN_TOKEN`, click **⋯ → Remove** for each environment.

If you have the Vercel CLI installed locally:
```bash
vercel env rm UPRIVER_RUN_TOKEN production --yes
vercel env rm UPRIVER_RUN_TOKEN development --yes
```

### 1.4 Push your first client to the Supabase bucket

Until you `sync push`, the hosted dashboard shows zero clients (it's
reading from the bucket, not your laptop disk).

```bash
cd /path/to/upriver-clone
upriver sync push <slug>
```

Replace `<slug>` with the kebab-case id of a client you've already run
the pipeline against (e.g. `littlefriends`, `audreys`). The command:

- Walks `clients/<slug>/` recursively.
- Skips `node_modules/`, `.git/`, `.DS_Store`.
- Uploads each file to `bucket:upriver/clients/<slug>/`.
- Prints `pushed: N files / X MB` when done.

Re-running is idempotent — it skips files already at matching size +
mtime.

You can verify in **Supabase Dashboard → Storage → upriver bucket →
clients/`<slug>`/** — you should see `audit-package.json`, `pages/`,
`screenshots/`, etc.

Now refresh <https://upriver-platform.vercel.app/clients>. The slug
should appear in the operator list.

### 1.5 Mint a share link and send to the client

1. From the operator dashboard, click into the client.
2. Open the **Share Links** quick-nav (the page is at
   `/clients/<slug>/share`).
3. Set a label so future-you remembers who got the link
   (e.g. `alex@audreys.com — launch review`).
4. Pick an expiry — default 90 days; pick shorter if the client should
   be nudged to act.
5. Click **Mint share link**. The URL is auto-copied to your clipboard.
   It looks like:

   `https://upriver-platform.vercel.app/deliverables/<slug>?t=<token>`

6. Paste into an email — use the **Audit delivery** template in
   `docs/EMAIL-TEMPLATES.md` as a starting point.

The client clicks the link and sees `/deliverables/<slug>` (and any
sub-routes like `/deliverables/<slug>/audit-report`,
`/deliverables/<slug>/scorecard`) without signing in. They cannot reach
the operator dashboard or any other client's data.

To revoke: same page, click **Revoke** on the row. Anyone holding the
link gets the branded "this link has expired" page immediately.

### 1.6 What the client experience looks like (sanity check)

After you mint the link, open it in incognito (don't sign in) and walk
through it like a client would:

- The deliverable index lands on the audit report.
- Branded chrome should pull from the client's `brandingProfile` (logo
  + primary colour) — not Upriver's defaults. If you see Upriver
  defaults, the branding extraction during `init` didn't catch the
  client's brand; re-run `init` with explicit overrides or hand-edit
  `clients/<slug>/audit-package.json` then `sync push` again.
- All screenshots load (they live in `bucket:upriver/clients/<slug>/screenshots/`).
- Print preview looks reasonable (the report has `@media print` rules).

If anything 503s, check Vercel **Functions → Logs** for the runtime
error — usually it's a missing env var.

---

## Part 2 — Apply the two pending Supabase migrations

Two migrations are committed in `supabase/migrations/` but haven't been
applied to the live Postgres yet. They are non-destructive — they add
a cron job and an audit-log table.

### 2.1 What the migrations do

`20260430024759_token_expiry_sweep.sql`
- Schedules a daily Postgres `pg_cron` job that deletes
  `share_tokens` rows where `expires_at < now() - interval '7 days'`.
- Effect: expired tokens auto-clean after a 7-day grace.
- Without it, expired tokens accumulate forever (operationally fine
  for low volume, but the dashboard "Share Links" UI gets noisy).

`20260430024807_dashboard_events.sql`
- Creates a `dashboard_events` audit-log table. Records who minted /
  revoked which token, who triggered which pipeline run, when.
- Operator-only read RLS; service-role insert.
- Effect: history view at (eventually) `/clients/<slug>/log`.
- Without it, you have no record of "who shared this with who when"
  beyond `share_tokens.created_by`.

### 2.2 Apply them — option A: Supabase CLI (recommended)

If you have `supabase` CLI installed and your project is linked:

```bash
cd /path/to/upriver-clone
pnpm dlx supabase login                # only first time
pnpm dlx supabase link --project-ref qavbpfmhgvkhrnbqalrp
pnpm dlx supabase db push --linked
```

`db push` is idempotent — it only applies migrations that aren't yet
recorded in the `supabase_migrations.schema_migrations` table on the
live DB.

### 2.3 Apply them — option B: paste SQL into the Supabase dashboard

If you don't want to install the CLI:

1. Open `supabase/migrations/20260430024759_token_expiry_sweep.sql`
   in your editor and copy the contents.
2. Go to **Supabase Dashboard → SQL Editor → New query**.
3. Paste, run. Confirm "Success".
4. Repeat for `20260430024807_dashboard_events.sql`.

If `pg_cron` extension isn't enabled on your project, the first
migration will error with "extension pg_cron is not available". Fix:
**Database → Extensions → pg_cron → Enable** in the dashboard, then
retry.

### 2.4 Flip the dashboard-events writer on

The writer (`packages/dashboard/src/lib/dashboard-events.ts`) is
import-safe — it returns `false` instead of throwing when the env flag
is unset. After the migration applies:

1. In Vercel: **Settings → Environment Variables → Add New**.
2. Name `DASHBOARD_EVENTS_ENABLED`, value `true`, environments
   Production + Preview.
3. **Deployments → Redeploy latest**.

Verify by minting a share token and then querying in the SQL editor:

```sql
select * from public.dashboard_events order by created_at desc limit 10;
```

You should see a `share_token.minted` row.

### 2.5 (Optional) Set up GitHub Actions secrets so future migrations auto-deploy

Future schema changes shouldn't need manual `db push`. Add an
`automigrations` workflow:

1. **Supabase Dashboard → Project Settings → Database → Connection
   string** — copy the database password.
2. **Supabase Dashboard → Account Settings → Access Tokens → Generate
   new token** — copy the access token.
3. In GitHub: **Repo → Settings → Secrets and variables → Actions →
   New repository secret**. Add:
   - `SUPABASE_ACCESS_TOKEN` (the access token)
   - `SUPABASE_PROJECT_REF` = `qavbpfmhgvkhrnbqalrp`
   - `SUPABASE_DB_PASSWORD` (the DB password)
4. Create `.github/workflows/automigrations.yml` (the file doesn't
   exist yet — backlog item #10). Sample:

   ```yaml
   name: automigrations
   on:
     push:
       branches: [main]
       paths:
         - 'supabase/migrations/**'
   jobs:
     migrate:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v4
         - uses: supabase/setup-cli@v1
         - run: |
             supabase link --project-ref ${{ secrets.SUPABASE_PROJECT_REF }} \
               --password ${{ secrets.SUPABASE_DB_PASSWORD }}
             supabase db push --linked
           env:
             SUPABASE_ACCESS_TOKEN: ${{ secrets.SUPABASE_ACCESS_TOKEN }}
   ```

This is optional — for one-operator volumes, manual `db push` is fine.

---

## Part 3 — Resend + email domain

There are **two separate email paths**, and both go through Resend.
Don't confuse them.

| Path | What it sends | Configured at |
|---|---|---|
| Supabase Auth → Resend SMTP | Magic-link sign-in emails to operators | Supabase Auth → SMTP Settings |
| `upriver report send` → Resend API | Branded audit-delivery emails to clients | `.env` on your laptop / worker |

Both rely on a **verified sending domain** in Resend. The default
sender domain is `upriverhudsonvalley.com`.

### 3.1 Verify the Resend account + domain

1. Go to <https://resend.com/login> and sign in.
2. **Domains → upriverhudsonvalley.com**.
3. Status should be **Verified**. If it shows pending, you need to add
   the SPF, DKIM, and DMARC DNS records Resend lists — paste them into
   your DNS provider (whoever hosts `upriverhudsonvalley.com`).
4. Once Resend reports verified, both `noreply@upriverhudsonvalley.com`
   (Auth) and `reports@upriverhudsonvalley.com` (report send) work.

### 3.2 Confirm Supabase Auth SMTP wiring

1. **Supabase Dashboard → Authentication → Emails → SMTP Settings**.
2. Settings should match (per `docs/OPS.md`):

   | Field | Value |
   |---|---|
   | Sender email | `noreply@upriverhudsonvalley.com` |
   | Sender name | `Upriver` |
   | Host | `smtp.resend.com` |
   | Port | `465` |
   | Username | `resend` |
   | Password | Your Resend API key (the `re_...` value, not the env-var name) |
   | Minimum interval | `0` |

3. If anything's off, fix it. Save.

To test: sign out of the dashboard, then request a magic link. The
email should arrive in <30 seconds. Check Resend → **Logs** — you'll
see the send and delivery events. Check Supabase → **Authentication →
Logs** for the `mail.send` event.

If the Resend API key was rotated, update both:
- Supabase Auth SMTP Settings → Password field
- Wherever the CLI uses it (`.env`, Vercel env, Fly secrets)

### 3.3 Wire `upriver report send` for branded client emails

This is for the audit-delivery email template — when you want to send
a polished email through Resend (rather than copy-pasting the share URL
into Gmail).

1. Generate a Resend API key at **Resend → API Keys → Create API
   key**. Scope: **Full access** (it needs to send).
2. Copy the value (starts with `re_`).
3. Add to your laptop's `.env`:

   ```
   RESEND_API_KEY=re_...
   UPRIVER_REPORT_FROM=reports@upriverhudsonvalley.com
   UPRIVER_REPORT_HOST=https://reports.upriverhudsonvalley.com
   ```

4. (Later, when the worker is deployed) add the same three to Fly.io
   secrets — see Part 4.

Test:
```bash
upriver report send <slug> --to your-own-email@example.com --dry-run
# prints what it would send
upriver report send <slug> --to your-own-email@example.com
# actually sends via Resend
```

If `RESEND_API_KEY` is unset, `report send` falls back to "manual
print" mode — it logs the rendered email body for you to paste into
your mail client. That's fine for low volume.

### 3.4 Where the share-link host comes from

When `upriver report send` builds the share URL, it uses
`UPRIVER_REPORT_HOST` (default `https://reports.upriverhudsonvalley.com`).
You have two choices:

(a) **Use the Vercel default** — set `UPRIVER_REPORT_HOST=https://upriver-platform.vercel.app`
    and skip Part 5 (DNS). Less polished but works today.

(b) **Set up a custom domain** — point `reports.upriverhudsonvalley.com`
    at the Vercel project. Polished, but requires DNS work. See Part 5.

Recommendation: ship (a) first to start sending links, then move to
(b) when you've sent a few and confirmed the flow works.

---

## Part 4 — Phase 3 worker (so the dashboard's Run buttons run)

**You can skip this entire section** if you only want the dashboard
to be a viewer for clients. Your local `upriver` CLI keeps doing the
work, you `sync push`, the client sees the result.

You only need the worker if you want the **Run** buttons in the hosted
dashboard to actually execute pipeline stages remotely (so you don't
need a terminal open on your laptop).

### 4.1 What you're provisioning

Three external services:

1. **Inngest Cloud** — durable job queue + run history. Free tier
   covers expected volume.
2. **Fly.io** — runs the worker container that consumes Inngest
   events and runs `upriver` commands. Free tier covers idle.
3. **GitHub Container Registry (GHCR)** — hosts the worker container
   image. Free for public images.

The flow once live:
```
Operator clicks "Run" in /clients/<slug>
  → Vercel /api/enqueue → Inngest event sent
    → Inngest delivers to Fly.io worker via /api/inngest endpoint
      → Worker pulls bucket data, runs `upriver scrape <slug>` etc.
        → Worker pushes results back to bucket
          → Dashboard SSE polls /api/jobs/<id>, shows live status
```

### 4.2 Sign up for Inngest Cloud

1. Go to <https://app.inngest.com> → Sign up. Use the same email as
   the operator allowlist if you want consistency.
2. Create an environment named `production`.
3. Settings → **Event Keys** → **Create event key**. Copy the value —
   this is `INNGEST_EVENT_KEY`. Looks like `ek_...`.
4. Apps → **Manual setup** → copy the **Signing Key**. This is
   `INNGEST_SIGNING_KEY`. Looks like `signkey-...`.
5. Save both somewhere temporarily — you'll paste them into Fly + Vercel.

### 4.3 Sign up for Fly.io and install `flyctl`

1. <https://fly.io/app/sign-up> — sign up with credit card (free tier
   doesn't deploy without one anymore).
2. Install `flyctl` on your laptop:
   ```bash
   curl -L https://fly.io/install.sh | sh
   # macOS:
   brew install flyctl
   ```
3. `fly auth login`.

### 4.4 Launch the Fly app and set secrets

From the repo root:

```bash
fly launch --no-deploy --config packages/worker/fly.toml --copy-config
```

Notes:
- `--copy-config` is critical — without it, `launch` rewrites
  `packages/worker/fly.toml` and loses pinned settings.
- Decline the Postgres / Redis prompts. We don't need them.
- The default app name `upriver-worker` is what `OPS.md` and
  `DEPLOY.md` assume. Keep it.

Set the secrets the worker needs:

```bash
fly secrets set \
  INNGEST_EVENT_KEY=ek_... \
  INNGEST_SIGNING_KEY=signkey-... \
  INNGEST_SERVE_HOST=https://upriver-worker.fly.dev \
  ANTHROPIC_API_KEY=sk-ant-... \
  FIRECRAWL_API_KEY=fc-... \
  UPRIVER_SUPABASE_URL=https://qavbpfmhgvkhrnbqalrp.supabase.co \
  UPRIVER_SUPABASE_SERVICE_ROLE_KEY=eyJ... \
  RESEND_API_KEY=re_... \
  --app upriver-worker
```

Use the **service-role** key, not the publishable key. The worker is
server-side only.

### 4.5 First container build + deploy

The image is normally built and pushed by GitHub Actions (the workflow
file `.github/workflows/worker-image.yml` does it on every push to
`main`). For the first deploy you can either:

**Option A — let GitHub Actions build it** (preferred):

1. Push the branch to `main` (or merge a PR). The workflow runs.
2. Watch **Actions tab** for the build. It pushes to
   `ghcr.io/lifeupriver/upriver-worker:latest`.
3. Then deploy to Fly with:
   ```bash
   fly deploy --image ghcr.io/lifeupriver/upriver-worker:latest \
     --config packages/worker/fly.toml --app upriver-worker
   ```

**Option B — build locally and push** (if Actions isn't set up yet):

```bash
fly deploy --config packages/worker/fly.toml \
  --dockerfile packages/worker/Dockerfile --app upriver-worker
```

Slow first time (Docker has to pull the Playwright base image and
build the worker on Fly's builders), ~5–10 min.

If GHCR pull fails with "denied" on Fly side, the image is still
private. Either:
- Make it public (GitHub → repo → Packages → upriver-worker →
  Package settings → Change visibility → Public), or
- Add a Fly registry secret with a GitHub PAT that has
  `read:packages` scope:
  ```bash
  fly secrets set FLY_DOCKER_REGISTRY_TOKEN=ghp_... --app upriver-worker
  ```

### 4.6 Register the worker with Inngest Cloud

1. **Inngest Dashboard → Apps → Sync new app**.
2. URL: `https://upriver-worker.fly.dev/api/inngest`
3. Inngest GETs that URL, reads the function manifest, and starts
   delivering `upriver/stage.run` events.
4. Status should flip to **Synced**. If it hangs, check Fly logs:
   ```bash
   fly logs --app upriver-worker
   ```

### 4.7 Set the dashboard-side env vars on Vercel

The dashboard needs to know how to send events to Inngest:

1. **Vercel → upriver-platform → Settings → Environment Variables**.
2. Add:
   - `INNGEST_EVENT_KEY` = `ek_...` (Production + Preview)
   - `INNGEST_SIGNING_KEY` = `signkey-...` (Production + Preview)
3. **Deployments → Redeploy latest**.

### 4.8 Verify end-to-end

```bash
curl https://upriver-worker.fly.dev/healthz
# → ok

curl https://upriver-worker.fly.dev/api/inngest
# → { "framework":"...", "functions":[ ... ] }
```

Then in the hosted dashboard:
1. Open a pushed-to-bucket slug at `/clients/<slug>`.
2. Click **Run** on any pipeline stage (e.g. `scrape`).
3. The log panel should show:
   ```
   [enqueued] jobId=...
   [status] Running
   [status] Completed
   ```
4. Refresh the page. New artifacts should be visible.

If the click hangs at "Enqueueing...", `INNGEST_EVENT_KEY` isn't on
Vercel. If it enqueues but never moves past Running, the worker isn't
consuming — check Fly logs and Inngest dashboard's **Runs** tab.

### 4.9 Recurring monthly costs (heads-up)

- **Inngest Cloud**: free tier covers ~50K event/month. You won't hit
  it until many concurrent clients.
- **Fly.io**: machine sleeps when idle. Wake-up adds ~5–10s to first
  request. Worst case at low volume: $0–10/mo. If you make it
  always-on, ~$5–15/mo for a `shared-cpu-1x` 256MB machine.
- **GHCR**: free for public images.

---

## Part 5 — Domains and DNS

You don't need this to send a client a working share link — the
default `upriver-platform.vercel.app` URL works fine. This section is
about the polished `https://reports.upriverhudsonvalley.com/<slug>?t=...`
experience.

### 5.1 Decide which domain pattern you want

| Pattern | Pros | Cons |
|---|---|---|
| `upriver-platform.vercel.app` (current default) | Already works. Zero setup. | Looks like a tech-demo. Vercel branding. |
| `reports.upriverhudsonvalley.com` | Branded. Matches your business. | Requires DNS config. |
| `upriverhudsonvalley.com` (apex) | Cleanest. | Conflicts if you have a marketing site there. |

Recommendation: `reports.upriverhudsonvalley.com` — separates the
client surface from any marketing site you build later.

### 5.2 Add the custom domain to Vercel

1. **Vercel → upriver-platform → Settings → Domains**.
2. Type `reports.upriverhudsonvalley.com` and click **Add**.
3. Vercel shows the DNS record you need. Usually a CNAME:
   - Name: `reports`
   - Type: `CNAME`
   - Value: `cname.vercel-dns.com`
4. Go to your DNS provider (whoever runs `upriverhudsonvalley.com` —
   Cloudflare, Google Domains, GoDaddy, etc.).
5. Add the CNAME record. Save.
6. Back in Vercel, the domain status flips to **Valid Configuration**
   within 5–30 min once DNS propagates. Vercel auto-provisions SSL.

### 5.3 Update env vars to use the new domain

Once the domain is live:

1. `vercel env add UPRIVER_REPORT_HOST production` →
   `https://reports.upriverhudsonvalley.com`. (Or in the Vercel UI.)
2. Redeploy.
3. In your laptop `.env` (and Fly secrets):
   ```
   UPRIVER_REPORT_HOST=https://reports.upriverhudsonvalley.com
   ```
4. Update `Site URL` in **Supabase Dashboard → Auth → URL
   Configuration** so magic-link redirects come back to the new
   domain. Add `https://reports.upriverhudsonvalley.com/*` to
   the **Redirect URLs** allowlist too.

### 5.4 Verify

```bash
curl https://reports.upriverhudsonvalley.com/api/health
# → { "ok": true, "dataSource": "supabase", ... }
```

Then mint a fresh share token and confirm it goes to the new domain.

### 5.5 (Future) Per-client preview domains

Backlog item §17 wants per-client preview domains so the rebuilt site
itself (not just the audit report) has a URL like
`audreys-preview.upriverhudsonvalley.com`. The decided architecture is
"one Vercel project, branch-per-client, branch URL = preview" — but
the wiring isn't built yet. Skip this until you actually need it.

---

## Part 6 — Daily client workflow once everything is wired

The point of all the above setup. This is your repeatable per-client
workflow.

### 6.1 New client kickoff

On your laptop:

```bash
upriver init https://newclient.com --slug newclient --name "New Client Co."
upriver run all newclient --audit-mode=all
```

The pipeline takes 30–90 minutes wall time. While it runs, send the
**Welcome / kickoff** email from `docs/EMAIL-TEMPLATES.md`.

### 6.2 Push to the bucket

```bash
upriver sync push newclient
```

This is the bridge between "I work locally" and "client sees a URL."

### 6.3 Open the hosted dashboard, verify, mint a link

1. <https://upriver-platform.vercel.app/clients> → click `newclient`.
2. Quick sanity check: audit report renders, screenshots load,
   branding looks right.
3. **Share Links** → label it (e.g. `alex@newclient.com — first review`),
   90-day expiry → **Mint share link**.
4. Copy URL.

### 6.4 Send the audit-delivery email

Either:
- Paste the URL into your normal email client, using the
  **Audit delivery** template in `docs/EMAIL-TEMPLATES.md`, OR
- Run `upriver report send newclient --to client@newclient.com`
  (uses Resend, branded sender).

### 6.5 Iterate

Every time you re-run a stage locally and want the client to see new
work, re-run `upriver sync push newclient`. The same share link keeps
working — they just see the new artifacts on next refresh.

If you've wired the worker (Part 4), you can skip the local laptop
re-runs and just click **Run** in the hosted dashboard.

### 6.6 At launch

```bash
upriver report compare newclient-pre newclient-post
upriver sync push newclient
```

Mint a fresh share token labelled `launch handoff`, send the
**Launch handoff** email template.

### 6.7 Multiple clients in flight

The dashboard at `/clients` lists all pushed slugs. Each slug is
independent — minting a share token for `audreys` doesn't expose
`newclient`. Operators see all slugs; clients only see their own
deliverable URLs.

If you want per-slug operator scoping (one operator per client),
that's backlog item #28 — not built yet.

---

## Part 7 — What to do when things break

### 7.1 Magic-link email never arrives

1. **Resend → Logs**. Look for the most recent send to your address.
   - "Delivered" → check spam folder; the email made it.
   - "Bounced" → DNS verification on the domain may have lapsed.
     Re-check **Resend → Domains**.
   - No row at all → Supabase didn't even attempt to send.
2. **Supabase → Authentication → Logs**. Look for `mail.send` events.
   - Missing → Auth SMTP is misconfigured. Re-check Part 3.2.
   - Present but errored → password (`RESEND_API_KEY`) is probably stale.
     Rotate at Resend, re-paste into Supabase Auth → SMTP.

### 7.2 `/clients` 302s to `/login` after signing in

Operator role isn't on your `auth.users` row. Run the SQL in 1.1.

### 7.3 "Storage backend not yet available"

`UPRIVER_DATA_SOURCE=supabase` is set but the slug isn't in the
bucket. Either:
- `upriver sync push <slug>` from your laptop, OR
- Set `UPRIVER_DATA_SOURCE=local` for local dev.

### 7.4 `Mint share link` button errors

Almost always means `UPRIVER_SUPABASE_SERVICE_KEY` isn't set on Vercel.
See 1.2.

### 7.5 Share link returns 410 / "expired"

Token is past `expires_at`. Mint a fresh one. If the **same** token
worked an hour ago and now doesn't, check the `share_tokens` row in
Supabase SQL editor — it may have been revoked.

### 7.6 Hosted **Run** button hangs / errors

Phase 3 worker isn't fully wired. Walk through Part 4. Common subset:

- Inngest event sent but no worker syncing → **Apps → Sync** in
  Inngest dashboard, point at `https://upriver-worker.fly.dev/api/inngest`.
- Worker logs show "INNGEST_SIGNING_KEY missing" → `fly secrets set`
  it.
- Worker can't pull container image → Make GHCR package public.

### 7.7 `firecrawl: 429 Too Many Requests`

You burned through the Firecrawl plan's rate limit. Wait or upgrade
the plan at <https://firecrawl.dev/dashboard>. Cached scrapes don't
re-bill.

### 7.8 Dashboard shows the wrong client branding (Upriver default)

The branding extraction during `init` didn't pick up the client's
logo / colour. Either:
1. Re-run `upriver init` with explicit overrides, or
2. Hand-edit `clients/<slug>/audit-package.json` →
   `brandingProfile.colors.primary` and `brandingProfile.logo`, then
   `upriver sync push <slug>`.

### 7.9 The Vercel build fails

Check **Vercel → Deployments → most recent → Build Logs**. Most
common failures:

- TypeScript error → `pnpm -r run typecheck` locally first; fix and
  push.
- Missing dep → ensure `pnpm-lock.yaml` is committed.
- "Module not found '@upriver/core'" → workspace resolution failed.
  Vercel root directory should be the repo root, not
  `packages/dashboard`.

### 7.10 Incognito test trick

Whenever you're not sure if something works for clients, open the
share URL in incognito. If you're already signed in as operator,
your session masks bugs in the unauthenticated path.

---

## Part 8 — Optional / later

These are not blocking. Add them when you feel the pain.

### 8.1 Sentry on the dashboard (backlog #11)

Worth it the moment a client emails "the link doesn't work" and
you can't figure out why. Steps:

1. <https://sentry.io/signup>. Free tier covers 5K errors/month.
2. Create project, type **Astro**.
3. Copy the DSN (`https://...@sentry.io/...`).
4. `pnpm add @sentry/astro --filter @upriver/dashboard`.
5. Add the integration to `packages/dashboard/astro.config.mjs`.
6. `vercel env add SENTRY_DSN production`.

### 8.2 Add a second operator (backlog #18)

Today only `joshua@joshuabrownphotography.com` is operator. To add
another:

1. Have them sign in once (creates the `auth.users` row).
2. Run the same SQL as 1.1 with their email.
3. Done. They can now see `/clients/*`.

A real allowlist UI is backlog item #18 — not built yet.

### 8.3 GitHub OAuth as a sign-in option (backlog #23)

Faster than magic link once configured. **Supabase Dashboard → Auth
→ Providers → GitHub → Enable**. Get an OAuth app from GitHub,
paste client id + secret. Add `https://reports.upriverhudsonvalley.com/auth/callback`
to GitHub OAuth app's allowed redirect URIs.

### 8.4 Per-slug preview deploys (backlog #17)

When you want to send the client a preview of the **rebuilt site**
(not just the audit), not just the audit report. Decided architecture
is one Vercel project, branch-per-client. Wiring isn't built yet —
ship the audit-share-link path first; come back to this.

### 8.5 Back-migrate every existing local client to bucket

If you have many half-finished engagements you want surfaceable:

```bash
for slug in audreys littlefriends barneys foo bar; do
  upriver sync push "$slug"
done
```

Run from repo root. Each push is independent; you can stop and resume.

### 8.6 Dashboard `/cost` view (backlog #24)

Surface `upriver cost` output as a dashboard page. Not built; nice to
have for monthly billing.

---

## Appendix A — Full env-var reference per surface

This is the master list. Cross-check against your actual envs.

### A.1 Your laptop (`.env` at repo root)

```bash
# --- required for all CLI commands ---
FIRECRAWL_API_KEY=fc-...
ANTHROPIC_API_KEY=sk-ant-...

# --- optional but recommended ---
GOOGLE_SERVICE_ACCOUNT_KEY=/path/to/service-account.json   # GSC data in audit
UPRIVER_SUPABASE_URL=https://qavbpfmhgvkhrnbqalrp.supabase.co
UPRIVER_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
UPRIVER_SUPABASE_SERVICE_KEY=eyJ...                       # for sync push/pull

# --- report send via Resend ---
RESEND_API_KEY=re_...
UPRIVER_REPORT_FROM=reports@upriverhudsonvalley.com
UPRIVER_REPORT_HOST=https://reports.upriverhudsonvalley.com

# --- only needed if you set UPRIVER_DATA_SOURCE=supabase locally ---
UPRIVER_DATA_SOURCE=local                                  # default
```

### A.2 Vercel (the dashboard)

Required on **Production + Preview**:

```bash
UPRIVER_DATA_SOURCE=supabase
UPRIVER_SUPABASE_URL=https://qavbpfmhgvkhrnbqalrp.supabase.co
UPRIVER_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
UPRIVER_SUPABASE_SERVICE_KEY=eyJ...

# Phase 3 worker — only needed once Part 4 is done
INNGEST_EVENT_KEY=ek_...
INNGEST_SIGNING_KEY=signkey-...

# Audit log — only needed after Part 2 migration applies
DASHBOARD_EVENTS_ENABLED=true

# When custom domain is wired (Part 5)
UPRIVER_REPORT_HOST=https://reports.upriverhudsonvalley.com
```

To-remove (cleanup):
```bash
UPRIVER_RUN_TOKEN  # retired, see Part 1.3
```

### A.3 Fly.io (the worker)

Set via `fly secrets set` (encrypted at rest):

```bash
INNGEST_EVENT_KEY=ek_...
INNGEST_SIGNING_KEY=signkey-...
INNGEST_SERVE_HOST=https://upriver-worker.fly.dev
ANTHROPIC_API_KEY=sk-ant-...
FIRECRAWL_API_KEY=fc-...
UPRIVER_SUPABASE_URL=https://qavbpfmhgvkhrnbqalrp.supabase.co
UPRIVER_SUPABASE_SERVICE_ROLE_KEY=eyJ...
RESEND_API_KEY=re_...
UPRIVER_REPORT_FROM=reports@upriverhudsonvalley.com
UPRIVER_REPORT_HOST=https://reports.upriverhudsonvalley.com
```

Note the slight name divergence: the worker uses
`UPRIVER_SUPABASE_SERVICE_ROLE_KEY` (legacy name) while the dashboard
uses `UPRIVER_SUPABASE_SERVICE_KEY`. Same value, different env var
name — set both.

### A.4 GitHub Actions (for the worker container build)

Repo → **Settings → Secrets and variables → Actions**:

```bash
# Already in place if the workflow runs
GITHUB_TOKEN  # provided automatically

# For automigrations workflow (Part 2.5, optional)
SUPABASE_ACCESS_TOKEN=sbp_...
SUPABASE_PROJECT_REF=qavbpfmhgvkhrnbqalrp
SUPABASE_DB_PASSWORD=...
```

---

## Appendix B — Account checklist

Every external service the system touches. Tick once you've signed
up and stored credentials in your password manager.

| Service | Why | Free tier sufficient? | Where credentials live |
|---|---|---|---|
| Vercel | Hosts the dashboard | Yes for low volume | Vercel UI env vars |
| Supabase | Postgres + Auth + Storage | Yes (Free or Pro $25/mo) | Vercel + Fly + laptop `.env` |
| Resend | Email delivery (Auth + reports) | Yes (3K emails/mo free) | Supabase Auth SMTP + `.env` |
| Firecrawl | Web scraping | Paid plan needed for serious use | Laptop `.env` + Fly secrets |
| Anthropic | Claude API for synthesize, deep audits | Pay-as-you-go | Laptop `.env` + Fly secrets |
| Google Cloud | GSC service account (optional) | Free | JSON file path in `.env` |
| Inngest Cloud | Job queue for Run buttons | Yes (free tier) | Vercel + Fly secrets |
| Fly.io | Worker container host | ~$0–10/mo low volume | `fly secrets` |
| GitHub | Source + GHCR for worker image | Free | Repo Settings → Secrets |
| GitHub OAuth (optional) | Faster sign-in | Free | Supabase Auth → Providers |
| Sentry (optional) | Error tracking | Yes (5K errors/mo) | Vercel env |
| Domain registrar | `upriverhudsonvalley.com` DNS | You already pay for it | Registrar dashboard |

### Recommended order to tick these off

If you're starting from "nothing wired beyond what's in OPS.md":

1. **Vercel + Supabase + Resend** — Part 1, 2, 3. Gets the dashboard
   live and clients clicking share links.
2. **Domain (Part 5)** — once a few clients have used the default URL
   and you're confident the flow works.
3. **Inngest + Fly + GHCR (Part 4)** — only when you're tired of
   running pipelines from your laptop terminal.
4. **Sentry, second operator, GitHub OAuth (Part 8)** — polish.

---

## Where to look next

- `docs/USER-GUIDE.md` — the operator workflow, command-by-command.
- `docs/OPS.md` — day-2 reference for hosted infra.
- `docs/SALES-PLAYBOOK.md` — what to pitch and when.
- `docs/EMAIL-TEMPLATES.md` — the four client email drafts.
- `docs/CLIENT-ONBOARDING.md` — engagement timeline + what to send.
- `packages/worker/DEPLOY.md` — long-form Phase 3 worker walkthrough.
- `.planning/roadmap/BACKLOG.md` — every open backlog item.
- `.planning/roadmap/HANDOFF.md` — most recent state-of-the-repo.

If something in this guide diverges from those docs, the more
recently-edited file wins. Update this guide when you complete a
section so it reflects reality.

