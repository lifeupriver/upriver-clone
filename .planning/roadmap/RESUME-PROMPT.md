# Fresh-session resume prompt

Paste the block below into a new Claude Code session in this repo.

Phase 3 of OPTION-B-MIGRATION.md shipped end-to-end in code last session.
Next session is either: (a) operator-side provisioning to bring Phase 3
online, or (b) Phase 4 (auth) which is independent and can land first.

---

## Paste this:

```
You're picking up work on the upriver-clone monorepo. Read these in order:

1. `.planning/roadmap/HANDOFF.md` — primary reference. State of phase 3
   (code complete, operator provisioning pending) and the 6-step Inngest
   + Fly + Vercel checklist.
2. `packages/worker/DEPLOY.md` — full operator walkthrough for the
   provisioning steps.
3. `.planning/roadmap/OPTION-B-MIGRATION.md` — the 4-phase plan. Phase 4
   (auth) is the next code-side phase if the operator wants to get
   ahead of provisioning.

## Verify state in the first 2 minutes

```
git log --oneline origin/main..HEAD | head     # 24 commits expected
git status                                      # clean
pnpm -r run typecheck                           # 0 errors
curl -sS -o /dev/null -w "%{http_code}\n" https://upriver-platform.vercel.app/clients
                                                # → 200
```

If any step diverges, stop and surface — something has changed since
this handoff was written.

## Headline state

- Branch: `main`, 24 commits ahead of `origin/main`. Phase 3 code is
  shipped: `@upriver/worker` package, dashboard `/api/enqueue` +
  `/api/jobs`, Dockerfile + GHCR workflow, fly.toml + DEPLOY.md, real
  `runStage` (validate → pull → spawn → push).
- Architecture decisions locked: Inngest Cloud, GHCR registry,
  new-clients-only back-migration, serve handler hosted *in* the worker
  container (option 1a — Fly.io machine).
- Production at <https://upriver-platform.vercel.app/clients> is still
  the Phase 2 build (data source = supabase, no Phase 3 trigger yet —
  `INNGEST_EVENT_KEY` not set on Vercel env, so `/api/enqueue` would
  return 502).

## Two paths forward

### Path A — operator provisions Phase 3 live

The 6 steps live in `HANDOFF.md` and `packages/worker/DEPLOY.md`:

1. Inngest Cloud signup → `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
2. `fly launch --no-deploy --config packages/worker/fly.toml --copy-config`
   then `fly secrets set ...`
3. Push to `main` (triggers `.github/workflows/worker-image.yml`)
4. `fly deploy --image ghcr.io/lifeupriver/upriver-worker:latest`
5. Inngest dashboard → Apps → Sync new app
   → `https://upriver-worker.fly.dev/api/inngest`
6. `vercel env add INNGEST_EVENT_KEY production` +
   `vercel env add INNGEST_SIGNING_KEY production`

Verification once live:
```
curl https://upriver-worker.fly.dev/healthz                # → ok
curl https://upriver-worker.fly.dev/api/inngest            # → JSON manifest
```
Then click Run on any pushed-to-bucket slug in the hosted dashboard.

### Path B — start Phase 4 (auth) in parallel

OPTION-B-MIGRATION.md Phase 4 covers Supabase Auth gating
`/clients/*` and `/api/enqueue/*`, plus per-slug share tokens for
`/deliverables/<slug>/*`. Independent of Phase 3 wiring. ~1–2 days.

Smaller code-side tickets that don't depend on Phase 3 going live:
- Hoist `flagsToArgs` from `packages/dashboard/src/lib/run-cli.ts`
  + inline copy in `packages/worker/src/functions/run-stage.ts`
  into `@upriver/core/util/flags.ts`.
- Render `stdoutTail`/`stderrTail` from the Inngest `done` payload in
  `PipelineStages.tsx` so the log panel shows real CLI output, not
  just status transitions.

## Where to find Phase 3 things

```
packages/worker/
  src/
    client.ts             # Inngest client (id: upriver-platform)
    events.ts             # STAGE_RUN_EVENT + zod payload schema
    serve.ts              # express + inngest/express → :8288
    functions/
      run-stage.ts        # validate → pull → spawn → push
      index.ts            # functions[] manifest
    index.ts              # public entrypoint (consumed by dashboard)
  Dockerfile              # multi-stage: builder + playwright runtime
  fly.toml                # Fly machine config
  DEPLOY.md               # operator walkthrough

packages/dashboard/src/pages/api/
  enqueue/[command].ts    # POST → inngest.send → { jobId }
  jobs/[id].ts            # SSE polling Inngest run-status REST
  run/[command].ts        # legacy spawn path; still in use for local dev

packages/dashboard/src/components/react/PipelineStages.tsx
  # branches on `dataSource` prop: local→/api/run, supabase→/api/enqueue+/api/jobs

.github/workflows/worker-image.yml
  # builds + pushes ghcr.io/lifeupriver/upriver-worker on main + v* tags
```

## MCP servers

Already authenticated:
- `mcp__plugin_supabase_supabase__*` — full toolset.
- `mcp__plugin_vercel_vercel__*` — full toolset.

If deferred-tool schemas aren't loaded, use `ToolSearch` with
`select:<tool_name>` first.

## Repo conventions

- `pnpm -r run typecheck` must pass before every commit.
- Atomic commits per slice — one workstream item per commit.
- Commit messages: `feat(option-b): X.N — <one-line summary>`.
- `Co-Authored-By: Claude` trailer is rejected by the harness — omit.
- Subprocess: `execFile` with arg arrays, never shell strings.
- `.planning/roadmap/` is committed (not gitignored).

## Auto-mode posture

Prefer action, minimize interruptions, but pause for:
- Hard-to-reverse changes (deploys, billing, destructive git)
- Architectural calls a junior PM couldn't make alone
- More than 40 commits in a single session

When stop conditions hit, write a fresh `HANDOFF.md` and surface.

Begin by reading `HANDOFF.md`, then ask the operator whether they're
ready to provision (Path A) or want to push code-side work first
(Path B).
```

---

## When to refresh this prompt

Update this file whenever:
- A phase boundary in `OPTION-B-MIGRATION.md` is crossed
- Major architectural decisions land that change the "first step"
- Project IDs, live env values, or MCP-server availability rotates
- The "what's still operator-input-only" list shrinks meaningfully
