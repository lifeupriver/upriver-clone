# Tier-2 Integration Prompt

> Committed into the repo by the integration session itself so the record
> survives (prior copies in the working tree were deleted by earlier
> sessions' cleanup). This is the prompt that drove the Tier-2 integration.

## Reality update (verified by Cowork 2026-06-04)

The four build sessions did NOT produce four isolated branches. All build
work is STACKED on one lineage, tip = `origin/build/05-intake-migration-impl`:

- `e0e636d` (spec 03: profile commands + Supabase flip)
- `146053e` (spec 04: recon)
- `c7c3e56` (spec 07: transcript extractor)
- `edb9468` (spec 05: migration)  ← tip

The branches named `build/03-profile-commands`, `build/04-recon`,
`build/05-intake-migration`, `build/07-transcript-extractor` are stale
pointers with no unique work — ignore them. Cowork has already verified on
the stacked tip: root build clean, `@upriver/cli` 321/321 tests, all four
components present (`src/profile/` 13 files, `src/recon/`, `src/transcript/`,
9 subcommands under `commands/profile/`), and BOTH known seams unresolved
(`transcript/paths.ts` duplicates `profile/paths.ts`; `generate/report.ts:30`
still carries the stale `--replace` hint).

**First action, before anything else:** commit THIS file into the repo at
`.planning/intake-profile-engine/build-prompts/tier-2-integration-prompt.md`
so the record survives.

**Preconditions:** `git fetch --all`; `origin/build/05-intake-migration-impl`
tip is `edb9468`; main is at `6a1f5de` or later. Stop and report if not.

## Role

You are the integrator and verifier for four stacked builds. Your job: branch
from the stacked tip, reconcile the seams the specs deliberately deferred,
independently verify every Definition of Done, run one integrated acceptance
on the real client, and stop. You write no new features. If anything
substantive fails — a failing DoD item, an ownership violation in a commit, a
fifth seam — STOP and report rather than patching silently.

## Read first

- The four specs: `.planning/intake-profile-engine/specs/03-profile-commands-spec.md`,
  `04-recon-spec.md`, `05-intake-migration-spec.md`,
  `07-transcript-extractor-spec.md` — each Definition of Done is your
  verification checklist; each changelog has the session's claimed results,
  which you verify rather than trust.
- `specs/01-schemas-spec.md` and `specs/02-generate-spec.md` changelogs — the
  foundation's recorded deviations (HV is envelope-granular; manifest-gated
  re-runs; the session names its own file).
- `01-prd.md` §4, §7, §8.

## Phase 1 — Branch and baseline

Create `integration/tier-2` from `origin/build/05-intake-migration-impl`.
Rebase or merge main into it if main has moved past `6a1f5de` (planning-doc
commits only are expected; anything else, stop and report). Confirm baseline:
root `pnpm build` clean and ALL package test suites green (`pnpm -r test`,
dashboard included — Cowork verified cli only).

Run retroactive ownership checks per COMMIT (not per branch): for each of
`e0e636d`, `146053e`, `c7c3e56`, `edb9468`, `git show --name-only <sha>` must
be ⊆ that spec's owned file set + planning docs. Because the sessions shared
one working tree, cross-contamination is possible — a violation is
stop-and-report with the specific files, not a fix. Also note:
`specs/04-recon-evidence/` exists in-tree; the recon spec said evidence goes
under `clients/<slug>/recon/` — classify whether this is changelog evidence
(acceptable) or misplaced runtime evidence (report it).

## Phase 2 — Reconcile the known seams (the only edits you may make)

1. **paths.ts consolidation** (confirmed needed). Keep
   `packages/cli/src/profile/paths.ts`; point `packages/cli/src/transcript/`
   imports (`catalog.ts` imports `enumerateLeafPaths` from `./paths.js`, and
   any others) at the profile module; delete `transcript/paths.ts` and migrate
   any unique helpers/tests it has into the surviving module. Both test suites
   stay green.
2. **Stale readiness hint** (confirmed needed). `generate/report.ts:30` still
   says re-import with `--replace`; `profile verify` exists now. Update the
   hint to name `upriver profile verify <slug> <path>`.
3. **Data-source default coherence.** With the Supabase default flipped
   (commit `e0e636d`), confirm every data-source-resolving command (generate,
   all `profile *` subcommands, recon, extract-transcript, migrate-intake)
   fails identically with no `UPRIVER_SUPABASE_*` env: a clear message naming
   the vars and the `UPRIVER_DATA_SOURCE=local` escape hatch. Normalize any
   cryptic path to spec 03's message (seam work, not a feature).
4. **Write-path interplay.** Add one integration test if none exists: import
   (operator) → migrate-intake (operator) → extract-transcript (transcript) →
   recon merge (recon) produces monotonically increasing `_meta.revision`, a
   coherent `profile-conflicts.json`, and no component ever flips `verified`.

Also: grep reported `transcript/reconcile.ts` matches as a binary file —
inspect it for a stray non-UTF8 byte and fix the encoding if present (counts
as seam hygiene). Anything beyond these is out of scope; report a fifth seam,
do not fix it.

## Phase 3 — Independent DoD verification

For each of the four specs, re-run its Definition of Done checklist yourself —
do not accept the changelog's word. Mechanical checks (build, tests,
~300-line caps, grep checks: no `writeFileSync` targeting `clients/` outside
data sources, no path ever writing `verified: true` in recon or transcript)
run directly. Live-acceptance items the sessions already executed with
committed artifacts (recon evidence, provenance artifacts, transcripts in
changelogs): verify the artifacts exist and are coherent rather than
re-running paid LLM/API calls. Produce a per-spec PASS/FAIL table, one line
per DoD item.

## Phase 4 — Integrated end-to-end acceptance (the real client)

Against `clients/littlefriends/` with `UPRIVER_DATA_SOURCE=local` (Joshua runs
the supabase-backed pass himself later), full transcript captured:

1. `upriver profile show littlefriends` — baseline coverage snapshot.
2. `upriver profile verify` the HV fields blocking doc-02 (`--evidence
   "fixture hand-fill, integration pass"`) — or show current state if session
   A's acceptance already verified them, and note it.
3. `upriver generate littlefriends --doc doc-02 --dry-run` — must report
   READY. (Real generation is OPTIONAL; Joshua approves docs at gates, not
   you.)
4. `upriver profile migrate-intake littlefriends` — expect the idempotent
   no-op notice if already migrated; otherwise the real migration.
5. `upriver profile extract-transcript littlefriends <fixture transcript>
   --dry-run` — candidates, queued conflicts, unmapped list; nothing written.
6. `upriver recon littlefriends --dry-run` — adapter plan + unfilled recon
   targets; no live API calls.
7. `upriver profile show littlefriends` — final snapshot; diff vs step 1 must
   be explainable entirely by steps 2–4.
8. `upriver profile conflicts littlefriends` — list; resolve nothing.

## Phase 5 — Record and deliver

- Update each of the four specs' changelogs with an INTEGRATED entry: DoD
  table result + any seam work touching it.
- Write `.planning/intake-profile-engine/06-tier2-integration-report.md`: the
  stacked-lineage note and per-commit ownership results; the four DoD tables;
  the Phase 4 transcript (abridged); seams reconciled; follow-ups — explicitly
  including tier-3 inputs (M2 `--all` spec, spec 06 chatbot + dashboard
  coverage view) and first post-merge actions (real Little Friends transcript
  run, supabase-backed end-to-end, answering doc-01's markers, retiring the
  stale `build/03|04|05|07` branch pointers).
- Push `integration/tier-2`; open one PR to main titled "Tier-2 integration:
  profile commands, recon, intake migration, transcript extractor" with the
  report as description.
- Stop. Do not merge the PR — Joshua reviews in Cowork first.

## Definition of Done for THIS session

- [ ] This prompt file committed into `.planning/intake-profile-engine/build-prompts/`
- [ ] `integration/tier-2` branched from the stacked tip; build + ALL package
  tests green at baseline and at the end
- [ ] Per-commit ownership checks: 4/4 clean (or stop-and-reported, with files
  named)
- [ ] The four seams reconciled (plus the `reconcile.ts` encoding check),
  nothing else edited
- [ ] Four per-spec DoD tables, independently verified
- [ ] Phase 4 transcript captured, deltas explained
- [ ] Changelogs updated, integration report written, PR open, nothing merged
