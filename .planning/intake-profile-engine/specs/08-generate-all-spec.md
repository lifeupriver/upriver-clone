# Build Spec 08: `upriver generate --all` (DAG-batch generation, M2)

Component: M2 — batch generation across the 01–12 document DAG with coverage gating, `[NEEDS CONFIRMATION]` aggregation, and per-tier Continue gates + commits. Extends the M1 single-doc engine (Build Spec 02) — `--all` was explicitly deferred there as "an extension, not a rewrite" (`generationOrder` is already imported and used to validate `--doc` upstream deps).
Built: tier-3, fresh Claude Code session, after the tier-2 integration merged to `main`.
Source of truth: `01-prd.md` §5 (engine mechanics, esp. §5.2 order / §5.5 gate / §5.6 sequential-first), §8 M2; `specs/02-generate-spec.md` (the engine this extends, incl. its `engine.ts`/`gate.ts`/`manifest.ts` deviations). Where this spec is more specific, it wins.

---

## File ownership (parallel-build boundary)

This session OWNS: `packages/cli/src/commands/generate.ts` (add the `--all` flag + the batch orchestration loop — keep it thin), a new `packages/cli/src/generate/batch.ts` (the oclif-free batch orchestrator), and batch-aggregate additions to `packages/cli/src/generate/report.ts` (a run-level report; do not change the existing single-doc renderers). It must NOT modify the proven single-doc core (`generate/engine.ts`, `runner.ts`, `prompt-builder.ts`, `profile-slice.ts`, `spec-loader.ts`, `markers.ts`) beyond additive exports needed for reuse — if a non-additive change is required, STOP and changelog. `@upriver/schemas` is read-only (consume `generationOrder`, `deliverableReadiness`, `COVERAGE_MAP`); `manifest.ts` is reused as-is (approval is the "generated" signal); `profile-io.ts` is reused. No dashboard, no worker (M8 adds the enqueue path).

## 1. Purpose and scope

`upriver generate <slug> --all [--docs <ids>] [--dry-run] [--yes] [--from <id>]`:

1. **Load + gate once.** `readProfile`, `clientProfileZ.parse`, read `docs/manifest.json`. Compute `deliverableReadiness` for every doc in scope (01–12 by default; `--docs` narrows). A doc is eligible when its required fields are present, its required HV fields are verified, AND its `requiresDocs` are *approved* in the manifest (per Build Spec 02 deviation: approval — not mere presence — is the "generated" signal).
2. **Order into DAG tiers.** Topologically sort the eligible set by `generationOrder` (from `@upriver/schemas`, the machine-readable form of the §3.1 DAG). Group into tiers where a tier's docs depend only on earlier tiers — so within a tier order is irrelevant and (in a later v2) parallelizable. Report docs that are *blocked* and why (missing fields / unverified HV / unapproved upstream), distinguishing "blocked by a doc earlier in this same run that isn't approved yet" from "blocked by missing profile data."
3. **Generate tier by tier, sequentially within a tier.** Each doc reuses the M1 engine (`runGenerate` / `generate/engine.ts`) unchanged — same prompt assembly, write-capable session, marker scan, manifest write (`approved: false`), cache-by-`specHash+profileSliceHash`. A doc that fails (non-zero envelope / absent output) is recorded and does NOT abort the run; its dependents become blocked-this-run and are skipped with that reason.
4. **Aggregate + gate per tier.** After each tier, print the run-level report: docs produced (path, word count, marker count), the consolidated `[NEEDS CONFIRMATION]` list across the tier (grouped by doc), what the tier unblocked for the next tier, and any failures. Then the Continue gate pauses for the whole tier (`Approve tier N (docs …)? [y/N]`). `y` marks each tier doc `approved: true` (unblocking the next tier); `N` leaves them unapproved and stops the run (exit 0) with the paths so the operator can review/edit and resume with `--from`. `--yes` auto-approves only tiers whose docs were already approved in a prior run (re-runs). Non-TTY without `--yes`: generate, report, stop before approving.
5. **Commit per gate.** On tier approval, commit the generated docs + manifest for that tier (per PRD §5: "generated docs are committed per-gate so every approved state is recoverable") via the same git path the repo already uses; one commit per approved tier, message naming the tier's docs. (If committing from the CLI is out of the repo's convention, write the docs/manifest and print the exact commit command instead — changelog the choice.)

`--dry-run`: do steps 1–2 and print the full plan (tiers, eligible vs blocked with reasons, assembled prompt sizes per doc) with **zero** `claude` invocations and no writes. `--from <id>` resumes a partially-approved run at the tier containing `<id>`. `--docs a,b,c` restricts the scope to a subset (still DAG-ordered; deps outside the subset must already be approved or the doc is reported blocked).

Out of scope: provisioning artifacts I01–I09 (M5); operational docs 13–18 (generated rarely — operator runs them by `--doc`); worktree parallelism + the worker enqueue allowlists (M8); any change to how a single doc is generated.

## 2. Layout

```
packages/cli/src/
├── commands/generate.ts     +--all/--docs/--from flags; if --all, delegate to batch.ts then
│                            run the per-tier gate loop (reusing generate/gate.ts). Stays thin.
└── generate/
    ├── batch.ts        NEW  pure-ish orchestrator: plan(profile,manifest,scope) → {tiers,
    │                        blocked[]}; runTier(...) reuses engine.runGenerate per doc;
    │                        aggregateMarkers(tier results). No oclif; injectable generator +
    │                        committer so it unit-tests with claudeCliCall + git mocked.
    └── report.ts       +    renderBatchPlan(plan) and renderTierReport(results) — additive;
                             the existing single-doc renderers are untouched.
```

`batch.ts` consumes `engine.ts`'s existing `runGenerate` and `manifest.ts`/`profile-io.ts`; the DAG tiering is a small pure function over `generationOrder` + `COVERAGE_MAP[id].requiresDocs`. ~300-line cap holds (most logic is reused).

## 3. Definition of Done

- [ ] Root `pnpm build` clean; `pnpm --filter @upriver/cli test` green (existing + new); no new deps
- [ ] Unit tests (pure, `claudeCliCall` + git mocked): tiering (a known DAG → expected tiers; a doc blocked by an unapproved same-run upstream lands blocked, not in a tier); plan reasons (missing-fields vs unverified-HV vs unapproved-upstream distinguished); marker aggregation across a tier; failure isolation (one doc fails → dependents skipped with reason, run continues); `--from` resumes at the right tier; `--docs` subset ordering + out-of-subset dep handling
- [ ] `--dry-run` prints the full tier plan with zero `claude` invocations (asserted via mock) and no writes
- [ ] Per-tier Continue gate: `y` approves the whole tier (manifest), `N` stops with resume hint; `--yes` refuses tiers with any never-approved doc; non-TTY without `--yes` stops before approving
- [ ] Per-gate commit (or the printed-command fallback) records each approved tier; one commit per tier
- [ ] Live acceptance against `clients/littlefriends/`: `generate littlefriends --all --dry-run` prints the plan (doc-01/02 ready-tier, the HV-blocked docs named with their fields); then a real `--all` run produces the eligible tier(s) with the gate shown and markers aggregated — transcript in the changelog. (Doc quality is reviewed by Joshua at the gate, not by the build session.)
- [ ] No client-artifact I/O outside `ClientDataSource` (grep: no `writeFileSync` targeting `clients/` outside data sources); single-doc engine unmodified beyond additive exports; no file > ~300 lines; `generate.ts` thin
- [ ] Spec changelog: deviations, the acceptance transcript, follow-ups (M5 provisioning batch, M8 worktree parallelism + worker allowlists)

## Changelog

- 2026-06-04: spec written (tier-3 batch, after the tier-2 integration merged). Extends Build Spec 02's engine; `--all` was scoped out of M1 deliberately. Open question for the build session, flagged not decided: whether per-tier commits are made by the CLI directly or surfaced as a printed command (repo convention call) — pick one and changelog it.

- 2026-06-05: **BUILT.** `upriver generate --all` (DAG-batch over docs 01–12) shipped, extending the M1 single-doc engine without rewriting it. New `generate/batch.ts` (oclif-free orchestrator: `planBatch` / `runTier` / `aggregateMarkers` / `commitCommand` / `tierIndexOf`), additive `renderDocLine`/`renderBatchPlan`/`renderTierReport`/`tierUnblocks` in `generate/report.ts`, and the `--all`/`--docs`/`--from` flags + per-tier gate loop in `commands/generate.ts`. `pnpm --filter @upriver/cli test` green at **336** (322 baseline + 14 new), root `pnpm build` clean, no new deps.

### Resolved open decision — per-tier commits

**Surfaced as a printed git command, not run by the CLI.** Rationale (repo-convention call): `clients/` is `.gitignore`d (the worked example is force-added), and the canonical store is the `ClientDataSource` abstraction which may be Supabase Storage where git is not involved at all — so a CLI-issued `git commit` would be incoherent for the default/production data source, and no existing `upriver` command shells out to git. On tier approval the manifest write (`approved:true`) through the data source is the recoverable record; the CLI then prints the exact `git add -f … && git commit -m "…"` for operators on the local data source. The committer is isolated in `batch.commitCommand`, so a future CLI-direct git path is a one-function swap.

### Definition of Done — verification table

| DoD item | Result |
|---|---|
| Root `pnpm build` clean; `@upriver/cli test` green (existing + new); no new deps | **PASS** — build clean; cli 336/336; no `packages/cli/package.json` change |
| Unit tests: tiering; same-run-upstream-blocked lands blocked not tiered; plan reasons (missing-fields vs unverified-HV vs unapproved-upstream); marker aggregation; failure isolation; `--from`; `--docs` subset + out-of-subset dep | **PASS** — `batch.test.ts` (13) + `report.test.ts` (+4): independent ready→tier 0; downstream→tier 1; field-ready-but-dep-blocked → blocked-upstream (not tiered); reasons distinguished; out-of-subset dep classified `unapproved-out-of-scope` vs approved-satisfies; `tierIndexOf`; `aggregateMarkers`; `runTier` failure isolation (doc-02 throws → doc-01 still produced) + dead-upstream skip (no claude call) |
| `--dry-run` prints the full tier plan, zero `claude` (asserted via mock) | **PASS** — live dry-run prints tiers + blocked-with-reasons + per-producible-doc prompt sizes; engine dry-run path asserted call-free in `engine.test.ts`; batch dry-run reuses it |
| Per-tier Continue gate: `y` approves the tier; `N` stops with resume hint; `--yes` refuses tiers with a never-approved doc; non-TTY without `--yes` stops before approving | **PASS** — reuses `gate.resolveGateDecision` at tier granularity; live non-TTY run stopped before approving with `--from doc-01` hint |
| Per-gate commit (or printed-command fallback); one per tier | **PASS** — printed command (decision above); `commitCommand` names produced paths + manifest + the tier's docs, unit-tested |
| Live acceptance vs `clients/littlefriends/` (`UPRIVER_DATA_SOURCE=local`) | **PASS** — transcript below |
| No client-artifact I/O outside `ClientDataSource`; single-doc engine unmodified beyond additive reuse; no file > ~300 lines; `generate.ts` thin | **PASS** — batch reuses `runGenerate`/`profile-io`/`manifest`; grep clean (no `writeFileSync` → `clients/`); largest new file `batch.ts` ~250 lines |
| Spec changelog: deviations, transcript, follow-ups | **PASS** (this entry) |

### Deviations & build decisions

1. **Additive reuse hooks on the M1 core (within the spec's "additive exports needed for reuse" allowance).** `generate/engine.ts` gained an optional `skipGate?: boolean` on `GenerateOptions` (batch generates + records the manifest entry but defers the Continue gate to the tier), an optional `words?: number` on `GenerateOutcome` (for the tier report), and one guarded early-return branch. Default behavior is byte-unchanged — the full 322-test single-doc suite stays green. No non-additive change to `engine.ts`/`runner.ts`/`prompt-builder.ts`/`profile-slice.ts`/`spec-loader.ts`/`markers.ts` was needed, so no STOP was triggered.
2. **Failure isolation lives in `runTier`, not the engine.** `runGenerate` still throws on an absent/empty doc; `runTier` wraps each call in try/catch and records a `failed` `DocResult`, so one doc's failure never aborts the tier. Dependents in later tiers are skipped via the accumulating `failedUpstream` set.
3. **Tiering = field/HV-ready ∧ deps satisfiable, layered by `generationOrder`.** `planBatch` computes the producible set by fixpoint (a doc is producible iff field/HV-ready and every `requiresDocs` dep is already approved or itself producible), then layers it into tiers by longest in-run dependency path. A field/HV-ready doc whose dep is unsatisfiable lands in `blocked` with `blocked-upstream`, distinguishing `blocked-this-run` (dep in scope but itself blocked — needs profile data) from `unapproved-out-of-scope` (dep neither approved nor in the `--docs` subset).

### Live acceptance transcript (`clients/littlefriends/`, `UPRIVER_DATA_SOURCE=local`, isolated `UPRIVER_CLIENTS_DIR` so the tracked worked example is untouched)

`generate littlefriends --all --dry-run` →
```
Tiers (1) — generated in order, gated per tier:
  Tier 0 (2): doc-01, doc-02
Blocked (10):
  doc-03 (Sales Process Map)
    missing fields (7): people.keyTeam, salesProcess.leadSources, … capacity.bookingLeadTime
    unverified HV (4): salesProcess.close.definition, … capacity.bookingLeadTime
  doc-06 (SEO & Keyword Strategy)
    missing fields (5): seo.baseline, …            unverified HV (1): toolsAndAccess.analytics
    blocked by upstream needing data (1): doc-05
  … doc-04,05,07–12 each named with their missing fields / unverified HV / upstream …
Deliverable doc-01 … status: READY   system prompt: 46677 chars   (0 claude invocations)
Deliverable doc-02 … status: READY   system prompt: 54304 chars
```

`generate littlefriends --all` (real run) → Tier 0 produced: `doc-01` **reused** from the manifest cache (3098 words, 30 markers, **no claude call**), `doc-02` **generated** by a live write-mode headless session (3463 words, 85 markers). Tier 0 report aggregated **115** `[NEEDS CONFIRMATION]` markers grouped by doc. Non-TTY gate: *"Not a TTY; generated tier 0 and left it unapproved … resume: upriver generate littlefriends --all --from doc-01"* (exit 0). Doc quality is Joshua's to review at the gate. The tracked `clients/littlefriends/` was not mutated (run used an isolated dir).

### Follow-ups

- **M5 provisioning batch** — extend the scope/DAG to the I01–I09 artifacts (different output shape; HV-dense; I07-first ordering already in `COVERAGE_MAP`).
- **M8 worktree parallelism + worker enqueue** — within-tier docs are independent and parallelizable across `git worktree` checkouts; add `generate` to the three worker allowlists. `batch.ts`'s tier structure is the seam.
- **CLI-direct committer** — if Joshua prefers the CLI to commit on the local data source, swap `batch.commitCommand` for a `git`-spawning committer (kept isolated for exactly this).
