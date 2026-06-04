import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runDoc, type ClaudeCall, type RunDocInput } from './runner.js';
import type { ClaudeCliCallResult } from '../util/claude-cli.js';

const base: RunDocInput = {
  slug: 'lf',
  id: 'doc-01',
  model: 'sonnet',
  systemPrompt: 'sys',
  userPrompt: 'usr',
  outputFileName: 'doc-01-brand-voice-guide.md',
  specHash: 's',
  profileSliceHash: 'p',
};
const ok = (over: Partial<ClaudeCliCallResult> = {}): ClaudeCliCallResult => ({
  text: '',
  fromCache: false,
  cachePath: '',
  costUsd: null,
  inputTokens: null,
  outputTokens: null,
  ...over,
});

test('runDoc returns the file the session wrote', async () => {
  const call: ClaudeCall = async (opts) => {
    writeFileSync(join(opts.cwd as string, base.outputFileName), '# Brand Voice\nbody');
    return ok({ text: 'wrote it', inputTokens: 10, outputTokens: 20 });
  };
  const r = await runDoc(base, call);
  assert.match(r.content, /# Brand Voice/);
  assert.equal(r.fromCache, false);
  assert.equal(r.inputTokens, 10);
});

test('runDoc throws when the session writes no file', async () => {
  const call: ClaudeCall = async () => ok({ text: 'forgot' });
  await assert.rejects(() => runDoc(base, call), /did not write/);
});

test('runDoc throws on an empty file', async () => {
  const call: ClaudeCall = async (opts) => {
    writeFileSync(join(opts.cwd as string, base.outputFileName), '   \n');
    return ok();
  };
  await assert.rejects(() => runDoc(base, call), /empty/);
});

test('runDoc explains a cache hit that produced no file', async () => {
  const call: ClaudeCall = async () => ok({ fromCache: true, text: 'cached' });
  await assert.rejects(() => runDoc(base, call), /cached response/);
});

test('runDoc passes acceptEdits, write tools, a cwd, and the spec/slice cache key', async () => {
  let captured: Parameters<ClaudeCall>[0] | undefined;
  const call: ClaudeCall = async (opts) => {
    captured = opts;
    writeFileSync(join(opts.cwd as string, base.outputFileName), 'x');
    return ok();
  };
  await runDoc(base, call);
  assert.equal(captured?.permissionMode, 'acceptEdits');
  assert.deepEqual(captured?.allowedTools, ['Read', 'Write', 'Edit', 'Glob', 'Grep']);
  assert.ok(captured?.cwd);
  assert.equal(captured?.cacheKey, 's.p');
});
