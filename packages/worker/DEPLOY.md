# Worker deploy

The worker is a Fly.io machine that hosts the Inngest serve handler and runs
the upriver CLI. Inngest Cloud delivers function invocations to it; the
dashboard only sends events.

**This is a SINGLE-machine app.** Inngest delivers each step of a multi-step
function (`pull → spawn → push`) as its own HTTP request, and those steps
share state through the local work dir. Fly's default deploy creates two
machines for HA and load-balances requests between them — the `spawn` step
would then land on a machine that never ran `pull`. Always deploy with
`--ha=false` and never `fly scale count` past 1. The work-dir volume (below)
also enforces this: a Fly volume attaches to exactly one machine.

## One-time setup

### 1. Inngest Cloud

1. Sign up at <https://app.inngest.com> (free tier covers expected volume).
2. Create an environment named `production`.
3. Copy the `INNGEST_EVENT_KEY` (Send → Settings) and `INNGEST_SIGNING_KEY`
   (Apps → Manual setup) — both go into Fly + Vercel secrets below.

### 2. Fly.io app

```bash
# From repo root, with flyctl installed.
fly launch --no-deploy --config packages/worker/fly.toml --copy-config
```

The launch command may try to overwrite `fly.toml` — pass `--copy-config` so it
only writes a fresh app id, and decline the Postgres/Redis prompts.

Create the work-dir volume (once, before the first deploy — `fly.toml`'s
`[mounts]` block refuses to deploy without it):

```bash
fly volumes create upriver_data --region iad --size 10 --app upriver-worker
```

The volume mounts at `/data`; `UPRIVER_WORK_DIR=/data/upriver` (set in
`fly.toml`) points the worker's client staging there. Two reasons it exists:

1. **Step-to-step state.** Files pulled in one Inngest step must still be on
   disk when the next HTTP-delivered step runs — including across the
   machine auto-stopping between steps. A rootfs `/tmp` is wiped on stop.
2. **Disk headroom.** Scrape/clone stages of image-heavy sites overflow the
   8 GB rootfs; the volume isolates that churn. The worker cleans up after
   every run, so 10 GB is comfortable.

Volumes bill ~$0.15/GB/month (~$1.50/mo at 10 GB).

Set secrets:

```bash
fly secrets set \
  INNGEST_EVENT_KEY=... \
  INNGEST_SIGNING_KEY=... \
  INNGEST_SERVE_HOST=https://upriver-worker.fly.dev \
  UPRIVER_USE_API_KEY=1 \
  ANTHROPIC_API_KEY=... \
  FIRECRAWL_API_KEY=... \
  UPRIVER_SUPABASE_URL=https://qavbpfmhgvkhrnbqalrp.supabase.co \
  UPRIVER_SUPABASE_SERVICE_KEY=... \
  RESEND_API_KEY=... \
  --app upriver-worker
```

Optional secrets:

- `RESEND_API_KEY` — lets scheduled `monitor`/`followup` runs email their
  reports (see "Cron schedules + notifications" below). Without it the runs
  still produce artifacts; they just print instead of sending.
- `UPRIVER_REPORT_FROM` — sender address for those emails (must be on a
  Resend-verified domain; defaults to `reports@upriverhudsonvalley.com`).
- `UPRIVER_MONITOR_TO` / `UPRIVER_FOLLOWUP_TO` — global fallback recipients
  when a client has no `client_admins.notify_email`.
- `MONITOR_SLUGS` / `FOLLOWUP_SLUGS` — comma-separated slug lists UNION'd
  into cron eligibility (bootstrap/override; see below).

**`UPRIVER_USE_API_KEY=1` + `ANTHROPIC_API_KEY` are REQUIRED for the worker
container.** The CLI's default `claude` path relies on an operator's logged-in
Claude Max/Team session, which does not exist inside a container — without
`UPRIVER_USE_API_KEY=1` the CLI strips `ANTHROPIC_API_KEY` from the spawned
`claude` env and every LLM-backed stage fails. Set both.

`UPRIVER_SUPABASE_SERVICE_KEY` is the canonical name (it's what
`@upriver/core` reads). The legacy `UPRIVER_SUPABASE_SERVICE_ROLE_KEY` is
still accepted — `serve.ts` copies it across at startup with a deprecation
warning — but set the canonical name on new machines.

### Pinned tool versions

The Dockerfile pins the global CLIs it installs (`@anthropic-ai/claude-code@2.1.175`,
`lighthouse@12`, `squirrelscan@0.0.38`) so a rebuild can't silently change
tool behavior. To bump claude-code, verify the new version against the
pipeline locally (`claude --version`), then update the pin in
`packages/worker/Dockerfile` and rebuild the image.

### 3. First deploy

The container image is normally built+pushed by GitHub Actions
(`.github/workflows/worker-image.yml`) and then:

```bash
fly deploy --image ghcr.io/lifeupriver/upriver-worker:latest \
  --config packages/worker/fly.toml --ha=false
```

For a manual local deploy:

```bash
fly deploy --config packages/worker/fly.toml --dockerfile packages/worker/Dockerfile --ha=false
```

`--ha=false` is REQUIRED on every deploy (see the single-machine note at the
top). If a second machine ever appears (`fly machines list`), destroy it:
`fly machine destroy <id> --app upriver-worker`.

### 4. Register with Inngest Cloud

In the Inngest dashboard → Apps → Sync new app, point at:

```
https://upriver-worker.fly.dev/api/inngest
```

Inngest will GET that URL, confirm the function manifest, and start delivering
`upriver/stage.run` events.

## Cron schedules + notifications

The worker registers two cron functions: `monitor-weekly` (F06, Mondays
13:00 UTC) and `followup-due` (F07, Mondays 14:00 UTC). Each one builds its
slug list from TWO sources, merged:

1. **`client_admins` table** (migration
   `supabase/migrations/20260612000003_client_admins.sql`) — the canonical
   path. Queried with the service key.
   - monitor picks up rows where `monitor_enabled` and not `admin_paused`.
   - followup picks up rows where `followup_enabled`, not `admin_paused`,
     and `engagement_ended_at` is 180+ days ago.
   - When a row has `notify_email`, the schedule passes it to the CLI as
     `--to` and the run emails its report via Resend (requires
     `RESEND_API_KEY` on the machine).
   - If the migration hasn't been applied, the worker logs one warning per
     boot and behaves as if the table were empty.
2. **Env lists** (`MONITOR_SLUGS` / `FOLLOWUP_SLUGS`, comma-separated) —
   bootstrap/override. Useful before the migration lands or to force a slug
   in. Env slugs bypass followup's 180-day check and carry no per-client
   recipient (the CLI falls back to `UPRIVER_MONITOR_TO` /
   `UPRIVER_FOLLOWUP_TO`, or prints the report for manual forwarding).

Enable a client:

```sql
insert into public.client_admins (slug, monitor_enabled, notify_email)
  values ('audreys', true, 'owner@audreys.example')
  on conflict (slug) do update
    set monitor_enabled = true, notify_email = excluded.notify_email;
```

Pause everything for a client without losing its settings:
`update public.client_admins set admin_paused = true where slug = '...'`.

## Client-state sync contract

`run-stage` keeps `clients/<slug>/` in the bucket coherent across runs:

- **Pull** downloads into a fresh temp dir and atomically swaps it into the
  work dir — bucket deletions can't leak stale files into the next run.
- **Push** re-uploads only files whose sha256 changed (or are new), deletes
  bucket files the CLI removed locally, and writes
  `clients/<slug>/.sync/manifest.json` LAST. A manifest with
  `status: 'complete'` means the bucket matches the listed hashes; `'failed'`
  (or a manifest that predates other writes) means the push tore and the
  next successful run will heal it.
- **Lock**: `clients/<slug>/.sync/lock.json` is written at pull and cleared
  when the run ends. Another run within 45 minutes refuses to start and
  retries via Inngest. A crashed run's lock expires on its own; to clear one
  manually, delete the object from the bucket.

`.sync/` is worker bookkeeping — don't put client artifacts there, and
ignore it when reading the bucket by hand.

## Vercel side

The dashboard needs `INNGEST_EVENT_KEY` (only — sending side) on Production +
Development env so `/api/enqueue` can publish events:

```bash
vercel env add INNGEST_EVENT_KEY production --value ek_... --yes
vercel env add INNGEST_EVENT_KEY development --value ek_... --yes
```

For `/api/jobs/<id>` to read run status, also set `INNGEST_SIGNING_KEY` on the
dashboard (read access uses the signing key as a bearer token):

```bash
vercel env add INNGEST_SIGNING_KEY production --value signkey-... --yes
```

## Verify

After deploy:

```bash
curl https://upriver-worker.fly.dev/healthz       # → ok
curl https://upriver-worker.fly.dev/api/inngest   # → JSON manifest
```

Then click Run on any pipeline stage in the hosted dashboard and watch the
log panel: `[enqueued] jobId=...` → `[status] Running` → `[status] Completed`.
