# Fresh-session resume prompt

Paste the block below into a new Claude Code session in this repo. It
boots the next session into the right context without redoing
discovery.

The prior version of this file pointed at the original roadmap TODOs —
those are now all shipped. This is the new world, post-Option-B
decision.

---

## Paste this:

```
You're picking up work on the upriver-clone monorepo. Read these in
order before doing anything:

1. `.planning/roadmap/HANDOFF.md` — current state, all decisions
   resolved + open, what's pending. THIS IS THE PRIMARY REFERENCE.
2. `.planning/roadmap/OPTION-B-MIGRATION.md` — the 4-phase plan for
   moving from operator-local to fully-hosted on Vercel + Supabase.
   The user explicitly chose Option B in the previous session.
3. `.planning/roadmap/DECISIONS-NEEDED.md` — open decisions and the
   resolved table. Reference only — most are already closed.

## Verify state in the first 2 minutes

```
git log --oneline origin/main..HEAD | head    # 14 commits expected
git status                                     # clean
pnpm -r run typecheck                          # 0 errors
pnpm --filter @upriver/cli run test            # 72/72
pnpm --filter @upriver/core run test           # 21/21
curl -sS -o /dev/null -w "%{http_code}\n" https://upriver-platform.vercel.app/clients
                                               # → 200
```

If any step diverges, stop and surface — something has changed since
this handoff was written.

## Headline state

- Branch: `main`, 14 commits ahead of `origin/main`. Tests 72/72 (cli)
  + 21/21 (core), typecheck clean across all packages. Working tree
  clean.
- Supabase project `upriver-platform` (id `qavbpfmhgvkhrnbqalrp`)
  ACTIVE_HEALTHY in the `Upriver` Pro org
  (id `ezbdnbazneviadrqalph`). Bucket `upriver` private, 500 MB cap.
- Vercel team `Upriver` (id `team_FIxyAOaCMqi7KGYQntQeCbuW`).
- Vercel project `upriver-platform` (id
  `prj_LFSBjXlYAZCBj5tsuNsmneeJysL9`) live at
  https://upriver-platform.vercel.app, Root Directory =
  `packages/dashboard`. UPRIVER_DATA_SOURCE=supabase set on Production
  + Development env. Preview env intentionally empty.
- Architecture: Option B (full Vercel + Supabase). **Phases 1 and 2
  complete.** Next phase: Phase 3 (pipeline execution off the
  dashboard via worker platform, recommended Inngest).

## Phase 1 + 2 — what landed

- `@astrojs/vercel` adapter on the dashboard.
- `@upriver/core/data` exports `ClientDataSource` interface +
  `LocalFsClientDataSource` and `SupabaseClientDataSource`.
- Dashboard libs (fs-reader, report-reader, intake-writer, pipeline)
  all async; route through `resolveClientDataSource()` based on
  `UPRIVER_DATA_SOURCE`.
- `upriver sync push|pull <slug>` CLI commands move artifacts between
  local fs and the bucket. Default skip: `node_modules/`, `.git/`,
  `.DS_Store`. `--exclude` and `--dry-run` flags.
- Production deploy verified: GET / → 302 → /clients → 200; empty
  state shows "Looking in: Supabase bucket clients/" because no slugs
  pushed yet.
- Smoke test: `node packages/core/scripts/smoke-data-source.mjs` runs
  the full SupabaseClientDataSource surface against the live bucket.

## Immediate next step — Phase 3 of OPTION-B-MIGRATION.md

Pipeline execution off the dashboard. Goal: trigger pipeline stages
from the hosted dashboard without spawning child processes inside
Vercel functions.

**Surface these three questions to the user FIRST. Do not start
scaffolding `packages/worker/` until at least Q1 is answered.**

> Q1. **Worker platform** — pick one. My recommendation: **Inngest**.
>     Alternatives in `OPTION-B-MIGRATION.md` Phase 3 table:
>     Trigger.dev (similar shape, more control), GitHub Actions
>     `workflow_dispatch` (free, slow startup, awkward SSE),
>     Vercel Functions w/ Fluid Compute (one vendor, ephemeral disk),
>     Fly.io machine (long-running container, manual provisioning).
>
> Q2. **Container image registry** — recommendation **GitHub Container
>     Registry** (free, integrates with the existing repo).
>     Alternative: Docker Hub.
>
> Q3. **Existing-client back-migration** — once Phase 3 is live and
>     pipelines run against the bucket, do the existing local clients
>     (currently in operator's local `clients/<slug>/`, none in the
>     bucket as of this handoff) get migrated via `upriver sync push`?
>     Operator's call. Default: only new clients live in the bucket.

Slices once Q1 + Q2 are answered (per OPTION-B-MIGRATION.md):
1. `packages/worker/` — one job per pipeline stage (scrape, audit,
   synthesize, design-brief, scaffold, clone, fixes-plan, qa).
2. Replace `/api/run/<command>` with `/api/enqueue/<command>` —
   posts a job to the worker platform, returns a job-id.
3. `/api/jobs/<id>` SSE endpoint streaming status from the worker.
4. Update `PipelineStages.tsx` to enqueue+stream instead of
   spawn+stream.
5. Worker container with `claude` CLI + Lighthouse + squirrelscan +
   Playwright; baked into a registry image.

Phase 3 estimate: 5–7 days. Reversible at the API boundary if the
worker platform turns out to be a poor fit.

## Where to find things

```
packages/core/src/data/
  client-data-source.ts    # interface
  local-fs.ts              # LocalFsClientDataSource
  supabase.ts              # SupabaseClientDataSource + factory
  *.test.ts                # 13 unit tests
packages/core/scripts/smoke-data-source.mjs   # live-bucket E2E
packages/dashboard/src/lib/
  data-source.ts           # resolveClientDataSource() + assertLocalDataSource()
  fs-reader.ts             # async; routes through the abstraction
  report-reader.ts         # async
  intake-writer.ts         # async
  pipeline.ts              # async detectStage()
  run-cli.ts               # still local-only (Phase 3 replaces this)
packages/dashboard/src/middleware.ts          # 503 placeholder for run-cli paths
packages/cli/src/commands/sync/{push,pull}.ts # the new sync commands
.vercel/project.json       # links to upriver-platform on Vercel
.env                       # operator-local secrets, gitignored
```

Phase 3 will add `packages/worker/` (does not exist yet).

## MCP servers

Already authenticated in this repo:
- `mcp__plugin_supabase_supabase__*` — full toolset. Note:
  `confirm_cost` must be called before `create_project` /
  `create_branch`.
- `mcp__plugin_vercel_vercel__*` — full toolset. Note: no
  `create_team` (do it in dashboard if needed); no explicit
  `create_project` (created implicitly by `deploy_to_vercel` —
  which actually delegates to `vercel deploy` CLI). For env vars,
  use `vercel env add NAME production --value V --yes` via Bash;
  preview-env adds need a git branch arg or get rejected even
  with `--yes` (known CLI quirk; preview deploys aren't wired yet
  anyway).

If the deferred-tools list shows them but their schemas aren't loaded,
use `ToolSearch` with `select:<tool_name>` to load before calling.

## Repo conventions

- `pnpm -r run typecheck` must pass before every commit
- `pnpm --filter @upriver/cli run test` before any CLI commit
- Atomic commits per slice — one workstream item per commit
- Commit messages: `feat(workstream-X): X.N — <one-line summary>`
- `Co-Authored-By: Claude` trailer is rejected by the harness — omit
- Subprocess: `execFile` with arg arrays, never shell strings
- `.planning/roadmap/` is committed (not gitignored)

## What's still operator-input-only (don't block on)

- Service-role key — already in local `.env` and on Vercel for
  Production + Development env. If a fresh checkout, paste from
  Supabase dashboard → Settings → API.
- `RESEND_API_KEY` + `upriverhudsonvalley.com` verified in Resend
  dashboard. Not blocking Phase 3.
- `UPRIVER_RUN_TOKEN` — currently unset; dashboard treats as
  open same-origin. Will be replaced by Supabase Auth in Phase 4.
- Phase 3 decisions (Q1, Q2, Q3 above).
- Preview env vars on Vercel — empty by design until git
  integration goes on.

## Auto-mode posture

Prefer action, minimize interruptions, but pause for:
- Hard-to-reverse changes (deploys, billing, destructive git)
- Architectural calls a junior PM couldn't make alone
- More than 40 commits in a single session

When stop conditions hit, write a fresh `HANDOFF.md` and surface.

Begin by reading HANDOFF.md, then surface the Phase 3 architectural
decisions for confirmation before scaffolding `packages/worker/`.
```

---

## When to refresh this prompt

Update this file whenever:
- A phase boundary in `OPTION-B-MIGRATION.md` is crossed
- Major architectural decisions land that change the "first step"
- Project IDs, live env values, or MCP-server availability rotates
- The "what's still operator-input-only" list shrinks meaningfully

The fresh-session prompt block lives between the `---` markers above —
keep that block self-contained and pasteable.
