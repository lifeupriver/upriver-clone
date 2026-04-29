import { execSync } from 'node:child_process';
import type { AuditPassResult, AuditFinding, FindingPriority } from '@upriver/core';
import { loadPages } from '@upriver/audit-passes';
import { pickSamplePages } from '../sample.js';

interface RunOpts {
  log: (msg: string) => void;
}

interface SquirrelIssue {
  id?: string;
  rule?: string;
  severity?: string;
  category?: string;
  title?: string;
  message?: string;
  description?: string;
  recommendation?: string;
  url?: string;
  evidence?: string;
}

interface SquirrelReport {
  score?: number;
  health?: number;
  summary?: string;
  issues?: SquirrelIssue[];
  findings?: SquirrelIssue[];
}

let seq = 0;

export async function runAuditWebsite(slug: string, clientDir: string, opts: RunOpts): Promise<AuditPassResult> {
  const pages = loadPages(clientDir);
  const sample = pickSamplePages(pages, 1);
  if (sample.length === 0) {
    return empty('No pages available for squirrelscan.');
  }

  const target = sample[0]!;
  opts.log(`    squirrelscan ${target.url}`);

  let report: SquirrelReport;
  try {
    const out = execSync(`squirrelscan "${target.url}" --format json --mode quick`, {
      encoding: 'utf8',
      maxBuffer: 50 * 1024 * 1024,
      timeout: 180_000,
    });
    report = JSON.parse(out) as SquirrelReport;
  } catch (err) {
    opts.log(`      squirrelscan failed: ${String(err).slice(0, 120)}`);
    return empty(`squirrelscan failed: ${String(err).slice(0, 200)}`);
  }

  const issues = report.issues ?? report.findings ?? [];
  const findings: AuditFinding[] = issues.map((issue) => toFinding(issue));

  return {
    dimension: 'audit-website',
    score: report.score ?? report.health ?? scoreFrom(findings),
    summary: report.summary ?? `squirrelscan audit on ${target.url}. ${findings.length} issues across ${new Set(issues.map((i) => i.category)).size} categories.`,
    findings,
    completed_at: new Date().toISOString(),
  };
}

function toFinding(issue: SquirrelIssue): AuditFinding {
  const sev = (issue.severity ?? '').toLowerCase();
  const priority: FindingPriority =
    sev === 'critical' || sev === 'high' || sev === 'p0' ? 'p0'
    : sev === 'medium' || sev === 'warning' || sev === 'p1' ? 'p1'
    : 'p2';
  const title = issue.title ?? issue.rule ?? issue.id ?? 'Site audit issue';
  const description = issue.description ?? issue.message ?? title;
  return {
    id: `audit-website-${String(++seq).padStart(3, '0')}`,
    dimension: 'audit-website',
    priority,
    effort: 'medium',
    title,
    description,
    why_it_matters: description,
    recommendation: issue.recommendation ?? 'Review squirrelscan rule documentation for fix guidance.',
    ...(issue.url ? { page: issue.url } : {}),
    ...(issue.evidence ? { evidence: issue.evidence } : {}),
  };
}

function empty(summary: string): AuditPassResult {
  return {
    dimension: 'audit-website',
    score: 0,
    summary,
    findings: [],
    completed_at: new Date().toISOString(),
  };
}

function scoreFrom(findings: AuditFinding[]): number {
  if (findings.length === 0) return 90;
  const deductions = findings.reduce((s, f) => s + (f.priority === 'p0' ? 5 : f.priority === 'p1' ? 2 : 0.5), 0);
  return Math.max(0, Math.min(100, Math.round(100 - deductions)));
}
