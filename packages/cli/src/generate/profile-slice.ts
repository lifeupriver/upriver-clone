import { COVERAGE_MAP, nearestEnvelope, type ClientProfile, type DeliverableId } from '@upriver/schemas';

export interface SliceField {
  path: string;
  value: unknown;
  evidence?: string;
  /**
   * False when the value is an unverified, non-high-confidence recon finding
   * (P1, Build Spec 14): the client never confirmed it, so generators must
   * hedge it rather than assert it. Everything else — operator, transcript,
   * interview, verified or high-confidence recon — is confirmed.
   */
  confirmed: boolean;
}

/** The render tag generators are taught to hedge (mirrored in prompt-builder's UNCONFIRMED_INSTRUCTION). */
export const UNCONFIRMED_TAG = '[UNCONFIRMED — found by automated recon, not confirmed by the client]';

/**
 * Extract only a deliverable's `requiresFields` from the profile (spec §4):
 * the filled value plus its evidence string, with envelope metadata
 * (source/confidence/verified/updatedAt) stripped to keep tokens down. Unfilled
 * fields are omitted. Paths nested under an already-included path (e.g. the
 * wildcard `offerings.core.*.priceRange` under `offerings.core`) are deduped,
 * since the parent envelope already carries the whole array.
 */
export function profileSlice(profile: ClientProfile, id: DeliverableId): SliceField[] {
  const entry = COVERAGE_MAP.find((d) => d.id === id);
  if (!entry) throw new Error(`Unknown deliverable: ${id}`);
  const data = profile as unknown as Record<string, unknown>;
  const out: SliceField[] = [];
  for (const path of entry.requiresFields) {
    if (out.some((f) => path === f.path || path.startsWith(`${f.path}.`))) continue;
    const env = nearestEnvelope(data, path);
    if (!env || env.value === null || env.value === undefined) continue;
    const confirmed = !(env.source === 'recon' && env.verified !== true && env.confidence !== 'high');
    const field: SliceField = { path, value: env.value, confirmed };
    if (env.evidence !== undefined) field.evidence = env.evidence;
    out.push(field);
  }
  return out;
}

/** Render a slice as readable labeled values for the user prompt. */
export function renderSlice(fields: SliceField[]): string {
  if (fields.length === 0) return '(no profile fields are filled for this deliverable)';
  return fields
    .map((f) => {
      const value = typeof f.value === 'string' ? f.value : JSON.stringify(f.value, null, 2);
      const tag = f.confirmed ? '' : ` ${UNCONFIRMED_TAG}`;
      const evidence = f.evidence ? `\n  (evidence: ${f.evidence})` : '';
      return `- ${f.path}: ${value}${tag}${evidence}`;
    })
    .join('\n');
}
