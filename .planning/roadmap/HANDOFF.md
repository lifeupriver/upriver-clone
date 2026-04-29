# Roadmap session handoff

**Last commit:** `a799cfc feat(workstream-C): C.3 — deep-pass runner scaffold + content-strategy stub`
**Branch:** `main`
**Commits this sub-session:** 3 (range `a24e855..a799cfc`)
**Total resumed-session commits across all sub-sessions:** 21 commits past `0d8fdd2`.
**Pushed:** no — all local. `main` has diverged 41 commits from `origin/main`.

## What shipped this sub-session

| Workstream | Items | Commit |
|---|---|---|
| F.6 light | `upriver report bundle <slug>` zips deliverables to `<clientDir>/upriver-report-<date>.zip` | `a24e855` |
| E.5 stub | `upriver report compare <before> <after>` produces a markdown audit-comparison from two audit-package.json files | `65be576` |
| C.3 | Deep-pass runner scaffold + first deep pass (content-strategy). `--mode=deep|all` now actually runs deep passes | `a799cfc` |

`pnpm -r run typecheck` is clean. `pnpm --filter @upriver/cli run test` is **72/72 green** (was 62; +3 report-compare diff tests, +7 deep-audit runner tests).

## Current state of each workstream

### Workstream A — report shell
Done.

### Workstream B — intake
- B.1, B.2, B.4, B.5, B.6 done.
- **B.3** intentionally skipped.

### Workstream C — audit depth + GEO/AEO expansion
- C.1, C.2, C.3, C.6, C.7 done.
- **C.4 conversion-psychology, C.5 competitor-deep** — now trivial drop-ins. The runner architecture (`packages/cli/src/deep-audit/runner.ts`) is in place; each new pass is a `DeepPassSpec` with `loadContext` + `buildPrompt` under `packages/cli/src/deep-audit/passes/<name>/run.ts`, then added to `DEEP_PASSES` in `audit.ts`. Use `content-strategy/run.ts` as the template.

### Workstream D — clone fidelity
**Complete.**

### Workstream E — improvement layer
- E.1, E.2, E.3, E.4, E.6, E.7 done.
- E.5 has a working stub: `upriver report compare` diffs any two audit-package.json files. Full E.5 still wants automated preview-deploy → re-scrape → re-audit chain. The stub is the engine; the chain on top is what's blocked.

### Workstream F — dashboard
- F.1, F.2, F.3, F.4, F.5, F.6 light done.
- **F.6 full** Supabase storage sync still pending — requires bucket + signed-URL convention decisions.

### Workstream G — performance / pipeline
- G.1, G.2, G.5, G.6, G.7 done.
- **G.3, G.4** parallelize / migrate deep passes to Agent SDK. With the deep runner now in place these are unblocked. G.3 is a small change — the audit.ts deep loop is currently sequential; flip to `Promise.allSettled` with a concurrency cap. G.4 is more involved — replace the `claude --print` shell-out with the Anthropic SDK directly.

### Workstream H — skills
- H.2, H.3, H.4 done.
- **H.1** Operator-side filesystem fiddling.

## Decisions still waiting on the user
- Pricing copy for the three scope tiers on `next-steps.astro`.
- Hosted-report URL convention (`UPRIVER_REPORT_HOST`).
- SMTP integration for `upriver report send`.
- Supabase upload + auth (F.5 / F.6 full).
- `Co-Authored-By` trailer policy.
- Firecrawl USD/credit rate (`cost-summary.ts:DEFAULT_USD_PER_CREDIT`).
- `UPRIVER_RUN_TOKEN` — set on any deployed dashboard.

## Next 3 concrete TODOs for next session

1. **C.4 — conversion-psychology deep pass.** Copy `content-strategy/run.ts` to `conversion-psychology/run.ts`. Adjust `loadContext` to surface CTAs, testimonials, contact info, and first-fold copy. Adjust `buildPrompt` to ask the agent about value-prop clarity, friction points, social-proof gaps, and CTA quality. Add to `DEEP_PASSES` in `audit.ts`. Reuse `dimension: 'sales'` so it merges into the existing sales-pass output. Mirror the C.3 commit shape — should be ~100 lines.
2. **C.5 — competitor-deep pass.** Same shape, different inputs. `loadContext` should pull in `<clientDir>/discover-competitors.json` (if present) plus the client's audit findings. Prompt asks the agent to compare client vs each competitor on positioning, content depth, and pricing transparency. Returns findings under `dimension: 'competitors'`.
3. **G.3 — parallelize deep passes.** Currently audit.ts runs deep passes sequentially with a hard-coded for-loop. Switch to `Promise.allSettled(DEEP_PASSES.map(...))` capped at 2 concurrent (don't fan out token usage without a budget). Pull the concurrency cap from `--deep-concurrency` flag, default 2.

## Notes for the next session

- The deep-pass runner inlines `scoreFromFindings` + `defaultImpact` from `audit-passes/shared/finding-builder.ts`. Intentional — the cli package doesn't depend on audit-passes' shared module, and pulling it in for two functions felt heavier than duplicating ~30 lines. If a third deep-audit consumer needs them, extract a small `packages/core/src/scoring.ts` instead.
- `claudeCliRunner` is the default `AgentRunner`. It uses `--permission-mode plan` + `--allowed-tools Read,Glob,Grep` to enforce read-only operation. If a future deep pass needs Bash (e.g. to run a local build for performance metrics), add a per-pass `tools` override to `DeepPassSpec` rather than weakening the default.
- `parseAgentResponse` is lenient by design — bad JSON from the agent returns an empty findings list with a clear summary so the rest of the audit still runs. If a deep pass starts silently producing zero findings, check the audit summary line for "no parseable JSON" first.
- `report bundle` shells out to the system `zip` binary. macOS / Linux ship with it; Windows users would need Git-Bash or WSL. If we ever ship Windows-first, swap in `archiver` or `jszip`.
- `report compare` accepts either a direct `audit-package.json` path or a directory containing one. The stub doesn't yet hook into `improve` — nothing automatic produces a "before" snapshot. Operators can `cp clients/foo/audit-package.json clients/foo/audit-package.before.json` before running improve, then call `report compare clients/foo/audit-package.before.json clients/foo` after.
- `audit --mode=all` now runs base passes (concurrent) then deep passes (sequential). The two phases share the same `passed[]` accumulator and write per-dimension JSON files in the same way, so existing report consumers don't need to know about the deep/base split.
