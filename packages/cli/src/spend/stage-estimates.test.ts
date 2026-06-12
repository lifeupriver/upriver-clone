import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  RUN_MAX_SPEND_USD_DEFAULT,
  stageEstimate,
  estimateRunTable,
  type RunEstimateCtx,
} from './stage-estimates.js';

const CTX: RunEstimateCtx = { pages: 5, auditMode: 'base' };

describe('run-all stage estimates (spec 17b §2)', () => {
  it('default ceiling is $25', () => {
    assert.equal(RUN_MAX_SPEND_USD_DEFAULT, 25);
  });

  it('costed stages estimate positive USD; bookkeeping stages are free', () => {
    for (const id of ['scrape', 'clone'] as const) {
      const e = stageEstimate(id, CTX);
      assert.ok(e, `${id} must be costed`);
      assert.ok(e.firecrawlCredits > 0 || e.agentSeconds > 0, id);
    }
    for (const id of ['scaffold', 'finalize', 'clone-fidelity', 'fixes-plan'] as const) {
      assert.equal(stageEstimate(id, CTX), null, `${id} must be free`);
    }
  });

  it('scrape and clone scale with page count', () => {
    const small = stageEstimate('scrape', { ...CTX, pages: 2 })!;
    const big = stageEstimate('scrape', { ...CTX, pages: 20 })!;
    assert.ok(big.firecrawlCredits > small.firecrawlCredits);
    const cloneSmall = stageEstimate('clone', { ...CTX, pages: 2 })!;
    const cloneBig = stageEstimate('clone', { ...CTX, pages: 20 })!;
    assert.ok(cloneBig.agentSeconds > cloneSmall.agentSeconds);
  });

  it('audit is free in base mode, costed in deep/all', () => {
    assert.equal(stageEstimate('audit', { ...CTX, auditMode: 'base' }), null);
    assert.ok(stageEstimate('audit', { ...CTX, auditMode: 'deep' })!.agentSeconds > 0);
    assert.ok(stageEstimate('audit', { ...CTX, auditMode: 'all' })!.agentSeconds > 0);
  });

  it('table covers only costed stages, totals add up, verdict honest', () => {
    const stages = ['scrape', 'audit', 'synthesize', 'scaffold', 'clone', 'finalize'];
    const t = estimateRunTable(stages, CTX, RUN_MAX_SPEND_USD_DEFAULT);
    assert.ok(t.rows.every((r) => r.usd > 0), 'free stages never appear as rows');
    assert.ok(t.rows.some((r) => r.id === 'scrape'));
    assert.ok(!t.rows.some((r) => r.id === 'scaffold'));
    const sum = t.rows.reduce((s, r) => s + r.usd, 0);
    assert.ok(Math.abs(t.totalUsd - sum) < 1e-9);
    assert.equal(t.ceilingUsd, RUN_MAX_SPEND_USD_DEFAULT);
    assert.equal(t.fitsCeiling, t.totalUsd <= t.ceilingUsd);
  });

  it('a typical 5-page run fits the default ceiling', () => {
    // If this fails, either the rates grew or the default must move — a
    // deliberate decision, not silent drift (same posture as the pitch table).
    const stages = [
      'scrape', 'discover', 'audit', 'audit-media', 'gap-analysis', 'video-audit',
      'synthesize', 'voice-extract', 'blog-topics', 'schema-build', 'scaffold',
      'clone', 'finalize', 'clone-fidelity', 'fixes-plan', 'improve',
    ];
    const t = estimateRunTable(stages, CTX, RUN_MAX_SPEND_USD_DEFAULT);
    assert.equal(t.fitsCeiling, true, `est $${t.totalUsd.toFixed(2)} vs $${t.ceilingUsd}`);
  });
});
