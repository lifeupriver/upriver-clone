# Build prompt 01: packages/schemas (@upriver/schemas)

Paste this into a fresh Claude Code session at the root of the `upriver-clone` repo. It is self-contained; the files it names hold the detail.

---

You are building one component: the `@upriver/schemas` package, the Client Profile contract for the Intake & Profile Engine. This is the first component of the build; everything else will import it. You build only this package, then stop.

## Read first, in this order

1. `.planning/intake-profile-engine/specs/01-schemas-spec.md` — your spec. It is the source of truth for this build. Where it is more specific than anything else, it wins.
2. `.planning/intake-profile-engine/01-prd.md` — §2 (schema sections, field inventory), §3 (coverage map, DAG, must-ask) are your content inputs. §2.2 is the normative field list you transcribe into section files.
3. `packages/core/src/types/client-config-zod.ts` and `packages/core/src/types/extraction-zod.ts` — the house zod conventions you must match (Z-suffixed schemas, `.passthrough()` on object roots, `z.infer` types, zod v3).
4. `packages/core/src/types/intake.ts` — the existing `ClientIntake` type your `auditDecisions` section mirrors exactly (shapes preserved, minus the version envelope).
5. `packages/core/package.json` and `packages/core/tsconfig.json` — the package conventions to copy (ESM, subpath exports, tsc build, `node --test`).

When deriving field-level coverage entries, the deliverable specs live in `.planning/intake-profile-engine/specs-reference/` (18 doc specs under `ai-operating-system/`, I-series under `infrastructure/`). Use them to expand the PRD's section-level coverage rows to field level; do not re-derive the schema from them — the PRD §2.2 already did that.

## What you are building

A pure pnpm workspace package at `packages/schemas`:

- zod schemas + inferred TS types for the Client Profile: a `ProfileField<T>` envelope wrapping every leaf, 17 section files under `src/sections/`, modules (`preschool` concrete, `venue`/`contractor`/`restaurant` typed stubs), composed in `src/client-profile.ts` with `_meta { version: 1, slug, createdAt, updatedAt, revision }`.
- `src/merge.ts`: `mergeCandidate()` — precedence operator > transcript > interview > recon, same-source last-write-wins, lower-precedence candidates against existing values return a `conflict` outcome (never overwrite), `verified: true` fields accept only operator candidates. Plus `ConflictEntry` type.
- `src/hv.ts`: static `HV_FIELDS` dot-path registry (spec §5 has the normative inventory), `isHumanVerifyRequired(path)`, `unverifiedHvFields()`, `assertGeneratable()`. HV is registry metadata, NOT stored in the envelope.
- `src/coverage-map.ts`: `COVERAGE_MAP` (field-level `requiresFields`/`requiresHvVerified`/`requiresDocs` per deliverable doc-01…doc-18, i01…i09), `MUST_ASK`, `SOURCE_EXPECTATIONS`. DAG edges exactly per PRD §3.1 (and i-series ordering per §3.4: i07 first, i03 after i02 and i04).
- `src/coverage.ts`: pure functions `fieldFilled`, `deliverableReadiness`, `generationOrder` (topo sort, throws on cycle), `questionQueue`.
- `src/fixtures/littlefriends.profile.json`: a partial hand-fill seed that validates, preschool module present, with `[NEEDS CONFIRMATION]` markers in evidence strings where source material is silent.
- Tests for all of the above, including the cross-check suite in the spec's Definition of Done.

Hard constraints: dependencies = zod only. No I/O anywhere in `src/` — no fs, no Supabase, no env reads. No file over ~300 lines (split fat sections into sibling sub-object files). Do not modify any other package except the two smoke-import steps at the end.

## How you work

Phased, one file at a time, compile-verified each step. The spec §3 lists the exact phase order:

1. Scaffold (package.json, tsconfig, empty index) → `pnpm --filter @upriver/schemas typecheck` green before any schema exists.
2. `envelope.ts` → `merge.ts` → `hv.ts` (empty registry), each with its test, typecheck after each file.
3. Section files one at a time in the spec's listed order, transcribing PRD §2.2 exhaustively; add each section's HV registry entries in the same step.
4. Modules (preschool concrete from the PRD's module definition; three stubs).
5. `client-profile.ts` composition + fixture + fixture test.
6. `coverage-map.ts` + `coverage.ts` + the full cross-check test suite.
7. `index.ts` exports; add `"@upriver/schemas": "workspace:*"` to `packages/cli` and `packages/dashboard` with one smoke import each; root `pnpm build` and `pnpm test` clean.

After each phase, state what you built and show the typecheck/test result before moving on. If a PRD §2.2 field is unrepresentable as specced, record the deviation in the spec's changelog section and continue; do not silently reshape.

## Definition of Done

The runnable checklist in spec §8, verbatim. All boxes green, then stop and report:

- what was built (file list),
- test summary,
- any deviations recorded in the changelog,
- the exact follow-up items for Build Spec 02 (generate) you noticed while building.

Do not start any other component. Do not touch `clients/`, the dashboard pages, or CLI commands beyond the smoke imports.

## Context you should know but not act on

- Canonical store decision (confirmed): Supabase via the existing `ClientDataSource` is canonical for `profile.json`; this package stays pure and just exports the merge helper, conflict types, and `_meta.revision` that design needs. The data-source wiring lands in a later component.
- The existing `ClientIntake`/`interview-guide.md` layer keeps working untouched during this build; migration is a later component (M4).
- Brand voice rules apply to client-facing output only; this package has none. Code comments follow the existing repo style.
