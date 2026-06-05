import { test } from 'node:test';
import assert from 'node:assert/strict';

import { ALLOWED_COMMANDS } from './allowed-commands.js';

// The worker re-validates the command before spawning the CLI (run-stage's
// `validate` step throws `command not allowed` on a miss). These assertions pin
// the gate contract: deliverable generation is enqueueable, the core pipeline
// stays allowed, and arbitrary/unknown commands are rejected.

test('worker allowlist admits generate (worker-enqueued generate is gated through, not blocked)', () => {
  assert.ok(ALLOWED_COMMANDS.has('generate'));
});

test('worker allowlist keeps the core pipeline stages it mirrors', () => {
  for (const cmd of ['init', 'scrape', 'audit', 'synthesize', 'design-brief', 'scaffold', 'clone', 'fixes-plan', 'qa']) {
    assert.ok(ALLOWED_COMMANDS.has(cmd), `expected ${cmd} to be allowlisted`);
  }
});

test('worker allowlist rejects unknown / injected commands', () => {
  for (const cmd of ['', 'rm', 'rm -rf /', 'generate; rm -rf /', 'GENERATE', 'eval', 'node']) {
    assert.equal(ALLOWED_COMMANDS.has(cmd), false, `expected ${JSON.stringify(cmd)} to be blocked`);
  }
});
