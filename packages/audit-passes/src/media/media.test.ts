import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { buildInventory, summarizeInventory } from './index.js';
import type { PageData } from '../shared/loader.js';

function page(url: string, images: string[], markdown = ''): PageData {
  return {
    url,
    slug: url.replace(/\W/g, '-'),
    scraped_at: new Date().toISOString(),
    metadata: {},
    content: { markdown, wordCount: 0, headings: [] },
    links: { internal: [], external: [] },
    images,
    screenshots: { desktop: null, mobile: null },
    extracted: {
      ctaButtons: [],
      contact: {},
      teamMembers: [],
      testimonials: [],
      faqs: [],
      pricing: [],
      socialLinks: [],
      eventSpaces: [],
    },
    rawHtmlPath: null,
    hasBranding: false,
  };
}

describe('media audit inventory', () => {
  it('classifies obvious stock CDN urls as stock-suspect', () => {
    const records = buildInventory([
      page('https://example.com/about', ['https://images.unsplash.com/photo-123.jpg']),
    ]);
    assert.equal(records.length, 1);
    assert.equal(records[0]?.classification, 'stock-suspect');
  });

  it('classifies logo filenames as logo', () => {
    const records = buildInventory([page('https://example.com/', ['https://example.com/assets/site-logo.svg'])]);
    assert.equal(records[0]?.classification, 'logo');
  });

  it('marks DSC-style camera imports as authentic', () => {
    const records = buildInventory([page('https://example.com/gallery', ['https://example.com/images/DSC04812.jpg'])]);
    assert.equal(records[0]?.classification, 'authentic');
  });

  it('summarizes counts by classification', () => {
    const records = buildInventory([
      page('https://example.com/', [
        'https://images.unsplash.com/a.jpg',
        'https://example.com/logo.svg',
        'https://example.com/img/team-portrait-2024.jpg',
        'https://example.com/img/random.jpg',
      ]),
    ]);
    const s = summarizeInventory(records);
    assert.equal(s.total, 4);
    assert.equal(s.byClassification['stock-suspect'], 1);
    assert.equal(s.byClassification['logo'], 1);
    assert.equal(s.byClassification['authentic'], 1);
    assert.equal(s.byClassification['unknown'], 1);
  });

  it('deduplicates images repeated across pages', () => {
    const shared = 'https://example.com/img/hero.jpg';
    const records = buildInventory([page('https://example.com/a', [shared]), page('https://example.com/b', [shared])]);
    assert.equal(records.length, 1);
  });

  // ── Regression: WordPress uploads are the client's OWN photos ─────────────
  // /wp-content/uploads/YYYY/MM/... used to be in STOCK_URL_PATTERNS, so most
  // real WordPress sites got a false "stock-photo candidates" P0 (plus a
  // photography upsell) about their own photography.
  it('does NOT classify wp-content uploads as stock-suspect', () => {
    const records = buildInventory([
      page('https://example.com/', [
        'https://example.com/wp-content/uploads/2023/06/storefront-1.jpg',
        'https://example.com/wp-content/uploads/2024/11/owner-with-customers_2.png',
      ]),
    ]);
    for (const r of records) {
      assert.notEqual(r.classification, 'stock-suspect', `${r.url} wrongly flagged as stock`);
    }
  });

  it('still classifies genuinely-stock URLs and filename tokens as stock-suspect', () => {
    const stockUrls = [
      'https://www.shutterstock.com/image-photo/smiling-team-260nw-1290374915.jpg',
      'https://example.com/wp-content/uploads/2023/06/shutterstock_1290374915.jpg',
      'https://media.istockphoto.com/id/1357365823/photo/office.jpg',
      'https://example.com/assets/iStock-1357365823.jpg',
      'https://stock.adobe.com/123456789/preview.jpg',
      'https://example.com/img/AdobeStock_404921002.jpeg',
      'https://example.com/media/stock-photo-happy-clients.jpg',
    ];
    const records = buildInventory([page('https://example.com/', stockUrls)]);
    for (const r of records) {
      assert.equal(r.classification, 'stock-suspect', `${r.url} should be stock-suspect`);
    }
  });

  // ── Alt text: derived from markdown, honest null when unknown ─────────────
  it('reads alt presence from markdown image syntax', () => {
    const url = 'https://example.com/img/patio.jpg';
    const records = buildInventory([
      page('https://example.com/', [url], `![String-lit patio at dusk](${url})`),
    ]);
    assert.equal(records[0]?.has_alt, true);
  });

  it('marks markdown images with empty alt as has_alt=false', () => {
    const url = 'https://example.com/img/patio.jpg';
    const records = buildInventory([page('https://example.com/', [url], `![](${url})`)]);
    assert.equal(records[0]?.has_alt, false);
  });

  it('uses null (not false) when an image never appears in markdown', () => {
    const records = buildInventory([
      page('https://example.com/', ['https://example.com/img/from-raw-html.jpg'], 'No images in markdown.'),
    ]);
    assert.equal(records[0]?.has_alt, null);
  });

  it('matches markdown and <img> variants of the same asset across query strings', () => {
    const records = buildInventory([
      page(
        'https://example.com/',
        ['https://cdn.example.com/v1/abc/hero.jpg?format=1500w'],
        '![Bakehouse loft at golden hour](https://cdn.example.com/v1/abc/hero.jpg?format=300w)',
      ),
    ]);
    assert.equal(records[0]?.has_alt, true);
  });

  it('does not apply the missing-alt quality penalty when alt is unknown', () => {
    const unknownAlt = buildInventory([
      page('https://example.com/', ['https://example.com/img/team-portrait-2024.jpg'], ''),
    ]);
    const knownMissing = buildInventory([
      page(
        'https://example.com/',
        ['https://example.com/img/team-portrait-2024.jpg'],
        '![](https://example.com/img/team-portrait-2024.jpg)',
      ),
    ]);
    const unknownScore = unknownAlt[0]?.quality_score ?? 0;
    const missingScore = knownMissing[0]?.quality_score ?? 0;
    assert.ok(
      unknownScore > missingScore,
      `unknown alt (${unknownScore}) must not be penalized like known-missing alt (${missingScore})`,
    );
  });
});
