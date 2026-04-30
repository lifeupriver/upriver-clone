// Methodology: .agents/skills/page-cro/SKILL.md + .agents/skills/form-cro/SKILL.md
// Focus: value proposition clarity, CTA hierarchy, trust signals, booking friction, missing pages
import type { AuditPassResult } from '@upriver/core';
import { loadPages } from '../shared/loader.js';
import { finding, scoreFromFindings } from '../shared/finding-builder.js';
import { getVerticalPack, type PassOptions } from '../shared/vertical-pack.js';

export async function run(
  slug: string,
  clientDir: string,
  opts: PassOptions = {},
): Promise<AuditPassResult> {
  const pack = getVerticalPack(opts.vertical);
  const pages = loadPages(clientDir);
  const findings = [];
  const allUrls = pages.map((p) => p.url.toLowerCase() + ' ' + (p.metadata.title ?? '').toLowerCase());

  // ── Missing pages analysis (page-cro skill: missing page = missed conversion) ──
  for (const expected of pack.expectedPages) {
    const found = allUrls.some((u) => expected.pattern.test(u));
    if (!found) {
      findings.push(finding(
        'sales', expected.priority, 'heavy',
        `Missing: ${expected.label}`,
        `No page matching "${expected.label}" was found. Visitors looking for this information leave to find it elsewhere.`,
        `Create a dedicated page for ${expected.label.toLowerCase()}. This is a baseline page for any ${pack.noun} site.`,
        { why: 'Every missing page is a prospect who hit a dead end and went to a competitor instead.' },
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
        'Add a primary CTA above the fold (e.g. "Get in Touch", "Book a Tour", "Reserve a Table"). Make it the most visually prominent element after the headline.',
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
        `Add a clear headline stating what the ${pack.noun} is, a subheadline with the primary benefit, and 2-3 supporting points before the first CTA.`,
        { page: homepage.url },
      ));
    }
  }

  // ── Booking friction: steps from homepage to contact ─────────────────────
  const contactPage = pages.find((p) => /contact|inquir/i.test(p.url));
  if (contactPage) {
    const homepageLinks = homepage?.links.internal ?? [];
    const directContact = homepageLinks.some((l) => /contact|inquir/i.test(l));
    if (!directContact) {
      findings.push(finding(
        'sales', 'p1', 'light',
        'Contact page not directly linked from homepage',
        'The contact/inquiry page is not in the homepage\'s direct internal links, adding friction to the conversion path.',
        'Add a "Contact Us" or primary-action link directly in the homepage navigation and in the hero CTA.',
        { ...(homepage?.url !== undefined ? { page: homepage.url } : {}) },
      ));
    }
  }

  // ── Form audit (form-cro skill) ───────────────────────────────────────────
  const pagesWithForms = pages.filter((p) =>
    /contact|inquir|book|schedule/i.test(p.url) ||
    p.extracted.ctaButtons.some((c) => /submit|send|inquir/i.test(c.text ?? '')),
  );

  if (pagesWithForms.length === 0) {
    findings.push(finding(
      'sales', 'p0', 'heavy',
      'No inquiry form detected',
      `No contact or inquiry form was found. For a ${pack.noun}, an inquiry form is the primary conversion mechanism.`,
      'Add an inquiry form to a dedicated contact page and embed a short version on the homepage. Capture name, email, and the one or two qualifying details specific to this business.',
      { why: 'Most inquiries start with a form. Without one, the only conversion path is a phone call — higher friction, lower conversion.' },
    ));
  }

  // ── Review badge presence ─────────────────────────────────────────────────
  const allLinks = pages.flatMap((p) => p.links.external);
  const reviewBadgePatterns = [...pack.directories.map((d) => d.pattern), /google.*review/i];
  const hasReviewBadge = allLinks.some((l) => reviewBadgePatterns.some((p) => p.test(l)));
  if (!hasReviewBadge) {
    const directoryNames = pack.directories.slice(0, 3).map((d) => d.label).join(', ');
    findings.push(finding(
      'sales', 'p1', 'light',
      'No review platform badges visible',
      `No links to ${directoryNames}, or Google reviews found. Review badges are trust signals that directly influence inquiry rates.`,
      `Add review badges from ${directoryNames} or Google to the homepage and contact page, ideally showing star rating and review count.`,
      { why: 'Third-party review badges convert better than on-site testimonials — they are perceived as unbiased.' },
    ));
  }

  // ── Social proof quantity ─────────────────────────────────────────────────
  const allTestimonials = pages.flatMap((p) => p.extracted.testimonials);
  if (allTestimonials.length < 3) {
    findings.push(finding(
      'sales', 'p0', 'heavy',
      'Insufficient social proof for a high-consideration purchase',
      `Only ${allTestimonials.length} testimonials detected. ${pack.socialProofWhy}`,
      'Add at least 6 specific, attributed testimonials across the homepage, primary service pages, and the contact page.',
      { why: 'Testimonials are the #1 conversion driver for service businesses, especially when the buyer is risk-averse.' },
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
