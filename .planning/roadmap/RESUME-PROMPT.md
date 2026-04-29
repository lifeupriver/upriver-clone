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

- Branch: `main`, 5 commits ahead of `origin/main`. Tests 72/72 green,
  typecheck clean across all packages. Working tree clean.
- Supabase project `upriver-platform` (id `qavbpfmhgvkhrnbqalrp`) is
  ACTIVE_HEALTHY in the `Upriver` Pro org
  (id `ezbdnbazneviadrqalph`). Bucket `upriver` exists, private,
  500 MB cap. Env vars wired in `.env.example`.
- Vercel team `Upriver` exists (id `team_FIxyAOaCMqi7KGYQntQeCbuW`).
  No upriver-platform Vercel project yet — intentionally deferred
  until Phase 2 ships, so the first deploy is a working one.
- Architecture: Option B (full hosted Vercel + Supabase). Phase 1
  code-side complete (commit `79429ea`); project creation slices
  4–6 deferred. **Next phase to start: Phase 2 (storage abstraction).**

## Phase 1 — what landed

- `@astrojs/vercel` adapter (replaced `@astrojs/node`); broken
  `start` script removed.
- `packages/dashboard/src/lib/data-source.ts` —
  `getDataSource()` reads `UPRIVER_DATA_SOURCE` (default `local`);
  `assertLocalDataSource()` throws `DataSourceUnavailableError` when
  `supabase`. Phase 2 will wire the actual supabase implementation.
- `getClientsBase()` (fs-reader.ts) and `resolveUpriverBin()`
  (run-cli.ts) gate via `assertLocalDataSource()` — every fs route is
  covered through these helpers.
- `src/middleware.ts` translates `DataSourceUnavailableError` to a
  clean 503 (HTML or JSON depending on `Accept`).
- `.gitignore` ignores `.vercel/`.

## Immediate next step — Phase 2 of OPTION-B-MIGRATION.md

Storage abstraction. From `OPTION-B-MIGRATION.md`:

1. Define `ClientDataSource` interface in `packages/core/src/data/`
   with `listClients()`, `readClientFile(slug, path)`,
   `writeClientFile(slug, path, body)`,
   `signClientFileUrl(slug, path, ttl)`. Pure interface, no IO.
2. Implementations:
   - `LocalFsClientDataSource` — current behavior on `clients/<slug>/`.
   - `SupabaseClientDataSource` — `@supabase/supabase-js`, bucket
     `upriver`, prefix `clients/<slug>/`.
3. Refactor `dashboard/src/lib/fs-reader.ts` (and friends) to consume
   the abstraction; pick implementation from `getDataSource()`.
4. New CLI commands: `upriver sync push <slug>` and
   `upriver sync pull <slug>` — idempotent (skip on size+mtime match).
5. Once Phase 2 verifies locally with `UPRIVER_DATA_SOURCE=supabase`
   pointed at the live bucket, **then** circle back to deferred Phase 1
   slices 4–6: create the Vercel project via `deploy_to_vercel`, scope
   to team `team_FIxyAOaCMqi7KGYQntQeCbuW`, root `packages/dashboard`,
   set env vars (`UPRIVER_SUPABASE_URL`,
   `UPRIVER_SUPABASE_PUBLISHABLE_KEY`,
   `UPRIVER_SUPABASE_SERVICE_KEY`, `UPRIVER_DATA_SOURCE=supabase`,
   `ANTHROPIC_API_KEY`, `UPRIVER_RUN_TOKEN` placeholder).

Phase 2 needs the **Supabase service-role key** in local `.env`
(operator paste from Supabase dashboard → Settings → API; not exposed
via MCP). Surface this requirement before starting implementation.

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

Begin by reading HANDOFF.md, then start Phase 2 step 1 (after
confirming the Supabase service-role key is available in `.env`).
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
