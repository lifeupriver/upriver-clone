// Methodology: .agents/skills/page-cro/SKILL.md + .agents/skills/form-cro/SKILL.md
// Focus: value proposition clarity, CTA hierarchy, trust signals, booking friction, missing pages
import type { AuditPassResult } from '@upriver/core';
import { loadPages } from '../shared/loader.js';
import { finding, scoreFromFindings } from '../shared/finding-builder.js';

// Pages a wedding venue site should have
const EXPECTED_VENUE_PAGES = [
  { pattern: /venue|space|barn|loft|outdoor|garden|pavilion/i, label: 'Dedicated venue space pages', priority: 'p1' as const },
  { pattern: /pricing|packages|rates|investment/i, label: 'Pricing or packages page', priority: 'p0' as const },
  { pattern: /gallery|portfolio|photos|real.wedding/i, label: 'Photo gallery or real weddings', priority: 'p1' as const },
  { pattern: /faq|questions|what.to.expect/i, label: 'FAQ page', priority: 'p1' as const },
  { pattern: /contact|inquir|reach.us/i, label: 'Contact or inquiry page', priority: 'p0' as const },
  { pattern: /about|our.story|team/i, label: 'About page', priority: 'p1' as const },
  { pattern: /catering|food|beverage|bar/i, label: 'Catering or food & beverage page', priority: 'p1' as const },
  { pattern: /vendor|preferred.partner/i, label: 'Preferred vendors list', priority: 'p2' as const },
  { pattern: /accommodation|lodging|stay|hotel|cabin/i, label: 'Accommodations page', priority: 'p2' as const },
  { pattern: /local|area|direction|travel/i, label: 'Local area or directions page', priority: 'p2' as const },
];

export async function run(slug: string, clientDir: string): Promise<AuditPassResult> {
  const pages = loadPages(clientDir);
  const findings = [];
  const allUrls = pages.map((p) => p.url.toLowerCase() + ' ' + (p.metadata.title ?? '').toLowerCase());

  // ── Missing pages analysis (page-cro skill: missing page = missed conversion) ──
  for (const expected of EXPECTED_VENUE_PAGES) {
    const found = allUrls.some((u) => expected.pattern.test(u));
    if (!found) {
      findings.push(finding(
        'sales', expected.priority, 'heavy',
        `Missing: ${expected.label}`,
        `No page matching "${expected.label}" was found. Visitors looking for this information leave to find it elsewhere.`,
        `Create a dedicated page for ${expected.label.toLowerCase()}. This is a required page for any wedding venue site.`,
        { why: 'Every missing page is a prospect who hit a dead end and called a competitor instead.' },
      ));
    }
  }

  // ── Homepage CTA audit (page-cro: primary CTA visible without scrolling) ──
  const homepage = pages.find((p) => { try { return new URL(p.url).pathname === '/'; } catch { return false; } });
  if (homepage) {
    const heroCtas = homepage.extracted.ctaButtons.filter(
      (c) => c.location?.toLowerCase().includes('hero') || c.type === 'primary',
    );
    if (heroCtas.length === 0 && homepage.extracted.ctaButtons.length === 0) {
      findings.push(finding(
        'sales', 'p0', 'light',
        'No CTAs detected on homepage',
        'The homepage has no detectable call-to-action buttons. Visitors have no clear next step.',
        'Add a primary CTA above the fold: "Book a Tour" or "Check Availability." Make it the most visually prominent element after the headline.',
        { page: homepage.url, why: 'The homepage\'s only job is to get the visitor to take the next step. No CTA = no conversions.' },
      ));
    }

    // 5-second test: does the homepage communicate the value proposition?
    const wordCount = homepage.content.wordCount;
    if (wordCount < 50) {
      findings.push(finding(
        'sales', 'p0', 'medium',
        'Homepage has almost no content',
        `The homepage has only ${wordCount} words. Visitors cannot understand what the business is or why they should care.`,
        'Add a clear headline stating what the venue is, a subheadline with the primary benefit, and 2-3 supporting points before the first CTA.',
        { page: homepage.url },
      ));
    }
  }

  // ── Booking friction: steps from homepage to contact ─────────────────────
  const contactPage = pages.find((p) => /contact|inquir/i.test(p.url));
  if (contactPage) {
    // Check if contact is linked directly from homepage
    const homepageLinks = homepage?.links.internal ?? [];
    const directContact = homepageLinks.some((l) => /contact|inquir/i.test(l));
    if (!directContact) {
      findings.push(finding(
        'sales', 'p1', 'light',
        'Contact page not directly linked from homepage',
        'The contact/inquiry page is not in the homepage\'s direct internal links, adding friction to the conversion path.',
        'Add a "Contact Us" or "Book a Tour" link directly in the homepage navigation and in the hero CTA.',
        { ...(homepage?.url !== undefined ? { page: homepage.url } : {}) },
      ));
    }
  }

  // ── Form audit (form-cro skill) ───────────────────────────────────────────
  // Look for pages with forms (inquiry, contact)
  const pagesWithForms = pages.filter((p) =>
    /contact|inquir|book|schedule/i.test(p.url) ||
    p.extracted.ctaButtons.some((c) => /submit|send|inquir/i.test(c.text ?? '')),
  );

  if (pagesWithForms.length === 0) {
    findings.push(finding(
      'sales', 'p0', 'heavy',
      'No inquiry form detected',
      'No contact or inquiry form was found. For a venue business, the inquiry form is the primary conversion mechanism.',
      'Add an inquiry form to a dedicated contact page and embed a short version on the homepage. Fields needed: name, email, event date, event type, guest count.',
      { why: 'Every venue booking starts with an inquiry. Without a form, the only conversion path is a phone call — higher friction, lower conversion.' },
    ));
  }

  // ── Review badge presence ─────────────────────────────────────────────────
  const allLinks = pages.flatMap((p) => p.links.external);
  const hasReviewBadge = allLinks.some((l) => /weddingwire|theknot|google.*review/i.test(l));
  if (!hasReviewBadge) {
    findings.push(finding(
      'sales', 'p1', 'light',
      'No review platform badges visible',
      'No WeddingWire, The Knot, or Google review links found. Review badges are trust signals that directly influence inquiry rates.',
      'Add WeddingWire and/or The Knot review badges to the homepage and contact page, ideally showing star rating and review count.',
      { why: 'Third-party review badges convert better than testimonials written on the site itself — they are perceived as unbiased.' },
    ));
  }

  // ── Social proof quantity ─────────────────────────────────────────────────
  const allTestimonials = pages.flatMap((p) => p.extracted.testimonials);
  if (allTestimonials.length < 3) {
    findings.push(finding(
      'sales', 'p0', 'heavy',
      'Insufficient social proof for a high-consideration purchase',
      `Only ${allTestimonials.length} testimonials detected. Wedding venue decisions are high-stakes and emotional — buyers need significant social proof before converting.`,
      'Add at least 6 specific, attributed testimonials. Show them on the homepage, on each venue space page, and on the contact page.',
      { why: 'Research consistently shows testimonials are the #1 conversion driver for service businesses. The venue industry buyer is risk-averse and needs reassurance from peers.' },
    ));
  }

  const score = scoreFromFindings(findings);
  const totalCtas = pages.reduce((n, p) => n + p.extracted.ctaButtons.length, 0);
  const summary = `Sales effectiveness: ${totalCtas} CTAs found, ${allTestimonials.length} testimonials, ${pagesWithForms.length} forms detected. ${findings.filter((f) => f.priority === 'p0').length} critical gaps.`;

  return {
    dimension: 'sales',
    score,
    summary,
    findings,
    completed_at: new Date().toISOString(),
  };
}
