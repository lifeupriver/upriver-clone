// Per-chunk extraction: a read-only `--json-schema` call per chunk, parsed into
// structured candidates. The caller is injected so unit tests run with zero
// LLM/network. Partial failure is tolerated — one bad chunk never aborts the
// run (spec §1).

import { claudeCliCall } from '../util/claude-cli.js';

import type { ChunkExtraction, RawCandidate, UnmappedTopic } from './types.js';
import type { TranscriptChunk } from './ingest.js';

export type ChunkCaller = (req: {
  systemPrompt: string;
  userPrompt: string;
  jsonSchema: unknown;
  chunkIndex: number;
}) => Promise<string>;

/** JSON Schema constraining the model's per-chunk output. */
export const EXTRACTION_JSON_SCHEMA: object = {
  type: 'object',
  additionalProperties: false,
  required: ['candidates', 'unmapped'],
  properties: {
    candidates: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['path', 'value', 'quote'],
        properties: {
          path: { type: 'string' },
          value: {}, // any JSON — validated structurally against the schema later
          quote: { type: 'string' },
          speaker: { type: 'string' },
          confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
        },
      },
    },
    unmapped: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['topic', 'quote'],
        properties: { topic: { type: 'string' }, quote: { type: 'string' } },
      },
    },
  },
};

export function extractionSystemPrompt(catalog: string): string {
  return [
    'You are a JSON-only extractor of Client Profile field candidates from a',
    'transcript of a recorded business session.',
    '',
    'Output ONLY a single raw JSON object and NOTHING else — no markdown, no code',
    'fences, no commentary, no tables. The object must match exactly:',
    '{"candidates":[{"path":"<a path from the catalog>","value":<json matching the path hint>,' +
      '"quote":"<verbatim excerpt copied exactly from the chunk>","speaker":"<optional>",' +
      '"confidence":"high|medium|low"}],"unmapped":[{"topic":"<short label>","quote":"<verbatim excerpt>"}]}',
    '',
    'Rules:',
    '- Every value is `source: transcript`. Extract only what the speakers actually said.',
    '- `quote` MUST be a verbatim excerpt copied exactly from the chunk — do not',
    '  paraphrase, summarize, or fix grammar. It is the evidence for the value.',
    '- Use ONLY paths from the catalog below. Match the hint (array/object/string/…).',
    `- ${'★'}-flagged fields are session-priority: when the transcript states one anywhere —`,
    '  even casually or in passing — you MUST emit a candidate for it. Missing a stated',
    `  ${'★'} field is the worst failure mode (a wrong automated value elsewhere then wins).`,
    '- A real topic that fits no path goes in `unmapped` (topic + a verbatim quote).',
    '- Set `confidence` (high/medium/low) and `speaker` when identifiable.',
    '- Omit a candidate entirely rather than guess a value you cannot quote.',
    '- If nothing maps, output {"candidates":[],"unmapped":[]}.',
    `- Before finishing, re-scan the chunk against the ${'★'}-flagged catalog paths and add`,
    '  any candidate you skipped.',
    '',
    'Catalog (path [hint], ★ = high-value session field):',
    catalog,
  ].join('\n');
}

function asString(x: unknown): string | undefined {
  return typeof x === 'string' ? x : undefined;
}

function coerceCandidates(raw: unknown): RawCandidate[] {
  if (!Array.isArray(raw)) return [];
  const out: RawCandidate[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const o = item as Record<string, unknown>;
    const path = asString(o['path']);
    const quote = asString(o['quote']);
    if (path === undefined || quote === undefined || !('value' in o)) continue;
    const cand: RawCandidate = { path, quote, value: o['value'] };
    const speaker = asString(o['speaker']);
    if (speaker !== undefined) cand.speaker = speaker;
    const conf = asString(o['confidence']);
    if (conf === 'high' || conf === 'medium' || conf === 'low') cand.confidence = conf;
    out.push(cand);
  }
  return out;
}

function coerceUnmapped(raw: unknown): UnmappedTopic[] {
  if (!Array.isArray(raw)) return [];
  const out: UnmappedTopic[] = [];
  for (const item of raw) {
    if (typeof item !== 'object' || item === null) continue;
    const o = item as Record<string, unknown>;
    const topic = asString(o['topic']);
    const quote = asString(o['quote']);
    if (topic !== undefined && quote !== undefined) out.push({ topic, quote });
  }
  return out;
}

/** Best-effort: strip a ```json fence, else slice from the first `{` to last `}`. */
function extractJsonText(text: string): string {
  const trimmed = text.trim();
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
  if (fence?.[1]) return fence[1].trim();
  const first = trimmed.indexOf('{');
  const last = trimmed.lastIndexOf('}');
  if (first !== -1 && last > first) return trimmed.slice(first, last + 1);
  return trimmed;
}

export function parseChunkExtraction(text: string, chunkIndex: number): ChunkExtraction {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    try {
      parsed = JSON.parse(extractJsonText(text));
    } catch (err) {
      return {
        chunkIndex,
        candidates: [],
        unmapped: [],
        error: `unparseable model output: ${(err as Error).message}`,
      };
    }
  }
  const o = (typeof parsed === 'object' && parsed !== null ? parsed : {}) as Record<string, unknown>;
  return {
    chunkIndex,
    candidates: coerceCandidates(o['candidates']),
    unmapped: coerceUnmapped(o['unmapped']),
  };
}

/** Extract every chunk concurrently; a per-chunk failure is captured, not thrown. */
export async function extractChunks(
  chunks: TranscriptChunk[],
  catalog: string,
  call: ChunkCaller,
): Promise<ChunkExtraction[]> {
  const systemPrompt = extractionSystemPrompt(catalog);
  return Promise.all(
    chunks.map(async (chunk) => {
      try {
        const text = await call({
          systemPrompt,
          userPrompt: chunk.text,
          jsonSchema: EXTRACTION_JSON_SCHEMA,
          chunkIndex: chunk.index,
        });
        return parseChunkExtraction(text, chunk.index);
      } catch (err) {
        return {
          chunkIndex: chunk.index,
          candidates: [],
          unmapped: [],
          error: `extraction call failed: ${(err as Error).message}`,
        };
      }
    }),
  );
}

export interface ExtractContext {
  slug: string;
  model: string;
  log?: (msg: string) => void;
}

/** Production caller: a cached, read-only headless Claude call per chunk.
 *
 * NB: `--json-schema` is intentionally NOT forwarded. In claude CLI 2.1.162 it
 * neither constrains the reply to JSON (a minimal schema still returns prose)
 * nor survives long replies (the envelope `result` comes back empty above a few
 * thousand output tokens), which silently dropped whole chunks. The JSON shape
 * is enforced by the system prompt instead, and the cache key is derived from
 * that prompt. See spec §3 changelog (deviation). */
export function defaultChunkCaller(ctx: ExtractContext): ChunkCaller {
  return async ({ systemPrompt, userPrompt, chunkIndex }) => {
    const res = await claudeCliCall({
      slug: ctx.slug,
      command: 'profile:extract-transcript',
      model: ctx.model,
      systemPrompt,
      userPrompt,
      permissionMode: 'plan', // read-only; default allowed tools are read-only (Read/Glob/Grep)
      ...(ctx.log ? { log: ctx.log } : {}),
    });
    ctx.log?.(`  chunk ${chunkIndex}: ${res.fromCache ? 'cached' : 'extracted'}`);
    return res.text;
  };
}
