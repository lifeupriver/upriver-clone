import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { commandArgv, RUN_ALLOWED_COMMANDS } from '../src/lib/run-allowlist.js';

// /api/run/<command> 400s anything outside this list before spawning the CLI.
// These assertions pin the gate AND the argv translation for oclif's
// space-separated topic commands.
describe('run allowlist', () => {
  it('admits every GUI-runnable pipeline stage, including finalize / clone-fidelity / improve', () => {
    for (const cmd of [
      'scrape',
      'audit',
      'synthesize',
      'design-brief',
      'scaffold',
      'clone',
      'finalize',
      'clone-fidelity',
      'fixes-plan',
      'qa',
      'improve',
    ]) {
      assert.ok(RUN_ALLOWED_COMMANDS.includes(cmd), `expected ${cmd} to be allowlisted`);
    }
  });

  it('rejects unknown / injected commands', () => {
    for (const cmd of ['', 'scrape; rm -rf /', 'SCRAPE', '../bin/sh', 'fixes plan', 'launch', 'discover']) {
      assert.equal(RUN_ALLOWED_COMMANDS.includes(cmd), false, `expected ${JSON.stringify(cmd)} to be blocked`);
    }
  });
});

describe('commandArgv — oclif topic-separator translation', () => {
  it('maps fixes-plan to the two-token `fixes plan` command', () => {
    assert.deepEqual([...commandArgv('fixes-plan')], ['fixes', 'plan']);
  });

  it('passes flat command ids through unchanged', () => {
    for (const cmd of ['scrape', 'finalize', 'clone-fidelity', 'improve', 'admin-deploy']) {
      assert.deepEqual([...commandArgv(cmd)], [cmd]);
    }
  });
});
