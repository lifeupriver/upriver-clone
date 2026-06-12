import { test } from 'node:test';
import assert from 'node:assert/strict';

import { scrubSecrets } from './scrub-secrets.js';

// run-stage persists stdout/stderr tails (and rethrown spawn errors) into
// Inngest step state. These assertions pin the redaction contract: values of
// secret-NAMED env vars disappear, everything else passes through untouched.

test('redacts the value of a secret-named env var everywhere it appears', () => {
  const env = { ANTHROPIC_API_KEY: 'sk-ant-abc123def456' };
  const out = scrubSecrets('auth: sk-ant-abc123def456\nretry with sk-ant-abc123def456!', env);
  assert.equal(out, 'auth: [redacted]\nretry with [redacted]!');
});

test('covers each name family: KEY, TOKEN, SECRET, PASSWORD (case-insensitive)', () => {
  const env = {
    FIRECRAWL_API_KEY: 'fc-0123456789',
    UPRIVER_RUN_TOKEN: 'tok_0123456789',
    inngest_signing_secret: 'signkey-0123456789',
    SMTP_PASSWORD: 'hunter2hunter2',
  };
  const input = 'fc-0123456789 tok_0123456789 signkey-0123456789 hunter2hunter2';
  assert.equal(scrubSecrets(input, env), '[redacted] [redacted] [redacted] [redacted]');
});

test('skips values of 8 chars or fewer (too collision-prone to scrub)', () => {
  const env = { SHORT_KEY: '8288', OTHER_TOKEN: 'abcdefgh' };
  const input = 'listening on :8288, code abcdefgh';
  assert.equal(scrubSecrets(input, env), input);
});

test('ignores env vars whose names do not look secret-bearing', () => {
  const env = { UPRIVER_CLIENTS_DIR: '/tmp/upriver/clients', HOME: '/home/worker-user' };
  const input = 'staged to /tmp/upriver/clients under /home/worker-user';
  assert.equal(scrubSecrets(input, env), input);
});

test('handles regex-special characters in secret values literally', () => {
  const env = { WEIRD_SECRET: 'a+b(c)*d?[e]{12}' };
  assert.equal(scrubSecrets('saw a+b(c)*d?[e]{12} in output', env), 'saw [redacted] in output');
});

test('passes empty and secret-free strings through unchanged', () => {
  const env = { SOME_API_KEY: 'super-secret-value' };
  assert.equal(scrubSecrets('', env), '');
  assert.equal(scrubSecrets('nothing to see here', env), 'nothing to see here');
});

test('defaults to process.env', () => {
  const name = 'UPRIVER_TEST_SCRUB_TOKEN';
  process.env[name] = 'process-env-secret-123';
  try {
    assert.equal(scrubSecrets('leaked: process-env-secret-123'), 'leaked: [redacted]');
  } finally {
    delete process.env[name];
  }
});
