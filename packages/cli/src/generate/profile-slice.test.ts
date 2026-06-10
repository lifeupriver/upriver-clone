import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProfile, type ClientProfile, type ProfileField, type Source } from '@upriver/schemas';
import { profileSlice, renderSlice, type SliceField } from './profile-slice.js';

const NOW = '2026-06-04T00:00:00.000Z';
function env<T>(value: T, evidence?: string): ProfileField<T> {
  return {
    value,
    source: 'operator' as Source,
    confidence: null,
    verified: false,
    updatedAt: NOW,
    ...(evidence !== undefined ? { evidence } : {}),
  };
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
/* eslint-enable @typescript-eslint/no-explicit-any */

test('profileSlice includes filled requiresFields and omits unfilled ones', () => {
  const p = profileWith({
    'identity.publicName': env('Little Friends'),
    'positioning.keyDifferentiator': env('low ratios', 'recorded session'),
  });
  const paths = profileSlice(p, 'doc-01').map((f) => f.path);
  assert.ok(paths.includes('identity.publicName'));
  assert.ok(paths.includes('positioning.keyDifferentiator'));
  assert.ok(!paths.includes('voice.attributes')); // unfilled → omitted
});

test('profileSlice strips envelope metadata but keeps value + evidence', () => {
  const p = profileWith({ 'identity.publicName': env('LF', 'site title') });
  const field = profileSlice(p, 'doc-01').find((f) => f.path === 'identity.publicName');
  assert.equal(field?.value, 'LF');
  assert.equal(field?.evidence, 'site title');
  assert.equal((field as unknown as Record<string, unknown>)['source'], undefined);
});

test('profileSlice dedupes a wildcard path nested under an included parent', () => {
  // doc-02 requiresFields has both `offerings.core` and `offerings.core.*.priceRange`.
  const p = profileWith({ 'offerings.core': env([{ name: 'Program' }]) });
  const coreHits = profileSlice(p, 'doc-02').filter((f) => f.path.startsWith('offerings.core'));
  assert.equal(coreHits.length, 1);
  assert.equal(coreHits[0]?.path, 'offerings.core');
});

test('renderSlice formats values with evidence; an empty slice has a placeholder', () => {
  assert.match(renderSlice([{ path: 'a.b', value: 'x', evidence: 'e', confirmed: true }]), /a\.b: x[\s\S]*evidence: e/);
  assert.match(renderSlice([]), /no profile fields/);
});

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
