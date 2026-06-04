import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProfile, type ClientProfile, type ProfileField, type Source } from '@upriver/schemas';
import { mergeProfiles, planImport } from './profile-merge.js';

const NOW = '2026-06-04T12:00:00.000Z';

function env<T>(value: T, source: Source = 'operator', verified = false): ProfileField<T> {
  return { value, source, confidence: null, verified, updatedAt: NOW };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function profileWith(fields: Record<string, unknown>): ClientProfile {
  const p = createEmptyProfile('lf', NOW) as any;
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
const val = (p: ClientProfile, path: string): unknown => {
  let cur: any = p;
  for (const s of path.split('.')) cur = cur?.[s];
  return cur;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

test('a new field applies onto an existing profile', () => {
  const existing = profileWith({ 'identity.publicName': env('LF') });
  const incoming = profileWith({ 'pricing.deposit': env('one month tuition') });
  const r = mergeProfiles(existing, incoming, NOW);
  assert.ok(r.applied.includes('pricing.deposit'));
  assert.equal((val(r.profile, 'pricing.deposit') as ProfileField<string>).value, 'one month tuition');
});

test('a lower-precedence import conflicts against a verified field (never overwrites)', () => {
  const existing = profileWith({ 'pricing.deposit': env('verified amount', 'operator', true) });
  const incoming = profileWith({ 'pricing.deposit': env('recon guess', 'recon') });
  const r = mergeProfiles(existing, incoming, NOW);
  assert.equal(r.applied.length, 0);
  assert.equal(r.conflicts.length, 1);
  assert.equal(r.conflicts[0]?.path, 'pricing.deposit');
  assert.equal((val(r.profile, 'pricing.deposit') as ProfileField<string>).value, 'verified amount');
});

test('an equal value counts as unchanged (freshness touch, not applied)', () => {
  const existing = profileWith({ 'identity.publicName': env('LF', 'operator') });
  const incoming = profileWith({ 'identity.publicName': env('LF', 'operator') });
  const r = mergeProfiles(existing, incoming, NOW);
  assert.ok(r.unchanged.includes('identity.publicName'));
  assert.equal(r.applied.length, 0);
  assert.equal(r.conflicts.length, 0);
});

test('imported leaf without a source defaults to operator', () => {
  const existing = profileWith({});
  const incoming = profileWith({
    'goals.primaryOutcome': { value: 'grow', source: null, confidence: null, verified: false, updatedAt: NOW },
  });
  const r = mergeProfiles(existing, incoming, NOW);
  assert.equal((val(r.profile, 'goals.primaryOutcome') as ProfileField<string>).source, 'operator');
});

const withRevision = (p: ClientProfile, revision: number): ClientProfile => ({
  ...p,
  _meta: { ...p._meta, revision, createdAt: '2026-01-01T00:00:00.000Z' },
});

test('planImport create: no existing → as-is, revision floored to 1', () => {
  const parsed = withRevision(profileWith({ 'identity.publicName': env('LF') }), 0);
  const plan = planImport(null, parsed, NOW, false);
  assert.equal(plan.mode, 'created');
  assert.equal(plan.toWrite._meta.revision, 1);
  assert.equal(plan.applied, 1);
});

test('planImport replace: wholesale, revision bumped, createdAt preserved', () => {
  const existing = withRevision(profileWith({ 'identity.publicName': env('old') }), 3);
  const parsed = withRevision(profileWith({ 'pricing.deposit': env('x'), 'identity.publicName': env('new') }), 9);
  const plan = planImport(existing, parsed, NOW, true);
  assert.equal(plan.mode, 'replaced');
  assert.equal(plan.toWrite._meta.revision, 4); // existing 3 + 1, not parsed's 9
  assert.equal(plan.toWrite._meta.createdAt, existing._meta.createdAt);
  assert.equal(plan.applied, 2);
});

test('planImport merge: bumps revision and surfaces conflicts', () => {
  const existing = withRevision(profileWith({ 'pricing.deposit': env('verified', 'operator', true) }), 5);
  const parsed = profileWith({ 'pricing.deposit': env('recon', 'recon'), 'goals.primaryOutcome': env('grow') });
  const plan = planImport(existing, parsed, NOW, false);
  assert.equal(plan.mode, 'merged');
  assert.equal(plan.toWrite._meta.revision, 6);
  assert.equal(plan.conflicted, 1);
  assert.equal(plan.applied, 1); // goals.primaryOutcome
});
