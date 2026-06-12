// Per-run spend ledger persisted at `<clientDir>/run-ledger.json` (Spec 17b
// §2). Schema-versioned like pitch/state.ts so the Spec 18 harvest sweep
// needs no adapters. Estimates are what the ceiling enforced; actuals (when
// the usage log has them) are attached per stage WITHOUT overwriting the
// estimate — the gap between the two is exactly the calibration signal.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { SpendLedger } from '../pitch/ledger.js';

export const RUN_LEDGER_VERSION = 1 as const;

export interface RunLedgerStageActual {
  firecrawlCredits?: number;
  agentSeconds?: number;
  usd?: number;
  source: 'usage-log' | 'usage-events';
}

export interface RunLedgerStage {
  id: string;
  at: string;
  est: SpendLedger;
  actual?: RunLedgerStageActual;
}

export interface RunLedger {
  v: typeof RUN_LEDGER_VERSION;
  slug: string;
  startedAt: string;
  updatedAt: string;
  /** null = ceiling disabled for this run (--no-spend-ceiling). */
  ceilingUsd: number | null;
  stages: RunLedgerStage[];
  totalEstUsd: number;
}

export function createRunLedger(slug: string, ceilingUsd: number | null): RunLedger {
  const now = new Date().toISOString();
  return {
    v: RUN_LEDGER_VERSION,
    slug,
    startedAt: now,
    updatedAt: now,
    ceilingUsd,
    stages: [],
    totalEstUsd: 0,
  };
}

export function recordStageEst(ledger: RunLedger, id: string, est: SpendLedger): RunLedger {
  const now = new Date().toISOString();
  return {
    ...ledger,
    updatedAt: now,
    stages: [...ledger.stages, { id, at: now, est }],
    totalEstUsd: ledger.totalEstUsd + est.estUsd,
  };
}

export function recordStageActual(
  ledger: RunLedger,
  id: string,
  actual: RunLedgerStageActual,
): RunLedger {
  return {
    ...ledger,
    updatedAt: new Date().toISOString(),
    stages: ledger.stages.map((s) => (s.id === id ? { ...s, actual } : s)),
  };
}

export function runLedgerPath(clientDir: string): string {
  return join(clientDir, 'run-ledger.json');
}

export function writeRunLedger(clientDir: string, ledger: RunLedger): void {
  writeFileSync(runLedgerPath(clientDir), `${JSON.stringify(ledger, null, 2)}\n`);
}

/**
 * Read the run ledger when one exists; null for a fresh run. A foreign
 * version refuses loudly — silently resetting it would erase spend history.
 */
export function readRunLedgerIfExists(clientDir: string): RunLedger | null {
  const path = runLedgerPath(clientDir);
  if (!existsSync(path)) return null;
  const raw = JSON.parse(readFileSync(path, 'utf8')) as RunLedger;
  if (raw.v !== RUN_LEDGER_VERSION) {
    throw new Error(
      `Unsupported run-ledger version ${JSON.stringify(raw.v)} at ${path} (expected ${RUN_LEDGER_VERSION})`,
    );
  }
  return raw;
}
