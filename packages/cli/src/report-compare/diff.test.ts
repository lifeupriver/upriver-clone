import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import type { AuditFinding, AuditPackage } from '@upriver/core';

import { compareAudits, renderCompareMarkdown } from './diff.js';

function f(id: string, dim: string, priority: 'p0' | 'p1' | 'p2' = 'p1'): AuditFinding {
  return {
    id,
    dimension: dim,
    priority,
    effort: 'medium',
    title: `Finding ${id}`,
    description: '',
    why_it_matters: '',
    recommendation: '',
  };
}

function pkg(score: number, findings: AuditFinding[]): AuditPackage {
  return {
    meta: {
      clientName: 'Test',
      siteUrl: 'https://test.example',
      generatedAt: '2026-01-01T00:00:00Z',
      overallScore: score,
      methodologyVersion: '1',
    },
    siteStructure: { pages: [], navigation: { primary: [], footer: [] }, missingPages: [] },
    findings,
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
  } as unknown as AuditPackage;
}

describe('report-compare/diff', () => {
  it('computes overall delta and finding churn', () => {
    const before = pkg(60, [f('seo-001', 'seo', 'p0'), f('content-001', 'content'), f('design-002', 'design')]);
    const after = pkg(75, [f('content-001', 'content'), f('design-002', 'design'), f('aeo-009', 'aeo', 'p2')]);
    const r = compareAudits(before, after);
    assert.equal(r.overallBefore, 60);
    assert.equal(r.overallAfter, 75);
    assert.equal(r.overallDelta, 15);
    assert.deepEqual(
      r.findings.closed.map((x) => x.id),
      ['seo-001'],
    );
    assert.deepEqual(
      r.findings.added.map((x) => x.id),
      ['aeo-009'],
    );
    assert.equal(r.findings.unchanged.length, 2);
  });

  it('emits one DimensionDelta per dimension across both inputs', () => {
    const before = pkg(50, [f('a-1', 'seo'), f('a-2', 'seo')]);
    const after = pkg(70, [f('b-1', 'content')]);
    const r = compareAudits(before, after);
    const dims = r.dimensions.map((d) => d.dimension).sort();
    assert.deepEqual(dims, ['content', 'seo']);
    const seo = r.dimensions.find((d) => d.dimension === 'seo')!;
    assert.equal(seo.countBefore, 2);
    assert.equal(seo.countAfter, 0);
    assert.equal(seo.scoreAfter, 90);
  });

  it('renders a markdown report with stable structure', () => {
    const before = pkg(60, [f('seo-001', 'seo', 'p0')]);
    const after = pkg(70, [f('seo-001', 'seo', 'p0'), f('aeo-009', 'aeo', 'p1')]);
    const md = renderCompareMarkdown(compareAudits(before, after));
    assert.match(md, /^# Audit comparison/);
    assert.match(md, /\*\*Overall score:\*\* 60 → 70 \(\+10\)/);
    assert.match(md, /## Per-dimension/);
    assert.match(md, /aeo-009/);
  });
});
