# Scope — E2E test for the website-rebuild pipeline

Status: scoping (design, not yet built). Author: e2e session, 2026-06-08. Companion to the **generation** e2e (`scripts/e2e-littlefriends.sh`, reports `07-` and `12-` under `intake-profile-engine/`). This document scopes the analogous e2e for the **other half of the product** — the website audit → rebuild → launch pipeline (`run all`), which today has **zero e2e coverage**.

## Why

The CLI is two pipelines. We've now proven the intake→generation one (12/12 docs). The website pipeline (`init → discover → scrape → audit → synthesize → scaffold → clone → finalize → clone-fidelity → fixes-plan → improve`) is the original product and the more fragile one (Firecrawl scraping, ~15 audit passes, 3 LLM synthesis calls, **headless-Claude visual cloning per page**, pixel/text fidelity scoring, Astro scaffolding, link rewriting). It has **0 command-level unit tests and no integration/e2e test**. `clone` (the expensive, LLM-per-page stage) is the website analog of our docs phase and the most likely place a "doc-08 moment" (prompt overflow, fidelity failure, link-rewrite gap) hides.

## The pipeline (grounded map)

Orchestrated by `run all` (`packages/cli/src/commands/run/all.ts`), canonical order in `packages/core/src/pipeline/stages.ts`. `run all` has **no interactive gates** (stages `this.error()` on missing inputs; non-optional failure aborts unless `--continue-on-error`), so it is already unattended-automatable — there is no `UPRIVER_GATE_AUTO` equivalent and none is needed. Resumable via `run all <slug> --from <stage>`. Supports `--dry-run` (prints the stage list).

| # | Stage | Opt? | Input → Output artifact | External dep | LLM | Cost/time |
|---|---|---|---|---|---|---|
| 1 | `discover` | no | config+URL → `site-map.json`, `content-inventory.json` | **Firecrawl** (map) | — | sec |
| 2 | `scrape` | no | `site-map.json` → `pages/*.json`, `screenshots/`, `design-tokens.json`, `asset-manifest.json`, `rawhtml/` | **Firecrawl** (scrape+branding) | — | ~2–5 min, credits |
| 3 | `audit` | no | `pages/*.json` → `audit/{seo,content,design,sales,links,schema,aeo,geo,typography,local,backlinks,competitors,…}.json` + `summary.json` | Ahrefs (backlinks, optional); **Anthropic/claude** only in `--mode deep/all` | deep only | sec–min |
| 4–6 | `audit-media`, `gap-analysis`, `video-audit` | yes | `pages/*.json` → `audit/{media,gaps,video}.json`, `proposed-sitemap.json` | none | — | sec |
| 7 | `synthesize` | **no** | `audit/*`,`pages/*` → **`audit-package.json`**, `executive-summary.md`, `repo/CLAUDE.md` | **Anthropic/claude (3 calls)** | **yes** | min |
| 8–10 | `voice-extract`, `blog-topics`, `schema-build` | yes | → `voice-guide.*`, `blog-topics.*`, `schemas.json` | none | — | sec |
| 11 | `scaffold` | **no** | `audit-package.json`,`pages/*` → **`repo/`** (Astro 6 site) | none | — | sec |
| 12 | `clone` | **no** | `repo/`,`pages/*` → `repo/src/pages/*.astro` (visual clones), `clone/*` git branches | **Anthropic/claude (1 headless agent PER PAGE)** | **yes — expensive** | **1–10 min/page** |
| 13 | `finalize` | no | `repo/`,`asset-manifest.json` → rewritten links (domain→local routes, CDN→`/public/images`) | none (opt downloads) | — | sec |
| 14 | `clone-fidelity` | yes | `repo/`,`pages/*`,`screenshots/` → `clone-qa/summary.json` (pixel+text scores), `diff/*.png` | none | — | sec–min |
| 15 | `fixes-plan` | no | `audit-package.json`,`repo/` → **`fixes-plan.md`** (5-phase) | none | — | sec |
| 16 | `improve` | yes | `repo/` → `repo/improve/*` branches | LLM if `--no-dry-run` | opt | — |

Data root: `clients/<slug>/` (same local data-source model as generation; `UPRIVER_DATA_SOURCE=local` applies). `clients/*` is gitignored (littlefriends is force-added).

## Recommended approach: two tiers

The pipeline splits cleanly at `synthesize`/`clone` (the LLM+Firecrawl-dependent stages). Build the e2e in **two tiers**, cheapest first — each is independently valuable.

### Tier A — offline deterministic slice (build first; cheap, fast, no keys)
**Goal:** prove the **repo-generation half** (`scaffold → finalize → fixes-plan` + optionally `clone-fidelity`) deterministically, with no external services.
- **Input:** a committed fixture `audit-package.json` + `pages/*.json` + `design-tokens.json` + `asset-manifest.json` + a few `audit/*.json`, under `clients/<fixture-slug>/` (force-added past `.gitignore`, like littlefriends).
- **Run:** `scaffold → finalize --dry-run → fixes-plan`, then mechanical assertions:
  - `repo/src/pages/index.astro` exists and is valid Astro (imports resolve, no client-domain `href`s after finalize).
  - `repo/CLAUDE.md`, `repo/.agents/product-marketing-context.md` present.
  - `fixes-plan.md` has ≥1 `Phase` section.
- **Cost:** ~30 sec, $0, no keys. **This is the highest-ROI starting point** — it locks the scaffold/finalize/fixes contracts and gives a regression net for the deterministic majority of the pipeline.
- **Fixture provenance:** generate the fixture once from a real small run (e.g. capture `clients/audreys/audit-package.json` + a 2–3 page subset), sanitize, commit as `.planning/website-rebuild-engine/test-fixtures/<slug>-audit-package.tar.gz`, and have the e2e's `fixture` phase untar it.

### Tier B — full live spine (build second; proves the real value)
**Goal:** the website analog of the generation full run — `init → scrape → audit → synthesize → scaffold → clone → finalize → clone-fidelity → fixes-plan` end to end, unattended.
- **Target site:** a **small, stable, owned/neutral site** (3–6 pages) so scraping and fidelity scoring are reproducible. Candidates: a tiny static site we host for this purpose, or a fixed permissioned URL. **Do NOT point at a live client.** (Open decision — see below.)
- **Keys:** `FIRECRAWL_API_KEY` (scrape/discover) and `claude` CLI on PATH or `ANTHROPIC_API_KEY` (synthesize, clone, deep audit). Optional: Ahrefs (backlinks), GSC.
- **Scope the clone stage** to a few pages (`clone --page /` or a small concurrency) — it's 1–10 min/page (the docs-phase analog). Expect this stage to surface the real findings (clone-agent prompt size, fidelity scores, link-rewrite correctness).
- **Checkpoints (mechanical, from artifacts — never read page bodies):** after each stage assert its artifact exists/well-formed: `site-map.json` (≥1 URL) → `pages/` (≥N json) + `design-tokens.json` → `audit/summary.json` → `audit-package.json` (valid `meta`/`siteStructure.pages`/`findings`) → `repo/src/pages/*.astro` (≥1) → finalize rewrote links → `clone-qa/summary.json` (fidelity ≥ threshold) → `fixes-plan.md`.
- **Report (mirror `12-e2e-rerun-report.md`):** stages completed, per-page clone fidelity scores, any stage that failed with its exact error, external-key path taken, cost/time.

## Script shape (mirror `e2e-littlefriends.sh`)
`scripts/e2e-website-rebuild.sh`, phases `fixture|init|scrape|audit|synthesize|scaffold|clone|finalize|fidelity|fixes|verify`, `phase_ge` resume logic, all output tee'd to `clients/<slug>/e2e/run.log`, env-gated external calls (skip+note when a key is unset, exactly like recon's F5 handling in the generation e2e). Tier A is the `fixture…verify` subset; Tier B prepends the live `init…` phases.

## What it will likely surface (the point of the test)
- **clone-agent prompt size** — each clone session ingests page JSON + repo context + audit context; the per-page prompt could overflow on a content-heavy page (the same class of bug F1 fixed for generation). The clone stage has no F2-equivalent pre-flight.
- **link-rewrite completeness** (`finalize`) — missed client-domain links or CDN URLs.
- **fidelity thresholds** — what pixel/text score counts as "good enough," and whether the scorer is stable.
- **scaffold ↔ audit-package contract drift** — scaffold assuming fields synthesize didn't emit.

## External keys / cost summary
| Need | For | Tier |
|---|---|---|
| none | scaffold, finalize, fixes-plan, fidelity | **A** |
| `FIRECRAWL_API_KEY` | discover, scrape | B |
| `claude` CLI / `ANTHROPIC_API_KEY` | synthesize, clone, deep audit | B |
| Ahrefs / GSC (optional) | backlinks/competitors audit dimensions | B (skippable) |

## Open decisions (need an answer before Tier B)
1. **Test target site** — host a tiny static fixture site, or use a fixed neutral URL? (Determinism + permission both matter.)
2. **Fixture commit strategy** — tarball under `.planning/` vs a force-added `clients/<slug>/` tree (like littlefriends).
3. **How far to run Tier B live** — stop after `clone-fidelity` (proves the rebuild) or also exercise deploy (Tier 2 of the broader plan, scoped separately).
4. **Fidelity pass bar** — what `clone-qa/summary.json` score gates "success."

## Recommended sequence
1. **Tier A first** — committed fixture + `scaffold/finalize/fixes-plan` offline e2e + report. Days-1 value, zero cost, regression net.
2. **Tier B** — once a stable target site + keys are decided, the full live spine, scoping `clone` to a few pages.
3. Reuse the harness pattern wholesale (phases, `phase_ge`, run.log, mechanical report, Cowork eval) — it is the asset.
