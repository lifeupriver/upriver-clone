// Security-boundary tests for the shared agent spawn helper. These pin the
// invariants that keep prompt-injected agent sessions away from operator
// secrets and shell access.

import assert from 'node:assert/strict';
import { afterEach, describe, it } from 'node:test';

import {
  AGENT_READ_TOOLS,
  AGENT_WRITE_TOOLS,
  buildAgentEnv,
  sanitizeAgentTools,
} from './claude-code.js';

const MUTATED_KEYS = [
  'FIRECRAWL_API_KEY',
  'UPRIVER_SUPABASE_SERVICE_KEY',
  'UPRIVER_GITHUB_PAT',
  'GITHUB_TOKEN',
  'RESEND_API_KEY',
  'B2_APPLICATION_KEY',
  'ANTHROPIC_API_KEY',
  'ANTHROPIC_AUTH_TOKEN',
  'UPRIVER_USE_API_KEY',
  'CLAUDE_CODE_TEST_FLAG',
];
const saved = new Map<string, string | undefined>();

function setEnv(key: string, value: string | undefined): void {
  if (!saved.has(key)) saved.set(key, process.env[key]);
  if (value === undefined) delete process.env[key];
  else process.env[key] = value;
}

afterEach(() => {
  for (const [key, value] of saved) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  saved.clear();
});

describe('tool allowlists', () => {
  it('never include Bash', () => {
    assert.ok(!AGENT_WRITE_TOOLS.includes('Bash'));
    assert.ok(!AGENT_READ_TOOLS.includes('Bash'));
  });

  it('sanitizeAgentTools strips Bash regardless of casing/whitespace', () => {
    assert.deepEqual(
      sanitizeAgentTools(['Read', 'Bash', 'Edit', ' bash ', 'BASH', 'Grep']),
      ['Read', 'Edit', 'Grep'],
    );
  });
});

describe('buildAgentEnv', () => {
  it('drops operator secrets and keeps the basics', () => {
    for (const key of MUTATED_KEYS) setEnv(key, 'sekret-value');
    setEnv('UPRIVER_USE_API_KEY', undefined);

    const env = buildAgentEnv();

    assert.equal(env['FIRECRAWL_API_KEY'], undefined);
    assert.equal(env['UPRIVER_SUPABASE_SERVICE_KEY'], undefined);
    assert.equal(env['UPRIVER_GITHUB_PAT'], undefined);
    assert.equal(env['GITHUB_TOKEN'], undefined);
    assert.equal(env['RESEND_API_KEY'], undefined);
    assert.equal(env['B2_APPLICATION_KEY'], undefined);
    // Subscription auth by default: API credentials withheld.
    assert.equal(env['ANTHROPIC_API_KEY'], undefined);
    assert.equal(env['ANTHROPIC_AUTH_TOKEN'], undefined);
    // Basics survive.
    assert.equal(env['PATH'], process.env['PATH']);
    if (process.env['HOME']) assert.equal(env['HOME'], process.env['HOME']);
    // CLAUDE_* feature flags pass through.
    assert.equal(env['CLAUDE_CODE_TEST_FLAG'], 'sekret-value');
  });

  it('forwards ANTHROPIC credentials only under UPRIVER_USE_API_KEY', () => {
    setEnv('ANTHROPIC_API_KEY', 'sk-ant-test');
    setEnv('ANTHROPIC_AUTH_TOKEN', 'tok-test');
    setEnv('UPRIVER_USE_API_KEY', '1');

    const env = buildAgentEnv();
    assert.equal(env['ANTHROPIC_API_KEY'], 'sk-ant-test');
    assert.equal(env['ANTHROPIC_AUTH_TOKEN'], 'tok-test');
    // Still no broad inheritance.
    assert.equal(env['FIRECRAWL_API_KEY'], undefined);
  });
});
