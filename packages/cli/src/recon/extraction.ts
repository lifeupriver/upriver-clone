import type { Confidence } from '@upriver/schemas';

import type { PathedCandidate } from './types.js';

/**
 * The JSON-Schema passed to `claude --json-schema` for an LLM-backed adapter. It
 * constrains the model to emit a list of `{ path, value, evidence }` items whose
 * `path` is one of the adapter's allowed dot-paths — the schema "embeds" the
 * section shape via that enum (build spec 04 §1.2). `value` is left open here; the
 * precise per-path structural gate is `structurallyValid` at merge time. The model
 * emits *naked* values only — `source`/`confidence`/`verified` are stamped by the
 * adapter, never by the model.
 */
export function candidateListSchema(paths: string[]): Record<string, unknown> {
  return {
    type: 'object',
    additionalProperties: false,
    required: ['candidates'],
    properties: {
      candidates: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['path', 'value'],
          properties: {
            path: { type: 'string', enum: paths },
            value: {
              description:
                'The naked value for this field — a string, number, object, or array matching the section shape. Do NOT include source/confidence/verified.',
            },
            evidence: {
              type: 'string',
              description: 'A short quote or URL backing the value.',
            },
          },
        },
      },
    },
  };
}

/** Extract the first balanced JSON object/array from a possibly-noisy string. */
function extractJson(text: string): unknown {
  const cleaned = text
    .replace(/```(?:json)?/gi, '')
    .replace(/```/g, '')
    .trim();
  const starts = ['{', '['].map((ch) => cleaned.indexOf(ch)).filter((i) => i >= 0);
  if (starts.length === 0) return null;
  const start = Math.min(...starts);
  const slice = cleaned.slice(start);
  const lastObj = slice.lastIndexOf('}');
  const lastArr = slice.lastIndexOf(']');
  const end = Math.max(lastObj, lastArr);
  if (end < 0) return null;
  try {
    return JSON.parse(slice.slice(0, end + 1));
  } catch {
    return null;
  }
}

export interface ParseCandidatesOptions {
  /** Allowed dot-paths; any item with a path outside this set is dropped. */
  paths: string[];
  /** Per-path confidence; `undefined` leaves the merge default ('low'). */
  confidence?: (path: string) => Confidence | undefined;
}

/**
 * Parse an LLM reply (possibly wrapped in prose / code fences) into recon
 * candidates. Tolerant of fences and a top-level array; drops items with an
 * unknown path or a missing value. Stamps `source: 'recon'` and the adapter's
 * confidence. Never throws on malformed model output — returns what it can.
 */
export function parseCandidates(text: string, opts: ParseCandidatesOptions): PathedCandidate[] {
  const parsed = extractJson(text);
  if (parsed === null || typeof parsed !== 'object') return [];

  const list: unknown = Array.isArray(parsed)
    ? parsed
    : (parsed as Record<string, unknown>)['candidates'];
  if (!Array.isArray(list)) return [];

  const allowed = new Set(opts.paths);
  const out: PathedCandidate[] = [];
  for (const item of list) {
    if (item === null || typeof item !== 'object') continue;
    const obj = item as Record<string, unknown>;
    const path = obj['path'];
    if (typeof path !== 'string' || !allowed.has(path)) continue;
    if (!('value' in obj) || obj['value'] === undefined || obj['value'] === null) continue;

    const candidate: PathedCandidate = { path, value: obj['value'], source: 'recon' };
    const confidence = opts.confidence?.(path);
    if (confidence) candidate.confidence = confidence;
    if (typeof obj['evidence'] === 'string' && obj['evidence'].length > 0) {
      candidate.evidence = obj['evidence'];
    }
    out.push(candidate);
  }
  return out;
}
