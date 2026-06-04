import { test } from 'node:test';
import assert from 'node:assert/strict';
import { conflictEntry, type ConflictEntry } from '@upriver/schemas';

import { buildProvenance, provenancePath } from './provenance.js';
import type { MergeResult } from '../generate/profile-merge.js';
import type { Reconciliation } from './types.js';

const NOW = '2026-06-04T12:00:00.000Z';

test('provenancePath places the artifact under transcripts/ with -extraction.json', () => {
  assert.equal(provenancePath('/tmp/x/littlefriends-session.txt'), 'transcripts/littlefriends-session-extraction.json');
  assert.equal(provenancePath('session.vtt'), 'transcripts/session-extraction.json');
});

test('buildProvenance summarises outcomes and lists applied + conflicts + dropped + unmapped', () => {
  const recon: Reconciliation = {
    candidates: [
      { path: 'capacity.bookingLeadTime', value: { typical: '8w' }, quote: 'eight weeks', confidence: 'medium', chunkIndices: [0, 1] },
      { path: 'governance.regulatedData', value: ['Card data'], quote: 'card data', confidence: 'low', chunkIndices: [2] },
    ],
    dropped: [{ path: 'foo.bar', value: 1, quote: 'q', reason: 'unknown schema path: foo.bar' }],
    unmapped: [{ topic: 'library', quote: 'we use the library' }],
    discarded: [],
  };
  const conflict: ConflictEntry = conflictEntry(
    'governance.regulatedData',
    {
      existing: { value: ['PII'], source: 'operator', confidence: 'low', verified: false, updatedAt: NOW },
      candidate: { value: ['Card data'], source: 'transcript' },
    },
    NOW,
  );
  const merge: MergeResult = {
    profile: { _meta: { version: 1, slug: 'littlefriends', createdAt: NOW, updatedAt: NOW, revision: 2 } },
    applied: ['capacity.bookingLeadTime'],
    unchanged: [],
    conflicts: [conflict],
  };

  const prov = buildProvenance({
    slug: 'littlefriends',
    file: '/tmp/littlefriends-session.txt',
    format: 'txt',
    chunkCount: 3,
    bytes: 1234,
    model: 'sonnet',
    now: NOW,
    reconciliation: recon,
    merge,
    chunkErrors: [{ chunkIndex: 2, error: 'boom' }],
  });

  assert.equal(prov.summary.applied, 1);
  assert.equal(prov.summary.conflicted, 1);
  assert.equal(prov.summary.dropped, 1);
  assert.equal(prov.summary.unmapped, 1);
  assert.equal(prov.summary.chunkErrors, 1);
  assert.equal(prov.applied[0]?.path, 'capacity.bookingLeadTime');
  assert.deepEqual(prov.applied[0]?.chunks, [0, 1]);
  assert.equal(prov.conflicts[0]?.path, 'governance.regulatedData');
  assert.equal(prov.unmapped[0]?.topic, 'library');
});
