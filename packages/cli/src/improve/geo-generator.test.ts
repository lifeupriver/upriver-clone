import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import type { AuditPackage } from '@upriver/core';

import {
  buildFaqJsonLd,
  buildOrganizationJsonLd,
  buildPageTldrs,
  renderLlmsTxt,
} from './geo-generator.js';

/**
 * Build a minimal `AuditPackage` stub with the fields exercised by the
 * GEO generator. Caller-provided overrides are deep-merged at the top
 * level only — that's enough for our tests.
 */
function stubPackage(overrides: Partial<AuditPackage> = {}): AuditPackage {
  const base: AuditPackage = {
    meta: {
      clientName: 'Acme Coffee',
      clientSlug: 'acme',
      siteUrl: 'https://acme.example',
      auditDate: '2026-01-01',
      auditor: 'upriver',
      totalPages: 0,
      totalFindings: 0,
      findingsByPriority: { p0: 0, p1: 0, p2: 0 },
      overallScore: 0,
      scoreByDimension: {},
    },
    brandingProfile: {},
    designSystem: {
      colors: {
        primary: '#000',
        secondary: '#111',
        accent: '#222',
        background: '#fff',
        textPrimary: '#000',
        textSecondary: '#333',
      },
      typography: { headingFont: 'Inter', bodyFont: 'Inter', monoFont: 'mono', scale: {} },
      spacing: { baseUnit: 8, scale: [0, 4, 8], borderRadius: '4px' },
      components: { primaryButton: {}, secondaryButton: {}, inputField: {} },
      logo: '',
      favicon: '',
      colorScheme: 'light',
      personality: [],
    },
    siteStructure: {
      pages: [],
      navigation: { primary: [], footer: [] },
      missingPages: [],
    },
    contentInventory: {
      testimonials: [],
      teamMembers: [],
      faqs: [],
      pricing: [],
      socialLinks: [],
      contactInfo: {},
      eventSpaces: [],
    },
    screenshots: { pages: [] },
    findings: [],
    brandVoiceDraft: {
      tone: '',
      keywords: [],
      bannedWords: [],
      sampleHeadlines: [],
      sampleBodyCopy: [],
      voiceCharacteristics: [],
      audienceDescription: '',
    },
    implementationPlan: {
      phases: [],
      quickWins: [],
      requiresClientInput: [],
      requiresNewContent: [],
      requiresAssets: [],
    },
  };
  return { ...base, ...overrides };
}

describe('buildOrganizationJsonLd', () => {
  it('produces correct @type, name, url, sameAs from a stub package', () => {
    const pkg = stubPackage({
      contentInventory: {
        testimonials: [],
        teamMembers: [],
        faqs: [],
        pricing: [],
        socialLinks: [
          { platform: 'twitter', url: 'https://twitter.com/acme' },
          { platform: 'linkedin', url: 'https://linkedin.com/company/acme' },
        ],
        contactInfo: {},
        eventSpaces: [],
      },
    });
    const org = buildOrganizationJsonLd(pkg);
    assert.equal(org['@context'], 'https://schema.org');
    assert.equal(org['@type'], 'Organization');
    assert.equal(org['name'], 'Acme Coffee');
    assert.equal(org['url'], 'https://acme.example');
    assert.deepEqual(org['sameAs'], [
      'https://twitter.com/acme',
      'https://linkedin.com/company/acme',
    ]);
  });

  it('omits sameAs when no social links are present', () => {
    const org = buildOrganizationJsonLd(stubPackage());
    assert.equal(org['sameAs'], undefined);
  });
});

describe('buildFaqJsonLd', () => {
  it('returns null when there are no FAQs', () => {
    assert.equal(buildFaqJsonLd(stubPackage()), null);
  });

  it('returns an FAQPage with 2 mainEntity items when 2 FAQs exist', () => {
    const pkg = stubPackage({
      contentInventory: {
        testimonials: [],
        teamMembers: [],
        faqs: [
          { question: 'Do you ship?', answer: 'Yes, worldwide.', page: '/faq' },
          { question: 'What roast levels?', answer: 'Light to dark.', page: '/faq' },
        ],
        pricing: [],
        socialLinks: [],
        contactInfo: {},
        eventSpaces: [],
      },
    });
    const out = buildFaqJsonLd(pkg);
    assert.ok(out, 'expected non-null FAQ JSON-LD');
    assert.equal(out['@type'], 'FAQPage');
    const mainEntity = out['mainEntity'] as Array<Record<string, unknown>>;
    assert.equal(mainEntity.length, 2);
    assert.equal(mainEntity[0]?.['@type'], 'Question');
    assert.equal(mainEntity[0]?.['name'], 'Do you ship?');
    const accepted = mainEntity[0]?.['acceptedAnswer'] as Record<string, unknown>;
    assert.equal(accepted['@type'], 'Answer');
    assert.equal(accepted['text'], 'Yes, worldwide.');
  });
});

describe('renderLlmsTxt', () => {
  it('starts with H1 client name, contains homepage URL, and lists at least one page', () => {
    const pkg = stubPackage({
      siteStructure: {
        pages: [
          {
            url: 'https://acme.example/',
            slug: '',
            title: 'Home',
            description: 'Single-origin beans roasted in Brooklyn.',
            wordCount: 800,
            headings: [{ level: 1, text: 'Welcome' }],
            images: [],
            internalLinks: [],
            externalLinks: [],
            ctaButtons: [],
            schemaTypes: [],
            hasCanonical: true,
            statusCode: 200,
          },
          {
            url: 'https://acme.example/about',
            slug: 'about',
            title: 'About',
            description: 'Family-run since 2012.',
            wordCount: 400,
            headings: [],
            images: [],
            internalLinks: [],
            externalLinks: [],
            ctaButtons: [],
            schemaTypes: [],
            hasCanonical: true,
            statusCode: 200,
          },
        ],
        navigation: { primary: [], footer: [] },
        missingPages: [],
      },
    });
    const out = renderLlmsTxt(pkg);
    assert.ok(out.startsWith('# Acme Coffee'), `expected H1; got: ${out.slice(0, 60)}`);
    assert.ok(out.includes('https://acme.example'), 'expected homepage URL in output');
    assert.ok(out.includes('## Pages'), 'expected ## Pages section');
    assert.ok(out.includes('https://acme.example/about'), 'expected about page link');
  });

  it('excludes pages with statusCode >= 400', () => {
    const pkg = stubPackage({
      siteStructure: {
        pages: [
          {
            url: 'https://acme.example/missing',
            slug: 'missing',
            title: 'Missing',
            description: '',
            wordCount: 100,
            headings: [],
            images: [],
            internalLinks: [],
            externalLinks: [],
            ctaButtons: [],
            schemaTypes: [],
            hasCanonical: false,
            statusCode: 404,
          },
        ],
        navigation: { primary: [], footer: [] },
        missingPages: [],
      },
    });
    const out = renderLlmsTxt(pkg);
    assert.ok(!out.includes('/missing'), 'expected 404 page to be omitted');
  });
});

describe('buildPageTldrs', () => {
  it('skips pages with wordCount === 0', () => {
    const pkg = stubPackage({
      siteStructure: {
        pages: [
          {
            url: 'https://acme.example/empty',
            slug: 'empty',
            title: 'Empty',
            description: 'Nothing here yet.',
            wordCount: 0,
            headings: [],
            images: [],
            internalLinks: [],
            externalLinks: [],
            ctaButtons: [],
            schemaTypes: [],
            hasCanonical: false,
            statusCode: 200,
          },
          {
            url: 'https://acme.example/about',
            slug: 'about',
            title: 'About',
            description: 'Family-run since 2012. We roast in Brooklyn.',
            wordCount: 400,
            headings: [],
            images: [],
            internalLinks: [],
            externalLinks: [],
            ctaButtons: [],
            schemaTypes: [],
            hasCanonical: true,
            statusCode: 200,
          },
        ],
        navigation: { primary: [], footer: [] },
        missingPages: [],
      },
    });
    const tldrs = buildPageTldrs(pkg);
    assert.equal(tldrs['empty'], undefined);
    assert.ok(tldrs['about'] && tldrs['about'].length > 0);
  });

  it('truncates long descriptions to <= 280 chars', () => {
    const longDesc =
      'This is sentence one and it is fairly long. ' +
      'This is sentence two and it is also long. ' +
      'Sentence three keeps going on and on. '.repeat(10);
    const pkg = stubPackage({
      siteStructure: {
        pages: [
          {
            url: 'https://acme.example/long',
            slug: 'long',
            title: 'Long',
            description: longDesc,
            wordCount: 1000,
            headings: [],
            images: [],
            internalLinks: [],
            externalLinks: [],
            ctaButtons: [],
            schemaTypes: [],
            hasCanonical: true,
            statusCode: 200,
          },
        ],
        navigation: { primary: [], footer: [] },
        missingPages: [],
      },
    });
    const tldrs = buildPageTldrs(pkg);
    const snippet = tldrs['long'] ?? '';
    assert.ok(snippet.length <= 280, `expected <= 280 chars, got ${snippet.length}`);
    assert.ok(snippet.length > 0, 'expected non-empty snippet');
  });
});
