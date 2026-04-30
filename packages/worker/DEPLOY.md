# Worker deploy

The worker is a Fly.io machine that hosts the Inngest serve handler and runs
the upriver CLI. Inngest Cloud delivers function invocations to it; the
dashboard only sends events.

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

Set secrets:

```bash
fly secrets set \
  INNGEST_EVENT_KEY=... \
  INNGEST_SIGNING_KEY=... \
  INNGEST_SERVE_HOST=https://upriver-worker.fly.dev \
  ANTHROPIC_API_KEY=... \
  FIRECRAWL_API_KEY=... \
  UPRIVER_SUPABASE_URL=https://qavbpfmhgvkhrnbqalrp.supabase.co \
  UPRIVER_SUPABASE_SERVICE_ROLE_KEY=... \
  --app upriver-worker
```

### 3. First deploy

The container image is normally built+pushed by GitHub Actions
(`.github/workflows/worker-image.yml`) and then `fly deploy --image
ghcr.io/lifeupriver/upriver-worker:latest`. For a manual local deploy:

```bash
fly deploy --config packages/worker/fly.toml --dockerfile packages/worker/Dockerfile
```

### 4. Register with Inngest Cloud

In the Inngest dashboard → Apps → Sync new app, point at:

```
https://upriver-worker.fly.dev/api/inngest
```

Inngest will GET that URL, confirm the function manifest, and start delivering
`upriver/stage.run` events.

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
