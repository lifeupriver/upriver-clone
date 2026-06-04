import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildGeoQuestion, geoAdapter } from './geo.js';
import { InMemoryDataSource, makeContext } from '../testing.js';
import type { LlmRequest, RawEvidence } from '../types.js';

function recordingLlm(reply: string): { fn: (r: LlmRequest) => Promise<string>; calls: LlmRequest[] } {
  const calls: LlmRequest[] = [];
  return { calls, fn: async (r) => { calls.push(r); return reply; } };
}

test('buildGeoQuestion includes name and area', () => {
  assert.equal(buildGeoQuestion('Little Friends', 'Kingston, NY'), 'What do you know about Little Friends in Kingston, NY?');
  assert.equal(buildGeoQuestion('Little Friends'), 'What do you know about Little Friends?');
});

test('gather asks the GEO question and stores the snapshot as evidence', async () => {
  const ds = new InMemoryDataSource();
  const llm = recordingLlm('Little Friends Learning Loft is a play-based preschool in Kingston, NY.');
  const ctx = makeContext({ ds, llm: llm.fn });

  const ev = await geoAdapter.gather(ctx);

  assert.equal(ev.id, 'geo');
  assert.match(llm.calls[0]!.userPrompt, /Little Friends Learning Loft/);
  // Free-text snapshot — no structured-output schema on a GEO calibration query.
  assert.equal(llm.calls[0]!.jsonSchema, undefined);
  assert.ok(ds.written().includes('recon/geo/snapshot.json'));
  assert.match((ev.payload as { answer: string }).answer, /preschool/);
});

test('extract is evidence-only — it produces no schema candidates', async () => {
  const ctx = makeContext();
  const evidence: RawEvidence = { id: 'geo', files: [], payload: { question: 'q', answer: 'a' } };

  const candidates = await geoAdapter.extract(evidence, ctx);

  assert.deepEqual(candidates, []);
});
