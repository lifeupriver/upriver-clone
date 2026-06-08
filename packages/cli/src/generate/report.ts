import {
  COVERAGE_MAP,
  deliverableReadiness,
  type ClientProfile,
  type DeliverableId,
  type Readiness,
} from '@upriver/schemas';

import type { BatchPlan, BlockedDoc, MarkerAggregate, Tier, TierRunResult } from './batch.js';
import type { PromptSize } from './prompt-size.js';

export function titleFor(id: DeliverableId): string {
  return COVERAGE_MAP.find((d) => d.id === id)?.title ?? id;
}

/** Render why a deliverable is ready or blocked (readiness gate + dry-run). */
export function renderReadiness(id: DeliverableId, readiness: Readiness): string {
  const lines = [`Deliverable ${id} (${titleFor(id)})`];
  if (readiness.ready) {
    lines.push('  status: READY');
    return lines.join('\n');
  }
  lines.push('  status: BLOCKED');
  if (readiness.missingFields.length > 0) {
    lines.push(`  missing fields (${readiness.missingFields.length}):`);
    for (const f of readiness.missingFields) lines.push(`    - ${f}`);
  }
  if (readiness.unverifiedHv.length > 0) {
    lines.push(`  unverified human-verify-required fields (${readiness.unverifiedHv.length}):`);
    for (const f of readiness.unverifiedHv) lines.push(`    - ${f}`);
    lines.push(
      '  hint: there is no --force past an HV gate. Once a field holds the right value, ' +
        'verify it with `upriver profile verify <slug> <path>`.',
    );
  }
  if (readiness.missingDocs.length > 0) {
    lines.push(`  missing upstream docs (${readiness.missingDocs.length}):`);
    for (const d of readiness.missingDocs) lines.push(`    - ${d}`);
  }
  return lines.join('\n');
}

export interface GenerationReport {
  id: DeliverableId;
  docPath: string;
  content: string;
  markers: string[];
  /** `[OPERATOR ACTION]` click-ops (provisioning only); absent/empty → not rendered. */
  operatorActions?: string[];
  fromCache: boolean;
  nowUnblocked: DeliverableId[];
}

/** Render the post-generation report shown before the Continue gate. */
export function renderGenerationReport(r: GenerationReport): string {
  const words = r.content.trim().split(/\s+/).filter(Boolean).length;
  const lines = [
    `Generated ${r.id} (${titleFor(r.id)})${r.fromCache ? ' [from cache]' : ''}`,
    `  path: ${r.docPath}`,
    `  words: ${words}`,
  ];
  if (r.markers.length === 0) {
    lines.push('  [NEEDS CONFIRMATION] markers: none');
  } else {
    lines.push(`  [NEEDS CONFIRMATION] markers (${r.markers.length}):`);
    r.markers.forEach((m, i) => lines.push(`    ${i + 1}. ${m}`));
  }
  if (r.operatorActions && r.operatorActions.length > 0) {
    lines.push(`  [OPERATOR ACTION] cannot be generated — you must do (${r.operatorActions.length}):`);
    r.operatorActions.forEach((m, i) => lines.push(`    ${i + 1}. ${m}`));
  }
  if (r.nowUnblocked.length > 0) {
    lines.push(`  approving this unblocks downstream: ${r.nowUnblocked.join(', ')}`);
  }
  return lines.join('\n');
}

/** Terse one-line per-doc summary for batch mode (the full report is per-tier). */
export function renderDocLine(r: {
  id: DeliverableId;
  docPath: string;
  content: string;
  markers: string[];
  fromCache: boolean;
}): string {
  const words = r.content.trim().split(/\s+/).filter(Boolean).length;
  const verb = r.fromCache ? 'reused' : 'generated';
  return `  ${verb} ${r.id} — ${words} words, ${r.markers.length} marker(s) → ${r.docPath}`;
}

// ── Batch (run-level) reports — M2 `generate --all`. Additive: the single-doc
//    renderers above are untouched. ─────────────────────────────────────────

function renderBlockedDoc(b: BlockedDoc): string[] {
  const lines = [`  ${b.id} (${b.title})`];
  if (b.readiness.missingFields.length > 0) {
    lines.push(`    missing fields (${b.readiness.missingFields.length}): ${b.readiness.missingFields.join(', ')}`);
  }
  if (b.readiness.unverifiedHv.length > 0) {
    lines.push(`    unverified HV (${b.readiness.unverifiedHv.length}): ${b.readiness.unverifiedHv.join(', ')}`);
  }
  const thisRun = b.blockingDocs.filter((d) => d.kind === 'blocked-this-run').map((d) => d.id);
  const outOfScope = b.blockingDocs.filter((d) => d.kind === 'unapproved-out-of-scope').map((d) => d.id);
  if (thisRun.length > 0) {
    lines.push(`    blocked by upstream needing data (${thisRun.length}): ${thisRun.join(', ')}`);
  }
  if (outOfScope.length > 0) {
    lines.push(`    upstream out of scope / unapproved (${outOfScope.length}): ${outOfScope.join(', ')}`);
  }
  return lines;
}

/** Render the full `--all` plan: the DAG tiers + the blocked docs with reasons. */
export function renderBatchPlan(plan: BatchPlan): string {
  const lines: string[] = [];
  lines.push(`Batch plan — scope ${plan.scope.length} doc(s) (${plan.scope.join(', ')})`);
  lines.push(`  already approved (${plan.approved.length}): ${plan.approved.length ? plan.approved.join(', ') : 'none'}`);
  lines.push('');
  if (plan.tiers.length === 0) {
    lines.push('Tiers: none eligible — every in-scope doc is blocked (see below).');
  } else {
    lines.push(`Tiers (${plan.tiers.length}) — generated in order, gated per tier:`);
    for (const tier of plan.tiers) {
      lines.push(`  Tier ${tier.index} (${tier.docs.length}): ${tier.docs.join(', ')}`);
    }
  }
  lines.push('');
  lines.push(`Blocked (${plan.blocked.length}):`);
  if (plan.blocked.length === 0) lines.push('  none');
  for (const b of plan.blocked) lines.push(...renderBlockedDoc(b));
  return lines.join('\n');
}

/**
 * Render the F2 pre-flight prompt-size table (Build Spec 11): one row per doc
 * with its estimated tokens against the ceiling and an OK/FAIL flag, plus a
 * summary naming any doc over the ceiling. A FAIL here is a 2-second pre-run stop
 * instead of a mid-run wall hours later. `--all --dry-run` exits non-zero when
 * the summary names any doc.
 */
export function renderPromptSizeTable(sizes: PromptSize[]): string {
  const lines = ['Prompt-size pre-flight (F2) — est. tokens vs ceiling (worst-case upstream projected):'];
  for (const s of sizes) {
    lines.push(
      `  ${s.id.padEnd(7)} ${String(s.estTokens).padStart(7)} / ${s.ceiling} est-tok  ${s.overCeiling ? 'FAIL' : 'OK'}`,
    );
  }
  const failed = sizes.filter((s) => s.overCeiling).map((s) => s.id);
  lines.push(
    failed.length > 0
      ? `  ${failed.length} doc(s) over ceiling: ${failed.join(', ')} — fix before generating (raise digest coverage or the ceiling).`
      : '  all docs under ceiling.',
  );
  return lines.join('\n');
}

/**
 * Render an "operator must do (cannot be generated)" checklist from an aggregate
 * of `[OPERATOR ACTION]` markers (provisioning, Build Spec 09). Empty aggregate →
 * `[]`, so callers append nothing for prose-doc runs. Reused by the per-tier
 * report and the command's run-level summary.
 */
export function renderOperatorChecklist(
  agg: MarkerAggregate,
  heading = 'Operator must do (cannot be generated)',
): string[] {
  if (agg.total === 0) return [];
  const lines = [`  ${heading} (${agg.total}), by artifact:`];
  for (const g of agg.byDoc) {
    lines.push(`    ${g.id} (${g.markers.length}):`);
    g.markers.forEach((m, i) => lines.push(`      ${i + 1}. ${m}`));
  }
  return lines;
}

/** Render a tier's run report: produced docs, consolidated markers, operator actions, failures/skips. */
export function renderTierReport(tr: TierRunResult, agg: MarkerAggregate, opActions?: MarkerAggregate): string {
  const lines: string[] = [];
  lines.push(`Tier ${tr.index} report:`);
  for (const d of tr.docs) {
    if (d.status === 'produced' || d.status === 'reused') {
      lines.push(`  [${d.status}] ${d.id} — ${d.words} words, ${d.markers.length} marker(s) → ${d.docPath}`);
    } else {
      lines.push(`  [${d.status}] ${d.id} — ${d.reason ?? ''}`);
    }
  }
  lines.push('');
  if (agg.total === 0) {
    lines.push('  [NEEDS CONFIRMATION] across tier: none');
  } else {
    lines.push(`  [NEEDS CONFIRMATION] across tier (${agg.total}), by doc:`);
    for (const g of agg.byDoc) {
      lines.push(`    ${g.id} (${g.markers.length}):`);
      g.markers.forEach((m, i) => lines.push(`      ${i + 1}. ${m}`));
    }
  }
  if (opActions) lines.push(...renderOperatorChecklist(opActions, '[OPERATOR ACTION] across tier'));
  if (tr.failed.length > 0) lines.push(`  failed: ${tr.failed.join(', ')}`);
  if (tr.skipped.length > 0) lines.push(`  skipped (upstream not available): ${tr.skipped.join(', ')}`);
  return lines.join('\n');
}

/** Deliverables a tier's approval unblocks in the next tier (for the gate prompt). */
export function tierUnblocks(plan: BatchPlan, tier: Tier): DeliverableId[] {
  const next = plan.tiers.find((t) => t.index > tier.index);
  if (!next) return [];
  const tierSet = new Set(tier.docs);
  return next.docs.filter((id) => COVERAGE_MAP.find((d) => d.id === id)?.requiresDocs.some((r) => tierSet.has(r)));
}

/**
 * Deliverables that flip from blocked to ready once `id` joins the generated
 * set — for the report's "now unblocked" line. Pure (no filesystem).
 */
export function newlyUnblocked(
  profile: ClientProfile,
  beforeGenerated: DeliverableId[],
  id: DeliverableId,
): DeliverableId[] {
  const after = [...beforeGenerated, id];
  const wasReady = new Set(
    COVERAGE_MAP.filter((d) => deliverableReadiness(profile, d.id, beforeGenerated).ready).map(
      (d) => d.id,
    ),
  );
  return COVERAGE_MAP.filter(
    (d) =>
      d.id !== id &&
      !beforeGenerated.includes(d.id) &&
      !wasReady.has(d.id) &&
      deliverableReadiness(profile, d.id, after).ready,
  ).map((d) => d.id);
}
