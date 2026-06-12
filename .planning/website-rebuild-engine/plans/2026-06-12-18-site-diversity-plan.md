# Plan — Spec 18: site-diversity matrix + `upriver harvest`

## Goal

Registry-driven matrix runs over the Tier B harness, a pure-aggregation `upriver harvest` corpus + calibration report, and the `viewedAt` ride-along. Built after Spec 17b on the same branch (matrix budgets consume the new `--max-spend-usd`).

## Branch

`claude/spec-17b-18-hardening-diversity-uvbrxk`.

## Read first

`scripts/e2e-website-tier-b.sh` (env contract, SLUG at :56-ish, clone-phase CLI call), `.github/workflows/e2e-website-tier-b.yml`, `packages/cli/src/pitch/state.ts` (v1 idiom), `packages/cli/src/clone-qa/fidelity-scorer.ts` (`FidelitySummary`), `packages/dashboard/src/pages/pitch/[slug].ts` + `packages/dashboard/src/lib/pitch-share.ts` + `packages/dashboard/test/_setup.ts` (TempClients), `packages/cli/src/commands/pitch/status.ts`, `scripts/cli-smoke.mjs` pass-2 table.

## Grounded contracts

| Surface | Contract |
| --- | --- |
| Tier B env | `WB_LIVE_URL` (default fixture), `WB_FIDELITY_BAR` (70), `WB_CLONE_PAGES` ("/ /about /weddings"); exits 21–32 per phase; CLI as real subprocess, `UPRIVER_DATA_SOURCE=local`. NEW: `WB_SLUG` (default `wb-live`), `WB_CLONE_MAX_SPEND_USD` (empty ⇒ omitted). |
| Matrix exits | 0 all-pass · 64 registry invalid/missing · 65 ≥1 site failed (inner code reported per site) · 66 report-write failure. `MATRIX_PLAN_ONLY=1` ⇒ plan + exit 0, keyless. |
| Registry | `config/site-registry.json` v1; `runnableSites()` = url set ∧ permission ≠ pending; matrix sites owned/permissioned ONLY. |
| Corpus | v1 per spec §3; built from raw strings, lenient per source; never reads share tokens; output under `.planning/website-rebuild-engine/corpus/`. |
| views.json | `{ v: 1, firstViewedAt }`, dashboard-owned, write-once, 200-served paths only. |

## Test commands

`pnpm -r build && pnpm -r test` · `node scripts/cli-smoke.mjs` · `bash -n scripts/e2e-website-matrix.sh scripts/e2e-website-tier-b.sh` · `MATRIX_PLAN_ONLY=1 bash scripts/e2e-website-matrix.sh`.

## Tasks (failing-test-first)

1. **Registry** — `diversity/registry.test.ts` (valid load, null-url not runnable, dup-id reject, bad-version reject, budget fallback); `diversity/registry.ts`; `config/site-registry.json` (fixture + 3 pending slots).
2. **Tier B parameterization** — `WB_SLUG` + `WB_CLONE_MAX_SPEND_USD` (defaults byte-identical); `bash -n`.
3. **Matrix driver** — `scripts/e2e-website-matrix.sh`: registry via node one-liner, per-site env + Tier B invoke, site×phase outcomes, `matrix-report.md`, continue-past-failure, exits 64/65/66, `MATRIX_SITES` filter, `MATRIX_PLAN_ONLY`.
4. **Gated workflow** — `e2e-website-matrix.yml` mirroring Tier B's (inputs `sites`, `fidelity_bar`; 120-min timeout; artifacts incl. report).
5. **Harvest core** — `harvest/corpus.test.ts` (kinds, lenient parse, no-token-input-shape, stats dist); `harvest/corpus.ts`.
6. **Report + calibration** — `harvest/report.test.ts` (insufficient-data path, ≥20-pages recommendation path); `harvest/report.ts`.
7. **Command** — `commands/harvest.ts` (`--out`, `--dry-run`); cli-smoke curated row.
8. **viewedAt** — dashboard `route-pitch-view.test.ts` first (records once, idempotent, none on invalid/expired/unstaged); `lib/pitch-view.ts`; wire into `[slug].ts` 200 paths; `pitch status` VIEWED column; harvest picks up `viewsJson`.
9. **Close-out** — full keyless suite; DoD ticks; changelog; PR body lists operator prerequisites (secrets, registry fill-in, first dispatches).

## Open items

None — brainstorm decisions 1 and 4 resolved them; naming (`upriver harvest`) and `views.json` storage decided in the spec.
