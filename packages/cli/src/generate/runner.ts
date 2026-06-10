import { copyFileSync, existsSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync } from 'node:fs';
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
    const callOpts = {
      slug: input.slug,
      command: `generate:${input.id}`,
      model: input.model,
      systemPrompt: input.systemPrompt,
      userPrompt: input.userPrompt,
      permissionMode: 'acceptEdits' as const,
      allowedTools: WRITE_TOOLS,
      cacheKey: `${input.specHash}.${input.profileSliceHash}`,
      cwd: staging,
    };

    let result = await call(callOpts);
    // The staging dir started empty, so read whichever document the session
    // wrote — the model follows the deliverable spec's own file-naming, which we
    // do not constrain. The CLI persists it under the canonical docs/ path.
    let produced = findGeneratedFile(staging);
    let retried = false;

    // F3 (Build Spec 11): a cache hit that left no file is always wrong — the
    // response cache stores TEXT, not the written file, so a replay can never
    // satisfy a file output. Force one fresh (cache-bypassing) session.
    // NOTE: this F3 forced retry consumes the shared one-retry budget; if it
    // still produces no file the P6 retry below is intentionally skipped
    // (retried=true), keeping the max claude calls per runDoc at 2.
    if (!produced && result.fromCache) {
      result = await call({ ...callOpts, noCache: true });
      produced = findGeneratedFile(staging);
      retried = true;
    }

    // F4 (Build Spec 11): the model may have written to an absolute path
    // outside the staging cwd. Recover the file into staging when it exists.
    if (!produced) produced = relocateClaimedFile(result.text, input.outputFileName, staging);

    // P6 (Build Spec 14): the no-file class (claimed-but-absent absolute path,
    // or no file and no claim — findings D1/D3) is non-deterministic and
    // reliably recovers on a genuine retry. Self-heal with at most one fresh
    // session per runDoc before failing to the operator.
    // INVARIANT: at most 2 claude calls per runDoc ever — the engine/batch
    // layer above does not retry, so this is the hard per-doc ceiling.
    if (!produced && !retried) {
      result = await call({ ...callOpts, noCache: true });
      produced = findGeneratedFile(staging) ?? relocateClaimedFile(result.text, input.outputFileName, staging);
    }

    if (!produced) {
      const claimed = findClaimedAbsolutePath(result.text, input.outputFileName);
      if (claimed) {
        throw new Error(
          `Session wrote outside the staging dir: it claims to have written ${claimed}, but no file is ` +
            'there. The output contract requires a RELATIVE path inside the working directory.',
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

/**
 * F4: when the reply names an absolute path that actually exists AND whose
 * basename exactly matches `outputFileName`, pull the file into staging
 * (removing the stray) so the run proceeds. Returns null in all other cases —
 * the P6 retry / precise-error path handles them.
 *
 * The exact-basename guard is critical: without it, a reply that merely
 * mentions an unrelated absolute .md path (e.g. "I consulted /notes/foo.md")
 * would cause that file to be deleted and returned as the generated doc.
 * `findClaimedAbsolutePath`'s fallback is intentionally preserved for the
 * final error-message path (line 88+) where it is harmless and useful for
 * diagnostics.
 */
function relocateClaimedFile(text: string, outputFileName: string, staging: string): string | null {
  const claimed = findClaimedAbsolutePath(text, outputFileName);
  // Only act when the claimed path is exactly the expected output file.
  // The fallback path returned by findClaimedAbsolutePath (first absolute .md
  // mentioned) must never trigger a copyFileSync + rmSync on an unrelated file.
  if (!claimed || basename(claimed) !== outputFileName) return null;
  if (!existsSync(claimed)) return null;
  const dest = join(staging, basename(claimed));
  copyFileSync(claimed, dest);
  rmSync(claimed, { force: true }); // don't leave a stray file in the operator's tree
  return dest;
}

/**
 * Find an absolute path the model claims (in its reply text) to have written —
 * the F4 recovery hook for a session that wrote outside its staging cwd. Prefers
 * a path whose basename matches the expected output file; falls back to the first
 * absolute markdown path mentioned. Returns null when none is named.
 */
function findClaimedAbsolutePath(text: string, outputFileName: string): string | null {
  const matches = text.match(/\/[^\s'"`)]+\.(?:md|markdown)\b/gi) ?? [];
  if (matches.length === 0) return null;
  return matches.find((p) => basename(p) === outputFileName) ?? matches[0] ?? null;
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
