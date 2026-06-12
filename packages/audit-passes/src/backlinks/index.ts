// Backlinks audit — stub: requires Ahrefs API (AHREFS_API_KEY)
// Provides actionable guidance from site data when API is unavailable
import type { AuditFinding, AuditPassResult } from '@upriver/core';
import { loadPages, type PageData } from '../shared/loader.js';
import { finding, scoreFromFindings } from '../shared/finding-builder.js';
import { getVerticalPack, type PassOptions, type VerticalPack } from '../shared/vertical-pack.js';

/**
 * Structural backlink observations derivable from scraped pages alone.
 * Shared by both the unkeyed path and the keyed-but-unimplemented path so
 * the copy can't drift between them. Directory recommendations and nouns
 * come from the vertical pack — no industry's directories are assumed.
 */
function structuralFindings(pages: PageData[], pack: VerticalPack): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const allExternal = pages.flatMap((p) => p.links.external);
  const blogPages = pages.filter((p) => /blog|article|story|journal|guide/i.test(p.url));
  const wordCount = pages.reduce((sum, p) => sum + p.content.wordCount, 0);

  // ── Linkable asset assessment ─────────────────────────────────────────
  if (blogPages.length === 0 && wordCount < 5000) {
    findings.push(finding(
      'backlinks', 'p1', 'heavy',
      'No linkable content assets — low natural backlink acquisition potential',
      'The site has no blog, guide, or long-form content that other sites would naturally link to. Transactional pages (pricing, contact) rarely attract links.',
      `Create 3-5 high-value content assets: a buyer's guide written for ${pack.buyer}, a comparison or planning guide, a seasonal checklist, or a case-study/portfolio blog. These attract organic links from partners, local press, and industry blogs.`,
      { why: `A ${pack.noun} that publishes genuinely helpful content earns links from partner businesses, local publications, and industry sites — the highest-quality backlink sources available without paid outreach.` },
    ));
  }

  // ── Directory citation potential ───────────────────────────────────────
  const linkedDirs = pack.directories.filter((d) => allExternal.some((l) => d.pattern.test(l)));
  if (linkedDirs.length === 0) {
    const dirList = pack.directories.map((d) => d.label).join(', ');
    findings.push(finding(
      'backlinks', 'p2', 'light',
      'No industry directory profiles linked — missing easy citation backlinks',
      `Profiles on ${dirList} provide high-authority backlinks for free, and no links to any of them were found on the site.`,
      `Create and fully complete profiles on ${dirList}. Link to them from the site footer or contact page, and keep name/address/phone details consistent with the website.`,
      { why: `Completed directory profiles are the easiest high-authority backlinks available to a ${pack.noun} — most of these directories are DA 70+ domains.` },
    ));
  }

  // ── Partner link-building opportunities ───────────────────────────────
  const allTestimonials = pages.flatMap((p) => p.extracted.testimonials);
  if (allTestimonials.length > 0) {
    const partnerMentions = allTestimonials.filter((t) =>
      /photographer|videographer|florist|caterer|planner|vendor|partner|contractor/i.test(t.attribution ?? ''),
    );
    if (partnerMentions.length > 0) {
      findings.push(finding(
        'backlinks', 'p2', 'light',
        'Partner link-building opportunity identified',
        `${partnerMentions.length} testimonial(s) from partner businesses detected. Each partner is a potential link exchange.`,
        'Reach out to partner businesses that have worked with the client and ask to be listed on their recommendations or partners page. Offer a reciprocal link from a preferred-partners page.',
        { why: 'Partner link exchanges produce relevant, local, authority links that improve local rankings — and they are standard practice in most service industries.' },
      ));
    }
  }

  return findings;
}

export async function run(
  slug: string,
  clientDir: string,
  opts: PassOptions = {},
): Promise<AuditPassResult> {
  const pack = getVerticalPack(opts.vertical);
  const pages = loadPages(clientDir);
  const findings: AuditFinding[] = [];

  const ahrefsKey = process.env['AHREFS_API_KEY'];

  if (!ahrefsKey) {
    // Without API access, surface structural observations about backlink-ability
    findings.push(finding(
      'backlinks', 'p1', 'light',
      'Backlink profile not analyzed — Ahrefs API key not configured',
      'Without an Ahrefs API key, domain authority, referring domains, and anchor text distribution cannot be assessed. Add AHREFS_API_KEY to your .env file to unlock full backlink analysis.',
      'Set AHREFS_API_KEY in .env, then re-run: upriver audit ' + slug + ' --pass backlinks',
      { why: 'Backlink authority is a top-3 Google ranking factor. Sites with more referring domains from quality sources consistently outrank competitors with better on-page SEO.' },
    ));

    findings.push(...structuralFindings(pages, pack));

    return {
      dimension: 'backlinks',
      score: scoreFromFindings(findings),
      summary: `Backlinks: API key not configured. ${findings.length} structural observations and recommendations provided.`,
      findings,
      completed_at: new Date().toISOString(),
    };
  }

  // ── Full Ahrefs analysis (when API key is available) ──────────────────────
  // TODO: Implement Ahrefs API v3 integration
  // GET https://api.ahrefs.com/v3/site-explorer/overview?select=domain_rating,ahrefs_rank,backlinks,refdomains&target={domain}
  //
  // Until then, surface that the key is present but unused so users don't
  // assume real Ahrefs data is being returned. Output the same structural
  // observations as the unkeyed path so the audit isn't a no-op.
  console.warn(
    '[backlinks] AHREFS_API_KEY is set, but Ahrefs API v3 integration is not yet implemented. Falling back to structural observations only.',
  );

  findings.push(finding(
    'backlinks', 'p1', 'light',
    'Ahrefs API integration not yet implemented — structural analysis only',
    'AHREFS_API_KEY is set but the Ahrefs v3 client is not wired up in this version. No Domain Rating, referring domains, or anchor text data was retrieved.',
    'For now, run a manual Ahrefs audit at app.ahrefs.com and review: Domain Rating, referring domains, anchor text distribution, and top backlink pages. Track this stub in the backlogs.',
    { why: 'Without real backlink data, the score below is structural-only and undercounts authority. Treat the priorities directionally, not as evidence of poor backlinks.' },
  ));

  findings.push(...structuralFindings(pages, pack));

  return {
    dimension: 'backlinks',
    score: scoreFromFindings(findings),
    summary: `Backlinks: Ahrefs integration not implemented. ${findings.length} structural observations.`,
    findings,
    completed_at: new Date().toISOString(),
  };
}
