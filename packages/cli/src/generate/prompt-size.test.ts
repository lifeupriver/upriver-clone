import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  assessPromptSize,
  CHARS_PER_TOKEN,
  DEFAULT_PROMPT_TOKEN_CEILING,
  estimateTokens,
  promptTokenCeiling,
} from './prompt-size.js';

test('estimateTokens is chars / CHARS_PER_TOKEN, rounded up', () => {
  assert.equal(estimateTokens('a'.repeat(3500)), Math.ceil(3500 / CHARS_PER_TOKEN));
  assert.equal(estimateTokens(''), 0);
});

test('assessPromptSize sums system+user and flags over-ceiling', () => {
  const ceiling = 100;
  const under = assessPromptSize('doc-01', 'x'.repeat(100), 'y'.repeat(100), ceiling); // 200 chars ≈ 58 tok
  assert.equal(under.totalChars, 200);
  assert.equal(under.overCeiling, false);

  // 400_000 chars ≈ 114K tokens — over a 100-token ceiling.
  const over = assessPromptSize('doc-08', 'x'.repeat(200_000), 'y'.repeat(200_000), ceiling);
  assert.equal(over.overCeiling, true);
  assert.equal(over.estTokens, estimateTokens('x'.repeat(400_000)));
});

test('promptTokenCeiling defaults to DEFAULT_PROMPT_TOKEN_CEILING and honors the env override', () => {
  const prev = process.env['UPRIVER_PROMPT_TOKEN_CEILING'];
  delete process.env['UPRIVER_PROMPT_TOKEN_CEILING'];
  assert.equal(promptTokenCeiling(), DEFAULT_PROMPT_TOKEN_CEILING);

  process.env['UPRIVER_PROMPT_TOKEN_CEILING'] = '12345';
  assert.equal(promptTokenCeiling(), 12345);

  process.env['UPRIVER_PROMPT_TOKEN_CEILING'] = 'garbage';
  assert.equal(promptTokenCeiling(), DEFAULT_PROMPT_TOKEN_CEILING, 'non-numeric falls back to default');

  if (prev === undefined) delete process.env['UPRIVER_PROMPT_TOKEN_CEILING'];
  else process.env['UPRIVER_PROMPT_TOKEN_CEILING'] = prev;
});
