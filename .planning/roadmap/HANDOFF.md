# Roadmap session handoff

**Last commit:** `1c87deb feat(workstream-G): G.3 — parallelize deep passes with concurrency cap`
**Branch:** `main`
**Commits this sub-session:** 3 (range `8340637..1c87deb`)
**Total resumed-session commits:** 24 past `0d8fdd2`.
**Pushed:** no — all local. `main` has diverged 44 commits from `origin/main`.

## What shipped this sub-session

| Workstream | Items | Commit |
|---|---|---|
| C.4 | conversion-psychology deep pass (CTAs / friction / social proof / first-fold), `dimension: 'sales'` | `8340637` |
| C.5 | competitor-deep pass (positioning / depth / pricing / trust), reads `<clientDir>/competitors/`, `dimension: 'competitors'` | `1535db6` |
| G.3 | parallelize deep passes via shared-queue workers, `--deep-concurrency` flag (default 2) | `1c87deb` |

`pnpm -r run typecheck` is clean. `pnpm --filter @upriver/cli run test` is **72/72 green** (no new tests this round — the new passes are pure-prompt wiring through the existing tested runner).

## Current state of each workstream

### Workstream A — report shell
Done.

### Workstream B — intake
- B.1, B.2, B.4, B.5, B.6 done.
- **B.3** intentionally skipped.

### Workstream C — audit depth + GEO/AEO expansion
**Complete.** C.1–C.7 all shipped.

### Workstream D — clone fidelity
**Complete.**

### Workstream E — improvement layer
- E.1, E.2, E.3, E.4, E.6, E.7 done.
- E.5 has a working stub (`upriver report compare`). Full E.5 still wants preview-deploy → re-scrape → re-audit chain.

### Workstream F — dashboard
- F.1, F.2, F.3, F.4, F.5, F.6 light done.
- **F.6 full** Supabase storage sync still pending.

### Workstream G — performance / pipeline
- G.1, G.2, G.3, G.5, G.6, G.7 done.
- **G.4** Migrate deep passes from `claude --print` shell-out to the Anthropic SDK directly. Would tighten error handling, eliminate process-spawn latency per pass, and unlock tool-use schemas. Touch points: `packages/cli/src/deep-audit/runner.ts:claudeCliRunner` (replace), tests already inject a stub so no test churn. Adds a runtime `ANTHROPIC_API_KEY` requirement for `--mode=deep|all`; falls back to the CLI runner when the key is unset.

### Workstream H — skills
- H.2, H.3, H.4 done.
- **H.1** Operator-side filesystem fiddling (not a code task).

## Decisions still waiting on the user
- Pricing copy for `next-steps.astro` scope tiers.
- Hosted-report URL convention (`UPRIVER_REPORT_HOST`).
- SMTP integration for `upriver report send`.
- Supabase upload + auth (F.5 / F.6 full).
- `Co-Authored-By` trailer policy.
- Firecrawl USD/credit rate.
- `UPRIVER_RUN_TOKEN` on any deployed dashboard.
- **Anthropic API key** — when G.4 lands, deep audits will require `ANTHROPIC_API_KEY` env. Decide whether to keep the CLI fallback or drop it.

## What's actually blocked vs tractable

**Tractable next:**
- **G.4** Anthropic SDK runner. Concrete, well-scoped. Already has the test seam (injectable `AgentRunner`).
- **F.6 full** Supabase upload — needs bucket/auth conventions but the staging code from F.6 light gives the file shape.
- **E.5 full** Preview-deploy chain — needs Vercel wiring decisions but `report compare` is the engine.

**Genuinely blocked:**
- B.3, H.1 — operator-side decisions, not engineering.
- F.5 full Supabase auth — needs auth-provider decision.
- Most "decisions waiting on user" items above.

## Next 3 concrete TODOs for next session

1. **G.4 — Anthropic SDK runner.** New `packages/cli/src/deep-audit/anthropic-runner.ts` exporting an `AgentRunner` that calls `client.messages.create` directly. Use Sonnet 4.6 by default (env override via `UPRIVER_DEEP_MODEL`). Wire selection in `audit.ts`: prefer the SDK runner when `ANTHROPIC_API_KEY` is set, fall back to `claudeCliRunner` otherwise. The existing test (`runDeepPass` with stub agent) still covers the contract — no test churn beyond verifying the selection logic. Cap context at ~20 pages of input to keep token spend bounded.
2. **`upriver doctor` command.** Single-command preflight: checks for ANTHROPIC_API_KEY, FIRECRAWL_API_KEY, gh CLI presence (E.4), zip binary (F.6 light), claude CLI (deep passes), and prints which features are available vs degraded. Lots of these scattered checks already exist as inline `try/catch` — collecting them lets operators see the surface in one place. Pure-output, ~150 lines.
3. **`upriver run all --mode=deep` shortcut.** The orchestrator currently only runs `audit` in base mode. Add a flag pass-through so `run all --audit-mode=all` lands deep findings as part of the pipeline. Touch point: `commands/run/all.ts:PIPELINE` and the `args` builder for the audit stage.

## Notes for the next session

- Three deep passes now share boilerplate: read `audit-package.json` for `meta.{clientName, siteUrl}`, walk `<clientDir>/pages/` for per-page records, read `intake.json` and `docs/brand-voice-guide.md` if present. If a fourth deep pass arrives, extract `loadDeepBaseContext(clientDir)` to `packages/cli/src/deep-audit/loader.ts` returning `{ clientName, siteUrl, pages, intake, brandVoiceMd }` and let each pass narrow it. Three is borderline; four is the tipping point.
- `--deep-concurrency` defaults to 2. Going higher is fine for testing but consider that each deep pass reads the same files — bumping to 5+ won't speed things up if the LLM is the bottleneck (it will be). Leave the default at 2 until profiling says otherwise.
- The `competitor-deep` prompt explicitly invites "wins to lean into" findings (priority p2, dimension competitors). If the report rendering ever filters out p2 by default, surface a knob — those wins are useful copy for the client deliverable.
- The deep-pass JSON-envelope contract is set in three places: prompt schema text in each pass, `parseAgentResponse` in the runner, and `AgentResponseShape` in the runner. If the schema changes (e.g. add `affected_dimensions`), update all three.
- `run/all.ts` invokes `audit` without `--mode`, so deep passes never run in the orchestrated pipeline today. That's deliberate (audit-base is fast; audit-deep is slow + costs tokens). When G.4 lands the cost calculus changes — revisit.
