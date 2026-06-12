// Clone hardening (Spec 19 §4 — the homepage-scoped fold-in of the un-landed
// Spec 17 items). Pure helpers so each behavior is unit-testable away from
// the oclif command:
//
//  1. prompt-size preflight — fail fast BEFORE an agent session is spawned
//  2. one fresh retry on the no-file failure class — a session that produced
//     zero changes gets exactly one more fresh session, then is final
//  3. fidelity gate — assert a scored result before anything prospect-facing
//     is persisted/staged; fail CLOSED when no score exists

import type { FidelitySummary } from '../clone-qa/fidelity-scorer.js';

/**
 * Hard ceiling on the assembled per-page agent prompt. ~40k tokens of prompt
 * is far beyond any legitimate single page; a prompt this size means runaway
 * embedded content, and the honest move is a clean abort before spend.
 */
export const CLONE_PROMPT_MAX_CHARS = 160_000;

export function assertPromptSize(
  prompt: string,
  pageLabel: string,
  maxChars: number = CLONE_PROMPT_MAX_CHARS,
): void {
  if (prompt.length > maxChars) {
    throw new Error(
      `prompt-size preflight failed for ${pageLabel}: ${prompt.length} chars exceeds the ${maxChars}-char ceiling — page content is pathological; not launching an agent`,
    );
  }
}

export type NoFileRetryOutcome = 'first-try' | 'retried' | 'no-file';

/**
 * Run an agent attempt; when it completes without producing any work (the
 * known no-file failure class), run exactly one more FRESH attempt. Each
 * `run()` call must spawn a brand-new session — nothing is reused between
 * attempts. Agent errors propagate; this only handles the silent-no-output
 * class.
 */
export async function runAgentWithNoFileRetry(opts: {
  run: () => Promise<unknown>;
  producedWork: () => boolean;
  log?: (msg: string) => void;
}): Promise<NoFileRetryOutcome> {
  await opts.run();
  if (opts.producedWork()) return 'first-try';
  opts.log?.('agent produced no changes — retrying once with a fresh session');
  await opts.run();
  return opts.producedWork() ? 'retried' : 'no-file';
}

/**
 * Minimum acceptable `overall` fidelity (0–100 scale, 0.6·pixel + 0.4·copy)
 * for a prospect-facing homepage preview. Conservative first calibration —
 * no scored corpus existed at spec time (see Spec 19 changelog); tune as
 * pitch runs accumulate real summaries.
 */
export const PITCH_FIDELITY_MIN = 70;

export interface FidelityGateResult {
  pass: boolean;
  score?: number;
  reason: string;
}

/**
 * Gate a page on its scored fidelity. Fails CLOSED: a missing summary,
 * missing page entry, or unscored status all refuse — a preview we could
 * not score is a preview we do not show a prospect.
 */
/**
 * Per-page bar for CLIENT clones (Spec 17b §1, brainstorm decision 2). Same
 * provisional value as Tier B's WB_FIDELITY_BAR and PITCH_FIDELITY_MIN, but
 * a separate constant: the pitch minimum and the client bar calibrate
 * independently from the Spec 18 harvest corpus.
 */
export const CLONE_FIDELITY_BAR = 70;

export interface FidelityPolicyResult {
  pass: boolean;
  belowBar: Array<{ pageSlug: string; overall: number }>;
  unscored: string[];
}

/**
 * Apply the per-page bar to a whole-site fidelity summary (Spec 17b §1).
 * Per page, never a mean — a site mean hides one terrible page behind
 * several good ones. A missing/empty summary is all-unscored: under the
 * default warn-and-record policy that is a loud warning; under
 * --strict-fidelity it fails closed, exactly like fidelityGate.
 */
export function evaluateFidelityPolicy(
  summary: FidelitySummary | null,
  bar: number = CLONE_FIDELITY_BAR,
): FidelityPolicyResult {
  const pages = summary?.pages ?? [];
  if (pages.length === 0) {
    return { pass: false, belowBar: [], unscored: ['(no scored pages)'] };
  }
  const belowBar: Array<{ pageSlug: string; overall: number }> = [];
  const unscored: string[] = [];
  for (const page of pages) {
    const gate = fidelityGate(summary, page.pageSlug, bar);
    if (gate.pass) continue;
    if (gate.score === undefined) unscored.push(page.pageSlug);
    else belowBar.push({ pageSlug: page.pageSlug, overall: gate.score });
  }
  return { pass: belowBar.length === 0 && unscored.length === 0, belowBar, unscored };
}

export function fidelityGate(
  summary: FidelitySummary | null,
  pageSlug: string,
  minOverall: number = PITCH_FIDELITY_MIN,
): FidelityGateResult {
  const page = summary?.pages?.find((p) => p.pageSlug === pageSlug);
  if (!page) {
    return { pass: false, reason: `no fidelity score for "${pageSlug}" — run clone-fidelity first` };
  }
  if (page.status !== 'scored') {
    return { pass: false, reason: `no fidelity score for "${pageSlug}" (status: ${page.status})` };
  }
  if (page.overall < minOverall) {
    return {
      pass: false,
      score: page.overall,
      reason: `fidelity ${page.overall} is below the ${minOverall} minimum`,
    };
  }
  return { pass: true, score: page.overall, reason: 'ok' };
}
