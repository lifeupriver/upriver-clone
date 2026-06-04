import {
  COVERAGE_MAP,
  SOURCE_EXPECTATIONS,
  deliverableReadiness,
  fieldFilled,
  type ClientProfile,
  type DeliverableId,
} from '@upriver/schemas';

import type { ReconPlan, ReconRunResult } from './run.js';

/** Recon-fillable coverage before vs after a run (build spec 04 §1.4). */
export interface CoverageDelta {
  /** `SOURCE_EXPECTATIONS.recon` target count. */
  targetsTotal: number;
  filledBefore: number;
  filledAfter: number;
  /** Targets that went empty → filled this run. */
  newlyFilled: string[];
  /** Recon targets still empty after the run. */
  stillEmpty: string[];
}

/** A deliverable whose missing-field count dropped this run. */
export interface DeliverableDelta {
  id: DeliverableId;
  title: string;
  missingBefore: number;
  missingAfter: number;
}

export function coverageDelta(before: ClientProfile, after: ClientProfile): CoverageDelta {
  const targets = SOURCE_EXPECTATIONS.recon;
  return {
    targetsTotal: targets.length,
    filledBefore: targets.filter((p) => fieldFilled(before, p)).length,
    filledAfter: targets.filter((p) => fieldFilled(after, p)).length,
    newlyFilled: targets.filter((p) => !fieldFilled(before, p) && fieldFilled(after, p)),
    stillEmpty: targets.filter((p) => !fieldFilled(after, p)),
  };
}

export function deliverableDeltas(
  before: ClientProfile,
  after: ClientProfile,
): DeliverableDelta[] {
  const deltas: DeliverableDelta[] = [];
  for (const d of COVERAGE_MAP) {
    const missingBefore = deliverableReadiness(before, d.id).missingFields.length;
    const missingAfter = deliverableReadiness(after, d.id).missingFields.length;
    if (missingAfter < missingBefore) {
      deltas.push({ id: d.id, title: d.title, missingBefore, missingAfter });
    }
  }
  return deltas;
}

const COUNT = (run: ReconRunResult, kind: 'filled' | 'skipped' | 'conflicted'): number =>
  run.perAdapter.reduce((n, a) => n + a.outcomes.filter((o) => o.kind === kind).length, 0);

/** Render the full run report (per-adapter + coverage delta + still-empty targets). */
export function renderReport(run: ReconRunResult): string {
  const lines: string[] = [];
  lines.push('Recon run');
  lines.push('');

  for (const a of run.perAdapter) {
    if (!a.ok) {
      lines.push(`  ${a.id}: FAILED — ${a.error ?? 'unknown error'}`);
      continue;
    }
    const filled = a.outcomes.filter((o) => o.kind === 'filled');
    const skipped = a.outcomes.filter((o) => o.kind === 'skipped');
    const conflicted = a.outcomes.filter((o) => o.kind === 'conflicted');
    lines.push(
      `  ${a.id}: ${filled.length} filled, ${skipped.length} skipped, ${conflicted.length} conflicted` +
        (a.dropped.length ? `, ${a.dropped.length} dropped (invalid)` : '') +
        ` (${a.evidenceFiles.length} evidence file${a.evidenceFiles.length === 1 ? '' : 's'})`,
    );
    for (const o of filled) lines.push(`      + ${o.path}`);
    for (const o of conflicted) lines.push(`      ! ${o.path} (conflict queued)`);
    for (const d of a.dropped) lines.push(`      x ${d.path} (${d.reason})`);
  }

  const cov = coverageDelta(run.profileBefore, run.profileAfter);
  lines.push('');
  lines.push(
    `Coverage (recon targets): ${cov.filledBefore} → ${cov.filledAfter} of ${cov.targetsTotal} filled` +
      ` (+${cov.newlyFilled.length} this run)`,
  );

  const dDeltas = deliverableDeltas(run.profileBefore, run.profileAfter);
  if (dDeltas.length) {
    lines.push('  Deliverables advanced:');
    for (const d of dDeltas) {
      lines.push(`    ${d.id} ${d.title}: ${d.missingBefore} → ${d.missingAfter} missing fields`);
    }
  }

  lines.push('');
  lines.push(`Recon targets still empty (${cov.stillEmpty.length}):`);
  for (const p of cov.stillEmpty) lines.push(`    - ${p}`);

  const totalConflicts = run.conflicts.length;
  if (totalConflicts) {
    lines.push('');
    lines.push(
      `${totalConflicts} conflict(s) queued to profile-conflicts.json (operator review — build spec 03).`,
    );
  }

  lines.push('');
  lines.push(
    `Totals: ${COUNT(run, 'filled')} filled, ${COUNT(run, 'skipped')} skipped, ${COUNT(run, 'conflicted')} conflicted.`,
  );

  return lines.join('\n');
}

/** Render the `--dry-run` report (planned adapters + unfilled recon targets). */
export function renderDryRun(plan: ReconPlan): string {
  const lines: string[] = [];
  lines.push('[dry-run] No evidence gathered, no profile written.');
  lines.push('');
  lines.push(`Adapters that would run: ${plan.adapters.join(', ') || '(none)'}`);
  lines.push('');
  lines.push(`Recon targets currently unfilled (${plan.unfilledTargets.length}):`);
  for (const p of plan.unfilledTargets) lines.push(`    - ${p}`);
  return lines.join('\n');
}
