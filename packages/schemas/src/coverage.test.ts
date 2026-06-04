import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientProfileZ } from './client-profile.js';
import { HV_FIELDS, matchHvPath } from './hv.js';
import { COVERAGE_MAP, MUST_ASK, SOURCE_EXPECTATIONS, type DeliverableId } from './coverage-map.js';
import { deliverableReadiness, generationOrder, fieldFilled, questionQueue } from './coverage.js';
import fixture from './fixtures/littlefriends.profile.json' with { type: 'json' };

/* ── Minimal zod-AST walker (test-only). Resolves a dot-path against the
   composed schema, unwrapping optionals/defaults, descending into the envelope's
   `value` when a segment names an inner field, `*` into array/record elements,
   and treating trailing `**` as the remainder. ─────────────────────────────── */

/* eslint-disable @typescript-eslint/no-explicit-any */
function unwrap(schema: any): any {
  let s = schema;
  for (;;) {
    const t = s?._def?.typeName;
    if (t === 'ZodOptional' || t === 'ZodNullable' || t === 'ZodReadonly') s = s._def.innerType;
    else if (t === 'ZodDefault') s = s._def.innerType;
    else if (t === 'ZodEffects') s = s._def.schema;
    else if (t === 'ZodBranded') s = s._def.type;
    else return s;
  }
}

function objectShape(s: any): Record<string, any> | null {
  return s?._def?.typeName === 'ZodObject' ? s._def.shape() : null;
}

function isEnvelopeSchema(s: any): boolean {
  const shape = objectShape(s);
  return !!shape && 'value' in shape && 'source' in shape && 'verified' in shape && 'updatedAt' in shape;
}

function resolveSchemaPath(root: any, path: string): boolean {
  const segs = path.split('.');
  let cur = unwrap(root);
  for (let i = 0; i < segs.length; i++) {
    const seg = segs[i] as string;
    if (seg === '**') return true;
    const t = cur?._def?.typeName;
    if (seg === '*') {
      if (t === 'ZodArray') { cur = unwrap(cur._def.type); continue; }
      if (t === 'ZodRecord') { cur = unwrap(cur._def.valueType); continue; }
      if (isEnvelopeSchema(cur)) {
        const inner = unwrap(objectShape(cur)!.value);
        if (inner?._def?.typeName === 'ZodArray') { cur = unwrap(inner._def.type); continue; }
        if (inner?._def?.typeName === 'ZodRecord') { cur = unwrap(inner._def.valueType); continue; }
      }
      return false;
    }
    const shape = objectShape(cur);
    if (shape && seg in shape) { cur = unwrap(shape[seg]); continue; }
    if (isEnvelopeSchema(cur)) {
      const ishape = objectShape(unwrap(objectShape(cur)!.value));
      if (ishape && seg in ishape) { cur = unwrap(ishape[seg]); continue; }
    }
    if (t === 'ZodRecord') { cur = unwrap(cur._def.valueType); continue; }
    return false;
  }
  return true;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

const ALL_IDS: DeliverableId[] = COVERAGE_MAP.map((d) => d.id);

test('map↔schema integrity: every coverage/HV/source dot-path resolves against clientProfileZ', () => {
  const paths = new Set<string>();
  for (const d of COVERAGE_MAP) {
    d.requiresFields.forEach((p) => paths.add(p));
    d.requiresHvVerified.forEach((p) => paths.add(p));
  }
  MUST_ASK.forEach((m) => paths.add(m.path));
  Object.values(SOURCE_EXPECTATIONS).forEach((arr) => arr.forEach((p) => paths.add(p)));
  HV_FIELDS.forEach((p) => paths.add(p));
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const unresolved = [...paths].filter((p) => !resolveSchemaPath(clientProfileZ as any, p));
  assert.deepEqual(unresolved, [], `unresolved paths: ${unresolved.join(', ')}`);
});

test('must-ask completeness: every MUST_ASK entry declares an askVia and ≥1 expectedSources', () => {
  for (const m of MUST_ASK) {
    assert.ok(m.askVia, `askVia missing for ${m.path}`);
    assert.ok(m.expectedSources.length >= 1, `expectedSources empty for ${m.path}`);
  }
});

test('HV consistency: every requiresHvVerified path is matched by HV_FIELDS', () => {
  const bad: string[] = [];
  for (const d of COVERAGE_MAP) {
    for (const p of d.requiresHvVerified) {
      if (!HV_FIELDS.some((g) => matchHvPath(g, p))) bad.push(`${d.id}:${p}`);
    }
  }
  assert.deepEqual(bad, []);
});

test('HV consistency: requiresHvVerified ⊆ requiresFields for every deliverable', () => {
  for (const d of COVERAGE_MAP) {
    for (const p of d.requiresHvVerified) {
      assert.ok(d.requiresFields.includes(p), `${d.id}: ${p} not in requiresFields`);
    }
  }
});

test('HV consistency: every HV_FIELDS entry is required by ≥1 deliverable (no orphan gates)', () => {
  const allHv = COVERAGE_MAP.flatMap((d) => d.requiresHvVerified);
  const orphans = HV_FIELDS.filter((g) => !allHv.some((p) => matchHvPath(g, p)));
  assert.deepEqual(orphans, [], `orphan HV gates: ${orphans.join(', ')}`);
});

test('DAG validity: generationOrder(all) is acyclic and respects every edge', () => {
  const order = generationOrder(ALL_IDS);
  assert.equal(order.length, ALL_IDS.length);
  const pos = new Map(order.map((id, i) => [id, i] as const));
  for (const d of COVERAGE_MAP) {
    for (const dep of d.requiresDocs) {
      assert.ok(pos.get(dep)! < pos.get(d.id)!, `${dep} must precede ${d.id}`);
    }
  }
});

test('DAG validity: doc-10 after doc-01..09; i07 before i01..i09; i03 after i02 and i04', () => {
  const order = generationOrder(ALL_IDS);
  const at = (id: string) => order.indexOf(id as DeliverableId);
  for (let n = 1; n <= 9; n++) {
    const id = `doc-0${n}`;
    assert.ok(at(id) < at('doc-10'), `${id} before doc-10`);
  }
  for (const i of ['i01', 'i02', 'i03', 'i04', 'i05', 'i06', 'i08', 'i09']) {
    assert.ok(at('i07') < at(i), `i07 before ${i}`);
  }
  assert.ok(at('i02') < at('i03'), 'i02 before i03');
  assert.ok(at('i04') < at('i03'), 'i04 before i03');
});

test('DAG validity: generationOrder over the real (acyclic) map does not throw', () => {
  assert.doesNotThrow(() => generationOrder(ALL_IDS));
});

test('fixture readiness: doc-01 ready, doc-02 blocked by unverified HV pricing', () => {
  const profile = clientProfileZ.parse(fixture);
  const r1 = deliverableReadiness(profile, 'doc-01');
  assert.equal(r1.ready, true, `doc-01 not ready: ${JSON.stringify(r1)}`);
  const r2 = deliverableReadiness(profile, 'doc-02');
  assert.equal(r2.ready, false, 'doc-02 should be blocked');
  assert.equal(r2.missingFields.length, 0, `doc-02 fields all present: ${r2.missingFields.join(',')}`);
  assert.ok(
    r2.unverifiedHv.some((p) => p.startsWith('pricing.')),
    `expected an unverified pricing HV gate, got: ${r2.unverifiedHv.join(', ')}`,
  );
});

test('fieldFilled distinguishes filled, empty, and absent', () => {
  const profile = clientProfileZ.parse(fixture);
  assert.equal(fieldFilled(profile, 'identity.publicName'), true);
  assert.equal(fieldFilled(profile, 'seo.baseline'), false); // absent in the fixture
  assert.equal(fieldFilled(profile, 'offerings.core.*.priceRange'), true); // array non-empty
});

test('questionQueue returns unfilled in-scope must-ask fields, ranked by unblocks desc', () => {
  const profile = clientProfileZ.parse(fixture);
  const q = questionQueue(profile, ['doc-02', 'doc-03', 'doc-07', 'doc-11', 'i04']);
  assert.ok(q.length > 0, 'expected a non-empty queue');
  for (let i = 1; i < q.length; i++) {
    assert.ok(q[i - 1]!.unblocksCount >= q[i]!.unblocksCount, 'queue sorted by unblocksCount desc');
  }
});
