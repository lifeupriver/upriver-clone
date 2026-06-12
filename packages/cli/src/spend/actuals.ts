// Estimate↔actual reconciliation (Spec 17b §3). Pure: inputs are plain
// arrays — usage-log entries from cost-summary's parseUsageLine, optional
// Supabase usage_events rows — so the log file, the table, and tests all
// feed it identically. Enforcement stays estimate-based BEFORE spend; this
// runs at reporting time and labels every component's source honestly.

import {
  estimateUsd,
  RATE_USD_PER_AGENT_SECOND,
  type SpendLedger,
} from '../pitch/ledger.js';
import type { UsageLogEntry } from '../util/cost-summary.js';

export interface ReconcileStep {
  id: string;
  /** ISO timestamp the step started — entries bucket into [at, nextAt). */
  at: string;
  est: SpendLedger;
}

/** A metered agent/LLM cost row (usage_events claude_api with cost_usd). */
export interface AgentCostRow {
  command: string;
  costUsd: number;
}

export type ComponentSource = 'actual' | 'estimate' | 'none';

export interface ReconciledStep {
  id: string;
  firecrawlCredits: number;
  agentSeconds: number;
  usd: number;
  creditsSource: ComponentSource;
  agentSource: ComponentSource;
  /** 'actual' when every present component is actual; 'mixed' when split. */
  source: 'actual' | 'estimate' | 'mixed';
}

export interface ReconcileResult {
  steps: ReconciledStep[];
  totals: { usd: number; actualUsd: number; estimateUsd: number };
}

/**
 * `pitch status` spend cell (Spec 17b §3): when the usage log has actual
 * credit spend, show the honest split — agent time stays an estimate, the
 * credits are real. Null actuals keep today's plain `$X.XX` rendering.
 */
export function formatSpendWithActuals(
  ledger: SpendLedger,
  actualCreditsUsd: number | null,
): string {
  if (actualCreditsUsd === null) return `$${ledger.estUsd.toFixed(2)}`;
  const agentEstUsd = ledger.agentSeconds * RATE_USD_PER_AGENT_SECOND;
  const total = agentEstUsd + actualCreditsUsd;
  return `$${total.toFixed(2)} (est $${agentEstUsd.toFixed(2)} + act $${actualCreditsUsd.toFixed(2)})`;
}

export function reconcile(opts: {
  steps: ReconcileStep[];
  entries: UsageLogEntry[];
  agentRows?: AgentCostRow[];
}): ReconcileResult {
  const { steps, entries, agentRows = [] } = opts;
  const out: ReconciledStep[] = [];
  let actualUsd = 0;
  let estimateUsd_ = 0;

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i]!;
    const from = Date.parse(step.at);
    const next = steps[i + 1];
    const to = next ? Date.parse(next.at) : Number.POSITIVE_INFINITY;
    const bucket = entries.filter((e) => {
      const t = Date.parse(e.ts);
      return Number.isFinite(t) && t >= from && t < to;
    });

    // Credits: actual when ANY entry landed in this step's window.
    const actualCredits = bucket.reduce((s, e) => s + e.credits, 0);
    const creditsActual = bucket.length > 0;
    const firecrawlCredits = creditsActual ? actualCredits : step.est.firecrawlCredits;
    const creditsSource: ComponentSource = creditsActual
      ? 'actual'
      : step.est.firecrawlCredits > 0
        ? 'estimate'
        : 'none';

    // Agent time: actual only when a metered cost row names this step.
    const agentRow = agentRows.find((r) => r.command === step.id);
    const agentSeconds = agentRow ? 0 : step.est.agentSeconds;
    const agentSource: ComponentSource = agentRow
      ? 'actual'
      : step.est.agentSeconds > 0
        ? 'estimate'
        : 'none';

    const creditsUsd = creditsActual
      ? estimateUsd({ firecrawlCredits: actualCredits, agentSeconds: 0 })
      : estimateUsd({ firecrawlCredits: step.est.firecrawlCredits, agentSeconds: 0 });
    const agentUsd = agentRow ? agentRow.costUsd : step.est.agentSeconds * RATE_USD_PER_AGENT_SECOND;
    const usd = creditsUsd + agentUsd;

    if (creditsSource === 'actual') actualUsd += creditsUsd;
    else if (creditsSource === 'estimate') estimateUsd_ += creditsUsd;
    if (agentSource === 'actual') actualUsd += agentUsd;
    else if (agentSource === 'estimate') estimateUsd_ += agentUsd;

    const present = [creditsSource, agentSource].filter((s) => s !== 'none');
    const source: ReconciledStep['source'] =
      present.length > 0 && present.every((s) => s === 'actual')
        ? 'actual'
        : present.includes('actual')
          ? 'mixed'
          : 'estimate';

    out.push({ id: step.id, firecrawlCredits, agentSeconds, usd, creditsSource, agentSource, source });
  }

  return { steps: out, totals: { usd: actualUsd + estimateUsd_, actualUsd, estimateUsd: estimateUsd_ } };
}
