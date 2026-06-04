import { FirecrawlClient, type ClientConfig } from '@upriver/core';
import type { ClientDataSource } from '@upriver/core/data';
import type { ClientProfile } from '@upriver/schemas';

import { claudeCliCall } from '../util/claude-cli.js';
import { firecrawlSearch } from './firecrawl-search.js';
import type { ReconContext } from './types.js';

/** Recon extraction model — structured, read-only, runs on the operator's Claude Max. */
const RECON_MODEL = 'claude-sonnet-4-6';

/**
 * Embed the candidate JSON-Schema into the user prompt instead of passing it via
 * `claude --json-schema`.
 *
 * Why: under `--json-schema`, the CLI returns the structured payload in the
 * envelope's `structured_output` field while `result` becomes a prose summary (or
 * empty). The shared `claude-cli.ts` helper (read-only / not owned by this build)
 * returns only `result`, so the structured output is unreachable through it.
 * Embedding the schema in the prompt keeps the model's JSON in `result`, where the
 * helper surfaces it and `parseCandidates` reads it; structural validity is still
 * enforced precisely by the post-hoc zod gate (`structurallyValid`). See the spec
 * changelog (deviation).
 */
export function embedSchemaInPrompt(userPrompt: string, jsonSchema?: unknown): string {
  if (jsonSchema === undefined) return userPrompt;
  return [
    userPrompt,
    '',
    '---',
    'Return ONLY a JSON object conforming to this JSON Schema (no prose, no code fences):',
    JSON.stringify(jsonSchema),
  ].join('\n');
}

export interface ReconContextDeps {
  slug: string;
  config: ClientConfig;
  profile: ClientProfile;
  now: string;
  fresh: boolean;
  ds: ClientDataSource;
  firecrawlKey: string;
  creditLogPath?: string;
  log: (msg: string) => void;
  model?: string;
}

/**
 * Wire a live `ReconContext`: Firecrawl scrape/search and a read-only headless
 * `claude` extraction call. The command owns this so the adapters and orchestrator
 * stay free of process/network concerns (build spec 04 §2 — `commands/recon.ts`
 * is thin). LLM calls run `permissionMode: 'plan'` with read-only tools by default
 * (claude-cli.ts), so recon never writes through the model.
 */
export function createReconContext(deps: ReconContextDeps): ReconContext {
  const fc = new FirecrawlClient({
    apiKey: deps.firecrawlKey,
    clientSlug: deps.slug,
    command: 'recon',
    ...(deps.creditLogPath ? { creditLogPath: deps.creditLogPath } : {}),
  });
  const model = deps.model ?? RECON_MODEL;

  return {
    slug: deps.slug,
    config: deps.config,
    profile: deps.profile,
    now: deps.now,
    fresh: deps.fresh,
    log: deps.log,
    ds: deps.ds,
    scrape: (url, options) => fc.scrape(url, options),
    search: (query, options) => firecrawlSearch(deps.firecrawlKey, query, options),
    llm: async (req) => {
      const { text } = await claudeCliCall({
        slug: deps.slug,
        command: req.command,
        model,
        systemPrompt: req.systemPrompt,
        userPrompt: embedSchemaInPrompt(req.userPrompt, req.jsonSchema),
        log: deps.log,
      });
      return text;
    },
  };
}
