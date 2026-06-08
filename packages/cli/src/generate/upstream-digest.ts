// F1 (Build Spec 11): a downstream doc needs an upstream doc's STRUCTURE and key
// facts — its headings, the lede of each section, and its lists — not the full
// prose. Injecting full bodies made the prompt grow monotonically down the DAG
// until doc-08 overflowed (07-e2e findings D8). This produces a compact,
// deterministic structural extract, cached per upstream doc by content hash, so
// prompt-builder can pass the digest instead of the body.
//
// v1 is deterministic and LLM-free (no cost, no call, stable). The spec notes a
// v2 LLM-summarized digest as a deferred follow-up — NOT built here.
//
// Sizing invariant (keep in sync with the F2 ceiling in engine.ts): a digest is
// hard-capped at DIGEST_MAX_CHARS, so the worst-case downstream prompt is
//   max system spec (~66K chars) + MAX_FAN_IN (9 deps) × DIGEST_MAX_CHARS + slice
// which must stay under PROMPT_TOKEN_CEILING. Raising DIGEST_MAX_CHARS or the
// max fan-in without raising the ceiling reintroduces the overflow bug.

import { createHash } from 'node:crypto';

import { COVERAGE_MAP, type DeliverableId } from '@upriver/schemas';
import type { ClientDataSource } from '@upriver/core/data';

import { readManifest } from './manifest.js';

/** Soft word budget for a digest (~the spec's 1,500-word target). */
export const DIGEST_MAX_WORDS = 1500;
/** Hard char cap — the guarantee the F2 ceiling math relies on. */
export const DIGEST_MAX_CHARS = 9000;

/** Where a digest is cached, relative to the client root. */
export function digestCachePath(id: DeliverableId): string {
  return `docs/.digests/${id}.md`;
}

export interface UpstreamDigest {
  id: DeliverableId;
  title: string;
  /** The structural extract injected into a downstream prompt. */
  digest: string;
  sourceWords: number;
  digestWords: number;
}

/** Whitespace-separated token count (the same notion the rest of generate uses for words). */
export function countWords(s: string): number {
  const t = s.trim();
  return t === '' ? 0 : t.split(/\s+/).length;
}

const isHeading = (line: string): boolean => /^#{1,6}\s/.test(line);
const isListItem = (line: string): boolean => /^\s*([-*+]|\d+[.)])\s+/.test(line.trimStart());

/** First sentence of a paragraph line — up to the first ./!/? boundary, else the whole line. */
function firstSentence(paragraph: string): string {
  const m = paragraph.match(/^[\s\S]*?[.!?](?=\s|$)/);
  return (m ? m[0] : paragraph).trim();
}

/**
 * Deterministic structural extract of a markdown doc: every heading, the lede
 * sentence of each section's first prose paragraph, and every list item — capped
 * at maxWords / maxChars (whichever binds first). Same input always yields the
 * same output. Pure; no I/O.
 */
export function extractDigest(
  content: string,
  opts?: { maxWords?: number; maxChars?: number },
): string {
  const maxWords = opts?.maxWords ?? DIGEST_MAX_WORDS;
  const maxChars = opts?.maxChars ?? DIGEST_MAX_CHARS;

  const out: string[] = [];
  let words = 0;
  let chars = 0;
  // True once this section has contributed its lede; further prose lines are skipped.
  let sectionHasLede = false;

  // Add `line` unless it would push the digest past either cap (guard BEFORE
  // appending, so the result is a hard ≤ cap, never a one-line overshoot).
  // Returns false when the cap is reached, signalling the caller to stop.
  const tryPush = (line: string): boolean => {
    if (words + countWords(line) > maxWords || chars + line.length + 1 > maxChars) return false;
    out.push(line);
    words += countWords(line);
    chars += line.length + 1;
    return true;
  };

  for (const raw of content.split('\n')) {
    const line = raw.replace(/\s+$/, '');
    const trimmed = line.trim();

    if (trimmed === '') {
      if (out.length > 0 && out[out.length - 1] !== '') out.push('');
      continue;
    }
    let candidate: string | null = null;
    if (isHeading(trimmed)) candidate = line;
    else if (isListItem(line)) candidate = line;
    else if (!sectionHasLede) candidate = firstSentence(trimmed);
    else continue; // non-lede prose

    if (!tryPush(candidate)) break;
    if (isHeading(trimmed)) sectionHasLede = false;
    else if (!isListItem(line)) sectionHasLede = true;
  }

  let result = out.join('\n').trim();
  if (result.length > maxChars) result = result.slice(0, maxChars).trimEnd();
  return result;
}

const CACHE_HEADER = /^<!-- upstream-digest hash=([0-9a-f]+) source=(\d+) digest=(\d+) -->\n([\s\S]*)$/;

function contentHash(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

/**
 * Digest of one upstream doc, cached at docs/.digests/<id>.md keyed by the
 * upstream doc's content hash. A cache hit (same hash) returns the stored digest
 * verbatim; any content change flips the hash and forces a recompute. Returns an
 * empty digest when the upstream doc is absent from the manifest (the caller
 * simply omits it, exactly as before).
 */
export async function buildUpstreamDigest(
  slug: string,
  upstreamId: DeliverableId,
  ds: ClientDataSource,
): Promise<UpstreamDigest> {
  const title = COVERAGE_MAP.find((d) => d.id === upstreamId)?.title ?? upstreamId;
  const manifest = await readManifest(ds, slug);
  const entry = manifest.docs[upstreamId];
  if (!entry) return { id: upstreamId, title, digest: '', sourceWords: 0, digestWords: 0 };

  const content = (await ds.readClientFileText(slug, entry.path)) ?? '';
  const hash = contentHash(content);
  const cachePath = digestCachePath(upstreamId);

  const cached = await ds.readClientFileText(slug, cachePath);
  if (cached) {
    const m = cached.match(CACHE_HEADER);
    if (m && m[1] === hash) {
      return {
        id: upstreamId,
        title,
        digest: m[4] ?? '',
        sourceWords: Number(m[2]),
        digestWords: Number(m[3]),
      };
    }
  }

  const digest = extractDigest(content);
  const sourceWords = countWords(content);
  const digestWords = countWords(digest);
  const fileText = `<!-- upstream-digest hash=${hash} source=${sourceWords} digest=${digestWords} -->\n${digest}`;
  await ds.writeClientFile(slug, cachePath, fileText);

  return { id: upstreamId, title, digest, sourceWords, digestWords };
}
