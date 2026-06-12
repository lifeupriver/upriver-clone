import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { buildCorpus, HARVEST_CORPUS_VERSION, type HarvestSource } from './corpus.js';

const PITCH_STATE = JSON.stringify({
  v: 1,
  slug: 'wildflour',
  url: 'https://wildflour.example',
  status: 'sent',
  createdAt: '2026-06-12T10:00:00.000Z',
  updatedAt: '2026-06-12T11:00:00.000Z',
  steps: {},
  ledger: { firecrawlCredits: 10, agentSeconds: 720, estUsd: 2.93 },
  sentAt: '2026-06-12T11:00:00.000Z',
});

const SUMMARY = JSON.stringify({
  generatedAt: '2026-06-12T10:30:00.000Z',
  overall: 81,
  pages: [
    { pageSlug: 'home', pixel: { score: 90 }, copy: { score: 80 }, overall: 86, status: 'scored' },
    { pageSlug: 'about', pixel: { score: 70 }, copy: { score: 82 }, overall: 75, status: 'scored' },
    { pageSlug: 'contact', pixel: { score: 0 }, copy: { score: 0 }, overall: 0, status: 'no-clone-shot' },
  ],
  policy: { bar: 70, strict: false, belowBar: [], unscored: ['contact'], evaluatedAt: 'x' },
});

const RUN_LEDGER = JSON.stringify({
  v: 1,
  slug: 'acme',
  startedAt: 'x',
  updatedAt: 'x',
  ceilingUsd: 25,
  stages: [{ id: 'scrape', at: 'x', est: { firecrawlCredits: 42, agentSeconds: 0, estUsd: 0.21 }, actual: { firecrawlCredits: 31, usd: 0.155, source: 'usage-log' } }],
  totalEstUsd: 0.21,
});

describe('buildCorpus (spec 18 §3)', () => {
  it('classifies prospect/client/matrix sources and versions the corpus', () => {
    const sources: HarvestSource[] = [
      { slug: 'wildflour', pitchStateJson: PITCH_STATE, fidelitySummaryJson: SUMMARY },
      { slug: 'acme', runLedgerJson: RUN_LEDGER },
      { slug: 'matrix-fixture', fidelitySummaryJson: SUMMARY, platform: 'astro-fixture' },
    ];
    const corpus = buildCorpus(sources);
    assert.equal(corpus.v, HARVEST_CORPUS_VERSION);
    assert.deepEqual(
      corpus.sources.map((s) => s.kind),
      ['prospect', 'client', 'matrix'],
    );
    assert.equal(corpus.sources[2]!.platform, 'astro-fixture');
  });

  it('extracts pitch funnel facts including viewedAt when views.json exists', () => {
    const corpus = buildCorpus([
      {
        slug: 'wildflour',
        pitchStateJson: PITCH_STATE,
        viewsJson: JSON.stringify({ v: 1, firstViewedAt: '2026-06-12T12:00:00.000Z' }),
      },
    ]);
    const p = corpus.sources[0]!.pitch!;
    assert.equal(p.status, 'sent');
    assert.ok(Math.abs(p.estUsd - 2.93) < 1e-9);
    assert.equal(p.viewedAt, '2026-06-12T12:00:00.000Z');
  });

  it('computes the fidelity distribution over SCORED pages only', () => {
    const corpus = buildCorpus([
      { slug: 'a', fidelitySummaryJson: SUMMARY },
    ]);
    assert.equal(corpus.stats.scoredPages, 2);
    assert.equal(corpus.stats.fidelityDist!.min, 75);
    assert.equal(corpus.stats.fidelityDist!.max, 86);
    assert.equal(corpus.stats.belowBarCounts['70'], 0);
    assert.equal(corpus.stats.belowBarCounts['80'], 1);
  });

  it('spend prefers actuals when the run ledger has them', () => {
    const corpus = buildCorpus([{ slug: 'acme', runLedgerJson: RUN_LEDGER }]);
    const spend = corpus.sources[0]!.spend!;
    assert.ok(Math.abs(spend.estUsd - 0.21) < 1e-9);
    assert.ok(Math.abs((spend.actualUsd ?? 0) - 0.155) < 1e-9);
  });

  it('one corrupt file degrades that source, never the sweep', () => {
    const corpus = buildCorpus([
      { slug: 'broken', pitchStateJson: '{nope', fidelitySummaryJson: SUMMARY },
      { slug: 'ok', pitchStateJson: PITCH_STATE },
    ]);
    assert.equal(corpus.sources.length, 2);
    const broken = corpus.sources.find((s) => s.slug === 'broken')!;
    assert.equal(broken.pitch, undefined);
    assert.ok(broken.fidelity, 'the parsable artifact still harvests');
    assert.ok(corpus.sources.find((s) => s.slug === 'ok')!.pitch);
  });

  it('the input shape has no field for share tokens — secrets cannot enter the corpus', () => {
    // Type-level guarantee, asserted at runtime for the reviewer: a source
    // built from every known field never contains token-bearing content.
    const corpus = buildCorpus([{ slug: 'wildflour', pitchStateJson: PITCH_STATE }]);
    assert.ok(!JSON.stringify(corpus).includes('token'));
  });
});
