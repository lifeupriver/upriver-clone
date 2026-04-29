# Roadmap session handoff

**Last commit:** `bb0362f feat(workstream-C): C.2 — typography base audit pass`
**Branch:** `main`
**Commits this session:** 12 (range `cef4f43..bb0362f`, started from `0d8fdd2`)
**Pushed:** no — all local. `main` has diverged 33 commits from `origin/main`.

## What shipped this session

| Workstream | Items | Commit |
|---|---|---|
| E.4 | One PR per improve track via `gh pr create` (best-effort, --no-pr opt-out) | `cef4f43` |
| D.3 | Clone-fidelity emits synthetic AuditFindings; `fixes plan` reads them | `bcd38a3` |
| C.1 | GEO base audit pass (TL;DR / llms.txt / factoids / entity disambiguation) | `130867c` |
| D.4 | Unmatched-CDN URL check promoted into a fidelity gate | `7c4b347` |
| D.5 | `clone/verify` reads prior `clone-qa/summary.json` and threads it into the verify prompt | `094a2b7` |
| E.7 | `improvement-opportunities.md` generator (missing pages + pillar candidates + finding-derived) | `a5c09c7` |
| F.4 | `upriver cost <slug>` + cost-summary util parsing `token-and-credit-usage.log` | `f033f42` |
| C.7 | `EstimatedImpact` on findings (default heuristic from priority × effort) | `db089ed` |
| C.6 | `--mode base/deep/all` flag on `upriver audit` (deep is reserved for C.3–C.5) | `47e32b4` |
| C.2 | Typography base audit pass (hierarchy / font count / type-scale) | `bb0362f` |

`pnpm -r run typecheck` is clean. `pnpm --filter @upriver/cli run test` is **62/62 green** (was 54/54; added +4 opportunities-generator + +4 cost-summary tests). `pnpm --filter @upriver/core run test` is 8/8.

## Current state of each workstream

### Workstream A — report shell
Done last session. No work this session.

### Workstream B — intake
- B.1, B.2, B.4, B.5, B.6 done (last session).
- **B.3** intentionally skipped: per-page wants already collected on `next-steps.astro`; only adds value if findings-page level wants are needed. Defer until product validation says it's needed.

### Workstream C — audit depth + GEO/AEO expansion
- C.1 ✓ (geo base)
- C.2 ✓ (typography base — emits `dimension: 'design'` to share scoring with the design pass; consider promoting to its own dimension once a typography dashboard exists)
- C.6 ✓ (`--mode` flag)
- C.7 ✓ (`estimatedImpact`)
- **C.3 content-strategy deep, C.4 conversion-psychology deep, C.5 competitor-deep** — still open. These are agent-driven passes that should land under `packages/audit-passes/src/<name>/index.ts` with an Agent SDK runner. Directory `packages/cli/src/deep-audit/passes/` referenced in roadmap **still doesn't exist**.
- The `--mode=deep` flag in `audit.ts` warns and exits — landing C.3 means: (1) wire the deep-pass runner, (2) add agent prompts per pass under .agents/skills/, (3) gate deep passes behind `--mode=deep|all`.

### Workstream D — clone fidelity
- D.1, D.2 done last session.
- D.3, D.4, D.5 ✓ this session.
- **Workstream D is now complete.**

### Workstream E — improvement layer
- E.1, E.2, E.3, E.6 done last session.
- E.4 ✓ (PR-per-track), E.7 ✓ (opportunities surfacing).
- **E.5 — before/after re-audit on the preview branch + improvement-report.md.** Genuinely blocked on preview-deploy infra (no Vercel wiring, no preview URL convention). When unblocked: snapshot `audit-package.json` before improve runs, after improve commit lands, scrape preview URL into a fresh client subdir, re-run audit, diff the dimension scores into `<clientDir>/improve/improvement-report.md`. Probably wants a sibling `upriver report compare <slug-before> <slug-after>` helper.

### Workstream F — dashboard
- F.1, F.3 done last session. F.4 ✓ this session.
- **F.2** Live pipeline view: replace static `PipelineTrack` in dashboard with run buttons hitting `/api/run/[command]` SSE.
- **F.5** Auth gate for `/api/run/*` (Supabase auth). Operator-only.
- **F.6** `upriver dashboard deploy` + Supabase storage sync.

### Workstream G — performance / pipeline
- G.1, G.2, G.5 done last session.
- **G.3, G.4** still blocked on C deep passes existing.
- **G.6** Single Firecrawl batch instead of per-command scrapes — tractable, not yet started.
- **G.7** Pipeline-level dependency graph + `upriver run all <slug>` — tractable, not yet started.

### Workstream H — skills
- H.2, H.3 done last session.
- **H.1** Expand the symlink set in `.agents/skills/`. Filesystem fiddling — operator-side.
- **H.4** `--design-system upriver|client` flag on `upriver clone`. Small, tractable.

## Decisions still waiting on the user
- **Pricing copy** for the three scope tiers on `next-steps.astro` (placeholders).
- **Hosted-report URL** convention (env var `UPRIVER_REPORT_HOST`).
- **SMTP integration** for `upriver report send`.
- **Supabase upload** for `upriver report build --upload`.
- **`Co-Authored-By: Claude Opus 4.7` trailer** — the harness rejects it as fabricated authorship. Commits in both sessions shipped without it. Resolve the policy conflict in `CLAUDE.md` if you want it on commits.
- **`token-and-credit-usage.log` USD rate.** F.4 defaults to `$0.001/credit`. If the real Firecrawl rate differs (it does — varies by tier), set the right default in `packages/cli/src/util/cost-summary.ts:DEFAULT_USD_PER_CREDIT` or always pass `--usd-per-credit`.
- **`.planning/roadmap/`** — was untracked at session start; this handoff (and the prior version) are now committed. If that's the wrong call, `git rm --cached .planning/roadmap/*` and add to `.gitignore`.

## Next 3 concrete TODOs for next session

1. **H.4 — `--design-system upriver|client` flag on `upriver clone`.** Smallest open item. The flag toggles whether clone passes the upriver design-token defaults to the agent prompt or sticks with extracted client tokens. Edit `packages/cli/src/commands/clone.ts` flags + `buildAgentPrompt`.
2. **G.6 — single Firecrawl batch.** Replace the per-command scrape calls with one batch issued at `init` time and stored under `<clientDir>/firecrawl-batch.json`. Subsequent commands read from that batch instead of re-scraping. Touch points: `commands/scrape.ts`, `commands/audit.ts`, `commands/discover.ts`. Keep a fallback path so individual commands still work pre-batch for dev runs.
3. **G.7 — `upriver run all <slug>` pipeline orchestrator.** Define a static dependency graph (init → scrape → discover → audit → synthesize → scaffold → clone → finalize → clone-fidelity → fixes plan → improve), execute in topological order, halt on first failure. Use `BaseCommand.skipIfExists` semantics so re-runs are idempotent. New file: `packages/cli/src/commands/run-all.ts`.

## Notes for the next session

- The verify prompt's "Prior fidelity report" block (D.5) only fires on iteration 1. Later iterations re-screenshot, so the prior report becomes stale; intentionally omitted there. If iteration 1 doesn't trigger improvements, consider widening to "first iteration that hasn't yet matched the prior gap".
- `EstimatedImpact.scorePoints` (C.7) is a heuristic ceiling — pass authors who think the priority/effort matrix understates impact should pass `opts.impact` explicitly. None do yet.
- `cost-summary.ts` parser is regex-based and assumes the log format the @upriver/core Firecrawl client writes. If anyone widens that format (e.g. adds a JSON-line variant), update the parser there before adding new event types upstream.
- `improve` now writes `<clientDir>/improvement-opportunities.md` on every invocation — even `--dry-run`. That's intentional (opportunities are derived from the audit, not the tracks) but means re-running improve after manually editing the file overwrites it. Operators who want to keep edits should commit them or copy elsewhere.
- The audit command's `--mode=deep` exits with a warning. Once C.3 lands, change that branch to dispatch to a deep-pass runner instead of returning early.
- Audit-passes dist (`packages/audit-passes/dist/`) and core dist had to be rebuilt after the `AuditDimension` change in C.1 and the `EstimatedImpact` addition in C.7. If `tsc` complains about cross-package types, run `pnpm --filter @upriver/core run build && pnpm --filter @upriver/audit-passes run build` first.
