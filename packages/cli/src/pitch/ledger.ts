// Per-prospect spend ledger (Spec 19 §3): the ceiling is enforced in code,
// not convention. `wouldExceed` is checked BEFORE every costed step; the
// `--dry-run` estimate table comes from the same constants so the preview
// and the enforcement can never drift apart.

export interface SpendLedger {
  firecrawlCredits: number;
  agentSeconds: number;
  estUsd: number;
}

// Honest estimates, not precision theater — tune as real runs are observed
// and note changes in the spec changelog. Sources: Firecrawl ~$16/3k credits;
// a metered Claude agent session runs a few dollars per ~10 min.
export const RATE_USD_PER_FIRECRAWL_CREDIT = 0.005;
export const RATE_USD_PER_AGENT_SECOND = 0.004; // ≈ $0.24/min

export const PITCH_MAX_SPEND_USD_DEFAULT = 5;
export const PITCH_MAX_BATCH_SPEND_USD_DEFAULT = 50;

/** The costed steps of a pitch run, in execution order. */
export const PITCH_STEPS = [
  'init-map',
  'scrape-home',
  'clone-home',
  'teasers',
] as const;
export type PitchStep = (typeof PITCH_STEPS)[number];

// Per-INVOCATION estimates. scrape ≈ 6+ credits/page (scrape.ts ceiling
// comment); homepage clone ≈ one 10-min agent session; one teaser doc ≈ 2 min
// (the pipeline runs the `teasers` step four times, once per doc — the
// estimate table multiplies by PIPELINE_STEP_COUNTS for the full-run view).
const STEP_ESTIMATES: Record<PitchStep, { firecrawlCredits: number; agentSeconds: number }> = {
  'init-map': { firecrawlCredits: 2, agentSeconds: 0 },
  'scrape-home': { firecrawlCredits: 8, agentSeconds: 0 },
  'clone-home': { firecrawlCredits: 0, agentSeconds: 600 },
  teasers: { firecrawlCredits: 0, agentSeconds: 120 },
};

/** How many times each costed step runs in one full pitch pipeline. */
const PIPELINE_STEP_COUNTS: Record<PitchStep, number> = {
  'init-map': 1,
  'scrape-home': 1,
  'clone-home': 1,
  teasers: 4,
};

function toUsd(firecrawlCredits: number, agentSeconds: number): number {
  return (
    firecrawlCredits * RATE_USD_PER_FIRECRAWL_CREDIT + agentSeconds * RATE_USD_PER_AGENT_SECOND
  );
}

export function emptyLedger(): SpendLedger {
  return { firecrawlCredits: 0, agentSeconds: 0, estUsd: 0 };
}

export function addSpend(
  ledger: SpendLedger,
  delta: { firecrawlCredits?: number; agentSeconds?: number; estUsd?: number },
): SpendLedger {
  const firecrawlCredits = ledger.firecrawlCredits + (delta.firecrawlCredits ?? 0);
  const agentSeconds = ledger.agentSeconds + (delta.agentSeconds ?? 0);
  const estUsd =
    ledger.estUsd +
    (delta.estUsd ?? toUsd(delta.firecrawlCredits ?? 0, delta.agentSeconds ?? 0));
  return { firecrawlCredits, agentSeconds, estUsd };
}

export function estimateStepUsd(step: PitchStep): number {
  const e = STEP_ESTIMATES[step];
  return toUsd(e.firecrawlCredits, e.agentSeconds);
}

/**
 * True when taking `step` on top of what `ledger` already spent would break
 * the ceiling. Call this BEFORE the step — an over-budget run aborts cleanly
 * with the step untaken, never after the money is gone.
 */
export function wouldExceed(ledger: SpendLedger, step: PitchStep, maxUsd: number): boolean {
  return ledger.estUsd + estimateStepUsd(step) > maxUsd;
}

export function sumLedgers(ledgers: readonly SpendLedger[]): SpendLedger {
  return ledgers.reduce(
    (acc, l) => ({
      firecrawlCredits: acc.firecrawlCredits + l.firecrawlCredits,
      agentSeconds: acc.agentSeconds + l.agentSeconds,
      estUsd: acc.estUsd + l.estUsd,
    }),
    emptyLedger(),
  );
}

export interface EstimateTable {
  steps: Array<{
    step: PitchStep;
    count: number;
    firecrawlCredits: number;
    agentSeconds: number;
    usd: number;
  }>;
  totalUsd: number;
  ceilingUsd: number;
  fitsCeiling: boolean;
}

/** The `--dry-run` cost table: every costed step ×count, the total, the ceiling. */
export function estimateTable(ceilingUsd: number): EstimateTable {
  const steps = PITCH_STEPS.map((step) => {
    const count = PIPELINE_STEP_COUNTS[step];
    const e = STEP_ESTIMATES[step];
    return {
      step,
      count,
      firecrawlCredits: e.firecrawlCredits * count,
      agentSeconds: e.agentSeconds * count,
      usd: estimateStepUsd(step) * count,
    };
  });
  const totalUsd = steps.reduce((s, r) => s + r.usd, 0);
  return { steps, totalUsd, ceilingUsd, fitsCeiling: totalUsd <= ceilingUsd };
}
