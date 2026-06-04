import type { ProfileField, Source, Confidence } from './envelope.js';

/** operator > transcript > interview > recon. */
const PRECEDENCE: Record<Source, number> = {
  operator: 3,
  transcript: 2,
  interview: 1,
  recon: 0,
};

/** Per-source confidence applied when a candidate does not carry its own. */
const DEFAULT_CONFIDENCE: Record<Source, Confidence> = {
  operator: 'high',
  transcript: 'medium',
  interview: 'medium',
  recon: 'low',
};

export interface Candidate<T> {
  value: T;
  source: Source;
  confidence?: Confidence;
  evidence?: string;
}

export type MergeOutcome<T> =
  | { kind: 'applied'; field: ProfileField<T> }
  | { kind: 'conflict'; existing: ProfileField<T>; candidate: Candidate<T> };

/**
 * A conflict that was refused rather than overwritten. Callers append these to
 * `clients/<slug>/profile-conflicts.json` and surface them in `profile show`;
 * this package only produces the entry — persistence is the caller's job.
 */
export interface ConflictEntry {
  path: string;
  existing: ProfileField<unknown>;
  candidate: Candidate<unknown>;
  queuedAt: string;
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const ak = Object.keys(ao);
    const bk = Object.keys(bo);
    if (ak.length !== bk.length) return false;
    return ak.every((k) => k in bo && deepEqual(ao[k], bo[k]));
  }
  return false;
}

function build<T>(candidate: Candidate<T>, verified: boolean, now: string): ProfileField<T> {
  const field: ProfileField<T> = {
    value: candidate.value,
    source: candidate.source,
    confidence: candidate.confidence ?? DEFAULT_CONFIDENCE[candidate.source],
    verified,
    updatedAt: now,
  };
  if (candidate.evidence !== undefined) field.evidence = candidate.evidence;
  return field;
}

/**
 * The single arbiter for every write path (CLI, chatbot endpoint, recon,
 * transcript extractor). Pure: returns either the merged field or a conflict to
 * queue; never mutates `existing`.
 *
 * Rules (PRD §2.1 / spec §4), evaluated in order:
 *  - no existing value                          → applied
 *  - equal values                               → applied as a freshness touch (verified kept)
 *  - existing verified & non-operator candidate → conflict (HV protection)
 *  - existing verified & operator candidate     → applied (value changed → re-verify)
 *  - same source                                → applied (last-write-wins)
 *  - candidate precedence ≥ existing            → applied
 *  - candidate precedence < existing            → conflict (never silently overwritten)
 */
export function mergeCandidate<T>(
  existing: ProfileField<T> | undefined,
  candidate: Candidate<T>,
  now: string,
): MergeOutcome<T> {
  // Empty / null existing → take the candidate.
  if (existing === undefined || existing.value === null) {
    return { kind: 'applied', field: build(candidate, false, now) };
  }

  // Equal values → freshness touch, regardless of precedence. Preserve verified
  // and the stronger provenance already on record.
  if (deepEqual(existing.value, candidate.value)) {
    const touched: ProfileField<T> = { ...existing, updatedAt: now };
    if (candidate.evidence !== undefined) touched.evidence = candidate.evidence;
    return { kind: 'applied', field: touched };
  }

  // Verified fields accept a changed value only from the operator; because the
  // value changed, verification resets and must be re-confirmed.
  if (existing.verified) {
    if (candidate.source === 'operator') {
      return { kind: 'applied', field: build(candidate, false, now) };
    }
    return { kind: 'conflict', existing, candidate };
  }

  // Same source overwrites itself (last-write-wins).
  if (existing.source === candidate.source) {
    return { kind: 'applied', field: build(candidate, false, now) };
  }

  const existingPrec = existing.source === null ? -1 : PRECEDENCE[existing.source];
  const candidatePrec = PRECEDENCE[candidate.source];
  if (candidatePrec >= existingPrec) {
    return { kind: 'applied', field: build(candidate, false, now) };
  }
  return { kind: 'conflict', existing, candidate };
}

/** Build a queue entry from a conflict outcome. Persistence is the caller's job. */
export function conflictEntry(
  path: string,
  outcome: { existing: ProfileField<unknown>; candidate: Candidate<unknown> },
  queuedAt: string,
): ConflictEntry {
  return { path, existing: outcome.existing, candidate: outcome.candidate, queuedAt };
}

export { PRECEDENCE, DEFAULT_CONFIDENCE };
