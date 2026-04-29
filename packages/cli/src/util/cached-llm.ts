// NOTE: This module lives in `packages/cli` because `@anthropic-ai/sdk` is a CLI
// dependency only and the only callers today are CLI commands. If/when other
// workspace packages need a cached Anthropic call, this can move to
// `@upriver/core` (e.g., `packages/core/src/llm/cached-client.ts`) — the
// implementation has no CLI-specific imports beyond the SDK and `@upriver/core`.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import Anthropic from '@anthropic-ai/sdk';

import { clientDir, logUsageEvent } from '@upriver/core';

/**
 * Resolve the clients base directory, honoring the `UPRIVER_CLIENTS_DIR`
 * environment override (matches the convention used elsewhere in the CLI).
 *
 * @returns Absolute or relative path to the clients base directory.
 */
function resolveClientsBase(): string {
  return process.env['UPRIVER_CLIENTS_DIR'] ?? './clients';
}

/**
 * Cache-aware text block. Mirrors `Anthropic.Messages.TextBlockParam` but adds
 * the optional `cache_control` marker required for Anthropic prompt caching.
 *
 * The current SDK type does not declare `cache_control` on the non-beta
 * `TextBlockParam`, but the API accepts it on stable models. We expose a
 * widened type so callers can opt into prompt caching without a beta import.
 */
export interface CacheableTextBlockParam {
  type: 'text';
  text: string;
  /** Pass `{ type: 'ephemeral' }` to mark this block for prompt caching. */
  cache_control?: { type: 'ephemeral' };
}

export interface CachedCallOptions {
  /** Anthropic SDK client. Stubbable in tests. */
  anthropic: Anthropic;
  /** Client slug; the cache file is written under `<clientsBase>/<slug>/.cache/llm/`. */
  slug: string;
  /** Command name reported to `logUsageEvent` on a cache miss. */
  command: string;
  /** Anthropic model id (e.g., `'claude-sonnet-4-6'`). Part of the cache key. */
  model: string;
  /** `max_tokens` for the API call. Part of the cache key. */
  maxTokens: number;
  /** User messages, in the standard SDK shape. */
  messages: Anthropic.Messages.MessageParam[];
  /**
   * Optional system blocks. If passed as an array of content blocks, may
   * include `cache_control: { type: 'ephemeral' }` markers for prompt caching.
   * If passed as a string, it's sent as a plain system prompt with no caching.
   */
  system?: string | CacheableTextBlockParam[];
  /** Optional override of the default cache key (sha of model+messages+system). */
  cacheKey?: string;
  /** Optional log function (defaults to `console.log`) for cache hit/miss messages. */
  log?: (msg: string) => void;
}

export interface CachedCallResult {
  /** Concatenated text from the model's content blocks. */
  text: string;
  /** Token usage as reported by the SDK (or replayed from the cache file). */
  usage: Anthropic.Messages.Usage;
  /** True if served from disk cache (no API call, no usage event logged). */
  fromCache: boolean;
  /** Absolute or relative path to the cache file used or written. */
  cachePath: string;
}

interface CacheFileV1 {
  version: 1;
  text: string;
  usage: Anthropic.Messages.Usage;
  model: string;
  cachedAt: string;
}

/**
 * Returns the LLM cache directory for a given client slug. Created on demand.
 * Layout: `<clientsBase>/<slug>/.cache/llm/`.
 *
 * @param slug - Client slug; must match a directory under the clients base.
 * @returns Absolute or relative path to the cache directory.
 */
export function llmCacheDir(slug: string): string {
  const dir = join(clientDir(slug, resolveClientsBase()), '.cache', 'llm');
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Compute the content-addressed cache key from the call params. Pure: same
 * input always produces the same key, and any change in model/maxTokens/
 * messages/system flips it.
 *
 * The key is `sha256(JSON.stringify({ model, maxTokens, messages, system }))`
 * truncated to the first 32 hex characters — short enough for a tidy filename,
 * still 128 bits of entropy.
 *
 * @param args - The call params to hash.
 * @returns 32-character hex digest.
 */
export function computeCacheKey(args: {
  model: string;
  maxTokens: number;
  messages: Anthropic.Messages.MessageParam[];
  system?: string | CacheableTextBlockParam[];
}): string {
  const payload = JSON.stringify({
    model: args.model,
    maxTokens: args.maxTokens,
    messages: args.messages,
    system: args.system ?? null,
  });
  return createHash('sha256').update(payload).digest('hex').slice(0, 32);
}

/**
 * Concatenate all text content blocks on a message response into a single
 * string. Throws if no text content is present (mirrors the existing CLI
 * behavior where a no-text response is treated as an error).
 *
 * @param resp - The Anthropic message response.
 * @returns The combined text body.
 */
function extractText(resp: Anthropic.Messages.Message): string {
  const blocks = resp.content.filter((b) => b.type === 'text');
  if (blocks.length === 0) {
    throw new Error('Claude returned no text content');
  }
  return blocks.map((b) => (b.type === 'text' ? b.text : '')).join('');
}

/**
 * Attempt to read a v1 cache file. Returns null on any IO/parse error or if
 * the file's `version` does not match — we treat all corruption as a miss
 * rather than crashing the caller.
 *
 * @param path - Absolute or relative cache file path.
 * @returns Parsed cache entry or null.
 */
function tryReadCache(path: string): CacheFileV1 | null {
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as Partial<CacheFileV1>;
    if (
      parsed &&
      parsed.version === 1 &&
      typeof parsed.text === 'string' &&
      parsed.usage &&
      typeof parsed.model === 'string' &&
      typeof parsed.cachedAt === 'string'
    ) {
      return parsed as CacheFileV1;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Wrap `anthropic.messages.create` with a per-client content-addressed cache.
 *
 * Cache layout: `<clientDir>/.cache/llm/<sha256>.json` with shape
 * `{ version: 1, text, usage, model, cachedAt }`.
 *
 * - On hit: returns immediately, skips the API call AND skips usage logging
 *   (since the API was not called).
 * - On miss: calls the API, writes the cache file, logs usage, returns.
 * - On read/parse error: treated as a miss; the call falls through to the API.
 * - On write error: a warning is emitted and the API result is still returned.
 *
 * Set `UPRIVER_LLM_NO_CACHE=1` (any truthy value) to bypass the cache entirely.
 *
 * Pass `system` as a `CacheableTextBlockParam[]` with
 * `cache_control: { type: 'ephemeral' }` on stable prefixes to opt into
 * Anthropic prompt caching for repeat calls within the same SDK lifetime.
 *
 * @param opts - Call parameters; see {@link CachedCallOptions}.
 * @returns The text body, usage, cache hit flag, and cache file path.
 */
export async function cachedClaudeCall(
  opts: CachedCallOptions,
): Promise<CachedCallResult> {
  const log = opts.log ?? ((msg: string) => console.log(msg));
  const key =
    opts.cacheKey ??
    computeCacheKey({
      model: opts.model,
      maxTokens: opts.maxTokens,
      messages: opts.messages,
      ...(opts.system !== undefined ? { system: opts.system } : {}),
    });
  const dir = llmCacheDir(opts.slug);
  const cachePath = join(dir, `${key}.json`);

  const noCache = Boolean(process.env['UPRIVER_LLM_NO_CACHE']);

  if (!noCache) {
    const hit = tryReadCache(cachePath);
    if (hit) {
      log(`[llm-cache] hit ${key} (${opts.command})`);
      return { text: hit.text, usage: hit.usage, fromCache: true, cachePath };
    }
  }

  // Build the SDK params. The SDK v0.30.x non-beta `TextBlockParam` does not
  // declare `cache_control`, but the API accepts it for stable models. Cast
  // through `unknown` so callers can pass cache markers without a beta import.
  const createParams: Anthropic.Messages.MessageCreateParamsNonStreaming = {
    model: opts.model,
    max_tokens: opts.maxTokens,
    messages: opts.messages,
    ...(opts.system !== undefined
      ? {
          system: opts.system as unknown as
            | string
            | Anthropic.Messages.TextBlockParam[],
        }
      : {}),
  };

  const resp = await opts.anthropic.messages.create(createParams);

  const text = extractText(resp);
  const usage = resp.usage;

  await logUsageEvent({
    client_slug: opts.slug,
    event_type: 'claude_api',
    model: opts.model,
    input_tokens: usage.input_tokens,
    output_tokens: usage.output_tokens,
    command: opts.command,
  });

  if (!noCache) {
    const entry: CacheFileV1 = {
      version: 1,
      text,
      usage,
      model: opts.model,
      cachedAt: new Date().toISOString(),
    };
    try {
      writeFileSync(cachePath, JSON.stringify(entry, null, 2), 'utf8');
      log(`[llm-cache] wrote ${key} (${opts.command})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[llm-cache] failed to write ${cachePath}: ${msg}`);
    }
  }

  return { text, usage, fromCache: false, cachePath };
}
