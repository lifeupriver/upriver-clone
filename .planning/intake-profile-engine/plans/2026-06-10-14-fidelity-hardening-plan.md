# Build Spec 14: Fidelity Hardening — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the six pipeline fixes (P1–P6) from `.planning/intake-profile-engine/specs/14-fidelity-hardening-spec.md` so unverified recon fields are hedged in generated docs, every session knows the client's name, extraction recall covers the leak fields, slices consume recon-filled sections, the readiness gate projects provisioning, and the runner self-heals no-file failures.

**Architecture:** Surgical changes to the existing generate/transcript/schemas modules — no new subsystems except one small pure module (`identity-assert.ts`) and one pure projection function in `batch.ts`. Provenance flows as a single boolean per slice field; everything else is prompt text, coverage-map data, a flag, and one retry branch.

**Tech Stack:** TypeScript (ESM), `node:test` + `node:assert/strict`, pnpm workspaces, oclif (command layer only).

**Branch:** `build/14-fidelity-hardening` (already exists, spec committed). Work on this branch.

**Read first:** the spec (source of truth + file ownership), then `13-e2e-live-evaluation.md` (the why), then `12-e2e-live-report.md` findings D1/D3/G/§3 (the symptoms).

**Test commands** (each task says which to run):
- CLI package: `pnpm --filter @upriver/cli test` (tsc + node --test; ~390 tests)
- Schemas package: `pnpm --filter @upriver/schemas test`
- Root build: `pnpm build`

---

## File structure (what changes where)

| File | Change | Fix |
|---|---|---|
| `packages/cli/src/generate/profile-slice.ts` | `SliceField.confirmed` + `[UNCONFIRMED]` render tag | P1 |
| `packages/cli/src/generate/prompt-builder.ts` | `UNCONFIRMED_INSTRUCTION` in both output contracts | P1 |
| `packages/schemas/src/coverage-map.ts` | `identity.publicName` in all requiresFields; P4 field additions; SOURCE_EXPECTATIONS.transcript additions | P2, P3, P4 |
| `packages/cli/src/generate/identity-assert.ts` | NEW — pure assert module | P2 |
| `packages/cli/src/generate/engine.ts` | wire assert after `runDoc`, before persist; `GenerateDeps.foreignNames` | P2 |
| `packages/cli/src/commands/generate.ts` | denylist loader; provisioning projection in dry-run; `--strict-provisioning` flag | P2, P5 |
| `packages/cli/src/transcript/extract.ts` | ★ recall push + self-check in extraction prompt | P3 |
| `packages/cli/src/generate/batch.ts` | `projectProvisioningReadiness()` (pure) | P5 |
| `packages/cli/src/generate/report.ts` | `renderProvisioningProjection()` | P5 |
| `packages/cli/src/generate/runner.ts` | one fresh no-cache retry on the no-file class | P6 |
| `scripts/e2e-littlefriends.sh` | readiness phase adopts `--strict-provisioning`, combined gap-fill checkpoint | P5 |
| `.planning/intake-profile-engine/specs/14-fidelity-hardening-spec.md` | DoD checkboxes + changelog at the end | all |

Tests live beside each module (`*.test.ts`), plus `packages/cli/src/transcript/catalog.test.ts` and `extract.test.ts`.

---

### Task 1: P1a — provenance tag in the profile slice

**Files:**
- Modify: `packages/cli/src/generate/profile-slice.ts`
- Test: `packages/cli/src/generate/profile-slice.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `profile-slice.test.ts` (it already has `env()`, `profileWith()`, `NOW` helpers — reuse them):

```ts
function reconEnv<T>(value: T, over: Partial<ProfileField<T>> = {}): ProfileField<T> {
  return { value, source: 'recon' as Source, confidence: 'low', verified: false, updatedAt: NOW, ...over };
}

test('P1: an unverified non-high recon field is unconfirmed and renders the [UNCONFIRMED] tag', () => {
  const p = profileWith({ 'identity.category': reconEnv('Montessori preschool') });
  const field = profileSlice(p, 'doc-01').find((f) => f.path === 'identity.category');
  assert.equal(field?.confirmed, false);
  assert.match(
    renderSlice([field as SliceField]),
    /Montessori preschool \[UNCONFIRMED — found by automated recon, not confirmed by the client\]/,
  );
});

test('P1: verified recon, high-confidence recon, and non-recon sources are all confirmed (no tag)', () => {
  const cases: Array<[string, ProfileField<string>]> = [
    ['recon + verified', reconEnv('x', { verified: true })],
    ['recon + high confidence', reconEnv('x', { confidence: 'high' })],
    ['operator', env('x')],
  ];
  for (const [label, envelope] of cases) {
    const p = profileWith({ 'identity.category': envelope });
    const field = profileSlice(p, 'doc-01').find((f) => f.path === 'identity.category');
    assert.equal(field?.confirmed, true, label);
    assert.ok(!renderSlice([field as SliceField]).includes('[UNCONFIRMED'), label);
  }
});

test('P1: the tag sits between the value and the evidence line', () => {
  const text = renderSlice([{ path: 'a.b', value: 'v', evidence: 'url', confirmed: false }]);
  assert.match(text, /a\.b: v \[UNCONFIRMED[^\n]*\]\n {2}\(evidence: url\)/);
});
```

Import additions at the top of the test file: `SliceField` from `./profile-slice.js` (it already imports `profileSlice, renderSlice`).

Note: the existing test `renderSlice formats values with evidence…` constructs a `SliceField` literal — it will fail to compile until you add `confirmed: true` to that literal. Update it in this step.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @upriver/cli test`
Expected: tsc compile error (`confirmed` missing from `SliceField`) — that counts as the failing state for a type-level change. After adding the interface field only, the render test fails on the missing tag.

- [ ] **Step 3: Implement**

In `profile-slice.ts`:

```ts
export interface SliceField {
  path: string;
  value: unknown;
  evidence?: string;
  /**
   * False when the value is an unverified, non-high-confidence recon finding
   * (P1, Build Spec 14): the client never confirmed it, so generators must
   * hedge it rather than assert it. Everything else — operator, transcript,
   * interview, verified or high-confidence recon — is confirmed.
   */
  confirmed: boolean;
}

/** The render tag generators are taught to hedge (mirrored in prompt-builder's UNCONFIRMED_INSTRUCTION). */
export const UNCONFIRMED_TAG = '[UNCONFIRMED — found by automated recon, not confirmed by the client]';
```

In `profileSlice()`, replace the field construction:

```ts
    const confirmed = !(env.source === 'recon' && env.verified !== true && env.confidence !== 'high');
    const field: SliceField = { path, value: env.value, confirmed };
    if (env.evidence !== undefined) field.evidence = env.evidence;
    out.push(field);
```

In `renderSlice()`, replace the map body:

```ts
      const value = typeof f.value === 'string' ? f.value : JSON.stringify(f.value, null, 2);
      const tag = f.confirmed ? '' : ` ${UNCONFIRMED_TAG}`;
      const evidence = f.evidence ? `\n  (evidence: ${f.evidence})` : '';
      return `- ${f.path}: ${value}${tag}${evidence}`;
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @upriver/cli test`
Expected: PASS (including all pre-existing slice tests — `confirmed` is additive; the metadata-stripping test still holds because `source` stays stripped).

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/generate/profile-slice.ts packages/cli/src/generate/profile-slice.test.ts
git commit -m "P1a: profile slice carries confirmed flag; unverified recon values render [UNCONFIRMED]"
```

---

### Task 2: P1b — universal hedge instruction in the prompt builder

**Files:**
- Modify: `packages/cli/src/generate/prompt-builder.ts`
- Test: `packages/cli/src/generate/prompt-builder.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `prompt-builder.test.ts` (reuse its `specsDir()`, `profileWith()`, `env` helpers; note its `specsDir()` writes specs for doc-01, doc-04, i07 — use doc-01 and i07):

```ts
test('P1: every deliverable system prompt carries the [UNCONFIRMED] hedge rule (doc + provisioning branches)', () => {
  process.env['UPRIVER_SPECS_DIR'] = specsDir();
  const p = profileWith({ 'identity.publicName': env('LF') });
  for (const id of ['doc-01', 'i07'] as const) {
    const { system } = buildPrompt({ id, profile: p, outputPath: 'out.md', upstreamDocs: [] });
    assert.ok(system.includes('fields tagged [UNCONFIRMED]'), `${id} missing hedge rule`);
    assert.ok(system.includes('must NEVER be asserted as fact, identity, or positioning'), `${id} missing assertion ban`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @upriver/cli test`
Expected: FAIL — `doc-01 missing hedge rule`.

- [ ] **Step 3: Implement**

In `prompt-builder.ts`, below `MARKER_INSTRUCTION`:

```ts
/**
 * P1 (Build Spec 14): the recon trust boundary at generation time. The slice
 * tags unverified low/medium-confidence recon values with [UNCONFIRMED]
 * (profile-slice.ts UNCONFIRMED_TAG); this rule teaches every generator —
 * doc-01, the DAG root, most of all — to hedge them instead of adopting them
 * as identity (the Montessori metastasis, 13-e2e-live-evaluation.md).
 */
export const UNCONFIRMED_INSTRUCTION =
  'Profile fields tagged [UNCONFIRMED] are automated web-recon findings the client has not confirmed. ' +
  'They may inform your work but must NEVER be asserted as fact, identity, or positioning. Either hedge ' +
  'them explicitly ("appears to be", "according to its online listing") or restate them inside a ' +
  '[NEEDS CONFIRMATION: <specific question>] marker. Never build structure (keyword sets, competitive ' +
  'positioning, vocabulary rules) on an [UNCONFIRMED] field without flagging that dependency.';
```

Wire it into BOTH output-contract branches in `buildPrompt`:

```ts
  const outputContract = isProvisioning(input.id)
    ? provisioningOutputContract(input.outputPath, `${MARKER_INSTRUCTION}\n${UNCONFIRMED_INSTRUCTION}`)
    : [
        '## Output contract',
        // … existing lines unchanged …
        MARKER_INSTRUCTION,
        UNCONFIRMED_INSTRUCTION,
      ].join('\n');
```

(The provisioning branch threads the combined string through the existing `markerInstruction` parameter — `provisioning.ts` itself is untouched.)

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @upriver/cli test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/generate/prompt-builder.ts packages/cli/src/generate/prompt-builder.test.ts
git commit -m "P1b: universal [UNCONFIRMED] hedge rule in every generation system prompt"
```

---

### Task 3: P2a — `identity.publicName` in every deliverable's requiresFields

**Files:**
- Modify: `packages/schemas/src/coverage-map.ts`
- Test: `packages/schemas/src/coverage.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `coverage.test.ts`:

```ts
test('P2 (Build Spec 14): every deliverable requires identity.publicName — a doc that does not know the client name cannot be client-grade', () => {
  for (const d of COVERAGE_MAP) {
    assert.ok(
      d.requiresFields.includes('identity.publicName'),
      `${d.id} is missing identity.publicName in requiresFields`,
    );
  }
});
```

(`COVERAGE_MAP` is already imported in that file.)

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @upriver/schemas test`
Expected: FAIL naming the first deliverable missing it (most of the 29 entries — only doc-01, doc-14, doc-web-prd, i01 carry it today).

- [ ] **Step 3: Implement**

In `coverage-map.ts`, for EVERY `COVERAGE_MAP` entry whose `requiresFields` lacks `'identity.publicName'`, add it as the FIRST element of the array. Do not touch `requiresHvVerified` or `requiresDocs`. Example (doc-02):

```ts
    requiresFields: ['identity.publicName', 'identity.legalName', 'people.owners', /* …rest unchanged… */],
```

- [ ] **Step 4: Run BOTH package suites and fix fixture fallout**

Run: `pnpm --filter @upriver/schemas test && pnpm --filter @upriver/cli test`
Expected: schemas PASS (the path-resolution test at coverage.test.ts:71 passes — `identity.publicName` is a real schema path; the HV-subset test passes — we added no HV fields). CLI tests that build minimal profiles for readiness/batch/engine scenarios MAY now report a doc blocked on `identity.publicName`. For each such failure, add `'identity.publicName': env('LF')` (or the file's equivalent envelope helper) to the test's profile fixture — the fixture profile `packages/schemas/src/fixtures/littlefriends.profile.json` already has it filled, so engine tests seeded from it are unaffected.

- [ ] **Step 5: Commit**

```bash
git add packages/schemas/src/coverage-map.ts packages/schemas/src/coverage.test.ts packages/cli/src
git commit -m "P2a: identity.publicName required by every deliverable (i06 'JCC' / i03 / i08 placeholder class)"
```

---

### Task 4: P2b — the identity assert module

**Files:**
- Create: `packages/cli/src/generate/identity-assert.ts`
- Test: `packages/cli/src/generate/identity-assert.test.ts` (new)

- [ ] **Step 1: Write the failing tests**

Create `identity-assert.test.ts`:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { assertIdentity } from './identity-assert.js';

const ok = {
  content: '# Brand Voice\n\nLittle Friends Learning Loft is a preschool in Newburgh.',
  publicName: 'Little Friends Learning Loft',
  foreignNames: ["Audrey's Bakery"],
};

test('passes when the artifact names the client and no foreign business', () => {
  assert.doesNotThrow(() => assertIdentity(ok));
});

test('the presence check is case-insensitive', () => {
  assert.doesNotThrow(() =>
    assertIdentity({ ...ok, content: 'LITTLE FRIENDS LEARNING LOFT, a preschool.' }),
  );
});

test('throws when the artifact never names the client', () => {
  assert.throws(
    () => assertIdentity({ ...ok, content: '# Doc\n\nAn excellent preschool program.' }),
    /never names the client.*Little Friends Learning Loft/,
  );
});

test('throws when the artifact names another client (case-insensitive)', () => {
  assert.throws(
    () => assertIdentity({ ...ok, content: `${ok.content}\nUnlike AUDREY'S BAKERY down the road.` }),
    /another client.*Audrey's Bakery/,
  );
});

test('foreign names shorter than 4 chars are skipped (substring false-positive guard)', () => {
  assert.doesNotThrow(() => assertIdentity({ ...ok, foreignNames: ['JCC'] }));
});

test('a foreign name equal to the client name is not contamination', () => {
  assert.doesNotThrow(() => assertIdentity({ ...ok, foreignNames: ['little friends learning loft'] }));
});

test('an empty denylist degrades to the presence check alone', () => {
  assert.doesNotThrow(() => assertIdentity({ ...ok, foreignNames: [] }));
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @upriver/cli test`
Expected: tsc FAIL — module `./identity-assert.js` does not exist.

- [ ] **Step 3: Implement**

Create `identity-assert.ts`:

```ts
/**
 * P2 (Build Spec 14): the post-generation identity assert. An artifact that
 * never names the client (i06's "JCC" mislabel) or that names another client's
 * business (the attempted "Camera City" contamination, finding D3) is a
 * generation defect — throw so it fails like any other generation error and
 * the retry machinery gets a genuine second attempt, instead of persisting a
 * mislabeled client-facing doc.
 */
export interface IdentityAssertInput {
  content: string;
  /** This client's identity.publicName. */
  publicName: string;
  /** Other clients' publicNames (the cross-client contamination denylist). */
  foreignNames: string[];
}

/** Names shorter than this would substring-match ordinary prose; skip them. */
const MIN_NAME_LENGTH = 4;

export function assertIdentity(input: IdentityAssertInput): void {
  const content = input.content.toLowerCase();
  const name = input.publicName.trim();
  if (name.length >= MIN_NAME_LENGTH && !content.includes(name.toLowerCase())) {
    throw new Error(
      `identity assert: the artifact never names the client ("${input.publicName}"). ` +
        'A client deliverable that does not know who the client is cannot ship.',
    );
  }
  for (const foreign of input.foreignNames) {
    const f = foreign.trim();
    if (f.length < MIN_NAME_LENGTH) continue;
    if (f.toLowerCase() === name.toLowerCase()) continue;
    if (content.includes(f.toLowerCase())) {
      throw new Error(
        `identity assert: the artifact names another client's business ("${foreign}") — cross-client contamination.`,
      );
    }
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @upriver/cli test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/generate/identity-assert.ts packages/cli/src/generate/identity-assert.test.ts
git commit -m "P2b: identity-assert module — artifact must name this client and no other"
```

---

### Task 5: P2c — wire the assert into the engine + denylist into the command

**Files:**
- Modify: `packages/cli/src/generate/engine.ts` (imports, `GenerateDeps`, post-`runDoc` assert)
- Modify: `packages/cli/src/commands/generate.ts` (denylist loader, `makeDeps`)
- Test: `packages/cli/src/generate/engine.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `engine.test.ts`. Its `deps()` helper builds `GenerateDeps` — extend its `opts` parameter to accept `foreignNames?: string[]` and pass it through (`...(opts.foreignNames ? { foreignNames: opts.foreignNames } : {})`). Read the client name straight from the fixture so the test is value-agnostic:

```ts
const FIXTURE_NAME = (JSON.parse(readFileSync(FIXTURE, 'utf8')) as { identity: { publicName: { value: string } } })
  .identity.publicName.value;

test('P2: a fresh artifact that never names the client errors and is not persisted', async () => {
  const d = ds();
  await seedFixture(d);
  const { call } = writingCall('doc-01', '# Brand Voice\n\nAn anonymous business.');
  const { deps: dp, out } = deps(d, call);
  const outcome = await runGenerate(opts('doc-01'), dp);
  assert.equal(outcome.status, 'error');
  assert.match(out(), /never names the client/);
  assert.equal(await d.fileExists('littlefriends', `docs/${docFileName('doc-01', titleFor('doc-01'))}`), false);
});

test('P2: a fresh artifact naming a foreign client errors (contamination)', async () => {
  const d = ds();
  await seedFixture(d);
  const { call } = writingCall('doc-01', `# Brand Voice\n\n${FIXTURE_NAME}, in partnership with Camera City.`);
  const { deps: dp, out } = deps(d, call, { foreignNames: ['Camera City'] });
  const outcome = await runGenerate(opts('doc-01'), dp);
  assert.equal(outcome.status, 'error');
  assert.match(out(), /another client/);
});

test('P2: a correctly-named artifact passes the assert and persists', async () => {
  const d = ds();
  await seedFixture(d);
  const { call } = writingCall('doc-01', `# Brand Voice\n\n${FIXTURE_NAME} is wonderful.`);
  const { deps: dp } = deps(d, call, { foreignNames: ['Camera City'] });
  const outcome = await runGenerate(opts('doc-01'), dp);
  assert.equal(outcome.status, 'generated');
});
```

(Existing engine tests use `writingCall(id)` with default content `'# Doc\n\nbody'` — that content does NOT contain the fixture's publicName, so they will fail once the assert is wired. Update `writingCall`'s default content to `` `# Doc\n\n${FIXTURE_NAME} body` `` so the suite's happy paths stay happy. Tests that pass explicit content must include `FIXTURE_NAME` where they expect success.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @upriver/cli test`
Expected: the three new tests FAIL (assert not wired; outcome is `generated` where `error` expected).

- [ ] **Step 3: Implement — engine**

In `engine.ts`:

1. Imports: add `nearestEnvelope` to the `@upriver/schemas` import; add `import { assertIdentity } from './identity-assert.js';`
2. `GenerateDeps` gains:

```ts
  /**
   * Other clients' identity.publicName values (P2, Build Spec 14): a generated
   * artifact naming one of these is cross-client contamination and fails the
   * identity assert. Optional — callers without a client roster pass nothing
   * and only the own-name presence check runs.
   */
  foreignNames?: string[];
```

3. In `runGenerate`, inside the fresh-generation `else` branch — after `content = result.content;` / `fromCache = result.fromCache;` and BEFORE `await ds.writeClientFile(...)` (a contaminated artifact must not be persisted):

```ts
    // P2 (Build Spec 14): a fresh artifact must name THIS client and no other.
    // Reused content (the `unchanged` path) was already asserted when generated.
    const nameEnv = nearestEnvelope(profile as unknown as Record<string, unknown>, 'identity.publicName');
    if (typeof nameEnv?.value === 'string' && nameEnv.value.trim().length > 0) {
      try {
        assertIdentity({ content, publicName: nameEnv.value, foreignNames: deps.foreignNames ?? [] });
      } catch (err) {
        return fail(`${opts.id}: ${(err as Error).message}`);
      }
    }
```

- [ ] **Step 4: Implement — command-layer denylist**

In `packages/cli/src/commands/generate.ts`:

1. Import `nearestEnvelope` from `@upriver/schemas` (extend the existing type-only import to a value import: `import { nearestEnvelope, type DeliverableId } from '@upriver/schemas';`).
2. Add the loader method:

```ts
  /**
   * The identity-assert denylist (P2, Build Spec 14): every OTHER client's
   * publicName visible to this data source. Best-effort — an unlistable source
   * or unreadable profile contributes nothing rather than failing the run.
   */
  private async loadForeignNames(ds: ClientDataSource, slug: string): Promise<string[]> {
    let slugs: string[] = [];
    try {
      slugs = await ds.listClientSlugs();
    } catch {
      return [];
    }
    const out: string[] = [];
    for (const other of slugs) {
      if (other === slug) continue;
      try {
        const p = await readProfile(ds, other);
        const env = p ? nearestEnvelope(p as unknown as Record<string, unknown>, 'identity.publicName') : undefined;
        if (typeof env?.value === 'string' && env.value.trim()) out.push(env.value.trim());
      } catch {
        // skip unreadable client
      }
    }
    return out;
  }
```

3. `makeDeps` gains a third parameter and threads it:

```ts
  private makeDeps(ds: ClientDataSource, promptApprove: () => Promise<boolean>, foreignNames: string[] = []): GenerateDeps {
    return {
      ds,
      call: claudeCliCall,
      log: (msg) => this.log(msg),
      isTty: Boolean(process.stdin.isTTY),
      promptApprove,
      now: () => new Date().toISOString(),
      foreignNames,
    };
  }
```

4. Both call sites load the denylist first:
   - in `run()` (single `--doc` path): `const foreignNames = await this.loadForeignNames(ds, args.slug);` then `this.makeDeps(ds, () => this.askApprove(...), foreignNames)`.
   - in `runAll()`: `const foreignNames = await this.loadForeignNames(ds, slug);` then `const deps = this.makeDeps(ds, async () => false, foreignNames);`

- [ ] **Step 5: Run tests to verify they pass**

Run: `pnpm --filter @upriver/cli test`
Expected: PASS — new tests green, pre-existing engine/batch tests green after the `writingCall` default-content update.

- [ ] **Step 6: Commit**

```bash
git add packages/cli/src/generate/engine.ts packages/cli/src/generate/engine.test.ts packages/cli/src/commands/generate.ts
git commit -m "P2c: engine runs the identity assert before persist; command loads the cross-client denylist"
```

---

### Task 6: P3a — dual-source leak fields become transcript-expected

**Files:**
- Modify: `packages/schemas/src/coverage-map.ts` (SOURCE_EXPECTATIONS, ~line 280)
- Test: `packages/cli/src/transcript/catalog.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `catalog.test.ts`:

```ts
test('P3 (Build Spec 14): the dual-source leak fields are ★-flagged transcript priorities', () => {
  const cat = buildPathCatalog();
  for (const path of ['identity.category', 'identity.socialHandles', 'voice.bannedVocabulary']) {
    const line = cat.split('\n').find((l) => l.includes(`- ${path} [`));
    assert.ok(line, `${path} missing from the catalog`);
    assert.ok(line?.includes(PRIORITY_MARK), `${path} should be ★-flagged`);
  }
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @upriver/cli test`
Expected: FAIL — `identity.category should be ★-flagged`.

- [ ] **Step 3: Implement**

In `coverage-map.ts`, extend `SOURCE_EXPECTATIONS.transcript` (these three are stated by clients in interviews AND scrapeable by recon — the transcript value is what overrides a wrong recon value, §3 of the run report):

```ts
  transcript: ['voice.attributes', 'voice.bannedVocabulary', 'identity.category', 'identity.socialHandles', 'people.foundingStory', 'offerings.dontDo', 'pricing.nonShareable', 'capacity.metrics', 'salesProcess.close.definition', 'goals.redLines', 'positioning.keyDifferentiator'],
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @upriver/schemas test && pnpm --filter @upriver/cli test`
Expected: PASS (the catalog-size test `<8000` chars still holds — ★ flags add no length; the paths were already listed).

- [ ] **Step 5: Commit**

```bash
git add packages/schemas/src/coverage-map.ts packages/cli/src/transcript/catalog.test.ts
git commit -m "P3a: identity.category/socialHandles + voice.bannedVocabulary are transcript-expected (Disclosure E root cause)"
```

---

### Task 7: P3b — extraction recall push + self-check

**Files:**
- Modify: `packages/cli/src/transcript/extract.ts` (`extractionSystemPrompt`)
- Test: `packages/cli/src/transcript/extract.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `extract.test.ts` (it already imports from `./extract.js`; add `extractionSystemPrompt` to that import if absent):

```ts
test('P3 (Build Spec 14): the extraction prompt demands ★ recall and a closing self-check', () => {
  const sys = extractionSystemPrompt('  - identity.category [string] ★');
  assert.match(sys, /you MUST emit a candidate/);
  assert.match(sys, /re-scan the chunk/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @upriver/cli test`
Expected: FAIL — no `MUST emit a candidate` in the prompt.

- [ ] **Step 3: Implement**

In `extractionSystemPrompt`, replace the single line `` `- Prefer the ${'★'}-flagged high-value session fields.` `` with:

```ts
    `- ${'★'}-flagged fields are session-priority: when the transcript states one anywhere —`,
    '  even casually or in passing — you MUST emit a candidate for it. Missing a stated',
    `  ${'★'} field is the worst failure mode (a wrong automated value elsewhere then wins).`,
```

And add as the LAST rule (after the `If nothing maps` line):

```ts
    `- Before finishing, re-scan the chunk against the ${'★'}-flagged catalog paths and add`,
    '  any candidate you skipped.',
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @upriver/cli test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/transcript/extract.ts packages/cli/src/transcript/extract.test.ts
git commit -m "P3b: extraction prompt — mandatory candidates for stated ★ fields + closing self-check"
```

---

### Task 8: P4 — recon-filled fields reach their consuming docs

**Files:**
- Modify: `packages/schemas/src/coverage-map.ts` (requiresFields for doc-02, doc-04, doc-12, doc-16)
- Test: `packages/schemas/src/coverage.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `coverage.test.ts`:

```ts
test('P4 (Build Spec 14): recon-filled fields reach the docs whose markers falsely asked for them', () => {
  const expected: Record<string, string[]> = {
    'doc-02': ['identity.category', 'identity.primaryAddress', 'identity.hours', 'identity.socialHandles', 'content.reviewPlatforms'],
    'doc-04': ['content.testimonials', 'content.reviewPlatforms'],
    'doc-12': ['content.reviewPlatforms'],
    'doc-16': ['content.testimonials'],
  };
  for (const [id, paths] of Object.entries(expected)) {
    const d = COVERAGE_MAP.find((x) => x.id === id);
    assert.ok(d, id);
    for (const p of paths) assert.ok(d?.requiresFields.includes(p), `${id} should require ${p}`);
  }
});
```

Traceability (each addition ↔ a named eval false positive): doc-02 identity cluster ↔ its ~30% false-positive markers asking for facts the profile holds; doc-04 ↔ "no reviews available" while `content.testimonials` holds the Renata Kero quote; doc-12 ↔ "Google average rating [NEEDS CONFIRMATION]" while `content.reviewPlatforms` holds the 5.0; doc-16 ↔ the testimonial it used only by retry luck.

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @upriver/schemas test`
Expected: FAIL — `doc-02 should require identity.category`.

- [ ] **Step 3: Implement**

Add exactly those paths to the four entries' `requiresFields` in `coverage-map.ts` (keep each list's existing order, append the new paths after the related existing fields). Do NOT add to `requiresHvVerified` — none of these is HV.

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @upriver/schemas test && pnpm --filter @upriver/cli test`
Expected: PASS. (CLI fallout check: doc-02/doc-04/doc-12/doc-16 readiness fixtures in CLI tests may need the new fields filled — same `env()` pattern as Task 3 Step 4. The F2 prompt-size regression check for these slice additions happens in Task 12.)

- [ ] **Step 5: Commit**

```bash
git add packages/schemas/src/coverage-map.ts packages/schemas/src/coverage.test.ts packages/cli/src
git commit -m "P4: doc-02/04/12/16 slices consume the recon-filled identity + content fields"
```

---

### Task 9: P5a — pure provisioning readiness projection

**Files:**
- Modify: `packages/cli/src/generate/batch.ts`
- Test: `packages/cli/src/generate/batch.test.ts`

- [ ] **Step 1: Write the failing test**

Append to `batch.test.ts` (it has profile helpers; `createEmptyProfile` is available from `@upriver/schemas` — an empty profile leaves every i-series field missing, which is exactly Finding G's worst case):

```ts
test('P5 (Build Spec 14, Finding G): the provisioning projection surfaces i01–i09 field gaps, never missingDocs', () => {
  const p = createEmptyProfile('lf', '2026-06-10T00:00:00.000Z');
  const rows = projectProvisioningReadiness(p);
  assert.equal(rows.length, 9);
  const union = new Set(rows.flatMap((r) => [...r.missingFields, ...r.unverifiedHv]));
  // The six fields the live run gap-filled AFTER burning the docs phase:
  for (const path of [
    'toolsAndAccess.browserDeviceLandscape',
    'governance.dataResidency',
    'people.billingContact',
    'governance.memoryIncognitoPosture',
    'governance.reviewResponsePolicy',
    'people.technicalCollaborator',
  ]) {
    assert.ok(union.has(path), `${path} should surface in the projection`);
  }
  for (const r of rows) assert.ok(!('missingDocs' in r), 'missingDocs must not leak into the projection');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter @upriver/cli test`
Expected: tsc FAIL — `projectProvisioningReadiness` not exported.

- [ ] **Step 3: Implement**

In `batch.ts` (it already imports `deliverableReadiness` and the `titleOf` local helper; add `I_SERIES` to the `./provisioning.js` import if absent):

```ts
export interface ProvisioningProjection {
  id: DeliverableId;
  title: string;
  missingFields: string[];
  unverifiedHv: string[];
}

/**
 * Finding G (Build Spec 14, P5): project the I01–I09 provisioning artifacts'
 * FIELD readiness for the pre-docs checkpoint. `missingDocs` is deliberately
 * excluded — upstream docs are by definition ungenerated at the checkpoint, so
 * reporting them would make the projection all-red and useless. Pure — no I/O.
 */
export function projectProvisioningReadiness(profile: ClientProfile): ProvisioningProjection[] {
  return I_SERIES.map((id) => {
    const r = deliverableReadiness(profile, id);
    return { id, title: titleOf(id), missingFields: r.missingFields, unverifiedHv: r.unverifiedHv };
  });
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @upriver/cli test`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/generate/batch.ts packages/cli/src/generate/batch.test.ts
git commit -m "P5a: projectProvisioningReadiness — i01-i09 field/HV gaps, missingDocs excluded"
```

---

### Task 10: P5b — render the projection, `--strict-provisioning`, e2e adoption

**Files:**
- Modify: `packages/cli/src/generate/report.ts`
- Modify: `packages/cli/src/commands/generate.ts`
- Modify: `scripts/e2e-littlefriends.sh` (readiness phase, ~lines 121–163)
- Test: `packages/cli/src/generate/report.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `report.test.ts`:

```ts
test('P5: the provisioning projection renders per-artifact gaps and a copy-pasteable union list', () => {
  const rows = [
    { id: 'i03' as DeliverableId, title: 'Client Routines / Cowork', missingFields: ['toolsAndAccess.browserDeviceLandscape'], unverifiedHv: [] },
    { id: 'i07' as DeliverableId, title: 'Account Access & Governance', missingFields: [], unverifiedHv: ['governance.dataResidency'] },
  ];
  const text = renderProvisioningProjection(rows);
  assert.match(text, /i03 .*browserDeviceLandscape/);
  assert.match(text, /unverified HV: governance\.dataResidency/);
  assert.match(text, /gap-fill list \(2\): /);
});

test('P5: an all-ready projection says so', () => {
  const text = renderProvisioningProjection([
    { id: 'i07' as DeliverableId, title: 'Account Access & Governance', missingFields: [], unverifiedHv: [] },
  ]);
  assert.match(text, /all provisioning fields present and verified/);
});
```

(Import `renderProvisioningProjection` from `./report.js` and `DeliverableId` from `@upriver/schemas` as the file's existing imports do.)

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @upriver/cli test`
Expected: tsc FAIL — `renderProvisioningProjection` not exported.

- [ ] **Step 3: Implement — report renderer**

In `report.ts` (import `type ProvisioningProjection` from `./batch.js`):

```ts
/**
 * P5 (Build Spec 14, Finding G): the dry-run's provisioning-readiness table.
 * Field/HV gaps only — the union list at the bottom is the operator's
 * copy-pasteable gap-fill set before the docs phase.
 */
export function renderProvisioningProjection(rows: ProvisioningProjection[]): string {
  const lines = ['Provisioning readiness projection (i01–i09) — field/HV gaps only (upstream docs excluded):'];
  const union = new Set<string>();
  for (const r of rows) {
    for (const g of [...r.missingFields, ...r.unverifiedHv]) union.add(g);
    const gaps =
      r.missingFields.length === 0 && r.unverifiedHv.length === 0
        ? 'fields ready'
        : [
            r.missingFields.length > 0 ? `missing: ${r.missingFields.join(', ')}` : '',
            r.unverifiedHv.length > 0 ? `unverified HV: ${r.unverifiedHv.join(', ')}` : '',
          ]
            .filter(Boolean)
            .join('; ');
    lines.push(`  ${r.id.padEnd(4)} ${gaps}`);
  }
  lines.push(
    union.size === 0
      ? '  all provisioning fields present and verified.'
      : `  gap-fill list (${union.size}): ${[...union].join(', ')}`,
  );
  return lines.join('\n');
}
```

- [ ] **Step 4: Implement — command flag + dry-run wiring**

In `commands/generate.ts`:

1. Flag:

```ts
    'strict-provisioning': Flags.boolean({
      description:
        'With --all --dry-run: exit 3 when any provisioning artifact (i01–i09) is missing fields or HV verification — for unattended runs that must gap-fill before the docs phase (Finding G).',
      default: false,
      dependsOn: ['all'],
    }),
```

2. `AllFlags` gains `'strict-provisioning': boolean;`
3. Imports: add `projectProvisioningReadiness` to the `../generate/batch.js` import and `renderProvisioningProjection` to the `../generate/report.js` import.
4. In `runAll`'s dry-run branch, after `this.log(renderPromptSizeTable(sizes));` and BEFORE the `overCeiling` exit (both tables must always print):

```ts
      // P5 (Build Spec 14, Finding G): project provisioning FIELD readiness at
      // the checkpoint so the operator gap-fills i01–i09 blockers before the
      // ~2h docs phase, not after it.
      let provisioningGaps = false;
      if (!flags.web) {
        const projection = projectProvisioningReadiness(profile);
        provisioningGaps = projection.some((r) => r.missingFields.length > 0 || r.unverifiedHv.length > 0);
        this.log('');
        this.log(renderProvisioningProjection(projection));
      }
      if (sizes.some((s) => s.overCeiling)) this.exit(2);
      if (flags['strict-provisioning'] && provisioningGaps) this.exit(3);
      return;
```

(Exit-code contract: 2 = F2 prompt-size FAIL (existing), 3 = provisioning field gaps (new, only under the flag). F2 wins when both fire.)

- [ ] **Step 5: Implement — e2e script**

In `scripts/e2e-littlefriends.sh`, readiness phase: replace the `run $UPRIVER generate $SLUG --all --dry-run || { …exit 4 }` block with exit-code dispatch, and fold provisioning gaps into the EXISTING gap-fill checkpoint (one operator round-trip for both doc and provisioning fields):

```sh
  # F2 (Build Spec 11) + Finding G (Build Spec 14): one dry-run prints the
  # prompt-size table AND the provisioning-field projection. Exit 2 = prompt
  # overflow (F1 regression, fatal). Exit 3 = provisioning fields missing
  # (operator gap-fill, joins the doc-field checkpoint below).
  PROV_GAPS=0
  DRY_RC=0
  run $UPRIVER generate $SLUG --all --dry-run --strict-provisioning || DRY_RC=$?
  if [ "$DRY_RC" = "3" ]; then
    PROV_GAPS=1
  elif [ "$DRY_RC" != "0" ]; then
    log "CHECKPOINT: F2 prompt-size FAIL — a doc's projected prompt exceeds the ceiling (see table above)."
    log "This is an F1 regression, not an operator gap-fill. Fix the digest/ceiling before generating."
    exit 4
  fi
```

Then change the existing checkpoint condition from `if [ -n "$NOT_READY" ]; then` to:

```sh
  if [ -n "$NOT_READY" ] || [ "$PROV_GAPS" = "1" ]; then
    log "CHECKPOINT: gap-fill needed before generation (doc and/or provisioning fields — see tables above)."
    [ -n "$NOT_READY" ] && log "$NOT_READY"
    log "Gap-fill with: $UPRIVER profile set $SLUG <path> <value> --evidence 'operator gap-fill, synthetic e2e'"
    log "Then resume:   UPRIVER_GATE_AUTO=1 bash scripts/e2e-littlefriends.sh readiness"
    exit 3
  fi
  log "All docs READY (and provisioning fields present)."
```

- [ ] **Step 6: Run tests + a syntax check**

Run: `pnpm --filter @upriver/cli test && bash -n scripts/e2e-littlefriends.sh`
Expected: PASS; `bash -n` silent.

- [ ] **Step 7: Commit**

```bash
git add packages/cli/src/generate/report.ts packages/cli/src/generate/report.test.ts packages/cli/src/commands/generate.ts scripts/e2e-littlefriends.sh
git commit -m "P5b: dry-run renders the provisioning projection; --strict-provisioning exit 3; e2e readiness adopts it"
```

---

### Task 11: P6 — runner self-heals the no-file failure class

**Files:**
- Modify: `packages/cli/src/generate/runner.ts`
- Test: `packages/cli/src/generate/runner.test.ts`

- [ ] **Step 1: Write the failing tests**

Append to `runner.test.ts` (reuse its `base` and `ok()` helpers):

```ts
test('P6: a no-file no-claim first attempt self-heals with exactly one fresh no-cache retry', async () => {
  let calls = 0;
  const sawNoCache: boolean[] = [];
  const call: ClaudeCall = async (opts) => {
    calls++;
    sawNoCache.push(Boolean(opts.noCache));
    if (calls === 1) return ok({ text: 'did some thinking, wrote nothing' });
    writeFileSync(join(opts.cwd as string, base.outputFileName), '# Recovered\nbody');
    return ok();
  };
  const r = await runDoc(base, call);
  assert.match(r.content, /# Recovered/);
  assert.equal(calls, 2);
  assert.deepEqual(sawNoCache, [false, true]);
});

test('P6: a claimed-but-absent absolute path (D1, doc-12) retries once, then throws the precise F4 error', async () => {
  let calls = 0;
  const call: ClaudeCall = async () => {
    calls++;
    return ok({ text: `I wrote /nonexistent-upriver-p6/${base.outputFileName}` });
  };
  await assert.rejects(() => runDoc(base, call), /outside the staging dir/);
  assert.equal(calls, 2);
});

test('P6: a cache replay followed by a fruitless fresh call does NOT retry a third time', async () => {
  let calls = 0;
  const call: ClaudeCall = async () => {
    calls++;
    return calls === 1 ? ok({ fromCache: true, text: 'cached, no file' }) : ok({ text: 'fresh, still no file' });
  };
  await assert.rejects(() => runDoc(base, call), /did not write/);
  assert.equal(calls, 2);
});
```

Pre-existing-test fallout to expect: `runDoc throws when the session writes no file` still rejects with `/did not write/` (now after 2 calls instead of 1 — its assertion doesn't count calls, so it stays green). The F4 relocate test (claimed file EXISTS) stays a 1-call success. The F3 test stays a 2-call success.

- [ ] **Step 2: Run tests to verify they fail**

Run: `pnpm --filter @upriver/cli test`
Expected: the first new test FAILS (`did not write` thrown instead of recovery); the second FAILS (1 call, not 2).

- [ ] **Step 3: Implement**

In `runner.ts`, extract the F4 relocation into a helper (below `findClaimedAbsolutePath`):

```ts
/**
 * F4: when the reply names an absolute path that actually exists, pull the file
 * into staging (removing the stray) so the run proceeds. Null when no claimed
 * file exists — the P6 retry / precise-error path handles that.
 */
function relocateClaimedFile(text: string, outputFileName: string, staging: string): string | null {
  const claimed = findClaimedAbsolutePath(text, outputFileName);
  if (!claimed || !existsSync(claimed)) return null;
  const dest = join(staging, basename(claimed));
  copyFileSync(claimed, dest);
  rmSync(claimed, { force: true }); // don't leave a stray file in the operator's tree
  return dest;
}
```

Replace the body of `runDoc` between the first `call` and the `content` read with:

```ts
    let result = await call(callOpts);
    let produced = findGeneratedFile(staging);
    let retried = false;

    // F3 (Build Spec 11): a cache hit that left no file is always wrong — the
    // response cache stores TEXT, not the written file, so a replay can never
    // satisfy a file output. Force one fresh (cache-bypassing) session.
    if (!produced && result.fromCache) {
      result = await call({ ...callOpts, noCache: true });
      produced = findGeneratedFile(staging);
      retried = true;
    }

    // F4 (Build Spec 11): the model may have written to an absolute path
    // outside the staging cwd. Recover the file into staging when it exists.
    if (!produced) produced = relocateClaimedFile(result.text, input.outputFileName, staging);

    // P6 (Build Spec 14): the no-file class (claimed-but-absent absolute path,
    // or no file and no claim — findings D1/D3) is non-deterministic and
    // reliably recovers on a genuine retry. Self-heal with at most one fresh
    // session per runDoc before failing to the operator.
    if (!produced && !retried) {
      result = await call({ ...callOpts, noCache: true });
      produced = findGeneratedFile(staging) ?? relocateClaimedFile(result.text, input.outputFileName, staging);
    }

    if (!produced) {
      const claimed = findClaimedAbsolutePath(result.text, input.outputFileName);
      if (claimed) {
        throw new Error(
          `Session wrote outside the staging dir: it claims to have written ${claimed}, but no file is ` +
            'there. The output contract requires a RELATIVE path inside the working directory.',
        );
      }
      throw new Error(
        `Session finished but did not write a document. Model reply: ${result.text.slice(0, 200)}`,
      );
    }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `pnpm --filter @upriver/cli test`
Expected: PASS — three new tests green, all pre-existing runner tests green.

- [ ] **Step 5: Commit**

```bash
git add packages/cli/src/generate/runner.ts packages/cli/src/generate/runner.test.ts
git commit -m "P6: runner self-heals the no-file failure class with one fresh no-cache retry (D1/D3)"
```

---

### Task 12: Integration — full build, F2 regression, live P3 acceptance, spec close-out, PR

**Files:**
- Modify: `.planning/intake-profile-engine/specs/14-fidelity-hardening-spec.md` (DoD checkboxes + changelog)

- [ ] **Step 1: Full build + all suites**

Run: `pnpm build && pnpm --filter @upriver/schemas test && pnpm --filter @upriver/cli test && pnpm --filter @upriver/core test`
Expected: clean build, all suites green.

- [ ] **Step 2: Ownership check**

Run: `git diff --name-only main...HEAD`
Expected: ONLY files named in the spec's File ownership section (plus tests, the plan, and the spec itself). Anything else is a violation — investigate before proceeding.

- [ ] **Step 3: F2 prompt-size regression (P4's no-overflow proof + P5's table, live against the local client)**

Run: `UPRIVER_DATA_SOURCE=local node packages/cli/bin/run.js generate littlefriends --all --dry-run`
Expected: per-doc F2 table all OK (the P4 slice additions must not push any doc over the 50K est-tok ceiling), followed by the new provisioning projection table. Exit code 0 or 2 — if 2, a doc overflowed: STOP and reduce (this is the spec's P4 guard).
Also run: `UPRIVER_DATA_SOURCE=local node packages/cli/bin/run.js generate littlefriends --all --dry-run --strict-provisioning; echo "exit=$?"`
Expected: `exit=3` if the local littlefriends profile has provisioning gaps, `exit=0` if not — either is fine; record which.

- [ ] **Step 4: P3 live acceptance — one extraction run against the synthetic corpus**

This is the one step that calls `claude` (a few read-only chunk calls — cheap). Backup, run, inspect, restore:

```bash
cp clients/littlefriends/profile.json /tmp/lf-profile-backup.json
UPRIVER_DATA_SOURCE=local node packages/cli/bin/run.js profile extract-transcript littlefriends \
  .planning/intake-profile-engine/test-fixtures/little-friends-synthetic-onboarding-corpus.md
```

Inspect the run report output: candidates MUST appear for `identity.category`, `identity.socialHandles`, and `voice.bannedVocabulary` (the corpus states all three — play-based pedagogy, @littlefriendsloft, Rebecca's banned words). Record the applied/candidate counts. Then restore:

```bash
git checkout -- clients/littlefriends/ && git clean -fd clients/littlefriends/
git status --short clients/  # expect: empty
```

If any of the three fields produced no candidate, the recall push needs strengthening — iterate on the Task 7 prompt wording (NOT on the catalog) and re-run this step before proceeding.

- [ ] **Step 5: Close out the spec**

In `14-fidelity-hardening-spec.md`: tick every Definition of Done checkbox that is now true (each must actually be verified, not assumed), and append a changelog entry dated 2026-06-10 mapping fix→finding (P1→Montessori metastasis, P2→D3+placeholders, P3→Disclosure E, P4→marker false positives, P5→Finding G, P6→D1), recording the Step 3 exit codes, the Step 4 extraction counts, and any deviations.

- [ ] **Step 6: Commit, push, open the PR**

```bash
git add .planning/intake-profile-engine/specs/14-fidelity-hardening-spec.md
git commit -m "Build Spec 14: DoD verification + changelog (fix->finding map)"
git push -u origin build/14-fidelity-hardening
gh pr create --base main --title "Build Spec 14: fidelity hardening (provenance-aware generation, P1-P6)" \
  --body "$(cat <<'EOF'
Implements .planning/intake-profile-engine/specs/14-fidelity-hardening-spec.md — the six pipeline fixes from the v2 e2e evaluation (13-e2e-live-evaluation.md):

- P1: [UNCONFIRMED] provenance tags in profile slices + universal hedge instruction (the Montessori metastasis)
- P2: identity.publicName in every deliverable slice + post-generation identity assert (i06 "JCC", i03/i08 placeholders, Camera City contamination class)
- P3: extraction recall — leak fields are transcript-expected + mandatory ★ candidates (Disclosure E)
- P4: doc-02/04/12/16 slices consume recon-filled fields (marker false positives)
- P5: dry-run projects i01–i09 field readiness + --strict-provisioning (Finding G)
- P6: runner self-heals the no-file failure class with one fresh retry (D1/D3)

Content fixes to the 27 eval-branch artifacts are explicitly out of scope (operator decision): they stay as the run record; the next e2e run exercises these fixes.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

Stop after the PR; do not merge.
