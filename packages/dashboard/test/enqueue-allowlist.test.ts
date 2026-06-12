import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { ENQUEUE_ALLOWED_COMMANDS } from '../src/lib/enqueue-allowlist.js';

// The enqueue endpoint 400s any command outside this list before it sends an
// Inngest event, so the worker only ever receives allowlisted commands. These
// assertions pin the gate: deliverable generation is enqueueable; unknown /
// injected commands are not.
describe('enqueue allowlist', () => {
  it('admits generate so it can be enqueued onto the worker', () => {
    assert.ok(ENQUEUE_ALLOWED_COMMANDS.includes('generate'));
  });

  it('keeps the core pipeline commands it mirrors', () => {
    for (const cmd of ['init', 'scrape', 'audit', 'synthesize', 'design-brief', 'scaffold', 'clone', 'fixes-plan', 'qa']) {
      assert.ok(ENQUEUE_ALLOWED_COMMANDS.includes(cmd), `expected ${cmd} to be allowlisted`);
    }
  });

  it('admits the stages PipelineStages renders Run buttons for (allowlist drift fix)', () => {
    for (const cmd of ['finalize', 'clone-fidelity', 'improve']) {
      assert.ok(ENQUEUE_ALLOWED_COMMANDS.includes(cmd), `expected ${cmd} to be allowlisted`);
    }
  });

  it('rejects unknown / injected commands', () => {
    for (const cmd of ['', 'generate; rm -rf /', 'GENERATE', 'rm', 'node']) {
      assert.equal(ENQUEUE_ALLOWED_COMMANDS.includes(cmd), false, `expected ${JSON.stringify(cmd)} to be blocked`);
    }
  });
});
