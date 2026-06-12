import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import type { AuditPassResult } from '@upriver/core';

import { buildPackageSkeleton } from './package-skeleton.js';
import type { LoadedPage } from './loader.js';

describe('buildPackageSkeleton', () => {
  it('emits all four scaffold-critical keys given minimal inputs', () => {
    const skeleton = buildPackageSkeleton({
      slug: 'sparse-client',
      config: {},
      pages: [],
      designTokens: null,
      passes: [],
    });

    // The four keys `upriver scaffold` dereferences unconditionally.
    assert.equal(skeleton.meta.clientName, 'sparse-client', 'clientName falls back to slug');
    assert.ok(skeleton.designSystem, 'designSystem present');
    assert.ok(Array.isArray(skeleton.siteStructure.pages), 'siteStructure.pages is an array');
    assert.ok(skeleton.contentInventory, 'contentInventory present');

    // Safe defaults inside each.
    assert.equal(skeleton.designSystem.colors.primary, '#000000');
    assert.equal(skeleton.designSystem.typography.headingFont, 'serif');
    assert.deepEqual(skeleton.siteStructure.navigation, { primary: [], footer: [] });
    assert.deepEqual(skeleton.siteStructure.missingPages, []);
    assert.deepEqual(skeleton.contentInventory.testimonials, []);
    assert.deepEqual(skeleton.contentInventory.faqs, []);
    assert.deepEqual(skeleton.contentInventory.contactInfo, {});
    assert.equal(skeleton.meta.overallScore, 0, 'no passes must not produce NaN');
    assert.equal(skeleton.meta.totalPages, 0);
    assert.deepEqual(skeleton.findings, []);
  });

  it('survives JSON serialization with all four keys intact (no undefined drops)', () => {
    const skeleton = buildPackageSkeleton({
      slug: 'acme',
      config: { name: undefined, url: undefined },
      pages: [],
      designTokens: undefined,
      passes: [],
    });
    const roundTripped = JSON.parse(JSON.stringify(skeleton)) as Record<string, unknown>;
    for (const key of ['meta', 'designSystem', 'siteStructure', 'contentInventory']) {
      assert.ok(key in roundTripped, `${key} survives JSON round-trip`);
    }
    const meta = roundTripped['meta'] as Record<string, unknown>;
    assert.equal(meta['clientName'], 'acme');
    assert.equal(meta['siteUrl'], '');
    const structure = roundTripped['siteStructure'] as Record<string, unknown>;
    assert.ok(Array.isArray(structure['pages']));
  });

  it('derives values from real inputs when present', () => {
    const page: LoadedPage = {
      url: 'https://example.com/about',
      slug: 'about',
      metadata: { title: 'About us' },
      content: { wordCount: 120, headings: [{ level: 1, text: 'About' }] },
      extracted: {
        testimonials: [{ quote: 'Great work', attribution: 'A. Client' }],
        contact: { email: 'hi@example.com' },
      },
    };
    const pass: AuditPassResult = {
      dimension: 'seo',
      score: 80,
      findings: [
        {
          id: 'seo-1',
          dimension: 'seo',
          priority: 'p0',
          effort: 'light',
          title: 'Missing meta description',
          description: 'd',
          why_it_matters: 'w',
          recommendation: 'r',
        },
      ],
    } as AuditPassResult;

    const skeleton = buildPackageSkeleton({
      slug: 'acme',
      config: { name: 'Acme Co', url: 'https://example.com' },
      pages: [page],
      designTokens: { colors: { primary: '#123456' } },
      passes: [pass],
    });

    assert.equal(skeleton.meta.clientName, 'Acme Co');
    assert.equal(skeleton.meta.siteUrl, 'https://example.com');
    assert.equal(skeleton.meta.overallScore, 80);
    assert.equal(skeleton.meta.findingsByPriority.p0, 1);
    assert.equal(skeleton.designSystem.colors.primary, '#123456');
    assert.equal(skeleton.siteStructure.pages.length, 1);
    assert.equal(skeleton.siteStructure.pages[0]?.title, 'About us');
    assert.equal(skeleton.contentInventory.testimonials.length, 1);
    assert.equal(skeleton.contentInventory.contactInfo.email, 'hi@example.com');
    assert.equal(skeleton.findings.length, 1);
  });

  it('tolerates a blank clientName and non-object design tokens', () => {
    const skeleton = buildPackageSkeleton({
      slug: 'fallback-slug',
      config: { name: '   ', url: null },
      pages: [],
      designTokens: 'not-an-object',
      passes: [],
    });
    assert.equal(skeleton.meta.clientName, 'fallback-slug');
    assert.equal(skeleton.designSystem.colors.background, '#ffffff');
    assert.equal(skeleton.designSystem.colorScheme, 'light');
  });
});
