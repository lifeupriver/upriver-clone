import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEmptyProfile,
  type ClientProfile,
  type ProfileField,
  type Source,
} from '@upriver/schemas';

import { mergeCandidates, structurallyValid } from './merge-candidates.js';
import type { PathedCandidate } from './types.js';

const NOW = '2026-06-04T12:00:00.000Z';
const EARLIER = '2026-06-01T00:00:00.000Z';

function env<T>(value: T, source: Source = 'operator', verified = false): ProfileField<T> {
  return { value, source, confidence: null, verified, updatedAt: EARLIER };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function profileWith(fields: Record<string, unknown>): ClientProfile {
  const p = createEmptyProfile('lf', EARLIER) as any;
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
const leaf = (p: ClientProfile, path: string): ProfileField<unknown> => {
  let cur: any = p;
  for (const s of path.split('.')) cur = cur?.[s];
  return cur as ProfileField<unknown>;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

function cand(path: string, value: unknown, extra: Partial<PathedCandidate> = {}): PathedCandidate {
  return { path, value, source: 'recon', ...extra };
}

test('fills an empty field and marks it source=recon, unverified', () => {
  const existing = createEmptyProfile('lf', EARLIER);
  const r = mergeCandidates(existing, [cand('identity.publicName', 'Little Friends')], NOW);

  assert.deepEqual(r.outcomes, [{ path: 'identity.publicName', kind: 'filled' }]);
  assert.equal(r.conflicts.length, 0);
  const f = leaf(r.profile, 'identity.publicName');
  assert.equal(f.value, 'Little Friends');
  assert.equal(f.source, 'recon');
  assert.equal(f.verified, false);
});

test('never overwrites a higher-precedence value — queues a conflict instead', () => {
  const existing = profileWith({ 'identity.publicName': env('Operator Name', 'operator') });
  const r = mergeCandidates(existing, [cand('identity.publicName', 'Recon Name')], NOW);

  assert.deepEqual(r.outcomes, [{ path: 'identity.publicName', kind: 'conflicted' }]);
  assert.equal(r.conflicts.length, 1);
  assert.equal(r.conflicts[0]?.path, 'identity.publicName');
  // Existing value is untouched.
  assert.equal(leaf(r.profile, 'identity.publicName').value, 'Operator Name');
});

test('an equal value against a higher source is a skipped freshness touch (verified preserved)', () => {
  const existing = profileWith({ 'identity.hours': env('Mon–Fri 8–5', 'operator', true) });
  const r = mergeCandidates(existing, [cand('identity.hours', 'Mon–Fri 8–5')], NOW);

  assert.deepEqual(r.outcomes, [{ path: 'identity.hours', kind: 'skipped' }]);
  assert.equal(r.conflicts.length, 0);
  const f = leaf(r.profile, 'identity.hours');
  // Stronger provenance and verification are kept — recon never demotes them.
  assert.equal(f.source, 'operator');
  assert.equal(f.verified, true);
});

test('recon fills an HV field unverified (never sets verified: true)', () => {
  const existing = createEmptyProfile('lf', EARLIER);
  const r = mergeCandidates(
    existing,
    [cand('pricing.shareable', [{ item: 'Full-time tuition', price: '$1,450/mo' }])],
    NOW,
  );

  assert.deepEqual(r.outcomes, [{ path: 'pricing.shareable', kind: 'filled' }]);
  const f = leaf(r.profile, 'pricing.shareable');
  assert.equal(f.source, 'recon');
  assert.equal(f.verified, false);
});

test('recon never flips a verified field — a differing value against verified HV conflicts', () => {
  const existing = profileWith({
    'pricing.shareable': env([{ item: 'Tuition', price: '$1,400/mo' }], 'operator', true),
  });
  const r = mergeCandidates(
    existing,
    [cand('pricing.shareable', [{ item: 'Tuition', price: '$1,450/mo' }])],
    NOW,
  );

  assert.deepEqual(r.outcomes, [{ path: 'pricing.shareable', kind: 'conflicted' }]);
  const f = leaf(r.profile, 'pricing.shareable');
  assert.equal(f.verified, true);
  assert.deepEqual(f.value, [{ item: 'Tuition', price: '$1,400/mo' }]);
});

test('same-source recon re-fill is last-write-wins (filled, still unverified)', () => {
  const existing = profileWith({ 'identity.hours': env('Mon–Fri 7:30–5:30', 'recon') });
  const r = mergeCandidates(existing, [cand('identity.hours', 'Mon–Sat 7:30–6')], NOW);

  assert.deepEqual(r.outcomes, [{ path: 'identity.hours', kind: 'filled' }]);
  const f = leaf(r.profile, 'identity.hours');
  assert.equal(f.value, 'Mon–Sat 7:30–6');
  assert.equal(f.source, 'recon');
  assert.equal(f.verified, false);
});

test('structurallyValid accepts values that match the section schema', () => {
  assert.equal(structurallyValid('identity.hours', 'Mon–Fri 7:30–5:30', NOW), true);
  assert.equal(structurallyValid('identity.gbp', { url: 'https://maps.google.com/x', status: 'claimed' }, NOW), true);
  assert.equal(structurallyValid('content.testimonials', [{ quote: 'We love it', attribution: 'A parent' }], NOW), true);
  assert.equal(
    structurallyValid('salesProcess.firstTouch.responseTime', [{ channel: 'email', time: '2h' }], NOW),
    true,
  );
});

test('structurallyValid rejects values that violate the section schema', () => {
  // identity.hours is z.string(); a number must not pass.
  assert.equal(structurallyValid('identity.hours', 42, NOW), false);
  // testimonialZ requires `quote`.
  assert.equal(structurallyValid('content.testimonials', [{ attribution: 'A parent' }], NOW), false);
  // reviewPlatformZ.rating is a number; a string must not pass.
  assert.equal(
    structurallyValid('content.reviewPlatforms', [{ platform: 'Google', rating: 'five' }], NOW),
    false,
  );
});

test('outcomes align 1:1 with inputs across a mixed batch; no recon leaf is ever verified', () => {
  const existing = profileWith({
    'identity.publicName': env('Operator Name', 'operator'), // conflict
    'identity.hours': env('Mon–Fri 8–5', 'recon'), // same-source update → filled
  });
  const batch = [
    cand('identity.legalName', 'Little Friends Learning Loft LLC'), // filled
    cand('identity.publicName', 'Recon Name'), // conflicted
    cand('identity.hours', 'Mon–Sat 8–6'), // filled (recon update)
    cand('identity.phone', '(518) 555-0142'), // filled
  ];
  const r = mergeCandidates(existing, batch, NOW);

  assert.equal(r.outcomes.length, batch.length);
  assert.deepEqual(
    r.outcomes.map((o) => o.kind),
    ['filled', 'conflicted', 'filled', 'filled'],
  );
  assert.equal(r.conflicts.length, 1);

  // The core invariant: every leaf the recon path actually owns is unverified.
  for (const path of ['identity.legalName', 'identity.hours', 'identity.phone']) {
    const f = leaf(r.profile, path);
    if (f.source === 'recon') assert.equal(f.verified, false);
  }
});
