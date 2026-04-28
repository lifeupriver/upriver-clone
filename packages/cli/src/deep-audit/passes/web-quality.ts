import { execSync } from 'node:child_process';
import type { AuditPassResult, AuditFinding } from '@upriver/core';
import { loadPages } from '@upriver/audit-passes';
import { pickSamplePages } from '../sample.js';

interface RunOpts {
  log: (msg: string) => void;
}

interface LighthouseAudit {
  id: string;
  title: string;
  description: string;
  score: number | null;
  scoreDisplayMode: string;
  displayValue?: string;
  details?: { items?: Array<Record<string, unknown>> };
}

interface LighthouseReport {
  finalUrl: string;
  categories: Record<string, { id: string; title: string; score: number; auditRefs: Array<{ id: string; weight: number }> }>;
  audits: Record<string, LighthouseAudit>;
}

let seq = 0;

export async function runWebQuality(slug: string, clientDir: string, opts: RunOpts): Promise<AuditPassResult> {
  const pages = loadPages(clientDir);
  const sample = pickSamplePages(pages, 1);
  if (sample.length === 0) {
    return {
      dimension: 'web-quality',
      score: 0,
      summary: 'No pages available for Lighthouse audit.',
      findings: [],
      completed_at: new Date().toISOString(),
    };
  }

  const findings: AuditFinding[] = [];
  const scores: Record<string, number> = {};

  for (const page of sample) {
    opts.log(`    lighthouse ${page.url}`);
    try {
      const report = runLighthouse(page.url);
      for (const [catId, cat] of Object.entries(report.categories)) {
        scores[catId] = Math.round((cat.score ?? 0) * 100);
      }
      const failed = Object.values(report.audits).filter(
        (a) => a.scoreDisplayMode === 'binary' && a.score !== null && a.score < 1,
      );
      const numeric = Object.values(report.audits).filter(
        (a) => a.scoreDisplayMode === 'numeric' && a.score !== null && a.score < 0.9,
      );
      for (const a of [...failed, ...numeric]) {
        findings.push(toFinding(a, page.url));
      }
    } catch (err) {
      opts.log(`      lighthouse failed: ${String(err).slice(0, 120)}`);
    }
  }

  const overall = Object.values(scores).length
    ? Math.round(Object.values(scores).reduce((s, n) => s + n, 0) / Object.values(scores).length)
    : 0;

  return {
    dimension: 'web-quality',
    score: overall,
    summary: `Lighthouse audit on ${sample.length} page(s). Category scores: ${Object.entries(scores).map(([k, v]) => `${k}=${v}`).join(', ')}. ${findings.length} issues.`,
    findings,
    completed_at: new Date().toISOString(),
  };
}

function runLighthouse(url: string): LighthouseReport {
  const out = execSync(
    `lighthouse "${url}" --output=json --output-path=stdout --quiet --chrome-flags="--headless --no-sandbox --disable-gpu" --only-categories=performance,accessibility,seo,best-practices --max-wait-for-load=45000`,
    { encoding: 'utf8', maxBuffer: 50 * 1024 * 1024, timeout: 120_000 },
  );
  return JSON.parse(out) as LighthouseReport;
}

function toFinding(a: LighthouseAudit, page: string): AuditFinding {
  const score = a.score ?? 0;
  const priority = score === 0 ? 'p0' : score < 0.5 ? 'p1' : 'p2';
  return {
    id: `web-quality-${String(++seq).padStart(3, '0')}`,
    dimension: 'web-quality',
    priority,
    effort: 'medium',
    title: a.title,
    description: a.description.replace(/\[Learn more.*?\]\([^)]+\)\.?/g, '').trim(),
    why_it_matters: a.description.replace(/\[Learn more.*?\]\([^)]+\)\.?/g, '').trim(),
    recommendation: a.displayValue ? `Lighthouse value: ${a.displayValue}. See full Lighthouse report for fix guidance.` : 'See Lighthouse documentation for fix guidance.',
    page,
    ...(a.displayValue ? { evidence: a.displayValue } : {}),
  };
}
