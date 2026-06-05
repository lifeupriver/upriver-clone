import type { ClientProfile } from './client-profile.js';
import { isEnvelope, nearestEnvelope } from './envelope.js';
import { unverifiedHvFields } from './hv.js';
import { COVERAGE_MAP, MUST_ASK, type DeliverableId } from './coverage-map.js';

type ProfileData = Record<string, unknown>;

/**
 * Every leaf-envelope dot-path present in a profile (for fill counts). Arrays
 * are wrapped as single envelopes, so leaf paths are pure object-key dot-paths
 * (no array indices). The shared walker behind `profile show`'s per-section fill
 * stats and the dashboard coverage view (kept identical so the two never drift).
 */
export function leafPaths(profile: ClientProfile): string[] {
  const out: string[] = [];
  const walk = (node: unknown, prefix: string): void => {
    if (isEnvelope(node)) {
      out.push(prefix);
      return;
    }
    if (node === null || typeof node !== 'object' || Array.isArray(node)) return;
    for (const [k, v] of Object.entries(node)) walk(v, prefix ? `${prefix}.${k}` : k);
  };
  walk(profile, '');
  return out;
}

/**
 * Is the field at `path` filled (`value !== null`)? For a path through a wrapped
 * array (`offerings.core.*.priceRange`) this resolves to the enclosing envelope
 * and is "filled" when that array is non-empty. The shared brain for `generate`,
 * `profile show`, and the chatbot.
 */
export function fieldFilled(profile: ClientProfile, path: string): boolean {
  const env = nearestEnvelope(profile as unknown as ProfileData, path);
  if (!env) return false;
  const v = env.value;
  if (v === null || v === undefined) return false;
  if (Array.isArray(v)) return v.length > 0;
  return true;
}

export interface Readiness {
  ready: boolean;
  missingFields: string[];
  unverifiedHv: string[];
  missingDocs: DeliverableId[];
}

/**
 * A deliverable's readiness: required fields present ∧ required HV fields
 * verified ∧ upstream docs generated. `generated` is the caller-supplied set of
 * already-generated deliverable ids — this package never looks at the filesystem.
 */
export function deliverableReadiness(
  profile: ClientProfile,
  id: DeliverableId,
  generated: DeliverableId[] = [],
): Readiness {
  const d = COVERAGE_MAP.find((x) => x.id === id);
  if (!d) throw new Error(`Unknown deliverable: ${id}`);
  const missingFields = d.requiresFields.filter((p) => !fieldFilled(profile, p));
  const unverifiedHv = unverifiedHvFields(profile as unknown as ProfileData, d.requiresHvVerified);
  const generatedSet = new Set(generated);
  const missingDocs = d.requiresDocs.filter((x) => !generatedSet.has(x));
  const ready = missingFields.length === 0 && unverifiedHv.length === 0 && missingDocs.length === 0;
  return { ready, missingFields, unverifiedHv, missingDocs };
}

/**
 * Topologically sort `ids` by their `requiresDocs` edges (deps first). Throws on
 * a cycle. Edges to deliverables outside `ids` are ignored, so callers can order
 * any subset.
 */
export function generationOrder(ids: DeliverableId[]): DeliverableId[] {
  const idSet = new Set(ids);
  const byId = new Map(COVERAGE_MAP.map((d) => [d.id, d] as const));
  const visited = new Set<DeliverableId>();
  const temp = new Set<DeliverableId>();
  const out: DeliverableId[] = [];
  const visit = (id: DeliverableId): void => {
    if (visited.has(id)) return;
    if (temp.has(id)) throw new Error(`Cycle detected in coverage DAG at ${id}`);
    temp.add(id);
    const d = byId.get(id);
    if (d) {
      for (const dep of d.requiresDocs) {
        if (idSet.has(dep)) visit(dep);
      }
    }
    temp.delete(id);
    visited.add(id);
    out.push(id);
  };
  for (const id of ids) visit(id);
  return out;
}

export interface QueuedQuestion {
  path: string;
  unblocksCount: number;
  askVia: 'session' | 'chatbot' | 'operator';
}

/**
 * The interview's question queue: must-ask fields required by the engagement
 * scope, minus those already filled, ordered by how many in-scope deliverables
 * each field currently blocks (descending).
 */
export function questionQueue(profile: ClientProfile, scope: DeliverableId[]): QueuedQuestion[] {
  const scopeDeliverables = COVERAGE_MAP.filter((d) => scope.includes(d.id));
  const queue: QueuedQuestion[] = [];
  for (const entry of MUST_ASK) {
    if (fieldFilled(profile, entry.path)) continue;
    const blocked = scopeDeliverables.filter(
      (d) => d.requiresFields.includes(entry.path) && !deliverableReadiness(profile, d.id).ready,
    );
    if (blocked.length === 0) continue;
    queue.push({ path: entry.path, unblocksCount: blocked.length, askVia: entry.askVia });
  }
  queue.sort((a, b) => b.unblocksCount - a.unblocksCount);
  return queue;
}
