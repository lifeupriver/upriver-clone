import {
  mergeCandidate,
  conflictEntry,
  isEnvelope,
  leafPaths,
  nearestEnvelope,
  type ClientProfile,
  type ConflictEntry,
  type Candidate,
  type ProfileField,
  type Source,
} from '@upriver/schemas';

import { bumpMeta } from './profile-io.js';

// `leafPaths` is the shared coverage walker (promoted to @upriver/schemas with
// `buildShowModel` — Build Spec 06). Re-exported so existing consumers
// (`profile/mutate.ts`, `transcript/report.ts`, `show-model`) keep resolving it here.
export { leafPaths };

export interface MergeResult {
  profile: ClientProfile;
  applied: string[];
  unchanged: string[];
  conflicts: ConflictEntry[];
}

type Obj = Record<string, unknown>;

/**
 * Collect every leaf envelope in a profile as `{ path, env }`. Arrays are
 * wrapped as single envelopes, so leaf paths are pure object-key dot-paths
 * (no array indices).
 */
function walkEnvelopes(
  node: unknown,
  prefix: string,
  out: Array<{ path: string; env: ProfileField<unknown> }>,
): void {
  if (isEnvelope(node)) {
    out.push({ path: prefix, env: node });
    return;
  }
  if (node === null || typeof node !== 'object' || Array.isArray(node)) return;
  for (const [k, v] of Object.entries(node as Obj)) {
    walkEnvelopes(v, prefix ? `${prefix}.${k}` : k, out);
  }
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

function toCandidate(env: ProfileField<unknown>): Candidate<unknown> {
  const c: Candidate<unknown> = { value: env.value, source: (env.source ?? 'operator') as Source };
  if (env.confidence != null) c.confidence = env.confidence;
  if (env.evidence !== undefined) c.evidence = env.evidence;
  return c;
}

/**
 * Per-field merge of `incoming` into `existing` using the `@upriver/schemas`
 * merge rules (spec §3.4). Imported leaves carry their own envelopes; a leaf
 * whose envelope lacks a source defaults to `operator`. Conflicts are collected
 * (never applied); applied/equal values are written into a clone of `existing`.
 */
export function mergeProfiles(
  existing: ClientProfile,
  incoming: ClientProfile,
  now: string,
): MergeResult {
  const result = structuredClone(existing);
  const root = result as unknown as Obj;
  const applied: string[] = [];
  const unchanged: string[] = [];
  const conflicts: ConflictEntry[] = [];

  const leaves: Array<{ path: string; env: ProfileField<unknown> }> = [];
  walkEnvelopes(incoming, '', leaves);

  for (const { path, env } of leaves) {
    const candidate = toCandidate(env);
    const existingEnv = nearestEnvelope(existing as unknown as Obj, path);
    const outcome = mergeCandidate(existingEnv, candidate, now);
    if (outcome.kind === 'conflict') {
      conflicts.push(conflictEntry(path, outcome, now));
      continue;
    }
    setAtPath(root, path, outcome.field);
    const wasPresent = existingEnv !== undefined && existingEnv.value !== null;
    const sameValue =
      wasPresent && JSON.stringify(existingEnv?.value) === JSON.stringify(candidate.value);
    if (sameValue) unchanged.push(path);
    else applied.push(path);
  }

  return { profile: result, applied, unchanged, conflicts };
}

export interface ImportPlan {
  mode: 'created' | 'merged' | 'replaced';
  toWrite: ClientProfile;
  applied: number;
  conflicted: number;
  unchanged: number;
  conflicts: ConflictEntry[];
}

/**
 * Decide what `profile import` should persist (spec §3): create as-is (revision
 * 1 if absent), per-field merge (revision-bumped, conflicts collected), or
 * `--replace` wholesale (revision-bumped, original `createdAt` preserved). Pure.
 */
export function planImport(
  existing: ClientProfile | null,
  parsed: ClientProfile,
  now: string,
  replace: boolean,
): ImportPlan {
  if (!existing) {
    const revision = parsed._meta.revision >= 1 ? parsed._meta.revision : 1;
    return {
      mode: 'created',
      toWrite: { ...parsed, _meta: { ...parsed._meta, revision } },
      applied: leafPaths(parsed).length,
      conflicted: 0,
      unchanged: 0,
      conflicts: [],
    };
  }
  if (replace) {
    return {
      mode: 'replaced',
      toWrite: bumpMeta(
        { ...parsed, _meta: { ...parsed._meta, createdAt: existing._meta.createdAt, revision: existing._meta.revision } },
        now,
      ),
      applied: leafPaths(parsed).length,
      conflicted: 0,
      unchanged: 0,
      conflicts: [],
    };
  }
  const merged = mergeProfiles(existing, parsed, now);
  return {
    mode: 'merged',
    toWrite: bumpMeta(merged.profile, now),
    applied: merged.applied.length,
    conflicted: merged.conflicts.length,
    unchanged: merged.unchanged.length,
    conflicts: merged.conflicts,
  };
}
