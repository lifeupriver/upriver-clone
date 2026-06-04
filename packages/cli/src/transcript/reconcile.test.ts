import { test } from 'node:test';
import assert from 'node:assert/strict';

import { reconcile } from './reconcile.js';
import type { ChunkExtraction } from './types.js';

const SOURCE = [
  "Owner: Our license is for sixteen children.",
  "The deposit is one month's tuition.",
  "Actually we moved to two months' tuition.",
  "We never store payment data, only medical forms.",
].join(' ');

const METRIC = [{ label: 'Total licensed capacity', value: 16, unit: 'children' }];

test('reconcile dedupes a boundary-spanning identical candidate across chunks', () => {
  const extractions: ChunkExtraction[] = [
    {
      chunkIndex: 0,
      candidates: [
        { path: 'capacity.metrics', value: METRIC, quote: 'Our license is for sixteen children.', confidence: 'medium' },
      ],
      unmapped: [],
    },
    {
      chunkIndex: 1,
      candidates: [
        // same value, sloppier whitespace in the quote (still verbatim once normalized)
        { path: 'capacity.metrics', value: METRIC, quote: 'Our   license is for sixteen children.', confidence: 'medium' },
      ],
      unmapped: [],
    },
  ];
  const r = reconcile(extractions, SOURCE);
  assert.equal(r.candidates.length, 1);
  assert.deepEqual(r.candidates[0]?.chunkIndices, [0, 1]);
});

test('reconcile drops unknown paths, invalid values, and fabricated quotes — all reported', () => {
  const extractions: ChunkExtraction[] = [
    {
      chunkIndex: 0,
      candidates: [
        { path: 'capacity.bogus', value: 'x', quote: 'Our license is for sixteen children.' },
        { path: 'governance.regulatedData', value: 'should-be-array', quote: 'We never store payment data, only medical forms.' },
        { path: 'voice.attributes', value: [], quote: 'The moon is made of cheese' },
      ],
      unmapped: [],
    },
  ];
  const r = reconcile(extractions, SOURCE);
  assert.equal(r.candidates.length, 0);
  assert.equal(r.dropped.length, 3);
  const reasons = r.dropped.map((d) => d.reason).join(' | ');
  assert.match(reasons, /unknown|path/i);
  assert.match(reasons, /value|invalid/i);
  assert.match(reasons, /verbatim|quote|transcript/i);
});

test('reconcile collapses same-path/different-value by confidence and reports the discard', () => {
  const extractions: ChunkExtraction[] = [
    {
      chunkIndex: 0,
      candidates: [
        { path: 'pricing.deposit', value: "one month's tuition", quote: "The deposit is one month's tuition.", confidence: 'low' },
      ],
      unmapped: [],
    },
    {
      chunkIndex: 1,
      candidates: [
        { path: 'pricing.deposit', value: "two months' tuition", quote: "Actually we moved to two months' tuition.", confidence: 'high' },
      ],
      unmapped: [],
    },
  ];
  const r = reconcile(extractions, SOURCE);
  assert.equal(r.candidates.length, 1);
  assert.equal(r.candidates[0]?.value, "two months' tuition");
  assert.equal(r.discarded.length, 1);
  assert.equal(r.discarded[0]?.value, "one month's tuition");
  assert.equal(r.discarded[0]?.keptValue, "two months' tuition");
});

test('reconcile breaks an equal-confidence tie by the longest quote', () => {
  const extractions: ChunkExtraction[] = [
    {
      chunkIndex: 0,
      candidates: [
        { path: 'pricing.deposit', value: 'short', quote: 'The deposit is one month’s tuition.', confidence: 'medium' },
      ],
      unmapped: [],
    },
    {
      chunkIndex: 1,
      candidates: [
        // same confidence, longer (more context) quote → should win
        { path: 'pricing.deposit', value: 'long', quote: "Actually we moved to two months' tuition.", confidence: 'medium' },
      ],
      unmapped: [],
    },
  ];
  // Make both quotes verbatim-present.
  const src = "The deposit is one month’s tuition. Actually we moved to two months' tuition.";
  const r = reconcile(extractions, src);
  assert.equal(r.candidates.length, 1);
  assert.equal(r.candidates[0]?.value, 'long');
  assert.equal(r.discarded[0]?.value, 'short');
});

test('reconcile collects and dedupes unmapped topics', () => {
  const extractions: ChunkExtraction[] = [
    { chunkIndex: 0, candidates: [], unmapped: [{ topic: 'library partnership', quote: 'we partner with the library' }] },
    { chunkIndex: 1, candidates: [], unmapped: [{ topic: 'library partnership', quote: 'we partner with the library' }] },
  ];
  const r = reconcile(extractions, SOURCE);
  assert.equal(r.unmapped.length, 1);
  assert.equal(r.unmapped[0]?.topic, 'library partnership');
});
