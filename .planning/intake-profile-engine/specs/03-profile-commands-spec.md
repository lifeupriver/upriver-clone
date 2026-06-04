# Build Spec 03: `upriver profile` commands (show / set / verify / pull / push) + canonical-Supabase flip

Component: the operator seat for the Client Profile. Completes M4's CLI half (the dashboard coverage view is a later, separate piece) and ships the canonical-Supabase default confirmed in Build Spec 01 §2.
Built: tier-2 batch, parallel with specs 04 and 05, fresh Claude Code session.
Source of truth: `01-prd.md` §4.4, §7; `specs/01-schemas-spec.md` §2 (canonical store, confirmed); the Build Spec 03 follow-up notes in `specs/02-generate-spec.md`'s changelog. Where this spec is more specific, it wins.

## File ownership (parallel-build boundary)

This session OWNS: `packages/cli/src/commands/profile/*` (except `import.ts` — read it, extend it only if a shared helper move requires a one-line import path change), `packages/cli/src/profile/` (new module dir), `packages/cli/src/generate/data-source.ts` (the one-line default flip + doc comment). It must NOT touch: `packages/cli/src/recon/` or `commands/recon.ts` (spec 04's), `packages/cli/src/util/intake-reader.ts` or any of its consumers or the dashboard (spec 05's), `packages/schemas` (shared, read-only this tier), `generate/` modules other than `data-source.ts` (read-only; shared helpers live where they are — import from `../generate/profile-io.js` etc., do not move files).

## 1. Purpose and scope

`upriver profile <subcommand> <slug> ...`:

- **`show <slug>`** — the coverage report. Renders: per-deliverable readiness (`deliverableReadiness` over `COVERAGE_MAP`, with the manifest's approved set as `generated`), grouped ready / blocked-by-fields / blocked-by-HV / blocked-by-docs; the conflict queue from `profile-conflicts.json` (numbered); generated-but-unapproved docs that are blocking downstream (per spec 02's follow-up note); fill stats per section (filled/total leaf counts via `leafPaths`). Flags: `--json` (machine output for the future dashboard view), `--deliverable <id>` (single-row detail incl. exact missing paths).
- **`set <slug> <path> <value>`** — operator write. Parses `<value>` as JSON if it parses, else string. Builds a `Candidate` with `source: 'operator'`, runs `mergeCandidate` against the existing envelope at `<path>`, persists via `writeProfile` (revision bump). Operator precedence means this always applies (per merge rules); if the path is HV, the write does NOT set `verified` (set then verify are two acts). `--evidence <text>` populates the envelope's evidence. Path validation: must resolve against `clientProfileZ` (reuse the path-walk the schemas tests use — expose it from `packages/cli/src/profile/paths.ts` if schemas doesn't export one; do NOT modify schemas).
- **`verify <slug> <path...>`** — the only way past an HV gate. For each path: must be HV (`isHumanVerifyRequired`), must have a non-null value (verifying an empty field is an error), sets `verified: true`. `--all-filled` verifies every filled HV field after an interactive y/N per field showing value + evidence (non-TTY: refuses, lists what it would do). Prints which deliverables the verification unblocked.
- **`conflicts <slug>`** — list the queue; `--resolve <n> --keep existing|candidate` applies the choice (keeping candidate = an operator-sourced write of the candidate value) and removes the entry.
- **`pull <slug>` / `push <slug>`** — thin copy between the two `ClientDataSource`s for the offline-divergence case (spec 01 §2). `pull`: read remote (supabase) profile, `mergeProfiles` into local, report applied/conflicts. `push`: read local, `mergeProfiles` into remote. Conflicts queue as usual. Only `profile.json` + `profile-conflicts.json` + `docs/manifest.json` (manifest copied last-write-wins with a warning on divergence); generated docs are NOT synced by these commands (report a count diff and the hint to use storage tooling).
- **The flip:** `generate/data-source.ts` default becomes `'supabase'`; `'local'` via env. Update the doc comment, `.env.example` (add `UPRIVER_DATA_SOURCE`, `UPRIVER_SUPABASE_*` placeholders if not present), and the readiness-report hint line in `generate/report.ts`… no — that file is spec 02's; instead the hand-edit workaround hint is superseded naturally because `verify` now exists; leave report.ts alone and note the stale hint as a follow-up if observed.

Out of scope: `extract-transcript` (Build Spec 07), the dashboard coverage view, `import` changes beyond what compiles.

## 2. Layout

```
packages/cli/src/
├── commands/profile/
│   ├── show.ts  set.ts  verify.ts  conflicts.ts  pull.ts  push.ts   (thin oclif)
└── profile/
    ├── paths.ts          path validation against clientProfileZ shape
    ├── show-model.ts     pure: profile + manifest + conflicts → report model
    ├── render.ts         report model → text (and --json passthrough)
    ├── mutate.ts         pure: set/verify/resolve plans (mirror planImport style)
    └── sync.ts           pull/push logic over two resolved data sources
```

Tests beside each module; pure logic separated from oclif exactly as `generate/` did (engine/gate pattern). ~300-line cap.

## 3. Definition of Done

- [ ] Root `pnpm build` clean; `pnpm --filter @upriver/cli test` green (existing 156 + new)
- [ ] Unit tests: show-model grouping incl. unapproved-blocking detection; set merge semantics (operator wins, HV set ≠ verified); verify rules (non-HV path rejected, empty value rejected, unblock report correct); conflicts resolve both directions; sync merge-on-pull with conflict queue; paths validation (wildcards, unknown path rejected)
- [ ] Live acceptance against `clients/littlefriends/`: `profile verify` the 10 HV fields blocking doc-02 (values from the fixture; `--evidence "fixture hand-fill"`), then `generate littlefriends --doc doc-02` proceeds past the HV gate (generation itself may be reviewed at the gate or dry-run — the acceptance is the gate opening). `profile show` before/after committed as a transcript in the spec changelog
- [ ] Supabase default flip in; with no `UPRIVER_SUPABASE_*` env set, every command fails with a clear message naming the env vars and the `UPRIVER_DATA_SOURCE=local` escape hatch (test this path)
- [ ] No files outside the ownership boundary modified (CI-able check: `git diff --name-only` ⊆ owned set + planning docs)
- [ ] Spec changelog updated: deviations, the show transcript, follow-ups

## Changelog

- 2026-06-04: spec written (tier-2 batch with 04, 05).

- 2026-06-04: **BUILT.** `upriver profile show/set/verify/conflicts/pull/push` + the canonical-Supabase default flip shipped on `build/03-profile-commands`. Pure logic in `packages/cli/src/profile/` (`paths`, `show-model`, `render`, `mutate`, `sync`, `io`), thin oclif in `commands/profile/`, the flip + clear-error in `generate/data-source.ts`. 50 new unit tests, all TDD (red→green). Every file ≤ ~210 lines.

### Definition of Done — verification table

| DoD item | Result |
|---|---|
| Root `pnpm build` clean; `@upriver/cli test` green (existing + new) | **Scoped PASS / full deferred.** The shared working tree carried specs 04/05/07's *uncommitted* in-flight work (non-compiling intake migration + recon/transcript), so the literal whole-package `tsc` is red through no fault of this build. Built/tested via a scoped `tsconfig` excluding only those foreign files: **306/306 green** (entire CLI suite minus the 04/05/07 in-flight files, incl. all 50 new tests). My only shared-module change (the flip) is touched by no existing test. Full-suite green is the tier-2 integration session's DoD item (it runs `pnpm -r test` after each merge). |
| Unit: show-model grouping + unapproved-blocking | PASS (`show-model.test.ts`, 7) |
| Unit: set merge semantics (operator wins, HV set ≠ verified) | PASS (`mutate.test.ts`) |
| Unit: verify rules (non-HV rejected, empty rejected, unblock report) | PASS (`mutate.test.ts`) |
| Unit: conflicts resolve both directions | PASS (`mutate.test.ts`) |
| Unit: sync merge-on-pull with conflict queue | PASS (`sync.test.ts`, 5) |
| Unit: paths validation (wildcards, unknown rejected) | PASS (`paths.test.ts`, 9) |
| Live: verify 10 HV → `generate doc-02 --dry-run` READY; before/after `show` committed | PASS (transcript below; `clients/littlefriends/profile.json` rev 1→2) |
| Supabase flip; missing env → clear message naming vars + `UPRIVER_DATA_SOURCE=local` | PASS (`data-source-flip.test.ts`, 4) |
| No files outside ownership modified | PASS — commit ⊆ owned source + planning docs + spec-mandated outputs (see below) |
| Spec changelog: deviations, transcript, follow-ups | PASS (this entry) |

### Live acceptance transcript (`clients/littlefriends/`, `UPRIVER_DATA_SOURCE=local`)

`profile show littlefriends` **before** (revision 1): doc-02 sits in *blocked-by-unverified-HV* but **not** in *blocked-by-missing-fields* — the "0 missing, 10 unverified HV" asymmetry from spec 02's run.

```
Ready (2):  doc-01, doc-18
Blocked (25):
  blocked by missing fields (24): doc-03 … i09        (doc-02 NOT listed)
  blocked by unverified HV (22): doc-02, doc-03, …     (doc-02 listed)
```

`profile verify littlefriends 'offerings.core.*.priceRange' offerings.dontDo pricing.shareable pricing.deposit capacity.metrics governance.dataRetention modules.preschool.ocfs.licenseStatus modules.preschool.immunizationPolicy modules.preschool.enrollmentCapacity modules.preschool.trainingMatrix --evidence "fixture hand-fill"`:

```
  verified offerings.core.*.priceRange
  … (10 total)
10 field(s) verified. revision 2.
unblocked: doc-02
```

`generate littlefriends --doc doc-02 --dry-run` — **the gate opened**:

```
Deliverable doc-02 (Business Facts Reference)
  status: READY
```

`profile show littlefriends` **after** (revision 2): `Ready (3): doc-01, doc-02, doc-18`; doc-02 gone from the HV-blocked bucket (22→19). `show --deliverable doc-02` shows all 10 gates `HV: verified`, `[READY]`. Deltas vs. before are explained entirely by the verify (rev 1→2, 10 `verified` flips).

### Deviations & build decisions

1. **Shared-working-tree / parallel builds.** Specs 03/04/05/07 ran against the same physical checkout (case-insensitive path alias). At build time the tree held 04 (`src/recon/`, `commands/recon*`), 05 (`util/intake-reader.ts` + `clone.ts`/`fixes/plan.ts`/`improve/index.ts` mid-migration, dashboard), and 07 (`src/transcript/`) **uncommitted**, and the 05 files do not currently compile. This build touched none of them, committed only owned files, and verified via a scoped `tsconfig` (excluding exactly those foreign paths; the scratch config was deleted before commit). The tier-2 integration session reconciles and runs the full suite.
2. **Flip error message exceeds the "one-line" descriptor (DoD-required).** The DoD requires every command to fail with a clear message naming the env vars *and* the `UPRIVER_DATA_SOURCE=local` escape hatch. `createSupabaseClientDataSourceFromEnv` (in read-only `@upriver/core`) names the vars but not the hatch, so the message lives in `resolveClientDataSource` (the single resolution choke point), giving `generate`/`profile *`/`import` the message for free. A few lines, not one — owned file. A sibling `resolveClientDataSourceOrFail(fail)` (no oclif coupling — it takes a `(msg) => never` callback) is used by `show`/`set`/`verify`/`conflicts` so the missing-env case surfaces as a clean oclif `CLIError` via `this.error` (parity with `import`'s validation errors), not an uncaught throw — making spec 03 the clean reference the integrator's seam #3 copies. (`pull`/`push` keep their own try/catch since they build the supabase source directly.)
3. **Added `profile/io.ts` (a 6th module).** `generate/profile-io.ts` is read-only and its `appendConflicts` only appends; `conflicts --resolve` needs to *rewrite* the trimmed queue, so `writeConflicts` lives in a small owned `io.ts`. Pure-impure split: `paths`/`show-model`/`render`/`mutate` pure, `io`/`sync` do I/O.
4. **`verify` gained `--evidence`.** Required by the DoD/acceptance (`--evidence "fixture hand-fill"`). Recorded on each verified envelope; value/source untouched.
5. **`--all-filled` scope.** Scans the union of every deliverable's `requiresHvVerified` gates and the profile's HV-matched leaf envelopes, deduped by the envelope each resolves to. This catches both array-nested gates (`offerings.core.*.priceRange` → `offerings.core`) and section-glob leaves (`pricing.refundPolicy` via `pricing.**`). Fields nested below a non-HV array leaf with no gate path are out of scope — the same envelope-granularity limit the rest of the HV system has.
6. **Manifest sync = source-wins-on-copy.** "last-write-wins" read as: the side you pull/push *from* wins; divergence is flagged in the report. Generated `.md` docs are not synced (count diff + hint to `upriver sync`).
7. **Ownership / boundary check.** Scoped to source isolation against the parallel specs. Three sanctioned change categories: (a) owned source (`commands/profile/{show,set,verify,conflicts,pull,push}.ts`, `profile/*`, `generate/data-source.ts`); (b) planning docs (this changelog); (c) spec-mandated outputs — `.env.example` (§1: add `UPRIVER_DATA_SOURCE`) and `clients/littlefriends/profile.json` (the acceptance's verify writes rev 1→2 + 10 `verified`).

### Follow-ups

- **Stale hint in `generate/report.ts` (spec 02's, untouched per §1).** Its HV-block hint still names the "hand-edit + `--replace`" workaround; `profile verify` now supersedes it. Tier-2 integration seam #2 updates that line.
- **Data-source coherence (integration seam #3).** After merge, confirm `recon` / `extract-transcript` / `migrate-intake` resolve the data source through the same flipped path and surface the same missing-env message.
- **Dashboard coverage view** consumes `profile show --json` (the `ShowModel` shape) — later, separate piece.
