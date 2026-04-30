import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { buildInventory, summarizeInventory } from './index.js';
import type { PageData } from '../shared/loader.js';

function page(url: string, images: string[]): PageData {
  return {
    url,
    slug: url.replace(/\W/g, '-'),
    scraped_at: new Date().toISOString(),
    metadata: {},
    content: { markdown: '', wordCount: 0, headings: [] },
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
});
