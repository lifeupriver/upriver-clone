# Build Spec 16: Website-pipeline e2e (Tier B) — live spine against a hosted fixture site

Status: approved (design session 2026-06-10). Executes Tier B of `.planning/website-rebuild-e2e-scope.md`, starting from the decisions recorded in Build Spec 15 §5 (target site, fidelity bar source, clone scope, stop-before-deploy). Companion to the Tier A harness (`scripts/e2e-website-tier-a.sh`) and the generation e2e (`scripts/e2e-littlefriends.sh`).

## Goal

Prove the **live spine** of the website-rebuild pipeline — `init → discover → scrape → audit → synthesize → scaffold → clone → finalize → clone-qa → clone-fidelity → fixes-plan` — end to end, unattended, against a site we own, with mechanical artifact checkpoints per stage:

1. **Hosted fixture site** — a tiny (4-page) static site generated from the wb-fixture (Wildflour Bakery, fictional) content, committed under `fixture-site/`, deployed to Vercel with noindex enforced. This is the stable, permissioned, reproducible scrape target Spec 15 §5.1 decided on.
2. **Tier B harness** — `scripts/e2e-website-tier-b.sh`, mirroring the Tier A mechanics (phase array, `phase_ge` resume, tee'd run.log, distinct exit code per failing phase), driving every stage as a real subprocess of `node packages/cli/bin/run.js`.
3. **Gated workflow** — `.github/workflows/e2e-website-tier-b.yml`, `workflow_dispatch` **only**, consuming `FIRECRAWL_API_KEY` + `ANTHROPIC_API_KEY` secrets. The keyless `test.yml` is never touched and never gains a key (Spec 15 invariant: that is a spec violation, not a configuration task).
4. **Run report** — after the first live run, a report at `.planning/website-rebuild-engine/16-tier-b-run-report.md` mirroring the generation rerun report's structure (headline → per-phase table → per-page fidelity table → findings/disclosures → caveats).
5. **Fidelity pass bar** — provisional bar set here (see §5), with the calibration procedure recorded; the scorer's own data answers Spec 15 §5.2's open question (see Findings-at-scoping below).

**The point of this test is the findings.** Expected surface area (scope doc): clone-agent prompt overflow on content-heavy pages, clone "no-file" failures, link-rewrite gaps on a non-Squarespace-shaped site, fidelity-scorer stability. Workstream B (Spec 17, clone hardening) is shaped by what this run actually finds.

## Findings at scoping (recorded before build)

- **audreys' `clone-qa/summary.json` never existed.** `clone-qa` (the screenshot capture command) writes only `clone-qa/desktop/*.png` + `clone-qa/index.html`; `summary.json` is written exclusively by `clone-fidelity`, which was never run on audreys. There is nothing to "locate." Regeneration requires the gitignored `clients/audreys/` artifacts (Joshua's machine only): `node packages/cli/bin/run.js clone-fidelity audreys` — one command, no keys. Until that produces real numbers, the bar in §5 is provisional.
- **`clone-fidelity` cannot be a bare `run all` checkpoint.** It scores `clone-qa/desktop/*.png` against `screenshots/desktop/*.png`, and nothing in the `run all` orchestration produces the former. The harness therefore inserts an explicit `capture` phase: build the repo, start `astro preview`, run `clone-qa`, kill the server. This is itself a finding about the pipeline's "feature-complete on paper" claim — file it in the run report.
- **`robots.txt Disallow: /` would risk blocking Firecrawl's own mapper.** Noindex is enforced via `X-Robots-Tag: noindex, nofollow` headers (vercel.json) + `<meta name="robots" content="noindex, nofollow">` per page; robots.txt only carries the sitemap pointer.
- **Firecrawl scrapes from its cloud** — a localhost fixture cannot work; public hosting is a hard requirement, not a convenience.

## File ownership

| File | Change |
|---|---|
| `fixture-site/` | NEW — committed static fixture site (4 pages + assets + vercel.json + sitemap + robots.txt + README) |
| `scripts/deploy-fixture-site.sh` | NEW — one-shot Vercel deploy, gated on `VERCEL_TOKEN` |
| `scripts/e2e-website-tier-b.sh` | NEW — Tier B harness |
| `.github/workflows/e2e-website-tier-b.yml` | NEW — manual-only gated workflow |
| `.planning/website-rebuild-engine/16-tier-b-run-report.md` | NEW — authored after the first live run (not a hollow template) |
| this spec | DoD + changelog at the end |

No production `packages/*` source changes are expected. If a checkpoint exposes a real pipeline bug, fix only if surgical; otherwise file it as a finding (Spec 17 exists to fix the clone-stage class).

## 1. Hosted fixture site — `fixture-site/`

**Content provenance:** structure and tone derived from `clients/wb-fixture/` (already sanitization-verified in Spec 15 — 4-gram-swept, fictional Wildflour Bakery); all prose either reused from wb-fixture or freshly written fictional copy. **No real-client text may enter this tree** — the Spec 15 sanitization standard applies to anything added later.

**Pages (4 — within the 3–6 band):**
- `/` (index.html) — hero, intro sections, testimonial, CTA; the content-heavy page (clone-overflow bait, deliberately)
- `/about` — story + team
- `/weddings` — event-barn offering + pricing-ish copy (the vertical is wedding-venue)
- `/contact` — fictional address `(555) 010-xxxx` phone, `hello@wildflourbakery.example` email, no live form

**Construction rules:**
- Plain static HTML + one shared `styles.css` + committed SVG images under `images/` (self-hosted; no external assets, no JS, no dates/dynamic content — pinned forever; content changes only via PR).
- Every page: `<meta name="robots" content="noindex, nofollow">`, `<link rel="canonical">` + `og:url` absolute to the production URL, shared nav (relative links) **plus at least one absolute self-link per page** (real sites have these; gives finalize's pass-1 deterministic work).
- `vercel.json`: `cleanUrls: true`, header `X-Robots-Tag: noindex, nofollow` on `/(.*)`.
- `sitemap.xml` listing the 4 absolute URLs (map determinism); `robots.txt` with only the Sitemap line (see Findings).
- Pinned production URL: **`https://upriver-wb-fixture.vercel.app`** (project `upriver-wb-fixture`). If the name is taken at deploy time, the deploy script prints the actual URL and the canonical/sitemap URLs + harness default must be updated in one follow-up commit before the first live run.

**Deploy:** `scripts/deploy-fixture-site.sh` — requires `VERCEL_TOKEN`; runs `npx vercel deploy fixture-site --prod --yes`; prints the final URL. One-time (re-run only on content change). Never wired into any workflow.

## 2. Tier B harness — `scripts/e2e-website-tier-b.sh`

Separate script (the Tier A header contract says Tier B "prepends live phases in its own harness or extends this one" — a separate script keeps `test.yml` provably keyless and the Tier A exit-code map stable).

**Mechanics:** mirror Tier A — `cd` to repo root, `PHASES` array, `phase_ge` resume via `bash scripts/e2e-website-tier-b.sh [start-phase]`, everything tee'd to `clients/wb-live/e2e/run.log` (log truncated per invocation; bad phase arg never truncates), `UPRIVER_DATA_SOURCE=local`, every CLI call a real subprocess of `node packages/cli/bin/run.js`.

**Slug:** `wb-live` (fresh per run; gitignored by default under `clients/` — never committed).

**Env contract:**
- `FIRECRAWL_API_KEY` — required (preflight)
- `claude` CLI on PATH (or `CLAUDE_BIN`) — required (clone always shells out to it; synthesize/audit-deep can also use `ANTHROPIC_API_KEY` via SDK)
- `WB_LIVE_URL` — target site; defaults to the pinned production URL
- `WB_FIDELITY_BAR` — per-page overall-score gate; defaults to the §5 provisional bar
- `WB_CLONE_PAGES` — space-separated page paths to clone; default `/ /about /weddings` (3 pages — Spec 15 §5.3 scope)

**Phases, commands, and mechanical checkpoints (artifacts only — never page bodies):**

| Phase | Exit | Runs | Asserts |
|---|---|---|---|
| `preflight` | 2 | — | node ≥22, pnpm, `claude` CLI (or `CLAUDE_BIN`) resolvable, `FIRECRAWL_API_KEY` set, playwright chromium importable from `packages/cli` (else print the install one-liner), `WB_LIVE_URL` reachable (HTTP 200 on `/`) **and serving noindex** (header or meta) — refuse to scrape a target that doesn't look like our fixture |
| `init` | 21 | `rm -rf clients/wb-live`; `init $WB_LIVE_URL --slug wb-live --name "Wildflour Bakery" --vertical wedding-venue` | `client-config.yaml` exists, `url:` matches `$WB_LIVE_URL`; `site-map.json` has ≥1 URL |
| `discover` | 22 | `discover wb-live` | `content-inventory.json` exists and parses |
| `scrape` | 23 | `scrape wb-live` | ≥3 `pages/*.json`; `design-tokens.json` + `asset-manifest.json` parse; ≥3 `screenshots/desktop/*.png`; ≥3 `rawhtml/*.html` |
| `audit` | 24 | `audit wb-live --mode base` | `audit/summary.json` parses; `passes_completed ≥ 1` |
| `synthesize` | 25 | `synthesize wb-live` | `audit-package.json` parses with **`meta.clientName`, `designSystem`, `siteStructure.pages` (≥3), `contentInventory`** present (the scaffold contract — exactly the fields scaffold hard-crashes without); `repo/CLAUDE.md` exists |
| `scaffold` | 26 | `scaffold wb-live`; then `pnpm install --ignore-workspace --frozen-lockfile` + `pnpm build` in `repo/` (install retried once, as Tier A) | `repo/src/pages/index.astro`, `repo/CLAUDE.md`, `repo/.agents/product-marketing-context.md`; build exit 0 |
| `clone` | 27 | for each `$WB_CLONE_PAGES`: `clone wb-live --page <p> --no-pr --no-worktree --no-verify` | each page's `.astro` exists under `repo/src/pages/` and was modified after scaffold (mtime/git-diff check); per-page failures name the page |
| `finalize` | 28 | `finalize wb-live --download-missing` | **zero live-domain references remain in `repo/src/**`** (hard); `Internal links rewritten ≥1` counter (soft — warn + record; the clone agent may legitimately emit only relative links). CDN counter NOT asserted: fixture assets are same-host so pass-1 consumes them; the manifest-keyed CDN pass is Tier A's job |
| `capture` | 29 | `pnpm build` then `astro preview` (background, port 5323, readiness-polled) in `repo/`; `clone-qa wb-live --port 5323`; kill server (trap-guarded) | ≥1 png per cloned page in `clone-qa/desktop/` |
| `fidelity` | 30 | `clone-fidelity wb-live --force` | `clone-qa/summary.json` parses; every cloned page has `status: "scored"`; every cloned page `overall ≥ $WB_FIDELITY_BAR`; failure prints the per-page score table |
| `fixes` | 31 | `fixes plan wb-live` | `fixes-plan.md` exists with ≥1 `^#+ .*Phase` section |
| `report` | 32 | — | prints + appends to run.log a machine-readable summary block: per-phase wall-clock, per-page pixel/copy/overall scores, finalize counters, clone failures; exit 0 on a full pass |

Stage choices, pinned: `--mode base` for audit (the LLM audit passes are not the spine; deep mode is a diversity-matrix concern), `--no-verify` on clone for v1 (the verify loop is clone-internal QA — fidelity is scored independently by capture+fidelity; Spec 17 revisits), `--no-worktree --no-pr` (serial, in-tree, no GitHub side effects from a test run), clone invoked per-page (deterministic selection, per-page checkpointing — not `major-pages.json`, which would add a generated artifact to reason about).

**Exit codes 21–32** deliberately do not overlap Tier A's 11–16, so a CI log line identifies both the harness and the phase.

## 3. Gated workflow — `.github/workflows/e2e-website-tier-b.yml`

- Trigger: `workflow_dispatch` **only** (inputs: `start_phase` default `preflight`, `fidelity_bar` optional). Never `pull_request`, never `push`, never `schedule`.
- Secrets consumed: `FIRECRAWL_API_KEY`, `ANTHROPIC_API_KEY` (the latter exported for synthesize/audit SDK paths AND for the `claude` CLI). Secrets referenced via `secrets.*` — the workflow fails fast with a readable message if unset.
- Steps: checkout → pnpm/node 22 (mirror test.yml setup) → `pnpm install --frozen-lockfile && pnpm build` → `npm i -g @anthropic-ai/claude-code` → `pnpm --filter @upriver/cli exec playwright install --with-deps chromium` → `bash scripts/e2e-website-tier-b.sh "$START_PHASE"` → always-upload artifacts: `clients/wb-live/e2e/run.log`, `clients/wb-live/clone-qa/`, `clients/wb-live/audit/summary.json`, `clients/wb-live/fixes-plan.md`.
- `timeout-minutes: 90` (3 clone pages × up to 10 min + scrape + builds, with headroom); `permissions: contents: read`; concurrency group to prevent overlapping live runs (one shared scrape target).
- **`test.yml` is not modified by this spec.**

## 4. Run report — `16-tier-b-run-report.md`

Authored after the first live run, from `run.log` + the harness summary block. Mirrors the generation rerun report sections: **0. Headline** (pass/fail, wall-clock, cost: Firecrawl credits from `token-and-credit-usage.log` + clone minutes) → **1. Per-phase outcome table** → **2. Per-page fidelity table** (pixel/copy/overall vs bar) → **3. Findings & disclosures** (numbered, the Spec 17 input: prompt size observed per page, any no-file/retry events, link-rewrite counters, scorer stability across a re-run) → **4. Caveats**. The report is the Workstream A deliverable that shapes Workstream B; "expected findings" listed in the Goal section are its checklist.

## 5. Fidelity pass bar

- **Provisional bar: per-page `overall ≥ 70`** (env-overridable, `WB_FIDELITY_BAR`).
- Anchoring: the scorer itself already treats `< 80` as finding-worthy (`clone-fidelity` emits a synthetic P1 finding per page under 80). Spec 15 §5.2 says "slightly below the worst acceptable page" of the audreys run; that number does not exist yet (see Findings). 70 = the scorer's own finding line minus a 10-point stability allowance, to be replaced by calibration.
- **Calibration procedure (both inputs, first available wins):** (a) on Joshua's machine, run `clone-fidelity audreys` against the existing audreys clone-qa screenshots and record the per-page scores here; (b) the first wb-live run's own scores. Set the bar slightly below the worst acceptable page, update the harness default, and record the change in this spec's changelog. Re-running fidelity twice on identical artifacts must produce identical scores (scorer-stability check — a report disclosure if not).

## Budget

One full run ≈ one Firecrawl map + ~4-page scrape with branding + mobile shots (tens of credits; logged to `token-and-credit-usage.log`), 3 headless-clone sessions (3–30 min, the dominant cost), 3 LLM synthesize calls. No per-run spend ceiling in v1 — the page count IS the ceiling (3 pages, env-pinned); programmatic budget caps are Spec 17 scope (and the reason it exists).

## Out of scope

- Clone-stage hardening (prompt-size preflight, no-file retry, fidelity-assert-before-persist, budget caps) — **Spec 17**, fed by this run's findings
- Site-diversity matrix — Spec 18; live deploy e2e and Supabase-backed smokes — Workstream D
- Any change to `test.yml`; any change to the clone agent or pipeline commands (findings get filed, not fixed, unless surgical)
- Password-protecting the fixture site (it is our fictional content; noindex suffices — unlike future prospect previews, which need the full Spec 19 guardrails)

## Definition of Done

- [ ] `fixture-site/` committed: 4 pages, noindex meta on every page, vercel.json noindex header, sitemap + robots per spec, zero real-client text (4-gram standard applies to any later edits)
- [ ] Site deployed to Vercel at the pinned URL (or URL corrected in the one-follow-up-commit path), serving 200 + noindex — **requires `VERCEL_TOKEN`; not executable in the build container**
- [ ] `scripts/e2e-website-tier-b.sh` committed; `bash -n` clean; preflight verified to exit 2 with a readable message when `FIRECRAWL_API_KEY` is unset (verified in the build container) and to validate phase args without truncating a prior log
- [ ] Tier A harness + `test.yml` untouched and still green (`bash scripts/e2e-website-tier-a.sh` exit 0 on this branch)
- [ ] `.github/workflows/e2e-website-tier-b.yml` committed, `workflow_dispatch`-only, secrets-gated, artifact upload on always()
- [ ] First live run executed (gated workflow or Joshua's machine), exit 0 — **requires FIRECRAWL + Anthropic keys; not executable in the build container**
- [ ] `16-tier-b-run-report.md` filed from that run, findings numbered for Spec 17
- [ ] Fidelity bar calibrated (or provisional bar + calibration procedure recorded and the audreys regeneration one-liner documented)
- [ ] Changelog appended: deviations, findings, what was and was not verifiable in the build environment

## Changelog

*(appended at build time)*
