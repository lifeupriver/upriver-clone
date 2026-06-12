# Build Spec 17b: clone hardening completion (full-site scope)

Status: **draft → build**. Branch: `claude/spec-17b-18-hardening-diversity-uvbrxk` (shared with Spec 18; 17b commits land first — Spec 18's matrix runs are the first consumers of the spend ceilings).

## Goal

Finish the clone-stage hardening Spec 19 left pitch-scoped, at full-site scope. After this spec:

1. A multi-page client clone can no longer land a below-bar page **silently** — every scored page is checked against a per-page bar; below-bar/unscored pages are warned and recorded by default, and `--strict-fidelity` turns that into a hard fail-closed gate.
2. `upriver run all` and bare `upriver clone` have a **per-run spend ceiling enforced in code** — checked BEFORE each costed stage/page, on by default at $25, surfaced in `--dry-run`, distinct exit code on abort. (Today only `pitch run` has a ceiling.)
3. The spend ledger reports **actuals where they exist** (`token-and-credit-usage.log`, `usage_events`) instead of estimates-only; estimates remain the projection for not-yet-taken steps. `pitch status` spend numbers improve retroactively.

## Decisions (brainstorm 2026-06-12, in handoff order)

- **Decision 2 (fidelity enforcement):** warn-and-record by default — a below-bar page lands but is recorded in `clone-qa/summary.json` and surfaced in command output; `--strict-fidelity` makes it a hard gate. The bar is **per page** (a whole-site mean hides one terrible page behind several good ones), default **70** — the same provisional value as Tier B's `WB_FIDELITY_BAR`, exported as its own constant `CLONE_FIDELITY_BAR` so it calibrates independently of `PITCH_FIDELITY_MIN` (Spec 18 closes the calibration loop from the harvest corpus).
- **Decision 3 (spend ceiling):** `$25`/run default, **on by default**, `--no-spend-ceiling` opt-out, `--max-spend-usd` override, estimate table in `--dry-run`, distinct exit code (61) on abort.

## Why (grounding)

- Spec 19 §4 landed `assertPromptSize` + `runAgentWithNoFileRetry` generally, but `fidelityGate` only gates pitch preview staging and the ledger ceiling only guards `pitch run` (`packages/cli/src/commands/pitch/run.ts` — over-budget exit 21, fidelity exit 22). `run all` and `clone` spend with no ceiling at all.
- The ledger records **estimates, not actuals** (Spec 19 changelog deviation). Actuals already exist on disk: `<clientDir>/token-and-credit-usage.log` (line format and lenient parser in `packages/cli/src/util/cost-summary.ts`, `LINE_PATTERN` at line 34) and the Supabase `usage_events` table (`packages/core/src/usage/logger.ts`, `UsageEvent` in `packages/core/src/types/audit.ts` with `client_slug`/`command` attribution).
- **Finding at scoping (2026-06-12, verified via the GitHub Actions API):** neither `e2e-website-tier-b.yml` nor `e2e-pitch.yml` has **ever been dispatched** — zero runs. The handoff's "check the Tier B run history for recurring clone failure classes" item therefore yields an empty findings list *by evidence, not omission*. No speculative failure classes are folded into this spec; Spec 18's matrix runs produce the first live corpus.
- **Finding at scoping:** `packages/cli/src/commands/clone-fidelity.ts:212` has a pre-existing `FIDELITY_THRESHOLD = 80` — the *findings-emission* threshold that routes below-80 pages into `clone-fidelity-findings.json` for `fixes plan`. It coexists deliberately with the new enforcement bar 70: 80 decides what is worth improving, 70 decides what is acceptable at all. Both stay, separately named; unifying them would silently change fixes-plan routing.

## File ownership

| File | Responsibility |
| --- | --- |
| `packages/cli/src/pitch/ledger.ts` | gains generic `StepEstimate`/`estimateUsd`/`wouldExceedEstimate`; existing pitch-typed exports become thin wrappers (unchanged behavior) |
| `packages/cli/src/spend/stage-estimates.ts` (new) | per-stage estimates for the orchestrated pipeline; `RUN_MAX_SPEND_USD_DEFAULT`; `estimateRunTable()` |
| `packages/cli/src/spend/run-ledger.ts` (new) | versioned `<clientDir>/run-ledger.json` read/write helpers |
| `packages/cli/src/spend/run-spend-plan.ts` (new) | pure per-stage ceiling decision: `'run' \| 'free' \| 'over-ceiling'` |
| `packages/cli/src/spend/actuals.ts` (new) | pure estimate↔actual reconciliation over usage-log entries / usage_events rows |
| `packages/cli/src/clone/hardening.ts` | gains `CLONE_FIDELITY_BAR` + pure `evaluateFidelityPolicy()` (reuses `fidelityGate` per page) |
| `packages/cli/src/clone-qa/fidelity-scorer.ts` | `FidelitySummary` gains optional `policy` block (type only; backward compatible) |
| `packages/cli/src/commands/clone-fidelity.ts` | writes the `policy` block; warn-by-default; `--strict-fidelity` → exit 62; `--fidelity-bar` |
| `packages/cli/src/commands/run/all.ts` | ceiling check before each costed stage (exit 61); records est+actuals to run-ledger; `--dry-run` cost table; `--strict-fidelity` pass-through with exit-62 escalation |
| `packages/cli/src/commands/clone.ts` | per-page ceiling check (exit 61 on ceiling stop); `--max-spend-usd` / `--no-spend-ceiling`; dry-run estimate line |
| `packages/cli/src/commands/pitch/status.ts` | spend column shows `est + act` split when actuals exist |
| `scripts/cli-smoke.mjs` | new dry-run rows for the new flags |

## 1. Fidelity policy for client clones

- `evaluateFidelityPolicy(summary, bar = CLONE_FIDELITY_BAR)` (pure, in `hardening.ts`): per-page application of the proven fail-closed `fidelityGate`; returns `{ pass, belowBar: [{pageSlug, overall}], unscored: string[] }`. A `null`/empty summary is all-unscored — fail-closed under strict, loud under warn.
- The record lives in `clone-qa/summary.json` as an optional `policy` block written by `clone-fidelity`: `{ bar, strict, belowBar, unscored, evaluatedAt }`. Rationale: the harvest sweep (Spec 18) already reads `summary.json`; `fixes plan` already consumes fidelity findings; a third artifact would have no consumer. Optional field ⇒ every existing reader keeps working.
- `clone-fidelity` default mode: loud per-page warn + "recorded in clone-qa/summary.json; fixes plan routes below-80 pages". `--strict-fidelity`: exit **62**.
- `run all --strict-fidelity` appends the flag to the clone-fidelity stage; although that stage is `optional` in the canonical pipeline, exit 62 from it is **escalated to a hard run failure** (the one honest exception to the optional-stage warn path). Warn mode: `run all` prints the below-bar list in its final summary.

## 2. Spend ceiling for `run all` / `clone`

- Ledger generalization keeps `pitch/ledger.ts`'s semantics exactly: ceilings are checked **BEFORE** the step; estimate-at-or-under-ceiling runs, estimate-over aborts with the step untaken.
- `stage-estimates.ts` maps the costed subset of the orchestrated stages to `StepEstimate`s (page-count-aware where it matters: scrape ≈ 8 credits/page, clone ≈ 600 agent-seconds/page; agent stages in seconds; scaffold/finalize/clone-fidelity/fixes-plan are zero-cost and never block). **Estimates are provisional by construction — no live run history exists (see Why); the Spec 18 corpus is the tuning input.**
- `run all`: before each costed stage spawn, `'over-ceiling'` ⇒ write run-ledger, print the estimate vs ceiling, exit **61**. After each costed stage: record the estimate, then reconcile actuals from the usage log (§3) into `run-ledger.json` (`{ v: 1, slug, startedAt, updatedAt, ceilingUsd, stages: [{ id, at, est, actual? }], totalEstUsd }`). `--from` resume appends to an existing ledger.
- `clone` standalone: per-page pre-dispatch check; on ceiling, stop dequeuing, mark remaining pages skipped-over-ceiling, exit **61 even when some pages succeeded** — deviation from the "≥1 page ok ⇒ exit 0" contract, scoped to ceiling stops only: an unattended `run all` must not treat a budget-truncated clone as complete and march on to finalize.
- `run all` passes the **remaining** budget down to the clone stage via `--max-spend-usd` (explicit flag pass-down; no hidden file coupling).
- `--dry-run` on both commands prints the estimate table (same constants as enforcement, so preview and enforcement cannot drift — the `estimateTable` move) and the ceiling verdict; exits 0.

## 3. Actuals over estimates

- `reconcile({ steps, entries, agentRows?, rates })` (pure, in `spend/actuals.ts`): usage-log entries bucketed by `[step.at, nextStep.at)` window + `cmd=` name; Firecrawl credits become actuals; agent cost stays an estimate unless Supabase `usage_events` rows with `cost_usd` are supplied. Inputs are plain arrays so the log file, Supabase rows, and tests all feed it identically. Output labels every component `actual | estimate | mixed` — never silently blended.
- `pitch status` renders `$3.10 (est $2.40 + act $0.70)` when the log exists; unchanged rendering otherwise.
- **Enforcement stays estimate-based.** Ceilings are checked before spend; actuals exist only after. Reconciliation is a status/reporting-time concern, recorded in `run-ledger.json` and shown by `pitch status` — the conservative pre-spend check is the safety property and is not weakened.

## 4. Exit codes & flags

| Code | Where | Meaning |
| --- | --- | --- |
| 61 | `run all`, `clone` | spend-ceiling abort; the over-ceiling step was **not** taken |
| 62 | `clone-fidelity` (escalated by `run all --strict-fidelity`) | strict fidelity gate failed (below-bar or unscored page) |

Non-colliding with: Tier A 11–16, Tier B 21–32, Tier C 41–47, pitch e2e 51–58, pitch CLI 21/22, oclif 0/1/2, `generate --strict-provisioning` 3. (Pitch CLI 21/22 colliding numerically with Tier B's shell range is pre-existing and cross-layer; the new codes avoid even that.)

New flags: `run all` — `--max-spend-usd` (default 25), `--spend-ceiling` (boolean, default true, `allowNo` ⇒ `--no-spend-ceiling`), `--strict-fidelity`. `clone` — `--max-spend-usd`, `--no-spend-ceiling`. `clone-fidelity` — `--fidelity-bar` (default 70), `--strict-fidelity`.

## 5. Tests & CI

- All new logic lands as pure functions with unit tests first (`node --test` via `pnpm -r test`): ledger generalization boundary cases (estimate exactly at ceiling runs; over aborts), stage-estimate table totals and per-page scaling, run-ledger round-trip + `--from` append, spend-plan decisions, reconciliation windows/labels against inline log text matching the real `LINE_PATTERN`, fidelity-policy pass/warn/strict and fail-closed-on-missing-summary.
- `scripts/cli-smoke.mjs`: help matrix picks the new flags up automatically; curated rows added for `run all <slug> --dry-run --no-spend-ceiling` and the deliberate-bug check `--max-spend-usd 0` (must abort exit 61 before any subprocess spawns).
- Keyless `test.yml` stays keyless. No new workflows in this spec; live verification of ceiling/fidelity behavior on a real clone rides Spec 18's gated matrix workflow.

## Out of scope

- Auto-tuning estimates or bars from data (Spec 18's calibration report recommends; a human applies).
- Wiring `usage_events` reads into enforcement-time checks (reporting-time only, by design — see §3).
- Any clone-agent redesign; `runAgent`-only security invariants untouched.
- Pitch funnel extras (`viewedAt` rides with Spec 18; nudge/dashboard funnel deferred).

## Definition of Done

- [ ] `pitch/ledger.ts` exposes the generic estimate API; all pre-existing pitch ledger tests pass unmodified.
- [ ] `run all`: over-ceiling aborts exit 61 BEFORE the costed stage spawns; `--no-spend-ceiling` disables; `--dry-run` prints the cost table from the same constants.
- [ ] `clone`: per-page ceiling stop exits 61 with remaining pages recorded as skipped; deliberate-bug check (`--max-spend-usd 0`) aborts with zero agent sessions spawned.
- [ ] `run-ledger.json` (v1) written with per-stage estimates and usage-log actuals where present.
- [ ] `clone-fidelity`: warn-and-record default writes the `policy` block; `--strict-fidelity` exits 62; `run all --strict-fidelity` escalates.
- [ ] `pitch status` shows est+act split when `token-and-credit-usage.log` exists.
- [ ] `pnpm -r build && pnpm -r test && node scripts/cli-smoke.mjs` green (keyless).
- [ ] Live full-pipeline verification under the ceiling — *gated; no dispatch has ever been run (see Why); verified by the first Spec 18 matrix dispatch.*

## Changelog

### 2026-06-12 — spec drafted

- Drafted post-brainstorm; decisions 2 and 3 recorded verbatim from Joshua.
- Scoping findings recorded: zero gated-workflow dispatches to date (empty failure-class corpus, honestly); pre-existing `FIDELITY_THRESHOLD = 80` retained beside the new `CLONE_FIDELITY_BAR = 70`.
