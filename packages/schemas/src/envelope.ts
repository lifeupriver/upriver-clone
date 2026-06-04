import { z } from 'zod';

/** Where a profile value came from. Precedence is defined in merge.ts. */
export const sourceZ = z.enum(['recon', 'interview', 'transcript', 'operator']);
export type Source = z.infer<typeof sourceZ>;

/**
 * Per-value confidence. Per-source defaults live in merge.ts; adapters may
 * override per candidate.
 */
export const confidenceZ = z.enum(['high', 'medium', 'low']);
export type Confidence = z.infer<typeof confidenceZ>;

/**
 * The envelope every profile leaf (and every wrapped array / sub-object) is
 * stored in. Provenance travels with the value so a later, lower-confidence
 * source can fill gaps without silently overwriting better data — see
 * `mergeCandidate` in merge.ts.
 *
 * `humanVerifyRequired` is intentionally NOT stored here. It is static schema
 * metadata held in the HV registry (hv.ts); keeping it out of the document
 * prevents drift between the data and the registry. The runtime document
 * carries `verified`; the registry carries `humanVerifyRequired`; the predicate
 * joins them.
 */
export function profileFieldZ<T extends z.ZodTypeAny>(inner: T) {
  return z.object({
    value: inner.nullable(),
    source: sourceZ.nullable(),
    confidence: confidenceZ.nullable(),
    verified: z.boolean().default(false),
    evidence: z.string().max(2000).optional(), // quote or URL backing the value
    updatedAt: z.string(), // ISO 8601
  });
}

/**
 * Leaf helper for section schemas: an optional envelope. A profile is valid at
 * any fill level (spec §6) — coverage, not validity, reports what is missing —
 * so every section leaf is `profileFieldZ(inner).optional()`. The envelope
 * internals stay required when the leaf is present.
 */
export function field<T extends z.ZodTypeAny>(inner: T) {
  return profileFieldZ(inner).optional();
}

/**
 * Hand-written mirror of `profileFieldZ`'s inferred shape, generic over the
 * value type. The merge, coverage, and HV helpers speak in terms of this; the
 * composed schema's inferred fields are structurally identical.
 */
export interface ProfileField<T> {
  value: T | null;
  source: Source | null;
  confidence: Confidence | null;
  verified: boolean;
  evidence?: string;
  updatedAt: string;
}

/**
 * Structural runtime test: is `x` a stored envelope? The data-walking helpers
 * in hv.ts and coverage.ts stop descending once they reach an envelope — the
 * unit at which provenance and verification are tracked.
 */
export function isEnvelope(x: unknown): x is ProfileField<unknown> {
  if (typeof x !== 'object' || x === null || Array.isArray(x)) return false;
  const o = x as Record<string, unknown>;
  return 'value' in o && 'source' in o && typeof o.verified === 'boolean';
}

/**
 * Walk `path` from the profile root and return the first envelope encountered.
 * Verification and fill-state are tracked on envelopes, so an HV/required path
 * nested inside a wrapped array (`offerings.core.*.priceRange`) resolves to its
 * enclosing envelope (`offerings.core`). Shared by hv.ts and coverage.ts.
 */
export function nearestEnvelope(
  profile: Record<string, unknown>,
  path: string,
): ProfileField<unknown> | undefined {
  let cur: unknown = profile;
  for (const seg of path.split('.')) {
    if (isEnvelope(cur)) return cur;
    if (cur === null || typeof cur !== 'object') return undefined;
    if (Array.isArray(cur)) {
      const idx = seg === '*' ? 0 : Number(seg);
      cur = Number.isInteger(idx) ? cur[idx] : undefined;
    } else {
      cur = (cur as Record<string, unknown>)[seg];
    }
  }
  return isEnvelope(cur) ? cur : undefined;
}
