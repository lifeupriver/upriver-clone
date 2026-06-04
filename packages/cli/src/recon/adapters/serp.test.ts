import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProfile, type ClientProfile, type ProfileField } from '@upriver/schemas';

import { SERP_EXTRACTION_SCHEMA, serpAdapter } from './serp.js';
import { InMemoryDataSource, makeContext } from '../testing.js';
import type { LlmRequest, RawEvidence, SearchFn, SearchResult } from '../types.js';

const NOW = '2026-06-04T12:00:00.000Z';

const RESULTS: SearchResult[] = [
  { title: 'Bright Beginnings Preschool', url: 'https://brightbeginnings.example', description: 'Kingston preschool' },
  { title: 'Yelp: Best Preschools in Kingston', url: 'https://yelp.com/x', description: 'directory' },
];

const CANNED_LLM = JSON.stringify({
  candidates: [
    {
      path: 'competitors.direct',
      value: [{ name: 'Bright Beginnings Preschool', site: 'https://brightbeginnings.example' }],
      evidence: 'search result #1',
    },
  ],
});

function recordingSearch(reply: SearchResult[]): { fn: SearchFn; queries: string[] } {
  const queries: string[] = [];
  return { queries, fn: async (q: string) => { queries.push(q); return reply; } };
}
function recordingLlm(reply: string): { fn: (r: LlmRequest) => Promise<string>; calls: LlmRequest[] } {
  const calls: LlmRequest[] = [];
  return { calls, fn: async (r) => { calls.push(r); return reply; } };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const field = <T>(value: T): ProfileField<T> => ({ value, source: 'recon', confidence: 'low', verified: false, updatedAt: NOW });
function profileWith(fields: Record<string, ProfileField<unknown>>): ClientProfile {
  const p = createEmptyProfile('lf', NOW) as any;
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

test('gather searches category + area and persists results', async () => {
  const ds = new InMemoryDataSource();
  const search = recordingSearch(RESULTS);
  const ctx = makeContext({
    ds,
    search: search.fn,
    profile: profileWith({ 'identity.category': field('preschool'), 'identity.serviceArea': field('Kingston, NY') }),
  });

  const ev = await serpAdapter.gather(ctx);

  assert.equal(search.queries[0], 'preschool Kingston, NY');
  assert.ok(ds.written().includes('recon/serp/results.json'));
  assert.equal((ev.payload as { results: SearchResult[] }).results.length, 2);
});

test('extract proposes competitors.direct only when the section is empty', async () => {
  const llm = recordingLlm(CANNED_LLM);
  const ctx = makeContext({ llm: llm.fn });
  const evidence: RawEvidence = { id: 'serp', files: [], payload: { query: 'preschool Kingston, NY', results: RESULTS } };

  const candidates = await serpAdapter.extract(evidence, ctx);

  const direct = candidates.find((c) => c.path === 'competitors.direct');
  assert.ok(direct);
  assert.equal(direct!.source, 'recon');
  assert.equal(direct!.confidence, 'low');
  assert.deepEqual(llm.calls[0]!.jsonSchema, SERP_EXTRACTION_SCHEMA);
});

test('extract is evidence-only (no LLM call) when competitors.direct is already filled', async () => {
  // llm left as the throwing default — calling it would fail the test.
  const ctx = makeContext({
    profile: profileWith({ 'competitors.direct': field([{ name: 'Existing Competitor' }]) }),
  });
  const evidence: RawEvidence = { id: 'serp', files: [], payload: { query: 'q', results: RESULTS } };

  const candidates = await serpAdapter.extract(evidence, ctx);

  assert.deepEqual(candidates, []);
});
