// Headless Claude Code helper. Runs `claude --print --output-format json` so
// every LLM-backed CLI feature uses the operator's Claude Max subscription
// instead of an Anthropic API key. Mirrors the surface of `cachedClaudeCall`
// (cache key, slug-scoped cache directory, usage logging) so callers can
// swap between the two strategies without rewriting their prompts.

import { spawn } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { clientDir, logUsageEvent } from '@upriver/core';

const CLAUDE_BIN = process.env['CLAUDE_BIN'] || 'claude';

/** Result envelope written by `claude --print --output-format json`. */
interface ClaudeCliResultEnvelope {
  type: string;
  subtype: string;
  is_error: boolean;
  result: string;
  duration_ms?: number;
  total_cost_usd?: number;
  usage?: {
    input_tokens?: number;
    output_tokens?: number;
    cache_read_input_tokens?: number;
    cache_creation_input_tokens?: number;
  };
  modelUsage?: Record<string, { inputTokens?: number; outputTokens?: number; costUSD?: number }>;
}

export interface ClaudeCliCallOptions {
  /** Client slug; cache file is written under `<clientsBase>/<slug>/.cache/llm/`. */
  slug: string;
  /** Command name reported to `logUsageEvent` on a cache miss. */
  command: string;
  /** Model alias passed to `claude --model` (e.g., `sonnet`, `opus`, `claude-sonnet-4-6`). */
  model: string;
  /** System prompt; replaces Claude Code's default system prompt entirely. */
  systemPrompt: string;
  /** User prompt; piped to claude on stdin. */
  userPrompt: string;
  /** Optional JSON-Schema for structured output validation. */
  jsonSchema?: unknown;
  /** Optional override of the default cache key. */
  cacheKey?: string;
  /** Optional log function (defaults to `console.log`). */
  log?: (msg: string) => void;
  /** Permission mode passed to claude. Defaults to `plan` (read-only). */
  permissionMode?: 'acceptEdits' | 'auto' | 'bypassPermissions' | 'default' | 'dontAsk' | 'plan';
  /** Allowed tools for the headless session. Defaults to read-only. */
  allowedTools?: string[];
}

export interface ClaudeCliCallResult {
  /** The model's reply text (the `result` field of the envelope). */
  text: string;
  /** Whether the response was served from disk cache. */
  fromCache: boolean;
  /** Absolute or relative path to the cache file used or written. */
  cachePath: string;
  /** Cost in USD as reported by the CLI envelope, when present. */
  costUsd: number | null;
  /** Token usage as reported by the CLI envelope, when present. */
  inputTokens: number | null;
  outputTokens: number | null;
}

interface CacheFileV1 {
  version: 1;
  text: string;
  costUsd: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
  cachedAt: string;
}

function resolveClientsBase(): string {
  return process.env['UPRIVER_CLIENTS_DIR'] ?? './clients';
}

export function llmCacheDir(slug: string): string {
  const base = resolveClientsBase();
  const dir = join(base, slug, '.cache', 'llm');
  mkdirSync(dir, { recursive: true });
  return dir;
}

export function computeCacheKey(args: {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  jsonSchema?: unknown;
}): string {
  const h = createHash('sha256');
  h.update('claude-cli\n');
  h.update(args.model);
  h.update('\n');
  h.update(args.systemPrompt);
  h.update('\n');
  h.update(args.userPrompt);
  if (args.jsonSchema !== undefined) {
    h.update('\n');
    h.update(JSON.stringify(args.jsonSchema));
  }
  return h.digest('hex').slice(0, 24);
}

function tryReadCache(path: string): CacheFileV1 | null {
  if (!existsSync(path)) return null;
  try {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as CacheFileV1;
    if (parsed.version !== 1 || typeof parsed.text !== 'string') return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Invoke headless Claude Code, returning the model's reply.
 *
 * Set `UPRIVER_LLM_NO_CACHE=1` (any truthy value) to bypass the cache.
 *
 * The result envelope is parsed and the `result` string is returned. If the
 * caller passed a `jsonSchema`, the CLI is invoked with `--json-schema` so
 * the model's output is structurally validated before the envelope returns.
 *
 * Throws if the CLI exits non-zero or the envelope contains `is_error: true`.
 */
export async function claudeCliCall(opts: ClaudeCliCallOptions): Promise<ClaudeCliCallResult> {
  const log = opts.log ?? ((msg: string) => console.log(msg));
  const key =
    opts.cacheKey ??
    computeCacheKey({
      model: opts.model,
      systemPrompt: opts.systemPrompt,
      userPrompt: opts.userPrompt,
      ...(opts.jsonSchema !== undefined ? { jsonSchema: opts.jsonSchema } : {}),
    });
  const dir = llmCacheDir(opts.slug);
  const cachePath = join(dir, `${key}.json`);

  const noCache = Boolean(process.env['UPRIVER_LLM_NO_CACHE']);
  if (!noCache) {
    const hit = tryReadCache(cachePath);
    if (hit) {
      log(`[claude-cache] hit ${key} (${opts.command})`);
      return {
        text: hit.text,
        fromCache: true,
        cachePath,
        costUsd: hit.costUsd,
        inputTokens: hit.inputTokens,
        outputTokens: hit.outputTokens,
      };
    }
  }

  const allowedTools = opts.allowedTools ?? ['Read', 'Glob', 'Grep'];
  const permissionMode = opts.permissionMode ?? 'plan';

  const args: string[] = [
    '--print',
    '--output-format',
    'json',
    '--model',
    opts.model,
    '--permission-mode',
    permissionMode,
    '--allowed-tools',
    allowedTools.join(','),
    '--system-prompt',
    opts.systemPrompt,
  ];
  if (opts.jsonSchema !== undefined) {
    args.push('--json-schema', JSON.stringify(opts.jsonSchema));
  }

  const envelope = await invokeCli(args, opts.userPrompt);
  if (envelope.is_error) {
    throw new Error(`claude CLI returned an error envelope (${envelope.subtype}): ${envelope.result.slice(0, 240)}`);
  }

  const text = envelope.result;
  const costUsd = envelope.total_cost_usd ?? null;
  const inputTokens = envelope.usage?.input_tokens ?? null;
  const outputTokens = envelope.usage?.output_tokens ?? null;

  await logUsageEvent({
    client_slug: opts.slug,
    event_type: 'claude_api',
    model: opts.model,
    ...(inputTokens !== null ? { input_tokens: inputTokens } : {}),
    ...(outputTokens !== null ? { output_tokens: outputTokens } : {}),
    ...(costUsd !== null ? { cost_usd: costUsd } : {}),
    command: opts.command,
  });

  if (!noCache) {
    const entry: CacheFileV1 = {
      version: 1,
      text,
      costUsd,
      inputTokens,
      outputTokens,
      cachedAt: new Date().toISOString(),
    };
    try {
      writeFileSync(cachePath, JSON.stringify(entry, null, 2), 'utf8');
      log(`[claude-cache] wrote ${key} (${opts.command})`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.warn(`[claude-cache] failed to write ${cachePath}: ${msg}`);
    }
  }

  return { text, fromCache: false, cachePath, costUsd, inputTokens, outputTokens };
}

function invokeCli(args: string[], stdinPayload: string): Promise<ClaudeCliResultEnvelope> {
  return new Promise((resolveP, rejectP) => {
    // The Claude Code CLI prefers an ANTHROPIC_API_KEY env var when present.
    // Upriver runs against the operator's Claude Max subscription, so we
    // strip the API key from the spawned env to force the CLI to use its
    // own logged-in credential. Operators who want to override and use a
    // raw API key explicitly can set UPRIVER_USE_API_KEY=1.
    const childEnv: NodeJS.ProcessEnv = { ...process.env };
    if (!process.env['UPRIVER_USE_API_KEY']) {
      delete childEnv['ANTHROPIC_API_KEY'];
      delete childEnv['ANTHROPIC_AUTH_TOKEN'];
    }
    const child = spawn(CLAUDE_BIN, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: childEnv,
    });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => {
      stdout += d.toString('utf8');
    });
    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString('utf8');
    });
    child.stdin.write(stdinPayload);
    child.stdin.end();
    child.on('error', (err) => rejectP(err));
    child.on('exit', (code) => {
      if (code !== 0) {
        const detail = stderr.trim() || stdout.trim() || '(no output)';
        rejectP(new Error(`claude CLI exited ${code}: ${detail.slice(0, 600)}`));
        return;
      }
      try {
        const envelope = JSON.parse(stdout) as ClaudeCliResultEnvelope;
        resolveP(envelope);
      } catch (err) {
        rejectP(new Error(`claude CLI returned non-JSON output: ${stdout.slice(0, 240)}`));
      }
    });
  });
}

/**
 * Detect whether the operator has a working `claude` CLI on PATH. Cheap
 * version check used by features that want to gracefully fall back to
 * deterministic output when the CLI is unavailable.
 */
export async function claudeCliAvailable(): Promise<boolean> {
  return new Promise((resolveP) => {
    const child = spawn(CLAUDE_BIN, ['--version'], { stdio: 'ignore' });
    child.on('error', () => resolveP(false));
    child.on('exit', (code) => resolveP(code === 0));
  });
}
