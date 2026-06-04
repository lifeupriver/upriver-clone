import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { FirecrawlScrapeResult } from '@upriver/core';

import {
  WEBSITE_EXTRACTION_SCHEMA,
  WEBSITE_TARGET_PATHS,
  buildWebsiteUserPrompt,
  cleanPageText,
  websiteAdapter,
} from './website.js';
import { InMemoryDataSource, makeContext } from '../testing.js';
import type { LlmRequest, RawEvidence } from '../types.js';

// ── Recorded fixtures (captured shapes; no live calls) ───────────────────────
const HOMEPAGE_MD = [
  '# Little Friends Learning Loft',
  '',
  'A play-based preschool in Kingston, NY.',
  'Call us: (518) 555-0142',
  'Hours: Mon–Fri 7:30am–5:30pm',
  '123 Maple Ave, Kingston, NY 12401',
  '[Instagram](https://instagram.com/littlefriendslearningloft)',
  '',
  '> "Our daughter blossomed here." — A parent',
].join('\n');

const RECORDED_SCRAPE: FirecrawlScrapeResult = {
  url: 'https://littlefriendslearningloft.com',
  markdown: HOMEPAGE_MD,
  links: [{ text: 'Instagram', href: 'https://instagram.com/littlefriendslearningloft' }],
  branding: { colors: { primary: '#3B7A57', secondary: '#F4E1C1', accent: '#E8A33D' } },
  metadata: { title: 'Little Friends Learning Loft', statusCode: 200 },
};

const PAGE_RECORD = {
  url: 'https://littlefriendslearningloft.com',
  slug: 'home',
  content: { markdown: HOMEPAGE_MD, wordCount: 30, headings: [] },
  links: { internal: ['/about'], external: ['https://instagram.com/littlefriendslearningloft'] },
};

const CANNED_LLM = JSON.stringify({
  candidates: [
    { path: 'identity.publicName', value: 'Little Friends Learning Loft', evidence: '# Little Friends Learning Loft' },
    { path: 'identity.phone', value: '(518) 555-0142', evidence: 'Call us: (518) 555-0142' },
    { path: 'identity.hours', value: 'Mon–Fri 7:30am–5:30pm', evidence: 'Hours: Mon–Fri 7:30am–5:30pm' },
    {
      path: 'identity.socialHandles',
      value: [{ platform: 'instagram', handle: 'littlefriendslearningloft', url: 'https://instagram.com/littlefriendslearningloft' }],
      evidence: 'Instagram link',
    },
    { path: 'content.testimonials', value: [{ quote: 'Our daughter blossomed here.', attribution: 'A parent' }], evidence: 'testimonial' },
  ],
});

function recordingLlm(reply: string): { fn: (r: LlmRequest) => Promise<string>; calls: LlmRequest[] } {
  const calls: LlmRequest[] = [];
  return {
    calls,
    fn: async (r: LlmRequest) => {
      calls.push(r);
      return reply;
    },
  };
}

test('cleanPageText drops image/link URLs but keeps the visible text', () => {
  const noisy =
    '![BIKE TO SCHOOL caption](https://cdn.example/huge.jpg?a=1&b=2)\n\n\n\nWe are a play-based [preschool](https://x/p) in Kingston.';
  const cleaned = cleanPageText(noisy);
  assert.ok(!cleaned.includes('http'), 'URLs removed');
  assert.match(cleaned, /BIKE TO SCHOOL caption/); // image alt text kept
  assert.match(cleaned, /play-based preschool in Kingston/); // link text kept
});

test('buildWebsiteUserPrompt leads with metadata and strips noisy URLs', () => {
  const prompt = buildWebsiteUserPrompt([
    {
      url: 'https://x',
      title: 'Little Friends Learning Loft',
      description: 'A play-based preschool',
      markdown: '![alt](https://cdn/huge.jpg) We run mixed-age programs.',
      links: [],
    },
  ]);
  assert.match(prompt, /Little Friends Learning Loft/); // metadata title surfaced
  assert.match(prompt, /A play-based preschool/);
  assert.ok(!prompt.includes('https://cdn/huge.jpg')); // image URL stripped
  assert.match(prompt, /We run mixed-age programs/);
});

test('gather scrapes the URL (main content only) and persists evidence when no pages/ exist', async () => {
  const ds = new InMemoryDataSource();
  const optionsSeen: Array<Record<string, unknown>> = [];
  const ctx = makeContext({
    ds,
    scrape: async (_url, options) => {
      optionsSeen.push(options as unknown as Record<string, unknown>);
      return RECORDED_SCRAPE;
    },
  });

  const ev = await websiteAdapter.gather(ctx);

  assert.equal(ev.id, 'website');
  const payload = ev.payload as { mode: string; pages: { markdown: string }[] };
  assert.equal(payload.mode, 'scraped');
  assert.match(payload.pages[0]!.markdown, /Little Friends Learning Loft/);
  // Boilerplate-stripping scrape so the LLM prompt is not drowned in nav/cart noise.
  assert.equal(optionsSeen[0]?.['onlyMainContent'], true);
  // Evidence written under recon/website/.
  assert.ok(ds.written().includes('recon/website/homepage.json'));
  assert.ok(ds.written().includes('recon/website/source.json'));
  assert.ok(ev.files.includes('recon/website/homepage.json'));
});

test('gather reuses pages/ records instead of scraping (no --fresh)', async () => {
  const ds = new InMemoryDataSource();
  await ds.writeClientFile('lf', 'pages/home.json', JSON.stringify(PAGE_RECORD));
  // scrape is left as the default throwing stub — calling it would fail the test.
  const ctx = makeContext({ ds });

  const ev = await websiteAdapter.gather(ctx);

  const payload = ev.payload as { mode: string; pages: { markdown: string }[] };
  assert.equal(payload.mode, 'reused');
  assert.equal(payload.pages.length, 1);
  assert.match(payload.pages[0]!.markdown, /Little Friends Learning Loft/);
  assert.ok(ds.written().includes('recon/website/source.json'));
});

test('--fresh forces a re-scrape even when pages/ exist', async () => {
  const ds = new InMemoryDataSource();
  await ds.writeClientFile('lf', 'pages/home.json', JSON.stringify(PAGE_RECORD));
  let scraped = false;
  const ctx = makeContext({
    ds,
    fresh: true,
    scrape: async () => {
      scraped = true;
      return RECORDED_SCRAPE;
    },
  });

  const ev = await websiteAdapter.gather(ctx);

  assert.equal(scraped, true);
  assert.equal((ev.payload as { mode: string }).mode, 'scraped');
});

test('extract emits a deterministic palette candidate plus the LLM candidates', async () => {
  const llm = recordingLlm(CANNED_LLM);
  const ctx = makeContext({ llm: llm.fn });
  const evidence: RawEvidence = {
    id: 'website',
    files: [],
    payload: {
      mode: 'scraped',
      pages: [
        { url: RECORDED_SCRAPE.url, markdown: HOMEPAGE_MD, links: [], branding: RECORDED_SCRAPE.branding },
      ],
    },
  };

  const candidates = await websiteAdapter.extract(evidence, ctx);

  // Every candidate is a recon candidate.
  assert.ok(candidates.every((c) => c.source === 'recon'));
  // Deterministic visual brand palette from branding.colors.
  const palette = candidates.find((c) => c.path === 'content.visualBrandAssets');
  assert.ok(palette, 'expected a palette candidate');
  assert.deepEqual((palette!.value as { palette: string[] }).palette.sort(), ['#3B7A57', '#E8A33D', '#F4E1C1']);
  assert.equal(palette!.confidence, 'low');
  // LLM-derived candidates carried through.
  assert.equal(candidates.find((c) => c.path === 'identity.publicName')?.value, 'Little Friends Learning Loft');
  assert.equal(candidates.find((c) => c.path === 'identity.phone')?.confidence, 'medium');

  // The LLM was invoked with the structured schema and the page content.
  assert.equal(llm.calls.length, 1);
  assert.deepEqual(llm.calls[0]!.jsonSchema, WEBSITE_EXTRACTION_SCHEMA);
  assert.match(llm.calls[0]!.userPrompt, /Little Friends Learning Loft/);
  assert.ok(WEBSITE_TARGET_PATHS.includes('identity.publicName'));
});
