import { mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

import type { DeliverableId } from '@upriver/schemas';

import { claudeCliCall, type ClaudeCliCallOptions, type ClaudeCliCallResult } from '../util/claude-cli.js';

export type ClaudeCall = (opts: ClaudeCliCallOptions) => Promise<ClaudeCliCallResult>;

/** Write-mode session tools — `generate` is the first caller of acceptEdits + Write. */
export const WRITE_TOOLS = ['Read', 'Write', 'Edit', 'Glob', 'Grep'];

export interface RunDocInput {
  slug: string;
  id: DeliverableId;
  model: string;
  systemPrompt: string;
  userPrompt: string;
  /** Relative filename the session writes inside the staging dir. */
  outputFileName: string;
  specHash: string;
  profileSliceHash: string;
}

export interface RunDocResult {
  content: string;
  fromCache: boolean;
  costUsd: number | null;
  inputTokens: number | null;
  outputTokens: number | null;
}

/**
 * Run one doc = one write-capable headless session (spec §4). The session's cwd
 * is an empty staging dir; it writes the doc there and the caller persists it
 * through `ClientDataSource` (the session never touches Supabase). Reads the
 * file back and returns its content. Throws if the envelope errors or the file
 * is absent/empty.
 *
 * `call` is injectable so tests run without a live `claude`.
 */
export async function runDoc(input: RunDocInput, call: ClaudeCall = claudeCliCall): Promise<RunDocResult> {
  const staging = mkdtempSync(join(tmpdir(), `upriver-generate-${input.id}-`));
  try {
    const result = await call({
      slug: input.slug,
      command: `generate:${input.id}`,
      model: input.model,
      systemPrompt: input.systemPrompt,
      userPrompt: input.userPrompt,
      permissionMode: 'acceptEdits',
      allowedTools: WRITE_TOOLS,
      cacheKey: `${input.specHash}.${input.profileSliceHash}`,
      cwd: staging,
    });
    // The staging dir started empty, so read whichever document the session
    // wrote — the model follows the deliverable spec's own file-naming, which we
    // do not constrain. The CLI persists it under the canonical docs/ path.
    const produced = findGeneratedFile(staging);
    if (!produced) {
      if (result.fromCache) {
        throw new Error(
          'claude returned a cached response with no regenerated file. The response cache stores ' +
            'text, not the written doc; set UPRIVER_LLM_NO_CACHE=1 to force a fresh session.',
        );
      }
      throw new Error(
        `Session finished but did not write a document. Model reply: ${result.text.slice(0, 200)}`,
      );
    }
    const content = readFileSync(produced, 'utf8');
    if (content.trim().length === 0) {
      throw new Error(`Session wrote an empty document (${basename(produced)}).`);
    }
    return {
      content,
      fromCache: result.fromCache,
      costUsd: result.costUsd,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
    };
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}

/** The document the session wrote: prefer markdown, then the largest file. */
function findGeneratedFile(dir: string): string | null {
  const files: Array<{ path: string; size: number; md: boolean }> = [];
  const walk = (d: string): void => {
    for (const entry of readdirSync(d, { withFileTypes: true })) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        files.push({ path: full, size: statSync(full).size, md: /\.(md|markdown)$/i.test(entry.name) });
      }
    }
  };
  walk(dir);
  if (files.length === 0) return null;
  const markdown = files.filter((f) => f.md);
  const pool = markdown.length > 0 ? markdown : files;
  pool.sort((a, b) => b.size - a.size);
  return pool[0]?.path ?? null;
}
