// Competitors audit — reads competitor data from client config + discovery output
// Full analysis requires Ahrefs API; provides structural gap analysis from scraped data
import type { AuditPassResult } from '@upriver/core';
import { loadPages } from '../shared/loader.js';
import { finding, scoreFromFindings } from '../shared/finding-builder.js';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

interface ClientConfig {
  competitors?: string[];
  market?: { region?: string; venue_type?: string };
}

interface CompetitorData {
  url: string;
  pageCount?: number;
  hasGallery?: boolean;
  hasPricing?: boolean;
  hasVirtualTour?: boolean;
  testimonialCount?: number;
  faqCount?: number;
}

function loadClientConfig(clientDir: string): ClientConfig {
  const path = join(clientDir, 'client-config.yaml');
  if (!existsSync(path)) return {};
  const yaml = readFileSync(path, 'utf8');
  // Minimal YAML parse for competitors list
  const competitorMatch = yaml.match(/competitors:\s*\n((?:\s+-\s+.+\n?)+)/);
  if (!competitorMatch?.[1]) return {};
  const competitors = competitorMatch[1]
    .split('\n')
    .map((l) => l.replace(/^\s+-\s+/, '').trim())
    .filter(Boolean);
  return { competitors };
}

function loadCompetitorScrapes(clientDir: string): CompetitorData[] {
  const competitorsDir = join(clientDir, 'competitors');
  if (!existsSync(competitorsDir)) return [];

  // Look for any scraped competitor data
  const results: CompetitorData[] = [];
  try {
    const files = readdirSync(competitorsDir).filter((f) => f.endsWith('.json'));
    for (const file of files) {
      try {
        const data = JSON.parse(readFileSync(join(competitorsDir, file), 'utf8')) as CompetitorData;
        results.push(data);
      } catch { /* skip malformed */ }
    }
  } catch { /* dir may not exist */ }
  return results;
}

export async function run(slug: string, clientDir: string): Promise<AuditPassResult> {
  const pages = loadPages(clientDir);
  const findings = [];

  const config = loadClientConfig(clientDir);
  const competitors = config.competitors ?? [];
  const competitorData = loadCompetitorScrapes(clientDir);

  // ── Competitor identification ──────────────────────────────────────────────
  if (competitors.length === 0) {
    findings.push(finding(
      'competitors', 'p1', 'light',
      'No competitors defined in client configuration',
      'No competitor URLs were identified during discovery. Without competitor benchmarking, it is impossible to identify content and feature gaps.',
      'Add 3-5 competitor venue URLs to the client-config.yaml under the "competitors:" key, then re-run: upriver audit ' + slug + ' --pass competitors',
      { why: 'Knowing what your top 3 competitors do better (more pages, better pricing page, more reviews) is the fastest route to identifying high-ROI improvements.' },
    ));
  }

  // ── Feature gap analysis (from our own site) ──────────────────────────────
  const ourPages = pages;
  const ourUrls = ourPages.map((p) => p.url.toLowerCase());
  const ourTestimonials = ourPages.flatMap((p) => p.extracted.testimonials);
  const ourFaqs = ourPages.flatMap((p) => p.extracted.faqs);
  const ourEventSpaces = ourPages.flatMap((p) => p.extracted.eventSpaces);

  const COMPETITOR_STANDARD_FEATURES = [
    {
      check: () => !ourUrls.some((u) => /virtual.tour|360|matterport/i.test(u)) &&
        !ourPages.some((p) => /virtual.tour|360.tour|matterport/i.test(p.content.markdown)),
      finding: finding(
        'competitors', 'p1', 'medium',
        'No virtual tour — increasingly standard among competing venues',
        'Virtual tours (Matterport or 360° photos) are now a standard feature on competing venue websites. They let couples pre-qualify the venue remotely.',
        'Add a virtual tour using Matterport or a 360° photo service. Embed it on the venue spaces page and homepage. This feature alone can eliminate the need for an initial site visit.',
        { why: 'Post-pandemic, couples expect to do significant venue research remotely. Competitors with virtual tours capture couples who won\'t make a speculative drive.' },
      ),
    },
    {
      check: () => !ourUrls.some((u) => /real.wedding|wedding.feature|styled.shoot/i.test(u)) &&
        ourPages.every((p) => !/real.wedding|wedding.feature/i.test(p.content.markdown)),
      finding: finding(
        'competitors', 'p2', 'medium',
        'No real weddings portfolio — common competitive differentiator',
        'Top competing venues feature "Real Weddings" pages showing actual events. This content converts better than stock photography and also ranks well for long-tail searches.',
        'Create a "Real Weddings" section with 6-10 featured weddings. Include ceremony photos, reception photos, couple name, date, photographer credit. Add Schema Event markup.',
        { why: 'Real weddings pages generate organic traffic from searches like "winter wedding [venue name]" and provide the specific social proof that drives inquiry decisions.' },
      ),
    },
    {
      check: () => ourEventSpaces.length === 0 &&
        !ourUrls.some((u) => /space|venue|barn|loft|hall|room/i.test(u)),
      finding: finding(
        'competitors', 'p0', 'heavy',
        'No individual venue space pages — significant competitive gap',
        'Competing venues typically have dedicated pages for each event space with capacity, photos, layout options, and pricing. No individual space pages were found.',
        'Create a dedicated page for each venue space. Each page should include: photos, dimensions, capacity range, layout options (ceremony/reception/cocktail), included amenities, and pricing range.',
        { why: 'Individual space pages rank for "[space type] wedding venue [city]" searches and give couples the detail they need to self-qualify, dramatically improving lead quality.' },
      ),
    },
  ];

  for (const feature of COMPETITOR_STANDARD_FEATURES) {
    if (feature.check()) {
      findings.push(feature.finding);
    }
  }

  // ── Content volume benchmark ───────────────────────────────────────────────
  if (pages.length < 10) {
    findings.push(finding(
      'competitors', 'p1', 'medium',
      `Site has only ${pages.length} pages — likely fewer than competing venues`,
      'Larger sites with more content pages tend to rank for more search queries. Competing venues typically have 20-50+ pages covering all aspects of the venue.',
      'Build out content to 20+ pages: individual venue spaces, real weddings, planning guides, vendor resources, local area guide, seasonal content.',
      {
        why: 'Each additional page is an opportunity to rank for a different search query. A site with 40 pages has 4x more ranking opportunities than a site with 10 pages.',
      },
    ));
  }

  // ── Social proof volume ────────────────────────────────────────────────────
  if (ourTestimonials.length < 6) {
    findings.push(finding(
      'competitors', 'p1', 'medium',
      `Only ${ourTestimonials.length} testimonials — competing venues typically show 20+`,
      'Top-performing venue websites display 20-50 testimonials. Social proof volume matters — more reviews = more trust.',
      'Actively collect and display more testimonials. Reach out to past clients for quotes, import reviews from WeddingWire/The Knot, and display them throughout the site.',
    ));
  }

  // ── Competitor data analysis (if available) ───────────────────────────────
  if (competitorData.length > 0) {
    for (const comp of competitorData) {
      if ((comp.pageCount ?? 0) > pages.length * 1.5) {
        findings.push(finding(
          'competitors', 'p1', 'medium',
          `Competitor ${comp.url} has ~${comp.pageCount} pages vs our ${pages.length}`,
          `This competitor has significantly more content, giving them more ranking opportunities.`,
          'Conduct a content gap analysis against this competitor. Identify which of their pages you\'re missing and prioritize creating those pages.',
        ));
      }
    }
  }

  const score = scoreFromFindings(findings);
  const summary = `Competitive analysis: ${competitors.length} competitors identified, ${competitorData.length} scraped. ${findings.filter((f) => f.priority === 'p0').length} critical gaps vs. industry standard.`;

  return {
    dimension: 'competitors',
    score,
    summary,
    findings,
    completed_at: new Date().toISOString(),
  };
}
