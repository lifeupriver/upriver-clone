# Build Spec 01: `packages/schemas` (@upriver/schemas)

Component: the Client Profile contract — zod schemas, inferred TS types, field envelope, merge helpers, HV predicate, modules, and the machine-readable coverage map.
Consumed by: every other component (`generate`, `profile` commands, `recon`, the dashboard chatbot, the ClientIntake migration).
Built: first, in a fresh Claude Code session, before any other component.
Source of truth: `01-prd.md` §2 (schema), §3 (coverage map), §7 (architecture). This spec makes them buildable; where this spec is more specific than the PRD, this spec wins.

---

## 1. Purpose and boundaries

**Purpose.** One package that defines what a Client Profile is, validates it at every boundary, decides how candidate values merge, gates human-verify-required fields, and encodes which fields each deliverable needs. Everything else imports this; nothing else defines profile shapes.

**In scope:** schemas, types, pure helper functions (merge, coverage math, HV predicate), the coverage map data, a Little Friends fixture, tests.

**Out of scope:** any I/O. No file reads, no Supabase, no `ClientDataSource` calls, no CLI, no LLM calls. Reading and writing `profile.json` is the callers' job (`profile` commands, dashboard API route) through `ClientDataSource`. This package stays pure so the dashboard can import it on Vercel without dragging in Node-only or heavy deps.

**Dependency budget:** `zod` only. Dev deps: `typescript`, `@types/node` (for `node --test`). Nothing else — no `@upriver/core` import in either direction yet (`core` may later re-export from `schemas`, never the reverse).

## 2. Canonical store resolution (the open item)

**Recommendation: Supabase via the existing `ClientDataSource` is the canonical store for `profile.json`. Local files are a dev/offline cache, never a second source of truth.**

How the seats share it:

- The dashboard (Vercel) already runs with `UPRIVER_DATA_SOURCE=supabase`; its chatbot/profile API routes write `clients/<slug>/profile.json` to the Supabase Storage bucket through `SupabaseClientDataSource` — the path that exists today for `intake.json` and `interview-responses.json`.
- The CLI gains the same switch: `profile`, `recon`, `generate` resolve a `ClientDataSource` exactly the way `packages/dashboard/src/lib/data-source.ts` does (env `UPRIVER_DATA_SOURCE`, default behavior defined below) instead of raw `readFileSync`/`writeFileSync` on `clients/<slug>/`. The resolver moves to (or is duplicated from) `@upriver/core/data` so both seats share one implementation. For operator machines, `UPRIVER_DATA_SOURCE=supabase` becomes the documented default in `.env`; `local` remains for offline work and tests.
- Write discipline instead of locking: profile writes are read-modify-write at field granularity using the §4 merge helper, and every write path merges candidates rather than replacing the document. The two seats write disjoint sources in practice (chatbot writes `interview`, CLI writes `operator`/`recon`/`transcript`), and merge precedence resolves any overlap deterministically. A `revision` counter in `_meta` (incremented on every persisted write) lets callers detect concurrent modification and re-merge; first version logs and re-merges, no distributed locks.
- Failure mode honesty: if the operator works offline in `local` mode while the chatbot writes to Supabase, divergence is possible. The `profile` command grows `profile pull <slug>` / `profile push <slug>` (thin copy through the two data sources, merge on pull) for exactly that case. This is deliberately a manual escape hatch, not a sync daemon.

**Alternative considered (rejected, but flagged per instructions): local-canonical plus a sync step.** CLI keeps writing local files; a `profile sync` command pushes/pulls Supabase before/after chatbot sessions. Rejected because it makes the freshest data location depend on what ran last, makes the dashboard coverage view stale by default, and builds the reconciliation problem in permanently. Canonical-Supabase reuses infrastructure that already exists (`SupabaseClientDataSource`, the bucket, the dashboard env) and makes M4's dashboard coverage view trivially correct.

**What this means for THIS package:** nothing I/O-related — the package stays pure. But it must export the pieces the canonical-store design needs: the merge helper (§4), the conflict-queue type (§4), and `_meta.revision` in the profile schema (§3). The data-source resolution change itself lands in the `profile` commands spec (Build Spec 03), recorded here so the contract supports it from day one.

> **Decision: canonical-Supabase CONFIRMED by Joshua, 2026-06-04.** Build Spec 03 (profile commands) proceeds on the shared `ClientDataSource` resolver as described above.

## 3. Package layout and build order

pnpm workspace member, mirroring `@upriver/core` conventions (ESM, `tsc`, subpath exports, zod v3 with `Z`-suffixed schemas and `.passthrough()` on object roots, inferred types via `z.infer`).

```
packages/schemas/
├── package.json            name @upriver/schemas; deps: zod only
├── tsconfig.json           extends ../../tsconfig.base.json
└── src/
    ├── envelope.ts         ProfileField<T>, profileFieldZ(inner), Source, Confidence
    ├── merge.ts            mergeCandidate(), ConflictEntry, conflict queue helpers
    ├── hv.ts               HV registry + isHumanVerifyRequired(path), assertGeneratable()
    ├── sections/
    │   ├── identity.ts     one file per §2.2 section, in this order:
    │   ├── people.ts       identity, people, offerings, pricing, capacity,
    │   ├── offerings.ts    customers, positioning, voice, salesProcess, content,
    │   ├── pricing.ts      competitors, seo, toolsAndAccess, operationsAutomation,
    │   ├── capacity.ts     governance, goals, auditDecisions
    │   ├── customers.ts
    │   ├── positioning.ts
    │   ├── voice.ts
    │   ├── salesProcess.ts
    │   ├── content.ts
    │   ├── competitors.ts
    │   ├── seo.ts
    │   ├── toolsAndAccess.ts
    │   ├── operationsAutomation.ts
    │   ├── governance.ts
    │   └── auditDecisions.ts   (+ goals.ts — 17 files total)
    ├── modules/
    │   ├── preschool.ts    concrete (Little Friends)
    │   ├── venue.ts        typed stub
    │   ├── contractor.ts   typed stub
    │   └── restaurant.ts   typed stub
    ├── client-profile.ts   composition: _meta + sections + modules
    ├── coverage-map.ts     field-level map, DAG, must-ask data
    ├── coverage.ts         pure functions over the map (readiness, question queue)
    ├── index.ts            public exports
    └── fixtures/
        └── littlefriends.profile.json   M1 hand-fill seed (partial; validates)
```

**Build phases (one file at a time, `pnpm --filter @upriver/schemas typecheck` after each):**

1. Scaffold: package.json, tsconfig, empty index — compile green before any schema.
2. `envelope.ts` → `merge.ts` → `hv.ts` (registry empty for now) + their tests.
3. `sections/*.ts` one per commit-sized step, in the listed order (identity first because everything references slug/name; pricing/capacity early because they exercise HV; auditDecisions last because it mirrors an existing type). HV registry entries added in the same step as their section.
4. `modules/*.ts` (preschool concrete, three stubs).
5. `client-profile.ts` composition + fixture + fixture test.
6. `coverage-map.ts` + `coverage.ts` + cross-check tests (§7).
7. Wire `index.ts` exports; root `pnpm build` and `pnpm test` clean.

No file may exceed roughly 300 lines; if a section wants more (salesProcess, content, toolsAndAccess are the fat ones), split sub-objects into sibling files (`salesProcess.leadSources.ts`) composed in the section file.

## 4. The field envelope and merge semantics

`envelope.ts`:

```ts
export const sourceZ = z.enum(['recon', 'interview', 'transcript', 'operator']);
export type Source = z.infer<typeof sourceZ>;
export const confidenceZ = z.enum(['high', 'medium', 'low']);

export function profileFieldZ<T extends z.ZodTypeAny>(inner: T) {
  return z.object({
    value: inner.nullable(),
    source: sourceZ.nullable(),
    confidence: confidenceZ.nullable(),
    verified: z.boolean().default(false),
    evidence: z.string().max(2000).optional(),   // quote or URL backing the value
    updatedAt: z.string(),                        // ISO
  });
}
export type ProfileField<T> = { value: T | null; source: Source | null; /* … */ };
```

Note: `humanVerifyRequired` is NOT stored per-instance. It is static schema metadata (§5) — storing it in the data invites drift between document and registry. The PRD §2.1 envelope listed it; this spec supersedes that detail: the runtime document carries `verified`, the registry carries `humanVerifyRequired`, and the predicate joins them.

`merge.ts` — pure, the single arbiter for every write path (CLI, chatbot endpoint, recon, transcript extractor):

```ts
const PRECEDENCE: Record<Source, number> = { operator: 3, transcript: 2, interview: 1, recon: 0 };

export interface Candidate<T> { value: T; source: Source; confidence?: Confidence; evidence?: string }
export type MergeOutcome<T> =
  | { kind: 'applied'; field: ProfileField<T> }
  | { kind: 'conflict'; existing: ProfileField<T>; candidate: Candidate<T> };

export function mergeCandidate<T>(existing: ProfileField<T> | undefined, candidate: Candidate<T>, now: string): MergeOutcome<T>;
```

Rules, exactly: empty/null existing → applied. Same source → applied (last-write-wins). Candidate precedence ≥ existing precedence → applied. Candidate precedence < existing → `conflict` (never silently overwritten). Equal values → applied as a freshness touch regardless of precedence. A `verified: true` field accepts no candidate from any source except `operator`; everything else conflicts. Conflicts append to `clients/<slug>/profile-conflicts.json` (type `ConflictEntry { path, existing, candidate, queuedAt }` exported here; persistence is the callers' job) and surface in `profile show`.

Default confidence per source when the adapter doesn't set one: operator high, transcript medium, interview medium, recon low.

## 5. HV as static metadata

`hv.ts` holds one registry: a readonly array of dot-paths (wildcards for array items: `pricing.shareable.*.price`) compiled to a matcher.

```ts
export const HV_FIELDS: readonly string[] = [ /* enumerated below */ ];
export function isHumanVerifyRequired(path: string): boolean;
export function unverifiedHvFields(profile: ClientProfile, paths?: string[]): string[];
export function assertGeneratable(profile: ClientProfile, requiredPaths: string[]): { ok: true } | { ok: false; blockedBy: string[] };
```

`generate` calls `assertGeneratable` with a deliverable's required paths from the coverage map; any unverified HV path blocks that deliverable by name. Enumerated from PRD §2.2 (the build session transcribes these exhaustively into the registry; the list below is the normative inventory):

- `pricing.**` — every leaf (shareable, non-shareable deflections, seasonal, discounts, deposit, schedule, methods, refund/cancel, reschedule, visibility policy)
- `capacity.**` — every leaf (metrics, lead times, blackout dates, yes-no-maybe lists)
- `governance.**` — every leaf
- `offerings.core.*.priceRange`, `offerings.dontDo`
- `people.routing.doNotRoute`, `people.billingContact`
- `salesProcess.close.definition`, `salesProcess.funnel.revenuePerCustomer`
- `content.photos.*.rights`, `content.videos.*.rights`
- `toolsAndAccess.**` access/credential-status leaves, `toolsAndAccess.apiSpend.caps`, `toolsAndAccess.plan.billingOwner`
- `operationsAutomation.escalationRouting`, `operationsAutomation.sensitiveTopics`, `operationsAutomation.spendCap`
- `goals.budgetConstraints`, `goals.redLines`
- module additions: `modules.preschool.ocfs.**`, `modules.preschool.trainingMatrix.**`, `modules.preschool.immunizationPolicy`, `modules.preschool.enrollmentCapacity.**`

Section files do not encode HV; only the registry does. A test (§7) cross-checks registry paths against the composed schema so a renamed field cannot orphan an HV rule.

## 6. Sections, modules, composition

**Sections.** Each `sections/<name>.ts` exports `<name>SectionZ` (a `z.object` whose leaves are `profileFieldZ(...)`-wrapped) and the inferred type. Field inventory per section = PRD §2.2, transcribed exhaustively; the build session works section by section against that text. Conventions: arrays of structured items wrap the array, not each item leaf (`profileFieldZ(z.array(offeringZ))`) — provenance tracks at the granularity intake actually fills; named sub-objects (`offeringZ`, `competitorZ`, `leadSourceZ`, `toolZ`) are exported for adapter use. All sections and all fields are `.optional()`/nullable — a profile is valid at any fill level; coverage, not validity, says what's missing. Roots use `.passthrough()` per house style.

`auditDecisions.ts` mirrors `ClientIntake` from `packages/core/src/types/intake.ts` exactly (findingDecisions record, pageWants record, referenceSites, scopeTier, submittedAt) minus the version envelope — shapes preserved so the M4 migration is a copy, not a transform. This is the one section whose leaves are NOT envelope-wrapped (it is already operator-confirmed client intent with its own timestamps); it is wrapped as a whole: `profileFieldZ(auditDecisionsZ)`.

**Modules** (`modules/`). `preschool.ts` concrete:

```ts
export const preschoolModuleZ = z.object({
  ocfs: z.object({ licenseStatus, licenseNumber, filings: z.array(filingZ), inspectionHistory }),        // HV
  trainingMatrix: z.array(z.object({ staffName, role, requiredTrainings: z.array(trainingZ) })),          // HV
  immunizationPolicy: ...,                                                                                 // HV
  enrollmentCapacity: z.array(z.object({ ageGroup, licensedCapacity, currentEnrollment, waitlist })),      // HV
  annualCalendar: z.array(calendarEntryZ),
  parentHandbook: z.object({ policies, hours, tuitionRef, communicationNorms, ... }),
  adminRunbook: z.object({ openingClosing, staffingRules, emergencyProcedures, ... }),
}).passthrough();
```

(leaves envelope-wrapped like core sections; exact sub-fields transcribed from the Little Friends proposal during the build, marked `[NEEDS CONFIRMATION]` in the fixture where the proposal is silent). `venue.ts` / `contractor.ts` / `restaurant.ts`: `z.object({}).passthrough()` stubs with a TODO header naming their PRD-anticipated slots — present so `modules` typing and the `vertical` enum alignment (`client-config.ts` already has `preschool`, `wedding-venue`, `restaurant`) are real from day one.

**Composition** (`client-profile.ts`):

```ts
export const clientProfileZ = z.object({
  _meta: z.object({ version: z.literal(1), slug, createdAt, updatedAt, revision: z.number().int() }),
  identity: identitySectionZ.optional(),
  /* … all 17 sections … */
  modules: z.object({ preschool: preschoolModuleZ.optional(), venue: ..., contractor: ..., restaurant: ... }).optional(),
}).passthrough();
export type ClientProfile = z.infer<typeof clientProfileZ>;
```

`_meta.revision` supports the §2 concurrent-write detection. Artifact path: `clients/<slug>/profile.json` (callers persist).

## 7. coverage-map.ts and coverage.ts

`coverage-map.ts` — data, no logic:

```ts
export type DeliverableId = 'doc-01' … 'doc-18' | 'i01' … 'i09';
export interface DeliverableCoverage {
  id: DeliverableId;
  title: string;
  requiresFields: string[];        // dot-paths into ClientProfile (field level, not section level)
  requiresHvVerified: string[];    // subset of requiresFields; must also be in HV_FIELDS
  requiresDocs: DeliverableId[];   // upstream DAG edges (PRD §3.1/§3.4 exactly)
  specPath: string;                // relative path into specs-reference/
}
export const COVERAGE_MAP: readonly DeliverableCoverage[];
export const MUST_ASK: readonly { path: string; askVia: 'session' | 'chatbot' | 'operator'; expectedSources: Source[] }[];
export const SOURCE_EXPECTATIONS: Readonly<Record<Source, readonly string[]>>;  // §2.4 recon targets etc.
```

The build session derives `requiresFields` per deliverable by expanding PRD §3.2/§3.4's section-level rows to field level against each spec in `specs-reference/` (e.g., doc-08 needs `people.team.*.name`, `salesProcess.conversionEvent.*`, `toolsAndAccess.scheduling.url`, not all of `people`). Where a spec genuinely needs a whole section, a section wildcard (`voice.*`) is allowed. DAG edges transcribed from §3.1 verbatim; i-series edges per §3.4 incl. i07-first.

`coverage.ts` — pure functions, the shared brain for `generate`, `profile show`, and the chatbot:

```ts
export function fieldFilled(profile, path): boolean;            // value !== null
export function deliverableReadiness(profile, id): { ready: boolean; missingFields: string[]; unverifiedHv: string[]; missingDocs: DeliverableId[] };
export function generationOrder(ids): DeliverableId[];          // topo sort over requiresDocs; throws on cycle
export function questionQueue(profile, scope: DeliverableId[]): { path: string; unblocksCount: number; askVia }[];  // must-ask ∩ scope-required − filled, sorted by unblocksCount desc
```

`missingDocs` is computed against a caller-supplied set of generated doc ids — this package does not look at the filesystem.

## 8. Definition of Done

Runnable checks, all green before the Continue gate:

- [ ] `pnpm build` clean at repo root (all packages, confirming no dependency breakage)
- [ ] `pnpm --filter @upriver/schemas test` passes, including:
  - [ ] **Map↔schema integrity:** every dot-path in `COVERAGE_MAP[*].requiresFields`, `requiresHvVerified`, `MUST_ASK`, `SOURCE_EXPECTATIONS`, and `HV_FIELDS` resolves against `clientProfileZ`'s shape (test walks the zod AST; wildcards resolve against array element / record value types)
  - [ ] **Must-ask completeness:** every `MUST_ASK` entry declares ≥1 `expectedSources` and an `askVia`
  - [ ] **HV consistency:** every path in any `requiresHvVerified` is matched by `HV_FIELDS`; every `HV_FIELDS` entry is required by ≥1 deliverable (no orphan gates)
  - [ ] **DAG validity:** `generationOrder(all)` succeeds (acyclic) and respects every §3.1 edge; doc-10 sorts after doc-01..09; i07 sorts before i01–i09; i03 after i02 and i04
  - [ ] **Merge semantics:** table-driven tests for every §4 rule incl. verified-field protection and conflict emission
  - [ ] **Envelope round-trip:** a wrapped field parses, defaults apply (`verified: false`)
- [ ] `fixtures/littlefriends.profile.json` parses against `clientProfileZ` with the preschool module present; `deliverableReadiness(fixture, 'doc-01')` and `'doc-02'` return coherent results (doc-02 blocked by unverified HV pricing — the expected initial state)
- [ ] `packages/cli` and `packages/dashboard` each compile with a `workspace:*` dep on `@upriver/schemas` added and a smoke import (`import { clientProfileZ } from '@upriver/schemas'`) — proving consumption both sides without behavior change
- [ ] No dependency other than zod in `package.json` dependencies
- [ ] No file > ~300 lines; no I/O anywhere in `src/`
- [ ] `.planning/intake-profile-engine/` updated: this spec marked built, deviations recorded

Failure handling: if any cross-check fails, fix the schema or the map — never weaken the test. If a PRD §2.2 field proves unrepresentable as specced, record the deviation in this file's changelog section and flag at the gate.

---

## Changelog

- 2026-06-04: spec written. Supersedes PRD §2.1 on one detail: `humanVerifyRequired` is registry metadata, not a stored per-instance envelope key. Canonical-store recommendation recorded in §2 pending Joshua's confirmation.
- 2026-06-04: **APPROVED by Joshua.** Canonical-Supabase confirmed. Build authorized; kickoff prompt at `.planning/intake-profile-engine/build-prompts/01-schemas-build-prompt.md`.
- 2026-06-04: **BUILT.** `packages/schemas` (@upriver/schemas) shipped against this spec. All §8 Definition-of-Done checks green: root `pnpm build` clean; `pnpm --filter @upriver/schemas test` = 39/39 (map↔schema integrity, must-ask completeness, HV consistency, DAG validity, merge semantics, envelope round-trip, fixture readiness); `cli` + `dashboard` consume it via `workspace:*` with a smoke import; deps = zod only; no I/O in `src/`; no file > ~300 lines (fat sections split into `*.parts.ts` siblings). Root `pnpm test` = 179/179 across packages.
- 2026-06-04: **Cowork review PASSED** (independent verification against merged main `8264219`/PR #24): structure, deps, no-I/O, all eight §8 cross-checks present with correct semantics, DAG edges per PRD §3.1, fixture doc-02-blocked state, smoke imports. No deviations beyond those listed above.

### Deviations & build decisions (per §8 failure-handling)

1. **HV path form for content rights.** §5 lists `content.photos.*.rights` / `content.videos.*.rights` (array wildcard), but §2.2 models photo/video inventory as a single object (one inventory, not an array of photos). The schema follows §2.2; the HV registry therefore uses `content.photos.rights` / `content.videos.rights` (object leaf, no `*`). No field lost.
2. **HV verification is envelope-granular.** `verified` lives on the envelope (§4), so an HV path nested inside a wrapped array — e.g. `offerings.core.*.priceRange` — gates on its enclosing envelope (`offerings.core`). `isHumanVerifyRequired`/`assertGeneratable`/`unverifiedHvFields` resolve any sub-array HV path to the nearest envelope. The registry keeps the `*` form (it still resolves against the schema AST and matches the coverage map).
3. **Module HV gates are required by doc-02.** The §7 "no orphan gates" check requires every `HV_FIELDS` entry to be required by ≥1 deliverable. The four preschool-module HV gates (`ocfs.**`, `trainingMatrix.**`, `immunizationPolicy`, `enrollmentCapacity.**`) are referenced by `doc-02` (Business Facts) in `requiresHvVerified`, since Business Facts for a licensed preschool legitimately needs OCFS/immunization/enrollment/training facts. This keys module gates to the Little Friends worked example, as the PRD intends.
4. **`ClientProfile` type is an explicit interface.** `z.infer` of the composed 17-section schema is too large for `.d.ts` emit (TS7056). The public `ClientProfile` is an explicit interface composed of the per-section inferred types; the runtime schema is the full `ZodObject`, exported as `clientProfileZ: z.ZodType<ClientProfile, z.ZodTypeDef, unknown>`. `parse`/`safeParse`/AST introspection are unaffected; consumers get the full structural type.
5. **`auditDecisions` inner fields.** Mirrors `ClientIntake` minus `version` *and* the standalone `updatedAt` (the `ProfileField` envelope supplies the timestamp) — exactly the five fields §6 enumerates (findingDecisions, pageWants, referenceSites, scopeTier, submittedAt), wrapped as a whole via `profileFieldZ(auditDecisionsZ)`.
6. **Process notes (no artifact impact).** The HV registry is authored as one block in `hv.ts` (matching §5's single normative inventory) rather than appended section-by-section. The fixture is imported via JSON import attributes and copied to `dist/` by the `test` script (tsc does not emit JSON); this keeps library code pure. A leaf helper `field(inner) = profileFieldZ(inner).optional()` makes every section leaf and nested container optional per §6 ("valid at any fill level").

### Follow-ups noticed for Build Spec 02 (generate)

- `assertGeneratable(profile, requiredPaths)` and `deliverableReadiness(profile, id, generated)` are the gate `generate` should call; `generate` supplies the set of already-generated deliverable ids (this package never reads the filesystem).
- `generationOrder(ids)` topo-sorts the eligible set and throws on a cycle; `generate` should pass only eligible (coverage-met) ids, or order-all then filter.
- `COVERAGE_MAP[*].specPath` points at `specs-reference/…`; `generate`'s per-doc system prompt loads that file. Paths are relative to `specs-reference/`.
- HV is envelope-granular (deviation #2): when `generate` reports which fields block a doc, it should surface the envelope path, not the `*` sub-path, to match what the operator verifies via `profile verify`.
- Module-field coverage is currently keyed to `preschool`/doc-02 (decision #3). When a second vertical module lands, revisit whether module HV gates should attach to a module-aware deliverable set rather than the generic doc rows.
