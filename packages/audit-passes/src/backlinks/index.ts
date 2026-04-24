// Backlinks audit — stub: requires Ahrefs API (AHREFS_API_KEY)
// Provides actionable guidance from site data when API is unavailable
import type { AuditPassResult } from '@upriver/core';
import { loadPages } from '../shared/loader.js';
import { finding, scoreFromFindings } from '../shared/finding-builder.js';

export async function run(slug: string, clientDir: string): Promise<AuditPassResult> {
  const pages = loadPages(clientDir);
  const findings = [];

  const ahrefsKey = process.env['AHREFS_API_KEY'];

  if (!ahrefsKey) {
    // Without API access, surface structural observations about backlink-ability
    const allExternal = pages.flatMap((p) => p.links.external);
    const hasWeddingDirLinks = allExternal.some((l) => /weddingwire|theknot|zola/i.test(l));
    const allTestimonials = pages.flatMap((p) => p.extracted.testimonials);
    const allFaqs = pages.flatMap((p) => p.extracted.faqs);
    const blogPages = pages.filter((p) => /blog|article|story|journal|guide/i.test(p.url));
    const wordCount = pages.reduce((sum, p) => sum + p.content.wordCount, 0);

    findings.push(finding(
      'backlinks', 'p1', 'light',
      'Backlink profile not analyzed — Ahrefs API key not configured',
      'Without an Ahrefs API key, domain authority, referring domains, and anchor text distribution cannot be assessed. Add AHREFS_API_KEY to your .env file to unlock full backlink analysis.',
      'Set AHREFS_API_KEY in .env, then re-run: upriver audit ' + slug + ' --pass backlinks',
      { why: 'Backlink authority is a top-3 Google ranking factor. Sites with more referring domains from quality sources consistently outrank competitors with better on-page SEO.' },
    ));

    // ── Linkable asset assessment ─────────────────────────────────────────
    if (blogPages.length === 0 && wordCount < 5000) {
      findings.push(finding(
        'backlinks', 'p1', 'heavy',
        'No linkable content assets — low natural backlink acquisition potential',
        'The site has no blog, guide, or long-form content that other sites would naturally link to. Transactional pages (pricing, contact) rarely attract links.',
        'Create 3-5 high-value content assets: a local wedding planning guide, a venue comparison guide, a seasonal wedding checklist, or a real weddings blog. These attract organic links from planners, photographers, and local blogs.',
        { why: 'Venues that publish helpful content earn links from wedding planners, photographers, and bridal blogs — the highest-quality backlink sources in the wedding industry.' },
      ));
    }

    // ── Directory citation potential ───────────────────────────────────────
    if (!hasWeddingDirLinks) {
      findings.push(finding(
        'backlinks', 'p2', 'light',
        'No wedding directory profiles linked — missing easy citation backlinks',
        'WeddingWire, The Knot, and Zola profiles provide DA 70+ backlinks for free. No links to these directories were found.',
        'Create and fully complete profiles on WeddingWire, The Knot, Zola, and wedding.com. These are the easiest high-authority backlinks in the industry.',
        { why: 'A complete WeddingWire profile typically provides a DA 73 backlink. These are the highest-authority free links available to venue businesses.' },
      ));
    }

    // ── Local backlink opportunities ──────────────────────────────────────
    if (allTestimonials.length > 0) {
      const photographerMentions = pages
        .flatMap((p) => p.extracted.testimonials)
        .filter((t) => /photographer|videographer|florist|caterer|planner/i.test(t.attribution ?? ''));

      if (photographerMentions.length > 0) {
        findings.push(finding(
          'backlinks', 'p2', 'light',
          'Vendor partner link-building opportunity identified',
          `${photographerMentions.length} vendor testimonials detected. Each vendor is a potential link exchange partner.`,
          'Reach out to vendors who have worked at the venue and ask to be listed on their "venues we love" page. Offer reciprocal links from a preferred vendors page.',
          { why: 'Vendor link exchanges in the wedding industry are standard practice and produce relevant, local, authority links that improve local pack rankings.' },
        ));
      }
    }

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
  findings.push(finding(
    'backlinks', 'p2', 'light',
    'Ahrefs API integration pending implementation',
    'AHREFS_API_KEY is set but full API integration is not yet implemented in this version.',
    'Run a manual Ahrefs audit at app.ahrefs.com and review: Domain Rating, referring domains, anchor text distribution, and top backlink pages.',
  ));

  return {
    dimension: 'backlinks',
    score: 70,
    summary: 'Backlinks: Ahrefs API key found but integration pending.',
    findings,
    completed_at: new Date().toISOString(),
  };
}
