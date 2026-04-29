import type { AuditFinding, AuditPackage } from '@upriver/core';

/**
 * E.5 stub — pure diff between two AuditPackages, useful when the operator has
 * a "before" client subdir and an "after" client subdir (e.g. produced by
 * cloning the same site at two different points, or by running improvement
 * tracks against a copy). Once preview-deploy infra lands this becomes the
 * engine for `improve`'s before/after re-audit; for now it's manually-driven.
 */
export interface DimensionDelta {
  dimension: string;
  scoreBefore: number;
  scoreAfter: number;
  delta: number;
  countBefore: number;
  countAfter: number;
}

export interface FindingChurn {
  closed: AuditFinding[];
  added: AuditFinding[];
  unchanged: AuditFinding[];
}

export interface CompareResult {
  overallBefore: number;
  overallAfter: number;
  overallDelta: number;
  dimensions: DimensionDelta[];
  findings: FindingChurn;
}

/**
 * Compute the structured diff between two audit packages. Pure — no IO.
 *
 * @param before - The earlier audit-package.json contents.
 * @param after - The later audit-package.json contents.
 * @returns Per-dimension deltas plus closed/added/unchanged findings.
 */
export function compareAudits(before: AuditPackage, after: AuditPackage): CompareResult {
  const beforeIds = new Set(before.findings.map((f) => f.id));
  const afterIds = new Set(after.findings.map((f) => f.id));

  const closed = before.findings.filter((f) => !afterIds.has(f.id));
  const added = after.findings.filter((f) => !beforeIds.has(f.id));
  const unchanged = after.findings.filter((f) => beforeIds.has(f.id));

  const dims = new Set<string>();
  for (const f of before.findings) dims.add(f.dimension);
  for (const f of after.findings) dims.add(f.dimension);

  const dimensions: DimensionDelta[] = [];
  for (const dim of dims) {
    const beforeFindings = before.findings.filter((f) => f.dimension === dim);
    const afterFindings = after.findings.filter((f) => f.dimension === dim);
    // We can't recover the per-pass score from the package since it stores a
    // flat findings list — fall back to a deduction-style proxy: 100 minus the
    // sum of priority weights, capped at 0. Mirrors `scoreFromFindings`.
    dimensions.push({
      dimension: dim,
      scoreBefore: scoreProxy(beforeFindings),
      scoreAfter: scoreProxy(afterFindings),
      delta: scoreProxy(afterFindings) - scoreProxy(beforeFindings),
      countBefore: beforeFindings.length,
      countAfter: afterFindings.length,
    });
  }
  dimensions.sort((a, b) => a.dimension.localeCompare(b.dimension));

  return {
    overallBefore: before.meta.overallScore,
    overallAfter: after.meta.overallScore,
    overallDelta: after.meta.overallScore - before.meta.overallScore,
    dimensions,
    findings: { closed, added, unchanged },
  };
}

/** Mirror of `audit-passes/shared/finding-builder.ts:scoreFromFindings`. */
function scoreProxy(findings: AuditFinding[]): number {
  if (findings.length === 0) return 90;
  const deductions = findings.reduce((sum, f) => {
    const d = f.priority === 'p0' ? 15 : f.priority === 'p1' ? 7 : 3;
    return sum + d;
  }, 0);
  return Math.max(0, Math.min(100, 100 - deductions));
}

/**
 * Render the diff result as a markdown report. Stable column order; sorted
 * dimensions; capped finding lists with a "+N more" tail so the report stays
 * readable on long churn lists.
 *
 * @param result - Output of `compareAudits`.
 * @param labels - Optional `{ before, after }` labels (default: 'Before' / 'After').
 */
export function renderCompareMarkdown(
  result: CompareResult,
  labels: { before?: string; after?: string } = {},
): string {
  const beforeLabel = labels.before ?? 'Before';
  const afterLabel = labels.after ?? 'After';
  const lines: string[] = [];
  lines.push(`# Audit comparison — ${beforeLabel} vs ${afterLabel}`);
  lines.push('');
  lines.push(`Generated: ${new Date().toISOString().slice(0, 10)}`);
  lines.push('');
  lines.push(
    `**Overall score:** ${result.overallBefore} → ${result.overallAfter} (${formatDelta(result.overallDelta)})`,
  );
  lines.push('');

  lines.push('## Per-dimension');
  lines.push('');
  lines.push('| Dimension | Score before | Score after | Δ | Findings before | Findings after |');
  lines.push('|-----------|--------------|-------------|---|-----------------|----------------|');
  for (const d of result.dimensions) {
    lines.push(
      `| ${d.dimension} | ${d.scoreBefore} | ${d.scoreAfter} | ${formatDelta(d.delta)} | ${d.countBefore} | ${d.countAfter} |`,
    );
  }
  lines.push('');

  lines.push(`## Closed findings (${result.findings.closed.length})`);
  lines.push('');
  appendFindingList(lines, result.findings.closed, 30);

  lines.push(`## New findings (${result.findings.added.length})`);
  lines.push('');
  appendFindingList(lines, result.findings.added, 30);

  lines.push(`## Unchanged findings (${result.findings.unchanged.length})`);
  lines.push('');
  if (result.findings.unchanged.length === 0) {
    lines.push('_None._');
  } else {
    lines.push(
      `_${result.findings.unchanged.length} finding(s) carried over by id — see audit-package.json for the full list._`,
    );
  }
  lines.push('');
  return lines.join('\n');
}

function appendFindingList(lines: string[], findings: AuditFinding[], cap: number): void {
  if (findings.length === 0) {
    lines.push('_None._');
    lines.push('');
    return;
  }
  for (const f of findings.slice(0, cap)) {
    lines.push(`- \`${f.id}\` ${f.priority.toUpperCase()} ${f.dimension}: ${escapeBackticks(f.title)}`);
  }
  if (findings.length > cap) {
    lines.push(`- _...and ${findings.length - cap} more._`);
  }
  lines.push('');
}

function escapeBackticks(s: string): string {
  return s.replace(/`/g, "'");
}

function formatDelta(n: number): string {
  if (n > 0) return `+${n}`;
  return String(n);
}
