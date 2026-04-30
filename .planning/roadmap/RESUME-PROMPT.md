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

## Headline state

- Branch: `main`, 13 commits ahead of `origin/main`. Tests 72/72 (cli)
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

Open architectural decisions to confirm before coding:
- **Worker platform** — recommendation Inngest. Alternatives:
  Trigger.dev, GitHub Actions, Vercel Functions w/ Fluid Compute,
  Fly.io. See OPTION-B-MIGRATION.md Phase 3 table.
- **Container image registry** — recommendation GitHub Container
  Registry (free).
- **Existing-client back-migration** — when do operators run
  `upriver sync push` against existing local clients? Operator's
  call.

Slices (per OPTION-B-MIGRATION.md):
1. `packages/worker/` — one job per pipeline stage (scrape, audit,
   synthesize, design-brief, scaffold, clone, fixes-plan, qa).
2. Replace `/api/run/<command>` with `/api/enqueue/<command>` —
   posts to Inngest, returns a job-id.
3. `/api/jobs/<id>` SSE endpoint streaming status from Inngest.
4. Update `PipelineStages.tsx` to enqueue+stream.
5. Worker container with `claude` CLI + Lighthouse + squirrelscan +
   Playwright; baked into a GHCR image.

Surface decision questions before scaffolding `packages/worker/`.

## MCP servers

Already authenticated in this repo:
- `mcp__plugin_supabase_supabase__*` — full toolset. Note:
  `confirm_cost` must be called before `create_project` /
  `create_branch`.
- `mcp__plugin_vercel_vercel__*` — full toolset. Note: no
  `create_team` (do it in dashboard if needed); no explicit
  `create_project` (created implicitly by `deploy_to_vercel`).

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

- Service-role key from Supabase dashboard pasted into local `.env`
  and into Vercel project env vars. Not exposed via MCP.
- `RESEND_API_KEY` value + `upriverhudsonvalley.com` verified in
  Resend dashboard.
- `UPRIVER_RUN_TOKEN` value (or "local-only forever" — moot once
  Phase 4 Supabase Auth lands).
- Phase 3 worker-platform pick (recommended Inngest), container
  registry pick (recommended GHCR), and operator email seed for
  Phase 4 auth.

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
