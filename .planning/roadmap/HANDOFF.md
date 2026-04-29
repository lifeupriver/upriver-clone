# Roadmap session handoff

**Last commit:** `56dbd9f feat(workstream-F): F.5 — token gate for /api/run/*`
**Branch:** `main`
**Commits this sub-session:** 5 (range `42bb101..56dbd9f`)
**Total resumed-session commits:** 18 across two sub-sessions (started from `0d8fdd2`).
**Pushed:** no — all local. `main` has diverged 38 commits from `origin/main`.

## What shipped this sub-session

| Workstream | Items | Commit |
|---|---|---|
| H.4 | `--design-system <client\|upriver>` flag on `upriver clone`, threaded into agent prompt | `42bb101` |
| G.7 | `upriver run all <slug>` pipeline orchestrator (commands/run/all.ts) | `c98fedb` |
| G.6 | `discover` reuses scrape's page records when `<dir>/pages/` exists | `7f2a21c` |
| F.2 | Live pipeline view: PipelineStages.tsx React island with per-stage Run buttons + SSE log panel | `246a09b` |
| F.5 | Pragmatic token gate on /api/run/* via UPRIVER_RUN_TOKEN env + meta-tag bridge to client islands | `56dbd9f` |

`pnpm -r run typecheck` is clean. `pnpm --filter @upriver/cli run test` is **62/62 green**. Dashboard build clean (5.73 kB gzipped client chunk for the new island).

## Current state of each workstream

### Workstream A — report shell
Done.

### Workstream B — intake
- B.1, B.2, B.4, B.5, B.6 done.
- **B.3** intentionally skipped (per-page wants already on `next-steps.astro`).

### Workstream C — audit depth + GEO/AEO expansion
- C.1, C.2, C.6, C.7 done.
- **C.3 content-strategy deep, C.4 conversion-psychology deep, C.5 competitor-deep** — still open. These are agent-driven passes that should land under `packages/cli/src/deep-audit/passes/<name>/`. That directory still doesn't exist. The `--mode=deep` flag in `audit.ts` warns and exits — landing C.3 means: (1) create `packages/cli/src/deep-audit/runner.ts` (Agent SDK invocation + result aggregation), (2) put per-pass prompts under `.agents/skills/`, (3) wire the runner into `audit.ts` when `--mode` includes deep.

### Workstream D — clone fidelity
**Complete.** D.1, D.2, D.3, D.4, D.5 all shipped.

### Workstream E — improvement layer
- E.1, E.2, E.3, E.4, E.6, E.7 done.
- **E.5** Before/after re-audit on the preview branch + improvement-report.md. Genuinely blocked on preview-deploy infra (no Vercel wiring, no preview URL convention). When unblocked: snapshot `audit-package.json` before improve runs, scrape preview URL into a sibling client subdir, re-run audit, diff per-dimension scores into `<clientDir>/improve/improvement-report.md`. Probably wants a `upriver report compare <slug-before> <slug-after>` helper.

### Workstream F — dashboard
- F.1, F.2, F.3, F.4, F.5 done.
- **F.5 caveat:** the token gate is shared-secret only. Full Supabase per-user auth still pending — pulling in `@supabase/auth-helpers-nextjs`-style middleware on the dashboard, validating sessions, gating the API by user role rather than a single env var.
- **F.6** `upriver dashboard deploy` + Supabase storage sync. Blocked on Supabase decisions (bucket convention, signed-URL conventions, retention).

### Workstream G — performance / pipeline
- G.1, G.2, G.5, G.6, G.7 done.
- **G.3, G.4** still blocked on C.3–C.5 deep passes existing.

### Workstream H — skills
- H.2, H.3, H.4 done.
- **H.1** Expand the symlink set in `.agents/skills/`. Filesystem fiddling — operator-side, not a code task.

## Decisions still waiting on the user
- **Pricing copy** for the three scope tiers on `next-steps.astro` (placeholders).
- **Hosted-report URL** convention (env var `UPRIVER_REPORT_HOST`).
- **SMTP integration** for `upriver report send`.
- **Supabase upload** for `upriver report build --upload`, plus full F.5 / F.6 auth + storage decisions.
- **`Co-Authored-By` trailer** — harness rejects it as fabricated authorship; commits ship without it. Resolve in `CLAUDE.md`.
- **`token-and-credit-usage.log` USD rate** (default `$0.001/credit` in `cost-summary.ts:DEFAULT_USD_PER_CREDIT`).
- **`UPRIVER_RUN_TOKEN`** — F.5 looks for this env var on the dashboard server. Set it on any non-local deploy or the API is wide open.

## Next 3 concrete TODOs for next session

1. **C.3 — content-strategy deep pass scaffold + first pass.** Create `packages/cli/src/deep-audit/runner.ts` (Agent SDK runner that takes a pass spec and returns AuditPassResult[]). Add `packages/cli/src/deep-audit/passes/content-strategy/{prompt.md, run.ts}` as the first deep pass — pulls in scraped pages + intake + brand voice, asks the agent to identify pillar pages and content gaps, returns AuditFinding[] with `dimension: 'content'` and rich estimatedImpact. Wire `--mode=deep|all` in `audit.ts` to invoke the runner. Write at least a smoke test that runs the runner with a stubbed agent client.
2. **F.6 light variant — local report-bundle export.** F.6 full Supabase sync is blocked, but the skill-adjacent piece is exporting a deterministic report bundle: zip `<clientDir>/report-out/` plus `audit-package.json` + `clone-fidelity-findings.json` + `improvement-opportunities.md` into `<clientDir>/upriver-report-<date>.zip` via `upriver report bundle <slug>`. Operator can then upload manually until Supabase lands.
3. **E.5 preview-deploy stub — `upriver report compare`.** Even without preview-deploy infra, the comparator is useful for any "before" / "after" client subdirs an operator manually creates. New file `packages/cli/src/commands/report/compare.ts` reading two `audit-package.json` files and emitting a markdown diff (per-dimension score deltas, finding closures, finding additions). Once preview-deploy is wired this becomes the engine for E.5; for now it's manually-driven.

## Notes for the next session

- The PipelineStages island duplicates the SSE consumer from NewClientForm.tsx. If a third caller emerges, extract to `packages/dashboard/src/lib/sse-client.ts`. Skipped this round because the dashboard package has no test runner and adding an untested shared util is a larger move than F.2 needs.
- G.6 only de-duplicates the discover step-2 batch. Other potential reuse sites (audit reading scrape's pages, synthesize reading discover's content-inventory) already work that way — the duplicate-batch problem was localized to discover. Don't refactor more callers without evidence of duplicate batches.
- `upriver run all` shells out via `process.execPath + process.argv[1]` so the same node binary + bin script that ran the orchestrator are used for each stage. If the bin script ever moves or the orchestrator is invoked from a non-CLI entry, that path resolution will need rethinking.
- The F.5 meta-tag bridge means a non-DashboardLayout page (e.g. a deliverable layout) won't see the token. If any non-dashboard page needs to call /api/run/*, copy the meta tag into that layout too.
- Token-gate checks `request.headers.get('x-upriver-token')` pre-validation. If the dashboard ever adds CORS / cross-origin callers, double-check that the preflight allows the custom header.
- `clients[slug]/index.astro` no longer imports the static PipelineTrack component. The Astro file `PipelineTrack.astro` is still on disk. Leave it for now — easy to restore if the React island ever proves problematic, and it's not being tree-shaken out of any other entry.
- The `cmdParts = stage.name.split(/\s+/)` logic in `run/all.ts` exists to handle two-word commands (`fixes plan`). If a future stage has more than two words, the parser still works; if any stage has special-character args, switch to an explicit `[command, ...subcommands]` shape on the Stage interface.
