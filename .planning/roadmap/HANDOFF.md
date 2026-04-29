# Roadmap session handoff

**Last commit:** `363aaca refactor(dashboard): consume pipeline stages from @upriver/core/pipeline`
**Branch:** `main`
**Total resumed-session commits:** 32 past `0d8fdd2`. Latest sub-session: 5 commits — drift audit, pipeline dedup (cli + react island), roadmap annotation, dashboard lib/pipeline dedup.
**Pushed:** no — all local. `main` has diverged 52 commits from `origin/main`.

## Newest sub-session: drift audit + cleanup

After the code-tractable roadmap was complete, I did a roadmap-vs-reality audit. Output: `.planning/roadmap/DRIFT-REPORT.md`. Five material drifts, eight narrower-than-spec items, five path drifts, two cross-workstream wiring gaps. **No item is missing entirely** — gaps are mostly naming, coverage, or wiring.

The drift report's recommendation #3 (the only one that didn't need user input) was completed: the pipeline stage list is now in `packages/core/src/pipeline/stages.ts` (with a `./pipeline` subpath export so the client React island can import without dragging in node-only modules). Both `commands/run/all.ts` and `PipelineStages.tsx` now read from one source.

**Drift-report recommendation status:**

1. C.6 flag name — `--audit-mode=sales|operator` (spec) vs `--mode=base|deep|all` (shipped). **Needs your pick.**
2. C.7 estimatedImpact schema — `{metric, magnitude, rationale}` (spec) vs `{scorePoints, description}` (shipped). **Needs your pick** and re-wires the report hero.
3. ~~G.7 pipeline-graph dedup~~ ✅ closed by `b34dbe0` + `363aaca`. Both `commands/run/all.ts`, the React island `PipelineStages.tsx`, and the server-side `dashboard/src/lib/pipeline.ts` now import from `@upriver/core/pipeline`. New stages added in one place propagate everywhere.
4. ~~Update `PRODUCT-ROADMAP.md` with shipped status~~ ✅ closed by `c532818`. Per-workstream banners summarize ✅/⚠️/🔧/🚫 and call out divergences inline. Original spec text preserved.
5. ~~Document partial state in the roadmap proper~~ ✅ closed alongside #4 — banners cover E.5/F.5/F.6/G.4 partial states.

Items 3, 4, 5 are autonomous closes from this last sub-session. Items 1 and 2 are the only drift items remaining and both need a product call.

`pnpm -r run typecheck` clean. CLI tests **72/72**. Dashboard build clean.

---

## What shipped this sub-session

| Workstream | Items | Commit |
|---|---|---|
| G.4 | Anthropic SDK runner for deep passes (with disk caching), CLI fallback when no API key | `c8c7b40` |
| (cli) | `upriver doctor` preflight — env vars + binaries + per-feature unlocks | `8d30fc4` |
| (G.7+) | `run all --audit-mode` pass-through to the audit stage | `d912952` |

`pnpm -r run typecheck` is clean. `pnpm --filter @upriver/cli run test` is **72/72 green**.

## Headline: code-tractable roadmap is complete

Every roadmap item that doesn't depend on an external decision is shipped. Workstreams A, C, D, G are 100% done. B is done modulo the one item that was deferred by design. E, F, H each have a single open item — and every one is blocked on something outside the codebase.

## Final state by workstream

### Workstream A — report shell ✓
All items done.

### Workstream B — intake ✓ (B.3 deferred)
- B.1, B.2, B.4, B.5, B.6 done.
- **B.3** skipped — per-page wants are already collected on `next-steps.astro`. Add the findings-page-level UI only when product validation says it's needed.

### Workstream C — audit depth + GEO/AEO ✓
C.1 through C.7 all shipped. The deep-audit runner architecture (Anthropic SDK + claude-cli fallback, parallelized, cached) is the foundation for any future deep passes — drop a new `DeepPassSpec` into `DEEP_PASSES` and it ships.

### Workstream D — clone fidelity ✓
All items done.

### Workstream E — improvement layer (E.5 partial)
- E.1, E.2, E.3, E.4, E.6, E.7 done.
- **E.5** has a working stub (`upriver report compare`). The full automated re-audit chain is blocked on preview-deploy infrastructure decisions (Vercel project conventions, preview URL convention, env wiring).
- **What's needed to unblock:** decision on whether previews live under one Vercel project (per-branch URLs) or per-client. Then a small command — `upriver report reaudit-preview <slug>` — that scrapes the preview URL into a sibling client subdir and chains into `upriver report compare`.

### Workstream F — dashboard (F.6 partial)
- F.1, F.2, F.3, F.4, F.5, F.6 light done.
- **F.6 full** Supabase storage sync is blocked on bucket/auth conventions.
- **What's needed to unblock:** decisions on Supabase bucket layout, signed-URL retention, and which auth provider gates the dashboard. The F.6 light bundle command produces the file shape; F.6 full just needs an upload step on top.

### Workstream G — performance / pipeline ✓
G.1 through G.7 all shipped.

### Workstream H — skills (H.1 operator-side)
- H.2, H.3, H.4 done.
- **H.1** is filesystem fiddling on the operator's box (symlinking new skills under `.agents/skills/`). Not a code task.

## Decisions still waiting on the user

These are now the only blockers for the full roadmap:

| Decision | Unblocks |
|---|---|
| Preview-deploy infrastructure (Vercel conventions) | E.5 full |
| Supabase bucket + signed-URL conventions | F.6 full, F.5 full Supabase auth |
| Auth provider for dashboard (Vercel auth? Supabase auth?) | F.5 full |
| Pricing copy for `next-steps.astro` scope tiers | Operator-facing report polish |
| `UPRIVER_REPORT_HOST` value | `upriver report send` share URLs |
| SMTP integration | `upriver report send` real delivery |
| Firecrawl USD/credit rate | `upriver cost` accuracy |
| `Co-Authored-By` trailer policy | Commit hygiene |
| `UPRIVER_RUN_TOKEN` on any deployed dashboard | Operator/security ops |
| `ANTHROPIC_API_KEY` in deploy env | Deep audits in production |

## Suggested next-session focus

There are no more well-scoped engineering todos in the roadmap. Three productive directions for the next session:

1. **Push the branch.** 47 commits across this resumed work are local-only. The handoff has assumed they'd be reviewed eventually; getting them up as one branch (or split per-workstream) is the next logical step.
2. **Audit drift between roadmap and reality.** Re-read `PRODUCT-ROADMAP.md` against this handoff and confirm nothing was misinterpreted. The roadmap was the source of truth; if anything's been over-built or under-built, this is the moment to catch it.
3. **Pick one user-decision blocker and make it.** Each decision in the table above is a one-meeting unblock. Pick the smallest (probably `UPRIVER_REPORT_HOST` value) and ship the env-var change so the corresponding feature flips from default-stub to real.

If new roadmap items get added, the deep-audit runner, the SSE pipeline view, the clone-fidelity gate, and the run-all orchestrator are all reusable foundations for what comes next.

## Notes for the next session

- `upriver doctor` is the cheapest way to onboard a new operator box. After cloning the repo and `pnpm install`, running `doctor` prints exactly which env vars and binaries are missing for which features.
- The deep-audit runner now prefers the Anthropic SDK with `cachedClaudeCall` — re-running the same audit prompt is free after the first call. Cache lives under `clients/<slug>/.cache/llm/`. To force a fresh call, delete that directory.
- `run all --audit-mode=deep` and `--audit-mode=all` will now actually run deep passes as part of the orchestrated pipeline. That spends real Anthropic tokens — keep it explicit, not a default. Default stays `base`.
- Workstream G being complete does not mean the pipeline is fully optimized. G.6 only de-duplicated the discover→scrape Firecrawl batch; if profiling later shows other duplicate Firecrawl batches (audit re-scraping for branding extraction, e.g.), that's a follow-on, not a blocker.
- Three commits past the prior handoff hit a non-deterministic Write hook that flags `child_process` imports as potential `exec` injection. The new `doctor.ts` uses `execFileSync` with explicit arg arrays — same pattern as the rest of the codebase. No exception was needed; the hook's a soft warning.
