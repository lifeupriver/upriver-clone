import { test } from 'node:test';
import assert from 'node:assert/strict';

import { candidateListSchema, parseCandidates } from './extraction.js';

const PATHS = ['identity.publicName', 'identity.hours', 'identity.socialHandles'];

test('candidateListSchema constrains path to the allowed enum', () => {
  const schema = candidateListSchema(PATHS) as any;
  assert.equal(schema.type, 'object');
  const item = schema.properties.candidates.items;
  assert.equal(item.type, 'object');
  assert.deepEqual(item.properties.path.enum, PATHS);
  assert.ok(item.required.includes('path'));
  assert.ok(item.required.includes('value'));
});

test('parseCandidates parses a clean JSON object and stamps source: recon', () => {
  const text = JSON.stringify({
    candidates: [
      { path: 'identity.publicName', value: 'Little Friends', evidence: 'page title' },
      { path: 'identity.hours', value: 'Mon–Fri 7:30–5:30' },
    ],
  });

  const out = parseCandidates(text, { paths: PATHS });

  assert.equal(out.length, 2);
  assert.deepEqual(out[0], {
    path: 'identity.publicName',
    value: 'Little Friends',
    source: 'recon',
    evidence: 'page title',
  });
  assert.equal(out[1]?.source, 'recon');
});

test('parseCandidates strips code fences and surrounding prose', () => {
  const text = 'Here you go:\n```json\n{"candidates":[{"path":"identity.hours","value":"24/7"}]}\n```\nDone.';
  const out = parseCandidates(text, { paths: PATHS });
  assert.equal(out.length, 1);
  assert.equal(out[0]?.value, '24/7');
});

test('parseCandidates drops items with an unknown path or a missing value', () => {
  const text = JSON.stringify({
    candidates: [
      { path: 'identity.publicName', value: 'LF' },
      { path: 'pricing.shareable', value: [{ item: 'x' }] }, // not in PATHS → dropped
      { path: 'identity.hours' }, // no value → dropped
    ],
  });
  const out = parseCandidates(text, { paths: PATHS });
  assert.deepEqual(out.map((c) => c.path), ['identity.publicName']);
});

test('parseCandidates applies the per-path confidence function', () => {
  const text = JSON.stringify({
    candidates: [
      { path: 'identity.publicName', value: 'LF' },
      { path: 'identity.socialHandles', value: [{ platform: 'ig' }] },
    ],
  });
  const out = parseCandidates(text, {
    paths: PATHS,
    confidence: (p) => (p === 'identity.socialHandles' ? 'low' : 'medium'),
  });
  assert.equal(out.find((c) => c.path === 'identity.publicName')?.confidence, 'medium');
  assert.equal(out.find((c) => c.path === 'identity.socialHandles')?.confidence, 'low');
});

test('parseCandidates returns [] on unparseable output instead of throwing', () => {
  assert.deepEqual(parseCandidates('the model refused', { paths: PATHS }), []);
  assert.deepEqual(parseCandidates('', { paths: PATHS }), []);
});
