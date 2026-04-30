# Handoff — phase 3 code complete; operator provisioning is next

Last session shipped **Phase 3 of OPTION-B-MIGRATION.md end-to-end in code**.
24 commits ahead of `origin/main`, working tree clean, typecheck green
across the workspace.

## What landed this session

| Slice | Commit | What it does |
|---|---|---|
| 3.1 | `2dd9e18` | Scaffolded `@upriver/worker` package — Inngest client, event schema, generic `runStage` function |
| 3.2 | `8ac919b` | Dashboard `/api/enqueue/[command]` — sends `upriver/stage.run` event, returns `{ jobId }` |
| 3.3 | `be5265d` | Dashboard `/api/jobs/[id]` — SSE polling Inngest run-status REST API at 1Hz |
| 3.4 | `e2270f6` | `PipelineStages.tsx` branches on `dataSource` prop — `local` keeps spawn path, `supabase` uses enqueue+poll |
| 3.5a | `ca96d91` | Worker becomes a standalone HTTP server (`express` + `inngest/express`) on `:8288`. Removed dashboard's `/api/inngest` (architecture 1a — serve handler lives in the worker container) |
| 3.5b | `703fff6` | Multi-stage Dockerfile: builder uses `node:20-bookworm-slim` + pnpm; runtime uses `mcr.microsoft.com/playwright:v1.59.1-jammy` and global-installs `@anthropic-ai/claude-code`, `lighthouse@12`, `squirrelscan` |
| 3.5c | `18677af` | `packages/worker/fly.toml` + `packages/worker/DEPLOY.md` walking the operator through Inngest signup, fly launch, secrets |
| 3.5d | `69a38d3` | `.github/workflows/worker-image.yml` builds + pushes to `ghcr.io/lifeupriver/upriver-worker` on main / v* tags |
| 3.5e | `5138a8e` | Real `runStage` impl: `step.run('validate')` → `pull` (recursive bucket walk → `/tmp/upriver/clients/<slug>/`) → `spawn` (`execFile node /app/packages/cli/bin/run.js …`) → `push` (only files with `mtime > cutoff`) |

## Architecture decisions locked this session

- **Q1 — worker platform:** Inngest Cloud (recommended; user agreed)
- **Q2 — registry:** GHCR (`ghcr.io/lifeupriver/upriver-worker`)
- **Q3 — back-migration:** new clients only; existing locals stay local
- **Q1.a — serve handler location:** option (1a) — hosts inside the worker
  container on Fly.io, not in the dashboard. Container has direct access to
  claude/Lighthouse/Playwright/squirrelscan in the same process.

## Architecture (current)

```
Vercel dashboard (upriver-platform):
  /api/enqueue/<cmd>  → inngest.send({ name: 'upriver/stage.run', data: {...} })
                                                                │
                                                                ▼ (Inngest Cloud)
                                                                │
Fly.io worker (long-running container):                         │
  /api/inngest        ← inngest/express serve handler  ◄────────┘
                        ↓ runs inside the container:
                          1. validate (zod + ALLOWED_COMMANDS)
                          2. pull   (Supabase Storage → /tmp/upriver/clients/<slug>/)
                          3. spawn  (node /app/packages/cli/bin/run.js <cmd> <slug>)
                          4. push   (changed files → Supabase Storage)
  /healthz            ← Fly checks block

Vercel dashboard polls /api/jobs/<id> for status (REST → Inngest API).
```

## What the operator must do before Phase 3 actually runs

The code is complete. None of it is testable end-to-end without these steps.
Full walkthrough lives in `packages/worker/DEPLOY.md`.

### 1. Inngest Cloud account
- Sign up at <https://app.inngest.com>
- Create environment `production`
- Copy `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY`

### 2. Fly.io worker
```bash
fly launch --no-deploy --config packages/worker/fly.toml --copy-config
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

### 3. Build + push the image
Push to `main` triggers `.github/workflows/worker-image.yml`. Or manually:
```bash
docker build -f packages/worker/Dockerfile -t ghcr.io/lifeupriver/upriver-worker:dev .
docker push ghcr.io/lifeupriver/upriver-worker:dev
```

### 4. First Fly deploy
```bash
fly deploy --image ghcr.io/lifeupriver/upriver-worker:latest --config packages/worker/fly.toml
```

### 5. Sync Inngest with the worker
Inngest dashboard → Apps → Sync new app → `https://upriver-worker.fly.dev/api/inngest`

### 6. Vercel side
```bash
vercel env add INNGEST_EVENT_KEY production --value ek_... --yes
vercel env add INNGEST_EVENT_KEY development --value ek_... --yes
vercel env add INNGEST_SIGNING_KEY production --value signkey-... --yes
```

## Verification once provisioned

```bash
curl https://upriver-worker.fly.dev/healthz       # → ok
curl https://upriver-worker.fly.dev/api/inngest   # → JSON manifest with run-stage
```

Then on the hosted dashboard, click any pipeline-stage Run button on a slug
that's been `upriver sync push`-ed to the bucket. Expected log:

```
[start] upriver scrape <slug>
[enqueued] jobId=01HXX...
[status] Queued
[status] Running
[status] Completed
[done] Scrape completed.
```

## Known gaps / known unknowns

- **stdoutTail/stderrTail in `done`**: `PipelineStages` doesn't render these
  yet — they sit in the Inngest run output. Trivial to wire when needed.
- **squirrelscan install**: pinned to `npm install -g squirrelscan` in the
  Dockerfile. If the package isn't on npm under that name, swap to the
  install path documented at <https://skills.sh/squirrelscan/skills/audit-website>.
- **Step output size**: `runStage` truncates stdout/stderr to 4 KB tails so
  Inngest's step state stays small. A chatty stage (`scrape` over 100 pages)
  will lose middle-of-run logs. Fly logs are the source of truth.
- **`flagsToArgs` duplication**: lives in `packages/dashboard/src/lib/run-cli.ts`
  AND inline in `packages/worker/src/functions/run-stage.ts`. Refactor target
  for `@upriver/core/util` — out of Phase 3 scope.
- **Phase 4 (auth) is untouched**: `/api/enqueue/<cmd>` honors
  `UPRIVER_RUN_TOKEN` if set, but Supabase Auth replacement isn't wired.
  See `OPTION-B-MIGRATION.md` Phase 4.

## Repo state

- Branch: `main`, **24 commits ahead of `origin/main`**.
- Working tree: clean.
- Typecheck: 0 errors across all packages.
- Tests: not re-run this session — last verified clean at the start of
  Phase 3 (cli 72/72, core 21/21).
- Production: <https://upriver-platform.vercel.app/clients> still 200.
  Phase 3 code is dormant on prod until `INNGEST_EVENT_KEY` is set on Vercel
  env (without it, `/api/enqueue` returns 502 from `inngest.send`).

## Next step

Operator runs the 6-step provisioning checklist above. Code-side work that
*does not* depend on operator infra is fair game for the next session:

- Phase 4 (auth) — clean independent slice.
- `flagsToArgs` extraction to `@upriver/core/util`.
- Render `stdoutTail`/`stderrTail` in `PipelineStages` `done` event.
- Operator workflow doc on the standard "spin up a new client" loop now that
  Phase 3 changes the trigger model.
