# Tier-3 Build Prompt

Handoff for a fresh Claude Code session to build tier-3 of the Intake & Profile
Engine. Tier-2 (profile commands, recon, intake migration, transcript extractor)
is merged to `main`; tier-3 is the two specs below.

## Orientation

`main` carries the full tier-2 implementation plus its integration
reconciliation (PRs #27, #28 merged). The two tier-3 build specs are in-tree and
are your contract — read them first; each has File ownership, Layout, and a
Definition of Done, and each ends with one flagged open decision you must make:

- **`.planning/intake-profile-engine/specs/08-generate-all-spec.md`** — M2
  `upriver generate --all`: DAG-batch generation over docs 01–12, **extending**
  Build Spec 02's single-doc engine (do NOT rewrite it). Pure CLI
  (`packages/cli`).
- **`.planning/intake-profile-engine/specs/06-chatbot-spec.md`** — M6: the
  coverage-driven dashboard chatbot (Anthropic SDK, magic-link gated,
  `source:'interview'` writes through `ClientDataSource` behind the PRD §7 trust
  boundary) **plus** the operator dashboard coverage view (renders the profile
  `ShowModel`). Pure dashboard (`packages/dashboard`).

Also read for context: `01-prd.md` §4.2 / §5 / §6 / §7 / §8 (M2, M6); the
tier-2 integration report `.planning/intake-profile-engine/06-tier2-integration-report.md`
(current state, the seams already resolved, the conventions below); Build Spec 02
(`specs/02-generate-spec.md`) since 08 extends its engine; Build Spec 03
(`specs/03-profile-commands-spec.md`) since 06's coverage view renders its
`ShowModel`.

## Preconditions (stop and report if any fail)

- `git fetch --all`; branch from `origin/main`. Confirm `specs/06-chatbot-spec.md`
  and `specs/08-generate-all-spec.md` exist on `main`.
- `pnpm install`; baseline **`pnpm build` clean** and **`pnpm -r test` green**:
  schemas 39, core 21, audit-passes 15, dashboard 15, cli 322 = **412**.

## Build approach — branch hygiene (the tier-2 lesson)

Tier-2's four parallel sessions shared one working tree on a stacked lineage,
which produced tangled branches and deferred seams that needed a whole
integration session to reconcile. **Do not repeat that.** The two tier-3 specs
touch **disjoint packages** (`08` = `packages/cli`, `06` = `packages/dashboard`)
with at most one optional shared-package touch (06 may promote `buildShowModel`
into `@upriver/schemas`). So:

- **Recommended: one session, one branch from `main`, build 08 then 06
  sequentially.** They're independent; sequential avoids all cross-contamination
  and needs no integration pass. Build 08 fully (green), commit; then 06.
- If you split into two sessions, give each its **own** branch from `main` and
  open separate PRs — never stack one on the other's uncommitted tree.

Keep each commit within that spec's declared File-ownership set + planning docs
(tier-2's per-commit ownership discipline). Open a **draft** PR to `main` per
branch; **do not merge** — Joshua reviews in Cowork.

## Per-spec, resolve the flagged open decision

- **08:** decide whether per-tier commits are made by the CLI directly or
  surfaced as a printed command (repo-convention call). Pick one, changelog it.
- **06:** decide whether to **promote `buildShowModel`** (currently
  `packages/cli/src/profile/show-model.ts`) into `@upriver/schemas` so the CLI
  and the dashboard coverage view share one builder (preferred — avoids drift),
  or re-implement in `dashboard/.../profile-coverage.ts` with a parity test.
  Either way add `@anthropic-ai/sdk` to `packages/dashboard` **only**.

## Cross-cutting requirements (carried from tier-2)

- **Clean builds for accurate test counts.** `tsc` does not delete the compiled
  `.js` of removed/renamed source — run the package `clean` (or `pnpm -r run
  clean`) before a count you report. `pnpm -r test` includes the dashboard.
- **`verified:true` is operator-only.** No batch/chatbot/coverage path may ever
  write `verified:true`; the chatbot endpoint must reject `verified`,
  operator-source, and every HV/credential/money field (PRD §7). Grep-check it.
- **All client I/O through `ClientDataSource`.** No `writeFileSync` targeting
  `clients/` outside the data sources; the chatbot endpoint must NOT construct a
  direct Supabase client (use the dashboard's `lib/data-source.ts`).
- **Data-source error coherence (tier-2 seam 3).** Any new data-source-resolving
  CLI path uses `resolveClientDataSourceOrFail((m) => this.error(m))`; 08 reuses
  `generate`'s already-coherent resolution, so it inherits this for free.
- **Reuse, don't fork.** 08 reuses `generate/engine.ts`, `manifest.ts`,
  `profile-io.ts`, `@upriver/schemas` `generationOrder`/`deliverableReadiness`.
  06 reuses `validateInterviewToken` + `interview-share.json` (magic link) and
  keeps the static FormSpec form as the no-JS fallback.
- **Size/shape:** ~300-line cap per file; thin oclif commands and thin Astro
  pages — logic in injectable modules so tests mock the LLM (`claudeCliCall` for
  08, the Anthropic SDK for 06) with zero live calls.

## Acceptance (per each spec's DoD, against `clients/littlefriends/`)

- **08:** `generate littlefriends --all --dry-run` prints the tier plan
  (ready tier + the HV-blocked docs named with their fields); then a real
  `--all` run produces the eligible tier(s) with the per-tier gate and
  aggregated `[NEEDS CONFIRMATION]` markers. Doc quality is reviewed by Joshua at
  the gate, not by the build session. Use `UPRIVER_DATA_SOURCE=local`.
- **06:** the coverage view renders littlefriends' `ShowModel` (parity with
  `profile show --json`); a scripted chat session fills ≥1 chatbot-fillable
  field end-to-end through the endpoint (token → question → answer →
  `source:'interview'` write → revision bump → gap shrinks) plus at least one
  **rejected** write (HV or non-whitelisted) proving the boundary; the static
  form still works.

## Deliver

- `pnpm build` clean + `pnpm -r test` green at the end.
- Each spec's changelog gets a **BUILT** entry: DoD table result, deviations, and
  the resolved open decision.
- Push; open a draft PR per branch titled for its spec; do not merge.

## Not part of tier-3 build (separate, operator-driven — don't block on them)

Real Little Friends transcript run; Supabase-backed end-to-end pass; answering
doc-01's `[NEEDS CONFIRMATION]` markers (recon discovered the real business is a
**Montessori** preschool at **290 North St, Newburgh, NY** — this conflicts with
the worked-example's synthetic placeholders; Joshua adjudicates, then fill+verify
the profile and regenerate doc-01, don't hand-edit the generated md); deleting
the stale `build/03|04|05|07(+-impl)` branch pointers.
