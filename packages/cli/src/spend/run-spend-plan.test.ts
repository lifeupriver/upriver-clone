import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { addSpend, emptyLedger } from '../pitch/ledger.js';
import { checkStage } from './run-spend-plan.js';
import type { RunEstimateCtx } from './stage-estimates.js';

const CTX: RunEstimateCtx = { pages: 5, auditMode: 'base' };

describe('per-stage spend decision (spec 17b §2)', () => {
  it('free stages always run, even over a zero ceiling', () => {
    assert.equal(checkStage(emptyLedger(), 'scaffold', CTX, 0), 'free');
    assert.equal(checkStage(emptyLedger(), 'clone-fidelity', CTX, 0), 'free');
  });

  it('costed stages run while the estimate fits the ceiling', () => {
    assert.equal(checkStage(emptyLedger(), 'scrape', CTX, 25), 'run');
  });

  it('aborts BEFORE the stage that would break the ceiling', () => {
    const nearCeiling = addSpend(emptyLedger(), { estUsd: 24.99 });
    assert.equal(checkStage(nearCeiling, 'clone', CTX, 25), 'over-ceiling');
  });

  it('a zero ceiling blocks the very first costed stage (deliberate-bug check)', () => {
    assert.equal(checkStage(emptyLedger(), 'scrape', CTX, 0), 'over-ceiling');
  });

  it('a null ceiling disables enforcement entirely (--no-spend-ceiling)', () => {
    const spent = addSpend(emptyLedger(), { estUsd: 9999 });
    assert.equal(checkStage(spent, 'clone', CTX, null), 'run');
  });
});
