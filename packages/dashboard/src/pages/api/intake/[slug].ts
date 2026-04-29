import type { APIRoute } from 'astro';
import type { ClientIntake, FindingDecision, ScopeTier } from '@upriver/core';
import { clientExists, readIntake } from '@/lib/fs-reader';
import { emptyIntake, writeIntake } from '@/lib/intake-writer';

export const prerender = false;

const VALID_DECISIONS: ReadonlyArray<FindingDecision> = ['fix', 'skip', 'discuss'];
const VALID_TIERS: ReadonlyArray<ScopeTier> = ['polish', 'rebuild', 'rebuild-plus-content'];
const MAX_PAGE_WANTS_LEN = 4000;
const MAX_REFERENCE_SITES = 20;

/**
 * Type-guard: a non-null plain object (`Record<string, unknown>`).
 *
 * @param v - Arbitrary value.
 * @returns True if `v` is a non-array, non-null object.
 */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Sanitize a `findingDecisions` map from untrusted input.
 *
 * Drops any key whose value is not one of `'fix' | 'skip' | 'discuss'`,
 * logging a warning per dropped entry so bad client state shows up in logs.
 *
 * @param input - Untrusted value from the POST body.
 * @returns A clean `Record<string, FindingDecision>`.
 */
function sanitizeFindingDecisions(input: unknown): Record<string, FindingDecision> {
  const out: Record<string, FindingDecision> = {};
  if (!isRecord(input)) return out;
  for (const [k, v] of Object.entries(input)) {
    if (typeof v === 'string' && (VALID_DECISIONS as readonly string[]).includes(v)) {
      out[k] = v as FindingDecision;
    } else {
      console.warn(`[api/intake] dropping invalid finding decision for ${k}: ${String(v)}`);
    }
  }
  return out;
}

/**
 * Sanitize a `pageWants` map from untrusted input.
 *
 * Drops non-string values; truncates strings to `MAX_PAGE_WANTS_LEN` chars.
 *
 * @param input - Untrusted value from the POST body.
 * @returns A clean `Record<string, string>`.
 */
function sanitizePageWants(input: unknown): Record<string, string> {
  const out: Record<string, string> = {};
  if (!isRecord(input)) return out;
  for (const [k, v] of Object.entries(input)) {
    if (typeof v !== 'string') {
      console.warn(`[api/intake] dropping non-string pageWants[${k}]`);
      continue;
    }
    out[k] = v.length > MAX_PAGE_WANTS_LEN ? v.slice(0, MAX_PAGE_WANTS_LEN) : v;
  }
  return out;
}

/**
 * Sanitize a `referenceSites` array from untrusted input.
 *
 * Drops entries that aren't strings or fail `new URL(...)`. Caps at
 * `MAX_REFERENCE_SITES` after filtering.
 *
 * @param input - Untrusted value from the POST body.
 * @returns A clean `string[]` of valid URLs.
 */
function sanitizeReferenceSites(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const out: string[] = [];
  for (const v of input) {
    if (typeof v !== 'string') continue;
    try {
      // eslint-disable-next-line no-new
      new URL(v);
      out.push(v);
    } catch {
      console.warn(`[api/intake] dropping invalid reference URL: ${v}`);
    }
  }
  return out.slice(0, MAX_REFERENCE_SITES);
}

/**
 * Sanitize a `scopeTier` from untrusted input.
 *
 * @param input - Untrusted value from the POST body.
 * @returns The valid tier, or `null` if missing/invalid.
 */
function sanitizeScopeTier(input: unknown): ScopeTier | null {
  if (input === null || input === undefined) return null;
  if (typeof input === 'string' && (VALID_TIERS as readonly string[]).includes(input)) {
    return input as ScopeTier;
  }
  console.warn(`[api/intake] dropping invalid scopeTier: ${String(input)}`);
  return null;
}

/**
 * Merge a sanitized partial intake onto a base intake.
 *
 * Only fields present in `partial` overwrite. `version`, `submittedAt`, and
 * `updatedAt` are managed by the handler, not the partial.
 *
 * @param base - Existing intake (read from disk or `emptyIntake()`).
 * @param partialRaw - Untrusted partial body from the client.
 * @returns A merged intake, with timestamps left to the caller to update.
 */
function mergeIntake(base: ClientIntake, partialRaw: Record<string, unknown>): ClientIntake {
  const merged: ClientIntake = { ...base };
  if ('findingDecisions' in partialRaw) {
    merged.findingDecisions = sanitizeFindingDecisions(partialRaw['findingDecisions']);
  }
  if ('pageWants' in partialRaw) {
    merged.pageWants = sanitizePageWants(partialRaw['pageWants']);
  }
  if ('referenceSites' in partialRaw) {
    merged.referenceSites = sanitizeReferenceSites(partialRaw['referenceSites']);
  }
  if ('scopeTier' in partialRaw) {
    merged.scopeTier = sanitizeScopeTier(partialRaw['scopeTier']);
  }
  return merged;
}

/**
 * GET handler: returns the current intake JSON, or `{}` if none exists yet.
 * Always 200 unless the slug is missing entirely (404).
 */
export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug;
  if (!slug) {
    return new Response(JSON.stringify({ error: 'missing slug' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (!clientExists(slug)) {
    return new Response(JSON.stringify({ error: 'client not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }
  const intake = readIntake(slug);
  return new Response(JSON.stringify(intake ?? {}), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};

/**
 * POST handler: merge a partial `ClientIntake` from the body onto the existing
 * file (or a fresh skeleton), validate, write, and return the persisted body.
 *
 * - 400 on unparseable JSON.
 * - 404 if the slug doesn't exist.
 * - 200 with the persisted body on success.
 */
export const POST: APIRoute = async ({ params, request }) => {
  const slug = params.slug;
  if (!slug) {
    return new Response(JSON.stringify({ error: 'missing slug' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (!clientExists(slug)) {
    return new Response(JSON.stringify({ error: 'client not found' }), {
      status: 404,
      headers: { 'content-type': 'application/json' },
    });
  }

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON body' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (!isRecord(parsed)) {
    return new Response(JSON.stringify({ error: 'body must be an object' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const existing = readIntake(slug) ?? emptyIntake();
  const merged = mergeIntake(existing, parsed);

  const now = new Date().toISOString();
  merged.updatedAt = now;
  if (merged.submittedAt === null) {
    merged.submittedAt = now;
  }

  writeIntake(slug, merged);

  return new Response(JSON.stringify(merged), {
    status: 200,
    headers: { 'content-type': 'application/json' },
  });
};
