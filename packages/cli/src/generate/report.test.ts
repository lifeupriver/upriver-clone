import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProfile, type Readiness } from '@upriver/schemas';
import { renderReadiness, renderGenerationReport, newlyUnblocked, titleFor } from './report.js';

test('renderReadiness lists HV blockers with the no-force hint', () => {
  const r: Readiness = {
    ready: false,
    missingFields: ['capacity.metrics'],
    unverifiedHv: ['pricing.deposit', 'pricing.shareable'],
    missingDocs: [],
  };
  const out = renderReadiness('doc-02', r);
  assert.match(out, /BLOCKED/);
  assert.match(out, /pricing\.deposit/);
  assert.match(out, /capacity\.metrics/);
  assert.match(out, /no --force/);
});

test('renderReadiness reports a ready deliverable', () => {
  const out = renderReadiness('doc-01', { ready: true, missingFields: [], unverifiedHv: [], missingDocs: [] });
  assert.match(out, /READY/);
});

test('renderGenerationReport shows path, word count, numbered markers, and unblocks', () => {
  const out = renderGenerationReport({
    id: 'doc-01',
    docPath: 'docs/doc-01-brand-voice-guide.md',
    content: 'one two three',
    markers: ['who is the owner?'],
    fromCache: false,
    nowUnblocked: ['doc-04'],
  });
  assert.match(out, /docs\/doc-01-brand-voice-guide\.md/);
  assert.match(out, /words: 3/);
  assert.match(out, /1\. who is the owner\?/);
  assert.match(out, /unblocks downstream: doc-04/);
});

test('titleFor resolves a deliverable title', () => {
  assert.equal(titleFor('doc-01'), 'Brand Voice Guide');
});

test('newlyUnblocked returns an array and never throws on a sparse profile', () => {
  const out = newlyUnblocked(createEmptyProfile('lf', '2026-06-04T00:00:00.000Z'), [], 'doc-01');
  assert.ok(Array.isArray(out));
});
