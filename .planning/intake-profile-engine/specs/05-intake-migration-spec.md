# Build Spec 05: `ClientIntake → Profile` migration

Component: M4's migration half — fold the legacy `clients/<slug>/intake.json` into the profile's `auditDecisions` section, swap the consumers, freeze the legacy artifact. Per the PRD's "Relationship to the existing intake/interview layer" section, executed exactly.
Built: tier-2 batch, parallel with specs 03 and 04, fresh Claude Code session.
Source of truth: `01-prd.md` "Relationship…" section; `packages/schemas/src/sections/auditDecisions.ts` (already mirrors `ClientIntake` shapes). Where this spec is more specific, it wins.

## File ownership (parallel-build boundary)

This session OWNS: `packages/cli/src/commands/profile/migrate-intake.ts`, `packages/cli/src/util/intake-reader.ts` (the compatibility-reader rewrite), the five CLI consumers' import lines (`commands/fixes/plan.ts`, `commands/clone.ts`, `commands/improve/index.ts` — touch ONLY the intake-read call sites), and the dashboard intake layer (`packages/dashboard/src/lib/intake-writer.ts`, `lib/fs-reader.ts` readIntake only, `pages/api/intake/[slug].ts`, `pages/api/intake/[slug]/lock-scope.ts`). It must NOT touch: `commands/profile/{show,set,verify,conflicts,pull,push}.ts` or `packages/cli/src/profile/` (spec 03's), `packages/cli/src/recon/` (spec 04's), `packages/schemas` (read-only), `generate/*` (read-only imports). NOTE: spec 03 also creates files under `commands/profile/` — disjoint filenames, no conflict; do not create an index or barrel there.

## 1. Mechanics (the PRD's four migration steps, made exact)

1. **Schemas already shipped `auditDecisions`** (step 1 done in Build 01). Verify the mirror: field-for-field against `@upriver/core`'s `ClientIntake` minus the version envelope; if drift is found, STOP and changelog — do not adapt silently (schemas is read-only this tier).
2. **`upriver profile migrate-intake <slug>`** — one-shot: read legacy `intake.json` (via the data source); wrap as a whole-section operator-sourced envelope (`profileFieldZ(auditDecisionsZ)` per spec 01 §6 — auditDecisions is envelope-wrapped as a unit, already-confirmed client intent); merge into the profile via `mergeCandidate` (conflict if the profile already has a differing auditDecisions — report, queue, do not overwrite); write `intake.json.migrated` marker file alongside the frozen original (the original is NOT deleted — deletion happens after one full client cycle, per the PRD); print before/after. `--all` iterates every slug with an `intake.json`. Idempotent: a second run on a migrated slug is a no-op with a notice.
3. **Compatibility reader.** Rewrite `packages/cli/src/util/intake-reader.ts`'s `readIntake(slug)` to: read the profile's `auditDecisions` value if present, else fall back to legacy `intake.json`, returning the same `ClientIntake` shape either way (synchronous signature today — it may need to become async; if so, the five call sites change `readIntake(slug)` → `await readIntake(slug)` and that is the entire permitted change at those sites). Consumers keep compiling with their existing types; zero behavioral change when only legacy exists.
4. **Dashboard repoint.** `intake-writer.ts`'s `writeIntake` → writes the profile's `auditDecisions` (same merge path; revision bump) AND mirrors to legacy `intake.json` during the freeze period (dual-write, so an un-migrated CLI consumer on an old checkout still functions); `fs-reader.ts`'s `readIntake` → same compat logic as the CLI's. The two API routes keep their request/response contracts byte-identical — this is a storage repoint, not an API change. The dashboard's intake form keeps working untouched (per the PRD: the static layer persists until M6 is proven).

Out of scope: deleting `intake.json`, renaming the `ClientIntake` type in `@upriver/core` (it retires later; removing it now would ripple), touching `interview-guide.md`/FormSpec anything, the chatbot.

## 2. Definition of Done

- [ ] Root `pnpm build` clean; cli AND dashboard test suites green
- [ ] Unit tests: migrate plan (fresh, conflicting, idempotent re-run); compat reader (profile-only, legacy-only, both-prefer-profile, neither); dual-write mirrors correctly; API route contract regression (existing route tests still pass byte-identical responses — add fixtures if none exist)
- [ ] Live acceptance: seed a legacy `intake.json` for littlefriends (hand-make a small one), run `migrate-intake littlefriends`, show `profile show`'s auditDecisions now filled (coordinate: if spec 03's show isn't merged yet, demonstrate via `readProfile` in a node one-liner instead — do NOT build a show command), confirm `readIntake('littlefriends')` returns the migrated data with legacy file frozen in place
- [ ] The five CLI consumers compile with at most the sync→async call-site change; their behavior with a legacy-only client is bit-identical (test with the audreys client dir if it has an intake.json, else a fixture)
- [ ] Ownership boundary respected (`git diff --name-only` ⊆ owned set + planning docs)
- [ ] Changelog: deviations (especially if readIntake went async), the acceptance transcript, follow-ups (legacy deletion criteria, ClientIntake type retirement)

## Changelog

- 2026-06-04: spec written (tier-2 batch with 03, 04).
