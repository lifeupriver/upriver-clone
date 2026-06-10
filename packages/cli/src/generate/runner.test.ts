import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
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

test('F3: runDoc forces a fresh no-cache call when a cache hit produced no file', async () => {
  let calls = 0;
  const sawNoCache: boolean[] = [];
  const call: ClaudeCall = async (opts) => {
    calls++;
    sawNoCache.push(Boolean(opts.noCache));
    if (calls === 1) return ok({ fromCache: true, text: 'cached reply, no file written' });
    writeFileSync(join(opts.cwd as string, base.outputFileName), '# Fresh\nbody');
    return ok({ fromCache: false, text: 'wrote it on the forced retry' });
  };
  const r = await runDoc(base, call);
  assert.equal(calls, 2, 'should retry exactly once');
  assert.equal(sawNoCache[0], false, 'first attempt respects the cache');
  assert.equal(sawNoCache[1], true, 'forced retry bypasses the cache');
  assert.match(r.content, /# Fresh/);
  assert.equal(r.fromCache, false);
});

test('F3: runDoc errors if the forced fresh retry still writes no file', async () => {
  const call: ClaudeCall = async (opts) => ok({ fromCache: !opts.noCache, text: 'never writes a file' });
  await assert.rejects(() => runDoc(base, call), /did not write/);
});

test('F4: runDoc relocates a file the session wrote to an absolute path outside staging', async () => {
  const strayDir = mkdtempSync(join(tmpdir(), 'upriver-stray-'));
  const abs = join(strayDir, base.outputFileName);
  const call: ClaudeCall = async () => {
    writeFileSync(abs, '# Relocated\nbody'); // writes OUTSIDE opts.cwd
    return ok({ text: `Done. I wrote the deliverable to ${abs}` });
  };
  const r = await runDoc(base, call);
  assert.match(r.content, /# Relocated/);
  assert.equal(existsSync(abs), false, 'stray out-of-staging file is cleaned up after relocation');
});

test('F4: runDoc fails precisely naming an absolute path the session claims but did not write', async () => {
  const call: ClaudeCall = async () => ok({ text: 'Saved to /nonexistent/abs/doc-01-brand-voice-guide.md' });
  await assert.rejects(() => runDoc(base, call), /\/nonexistent\/abs\/doc-01-brand-voice-guide\.md/);
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

test('P6: a no-file no-claim first attempt self-heals with exactly one fresh no-cache retry', async () => {
  let calls = 0;
  const sawNoCache: boolean[] = [];
  const call: ClaudeCall = async (opts) => {
    calls++;
    sawNoCache.push(Boolean(opts.noCache));
    if (calls === 1) return ok({ text: 'did some thinking, wrote nothing' });
    writeFileSync(join(opts.cwd as string, base.outputFileName), '# Recovered\nbody');
    return ok();
  };
  const r = await runDoc(base, call);
  assert.match(r.content, /# Recovered/);
  assert.equal(calls, 2);
  assert.deepEqual(sawNoCache, [false, true]);
});

test('P6: a claimed-but-absent absolute path (D1, doc-12) retries once, then throws the precise F4 error', async () => {
  let calls = 0;
  const call: ClaudeCall = async () => {
    calls++;
    return ok({ text: `I wrote /nonexistent-upriver-p6/${base.outputFileName}` });
  };
  await assert.rejects(() => runDoc(base, call), /outside the staging dir/);
  assert.equal(calls, 2);
});

test('P6: a cache replay followed by a fruitless fresh call does NOT retry a third time', async () => {
  let calls = 0;
  const call: ClaudeCall = async () => {
    calls++;
    return calls === 1 ? ok({ fromCache: true, text: 'cached, no file' }) : ok({ text: 'fresh, still no file' });
  };
  await assert.rejects(() => runDoc(base, call), /did not write/);
  assert.equal(calls, 2);
});
