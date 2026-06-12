import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  emptyLedger,
  addSpend,
  estimateStepUsd,
  estimateUsd,
  wouldExceed,
  wouldExceedEstimate,
  sumLedgers,
  estimateTable,
  PITCH_STEPS,
  PITCH_MAX_SPEND_USD_DEFAULT,
  PITCH_MAX_BATCH_SPEND_USD_DEFAULT,
  RATE_USD_PER_FIRECRAWL_CREDIT,
  RATE_USD_PER_AGENT_SECOND,
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

// Spec 17b §2 — the generic estimate API the run-all/clone ceilings build on.
// Same semantics as the pitch-typed wrappers: estimate exactly at the ceiling
// runs; over the ceiling aborts before the step.
describe('generic step-estimate API (spec 17b)', () => {
  it('estimateUsd prices credits and agent seconds from the rate constants', () => {
    const usd = estimateUsd({ firecrawlCredits: 10, agentSeconds: 60 });
    assert.ok(
      Math.abs(
        usd - (10 * RATE_USD_PER_FIRECRAWL_CREDIT + 60 * RATE_USD_PER_AGENT_SECOND),
      ) < 1e-9,
    );
  });

  it('wouldExceedEstimate: at-ceiling runs, over-ceiling aborts', () => {
    const est = { firecrawlCredits: 0, agentSeconds: 250 }; // exactly $1.00
    const spent = addSpend(emptyLedger(), { estUsd: 4 });
    assert.equal(wouldExceedEstimate(spent, est, 5), false, 'exactly at ceiling is allowed');
    assert.equal(wouldExceedEstimate(spent, est, 4.99), true, 'a cent over aborts');
  });

  it('pitch-typed estimateStepUsd agrees with the generic pricing', () => {
    // The wrappers must be thin: a pitch step's USD is the generic estimateUsd
    // of its estimate row, so the two APIs can never drift.
    const table = estimateTable(PITCH_MAX_SPEND_USD_DEFAULT);
    for (const row of table.steps) {
      assert.ok(
        Math.abs(
          row.usd / row.count -
            estimateUsd({
              firecrawlCredits: row.firecrawlCredits / row.count,
              agentSeconds: row.agentSeconds / row.count,
            }),
        ) < 1e-9,
        row.step,
      );
    }
  });
});
