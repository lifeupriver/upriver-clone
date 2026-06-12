# Handoff — Build Spec 19: the sales tool (`upriver pitch`)

Paste this into a fresh Claude Code session at the root of `upriver-clone`. The mission is ONE feature: the prospect-facing sales tool. It REQUIRES a brainstorm with Joshua before any spec is written — the open decisions are listed at the bottom; ask them one at a time, then spec → plan → build per the process invariants. Joshua merges PRs, not you.

## What this is

**Joshua's intent, verbatim shape:** point it at a prospect's website → convert JUST their homepage to code (not the whole site) → create SHORT teaser versions of the documents → send them a questionnaire about it all to capture data and upsell. Think sales-tool-at-scale; eventually an agent does all of this autonomously.

Probable shape: one orchestrator command (`upriver pitch <url>`) + a batch mode over a prospect list + a per-prospect cost ceiling enforced in code. The killer bridge: questionnaire answers seed `identity.*`/profile fields, so a prospect who engages has ALREADY started onboarding — the upsell converts their own answers into the paid engagement's head start.

## Where the repo stands (2026-06-12 — read this; the 2026-06-10 handoff is stale)

The full audit-remediation program shipped and merged as PRs #50/#51/#52 (Phases 1–4, specs/roadmap items W0–W7). Relevant deltas since the previous handoff:

- **Security invariants you MUST preserve.** All headless agents now run through `packages/cli/src/util/claude-code.ts` (`runAgent`): no Bash tool, allowlisted env (`buildAgentEnv` — secrets never reach agent sessions or client-repo builds), hard timeouts. Slugs are validated centrally (`assertSafeSlug` in core); share tokens are sha256-hashed at rest and minted/validated via `packages/dashboard/src/lib/share-token.ts` (plaintext exists exactly once, at mint). Any new prospect-facing artifact must go through these, not around them.
- **Partial Spec 17 (clone hardening) landed; the rest did not.** Landed: no-Bash agents, env scrub, 20-min agent timeouts, honest exit codes (all-pages-failed clone exits 1), worktree preserved on failure, `scrape --max-pages` (default cap 150), fidelity viewport/scaling/Unicode fixes. **NOT landed: per-page prompt-size preflight, one fresh no-cache retry on the no-file failure class, fidelity-assert-before-persist, per-RUN spend ceiling.** The old sequencing put Spec 17 before the sales tool because pitch needs a *reliable homepage clone*. Recommendation: fold the homepage-scoped minimum of those four into Spec 19 itself (they're small at single-page scope) rather than blocking on a full Spec 17.
- **New capabilities to compose with** (don't rebuild): 10 vertical packs incl. retail/home-services/medical/fitness/nonprofit (`audit-passes/src/shared/vertical-pack.ts`) — use for vertical-aware teaser framing; config-driven locality (`city/region/serviceArea/localBusiness` on client-config); Resend sender helper (`cli/src/report-helpers/resend.ts`); Tier C runtime harness pattern (`scripts/e2e-website-tier-c.sh`) for asserting a served preview over HTTP; per-client pricing in client-config (`dashboard/src/lib/pricing.ts`); `client_admins` table + worker crons; F05 webhook flow (HMAC, allowlisted repos, draft-PR-only) as the reference for "safe by design".
- **Reusable building blocks for pitch** (the feature is mostly orchestration): `clone --page /` (homepage-only clone exists); `discover`/`scrape` scope flags + `--max-pages`; `urlToSlug` (`cli/src/util/url-slug.ts`); the generate engine + Spec 14's `[UNCONFIRMED]` hedging — LOAD-BEARING for teasers, which are built almost entirely from recon, and a wrong assertion in a sales teaser is brand damage; `recon` + `interview-link`/web-bridge intake for the questionnaire; `report send` (Resend) for delivery; the dashboard deliverable portal (token-gated, navigation now carries tokens) for hosting teaser views.
- **Test/CI contract:** `test.yml` is keyless FOREVER (build + unit + smoke + Tier A + deploy-dry-run + Tier C). New commands must register in `scripts/cli-smoke.mjs` (`--help` exits 0, no stack trace; pinned dry-run rows where cheap). Live/credentialed runs go in separate `workflow_dispatch`-gated workflows (see `e2e-website-tier-b.yml`). Exit-code ranges in use: Tier A 11–16, Tier B 21–32, Tier C 41–47.

## Guardrails to spec explicitly (non-negotiable)

- **Outreach compliance:** real sender identity, working unsubscribe/suppression list, no deception about what was generated (CAN-SPAM/GDPR posture). Never auto-send without an explicit opt-in config flag; default is always human-approves-send.
- **Preview sites:** noindex, password or unguessable URL, auto-expire (~14 days), takedown on request. We are showing a prospect a rebuild of THEIR OWN content — never publish it as ours, never let it get indexed.
- **Scraping politeness:** homepage + public assets only for prospects; rate-limited; respect the existing `--max-pages` discipline.
- **Per-prospect spend ceiling enforced in code, not convention** (Firecrawl credits + agent time), surfaced in `--dry-run`.
- **Prospect PII:** whatever data model is chosen, prospect artifacts inherit the same confidentiality posture as `clients/` (gitignored, sanitized fixtures only in tests).

## Autonomy ladder (build in this order; each level is a separate decision gate)

L0 operator runs it per prospect → L1 batch CLI over a list, human reviews every artifact before send → L2 agent drafts outreach + assembles bundles, human approves sends → L3 autonomous within guardrails (budget caps, daily send quotas, suppression list, auto-escalate replies to a human). Recommend v1 at L0/L1.

## Open decisions for the brainstorm (ask Joshua one at a time, BEFORE speccing)

1. Outreach channel for v1 — email via the Resend path vs manual copy-paste?
2. Preview hosting — Vercel previews? password vs unguessable-URL? expiry mechanics?
3. Questionnaire vehicle — existing web-bridge intake/interview-link vs an external form?
4. Prospect data model — `prospects/<slug>/` dir vs `clients/` with a `stage` field? (Affects dashboard, sync, archival.)
5. Which 2–3 teaser docs convert best — mini brand-voice sample? top-3 quick wins from audit findings? homepage before/after?
6. Pricing/packaging mention in the teaser or not? (Per-client pricing config now exists.)
7. v1 autonomy level (recommend L0/L1) and what "approve send" looks like operationally.

## Process invariants

Spec in `.planning/sales-engine/specs/19-pitch-engine-spec.md` (new dir — sales tool gets its own engine dir), plan in sibling `plans/`, build on a fresh branch per your session's branch conventions. TDD with failing-test-first; keyless `test.yml` stays keyless; live pitch e2e goes in a gated workflow. Every prospect-run is a future Spec 18 site-diversity data point — design the findings/artifact format so pitch runs can be harvested into the diversity corpus. DoD ticked only when actually verified; changelog maps deviations honestly; push + draft PR + watch CI; STOP — Joshua merges.

## Environment gotchas (still true)

- oclif `topicSeparator` is a SPACE (`upriver fixes plan`, never `fixes:plan`); new `pitch` subcommands follow suit.
- `UPRIVER_DATA_SOURCE=local` for all local client-data work; invoke the CLI as a real subprocess in e2e (`node packages/cli/bin/run.js …`) — that's how exit-code bugs get caught.
- Scaffolded-repo builds need node ≥ 22; Tier A/C preflight this (exit 2).
- `claude` CLI required for clone/generate paths; `UPRIVER_GATE_AUTO=1` for unattended generate runs; agents authenticate via the operator's logged-in session locally, `UPRIVER_USE_API_KEY=1` + `ANTHROPIC_API_KEY` in containers.

## Key reading before the brainstorm

`docs/ARCHITECTURE.md`, `docs/INTAKE-PROFILE-ENGINE.md`, `cli/src/commands/clone.ts` (the `--page` path), `cli/src/util/claude-code.ts`, `cli/src/web-bridge/`, `cli/src/report-helpers/{resend,share-token}.ts`, `scripts/e2e-website-tier-c.sh`, `.planning/roadmap/2026-06-10-next-phase-handoff-prompt.md` §Workstream E (the original brief this supersedes), `docs/SALES-PLAYBOOK.md`.
