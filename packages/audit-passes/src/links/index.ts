// Methodology: .agents/skills/site-architecture/SKILL.md
// Focus: orphan detection, click depth, internal link equity, broken internal links
import type { AuditPassResult, AuditFinding } from '@upriver/core';
import { loadPages } from '../shared/loader.js';
import { finding, scoreFromFindings } from '../shared/finding-builder.js';

export async function run(slug: string, clientDir: string): Promise<AuditPassResult> {
  const pages = loadPages(clientDir);
  const findings: AuditFinding[] = [];

  if (pages.length === 0) {
    return { dimension: 'links', score: 50, summary: 'No pages to analyze.', findings, completed_at: new Date().toISOString() };
  }

  const urlSet = new Set(pages.map((p) => p.url.toLowerCase().replace(/\/$/, '')));

  // ── Orphan page detection ─────────────────────────────────────────────────
  // A page is orphaned if no other page links to it internally
  const inboundLinks = new Map<string, number>();
  for (const page of pages) {
    for (const link of page.links.internal) {
      const normalized = link.toLowerCase().replace(/\/$/, '');
      inboundLinks.set(normalized, (inboundLinks.get(normalized) ?? 0) + 1);
    }
  }

  const orphans = pages.filter((p) => {
    const normalized = p.url.toLowerCase().replace(/\/$/, '');
    // Homepage is never orphaned
    try { if (new URL(p.url).pathname === '/') return false; } catch { return false; }
    return (inboundLinks.get(normalized) ?? 0) === 0;
  });

  if (orphans.length > 0) {
    findings.push(finding(
      'links', 'p1', 'medium',
      `${orphans.length} orphaned pages with no internal links pointing to them`,
      `${orphans.length} pages are not linked from any other page on the site. Search engines may not discover them, and visitors have no path to find them.`,
      'Add internal links to these pages from relevant parent pages, the navigation, or a sitemap page.',
      {
        affected_pages: orphans.slice(0, 10).map((p) => p.url),
        why: 'Orphaned pages receive no PageRank flow and may be deindexed over time. They also represent wasted content investment.',
      },
    ));
  }

  // ── Click depth (pages reachable in > 3 clicks from homepage) ─────────────
  const homeUrl = pages.find((p) => { try { return new URL(p.url).pathname === '/'; } catch { return false; } })?.url;
  if (homeUrl) {
    const depth = new Map<string, number>();
    depth.set(homeUrl.toLowerCase().replace(/\/$/, ''), 0);
    const queue = [homeUrl];

    while (queue.length > 0) {
      const current = queue.shift()!;
      const currentPage = pages.find((p) => p.url === current);
      const currentDepth = depth.get(current.toLowerCase().replace(/\/$/, '')) ?? 0;
      for (const link of currentPage?.links.internal ?? []) {
        const norm = link.toLowerCase().replace(/\/$/, '');
        if (!depth.has(norm) && urlSet.has(norm)) {
          depth.set(norm, currentDepth + 1);
          const linkedPage = pages.find((p) => p.url.toLowerCase().replace(/\/$/, '') === norm);
          if (linkedPage) queue.push(linkedPage.url);
        }
      }
    }

    const deepPages = pages.filter((p) => {
      const d = depth.get(p.url.toLowerCase().replace(/\/$/, ''));
      return d !== undefined && d > 3;
    });

    if (deepPages.length > 0) {
      findings.push(finding(
        'links', 'p1', 'medium',
        `${deepPages.length} pages buried more than 3 clicks from the homepage`,
        `${deepPages.length} pages require more than 3 clicks to reach from the homepage. Deep pages receive less crawl budget and ranking equity.`,
        'Restructure navigation or add shortcut links to bring all important pages within 3 clicks of the homepage.',
        {
          affected_pages: deepPages.slice(0, 10).map((p) => p.url),
          why: 'Google\'s crawler distributes PageRank through links. Pages deep in the hierarchy receive very little, hurting their ranking potential.',
        },
      ));
    }
  }

  // ── Internal link count per page ─────────────────────────────────────────
  const lowInternalLinks = pages.filter((p) => {
    try { if (new URL(p.url).pathname === '/') return false; } catch { return false; }
    return p.links.internal.length < 3;
  });

  if (lowInternalLinks.length > pages.length * 0.4) {
    findings.push(finding(
      'links', 'p2', 'medium',
      'Most pages have very few internal links',
      `${lowInternalLinks.length} of ${pages.length} pages link to fewer than 3 other pages. Sparse internal linking limits crawl discovery and PageRank distribution.`,
      'Add contextual internal links throughout body copy. Every page should link to at least 3-5 related pages.',
      { why: 'Internal links are free PageRank transfers. A well-linked site ranks better and is easier for both users and crawlers to navigate.' },
    ));
  }

  // ── External link quality ─────────────────────────────────────────────────
  const allExternal = pages.flatMap((p) => p.links.external);
  const suspiciousExternal = allExternal.filter((l) => /casino|poker|loan|pharma|payday/i.test(l));
  if (suspiciousExternal.length > 0) {
    findings.push(finding(
      'links', 'p0', 'light',
      'Suspicious outbound links detected',
      `${suspiciousExternal.length} outbound links point to domains in categories typically associated with spam (gambling, loans, pharmaceuticals).`,
      'Audit all outbound links and remove any that are not intentional editorial links. Check if the site has been compromised.',
      {
        affected_pages: suspiciousExternal.slice(0, 5),
        why: 'Linking to low-quality or spam domains is a negative ranking signal and may indicate a site compromise.',
      },
    ));
  }

  // ── Navigation link consistency ───────────────────────────────────────────
  // Check if homepage has reasonable number of internal nav links
  const homepage = pages.find((p) => { try { return new URL(p.url).pathname === '/'; } catch { return false; } });
  if (homepage && homepage.links.internal.length < 4) {
    findings.push(finding(
      'links', 'p1', 'light',
      'Homepage has very few internal links',
      `The homepage links to only ${homepage.links.internal.length} internal pages. A venue site should link to all major sections from the homepage.`,
      'Ensure the homepage navigation links to: venue spaces, pricing, gallery, about, contact/inquiry. Add footer links to secondary pages.',
      { page: homepage.url },
    ));
  }

  const score = scoreFromFindings(findings);
  const avgInbound = pages.length > 0
    ? Math.round([...inboundLinks.values()].reduce((a, b) => a + b, 0) / pages.length)
    : 0;
  const summary = `Link structure: ${pages.length} pages, ${orphans.length} orphans, avg ${avgInbound} inbound links/page. ${findings.length} issues found.`;

  return {
    dimension: 'links',
    score,
    summary,
    findings,
    completed_at: new Date().toISOString(),
  };
}
