# Plan — Spec 17b: clone hardening completion

## Goal

Generalize the pitch-only hardening to full-site scope per the spec: per-page fidelity policy (warn + `--strict-fidelity`, bar 70), spend ceiling for `run all`/`clone` ($25 default, exit 61), actuals-over-estimates reconciliation. All decision logic pure + unit-tested; commands stay thin.

## Branch

`claude/spec-17b-18-hardening-diversity-uvbrxk` (shared with Spec 18; 17b commits first).

## Read first

`packages/cli/src/pitch/ledger.ts` (+ test), `packages/cli/src/clone/hardening.ts` (+ test), `packages/cli/src/commands/run/all.ts`, `packages/cli/src/commands/clone.ts`, `packages/cli/src/commands/clone-fidelity.ts` (note `FIDELITY_THRESHOLD = 80` at :212), `packages/cli/src/commands/pitch/run.ts` (ceiling/gate wiring pattern, exits 21/22), `packages/cli/src/util/cost-summary.ts` (`LINE_PATTERN` :34, `parseUsageLine`), `packages/cli/src/pitch/state.ts` (versioned-state idiom), `packages/core/src/types/audit.ts` (`UsageEvent`).

## Grounded contracts

| Surface | Contract |
| --- | --- |
| `wouldExceed`/`wouldExceedEstimate` | `est + step > max` exceeds; `===` runs. Checked BEFORE the step, always. |
| `run all` | stages spawned via `runChild` (all.ts ~:171); optional-stage failure warns; `--dry-run` exits 0 (cli-smoke row exists). New: ceiling check pre-spawn → exit 61; clone-fidelity exit 62 escalates under `--strict-fidelity`. |
| `clone` | exit 0 if ≥1 page ok, 1 if all failed; NEW: ceiling stop ⇒ 61 even with partial success (spec §2 deviation). |
| `clone-fidelity` | writes `clone-qa/summary.json`; below-80 pages → findings for `fixes plan` (unchanged). New `policy` block; `--strict-fidelity` ⇒ 62. |
| usage log | `<ISO_TS> [<event_type>] credits=<N> slug=<slug> cmd=<command>`; lenient parser; absent file ⇒ zeroed summary. |
| `run-ledger.json` | v1: `{ v, slug, startedAt, updatedAt, ceilingUsd, stages: [{ id, at, est, actual? }], totalEstUsd }`; version-checked read like `pitch/state.ts`. |

## Test commands

`pnpm -r build && pnpm -r test` · `node scripts/cli-smoke.mjs` · deliberate-bug: `UPRIVER_DATA_SOURCE=local node packages/cli/bin/run.js run all <slug> --max-spend-usd 0` ⇒ exit 61, zero stage subprocesses.

## Tasks (failing-test-first)

1. **Ledger generalization** — extend `ledger.test.ts` with generic-API cases (boundary semantics match `wouldExceed`); add `StepEstimate`, `estimateUsd`, `wouldExceedEstimate` to `ledger.ts`; pitch-typed exports become wrappers; existing tests pass unmodified.
2. **Stage estimates** — `spend/stage-estimates.test.ts` (table totals, per-page scaling, zero-cost stages never block); `spend/stage-estimates.ts` with `RUN_MAX_SPEND_USD_DEFAULT = 25`, costed-stage map, `estimateRunTable()`.
3. **Run ledger** — `spend/run-ledger.test.ts` (round-trip, version reject, `--from` append); `spend/run-ledger.ts`.
4. **Spend plan** — `spend/run-spend-plan.test.ts` (`'run' | 'free' | 'over-ceiling'`, ceiling `null` ⇒ never over); `spend/run-spend-plan.ts`.
5. **`run all` wiring** — pre-spawn check ⇒ exit 61 + ledger write; post-stage est+actuals recording; `--dry-run` cost table (still exit 0); flags `--max-spend-usd`/`--spend-ceiling(allowNo)`/`--strict-fidelity`; remaining budget passed to clone via `--max-spend-usd`; clone-fidelity 62 escalation; cli-smoke rows.
6. **`clone` wiring** — per-page pre-dispatch check; ceiling stop ⇒ skipped pages recorded + exit 61; dry-run estimate line; flags.
7. **Actuals** — `spend/actuals.test.ts` (window bucketing, cmd matching, actual/estimate/mixed labels, inline log text via real format); `spend/actuals.ts`; `pitch status` est+act rendering (pure formatter + test).
8. **Fidelity policy** — `hardening.test.ts` additions (pass/belowBar/unscored, null summary fail-closed); `CLONE_FIDELITY_BAR = 70` + `evaluateFidelityPolicy` in `hardening.ts`; `FidelitySummary.policy?` type; `clone-fidelity` warn/strict + `--fidelity-bar`; `run all` summary surfacing.
9. **Close-out** — full keyless suite; DoD ticks (gated items marked honestly); spec changelog (deviations: clone exit-61-despite-partial-success, actuals-at-reporting-time).

## Open items

None — brainstorm decisions 2 and 3 resolved all of them (see spec Decisions).
