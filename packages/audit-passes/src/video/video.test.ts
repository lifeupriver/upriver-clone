import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { classifyPageContext, suggestVideosForPage, VIDEO_CATALOG } from './index.js';
import type { PageData } from '../shared/loader.js';

function page(url: string, slug: string): PageData {
  return {
    url,
    slug,
    scraped_at: new Date().toISOString(),
    metadata: {},
    content: { markdown: '', wordCount: 0, headings: [] },
    links: { internal: [], external: [] },
    images: [],
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

describe('video audit', () => {
  it('classifies the homepage as home context', () => {
    assert.equal(classifyPageContext(page('https://x.com/', 'home')), 'home');
  });

  it('classifies an about page as about', () => {
    assert.equal(classifyPageContext(page('https://x.com/about', 'about')), 'about');
  });

  it('suggests brand_film as a top option for the homepage of a wedding venue', () => {
    const sugs = suggestVideosForPage(page('https://x.com/', 'home'), 'wedding-venue');
    const ids = sugs.map((s) => s.videoTypeId);
    assert.ok(ids.includes('brand_film'));
  });

  it('does not suggest faq_video for non-faq pages', () => {
    const sugs = suggestVideosForPage(page('https://x.com/', 'home'), 'preschool');
    assert.ok(!sugs.map((s) => s.videoTypeId).includes('faq_video'));
  });

  it('returns at most 3 suggestions per page', () => {
    const sugs = suggestVideosForPage(page('https://x.com/', 'home'), 'restaurant');
    assert.ok(sugs.length <= 3);
  });

  it('has a complete catalog with 10 video types', () => {
    assert.equal(Object.keys(VIDEO_CATALOG).length, 10);
  });
});
