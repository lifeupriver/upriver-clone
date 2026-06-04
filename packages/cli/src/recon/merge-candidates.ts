import {
  mergeCandidate,
  conflictEntry,
  nearestEnvelope,
  clientProfileZ,
  createEmptyProfile,
  type Candidate,
  type ClientProfile,
  type ConflictEntry,
  type ProfileField,
} from '@upriver/schemas';

import type { PathedCandidate } from './types.js';

type Obj = Record<string, unknown>;

/**
 * Is `value` structurally valid for `path` against the real profile schema? The
 * `--json-schema` flag constrains the LLM at extraction; this is the belt — a
 * candidate whose value would not parse against `@upriver/schemas` is dropped
 * before merge so a malformed extraction can never corrupt `profile.json`. Builds
 * a throwaway profile with one envelope set at `path` and parses it. Pure.
 */
export function structurallyValid(path: string, value: unknown, now: string): boolean {
  const probe = createEmptyProfile('__recon_probe__', now) as unknown as Obj;
  const env: ProfileField<unknown> = {
    value,
    source: 'recon',
    confidence: 'low',
    verified: false,
    updatedAt: now,
  };
  setAtPath(probe, path, env);
  return clientProfileZ.safeParse(probe).success;
}

/** Set a value at an object-key dot-path, creating intermediate objects. */
function setAtPath(root: Obj, path: string, value: unknown): void {
  const segs = path.split('.');
  let cur: Obj = root;
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i] as string;
    const next = cur[seg];
    if (next === null || typeof next !== 'object' || Array.isArray(next)) cur[seg] = {};
    cur = cur[seg] as Obj;
  }
  cur[segs[segs.length - 1] as string] = value;
}

/** How a single recon candidate resolved against the existing profile. */
export type CandidateOutcomeKind = 'filled' | 'skipped' | 'conflicted';

export interface CandidateOutcome {
  path: string;
  kind: CandidateOutcomeKind;
}

export interface MergeCandidatesResult {
  /** A clone of `existing` with every applied candidate written in. */
  profile: ClientProfile;
  /** One outcome per input candidate, in input order. */
  outcomes: CandidateOutcome[];
  /** Conflicts to queue to `profile-conflicts.json` (caller persists). */
  conflicts: ConflictEntry[];
}

/**
 * Merge a batch of `source: 'recon'` candidates into a profile through the
 * `@upriver/schemas` `mergeCandidate` arbiter (build spec 04 §1.3). Recon is the
 * lowest precedence: it fills empty fields, leaves equal values as freshness
 * touches, and queues a conflict rather than overwriting any higher-precedence or
 * verified value. Pure — `now` is injected, never read from the clock.
 */
export function mergeCandidates(
  existing: ClientProfile,
  candidates: PathedCandidate[],
  now: string,
): MergeCandidatesResult {
  const profile = structuredClone(existing);
  const root = profile as unknown as Obj;
  const outcomes: CandidateOutcome[] = [];
  const conflicts: ConflictEntry[] = [];

  for (const pc of candidates) {
    const candidate: Candidate<unknown> = { value: pc.value, source: 'recon' };
    if (pc.confidence != null) candidate.confidence = pc.confidence;
    if (pc.evidence !== undefined) candidate.evidence = pc.evidence;

    // Read against the working clone so successive candidates to the same path
    // chain (a later candidate sees what an earlier one wrote).
    const existingEnv = nearestEnvelope(profile as unknown as Obj, pc.path);
    const wasEmpty = existingEnv === undefined || existingEnv.value === null;

    const outcome = mergeCandidate(existingEnv, candidate, now);
    if (outcome.kind === 'conflict') {
      conflicts.push(conflictEntry(pc.path, outcome, now));
      outcomes.push({ path: pc.path, kind: 'conflicted' });
      continue;
    }

    setAtPath(root, pc.path, outcome.field);
    // `mergeCandidate` applied the write. It is a gap fill ("filled") unless the
    // existing value was equal — that path is a freshness touch that keeps the
    // stronger provenance/verification, which we report as "skipped".
    const equalToExisting =
      !wasEmpty && JSON.stringify(existingEnv?.value) === JSON.stringify(candidate.value);
    outcomes.push({ path: pc.path, kind: equalToExisting ? 'skipped' : 'filled' });
  }

  return { profile, outcomes, conflicts };
}
