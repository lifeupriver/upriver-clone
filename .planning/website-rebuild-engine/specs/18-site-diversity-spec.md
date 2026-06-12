# Build Spec 18: site-diversity matrix + `upriver harvest`

Status: **draft → build**. Branch: `claude/spec-17b-18-hardening-diversity-uvbrxk` (shared with Spec 17b; built after 17b — matrix runs are the first consumers of the spend ceilings).

## Goal

Turn "clone any site" from a two-site anecdote (Squarespace audreys + the owned Astro fixture) into a **corpus claim**:

1. A versioned **site registry** declares 3–5 owned/permissioned matrix sites across the gap platforms (WordPress, Wix/Webflow, Shopify-or-custom-SPA) as typed slots — URLs fill in by config edit, never a code change.
2. A thin **matrix harness** drives the existing Tier B harness once per runnable registry site (gated `workflow_dispatch` only), filing findings **per stage** — the Spec 13 batch-evaluation move applied to sites.
3. **`upriver harvest`** sweeps `clients/*/` (prospects, clients, matrix runs) into one versioned findings corpus + report; every future pitch run becomes a matrix data point for free (the Spec 19 §11 contract: standard artifacts only).
4. A **calibration section** in the report recommends `PITCH_FIDELITY_MIN` / `CLONE_FIDELITY_BAR` values from the corpus once it has real scores — closing the "conservative pick" loop from the Spec 19 changelog. Recommendation only; a human applies it.
5. Ride-along (Decision 4): the pitch portal records **`viewedAt`** — a first-party "prospect opened it" signal surfaced in `pitch status`.

## Decisions (brainstorm 2026-06-12, in handoff order)

- **Decision 1 (site list & budget):** registry ships with **placeholder slots** (`url: null`, `permission: "pending"`) for the three gap platforms plus the pre-filled owned fixture; Joshua fills URLs as permission lands. Budget **$15/site** per matrix run (`defaultBudgetUsd`), threaded into the clone stage as `--max-spend-usd` (Spec 17b's ceiling).
- **Decision 4 (extras):** only `viewedAt` rides along. `pitch nudge` and the dashboard prospect-funnel page wait for their own spec.

## Why (grounding)

- Spec 19 §11 already guarantees the harvest contract: every pitch run emits standard `audit-package.json` + `clone-qa/summary.json` + versioned `pitch/state.json` (v1). Harvest is therefore aggregation, not adapters.
- **Finding at scoping (2026-06-12):** neither gated workflow (`e2e-website-tier-b.yml`, `e2e-pitch.yml`) has ever been dispatched — zero live runs. The matrix produces the **first** scored corpus; until ~20 scored pages exist, calibration honestly reports "insufficient data".
- Watch-list from the handoff (asserted per stage by the Tier B phases the matrix reuses): scrape shape variance, design-token extraction, the scaffold↔audit-package contract (scaffold hard-crashes without `meta.clientName`/`designSystem`/`siteStructure.pages`/`contentInventory`), CDN-subdomain vs third-party-CDN rewrite paths.

## File ownership

| File | Responsibility |
| --- | --- |
| `config/site-registry.json` (new) | versioned matrix-site registry (committable: slots ship with `url: null`) |
| `packages/cli/src/diversity/registry.ts` (new) | load + validate registry; `runnableSites()` |
| `scripts/e2e-website-tier-b.sh` | two surgical parameterizations: `WB_SLUG` (default `wb-live`, byte-identical behavior) and `WB_CLONE_MAX_SPEND_USD` passthrough (empty default = flag omitted) |
| `scripts/e2e-website-matrix.sh` (new) | per-site driver around Tier B; per-site/per-phase outcomes; `matrix-report.md`; exit 64/65/66; `MATRIX_PLAN_ONLY=1` keyless plan mode |
| `.github/workflows/e2e-website-matrix.yml` (new) | gated `workflow_dispatch` (inputs: `sites` csv, `fidelity_bar`); FIRECRAWL+ANTHROPIC secrets; never referenced by `test.yml` |
| `packages/cli/src/harvest/corpus.ts` (new) | pure `buildCorpus(sources)` → corpus v1 |
| `packages/cli/src/harvest/report.ts` (new) | report renderer + `recommendBars(stats)` calibration |
| `packages/cli/src/commands/harvest.ts` (new) | `upriver harvest` command (`--out`, `--dry-run`) |
| `packages/dashboard/src/lib/pitch-view.ts` (new) | write-once `pitch/views.json` recorder |
| `packages/dashboard/src/pages/pitch/[slug].ts` | record first view on 200-served preview/teaser responses |
| `packages/cli/src/commands/pitch/status.ts` | VIEWED column |
| `scripts/cli-smoke.mjs` | `harvest --dry-run` row |

## 1. Site registry

`config/site-registry.json`, schema v1:

```json
{ "v": 1, "defaultBudgetUsd": 15, "sites": [ {
    "id": "fixture", "platform": "astro-fixture",
    "url": "https://upriver-wb-fixture.vercel.app",
    "maxPages": 6, "clonePages": ["/", "/about", "/weddings"],
    "vertical": "bakery", "permission": "owned", "notes": "" } ] }
```

plus three slots: `wordpress-slot`, `wix-or-webflow-slot`, `shopify-or-spa-slot` — each `url: null`, `permission: "pending"`, `clonePages: ["/"]`, per-site `budgetUsd` optional (falls back to `defaultBudgetUsd`). Location rationale: runtime input to a harness and a CLI, not a doc, so it lives in `config/`, not `.planning/`; committable by construction because URLs only enter once permissioned. Loader validates `v`, unique ids, well-formed URLs; `runnableSites()` = `url !== null && permission !== "pending"`. **Matrix sites are owned/permissioned ONLY** — the loader refuses `permission: "pending"` sites rather than skipping silently in `--require-runnable` contexts; the harness lists skipped slots in its report.

## 2. Matrix harness + gated workflow

- `scripts/e2e-website-matrix.sh` is a **driver, not a reimplementation**: for each runnable site (optionally filtered by `MATRIX_SITES` csv), it exports `WB_SLUG=matrix-<id>`, `WB_LIVE_URL`, `WB_CLONE_PAGES`, `WB_FIDELITY_BAR=${MATRIX_FIDELITY_BAR:-70}`, `WB_CLONE_MAX_SPEND_USD=<budgetUsd>` and invokes `e2e-website-tier-b.sh`. Tier B's per-phase exit codes (21–32) **are** the per-stage finding — the driver records `site × phase` outcomes, timings, and fidelity scores into `clients/matrix-<id>/e2e/` and a top-level `matrix-report.md` grid.
- The driver continues past a failing site (one bad platform must not mask the others) and exits **65** at the end if any site failed; **64** invalid/missing registry; **66** report-write failure. `MATRIX_PLAN_ONLY=1` prints the per-site plan and exits 0 — keyless.
- Same scraping politeness and `--max-pages` discipline as Tier B (`maxPages` from the registry); budgets enforced by Spec 17b's `--max-spend-usd` in the clone phase.
- Workflow `e2e-website-matrix.yml`: `workflow_dispatch` only; inputs `sites` (csv, empty = all runnable) and `fidelity_bar`; mirrors `e2e-website-tier-b.yml` (node 22, pnpm build, claude CLI, playwright chromium, always-upload artifacts incl. `matrix-report.md`); serial concurrency; 120-min timeout (multi-site).

## 3. `upriver harvest` + corpus schema

Name: **`upriver harvest`**, top-level. It sweeps prospects, clients, AND matrix runs — `pitch harvest` would be a misnomer and `diversity harvest` buries it under a topic nobody types. (Alternatives recorded here per handoff.)

- Pure core: `buildCorpus(sources: HarvestSource[])` where each source carries raw file strings (`pitchStateJson?`, `fidelitySummaryJson?`, `auditPackageMetaJson?`, `runLedgerJson?`, `viewsJson?`) — parsed and validated inside, **leniently**: one corrupt file degrades that source, never the sweep.
- Corpus v1: per-source `{ slug, kind: 'prospect'|'client'|'matrix', platform?, pitch? { status, estUsd, sentAt?, viewedAt? }, fidelity? { overall, pages[], policy? }, spend? { estUsd, actualUsd?, source }, pages? }` + `stats { scoredPages, fidelityDist { min, p25, median, p75, max }, belowBarCounts { '70', '75', '80' } }` + `calibration` (§4). `kind` is derived: `matrix-` slug prefix ⇒ matrix; `pitch/state.json` present ⇒ prospect; else client.
- **PII/secret posture:** harvest never reads `pitch/share.json` tokens (the builder's input shape simply has no field for them), no emails, no questionnaire answers; prospect URLs appear only as already-public business URLs. The corpus is the **sanitized, committable derivative** of gitignored client dirs.
- Output: `--out` default `.planning/website-rebuild-engine/corpus/` → `<date>-harvest.json` + `<date>-harvest-report.md` (site × stage findings, fidelity distribution, funnel counts, spend). `--dry-run` lists the sweep plan (slugs, kinds, artifacts found) without writing.

## 4. Calibration (report, not auto-tuning)

`recommendBars(stats)`: with fewer than 20 scored pages → `"insufficient data (N scored pages; need 20) — bars stay at 70/70"`. Otherwise: show the distribution and recommend (p25 rounded to nearest 5), explicitly labeled as a recommendation to change `PITCH_FIDELITY_MIN` / `CLONE_FIDELITY_BAR` **by hand**, noting the change in the owning spec's changelog. No code path ever rewrites a constant.

## 5. `viewedAt` ride-along

- Storage: **separate write-once file `clients/<slug>/pitch/views.json`** `{ "v": 1, "firstViewedAt": "<ISO>" }` — NOT `pitch/state.json`. Rationale: `writePitchState` rewrites the whole state file from CLI-side state; a dashboard write into it races any concurrent `pitch run/approve` and gets clobbered. A dashboard-owned file keeps `state.json` single-writer.
- `recordFirstPitchView(slug)` (in `pitch-view.ts`): no-op when the file exists; called from `handlePitchPreview` AND `handlePitchTeaser` only on the 200-served path — an invalid/expired token or unstaged content is **not** a prospect view.
- `pitch status` gains a VIEWED column (date or `—`); harvest picks `viewedAt` up via `viewsJson`.

## 6. Tests & CI

- Unit (keyless): registry loader (valid load, null-url skip, dup-id reject, bad-version reject, budget fallback); `buildCorpus` against TempClients-style temp fixtures (pitch state v1, summaries with/without `policy`, views.json, run-ledger.json, corrupt-file resilience); `recommendBars` both paths; dashboard view-recording (records once, idempotent, no file on invalid/expired/unstaged) via `packages/dashboard/test/_setup.ts` TempClients.
- `bash -n` both shell scripts; `MATRIX_PLAN_ONLY=1 bash scripts/e2e-website-matrix.sh` runs keyless locally.
- `scripts/cli-smoke.mjs`: auto help row + curated `harvest --dry-run` row.
- Keyless `test.yml` untouched. Live matrix runs ONLY via the gated workflow.

## Out of scope

- `pitch nudge`, dashboard prospect-funnel page (Decision 4 — own spec later).
- Auto-applying calibration values.
- Any un-owned/un-permissioned target site, ever.
- Per-platform clone-agent specializations — the matrix *finds* the gaps; fixing them is follow-up specs.

## Definition of Done

- [x] `config/site-registry.json` v1 ships with the fixture + three pending slots; loader tests green (8).
- [x] `e2e-website-tier-b.sh` defaults byte-identical (`WB_SLUG` unset ⇒ `wb-live`; `WB_CLONE_MAX_SPEND_USD`/`WB_SCRAPE_MAX_PAGES` empty ⇒ flags omitted; name/vertical/min-pages defaults unchanged).
- [x] `MATRIX_PLAN_ONLY=1 bash scripts/e2e-website-matrix.sh` prints the per-site plan keyless, exit 0 (fixture runnable, three slots listed as SKIPPED); `bash -n` clean on both scripts.
- [x] `.github/workflows/e2e-website-matrix.yml` exists, `workflow_dispatch` only, not referenced by `test.yml`.
- [x] `upriver harvest` builds corpus v1 + report from fixtures; `--dry-run` keyless (verified against the committed `wb-fixture`); cli-smoke row green.
- [x] Calibration section renders "insufficient data" below 20 scored pages (and the ≥20 p25 path is unit-tested).
- [x] Portal records `pitch/views.json` exactly once on valid views (4 TempClients tests incl. the no-write negative paths); `pitch status` shows VIEWED.
- [x] `pnpm -r build && pnpm -r test && node scripts/cli-smoke.mjs` green (keyless).
- [ ] First matrix dispatch against ≥1 runnable site with findings filed per stage — *gated; requires repo secrets + a filled registry slot (operator prerequisite); no gated workflow has ever been dispatched yet.*
- [ ] Calibration recommendation produced from a real corpus — *gated; follows the first dispatches.*

## Changelog

### 2026-06-12 — spec drafted

- Drafted post-brainstorm; decisions 1 and 4 recorded verbatim from Joshua.
- Command named `upriver harvest` (alternatives `pitch harvest`, `diversity harvest` rejected — see §3).
- `viewedAt` storage decided: dashboard-owned `pitch/views.json`, write-once, to avoid racing `writePitchState`'s whole-file rewrites.
- Zero-dispatch finding recorded: the matrix produces the first live corpus; calibration starts honest ("insufficient data").

### 2026-06-12 — built (branch `claude/spec-17b-18-hardening-diversity-uvbrxk`)

**Deviations**

- Tier B gained two parameterizations beyond the planned pair (`WB_SITE_NAME`, `WB_VERTICAL`, `WB_MIN_PAGES` alongside `WB_SLUG`, `WB_SCRAPE_MAX_PAGES`, `WB_CLONE_MAX_SPEND_USD`): init hard-coded the fixture's name/vertical, and the ≥3-artifact scrape assertions would have failed honest small matrix sites. Every default preserves the original behavior byte-for-byte.
- The matrix driver threads the WHOLE per-site budget into each per-page clone invocation (Tier B loops pages itself, so per-invocation ledgers don't accumulate across pages). The effective per-site budget control is the registry's `maxPages`/`clonePages`; the ceiling is the runaway-invocation backstop. Recorded rather than hidden.
- `matrix-report.md` is gitignored (workflow-artifact only); per-site dirs land under the already-ignored `clients/matrix-<id>/`.

**Findings**

- The registry loader is the single source of registry semantics — the shell driver reads it through `node --input-type=module` against the built CLI, so validation never forks between TS and shell.
- `harvest` resolves `config/site-registry.json` relative to the cwd (repo root); when missing it degrades to an empty platform column with a warning rather than failing the sweep.
