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
