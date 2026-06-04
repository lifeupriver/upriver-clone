import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProfile, nearestEnvelope, type ClientProfile, type ProfileField } from '@upriver/schemas';

import { applyCandidates, buildIncomingProfile, clampEvidence, EVIDENCE_MAX } from './apply.js';
import type { ReconciledCandidate } from './types.js';

const NOW = '2026-06-04T12:00:00.000Z';

function operatorField<T>(value: T): ProfileField<T> {
  return { value, source: 'operator', confidence: 'low', verified: false, updatedAt: '2026-06-04T00:00:00.000Z' };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function existingWith(fields: Record<string, unknown>): ClientProfile {
  const p = createEmptyProfile('littlefriends', NOW) as any;
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

const cand = (path: string, value: unknown, quote: string, confidence: 'high' | 'medium' | 'low' = 'medium'): ReconciledCandidate => ({
  path,
  value,
  quote,
  confidence,
  chunkIndices: [0],
});

test('buildIncomingProfile wraps every candidate as a transcript envelope, unverified', () => {
  const incoming = buildIncomingProfile('littlefriends', [cand('pricing.deposit', 'one month', 'one month')], NOW);
  const env = nearestEnvelope(incoming as unknown as Record<string, unknown>, 'pricing.deposit');
  assert.equal(env?.source, 'transcript');
  assert.equal(env?.verified, false);
  assert.equal(env?.value, 'one month');
  assert.equal(env?.evidence, 'one month');
});

test('an empty HV field gains a transcript value and stays unverified', () => {
  const existing = existingWith({});
  const r = applyCandidates(existing, [cand('capacity.bookingLeadTime', { typical: '~8 weeks' }, 'about eight weeks')], NOW);
  assert.ok(r.applied.includes('capacity.bookingLeadTime'));
  const env = nearestEnvelope(r.profile as unknown as Record<string, unknown>, 'capacity.bookingLeadTime');
  assert.equal(env?.verified, false);
  assert.equal(env?.source, 'transcript');
  assert.deepEqual(env?.value, { typical: '~8 weeks' });
});

test('a transcript value contradicting operator data QUEUES a conflict, not an overwrite', () => {
  const existing = existingWith({ 'governance.regulatedData': operatorField(["Children's PII", 'Immunization records']) });
  const r = applyCandidates(existing, [cand('governance.regulatedData', ['Payment card data'], 'we take card payments')], NOW);

  // The decisive assertion: the merge OUTCOME is a conflict for this path.
  assert.equal(r.conflicts.length, 1);
  assert.equal(r.conflicts[0]?.path, 'governance.regulatedData');
  assert.ok(!r.applied.includes('governance.regulatedData'));

  // The operator value on record is untouched.
  const env = nearestEnvelope(r.profile as unknown as Record<string, unknown>, 'governance.regulatedData');
  assert.equal(env?.source, 'operator');
  assert.deepEqual(env?.value, ["Children's PII", 'Immunization records']);
});

test('evidence is clamped to the envelope cap so a long quote never fails the write', () => {
  const long = 'q'.repeat(5000);
  assert.ok(clampEvidence(long).length <= EVIDENCE_MAX);
  const r = applyCandidates(existingWith({}), [cand('pricing.deposit', 'x', long)], NOW);
  const env = nearestEnvelope(r.profile as unknown as Record<string, unknown>, 'pricing.deposit');
  assert.ok((env?.evidence?.length ?? 0) <= EVIDENCE_MAX);
});

test('applying to a previously-absent field never yields verified:true', () => {
  const r = applyCandidates(existingWith({}), [cand('goals.redLines', ['No images without releases'], 'no images')], NOW);
  const env = nearestEnvelope(r.profile as unknown as Record<string, unknown>, 'goals.redLines');
  assert.equal(env?.verified, false);
});
