import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import type { AuditFinding, AuditPassResult } from '@upriver/core';

import type { LoadedPage } from './loader.js';
import { computeImpactMetrics } from './impact-metrics.js';

function finding(overrides: Partial<AuditFinding> & Pick<AuditFinding, 'id'>): AuditFinding {
  return {
    dimension: 'seo',
    priority: 'p2',
    effort: 'light',
    title: 'stub',
    description: 'stub',
    why_it_matters: 'stub',
    recommendation: 'stub',
    ...overrides,
  };
}

function pageWithWordCount(slug: string, wc: number | undefined): LoadedPage {
  const page: LoadedPage = {
    url: `https://example.com/${slug}`,
    slug,
  };
  if (wc !== undefined) {
    page.content = { wordCount: wc };
  } else {
    page.content = {};
  }
  return page;
}

const noPasses: AuditPassResult[] = [];
const noScores: Record<string, number> = {};

describe('computeImpactMetrics', () => {
  it('returns three zero-valued metrics for empty findings and pages', () => {
    const result = computeImpactMetrics({
      passes: noPasses,
      findings: [],
      pages: [],
      scoreByDimension: noScores,
    });

    assert.equal(result.metrics.length, 3);
    assert.equal(result.metrics[0]?.key, 'criticalIssues');
    assert.equal(result.metrics[0]?.value, 0);
    assert.equal(result.metrics[1]?.key, 'thinPages');
    assert.equal(result.metrics[1]?.value, 0);
    assert.equal(result.metrics[1]?.display, '0 pages');
    assert.equal(result.metrics[2]?.key, 'searchVisibilityIssues');
    assert.equal(result.metrics[2]?.value, 0);
    assert.ok(typeof result.generatedAt === 'string' && result.generatedAt.length > 0);
  });

  it('counts p0 for criticalIssues and seo/aeo/schema p0+p1 for searchVisibilityIssues', () => {
    const findings: AuditFinding[] = [
      finding({ id: '1', dimension: 'seo', priority: 'p0' }),
      finding({ id: '2', dimension: 'aeo', priority: 'p1' }),
      finding({ id: '3', dimension: 'schema', priority: 'p2' }),
      finding({ id: '4', dimension: 'content', priority: 'p0' }),
      finding({ id: '5', dimension: 'design', priority: 'p1' }),
      finding({ id: '6', dimension: 'seo', priority: 'p1' }),
      finding({ id: '7', dimension: 'sales', priority: 'p2' }),
    ];

    const result = computeImpactMetrics({
      passes: noPasses,
      findings,
      pages: [],
      scoreByDimension: noScores,
    });

    const critical = result.metrics.find((m) => m.key === 'criticalIssues');
    const search = result.metrics.find((m) => m.key === 'searchVisibilityIssues');

    // p0 findings: ids 1 and 4
    assert.equal(critical?.value, 2);
    // seo/aeo/schema with p0|p1: ids 1, 2, 6 (3 excluded — p2)
    assert.equal(search?.value, 3);
  });

  it('counts pages with 1-299 wordCount as thin, excluding 0 and undefined', () => {
    const pages: LoadedPage[] = [
      pageWithWordCount('a', 50),
      pageWithWordCount('b', 250),
      pageWithWordCount('c', 350),
      pageWithWordCount('d', undefined),
      pageWithWordCount('e', 0),
    ];

    const result = computeImpactMetrics({
      passes: noPasses,
      findings: [],
      pages,
      scoreByDimension: noScores,
    });

    const thin = result.metrics.find((m) => m.key === 'thinPages');
    assert.equal(thin?.value, 2);
    assert.equal(thin?.display, '2 pages');
  });
});
