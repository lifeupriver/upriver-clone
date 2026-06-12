// The one per-stage spend decision `run all` makes before spawning a stage
// (Spec 17b §2). Pure so the abort-before-spend property is unit-testable
// away from the orchestrator: 'over-ceiling' means the stage was NOT taken.

import { wouldExceedEstimate, type SpendLedger } from '../pitch/ledger.js';
import { stageEstimate, type RunEstimateCtx } from './stage-estimates.js';

export type StageSpendDecision = 'free' | 'run' | 'over-ceiling';

/**
 * Spec 17b §4 — spend-ceiling abort for `run all` / `clone`. The over-ceiling
 * step was NOT taken. Distinct from pitch's 21 (different command surface)
 * and from every e2e-harness range.
 */
export const EXIT_SPEND_CEILING = 61;

/**
 * Decide whether `stageId` may run given what the ledger already committed.
 * Free stages always run (they cost nothing, blocking them only hides state);
 * a null ceiling means enforcement is disabled (--no-spend-ceiling).
 */
export function checkStage(
  ledger: SpendLedger,
  stageId: string,
  ctx: RunEstimateCtx,
  ceilingUsd: number | null,
): StageSpendDecision {
  const est = stageEstimate(stageId, ctx);
  if (!est) return 'free';
  if (ceilingUsd === null) return 'run';
  return wouldExceedEstimate(ledger, est, ceilingUsd) ? 'over-ceiling' : 'run';
}
