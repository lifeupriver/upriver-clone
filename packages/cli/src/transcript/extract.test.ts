import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  EXTRACTION_JSON_SCHEMA,
  extractionSystemPrompt,
  parseChunkExtraction,
  extractChunks,
  type ChunkCaller,
} from './extract.js';
import type { TranscriptChunk } from './ingest.js';

test('extractionSystemPrompt embeds the catalog and the verbatim-quote / transcript rules', () => {
  const sp = extractionSystemPrompt('capacity:\n  - capacity.metrics [array]');
  assert.match(sp, /capacity\.metrics/);
  assert.match(sp, /verbatim/i);
  assert.match(sp, /quote/i);
});

test('the output json-schema requires candidates and unmapped arrays', () => {
  const s = EXTRACTION_JSON_SCHEMA as Record<string, unknown>;
  const props = s['properties'] as Record<string, unknown>;
  assert.ok(props['candidates']);
  assert.ok(props['unmapped']);
});

test('parseChunkExtraction parses a well-formed object', () => {
  const text = JSON.stringify({
    candidates: [
      { path: 'capacity.metrics', value: [{ label: 'X', value: 16 }], quote: 'sixteen kids', confidence: 'medium' },
    ],
    unmapped: [{ topic: 'library partnership', quote: 'we partner with the library' }],
  });
  const r = parseChunkExtraction(text, 2);
  assert.equal(r.chunkIndex, 2);
  assert.equal(r.candidates.length, 1);
  assert.equal(r.candidates[0]?.path, 'capacity.metrics');
  assert.equal(r.unmapped.length, 1);
  assert.equal(r.error, undefined);
});

test('parseChunkExtraction tolerates a code-fenced object', () => {
  const text = '```json\n' + JSON.stringify({ candidates: [], unmapped: [] }) + '\n```';
  const r = parseChunkExtraction(text, 0);
  assert.equal(r.error, undefined);
  assert.equal(r.candidates.length, 0);
});

test('parseChunkExtraction records an error for unparseable output', () => {
  const r = parseChunkExtraction('not json at all', 1);
  assert.ok(r.error);
  assert.equal(r.candidates.length, 0);
  assert.equal(r.unmapped.length, 0);
});

test('extractChunks calls the caller once per chunk and survives a per-chunk failure', async () => {
  const chunks: TranscriptChunk[] = [
    { index: 0, text: 'a' },
    { index: 1, text: 'b' },
    { index: 2, text: 'c' },
  ];
  const seen: number[] = [];
  const call: ChunkCaller = async ({ chunkIndex }) => {
    seen.push(chunkIndex);
    if (chunkIndex === 1) throw new Error('boom');
    return JSON.stringify({
      candidates: [{ path: 'voice.attributes', value: [], quote: 'q' }],
      unmapped: [],
    });
  };
  const results = await extractChunks(chunks, 'CATALOG', call);
  assert.deepEqual(seen.sort(), [0, 1, 2]);
  assert.equal(results.length, 3);
  assert.equal(results[1]?.error !== undefined, true, 'failed chunk records an error');
  assert.equal(results[0]?.candidates.length, 1);
  assert.equal(results[2]?.candidates.length, 1);
});

test('P3 (Build Spec 14): the extraction prompt demands ★ recall and a closing self-check', () => {
  const sys = extractionSystemPrompt('  - identity.category [string] ★');
  assert.match(sys, /you MUST emit a candidate/);
  assert.match(sys, /re-scan the chunk/);
});
