import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  assertPromptSize,
  CLONE_PROMPT_MAX_CHARS,
  runAgentWithNoFileRetry,
  fidelityGate,
  PITCH_FIDELITY_MIN,
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
