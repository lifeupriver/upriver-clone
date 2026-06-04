import { test } from 'node:test';
import assert from 'node:assert/strict';
import { z } from 'zod';
import { profileFieldZ, sourceZ, confidenceZ, isEnvelope } from './envelope.js';

test('profileFieldZ parses a full envelope and round-trips', () => {
  const schema = profileFieldZ(z.string());
  const parsed = schema.parse({
    value: 'Little Friends Learning Loft',
    source: 'recon',
    confidence: 'low',
    verified: false,
    evidence: 'https://example.com',
    updatedAt: '2026-06-04T00:00:00.000Z',
  });
  assert.equal(parsed.value, 'Little Friends Learning Loft');
  assert.equal(parsed.source, 'recon');
  assert.equal(parsed.confidence, 'low');
  assert.equal(parsed.verified, false);
  assert.equal(parsed.evidence, 'https://example.com');
});

test('verified defaults to false when omitted', () => {
  const schema = profileFieldZ(z.number());
  const parsed = schema.parse({ value: 42, source: null, confidence: null, updatedAt: 'x' });
  assert.equal(parsed.verified, false);
});

test('value is nullable and evidence is optional', () => {
  const schema = profileFieldZ(z.string());
  const parsed = schema.parse({ value: null, source: null, confidence: null, updatedAt: 'x' });
  assert.equal(parsed.value, null);
  assert.equal(parsed.evidence, undefined);
});

test('evidence over 2000 chars is rejected', () => {
  const schema = profileFieldZ(z.string());
  const bad = schema.safeParse({
    value: 'x',
    source: null,
    confidence: null,
    updatedAt: 'x',
    evidence: 'a'.repeat(2001),
  });
  assert.equal(bad.success, false);
});

test('isEnvelope distinguishes envelopes from plain objects', () => {
  assert.equal(isEnvelope({ value: 1, source: null, verified: false, updatedAt: 'x' }), true);
  assert.equal(isEnvelope({ a: 1 }), false);
  assert.equal(isEnvelope(null), false);
  assert.equal(isEnvelope([1, 2]), false);
});

test('source and confidence enums expose their options', () => {
  assert.deepEqual(sourceZ.options, ['recon', 'interview', 'transcript', 'operator']);
  assert.deepEqual(confidenceZ.options, ['high', 'medium', 'low']);
});
