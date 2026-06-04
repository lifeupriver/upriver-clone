// Apply reconciled transcript candidates through the SAME merge path every
// other source uses (spec §1). Candidates become `source: transcript`,
// `verified: false` envelopes; `mergeProfiles` arbitrates — transcript beats
// interview/recon, loses to operator (→ conflict queued), and never verifies.

import { createEmptyProfile, type ClientProfile, type ProfileField } from '@upriver/schemas';

import { mergeProfiles, type MergeResult } from '../generate/profile-merge.js';
import type { ReconciledCandidate } from './types.js';

/** Envelope evidence cap (envelope.ts: `z.string().max(2000)`). */
export const EVIDENCE_MAX = 2000;

/** Clamp a quote to the evidence cap so a long excerpt can't fail validation. */
export function clampEvidence(quote: string): string {
  if (quote.length <= EVIDENCE_MAX) return quote;
  return `${quote.slice(0, EVIDENCE_MAX - 1)}…`;
}

function setAtPath(root: Record<string, unknown>, path: string, value: unknown): void {
  const segs = path.split('.');
  let cur = root;
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i] as string;
    if (typeof cur[seg] !== 'object' || cur[seg] === null) cur[seg] = {};
    cur = cur[seg] as Record<string, unknown>;
  }
  cur[segs[segs.length - 1] as string] = value;
}

/**
 * Build an incoming partial profile of transcript envelopes. `source` is set
 * explicitly to `transcript` on every envelope — `mergeProfiles` defaults a
 * source-less envelope to `operator`, which would silently overwrite real
 * operator data instead of queuing a conflict.
 */
export function buildIncomingProfile(
  slug: string,
  candidates: ReconciledCandidate[],
  now: string,
): ClientProfile {
  const incoming = createEmptyProfile(slug, now) as unknown as Record<string, unknown>;
  for (const c of candidates) {
    const env: ProfileField<unknown> = {
      value: c.value,
      source: 'transcript',
      confidence: c.confidence,
      verified: false,
      evidence: clampEvidence(c.quote),
      updatedAt: now,
    };
    setAtPath(incoming, c.path, env);
  }
  return incoming as unknown as ClientProfile;
}

/** Merge transcript candidates into `existing`, returning the merge result. */
export function applyCandidates(
  existing: ClientProfile,
  candidates: ReconciledCandidate[],
  now: string,
): MergeResult {
  const incoming = buildIncomingProfile(existing._meta.slug, candidates, now);
  return mergeProfiles(existing, incoming, now);
}
