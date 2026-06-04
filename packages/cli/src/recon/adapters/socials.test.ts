import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FirecrawlScrapeResult } from '@upriver/core';
import { createEmptyProfile, type ClientProfile, type ProfileField } from '@upriver/schemas';

import { SOCIALS_EXTRACTION_SCHEMA, socialsAdapter } from './socials.js';
import { InMemoryDataSource, makeContext } from '../testing.js';
import type { LlmRequest, RawEvidence, ScrapeFn } from '../types.js';

const NOW = '2026-06-04T12:00:00.000Z';

const IG_MD = 'Little Friends Learning Loft\n1,204 followers · 312 posts\nLatest: field trip photos';

const CANNED_LLM = JSON.stringify({
  candidates: [
    {
      path: 'identity.socialHandles',
      value: [{ platform: 'instagram', handle: 'littlefriendslearningloft', url: 'https://instagram.com/littlefriendslearningloft' }],
      evidence: 'instagram ~1.2k followers, recent posts',
    },
  ],
});

function recordingScrape(reply: FirecrawlScrapeResult): { fn: ScrapeFn; urls: string[] } {
  const urls: string[] = [];
  return { urls, fn: async (url: string) => { urls.push(url); return { ...reply, url }; } };
}
function recordingLlm(reply: string): { fn: (r: LlmRequest) => Promise<string>; calls: LlmRequest[] } {
  const calls: LlmRequest[] = [];
  return { calls, fn: async (r) => { calls.push(r); return reply; } };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function profileWithHandles(handles: unknown[]): ClientProfile {
  const p = createEmptyProfile('lf', NOW) as any;
  p.identity = {
    socialHandles: { value: handles, source: 'recon', confidence: 'low', verified: false, updatedAt: NOW } as ProfileField<unknown[]>,
  };
  return p as ClientProfile;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

test('gather scrapes each profile handle and persists evidence', async () => {
  const ds = new InMemoryDataSource();
  const scrape = recordingScrape({ url: 'x', markdown: IG_MD, metadata: {} });
  const ctx = makeContext({
    ds,
    scrape: scrape.fn,
    profile: profileWithHandles([{ platform: 'instagram', handle: 'lf', url: 'https://instagram.com/lf' }]),
  });

  const ev = await socialsAdapter.gather(ctx);

  assert.equal(scrape.urls[0], 'https://instagram.com/lf');
  assert.equal((ev.payload as { profiles: unknown[] }).profiles.length, 1);
  assert.ok(ds.written().includes('recon/socials/instagram.json'));
});

test('gather is a no-op (no scrape) when the profile has no handles', async () => {
  const ds = new InMemoryDataSource();
  // scrape left as the throwing default — must not be called.
  const ctx = makeContext({ ds });

  const ev = await socialsAdapter.gather(ctx);

  assert.equal((ev.payload as { profiles: unknown[] }).profiles.length, 0);
});

test('extract confirms handles as a low-confidence recon candidate', async () => {
  const llm = recordingLlm(CANNED_LLM);
  const ctx = makeContext({ llm: llm.fn });
  const evidence: RawEvidence = {
    id: 'socials',
    files: [],
    payload: { profiles: [{ platform: 'instagram', url: 'https://instagram.com/lf', markdown: IG_MD }] },
  };

  const candidates = await socialsAdapter.extract(evidence, ctx);

  const handles = candidates.find((c) => c.path === 'identity.socialHandles');
  assert.ok(handles);
  assert.equal(handles!.source, 'recon');
  assert.equal(handles!.confidence, 'low');
  assert.deepEqual(llm.calls[0]!.jsonSchema, SOCIALS_EXTRACTION_SCHEMA);
});

test('extract makes no LLM call when there are no profiles', async () => {
  const ctx = makeContext(); // llm is the throwing default
  const evidence: RawEvidence = { id: 'socials', files: [], payload: { profiles: [] } };

  const candidates = await socialsAdapter.extract(evidence, ctx);

  assert.deepEqual(candidates, []);
});
