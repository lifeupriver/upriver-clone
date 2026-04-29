import Anthropic from '@anthropic-ai/sdk';

import { cachedClaudeCall } from '../util/cached-llm.js';

import type { AgentRunner } from './runner.js';

/**
 * Default Anthropic model used by deep passes when `UPRIVER_DEEP_MODEL` is
 * unset. Sonnet 4.6 is the standard balance — strong reasoning at a fraction
 * of Opus token cost. Override via env when a specific run needs Opus
 * fidelity or Haiku speed.
 */
export const DEFAULT_DEEP_MODEL = 'claude-sonnet-4-6';

/** Output cap for deep passes. ~16k tokens of JSON findings is plenty. */
const MAX_TOKENS = 16_000;

/**
 * Options for `createAnthropicRunner`. `slug` is required so cache files (and
 * usage logs) land under the correct client directory. `command` defaults to
 * `'audit-deep'` and is the label that appears in `token-and-credit-usage.log`.
 */
export interface CreateAnthropicRunnerOptions {
  slug: string;
  anthropic?: Anthropic;
  model?: string;
  command?: string;
}

/**
 * G.4 — build an `AgentRunner` that calls the Anthropic SDK directly, with
 * disk caching via `cachedClaudeCall` so re-runs of the same prompt are free.
 * Selected over `claudeCliRunner` whenever `ANTHROPIC_API_KEY` is set in the
 * environment; the CLI fallback remains for operators without an API key.
 */
export function createAnthropicRunner(opts: CreateAnthropicRunnerOptions): AgentRunner {
  const anthropic = opts.anthropic ?? new Anthropic({ apiKey: process.env['ANTHROPIC_API_KEY'] });
  const model = opts.model ?? process.env['UPRIVER_DEEP_MODEL'] ?? DEFAULT_DEEP_MODEL;
  const command = opts.command ?? 'audit-deep';

  return async (prompt: string): Promise<string> => {
    const { text } = await cachedClaudeCall({
      anthropic,
      slug: opts.slug,
      command,
      model,
      maxTokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    });
    return text;
  };
}
