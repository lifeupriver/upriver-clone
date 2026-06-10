import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyProfile,
  nearestEnvelope,
  type ClientProfile,
  type ConflictEntry,
  type ProfileField,
  type Source,
} from '@upriver/schemas';
import {
  parseValueArg,
  planSet,
  planVerify,
  planResolve,
  pendingHvVerifications,
} from './mutate.js';

const NOW = '2026-06-04T12:00:00.000Z';
const LATER = '2026-06-05T08:00:00.000Z';

function env<T>(value: T | null, source: Source = 'operator', verified = false, evidence?: string): ProfileField<T> {
  const e: ProfileField<T> = { value, source, confidence: null, verified, updatedAt: NOW };
  if (evidence !== undefined) e.evidence = evidence;
  return e;
}
/* eslint-disable @typescript-eslint/no-explicit-any */
function profileWith(fields: Record<string, unknown>): ClientProfile {
  const p = createEmptyProfile('littlefriends', NOW) as any;
  p._meta.revision = 1;
  for (const [path, v] of Object.entries(fields)) {
    const segs = path.split('.');
    let cur: any = p;
    for (let i = 0; i < segs.length - 1; i++) {
      const k = segs[i] as string;
      cur[k] ??= {};
      cur = cur[k];
    }
    cur[segs[segs.length - 1] as string] = v;
  }
  return p as ClientProfile;
}
const envAt = (p: ClientProfile, path: string): ProfileField<unknown> | undefined =>
  nearestEnvelope(p as unknown as Record<string, unknown>, path);
/* eslint-enable @typescript-eslint/no-explicit-any */

/** doc-02's 15 required fields, all filled (offerings.core covers the .*.priceRange gate). */
const DOC02_FILLED: Record<string, unknown> = {
  'identity.publicName': env('LF'),
  'identity.legalName': env('LF LLC'),
  'people.owners': env([{ name: 'Owner' }]),
  'offerings.core': env([{ name: 'Full-day program' }]),
  'offerings.dontDo': env(['Drop-in care']),
  'pricing.shareable': env([{ item: 'Registration', price: '$75' }]),
  'pricing.deposit': env("One month's tuition"),
  'capacity.metrics': env([{ label: 'Licensed', value: 16 }]),
  'positioning.keyDifferentiator': env('Low ratios'),
  'governance.dataRetention': env('Per OCFS policy'),
  'modules.preschool.ocfs.licenseStatus': env('Licensed — active'),
  'modules.preschool.immunizationPolicy': env('Follows NYS requirements'),
  'modules.preschool.enrollmentCapacity': env([{ ageGroup: '2s', licensedCapacity: 6 }]),
  'modules.preschool.trainingMatrix': env([{ staffName: 'Lead', role: 'Teacher' }]),
};
const DOC02_HV = [
  'offerings.core.*.priceRange',
  'offerings.dontDo',
  'pricing.shareable',
  'pricing.deposit',
  'capacity.metrics',
  'governance.dataRetention',
  'modules.preschool.ocfs.licenseStatus',
  'modules.preschool.immunizationPolicy',
  'modules.preschool.enrollmentCapacity',
  'modules.preschool.trainingMatrix',
];

/* ── parseValueArg ─────────────────────────────────────────────────────── */
test('parseValueArg: parses JSON when it parses, else treats as a string', () => {
  assert.equal(parseValueArg('42'), 42);
  assert.equal(parseValueArg('true'), true);
  assert.deepEqual(parseValueArg('["a","b"]'), ['a', 'b']);
  assert.deepEqual(parseValueArg('{"k":1}'), { k: 1 });
  assert.equal(parseValueArg('hello world'), 'hello world');
  assert.equal(parseValueArg('"quoted"'), 'quoted');
});

/* ── planSet ───────────────────────────────────────────────────────────── */
test('planSet: an operator value applies (operator precedence always wins)', () => {
  const p = profileWith({ 'pricing.deposit': env('old', 'recon') });
  const plan = planSet(p, 'pricing.deposit', 'new amount', undefined, LATER);
  assert.equal(envAt(plan.profile, 'pricing.deposit')!.value, 'new amount');
  assert.equal(envAt(plan.profile, 'pricing.deposit')!.source, 'operator');
  assert.equal(plan.profile._meta.revision, 2); // bumped from 1
});

test('planSet: setting an HV field does NOT set verified (set and verify are two acts)', () => {
  const p = profileWith({});
  const plan = planSet(p, 'pricing.deposit', 'one month', undefined, LATER);
  assert.equal(envAt(plan.profile, 'pricing.deposit')!.verified, false);
  assert.equal(plan.resetVerified, false);
});

test('planSet: --evidence is recorded on the written envelope', () => {
  const plan = planSet(profileWith({}), 'pricing.deposit', 'one month', 'owner email 5/1', LATER);
  assert.equal(envAt(plan.profile, 'pricing.deposit')!.evidence, 'owner email 5/1');
});

test('planSet: changing a verified field resets verification and flags it', () => {
  const p = profileWith({ 'pricing.deposit': env('verified amount', 'operator', true) });
  const plan = planSet(p, 'pricing.deposit', 'changed amount', undefined, LATER);
  assert.equal(envAt(plan.profile, 'pricing.deposit')!.verified, false);
  assert.equal(plan.resetVerified, true);
});

test('planSet: re-setting the same value on a verified field keeps verification (freshness touch)', () => {
  const p = profileWith({ 'pricing.deposit': env('same', 'operator', true) });
  const plan = planSet(p, 'pricing.deposit', 'same', undefined, LATER);
  assert.equal(envAt(plan.profile, 'pricing.deposit')!.verified, true);
  assert.equal(plan.resetVerified, false);
});

/* ── planVerify ────────────────────────────────────────────────────────── */
test('planVerify: a non-HV path is rejected', () => {
  const plan = planVerify(profileWith({ 'identity.publicName': env('LF') }), ['identity.publicName'], undefined, [], LATER);
  const item = plan.items[0]!;
  assert.equal(item.ok, false);
  assert.match(item.reason!, /human-verify/i);
  assert.equal(plan.verifiedCount, 0);
});

test('planVerify: an empty (unfilled) HV value is rejected', () => {
  const plan = planVerify(profileWith({ 'pricing.deposit': env(null) }), ['pricing.deposit'], undefined, [], LATER);
  const item = plan.items[0]!;
  assert.equal(item.ok, false);
  assert.match(item.reason!, /empty|nothing/i);
});

test('planVerify: an unknown path is rejected', () => {
  const plan = planVerify(profileWith({}), ['pricing.nonsense'], undefined, [], LATER);
  assert.equal(plan.items[0]!.ok, false);
});

test('planVerify: verifying doc-02 HV gates flips verified and reports the unblock', () => {
  const p = profileWith(DOC02_FILLED);
  const plan = planVerify(p, DOC02_HV, 'fixture hand-fill', [], LATER);
  assert.equal(plan.verifiedCount, 10);
  assert.ok(plan.items.every((i) => i.ok), 'all 10 paths verifiable');
  // the array-nested gate flips its enclosing envelope
  assert.equal(envAt(plan.profile, 'offerings.core')!.verified, true);
  assert.equal(envAt(plan.profile, 'pricing.deposit')!.verified, true);
  // evidence recorded
  assert.equal(envAt(plan.profile, 'pricing.deposit')!.evidence, 'fixture hand-fill');
  // value/source untouched by verify
  assert.equal(envAt(plan.profile, 'pricing.deposit')!.value, "One month's tuition");
  assert.ok(plan.unblocked.includes('doc-02'), 'doc-02 becomes ready');
  assert.equal(plan.profile._meta.revision, 2);
});

test('planVerify: verifying nothing leaves the profile and revision untouched', () => {
  const p = profileWith({ 'identity.publicName': env('LF') });
  const plan = planVerify(p, ['identity.publicName'], undefined, [], LATER);
  assert.equal(plan.verifiedCount, 0);
  assert.equal(plan.profile._meta.revision, 1); // unchanged
});

/* ── planResolve ───────────────────────────────────────────────────────── */
const conflict = (path: string): ConflictEntry => ({
  path,
  existing: env('existing value', 'operator', true),
  candidate: { value: 'candidate value', source: 'recon', evidence: 'recon snippet' },
  queuedAt: NOW,
});

test('planResolve: keep existing drops the entry and writes nothing', () => {
  const p = profileWith({ 'pricing.deposit': env('existing value', 'operator', true) });
  const plan = planResolve(p, [conflict('pricing.deposit')], 0, 'existing', LATER);
  assert.equal(plan.applied, false);
  assert.equal(plan.conflicts.length, 0);
  assert.equal(plan.profile._meta.revision, 1); // no write
  assert.equal(envAt(plan.profile, 'pricing.deposit')!.value, 'existing value');
});

test('planResolve: keep candidate writes the candidate value as an operator field and drops the entry', () => {
  const p = profileWith({ 'pricing.deposit': env('existing value', 'operator', true) });
  const plan = planResolve(p, [conflict('pricing.deposit')], 0, 'candidate', LATER);
  assert.equal(plan.applied, true);
  assert.equal(plan.conflicts.length, 0);
  assert.equal(envAt(plan.profile, 'pricing.deposit')!.value, 'candidate value');
  assert.equal(envAt(plan.profile, 'pricing.deposit')!.source, 'operator');
  assert.equal(envAt(plan.profile, 'pricing.deposit')!.verified, false); // re-verify after change
  assert.equal(plan.profile._meta.revision, 2);
});

test('planResolve: an out-of-range index throws', () => {
  assert.throws(() => planResolve(profileWith({}), [conflict('pricing.deposit')], 5, 'existing', LATER));
});

/* ── pendingHvVerifications ────────────────────────────────────────────── */
test('pendingHvVerifications: lists filled, unverified HV fields; excludes verified and empty', () => {
  const p = profileWith({
    'pricing.deposit': env('one month'), // filled, unverified HV → included
    'capacity.metrics': env([{ label: 'cap' }], 'operator', true), // verified → excluded
    'governance.dataRetention': env(null), // empty → excluded
  });
  const pending = pendingHvVerifications(p);
  const paths = pending.map((x) => x.envPath);
  assert.ok(paths.includes('pricing.deposit'));
  assert.ok(!paths.includes('capacity.metrics'));
  assert.ok(!paths.includes('governance.dataRetention'));
});
