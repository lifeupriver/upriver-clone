# Handoff — current state, pending work

**Last commit:** `79429ea feat(option-b): phase 1 — vercel adapter + UPRIVER_DATA_SOURCE guard`
**Branch:** `main` (5 commits ahead of `origin/main`)
**Working tree:** clean
**Tests:** `pnpm --filter @upriver/cli run test` → 72/72 green
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

**Phase 1 deferred (slices 4–6):**
- Vercel project creation + env-var setup deferred per operator call.
  Reasoning: `deploy_to_vercel` MCP is the only project-creation path,
  and the first deploy would only render 503s for filesystem routes
  until Phase 2 ships. Defer until Phase 2 is ready so the first
  hosted deployment is a working one.
- Vercel team `Upriver` (id `team_FIxyAOaCMqi7KGYQntQeCbuW`) is ready
  to receive the project when Phase 2 lands.

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

### Phase 1 — adapter swap + Vercel project (CODE-SIDE DONE, project creation deferred)
1. ✅ `pnpm add -D @astrojs/vercel --filter @upriver/dashboard` (commit `79429ea`)
2. ✅ Swap adapter in `packages/dashboard/astro.config.mjs`
3. ✅ Runtime guards via `UPRIVER_DATA_SOURCE` (default `local`) +
   middleware → 503 placeholder when `supabase`
4. ⏸ Create Vercel project — deferred until Phase 2 ships, so the
   first deploy is a working one
5. ⏸ Set env vars on the Vercel project — deferred with #4
6. ⏸ Don't deploy — moot until #4–5

### Phase 2 — storage abstraction (2–3 days)
- `ClientDataSource` interface in `packages/core/src/data/`
- `LocalFsClientDataSource` (current) + `SupabaseClientDataSource` (new)
- Refactor `dashboard/src/lib/fs-reader.ts` to use the abstraction
- New `upriver sync push|pull <slug>` CLI commands
- Vercel deploy uses `UPRIVER_DATA_SOURCE=supabase`

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
