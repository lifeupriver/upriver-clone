import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { detectExpectedPages, detectFeatures } from './index.js';
import type { PageData } from '../shared/loader.js';

function page(opts: Partial<PageData> & { url: string; slug: string }): PageData {
  return {
    url: opts.url,
    slug: opts.slug,
    scraped_at: new Date().toISOString(),
    metadata: opts.metadata ?? {},
    content: opts.content ?? { markdown: '', wordCount: 0, headings: [] },
    links: opts.links ?? { internal: [], external: [] },
    images: opts.images ?? [],
    screenshots: opts.screenshots ?? { desktop: null, mobile: null },
    extracted: opts.extracted ?? {
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

describe('gap analysis', () => {
  it('flags missing expected pages for a preschool', () => {
    const pages = [page({ url: 'https://test.com/', slug: 'home' })];
    const expected = detectExpectedPages(pages, 'preschool');
    const missingLabels = expected.filter((e) => !e.matchedUrl).map((e) => e.label);
    assert.ok(missingLabels.some((l) => /admissions|enrollment/i.test(l)));
    assert.ok(missingLabels.some((l) => /tuition|pricing/i.test(l)));
  });

  it('matches an admissions page when present', () => {
    const pages = [
      page({ url: 'https://test.com/', slug: 'home' }),
      page({ url: 'https://test.com/admissions', slug: 'admissions' }),
    ];
    const expected = detectExpectedPages(pages, 'preschool');
    const adm = expected.find((e) => /admissions|enrollment/i.test(e.label));
    assert.equal(adm?.matchedUrl, 'https://test.com/admissions');
  });

  it('detects phone number presence via extracted contact', () => {
    const pages = [
      page({
        url: 'https://test.com/',
        slug: 'home',
        extracted: {
          ctaButtons: [],
          contact: { phone: '555-555-5555' },
          teamMembers: [],
          testimonials: [],
          faqs: [],
          pricing: [],
          socialLinks: [],
          eventSpaces: [],
        },
      }),
    ];
    const features = detectFeatures(pages, 'preschool');
    assert.ok(features.present.has('phone_number_visible'));
  });

  it('flags missing booking calendar for a wedding venue', () => {
    const pages = [page({ url: 'https://test.com/', slug: 'home' })];
    const features = detectFeatures(pages, 'wedding-venue');
    assert.ok(features.missing.includes('booking_calendar') || features.missing.includes('tour_booking'));
  });
});
