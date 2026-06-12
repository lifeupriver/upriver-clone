import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addSpend, emptyLedger, RATE_USD_PER_AGENT_SECOND, RATE_USD_PER_FIRECRAWL_CREDIT } from '../pitch/ledger.js';
import { parseUsageLine } from '../util/cost-summary.js';
import { formatSpendWithActuals, reconcile, type ReconcileStep } from './actuals.js';

// Inline log lines in the EXACT format cost-summary.ts writes/parses — the
// reconciler consumes parseUsageLine output, so the formats can't drift.
const LOG = [
  '2026-06-12T10:00:05.000Z [firecrawl_scrape] credits=31 slug=acme cmd=scrape',
  '2026-06-12T10:00:20.000Z [firecrawl_scrape] credits=6 slug=acme cmd=scrape',
  '2026-06-12T10:10:01.000Z [firecrawl_map] credits=2 slug=acme cmd=discover',
  'garbage line that must not poison anything',
].map(parseUsageLine).filter((e) => e !== null);

const STEPS: ReconcileStep[] = [
  { id: 'scrape', at: '2026-06-12T10:00:00.000Z', est: addSpend(emptyLedger(), { firecrawlCredits: 42 }) },
  { id: 'discover', at: '2026-06-12T10:10:00.000Z', est: addSpend(emptyLedger(), { firecrawlCredits: 20 }) },
  { id: 'clone', at: '2026-06-12T10:20:00.000Z', est: addSpend(emptyLedger(), { agentSeconds: 1200 }) },
];

describe('estimate↔actual reconciliation (spec 17b §3)', () => {
  it('buckets log entries into [step.at, nextStep.at) windows', () => {
    const r = reconcile({ steps: STEPS, entries: LOG });
    const scrape = r.steps.find((s) => s.id === 'scrape')!;
    assert.equal(scrape.firecrawlCredits, 37);
    assert.equal(scrape.creditsSource, 'actual');
    const discover = r.steps.find((s) => s.id === 'discover')!;
    assert.equal(discover.firecrawlCredits, 2);
  });

  it('prices actual credits at the ledger rate', () => {
    const r = reconcile({ steps: STEPS, entries: LOG });
    const scrape = r.steps.find((s) => s.id === 'scrape')!;
    assert.ok(Math.abs(scrape.usd - 37 * RATE_USD_PER_FIRECRAWL_CREDIT) < 1e-9);
  });

  it('labels sources honestly — never silently blended', () => {
    const r = reconcile({ steps: STEPS, entries: LOG });
    assert.equal(r.steps.find((s) => s.id === 'scrape')!.source, 'actual');
    // clone has no log entries: agent time stays an estimate
    const clone = r.steps.find((s) => s.id === 'clone')!;
    assert.equal(clone.source, 'estimate');
    assert.equal(clone.agentSeconds, 1200);
  });

  it('a step with actual credits but estimated agent time is mixed', () => {
    const steps: ReconcileStep[] = [
      {
        id: 'scrape',
        at: '2026-06-12T10:00:00.000Z',
        est: addSpend(emptyLedger(), { firecrawlCredits: 42, agentSeconds: 60 }),
      },
    ];
    const r = reconcile({ steps, entries: LOG });
    assert.equal(r.steps[0]!.source, 'mixed');
  });

  it('agent actuals come from usage_events rows when supplied', () => {
    const r = reconcile({
      steps: STEPS,
      entries: LOG,
      agentRows: [{ command: 'clone', costUsd: 3.21 }],
    });
    const clone = r.steps.find((s) => s.id === 'clone')!;
    assert.equal(clone.agentSource, 'actual');
    assert.ok(Math.abs(clone.usd - 3.21) < 1e-9);
    assert.equal(clone.source, 'actual');
  });

  it('totals split actual from estimate', () => {
    const r = reconcile({ steps: STEPS, entries: LOG });
    assert.ok(r.totals.actualUsd > 0);
    assert.ok(r.totals.estimateUsd > 0);
    assert.ok(Math.abs(r.totals.usd - (r.totals.actualUsd + r.totals.estimateUsd)) < 1e-9);
  });

  it('no entries at all → pure estimates, identical to the input ledgers', () => {
    const r = reconcile({ steps: STEPS, entries: [] });
    for (const s of r.steps) assert.equal(s.source, 'estimate');
    const est = STEPS.reduce((sum, s) => sum + s.est.estUsd, 0);
    assert.ok(Math.abs(r.totals.usd - est) < 1e-9);
  });
});

describe('formatSpendWithActuals (pitch status rendering)', () => {
  it('renders plain estimate when no actuals exist', () => {
    const ledger = addSpend(emptyLedger(), { firecrawlCredits: 10, agentSeconds: 600 });
    assert.equal(formatSpendWithActuals(ledger, null), `$${ledger.estUsd.toFixed(2)}`);
  });

  it('splits est (agent) from act (credits) when the usage log has actuals', () => {
    const ledger = addSpend(emptyLedger(), { firecrawlCredits: 10, agentSeconds: 600 });
    const agentEst = 600 * RATE_USD_PER_AGENT_SECOND;
    const out = formatSpendWithActuals(ledger, 0.7);
    assert.equal(out, `$${(agentEst + 0.7).toFixed(2)} (est $${agentEst.toFixed(2)} + act $0.70)`);
  });
});
