import type { AuditFinding, AuditDimension, FindingPriority, FindingEffort } from '@upriver/core';

interface RawFinding {
  priority?: string;
  effort?: string;
  title?: string;
  description?: string;
  why_it_matters?: string;
  recommendation?: string;
  evidence?: string;
  page?: string;
}

let seq = 0;

function normPriority(p: unknown): FindingPriority {
  if (p === 'p0' || p === 'p1' || p === 'p2') return p;
  return 'p2';
}

function normEffort(e: unknown): FindingEffort {
  if (e === 'light' || e === 'medium' || e === 'heavy') return e;
  return 'medium';
}

export function parseFindingsJson(
  text: string,
  dimension: AuditDimension,
  defaultPage?: string,
): AuditFinding[] {
  const match = text.match(/```(?:json)?\s*(\[[\s\S]*?\])\s*```/) ?? text.match(/(\[[\s\S]*\])/);
  const jsonStr = match?.[1] ?? text;
  let raw: unknown;
  try {
    raw = JSON.parse(jsonStr);
  } catch {
    return [];
  }
  if (!Array.isArray(raw)) return [];

  const findings: AuditFinding[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const r = item as RawFinding;
    if (!r.title || !r.description) continue;
    const id = `${dimension}-deep-${String(++seq).padStart(3, '0')}`;
    const page = r.page ?? defaultPage;
    findings.push({
      id,
      dimension,
      priority: normPriority(r.priority),
      effort: normEffort(r.effort),
      title: r.title,
      description: r.description,
      why_it_matters: r.why_it_matters ?? r.description,
      recommendation: r.recommendation ?? '',
      ...(r.evidence ? { evidence: r.evidence } : {}),
      ...(page ? { page } : {}),
    });
  }
  return findings;
}

export function findingsRequestPrompt(dimension: string): string {
  return `Return findings as a JSON array. Each finding has these fields:
- priority: "p0" (critical), "p1" (important), or "p2" (minor)
- effort: "light", "medium", or "heavy"
- title: short headline (under 80 chars)
- description: 1-3 sentences on what's wrong
- why_it_matters: 1-2 sentences on impact
- recommendation: concrete fix, actionable
- evidence: optional, quote or specific element

Output only the JSON array in a fenced code block. No prose before or after. If the page is fine on this dimension (${dimension}), return [].`;
}
