import {
  COVERAGE_MAP,
  deliverableReadiness,
  type ClientProfile,
  type DeliverableId,
  type Readiness,
} from '@upriver/schemas';

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
  if (r.nowUnblocked.length > 0) {
    lines.push(`  approving this unblocks downstream: ${r.nowUnblocked.join(', ')}`);
  }
  return lines.join('\n');
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
