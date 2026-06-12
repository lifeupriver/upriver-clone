# Handoff — Build Specs 17b + 18: clone hardening completion & the site-diversity matrix

Paste this into a fresh Claude Code session at the root of `upriver-clone`. The mission is TWO specs that form one arc: finish the clone-stage hardening at full-site scope (the un-landed remainder of old Workstream B), then prove "clone any site" as a corpus claim (old Workstream C), with the pitch engine feeding that corpus automatically. There is a SHORT brainstorm first — four open decisions at the bottom; ask Joshua one at a time, then spec → plan → build per the process invariants. Joshua merges PRs, not you.

## Where the repo stands (2026-06-12 evening — read this; everything below is post-PR-#55)

Spec 19 (the pitch engine) is MERGED: `upriver pitch run/batch/approve/revoke/status/convert`, the token-gated `/pitch/<slug>` portal (file-backed tokens with expiry+revocation), the four `doc-pitch-*` teaser deliverables, the compliance send path (HMAC unsubscribe, `outreach_suppression`, fail-closed suppression check), and the gated `e2e-pitch.yml`. Read `.planning/sales-engine/specs/19-pitch-engine-spec.md` INCLUDING its changelog — the deviations and findings there are load-bearing for this work.

What Spec 19 left exactly where you pick up:

- **Landed GENERALLY (applies to every clone):** prompt-size preflight (`assertPromptSize`, `packages/cli/src/clone/hardening.ts`) and the one-fresh-retry on the no-file class (`runAgentWithNoFileRetry`, wired in `clone.ts`; no-file is now an honest page FAILURE — it used to count as success, masked by the changelog fragment).
- **Landed PITCH-ONLY (your job to generalize):** fidelity-assert-before-persist (`fidelityGate`, `PITCH_FIDELITY_MIN = 70` — a conservative pick, no scored corpus existed; only gates pitch preview staging) and the spend ceiling (`packages/cli/src/pitch/ledger.ts` — checked BEFORE each costed step, but only `pitch run` uses it; `run all` and bare `clone` still have NO budget enforcement).
- **Ledger records ESTIMATES, not actuals.** `usage_events` (Supabase) and `token-and-credit-usage.log` (local) exist and are written by FirecrawlClient/claude calls — wiring actuals into the ceiling is named follow-up work that belongs in Spec 17b.
- **Spec 18 harvest contract already holds:** every pitch run emits standard `audit-package.json` + `clone-qa/summary.json` + versioned `pitch/state.json` (`v: 1`). No bespoke formats. The harvest sweep does not exist yet.
- Tier A/B/C harnesses all exist; Tier B targets the owned hosted fixture `https://upriver-wb-fixture.vercel.app` with a calibrated `WB_FIDELITY_BAR`. The dashboard test harness (`packages/dashboard/test/_setup.ts` TempClients) now supports nested paths and is the cheap way to test route handlers keyless.

## Spec 17b — clone hardening completion (full-site scope)

Spec file: `.planning/website-rebuild-engine/specs/17b-clone-hardening-completion-spec.md`. Scope, shaped by what already exists:

1. **Fidelity-assert-before-persist for CLIENT clones.** Today a multi-page clone can land a page scoring under the bar silently. Decide the enforcement shape with Joshua (decision 2 below), reuse `fidelityGate` (fail-closed semantics proven by tests), wire to the calibrated bar, and make `run all` honest about it (exit codes, state).
2. **Per-run spend ceiling for `run all`/`clone`.** Generalize `pitch/ledger.ts` (it is deliberately pure): per-stage estimates for the full pipeline, checked before each costed stage, surfaced in `run all --dry-run`, distinct exit code on abort. Pick defaults with Joshua (decision 3).
3. **Actuals over estimates.** Feed the ledger from `token-and-credit-usage.log` / `usage_events` where they exist; estimates remain the projection for not-yet-taken steps. This also retroactively improves `pitch status` spend numbers.
4. Anything Tier B's recent runs surfaced as a recurring clone failure class — check the e2e-website-tier-b workflow run history before speccing; findings beat speculation.

## Spec 18 — site-diversity matrix + `pitch harvest`

Spec file: `.planning/website-rebuild-engine/specs/18-site-diversity-spec.md`. The claim "clone any site" currently rests on Squarespace (audreys) + the fixture. Scope:

1. **The matrix:** 3–5 owned/permissioned sites across platforms and sizes (decision 1 below — Joshua picks the sites; WordPress, Wix/Webflow, Shopify-or-custom-SPA are the gaps). Run the Tier B harness (or a thin variant) against each; file findings PER STAGE — the Spec 13 batch-evaluation move applied to sites. Watch specifically: scrape shape variance, design-token extraction, the scaffold↔audit-package contract (scaffold hard-crashes without `meta.clientName`/`designSystem`/`siteStructure.pages`/`contentInventory`), CDN-subdomain vs third-party-CDN rewrite paths.
2. **`upriver pitch harvest`** (or `diversity harvest` — name it in the spec): sweep `clients/*/pitch/` + matrix-run dirs into one findings corpus with a versioned schema; every future prospect run becomes a matrix data point for free. The artifact formats are already standard — this is mostly aggregation + a report.
3. **Calibrate `PITCH_FIDELITY_MIN` and the client-clone bar from the corpus** once it has real scores — close the "conservative pick" loop from the Spec 19 changelog.

## Guardrails (non-negotiable)

- Matrix sites are owned/permissioned ONLY; same scraping politeness and `--max-pages` discipline; matrix runs respect the new spend ceilings (they are the first consumers).
- Security invariants stay: agents through `runAgent` only (no Bash, `buildAgentEnv` scrub, hard timeouts); slugs through `assertSafeSlug`; client/prospect artifacts stay gitignored, sanitized fixtures only in tests.
- Keyless `test.yml` stays keyless FOREVER. Live matrix runs go in gated `workflow_dispatch` workflows. Exit-code ranges in use: Tier A 11–16, B 21–32, C 41–47, pitch e2e 51–58, pitch CLI aborts 21/22 — pick a fresh range (61+) for anything new and record it.

## Open decisions for the brainstorm (ask Joshua one at a time, BEFORE speccing)

1. **Spec 18 site list:** which 3–5 owned/permissioned sites (URLs + platform each), and the budget per matrix run (the ceiling defaults follow from this).
2. **Client-clone fidelity enforcement:** hard gate (below-bar page fails the clone stage) vs warn-and-record (page lands, flagged in fixes-plan/state) — and per-page bar vs whole-site mean. Recommend: warn-and-record default with a `--strict-fidelity` hard gate, bar from Tier B's calibrated value.
3. **`run all` spend ceiling defaults:** per-run USD default and whether it's opt-out (`--no-spend-ceiling`) or opt-in. Recommend: on by default, generous default (~$25/run), surfaced in `--dry-run`.
4. **Do the pitch-funnel extras ride along or wait?** Cheap, high-leverage candidates: `viewedAt` on the portal route → `pitch status` (first-party open signal), a `pitch nudge <slug>` expiry-reminder draft through the same approve gate, a dashboard prospect-funnel page (the L2 approve-queue seed). Recommend: `viewedAt` rides along (it's ~30 lines); the rest waits for its own spec.

## Process invariants

Specs in `.planning/website-rebuild-engine/specs/` as named above, plans in sibling `plans/`, build on a fresh branch per your session's branch conventions (one branch+PR per spec is fine; 17b first — 18's matrix runs want the ceilings in place). TDD failing-test-first; new commands register in `scripts/cli-smoke.mjs`; DoD ticked only when actually verified (live-run items verified by gated workflows are marked as such, honestly); changelog maps deviations; push + draft PR + watch CI; STOP — Joshua merges.

## Operator prerequisites (Joshua, before/alongside — the session should remind, not block)

- Repo secrets `FIRECRAWL_API_KEY` + `ANTHROPIC_API_KEY` set, then dispatch `e2e-pitch.yml` once (~$4.50) — closes Spec 19's two open DoD items and produces the first scored pitch corpus entry.
- Apply `supabase/migrations/20260612120000_spec19_outreach_suppression.sql` to the hosted project; set `UPRIVER_UNSUBSCRIBE_SECRET` on the dashboard deployment.
- Resend sending domain + `UPRIVER_OUTREACH_POSTAL` decided (DECISIONS-NEEDED.md item E) before any real prospect send.

## Environment gotchas (still true)

- oclif `topicSeparator` is a SPACE (`upriver pitch run`, never `pitch:run`).
- `UPRIVER_DATA_SOURCE=local` for all local client-data work; invoke the CLI as a real subprocess in e2e (`node packages/cli/bin/run.js …`).
- Scaffolded-repo builds need node ≥ 22; `claude` CLI required for clone/generate; `UPRIVER_GATE_AUTO=1` for unattended generate runs; `UPRIVER_USE_API_KEY=1` + `ANTHROPIC_API_KEY` in containers.

## Key reading before the brainstorm

`.planning/sales-engine/specs/19-pitch-engine-spec.md` (esp. §4, §11, changelog), `.planning/sales-engine/plans/2026-06-12-19-pitch-engine-plan.md` (grounded contracts table), `packages/cli/src/pitch/ledger.ts`, `packages/cli/src/clone/hardening.ts`, `packages/cli/src/commands/clone.ts`, `scripts/e2e-website-tier-b.sh` + its workflow run history, `.planning/website-rebuild-engine/specs/15-website-e2e-tier-a-spec.md` §5 + changelog, `.planning/roadmap/2026-06-10-next-phase-handoff-prompt.md` §Workstreams B–D (the briefs this supersedes).
