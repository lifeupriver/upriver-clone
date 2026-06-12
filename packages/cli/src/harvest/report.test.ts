import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { recommendBars, renderHarvestReport } from './report.js';
import { buildCorpus } from './corpus.js';

function summaryWithScores(scores: number[]): string {
  return JSON.stringify({
    generatedAt: 'x',
    overall: 0,
    pages: scores.map((overall, i) => ({
      pageSlug: `p${i}`,
      pixel: { score: overall },
      copy: { score: overall },
      overall,
      status: 'scored',
    })),
  });
}

describe('recommendBars (spec 18 §4 — report, never auto-tuning)', () => {
  it('below 20 scored pages: honest insufficient-data message, bars stay put', () => {
    const corpus = buildCorpus([{ slug: 'a', fidelitySummaryJson: summaryWithScores([80, 75]) }]);
    const rec = recommendBars(corpus.stats);
    assert.match(rec.recommendation, /insufficient data/i);
    assert.match(rec.recommendation, /2 scored page/);
    assert.match(rec.recommendation, /70/);
  });

  it('at 20+ scored pages: recommends p25 rounded to 5, labeled as hand-applied', () => {
    const scores = Array.from({ length: 24 }, (_, i) => 60 + i); // 60..83
    const corpus = buildCorpus([{ slug: 'a', fidelitySummaryJson: summaryWithScores(scores) }]);
    const rec = recommendBars(corpus.stats);
    assert.match(rec.recommendation, /by hand/i);
    assert.ok(rec.suggestedBar !== null);
    assert.equal(rec.suggestedBar! % 5, 0, 'rounded to nearest 5');
  });
});

describe('renderHarvestReport', () => {
  it('renders sources, distribution, and the calibration section', () => {
    const corpus = buildCorpus([
      { slug: 'matrix-fixture', platform: 'astro-fixture', fidelitySummaryJson: summaryWithScores([80, 90]) },
    ]);
    const md = renderHarvestReport(corpus);
    assert.match(md, /# Harvest report/);
    assert.match(md, /matrix-fixture/);
    assert.match(md, /## Calibration/);
    assert.match(md, /insufficient data/i);
  });
});
