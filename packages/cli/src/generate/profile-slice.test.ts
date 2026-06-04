import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProfile, type ClientProfile, type ProfileField, type Source } from '@upriver/schemas';
import { profileSlice, renderSlice } from './profile-slice.js';

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
  assert.match(renderSlice([{ path: 'a.b', value: 'x', evidence: 'e' }]), /a\.b: x[\s\S]*evidence: e/);
  assert.match(renderSlice([]), /no profile fields/);
});
