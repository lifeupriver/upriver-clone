import { SOURCE_EXPECTATIONS, fieldFilled, type ClientProfile, type ConflictEntry } from '@upriver/schemas';

import { mergeCandidates, structurallyValid, type CandidateOutcome } from './merge-candidates.js';
import type { ReconAdapter, ReconAdapterId, ReconContext } from './types.js';

/** What one adapter produced in a run (or why it failed). */
export interface AdapterRunResult {
  id: ReconAdapterId;
  ok: boolean;
  error?: string;
  /** Evidence files persisted under `clients/<slug>/recon/<id>/`. */
  evidenceFiles: string[];
  /** Candidates that passed structural validation (the ones merged). */
  candidates: import('./types.js').PathedCandidate[];
  /** Candidates dropped before merge, with the reason. */
  dropped: { path: string; reason: string }[];
  /** Merge outcome per surviving candidate, aligned 1:1 with `candidates`. */
  outcomes: CandidateOutcome[];
}

export interface ReconRunResult {
  perAdapter: AdapterRunResult[];
  profileBefore: ClientProfile;
  profileAfter: ClientProfile;
  conflicts: ConflictEntry[];
}

export interface ReconPlan {
  adapters: ReconAdapterId[];
  /** `SOURCE_EXPECTATIONS.recon` targets not yet filled in the current profile. */
  unfilledTargets: string[];
}

/**
 * Dry-run: gather nothing, just report which adapters would run and which recon
 * targets are still empty (build spec 04 §3 DoD). Pure.
 */
export function planRecon(
  ctx: Pick<ReconContext, 'profile'>,
  adapters: ReconAdapter[],
): ReconPlan {
  const unfilledTargets = SOURCE_EXPECTATIONS.recon.filter((p) => !fieldFilled(ctx.profile, p));
  return { adapters: adapters.map((a) => a.id), unfilledTargets };
}

/**
 * Orchestrate a recon run: each adapter gathers → extracts → its candidates are
 * structurally validated, then all surviving candidates merge through the recon
 * precedence rules. A throwing adapter is recorded and skipped — the others still
 * merge (build spec 04 §3 DoD). Pure w.r.t. persistence: returns the merged
 * profile + conflicts; the caller writes them.
 */
export async function runRecon(
  ctx: ReconContext,
  adapters: ReconAdapter[],
): Promise<ReconRunResult> {
  const profileBefore = ctx.profile;
  const perAdapter: AdapterRunResult[] = [];

  // Phase 1: gather + extract + validate, per adapter, isolating failures.
  for (const adapter of adapters) {
    const result: AdapterRunResult = {
      id: adapter.id,
      ok: true,
      evidenceFiles: [],
      candidates: [],
      dropped: [],
      outcomes: [],
    };
    try {
      const evidence = await adapter.gather(ctx);
      result.evidenceFiles = evidence.files;
      const extracted = await adapter.extract(evidence, ctx);
      for (const candidate of extracted) {
        if (structurallyValid(candidate.path, candidate.value, ctx.now)) {
          result.candidates.push(candidate);
        } else {
          result.dropped.push({ path: candidate.path, reason: 'failed schema validation' });
        }
      }
    } catch (err) {
      result.ok = false;
      result.error = err instanceof Error ? err.message : String(err);
    }
    perAdapter.push(result);
  }

  // Phase 2: one merge over all surviving candidates, in adapter order, so the
  // recon precedence rules see the whole batch (and successive candidates to the
  // same path chain). Outcomes come back aligned 1:1 with the flattened input.
  const flat = perAdapter.flatMap((r) => r.candidates);
  const merged = mergeCandidates(profileBefore, flat, ctx.now);

  let cursor = 0;
  for (const result of perAdapter) {
    result.outcomes = merged.outcomes.slice(cursor, cursor + result.candidates.length);
    cursor += result.candidates.length;
  }

  return {
    perAdapter,
    profileBefore,
    profileAfter: merged.profile,
    conflicts: merged.conflicts,
  };
}
