import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertPromptSize,
  CLONE_PROMPT_MAX_CHARS,
  runAgentWithNoFileRetry,
  fidelityGate,
  PITCH_FIDELITY_MIN,
  CLONE_FIDELITY_BAR,
  evaluateFidelityPolicy,
} from './hardening.js';
import type { FidelitySummary } from '../clone-qa/fidelity-scorer.js';

describe('assertPromptSize (prompt-size preflight)', () => {
  it('passes prompts under the ceiling', () => {
    assert.doesNotThrow(() => assertPromptSize('hello', '/'));
  });

  it('rejects oversized prompts with a clean, sized error and no side effects', () => {
    const big = 'x'.repeat(CLONE_PROMPT_MAX_CHARS + 1);
    assert.throws(
      () => assertPromptSize(big, '/about'),
      (err: Error) =>
        /prompt/i.test(err.message) &&
        err.message.includes('/about') &&
        err.message.includes(String(CLONE_PROMPT_MAX_CHARS)),
    );
  });

  it('honors an explicit ceiling override', () => {
    assert.throws(() => assertPromptSize('abcdef', '/', 3));
  });
});

describe('runAgentWithNoFileRetry (one fresh retry on the no-file class)', () => {
  it('returns first-try without retrying when work was produced', async () => {
    let runs = 0;
    const outcome = await runAgentWithNoFileRetry({
      run: async () => {
        runs += 1;
      },
      producedWork: () => true,
    });
    assert.equal(outcome, 'first-try');
    assert.equal(runs, 1);
  });

  it('retries exactly once and reports retried when the second attempt produces work', async () => {
    let runs = 0;
    const outcome = await runAgentWithNoFileRetry({
      run: async () => {
        runs += 1;
      },
      producedWork: () => runs === 2,
    });
    assert.equal(outcome, 'retried');
    assert.equal(runs, 2);
  });

  it('gives up after the single retry', async () => {
    let runs = 0;
    const outcome = await runAgentWithNoFileRetry({
      run: async () => {
        runs += 1;
      },
      producedWork: () => false,
    });
    assert.equal(outcome, 'no-file');
    assert.equal(runs, 2);
  });

  it('propagates agent errors instead of swallowing them', async () => {
    await assert.rejects(
      runAgentWithNoFileRetry({
        run: async () => {
          throw new Error('claude exited 1');
        },
        producedWork: () => false,
      }),
      /claude exited 1/,
    );
  });
});

describe('fidelityGate (assert-before-persist)', () => {
  const summary = (overall: number, status = 'scored'): FidelitySummary =>
    ({ pages: [{ pageSlug: 'home', overall, status }], overall } as unknown as FidelitySummary);

  it('passes at or above the minimum', () => {
    assert.equal(fidelityGate(summary(PITCH_FIDELITY_MIN), 'home').pass, true);
    assert.equal(fidelityGate(summary(95), 'home').pass, true);
  });

  it('fails below the minimum and reports the score', () => {
    const out = fidelityGate(summary(PITCH_FIDELITY_MIN - 1), 'home');
    assert.equal(out.pass, false);
    assert.equal(out.score, PITCH_FIDELITY_MIN - 1);
    assert.match(out.reason, /below/i);
  });

  it('fails closed when there is no summary at all', () => {
    const out = fidelityGate(null, 'home');
    assert.equal(out.pass, false);
    assert.match(out.reason, /no fidelity/i);
  });

  it('fails closed when the page was never scored', () => {
    assert.equal(fidelityGate(summary(90), 'about').pass, false);
    assert.equal(fidelityGate(summary(90, 'skipped'), 'home').pass, false);
  });

  it('honors an explicit minimum override', () => {
    assert.equal(fidelityGate(summary(50), 'home', 40).pass, true);
  });
});

describe('evaluateFidelityPolicy (spec 17b §1 — full-site per-page policy)', () => {
  const summaryOf = (pages: Array<{ slug: string; overall: number; status?: string }>) =>
    ({
      generatedAt: 'now',
      overall: 0,
      pages: pages.map((p) => ({ pageSlug: p.slug, overall: p.overall, status: p.status ?? 'scored' })),
    } as unknown as FidelitySummary);

  it('passes when every page meets the per-page bar', () => {
    const r = evaluateFidelityPolicy(summaryOf([
      { slug: 'home', overall: CLONE_FIDELITY_BAR },
      { slug: 'about', overall: 92 },
    ]));
    assert.equal(r.pass, true);
    assert.deepEqual(r.belowBar, []);
    assert.deepEqual(r.unscored, []);
  });

  it('reports every below-bar page with its score — a mean cannot hide one bad page', () => {
    const r = evaluateFidelityPolicy(summaryOf([
      { slug: 'home', overall: 95 },
      { slug: 'about', overall: CLONE_FIDELITY_BAR - 1 },
      { slug: 'contact', overall: 12 },
    ]));
    assert.equal(r.pass, false);
    assert.deepEqual(r.belowBar.map((p) => p.pageSlug), ['about', 'contact']);
    assert.equal(r.belowBar[1]!.overall, 12);
  });

  it('unscored pages fail the policy (fail-closed, like fidelityGate)', () => {
    const r = evaluateFidelityPolicy(summaryOf([
      { slug: 'home', overall: 95 },
      { slug: 'about', overall: 0, status: 'no-clone-shot' },
    ]));
    assert.equal(r.pass, false);
    assert.deepEqual(r.unscored, ['about']);
  });

  it('a missing or empty summary is all-unscored, never a silent pass', () => {
    assert.equal(evaluateFidelityPolicy(null).pass, false);
    assert.equal(evaluateFidelityPolicy(summaryOf([])).pass, false);
  });

  it('honors a bar override', () => {
    const r = evaluateFidelityPolicy(summaryOf([{ slug: 'home', overall: 50 }]), 40);
    assert.equal(r.pass, true);
  });

  it('client bar and pitch minimum are separate constants (calibrate independently)', () => {
    assert.equal(CLONE_FIDELITY_BAR, 70);
    assert.equal(typeof PITCH_FIDELITY_MIN, 'number');
  });
});
