# Next-phase handoff — "point it at any website" + the sales tool

Paste into a fresh Claude Code session at the root of `upriver-clone`. This is a PHASE handoff, not a single build prompt: it sequences five workstreams, each of which gets its own spec → plan → build cycle (superpowers:brainstorming where marked → superpowers:writing-plans → superpowers:subagent-driven-development with two-stage reviews per task). Work ONE workstream at a time; stop after each PR; do not merge anything yourself.

PRECONDITIONS: quit GitHub Desktop (it holds `.git/index.lock`). Check PR state first: `gh pr view 45` (Build Spec 14, base main) and `gh pr view 46` (Build Spec 15, stacked on #45). If merged, branch new work off `origin/main`; if still open, stack on `build/15-website-e2e-tier-a` and note the stacking in each PR body. Joshua merges PRs, not you.

## Where things stand (2026-06-10)

- **Intake/profile engine**: hardened (Spec 14, PR #45) — provenance-aware generation ([UNCONFIRMED] hedging), identity assert before persist, extraction recall, provisioning readiness projection (`--strict-provisioning`, exit 3), runner self-heal. The 12-doc generation pipeline is proven e2e (`scripts/e2e-littlefriends.sh`).
- **Website pipeline**: feature-complete on paper (`run all`: discover→scrape→audit→synthesize→scaffold→clone→finalize→clone-fidelity→fixes→improve, unattended + resumable via `--from`), but live-proven on exactly ONE real site (audreys, Squarespace, driven by hand — full artifacts in gitignored `clients/audreys/`).
- **Test infra (Spec 15, PR #46)**: committed sanitized fixture `clients/wb-fixture/` (fictional Wildflour Bakery, domain `wildflour.example`, CDN `cdn.wildflour-assets.example`); offline Tier A harness `scripts/e2e-website-tier-a.sh` (scaffold→build→finalize→fixes, exit codes 2/11–16); CLI smoke matrix `scripts/cli-smoke.mjs` (73 commands + pinned exit codes + stack-trace tripwire); first test CI `.github/workflows/test.yml` (keyless by construction — never add a secret to it); `packages/scaffold-template/pnpm-lock.yaml` pins astro@5.18.2.
- **Key reading**: `.planning/website-rebuild-e2e-scope.md` (Tier B definition), `.planning/website-rebuild-engine/specs/15-website-e2e-tier-a-spec.md` §5 (Tier B decisions ALREADY MADE — owned fixture site, fidelity bar calibrated from audreys, clone scoped to a few pages, stop before deploy) + its changelog (hard-won findings), `.planning/intake-profile-engine/specs/14-fidelity-hardening-spec.md` (the hardening patterns you will port in Workstream B).

## Environment gotchas (all bitten us; respect them)

- Package test globs (`node --test 'dist/**/*.test.js'`) need node ≥21; shells here default to node 20. CI pins node 22. Locally: `PATH="/opt/homebrew/bin:$PATH"` (node 23) or per-package `tsc` + `find dist -name '*.test.js' | xargs /opt/homebrew/bin/node --test` (schemas needs `src/fixtures` copied to `dist/`).
- The scaffolded repo's `pnpm build` needs node ≥22 (supabase realtime wants native WebSocket); the Tier A harness preflights this (exit 2).
- oclif `topicSeparator` is a SPACE: `upriver fixes plan <slug>`, never `fixes:plan`.
- `UPRIVER_DATA_SOURCE=local` for all local client-data work; invoke the CLI as `node packages/cli/bin/run.js …` (real subprocess — that's how the Spec 14 exit-code bug was caught).
- finalize's pass-1 rewrites the client domain INCLUDING subdomains; only non-subdomain CDN hosts reach the manifest-keyed CDN pass.
- Sanitization standard for any fixture derived from real client data: token-swap is NOT enough. Rewrite all human-readable prose; randomize site/asset ID tokens; verify with an exhaustive 4-gram sweep against the source corpus (0 non-boilerplate matches) + an independent fresh-tooling audit; squash history before any push. See Spec 15 changelog (four rounds were needed).

## Workstream A — Build Spec 16: Tier B live spine e2e (do first)

Brainstorm-light (decisions already recorded in Spec 15 §5); write the spec + plan, then build. Scope: host the fixture site (generate a tiny 3–6-page static site from the wb-fixture content — fictional, ours, stable; deploy to Vercel/Pages, noindex), then `scripts/e2e-website-tier-b.sh` (or extend tier-a per its header contract): `init → discover → scrape → audit → synthesize → scaffold → clone (2–3 pages) → finalize → clone-fidelity → fixes-plan`, unattended, mechanical artifact checkpoints per stage (the scope doc lists them), report mirroring `12-e2e-rerun-report.md`. Needs `FIRECRAWL_API_KEY` + `claude` CLI — env-gated, NEVER in the keyless test.yml (separate gated workflow or manual-only). Locate/regenerate the clone-fidelity score summary during scoping (audreys' `clone-qa/` lacks summary.json) and set the calibrated pass bar in the spec. Expected findings (the point): clone prompt overflow, no-file failures, link-rewrite gaps, fidelity-scorer stability.

## Workstream B — Build Spec 17: clone-stage hardening (after A's findings)

`packages/cli/src/commands/clone.ts` (1,024 lines, one headless agent PER PAGE, 1–10 min/page) has: NO prompt-size preflight, NO self-heal retry (only a stale-entry prune), NO cost ceiling. Port the proven Spec 14 patterns, shaped by what Workstream A actually surfaced: (1) F2 analog — per-page prompt-size projection in a dry-run before burning hours; (2) P6 analog — one fresh no-cache retry on the no-file class; (3) fidelity assert before persist (a page scoring under the bar must not land silently — wire to the Spec 16 calibrated bar); (4) budget caps — max pages / max spend per run, surfaced in dry-run. Same surgical discipline as Spec 14: TDD per task, no redesign of the clone agent itself.

## Workstream C — Build Spec 18: site-diversity matrix ("any" is a corpus claim)

Pick 3–5 permissioned/owned sites across platforms (WordPress, Wix/Webflow, Shopify or custom SPA — audreys already covers Squarespace) and sizes; run the Tier B harness against each; file findings per stage (the Spec 13 batch-evaluation move, applied to sites instead of docs). Watch specifically: scrape shape variance, design-token extraction, the scaffold↔audit-package contract (scaffold hard-crashes without `meta.clientName`/`designSystem`/`siteStructure.pages`/`contentInventory` — synthesize must emit them for every site shape), CDN-subdomain vs third-party-CDN rewrite paths. NOTE: Workstream E at scale feeds this corpus automatically — every prospect run is a matrix data point; design the findings format so sales-tool runs can be harvested into it.

## Workstream D — smaller, parallelizable specs (slot between others)

1. **Live deploy e2e**: one disposable-infra run (real GitHub repo + Supabase + Vercel via `scaffold github/supabase/deploy --commit`, assert deployed URL serves, tear down). Manual/gated workflow, never in test.yml.
2. **Supabase-backed smokes**: `sync push/pull`, `profile push/pull`, `dashboard`, `admin-*` against a seeded test project (also exercises Spec 14's denylist loader network path).
3. **Intake-e2e content assertions** (from the Spec 14 retro): post-docs artifact greps (every doc names the client; no foreign client; no [NEEDS CONFIRMATION] for profile-held facts), P3 asserts the three leak fields APPLY not just candidate (bannedVocabulary candidates currently die on shape mismatch — drives the prompt-side schema-hint fix), the gap-fill checkpoint loop (set → verify → GATE_AUTO resume).

## Workstream E — NEW FEATURE: the sales tool (Build Spec 19; REQUIRES a full brainstorm with Joshua first)

**Joshua's intent, verbatim shape:** point it at a prospect's website → convert JUST their homepage to code (not the whole site) → create SHORT teaser versions of the documents → send them a questionnaire about it all to capture data and upsell. Think sales-tool-at-scale; eventually an agent does all of this autonomously.

**Composition insight (most of this exists — the feature is mostly orchestration):**
- Homepage-only clone: `clone` already takes `--page` (e.g. `--page /`); discover/scrape can be scoped. Cost ≈ one Firecrawl scrape + ONE clone session — this is why Workstream B's budget caps matter here.
- Teaser docs: the intake engine's generation machinery with a new "teaser" mode — e.g. 3 short artifacts: a mini brand-voice sample, top-3 quick wins (from the audit findings), homepage before/after. Spec 14's [UNCONFIRMED] hedging is LOAD-BEARING here: teasers are built almost entirely from recon, so every unverified fact must hedge — a wrong assertion in a sales teaser is brand damage.
- Questionnaire + data capture: `interview-link` / the web-bridge intake flow already exist. The killer bridge: questionnaire answers seed `identity.*`/profile fields, so a prospect who engages has ALREADY started onboarding — the upsell converts their own answers into the paid engagement's head start.
- Delivery/tracking: `report send` exists (email); `dashboard` exists (tracking). Prospect records likely need a lighter data model than full clients (decide: `prospects/` vs `clients/` with a stage field).
- Probable shape: one orchestrator command (`upriver pitch <url>` or similar) + a batch mode over a prospect list + per-prospect cost ceiling.

**Autonomy ladder (build in this order; each level is a separate decision gate):**
L0 operator runs it per prospect → L1 batch CLI over a list, human reviews every artifact before send → L2 agent drafts outreach + assembles bundles, human approves sends (queue + cron via routines) → L3 autonomous within guardrails (budget caps, daily send quotas, suppression list, auto-escalate replies to a human). Never auto-send without an explicit opt-in config flag; default is always human-approves-send.

**Guardrails to spec explicitly (non-negotiable):**
- Outreach compliance: real sender identity, working unsubscribe/suppression, no deception about what was generated (CAN-SPAM/GDPR posture).
- Preview sites: noindex, password or unguessable URL, auto-expire (e.g. 14 days), takedown on request — we are showing a prospect a rebuild of THEIR OWN content; never publish it as ours, never let it get indexed.
- Scraping politeness: homepage + public assets only for prospects; rate-limited.
- Per-prospect spend ceiling enforced in code, not convention.

**Open decisions for the brainstorm (ask Joshua, one at a time, before speccing):** outreach channel for v1 (email via report/send vs manual copy-paste); preview hosting (Vercel previews? password?); questionnaire vehicle (existing web-bridge intake vs external form); prospect data model + where it lives; which 2–3 teaser docs convert best; pricing/packaging mention in the teaser or not; the v1 autonomy level (recommend L0/L1).

## Sequencing recommendation

A (16) → B (17) → E v1 at L0/L1 (19; it only needs a reliable homepage clone, which B delivers) → C (18; harvested partly from E's runs) → D items slotted wherever a spec is blocked. Rationale: the sales tool is the revenue driver and becomes the generalization corpus generator; hardening before scale.

## Process invariants (every workstream)

Spec in `.planning/<engine>/specs/NN-…-spec.md` (next free number; website work → `website-rebuild-engine`, sales tool → its own `sales-engine` dir), plan in sibling `plans/`, branch `build/NN-<slug>`, TDD with the plan's exact failing-test-first steps, fresh implementer subagent per task + spec-compliance review + code-quality review (fix-and-re-review loops until approved), final holistic review of the branch, DoD ticked only when actually verified, changelog mapping deviations honestly, push + PR + (if CI applies) watch checks green, STOP — Joshua merges. Keyless test.yml stays keyless forever; gated/live workflows are separate files.
