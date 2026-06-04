import {
  COVERAGE_MAP,
  deliverableReadiness,
  fieldFilled,
  isEnvelope,
  isHumanVerifyRequired,
  mergeCandidate,
  nearestEnvelope,
  type Candidate,
  type ClientProfile,
  type ConflictEntry,
  type DeliverableId,
  type ProfileField,
} from '@upriver/schemas';

import { bumpMeta } from '../generate/profile-io.js';
import { leafPaths } from '../generate/profile-merge.js';
import { pathResolves } from './paths.js';

type Obj = Record<string, unknown>;

/** Set a value at an object-key dot-path on a clone, creating intermediate objects. */
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

/**
 * The dot-path of the first envelope on the way to `path` (the one
 * `nearestEnvelope` resolves to), or undefined. An array-nested HV gate like
 * `offerings.core.*.priceRange` resolves to its enclosing envelope `offerings.core`.
 */
function nearestEnvelopePath(root: unknown, path: string): string | undefined {
  let cur: unknown = root;
  const acc: string[] = [];
  for (const seg of path.split('.')) {
    if (isEnvelope(cur)) return acc.join('.');
    if (cur === null || typeof cur !== 'object') return undefined;
    if (Array.isArray(cur)) {
      const idx = seg === '*' ? 0 : Number(seg);
      if (!Number.isInteger(idx)) return undefined;
      cur = (cur as unknown[])[idx];
      acc.push(String(idx));
    } else {
      cur = (cur as Obj)[seg];
      acc.push(seg);
    }
  }
  return isEnvelope(cur) ? acc.join('.') : undefined;
}

function readySet(profile: ClientProfile, generated: DeliverableId[]): Set<DeliverableId> {
  return new Set(
    COVERAGE_MAP.filter((d) => deliverableReadiness(profile, d.id, generated).ready).map((d) => d.id),
  );
}

/** Parse a CLI value: JSON when it parses, otherwise the raw string. */
export function parseValueArg(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export interface SetPlan {
  profile: ClientProfile;
  path: string;
  /** An existing verified field had its verification reset because the value changed. */
  resetVerified: boolean;
}

/**
 * Plan an operator write at `path`. Builds an `operator` candidate and runs it
 * through `mergeCandidate` against the existing envelope; operator precedence
 * means it always applies. `set` never sets `verified` — `mergeCandidate` builds
 * a fresh field with `verified: false` on a changed value, and preserves an
 * existing `verified` only on an unchanged (freshness-touch) write. Pure.
 */
export function planSet(
  profile: ClientProfile,
  path: string,
  value: unknown,
  evidence: string | undefined,
  now: string,
): SetPlan {
  const existing = nearestEnvelope(profile as unknown as Obj, path);
  const candidate: Candidate<unknown> = { value, source: 'operator' };
  if (evidence !== undefined) candidate.evidence = evidence;
  const outcome = mergeCandidate(existing, candidate, now);
  if (outcome.kind === 'conflict') {
    // Unreachable for an operator candidate, but fail loudly rather than silently no-op.
    throw new Error(`Unexpected merge conflict setting "${path}" as operator.`);
  }
  const clone = structuredClone(profile);
  setAtPath(clone as unknown as Obj, path, outcome.field);
  return {
    profile: bumpMeta(clone, now),
    path,
    resetVerified: existing?.verified === true && outcome.field.verified !== true,
  };
}

export interface VerifyItem {
  path: string;
  ok: boolean;
  reason?: string;
  /** When ok, the envelope path actually flipped (`offerings.core` for an array-nested gate). */
  envPath?: string;
}
export interface VerifyPlan {
  profile: ClientProfile;
  items: VerifyItem[];
  verifiedCount: number;
  unblocked: DeliverableId[];
}

/**
 * Plan verification of `paths`. Each path must resolve, be human-verify-required,
 * and be filled (`fieldFilled` — the same predicate the gate uses, so an empty
 * array is rejected). Verifying sets `verified: true` on the nearest envelope and
 * records `evidence` if given; value/source are untouched. Reports the
 * deliverables the verification unblocks. Pure. The profile (and revision) are
 * only changed when ≥1 field is verified. `verify` is the only path past an HV gate.
 */
export function planVerify(
  profile: ClientProfile,
  paths: string[],
  evidence: string | undefined,
  generated: DeliverableId[],
  now: string,
): VerifyPlan {
  const beforeReady = readySet(profile, generated);
  const clone = structuredClone(profile);
  const data = clone as unknown as Obj;
  const items: VerifyItem[] = [];
  const flipped = new Set<string>();

  for (const path of paths) {
    if (!pathResolves(path)) {
      items.push({ path, ok: false, reason: 'does not resolve against the Client Profile schema' });
      continue;
    }
    if (!isHumanVerifyRequired(path)) {
      items.push({ path, ok: false, reason: 'not a human-verify-required field' });
      continue;
    }
    if (!fieldFilled(clone, path)) {
      items.push({ path, ok: false, reason: 'empty value — nothing to verify' });
      continue;
    }
    const envPath = nearestEnvelopePath(data, path);
    const env = envPath !== undefined ? nearestEnvelope(data, path) : undefined;
    if (envPath === undefined || env === undefined) {
      items.push({ path, ok: false, reason: 'no envelope found at path' });
      continue;
    }
    const updated: ProfileField<unknown> = { ...env, verified: true, updatedAt: now };
    if (evidence !== undefined) updated.evidence = evidence;
    setAtPath(data, envPath, updated);
    flipped.add(envPath);
    items.push({ path, ok: true, envPath });
  }

  if (flipped.size === 0) {
    return { profile, items, verifiedCount: 0, unblocked: [] };
  }
  const bumped = bumpMeta(clone, now);
  const afterReady = readySet(bumped, generated);
  const unblocked = [...afterReady].filter((id) => !beforeReady.has(id));
  return { profile: bumped, items, verifiedCount: flipped.size, unblocked };
}

export interface ResolvePlan {
  profile: ClientProfile;
  conflicts: ConflictEntry[];
  applied: boolean;
  path: string;
  keep: 'existing' | 'candidate';
}

/**
 * Resolve conflict at 0-based `index`. `keep: 'existing'` drops the entry and
 * writes nothing. `keep: 'candidate'` applies the candidate value as an
 * operator-sourced write (operator precedence ⇒ it lands; a changed value
 * resets `verified`) and drops the entry. Pure.
 */
export function planResolve(
  profile: ClientProfile,
  conflicts: ConflictEntry[],
  index: number,
  keep: 'existing' | 'candidate',
  now: string,
): ResolvePlan {
  if (index < 0 || index >= conflicts.length) {
    throw new Error(`No conflict #${index + 1} (the queue has ${conflicts.length}).`);
  }
  const entry = conflicts[index]!;
  const remaining = conflicts.filter((_, i) => i !== index);

  if (keep === 'existing') {
    return { profile, conflicts: remaining, applied: false, path: entry.path, keep };
  }

  const candidate: Candidate<unknown> = { value: entry.candidate.value, source: 'operator' };
  if (entry.candidate.evidence !== undefined) candidate.evidence = entry.candidate.evidence;
  const existing = nearestEnvelope(profile as unknown as Obj, entry.path);
  const outcome = mergeCandidate(existing, candidate, now);
  if (outcome.kind === 'conflict') {
    throw new Error(`Unexpected merge conflict resolving "${entry.path}" as operator.`);
  }
  const clone = structuredClone(profile);
  setAtPath(clone as unknown as Obj, entry.path, outcome.field);
  return { profile: bumpMeta(clone, now), conflicts: remaining, applied: true, path: entry.path, keep };
}

export interface PendingHv {
  path: string;
  envPath: string;
  value: unknown;
  evidence?: string;
}

/**
 * Filled, unverified human-verify-required fields, for `verify --all-filled`.
 * Scans the union of every deliverable's `requiresHvVerified` gate paths and the
 * profile's HV-matched leaf envelopes, deduped by the envelope each resolves to.
 * (Fields nested below a non-HV array leaf with no gate path are out of scope —
 * the same envelope-granularity limit the rest of the HV system has.) Pure.
 */
export function pendingHvVerifications(profile: ClientProfile): PendingHv[] {
  const data = profile as unknown as Obj;
  const candidates = new Set<string>([
    ...COVERAGE_MAP.flatMap((d) => d.requiresHvVerified),
    ...leafPaths(profile).filter((p) => isHumanVerifyRequired(p)),
  ]);
  const seen = new Set<string>();
  const out: PendingHv[] = [];
  for (const path of candidates) {
    const envPath = nearestEnvelopePath(data, path);
    if (envPath === undefined || seen.has(envPath)) continue;
    if (!fieldFilled(profile, path)) continue;
    const env = nearestEnvelope(data, path);
    if (!env || env.verified === true) continue;
    seen.add(envPath);
    const item: PendingHv = { path, envPath, value: env.value };
    if (env.evidence !== undefined) item.evidence = env.evidence;
    out.push(item);
  }
  return out;
}
