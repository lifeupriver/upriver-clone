# Handoff — current state, pending work

**Last commit:** `a41582d docs(roadmap): refresh resume prompt for fresh-context handoff`
**Branch:** `main` (15 commits ahead of `origin/main`)
**Working tree:** clean
**Production URL:** https://upriver-platform.vercel.app — first deploy `dpl_2i5DXSd62beSuFdnGo7uSorTpN5T` is READY, all routes 200/302, empty-state expected (bucket has no client slugs yet).
**Tests:** `pnpm --filter @upriver/cli run test` → 72/72 green; `pnpm --filter @upriver/core run test` → 21/21 green
**Typecheck:** `pnpm -r run typecheck` → clean across all packages
**Dashboard build:** `pnpm --filter @upriver/dashboard run build` → produces valid `.vercel/output/` with `_render.func`

This handoff captures the state at the moment a context-window switch
was triggered. Everything below is current as of this commit.

---

## What's standing up RIGHT NOW

**Decided:**
- Architecture: **Option B** (full Vercel hosting). User explicitly
  picked B over A on the previous turn. Migration plan in
  `.planning/roadmap/OPTION-B-MIGRATION.md` (4 phases).
- Vercel team `Upriver` exists (id `team_FIxyAOaCMqi7KGYQntQeCbuW`,
  slug `upriver`) — user renamed `Newburgh Ready` → `Upriver`. Team
  already contains 3 unrelated projects (`roll`, `fairshare`,
  `newburghready`) that stay where they are.
- Supabase project `upriver-platform` exists (id
  `qavbpfmhgvkhrnbqalrp`, region `us-east-1`, status
  `ACTIVE_HEALTHY`, $10/month). In the new `Upriver` Pro org
  (id `ezbdnbazneviadrqalph`).
- Supabase Storage bucket `upriver` created, private, 500 MB object
  cap. Layout: `clients/<slug>/...` + `reports/<slug>/...`.

**Wired in code:**
- `.env.example` updated with the real Supabase URL + publishable key
  inline. Still needs the service-role key pasted from the Supabase
  dashboard (Settings → API → service_role) — never exposed via MCP.
- `packages/cli/src/util/env.ts` registers
  `UPRIVER_SUPABASE_URL`, `UPRIVER_SUPABASE_SERVICE_KEY`,
  `UPRIVER_SUPABASE_PUBLISHABLE_KEY`, `UPRIVER_SUPABASE_BUCKET`,
  `RESEND_API_KEY`, `UPRIVER_REPORT_FROM`.
- `upriver doctor` checks all of the above.
- `upriver report send` delivers via Resend when `RESEND_API_KEY` is
  set; falls back to manual-print otherwise. `--from` flag +
  `UPRIVER_REPORT_FROM` env override the sender. Default sender
  `reports@upriverhudsonvalley.com`. `--dry-run` flag for testing.
- `next-steps.astro` ships live pricing: Polish $2,800 / Rebuild
  $9,500 / Rebuild + content $18,500. Benefit-framed copy.
- Audit `--mode=all` runs LLM C.3–C.5 deep + tooling-driven `--deep`
  passes. `--deep` flag stays as alias for tooling-only.

**Phase 1 code-side complete (commit `79429ea`):**
- Dashboard adapter is `@astrojs/vercel` (was `@astrojs/node`).
  `@astrojs/node` dep removed; broken `start` script removed.
- `UPRIVER_DATA_SOURCE` env switch landed: default `local` keeps
  current behavior; `supabase` will be wired in Phase 2.
- `packages/dashboard/src/lib/data-source.ts` exposes
  `getDataSource()`, `assertLocalDataSource()`, and
  `DataSourceUnavailableError`.
- `getClientsBase()` (fs-reader) and `resolveUpriverBin()` (run-cli)
  call `assertLocalDataSource()` — covers every fs-touching route via
  the shared base helpers.
- `src/middleware.ts` catches the error and returns a 503 with a clean
  HTML placeholder (or JSON when `accept: application/json`).
- `.gitignore` now ignores `.vercel/`.

**Phase 2 complete (commits `e6a9f8f`, `bc8212e`, `9f126d6`, `8e5b143`):**
- `@upriver/core/data` exports `ClientDataSource` interface +
  `LocalFsClientDataSource` and `SupabaseClientDataSource` impls.
  `createSupabaseClientDataSourceFromEnv()` factory pulls
  `UPRIVER_SUPABASE_URL` + `_SERVICE_KEY`/`_PUBLISHABLE_KEY` +
  `_BUCKET` (default `upriver`).
- Dashboard fs-reader/report-reader/intake-writer/pipeline now async
  and route through the configured data source. 18 .astro pages and
  2 API endpoints updated.
- `upriver sync push <slug>` and `upriver sync pull <slug>` CLI
  commands (atomic upsert; `--exclude` and `--dry-run` flags).
  Default skip: `node_modules/`, `.git/`, `.DS_Store`.
- Local dev unchanged (`UPRIVER_DATA_SOURCE` defaults to `local`).

**Phase 1 slices 4–6 — DONE:**
- Vercel project `upriver-platform` (id
  `prj_LFSBjXlYAZCBj5tsuNsmneeJysL9`) created under team `Upriver`.
  Root directory set to `packages/dashboard` via dashboard UI (only
  way — no MCP/CLI for this setting).
- `.vercel/project.json` link committed to repo root (gitignored).
- Env vars set on Production + Development environments via
  `vercel env add`: `UPRIVER_SUPABASE_URL`,
  `UPRIVER_SUPABASE_PUBLISHABLE_KEY`,
  `UPRIVER_SUPABASE_SERVICE_KEY`, `UPRIVER_DATA_SOURCE=supabase`,
  `ANTHROPIC_API_KEY`. Preview env skipped — Vercel CLI's
  unattended `env add` for preview keeps prompting for git branch
  even with `--yes`; preview deploys aren't wired yet anyway.
- Skipped: `UPRIVER_RUN_TOKEN` (not set; current dashboard treats
  unset = open same-origin, which is fine until Phase 4 Supabase
  Auth lands. `RESEND_API_KEY` (Phase 0 deliverable, still pending).
- First production deploy succeeded: `vercel deploy --prod --yes`
  from repo root; build cd's into `packages/dashboard` per the
  Root Directory setting; Astro vercel adapter runs cleanly.
- Smoke verified: GET / → 302 → /clients → 200; /deliverables →
  200; /clients/new → 200; /clients/&lt;missing&gt; → 302 redirect.
  Empty-state hint updated to read "Looking in: Supabase bucket
  clients/" on supabase mode.

---

## All four planning docs

```
.planning/roadmap/
├── PRODUCT-ROADMAP.md       ← original spec + per-workstream status banners
├── DRIFT-REPORT.md          ← spec-vs-shipped gap analysis (with merge addendum)
├── DECISIONS-NEEDED.md      ← 2 open + credential drops; resolved table
├── OPTION-B-MIGRATION.md    ← NEW. 4-phase plan for hosted Vercel + Supabase
├── HANDOFF.md               ← this file
└── RESUME-PROMPT.md         ← fresh-session prompt; paste at start of new context
```

Read order for a fresh session: **RESUME-PROMPT.md** → **HANDOFF.md
(this file)** → **OPTION-B-MIGRATION.md** → DECISIONS-NEEDED.md as
reference. Spec doc and drift report are background.

---

## All workstreams from PRODUCT-ROADMAP.md — status snapshot

| Workstream | Status | Notes |
|---|---|---|
| A. Branded report | ✅ Complete | A.1–A.6 all shipped. A.4 hero metrics use a parallel path independent of C.7 by design. |
| B. Intake portal | ✅ Complete (B.3 deferred) | B.3 collected on `next-steps.astro` instead of `findings.astro`. |
| C. Audit depth + GEO/AEO | ✅ Complete | C.1, C.2, C.5 narrower than spec; defensible. C.6 canonicalized as `--mode`. C.7 schema is `{scorePoints, description}` (parallel to A.4's path). |
| D. Clone fidelity | ✅ Complete | Pixel + copy diff; layout-structure + token-adherence not implemented. |
| E. Improvement layer | ✅ Mostly | E.5 ships as `report compare` stub. Full E.5 (auto re-audit chain) blocked on preview-deploy infra. |
| F. Operator GUI | ✅ Mostly | F.6 ships as `report bundle` light variant (local zip). F.5 is `UPRIVER_RUN_TOKEN` shared-secret gate; full Supabase Auth pending in Phase 4 of Option B. F.6 full Supabase sync is Phase 2 of Option B. |
| G. Efficiency | ✅ Complete | G.1–G.7 all shipped. G.4 SDK runner is generic, not Agent-SDK-specific. |
| H. Skills | ✅ Mostly | H.1 (symlink expansion) is operator-side filesystem work. |
| I. Tooling-driven deep audit | ✅ I.1–I.9 shipped | Added post-roadmap via `ff2fd67`. I.10 (run-all `--deep` pass-through) and I.13 (dimension surfacing in reports) still open. |

---

## Decisions still open (from DECISIONS-NEEDED.md)

**Policy items still needing your call:**
- **C.** `UPRIVER_RUN_TOKEN` policy — local-only or set a value?
  Probably moot once Option B Phase 4 lands Supabase Auth, but for
  the interim `pnpm dev` use case still relevant.
- **E.** `RESEND_API_KEY` value — code is wired; just needs the API
  key + `upriverhudsonvalley.com` verified in Resend dashboard.

**Infrastructure decisions for Option B:**
- **Phase 3 worker platform** — recommended Inngest. Alternatives:
  Trigger.dev, GitHub Actions, Vercel Fluid Compute, Fly.io.
- **Phase 3 container image registry** — recommended GitHub Container
  Registry (free).
- **Phase 4 operator email** — recommended single seed for now,
  allowlist later.
- **Migration of existing clients/<slug>/ data** — when Phase 2 ships,
  back-migrate existing locals to the bucket, or only new clients?
- **Service-role key** — operator must paste it manually from
  Supabase dashboard into local `.env` and into the Vercel project's
  env vars. Not exposed via MCP.

---

## OPTION-B-MIGRATION phases — quick reference

Full detail in `.planning/roadmap/OPTION-B-MIGRATION.md`.

### Phase 1 — adapter swap + Vercel project (DONE)
1. ✅ `pnpm add -D @astrojs/vercel` (commit `79429ea`)
2. ✅ Adapter swap in `astro.config.mjs`
3. ✅ Runtime guards via `UPRIVER_DATA_SOURCE` + 503 middleware
4. ✅ Vercel project `upriver-platform` created under team `Upriver`,
   Root Directory = `packages/dashboard` (set via dashboard UI)
5. ✅ Env vars set on Production + Development environments
6. ✅ First production deploy at https://upriver-platform.vercel.app

### Phase 2 — storage abstraction (DONE)
- ✅ `ClientDataSource` interface in `packages/core/src/data/`
- ✅ `LocalFsClientDataSource` + `SupabaseClientDataSource`
- ✅ Dashboard libs refactored to use the abstraction
- ✅ `upriver sync push|pull <slug>` CLI commands
- ✅ Vercel deploy with `UPRIVER_DATA_SOURCE=supabase` live

### Phase 3 — pipeline execution off the dashboard (5–7 days)
- Inngest jobs per pipeline stage in `packages/worker/`
- Replace `/api/run/*` with `/api/enqueue/*`
- `/api/jobs/<id>` SSE for live status
- Container image with `claude` + Lighthouse + squirrelscan + Playwright

### Phase 4 — auth (1–2 days)
- Supabase Auth (operator login + per-slug client view tokens)
- Middleware on `/clients/*` and `/api/enqueue/*`
- Replaces `UPRIVER_RUN_TOKEN`

---

## Critical context for the next session

### MCP servers in use
- **Supabase MCP** — authenticated, sees the `Upriver` org. Use
  `mcp__plugin_supabase_supabase__*` tools. Must call `confirm_cost`
  before `create_project` or `create_branch`.
- **Vercel MCP** — authenticated. Use `mcp__plugin_vercel_vercel__*`.
  Note: no `create_team` tool (do manually in dashboard if needed);
  no explicit `create_project` (created implicitly via `deploy_to_vercel`).

### Project IDs to remember
- Supabase project: `qavbpfmhgvkhrnbqalrp` (upriver-platform)
- Supabase org: `ezbdnbazneviadrqalph` (Upriver, Pro)
- Vercel team: `team_FIxyAOaCMqi7KGYQntQeCbuW` (Upriver)

### Live env values
- `UPRIVER_SUPABASE_URL=https://qavbpfmhgvkhrnbqalrp.supabase.co`
- `UPRIVER_SUPABASE_PUBLISHABLE_KEY=sb_publishable_hy3i0LN--QsvbLXm03Amhw_8GLFGIOn`
- Service-role key: in Supabase dashboard → Settings → API. **Operator
  must paste manually** — not exposed via MCP.

### Repo conventions
- `pnpm -r run typecheck` must pass before every commit
- `pnpm --filter @upriver/cli run test` before any CLI commit
- Atomic commits per slice; commit messages reference workstream
  letter and item id (e.g., `feat(workstream-G): G.6 — ...`)
- `Co-Authored-By: Claude` trailer is rejected by the harness — ship
  commits without it
- Subprocess security: `execFile` with explicit arg arrays, never the
  shell-string variant
- `.planning/roadmap/` is committed (not gitignored)
