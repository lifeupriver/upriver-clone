import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyLedger,
  addSpend,
  estimateStepUsd,
  wouldExceed,
  sumLedgers,
  estimateTable,
  PITCH_STEPS,
  PITCH_MAX_SPEND_USD_DEFAULT,
  PITCH_MAX_BATCH_SPEND_USD_DEFAULT,
} from './ledger.js';

describe('pitch spend ledger', () => {
  it('starts empty', () => {
    const l = emptyLedger();
    assert.equal(l.firecrawlCredits, 0);
    assert.equal(l.agentSeconds, 0);
    assert.equal(l.estUsd, 0);
  });

  it('accumulates spend immutably', () => {
    const l = emptyLedger();
    const l2 = addSpend(l, { firecrawlCredits: 8, agentSeconds: 600 });
    assert.equal(l.estUsd, 0);
    assert.equal(l2.firecrawlCredits, 8);
    assert.equal(l2.agentSeconds, 600);
    assert.ok(l2.estUsd > 0, 'usd derived from rate table');
  });

  it('estimates every known step as a positive usd amount', () => {
    for (const step of PITCH_STEPS) {
      assert.ok(estimateStepUsd(step) > 0, step);
    }
  });

  it('wouldExceed checks BEFORE the step is taken', () => {
    const l = emptyLedger();
    // a near-zero ceiling is exceeded by the very first costed step
    assert.equal(wouldExceed(l, PITCH_STEPS[0], 0.0001), true);
    // the default ceiling allows the first step from empty
    assert.equal(wouldExceed(l, PITCH_STEPS[0], PITCH_MAX_SPEND_USD_DEFAULT), false);
  });

  it('wouldExceed accounts for spend already on the ledger', () => {
    const spent = addSpend(emptyLedger(), { firecrawlCredits: 0, agentSeconds: 0, estUsd: 4.99 });
    assert.equal(wouldExceed(spent, 'clone-home', 5), true);
  });

  it('sums ledgers for batch ceilings', () => {
    const a = addSpend(emptyLedger(), { firecrawlCredits: 5, agentSeconds: 60 });
    const b = addSpend(emptyLedger(), { firecrawlCredits: 3, agentSeconds: 120 });
    const total = sumLedgers([a, b]);
    assert.equal(total.firecrawlCredits, 8);
    assert.equal(total.agentSeconds, 180);
    assert.ok(Math.abs(total.estUsd - (a.estUsd + b.estUsd)) < 1e-9);
  });

  it('renders a dry-run estimate table covering all steps and the ceiling', () => {
    const rows = estimateTable(PITCH_MAX_SPEND_USD_DEFAULT);
    assert.equal(rows.steps.length, PITCH_STEPS.length);
    assert.ok(rows.totalUsd > 0);
    assert.equal(rows.ceilingUsd, PITCH_MAX_SPEND_USD_DEFAULT);
    assert.equal(rows.fitsCeiling, rows.totalUsd <= rows.ceilingUsd);
  });

  it('whole-pipeline estimate fits the default per-prospect ceiling', () => {
    // If this fails, either the rates grew or the ceiling default must move —
    // a deliberate decision, not a silent drift.
    const rows = estimateTable(PITCH_MAX_SPEND_USD_DEFAULT);
    assert.equal(rows.fitsCeiling, true);
  });

  it('default batch ceiling covers at least 10 prospects', () => {
    assert.ok(
      PITCH_MAX_BATCH_SPEND_USD_DEFAULT >= PITCH_MAX_SPEND_USD_DEFAULT * 10,
    );
  });
});
