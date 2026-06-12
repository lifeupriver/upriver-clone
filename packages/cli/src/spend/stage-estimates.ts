// Per-stage spend estimates for the orchestrated pipeline (Spec 17b §2).
// Same posture as pitch/ledger.ts: honest provisional estimates, the SAME
// constants feed the --dry-run table and the enforcement check so preview and
// enforcement can never drift. PROVISIONAL BY CONSTRUCTION — no gated workflow
// has ever been dispatched (spec §Why); the Spec 18 harvest corpus is the
// tuning input. Note changes in the spec changelog.

import type { PipelineStageId } from '@upriver/core';
import { estimateUsd, type StepEstimate } from '../pitch/ledger.js';

/** Per-run ceiling default for `run all` / `clone` (brainstorm decision 3). */
export const RUN_MAX_SPEND_USD_DEFAULT = 25;

export interface RunEstimateCtx {
  /** Pages the run expects to scrape/clone; callers default to 5 when unknown. */
  pages: number;
  auditMode: 'base' | 'deep' | 'tooling' | 'all';
}

type EstimateFn = (ctx: RunEstimateCtx) => StepEstimate | null;

// Grounding: scrape ≈ 6–8 credits/page plus a small map cost (scrape.ts
// ceiling comment, pitch ledger); a clone agent session ≈ 10 min/page (pitch
// `clone-home`); the optional doc/LLM stages run a couple of minutes of
// metered Claude each. Stages that only shuffle artifacts on disk are free
// and NEVER block on the ceiling.
const STAGE_ESTIMATES: Partial<Record<PipelineStageId, EstimateFn>> = {
  scrape: ({ pages }) => ({ firecrawlCredits: 2 + 8 * pages, agentSeconds: 0 }),
  discover: () => ({ firecrawlCredits: 20, agentSeconds: 0 }),
  audit: ({ auditMode }) =>
    auditMode === 'deep' || auditMode === 'all'
      ? { firecrawlCredits: 0, agentSeconds: 300 }
      : null,
  'audit-media': () => ({ firecrawlCredits: 0, agentSeconds: 90 }),
  'gap-analysis': () => ({ firecrawlCredits: 0, agentSeconds: 90 }),
  'video-audit': () => ({ firecrawlCredits: 0, agentSeconds: 90 }),
  synthesize: () => ({ firecrawlCredits: 0, agentSeconds: 60 }),
  'voice-extract': () => ({ firecrawlCredits: 0, agentSeconds: 90 }),
  'blog-topics': () => ({ firecrawlCredits: 0, agentSeconds: 120 }),
  'schema-build': () => ({ firecrawlCredits: 0, agentSeconds: 90 }),
  clone: ({ pages }) => ({ firecrawlCredits: 0, agentSeconds: 600 * pages }),
  improve: () => ({ firecrawlCredits: 0, agentSeconds: 60 }),
};

/**
 * Estimate for one stage, or null when the stage is free (pure bookkeeping —
 * scaffold, finalize, clone-fidelity, fixes-plan… — or costless in the given
 * mode). Free stages are never ceiling-checked.
 */
export function stageEstimate(id: string, ctx: RunEstimateCtx): StepEstimate | null {
  const fn = STAGE_ESTIMATES[id as PipelineStageId];
  if (!fn) return null;
  const e = fn(ctx);
  if (!e || (e.firecrawlCredits === 0 && e.agentSeconds === 0)) return null;
  return e;
}

export interface RunEstimateTable {
  rows: Array<{ id: string; firecrawlCredits: number; agentSeconds: number; usd: number }>;
  totalUsd: number;
  ceilingUsd: number | null;
  fitsCeiling: boolean;
}

/** The `--dry-run` cost table: every costed stage, the total, the verdict. */
export function estimateRunTable(
  stageIds: readonly string[],
  ctx: RunEstimateCtx,
  ceilingUsd: number | null,
): RunEstimateTable {
  const rows = [];
  for (const id of stageIds) {
    const e = stageEstimate(id, ctx);
    if (!e) continue;
    rows.push({
      id,
      firecrawlCredits: e.firecrawlCredits,
      agentSeconds: e.agentSeconds,
      usd: estimateUsd(e),
    });
  }
  const totalUsd = rows.reduce((s, r) => s + r.usd, 0);
  return {
    rows,
    totalUsd,
    ceilingUsd,
    fitsCeiling: ceilingUsd === null ? true : totalUsd <= ceilingUsd,
  };
}
