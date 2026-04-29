import { strict as assert } from 'node:assert';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import type Anthropic from '@anthropic-ai/sdk';

import { cachedClaudeCall, computeCacheKey, llmCacheDir } from './cached-llm.js';

const SLUG = 'cache-test-co';
const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 100;
const MESSAGES: Anthropic.Messages.MessageParam[] = [
  { role: 'user', content: 'hello' },
];

let tempBase: string;
let prevClientsDir: string | undefined;
let prevNoCache: string | undefined;

/**
 * Build a counting Anthropic stub. Tracks the number of times
 * `messages.create` is invoked and returns a fixed text/usage payload.
 *
 * @returns An object exposing the stub-typed client and a call counter.
 */
function buildStub(): {
  client: Anthropic;
  calls: () => number;
} {
  let calls = 0;
  const client = {
    messages: {
      create: async () => {
        calls += 1;
        return {
          content: [{ type: 'text', text: 'stub' }],
          usage: { input_tokens: 1, output_tokens: 1 },
        };
      },
    },
  } as unknown as Anthropic;
  return { client, calls: () => calls };
}

describe('cached-llm', () => {
  beforeEach(() => {
    prevClientsDir = process.env['UPRIVER_CLIENTS_DIR'];
    prevNoCache = process.env['UPRIVER_LLM_NO_CACHE'];
    delete process.env['UPRIVER_LLM_NO_CACHE'];
    tempBase = mkdtempSync(join(tmpdir(), 'upriver-cached-llm-test-'));
    process.env['UPRIVER_CLIENTS_DIR'] = tempBase;
    mkdirSync(join(tempBase, SLUG), { recursive: true });
  });

  afterEach(() => {
    if (prevClientsDir === undefined) {
      delete process.env['UPRIVER_CLIENTS_DIR'];
    } else {
      process.env['UPRIVER_CLIENTS_DIR'] = prevClientsDir;
    }
    if (prevNoCache === undefined) {
      delete process.env['UPRIVER_LLM_NO_CACHE'];
    } else {
      process.env['UPRIVER_LLM_NO_CACHE'] = prevNoCache;
    }
    rmSync(tempBase, { recursive: true, force: true });
  });

  describe('computeCacheKey', () => {
    it('is deterministic for identical inputs', () => {
      const a = computeCacheKey({
        model: MODEL,
        maxTokens: MAX_TOKENS,
        messages: MESSAGES,
      });
      const b = computeCacheKey({
        model: MODEL,
        maxTokens: MAX_TOKENS,
        messages: MESSAGES,
      });
      assert.equal(a, b);
      assert.equal(a.length, 32);
    });

    it('differs when any input changes', () => {
      const base = computeCacheKey({
        model: MODEL,
        maxTokens: MAX_TOKENS,
        messages: MESSAGES,
      });
      const otherModel = computeCacheKey({
        model: 'claude-opus-4-7',
        maxTokens: MAX_TOKENS,
        messages: MESSAGES,
      });
      const otherTokens = computeCacheKey({
        model: MODEL,
        maxTokens: MAX_TOKENS + 1,
        messages: MESSAGES,
      });
      const otherMessages = computeCacheKey({
        model: MODEL,
        maxTokens: MAX_TOKENS,
        messages: [{ role: 'user', content: 'different' }],
      });
      const withSystem = computeCacheKey({
        model: MODEL,
        maxTokens: MAX_TOKENS,
        messages: MESSAGES,
        system: 'extra context',
      });
      assert.notEqual(base, otherModel);
      assert.notEqual(base, otherTokens);
      assert.notEqual(base, otherMessages);
      assert.notEqual(base, withSystem);
    });
  });

  describe('cachedClaudeCall', () => {
    it('returns cached content without calling the stub when cache file exists', async () => {
      const { client, calls } = buildStub();
      const key = computeCacheKey({
        model: MODEL,
        maxTokens: MAX_TOKENS,
        messages: MESSAGES,
      });
      const dir = llmCacheDir(SLUG);
      const cachePath = join(dir, `${key}.json`);
      writeFileSync(
        cachePath,
        JSON.stringify({
          version: 1,
          text: 'pre-seeded',
          usage: { input_tokens: 7, output_tokens: 9 },
          model: MODEL,
          cachedAt: new Date().toISOString(),
        }),
        'utf8',
      );

      const result = await cachedClaudeCall({
        anthropic: client,
        slug: SLUG,
        command: 'test',
        model: MODEL,
        maxTokens: MAX_TOKENS,
        messages: MESSAGES,
        log: () => {},
      });

      assert.equal(result.fromCache, true);
      assert.equal(result.text, 'pre-seeded');
      assert.equal(result.usage.input_tokens, 7);
      assert.equal(calls(), 0);
    });

    it('calls the stub on miss, persists, then reads from disk on the second call', async () => {
      const { client, calls } = buildStub();

      const first = await cachedClaudeCall({
        anthropic: client,
        slug: SLUG,
        command: 'test',
        model: MODEL,
        maxTokens: MAX_TOKENS,
        messages: MESSAGES,
        log: () => {},
      });
      assert.equal(first.fromCache, false);
      assert.equal(first.text, 'stub');
      assert.equal(calls(), 1);
      assert.ok(existsSync(first.cachePath), 'cache file should be written');

      const persisted = JSON.parse(readFileSync(first.cachePath, 'utf8')) as {
        version: number;
        text: string;
      };
      assert.equal(persisted.version, 1);
      assert.equal(persisted.text, 'stub');

      const second = await cachedClaudeCall({
        anthropic: client,
        slug: SLUG,
        command: 'test',
        model: MODEL,
        maxTokens: MAX_TOKENS,
        messages: MESSAGES,
        log: () => {},
      });
      assert.equal(second.fromCache, true);
      assert.equal(second.text, 'stub');
      assert.equal(calls(), 1, 'second call should not hit the stub');
    });

    it('always calls the stub when UPRIVER_LLM_NO_CACHE is set', async () => {
      const { client, calls } = buildStub();
      process.env['UPRIVER_LLM_NO_CACHE'] = '1';

      const a = await cachedClaudeCall({
        anthropic: client,
        slug: SLUG,
        command: 'test',
        model: MODEL,
        maxTokens: MAX_TOKENS,
        messages: MESSAGES,
        log: () => {},
      });
      const b = await cachedClaudeCall({
        anthropic: client,
        slug: SLUG,
        command: 'test',
        model: MODEL,
        maxTokens: MAX_TOKENS,
        messages: MESSAGES,
        log: () => {},
      });

      assert.equal(a.fromCache, false);
      assert.equal(b.fromCache, false);
      assert.equal(calls(), 2);

      // No cache file should have been written.
      const dir = llmCacheDir(SLUG);
      const written = readdirSync(dir).filter((f) => f.endsWith('.json'));
      assert.equal(written.length, 0, 'no cache file should be written when bypassed');
    });
  });
});
