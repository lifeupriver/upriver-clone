import type { AuditFinding, AuditPackage, SitePage } from '@upriver/core';

/**
 * Result of `generateOpportunities`. `body` is the rendered markdown intended
 * to be written to `<clientDir>/improvement-opportunities.md`. `counts` is
 * surfaced separately so callers can log a summary line without re-parsing.
 */
export interface OpportunitiesResult {
  body: string;
  counts: {
    missingPages: number;
    pillarCandidates: number;
    contentFindings: number;
    totalIdeas: number;
  };
}

/**
 * Single pillar/cluster expansion candidate — an existing long page whose
 * H2 headings could each become a dedicated child page.
 */
interface PillarCandidate {
  page: SitePage;
  candidateChildren: string[];
}

/**
 * E.7 — deterministic programmatic-SEO opportunity surfacer. Reads the audit
 * package and produces a structured markdown brief listing:
 *
 *   1. Missing pages flagged by the audit (`siteStructure.missingPages`).
 *   2. Pillar/cluster candidates: existing long pages whose H2s could fan out
 *      into dedicated child pages.
 *   3. Audit findings that explicitly suggest creating or expanding pages.
 *
 * Pure: no IO, no network. Identical input → identical markdown.
 *
 * @param pkg - The loaded audit package.
 * @returns Markdown body + counts for logging.
 */
export function generateOpportunities(pkg: AuditPackage): OpportunitiesResult {
  const missing = pkg.siteStructure.missingPages ?? [];
  const pillars = findPillarCandidates(pkg.siteStructure.pages ?? []);
  const contentFindings = findContentExpansionFindings(pkg.findings ?? []);

  const lines: string[] = [];
  lines.push(`# Improvement opportunities — ${pkg.meta.clientName}`);
  lines.push('');
  lines.push(
    `Generated from audit package on ${new Date().toISOString().slice(0, 10)}. Source: \`audit-package.json\`.`,
  );
  lines.push('');
  lines.push(
    'This is a deterministic surface — every entry traces back to a finding, a missing-page record, or an existing long page. Operator review required before turning any of these into work.',
  );
  lines.push('');

  // ── Missing pages ────────────────────────────────────────────────────────
  lines.push('## Missing pages');
  lines.push('');
  if (missing.length === 0) {
    lines.push('_None flagged by the audit._');
  } else {
    lines.push('| Page type | Priority | Reason |');
    lines.push('|-----------|----------|--------|');
    for (const m of missing) {
      lines.push(`| ${escapePipes(m.pageType)} | ${m.priority.toUpperCase()} | ${escapePipes(m.reason)} |`);
    }
  }
  lines.push('');

  // ── Pillar / cluster expansion ───────────────────────────────────────────
  lines.push('## Pillar & cluster expansion candidates');
  lines.push('');
  if (pillars.length === 0) {
    lines.push('_No long pages with enough sub-sections to warrant cluster expansion._');
  } else {
    lines.push(
      'Each entry is an existing page whose H2s could each become a dedicated child page (one canonical pillar + N spoke articles). Useful for programmatic-SEO buildouts.',
    );
    lines.push('');
    for (const c of pillars) {
      lines.push(`### ${c.page.title || c.page.slug || '(untitled)'} — \`${pathOf(c.page)}\``);
      lines.push('');
      lines.push(
        `Word count ${c.page.wordCount.toLocaleString()}. Suggested child pages from existing H2 headings:`,
      );
      lines.push('');
      for (const child of c.candidateChildren) {
        lines.push(`- ${child}`);
      }
      lines.push('');
    }
  }

  // ── Audit findings recommending new content ─────────────────────────────
  lines.push('## Findings that recommend new pages or sections');
  lines.push('');
  if (contentFindings.length === 0) {
    lines.push('_No content/SEO findings explicitly call for new pages._');
  } else {
    lines.push('| Finding | Priority | Dimension | Recommendation |');
    lines.push('|---------|----------|-----------|----------------|');
    for (const f of contentFindings) {
      lines.push(
        `| \`${f.id}\` | ${f.priority.toUpperCase()} | ${f.dimension} | ${escapePipes(truncate(f.recommendation, 180))} |`,
      );
    }
  }
  lines.push('');

  lines.push('## Next steps');
  lines.push('');
  lines.push(
    '1. Triage with the client: which of the missing pages and pillar expansions match their commercial priorities?',
  );
  lines.push(
    '2. Add the in-scope items to `fixes-plan-scope.md` (or as new entries in `intake.json` `pageWants`) and re-run `upriver fixes plan <slug>`.',
  );
  lines.push(
    '3. For pillar/cluster expansions, draft H1 + meta + outline for each child page before generating copy — this file does not commit to either.',
  );
  lines.push('');

  return {
    body: lines.join('\n'),
    counts: {
      missingPages: missing.length,
      pillarCandidates: pillars.length,
      contentFindings: contentFindings.length,
      totalIdeas:
        missing.length +
        pillars.reduce((s, c) => s + c.candidateChildren.length, 0) +
        contentFindings.length,
    },
  };
}

/**
 * A page is a pillar candidate when it has substantial body content
 * (>= 600 words) and at least three H2 headings. The H2s become candidate
 * child pages.
 */
function findPillarCandidates(pages: SitePage[]): PillarCandidate[] {
  const out: PillarCandidate[] = [];
  for (const page of pages) {
    if (page.statusCode >= 400) continue;
    if (page.wordCount < 600) continue;
    const h2s = page.headings
      .filter((h) => h.level === 2)
      .map((h) => h.text.trim())
      .filter((t) => t.length > 2 && t.length < 120);
    if (h2s.length < 3) continue;
    out.push({ page, candidateChildren: h2s.slice(0, 8) });
  }
  return out;
}

/**
 * Heuristic match: content / sales / SEO findings whose recommendation hints
 * at a new page, section, FAQ, article, or guide.
 */
function findContentExpansionFindings(findings: AuditFinding[]): AuditFinding[] {
  const dimensions = new Set(['content', 'sales', 'seo', 'aeo', 'geo']);
  const trigger = /\b(create|add|build|new\s+page|landing\s+page|article|guide|cluster|pillar|FAQ\s+page|blog\s+post)\b/i;
  return findings.filter((f) => dimensions.has(f.dimension) && trigger.test(f.recommendation));
}

function pathOf(page: SitePage): string {
  try {
    return new URL(page.url).pathname || '/';
  } catch {
    return page.slug ? `/${page.slug.replace(/^\/+/, '')}` : '/';
  }
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trimEnd()}…`;
}

function escapePipes(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ');
}
