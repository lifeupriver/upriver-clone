import type { AuditFinding, FindingPriority, FindingEffort } from '@upriver/core';

let seq = 0;

export function finding(
  dimension: string,
  priority: FindingPriority,
  effort: FindingEffort,
  title: string,
  description: string,
  recommendation: string,
  opts: { evidence?: string; page?: string; affected_pages?: string[]; why?: string } = {},
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
