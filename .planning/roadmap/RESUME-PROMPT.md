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

- Branch: `main`, synced with `origin/main`. Tests 72/72 green,
  typecheck clean across all packages.
- Supabase project `upriver-platform` (id `qavbpfmhgvkhrnbqalrp`) is
  ACTIVE_HEALTHY in the new `Upriver` Pro org
  (id `ezbdnbazneviadrqalph`). Bucket `upriver` exists, private,
  500 MB cap. Env vars wired in `.env.example`.
- Vercel team `Upriver` exists (id `team_FIxyAOaCMqi7KGYQntQeCbuW`).
  No upriver-platform Vercel project yet — Phase 1's first step.
- Architecture: Option B (full hosted Vercel + Supabase). Phase 1
  has NOT started — the dashboard is still on the Astro Node adapter.

## Immediate next step — Phase 1 of OPTION-B-MIGRATION.md

1. `pnpm add -D @astrojs/vercel --filter @upriver/dashboard`
2. Swap adapter in `packages/dashboard/astro.config.mjs` from
   `node({ mode: 'standalone' })` to `vercel()`.
3. Add a runtime guard via a new `UPRIVER_DATA_SOURCE` env var:
   default `local` keeps current behavior; `supabase` is the Phase 2
   path. Filesystem-touching routes detect the flag and either render
   normally (local) or return a clear 503 / placeholder (supabase
   without Phase 2 backend in place).
4. Create the Vercel project via `mcp__plugin_vercel_vercel__deploy_to_vercel`,
   scoped to the Upriver team (slug `upriver`), root directory
   `packages/dashboard`.
5. Set env vars on the Vercel project: UPRIVER_SUPABASE_URL,
   UPRIVER_SUPABASE_PUBLISHABLE_KEY, ANTHROPIC_API_KEY (if available),
   plus a placeholder UPRIVER_RUN_TOKEN.
6. Do NOT deploy code yet — Phase 1 is just adapter + project
   creation. Deploying without Phase 2 storage produces 500s on every
   page that reads the filesystem.

After Phase 1 ships (one or two commits), surface a short status note
and ask whether to proceed to Phase 2 (storage abstraction).

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

Begin by reading HANDOFF.md, then start Phase 1 step 1.
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
