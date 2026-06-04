import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FirecrawlScrapeResult } from '@upriver/core';
import { createEmptyProfile, type ClientProfile, type ProfileField } from '@upriver/schemas';

import {
  GBP_EXTRACTION_SCHEMA,
  areaFromProfile,
  gbpAdapter,
  mapsSearchUrl,
} from './gbp.js';
import { InMemoryDataSource, makeContext } from '../testing.js';
import type { LlmRequest, RawEvidence, ScrapeFn } from '../types.js';

const NOW = '2026-06-04T12:00:00.000Z';

const LISTING_MD = [
  'Little Friends Learning Loft',
  'Preschool in Kingston, NY',
  '4.9 ★ (42 reviews)',
  'Hours: Mon–Fri 7:30am–5:30pm',
  '(518) 555-0142 · 123 Maple Ave, Kingston, NY 12401',
].join('\n');

const RECORDED: FirecrawlScrapeResult = {
  url: 'https://www.google.com/maps/search/x',
  markdown: LISTING_MD,
  metadata: { title: 'Little Friends Learning Loft - Google Maps', statusCode: 200 },
};

const CANNED_LLM = JSON.stringify({
  candidates: [
    { path: 'identity.hours', value: 'Mon–Fri 7:30am–5:30pm', evidence: 'Hours: ...' },
    { path: 'content.reviewPlatforms', value: [{ platform: 'Google', count: 42, rating: 4.9 }], evidence: '4.9 ★ (42 reviews)' },
    { path: 'identity.gbp', value: { url: 'https://maps.google.com/?cid=1', status: 'claimed' }, evidence: 'listing' },
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
function profileWithGbp(url: string): ClientProfile {
  const p = createEmptyProfile('lf', NOW) as any;
  p.identity = { gbp: { value: { url }, source: 'operator', confidence: null, verified: false, updatedAt: NOW } as ProfileField<{ url: string }> };
  return p as ClientProfile;
}
/* eslint-enable @typescript-eslint/no-explicit-any */

test('mapsSearchUrl builds a query from name + area', () => {
  assert.match(mapsSearchUrl('Little Friends', 'Kingston, NY'), /google\.com\/maps\/search\//);
  assert.ok(mapsSearchUrl('Little Friends', 'Kingston, NY').includes(encodeURIComponent('Little Friends Kingston, NY')));
});

test('areaFromProfile prefers serviceArea, falls back to city/state', () => {
  const field = <T>(value: T): ProfileField<T> => ({ value, source: 'recon', confidence: null, verified: false, updatedAt: NOW });
  assert.equal(areaFromProfile(undefined), undefined);
  assert.equal(areaFromProfile({ serviceArea: field('Ulster County, NY') } as any), 'Ulster County, NY');
  assert.equal(areaFromProfile({ primaryAddress: field({ city: 'Kingston', state: 'NY' }) } as any), 'Kingston, NY');
});

test('gather scrapes a Maps search URL when no GBP url is known, and persists evidence', async () => {
  const ds = new InMemoryDataSource();
  const scrape = recordingScrape(RECORDED);
  const ctx = makeContext({ ds, scrape: scrape.fn });

  const ev = await gbpAdapter.gather(ctx);

  assert.equal(ev.id, 'gbp');
  assert.match(scrape.urls[0]!, /google\.com\/maps\/search\//);
  assert.ok(ds.written().includes('recon/gbp/listing.json'));
  assert.ok(ev.files.includes('recon/gbp/listing.json'));
});

test('gather uses a known GBP url from the profile when present', async () => {
  const ds = new InMemoryDataSource();
  const scrape = recordingScrape(RECORDED);
  const ctx = makeContext({ ds, scrape: scrape.fn, profile: profileWithGbp('https://maps.google.com/?cid=99') });

  await gbpAdapter.gather(ctx);

  assert.equal(scrape.urls[0], 'https://maps.google.com/?cid=99');
});

test('extract turns the listing into recon candidates', async () => {
  const llm = recordingLlm(CANNED_LLM);
  const ctx = makeContext({ llm: llm.fn });
  const evidence: RawEvidence = { id: 'gbp', files: [], payload: { url: RECORDED.url, markdown: LISTING_MD } };

  const candidates = await gbpAdapter.extract(evidence, ctx);

  assert.ok(candidates.every((c) => c.source === 'recon'));
  assert.equal(candidates.find((c) => c.path === 'content.reviewPlatforms')?.confidence, 'medium');
  assert.equal(candidates.find((c) => c.path === 'identity.gbp')?.confidence, 'low');
  assert.deepEqual(llm.calls[0]!.jsonSchema, GBP_EXTRACTION_SCHEMA);
  assert.match(llm.calls[0]!.userPrompt, /reviews/);
});
