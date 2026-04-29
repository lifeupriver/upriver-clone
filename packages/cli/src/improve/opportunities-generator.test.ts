import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import type { AuditPackage } from '@upriver/core';

import { generateOpportunities } from './opportunities-generator.js';

function basePkg(overrides: Partial<AuditPackage> = {}): AuditPackage {
  return {
    meta: {
      clientName: 'Test Co',
      siteUrl: 'https://test.example',
      generatedAt: '2026-01-01T00:00:00Z',
      overallScore: 70,
      methodologyVersion: '1',
    },
    siteStructure: {
      pages: [],
      navigation: { primary: [], footer: [] },
      missingPages: [],
    },
    findings: [],
    contentInventory: {
      testimonials: [],
      teamMembers: [],
      faqs: [],
      pricing: [],
      socialLinks: [],
      contactInfo: {},
      eventSpaces: [],
    },
    designSystem: {} as never,
    screenshots: { desktop: [], mobile: [] },
    brandVoice: {} as never,
    impactMetrics: {} as never,
    quickWins: [],
    implementationPlan: {} as never,
    ...overrides,
  } as AuditPackage;
}

describe('opportunities-generator', () => {
  it('reports zero counts and a header on an empty package', () => {
    const r = generateOpportunities(basePkg());
    assert.match(r.body, /^# Improvement opportunities — Test Co/);
    assert.equal(r.counts.missingPages, 0);
    assert.equal(r.counts.pillarCandidates, 0);
    assert.equal(r.counts.contentFindings, 0);
    assert.match(r.body, /_None flagged by the audit\._/);
  });

  it('renders missing pages from siteStructure.missingPages', () => {
    const r = generateOpportunities(
      basePkg({
        siteStructure: {
          pages: [],
          navigation: { primary: [], footer: [] },
          missingPages: [
            { pageType: 'Pricing', priority: 'p0', reason: 'No pricing visible' },
            { pageType: 'FAQ', priority: 'p1', reason: 'Top questions unanswered' },
          ],
        },
      }),
    );
    assert.equal(r.counts.missingPages, 2);
    assert.match(r.body, /\| Pricing \| P0 \| No pricing visible \|/);
    assert.match(r.body, /\| FAQ \| P1 \| Top questions unanswered \|/);
  });

  it('treats long pages with 3+ H2s as pillar candidates', () => {
    const r = generateOpportunities(
      basePkg({
        siteStructure: {
          pages: [
            {
              url: 'https://test.example/services',
              slug: 'services',
              title: 'Services',
              description: '',
              wordCount: 1200,
              headings: [
                { level: 1, text: 'Services' },
                { level: 2, text: 'Weddings' },
                { level: 2, text: 'Corporate' },
                { level: 2, text: 'Private events' },
              ],
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
      }),
    );
    assert.equal(r.counts.pillarCandidates, 1);
    assert.match(r.body, /Services — `\/services`/);
    assert.match(r.body, /- Weddings/);
    assert.match(r.body, /- Corporate/);
  });

  it('matches content findings whose recommendation suggests new pages', () => {
    const r = generateOpportunities(
      basePkg({
        findings: [
          {
            id: 'content-001',
            dimension: 'content',
            priority: 'p1',
            effort: 'medium',
            title: 'Missing FAQ',
            description: 'No Q&A for top intents.',
            why_it_matters: 'AI search readiness.',
            recommendation: 'Create a dedicated FAQ page with 20 entries.',
          },
          {
            id: 'design-001',
            dimension: 'design',
            priority: 'p0',
            effort: 'light',
            title: 'Bad typography',
            description: '',
            why_it_matters: '',
            recommendation: 'Adjust line heights.',
          },
        ],
      }),
    );
    assert.equal(r.counts.contentFindings, 1);
    assert.match(r.body, /content-001/);
    assert.doesNotMatch(r.body, /design-001/);
  });
});
