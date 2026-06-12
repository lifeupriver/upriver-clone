import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addSpend, emptyLedger } from '../pitch/ledger.js';
import {
  RUN_LEDGER_VERSION,
  createRunLedger,
  recordStageEst,
  recordStageActual,
  readRunLedgerIfExists,
  writeRunLedger,
} from './run-ledger.js';

describe('run-ledger.json (spec 17b §2)', () => {
  it('creates a v1 ledger with the ceiling recorded', () => {
    const l = createRunLedger('acme', 25);
    assert.equal(l.v, RUN_LEDGER_VERSION);
    assert.equal(l.slug, 'acme');
    assert.equal(l.ceilingUsd, 25);
    assert.equal(l.stages.length, 0);
    assert.equal(l.totalEstUsd, 0);
  });

  it('records stage estimates immutably and keeps the running total', () => {
    const l = createRunLedger('acme', null);
    const est = addSpend(emptyLedger(), { firecrawlCredits: 40 });
    const l2 = recordStageEst(l, 'scrape', est);
    assert.equal(l.stages.length, 0);
    assert.equal(l2.stages.length, 1);
    assert.equal(l2.stages[0]!.id, 'scrape');
    assert.ok(Math.abs(l2.totalEstUsd - est.estUsd) < 1e-9);
  });

  it('attaches actuals to an existing stage without touching the estimate', () => {
    const est = addSpend(emptyLedger(), { firecrawlCredits: 40 });
    const l = recordStageEst(createRunLedger('acme', 25), 'scrape', est);
    const l2 = recordStageActual(l, 'scrape', { firecrawlCredits: 31, usd: 0.155, source: 'usage-log' });
    assert.deepEqual(l2.stages[0]!.est, est);
    assert.equal(l2.stages[0]!.actual?.firecrawlCredits, 31);
    assert.equal(l2.stages[0]!.actual?.source, 'usage-log');
  });

  it('round-trips through disk and rejects foreign versions', () => {
    const dir = mkdtempSync(join(tmpdir(), 'run-ledger-'));
    try {
      const l = recordStageEst(
        createRunLedger('acme', 25),
        'scrape',
        addSpend(emptyLedger(), { firecrawlCredits: 8 }),
      );
      writeRunLedger(dir, l);
      const back = readRunLedgerIfExists(dir);
      assert.deepEqual(back, l);
      // absent file → null (a fresh run, not an error)
      assert.equal(readRunLedgerIfExists(join(dir, 'nope')), null);
      // foreign version → loud refusal
      writeRunLedger(dir, { ...l, v: 99 } as never);
      assert.throws(() => readRunLedgerIfExists(dir), /version/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('a --from resume appends to the existing ledger rather than resetting', () => {
    const est = addSpend(emptyLedger(), { firecrawlCredits: 8 });
    const first = recordStageEst(createRunLedger('acme', 25), 'scrape', est);
    const resumed = recordStageEst(first, 'clone', addSpend(emptyLedger(), { agentSeconds: 600 }));
    assert.equal(resumed.stages.length, 2);
    assert.ok(resumed.totalEstUsd > first.totalEstUsd);
  });
});
