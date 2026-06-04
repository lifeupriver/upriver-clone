import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ProfileField } from './envelope.js';
import { mergeCandidate, conflictEntry } from './merge.js';

const NOW = '2026-06-04T12:00:00.000Z';
const EARLIER = '2026-06-01T00:00:00.000Z';

function field<T>(partial: Partial<ProfileField<T>> & { value: T | null }): ProfileField<T> {
  return {
    value: partial.value,
    source: partial.source ?? 'recon',
    confidence: partial.confidence ?? 'low',
    verified: partial.verified ?? false,
    updatedAt: partial.updatedAt ?? EARLIER,
    ...(partial.evidence !== undefined ? { evidence: partial.evidence } : {}),
  };
}

test('applies onto undefined existing, with per-source default confidence', () => {
  const out = mergeCandidate<string>(undefined, { value: 'a', source: 'recon' }, NOW);
  assert.equal(out.kind, 'applied');
  if (out.kind === 'applied') {
    assert.equal(out.field.value, 'a');
    assert.equal(out.field.verified, false);
    assert.equal(out.field.confidence, 'low');
    assert.equal(out.field.updatedAt, NOW);
  }
});

test('applies onto a null-valued existing', () => {
  const existing = field<string>({ value: null, source: null });
  const out = mergeCandidate(existing, { value: 'a', source: 'interview' }, NOW);
  assert.equal(out.kind, 'applied');
});

test('higher precedence overwrites lower', () => {
  const existing = field<string>({ value: 'recon', source: 'recon' });
  const out = mergeCandidate(existing, { value: 'op', source: 'operator' }, NOW);
  assert.equal(out.kind, 'applied');
  if (out.kind === 'applied') assert.equal(out.field.value, 'op');
});

test('lower precedence conflicts and never overwrites', () => {
  const existing = field<string>({ value: 'op', source: 'operator' });
  const out = mergeCandidate(existing, { value: 'recon', source: 'recon' }, NOW);
  assert.equal(out.kind, 'conflict');
  if (out.kind === 'conflict') {
    assert.equal(out.existing.value, 'op');
    assert.equal(out.candidate.value, 'recon');
  }
});

test('same source is last-write-wins', () => {
  const existing = field<string>({ value: 'old', source: 'interview' });
  const out = mergeCandidate(existing, { value: 'new', source: 'interview' }, NOW);
  assert.equal(out.kind, 'applied');
  if (out.kind === 'applied') assert.equal(out.field.value, 'new');
});

test('equal values touch freshness and preserve verified + provenance', () => {
  const existing = field<string>({
    value: 'same',
    source: 'operator',
    verified: true,
    updatedAt: EARLIER,
  });
  const out = mergeCandidate(existing, { value: 'same', source: 'recon' }, NOW);
  assert.equal(out.kind, 'applied');
  if (out.kind === 'applied') {
    assert.equal(out.field.verified, true);
    assert.equal(out.field.value, 'same');
    assert.equal(out.field.updatedAt, NOW);
    assert.equal(out.field.source, 'operator');
  }
});

test('verified field rejects a non-operator candidate with a changed value', () => {
  const existing = field<string>({ value: 'verified', source: 'transcript', verified: true });
  const out = mergeCandidate(existing, { value: 'changed', source: 'transcript' }, NOW);
  assert.equal(out.kind, 'conflict');
});

test('verified field accepts an operator candidate and resets verified', () => {
  const existing = field<string>({ value: 'verified', source: 'transcript', verified: true });
  const out = mergeCandidate(existing, { value: 'changed', source: 'operator' }, NOW);
  assert.equal(out.kind, 'applied');
  if (out.kind === 'applied') {
    assert.equal(out.field.value, 'changed');
    assert.equal(out.field.verified, false);
  }
});

test('candidate confidence overrides the per-source default', () => {
  const out = mergeCandidate<string>(
    undefined,
    { value: 'a', source: 'recon', confidence: 'high' },
    NOW,
  );
  if (out.kind === 'applied') assert.equal(out.field.confidence, 'high');
});

test('deep-equal arrays of objects count as equal (freshness touch only)', () => {
  const existing = field<{ a: number }[]>({ value: [{ a: 1 }], source: 'transcript' });
  const out = mergeCandidate(existing, { value: [{ a: 1 }], source: 'recon' }, NOW);
  assert.equal(out.kind, 'applied');
  if (out.kind === 'applied') {
    assert.equal(out.field.updatedAt, NOW);
    assert.equal(out.field.source, 'transcript');
  }
});

test('conflictEntry packages a conflict for the queue', () => {
  const existing = field<string>({ value: 'op', source: 'operator' });
  const out = mergeCandidate(existing, { value: 'r', source: 'recon' }, NOW);
  assert.equal(out.kind, 'conflict');
  if (out.kind === 'conflict') {
    const entry = conflictEntry('pricing.deposit', out, NOW);
    assert.equal(entry.path, 'pricing.deposit');
    assert.equal(entry.queuedAt, NOW);
    assert.equal(entry.candidate.value, 'r');
    assert.equal(entry.existing.value, 'op');
  }
});
