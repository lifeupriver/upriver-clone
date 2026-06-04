import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveGateDecision } from './gate.js';

test('--yes auto-approves a previously-approved doc', () => {
  assert.equal(resolveGateDecision({ yes: true, isTty: false, priorApproved: true }), 'auto-approve');
});

test('--yes refuses a never-approved doc', () => {
  assert.equal(resolveGateDecision({ yes: true, isTty: false, priorApproved: false }), 'refuse-yes');
});

test('a TTY without --yes prompts', () => {
  assert.equal(resolveGateDecision({ yes: false, isTty: true, priorApproved: false }), 'prompt');
});

test('a non-TTY without --yes skips', () => {
  assert.equal(resolveGateDecision({ yes: false, isTty: false, priorApproved: false }), 'skip-non-tty');
});
