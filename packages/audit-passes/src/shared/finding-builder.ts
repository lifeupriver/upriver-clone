import type {
  AuditFinding,
  EstimatedImpact,
  FindingEffort,
  FindingPriority,
} from '@upriver/core';

let seq = 0;

/**
 * C.7 — heuristic estimated impact derived from priority × effort. Pass authors
 * can override by passing `opts.impact`. Numbers are rough: a P0 light fix
 * typically lifts the per-dimension score 4–6 points; a P0 heavy rebuild more
 * like 10–15. Effort scales the description more than the points so two
 * findings of the same priority sort by their stated effort.
 */
export function defaultImpact(priority: FindingPriority, effort: FindingEffort): EstimatedImpact {
  const matrix: Record<FindingPriority, Record<FindingEffort, EstimatedImpact>> = {
    p0: {
      light: { scorePoints: 5, description: '+4–6 score pts in 2–4 hours' },
      medium: { scorePoints: 8, description: '+6–10 score pts in 1–2 days' },
      heavy: { scorePoints: 12, description: '+10–15 score pts in 1–2 weeks' },
    },
    p1: {
      light: { scorePoints: 2, description: '+1–3 score pts in <1 day' },
      medium: { scorePoints: 4, description: '+3–5 score pts in 2–4 days' },
      heavy: { scorePoints: 6, description: '+5–8 score pts in 1–3 weeks' },
    },
    p2: {
      light: { scorePoints: 1, description: 'incremental polish' },
      medium: { scorePoints: 2, description: 'minor lift, multi-day' },
      heavy: { scorePoints: 3, description: 'long-tail, weeks of work' },
    },
  };
  return matrix[priority][effort];
}

export function finding(
  dimension: string,
  priority: FindingPriority,
  effort: FindingEffort,
  title: string,
  description: string,
  recommendation: string,
  opts: {
    evidence?: string;
    page?: string;
    affected_pages?: string[];
    why?: string;
    impact?: EstimatedImpact;
  } = {},
): AuditFinding {
  return {
    id: `${dimension}-${String(++seq).padStart(3, '0')}`,
    dimension,
    priority,
    effort,
    title,
    description,
    why_it_matters: opts.why ?? description,
    recommendation,
    estimatedImpact: opts.impact ?? defaultImpact(priority, effort),
    ...(opts.evidence !== undefined ? { evidence: opts.evidence } : {}),
    ...(opts.page !== undefined ? { page: opts.page } : {}),
    ...(opts.affected_pages !== undefined ? { affected_pages: opts.affected_pages } : {}),
  };
}

export function scoreFromFindings(findings: AuditFinding[]): number {
  if (findings.length === 0) return 90;
  const deductions = findings.reduce((sum, f) => {
    const d = f.priority === 'p0' ? 15 : f.priority === 'p1' ? 7 : 3;
    return sum + d;
  }, 0);
  return Math.max(0, Math.min(100, 100 - deductions));
}
