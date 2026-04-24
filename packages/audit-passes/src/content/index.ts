// Methodology: Upriver content quality framework (Dimension 2)
import type { AuditPassResult } from '@upriver/core';
import { loadPages } from '../shared/loader.js';
import { finding, scoreFromFindings } from '../shared/finding-builder.js';

const BANNED_WORDS = [
  'stunning', 'magical', 'seamlessly', 'transform', 'elevate', 'unlock',
  'world-class', 'premier', 'game-changer', 'robust', 'synergy',
  'innovative', 'cutting-edge', 'state-of-the-art', 'best-in-class',
];

const WEASEL_WORDS = [
  /\bbest\b/i, /\bleading\b/i, /\btop-rated\b/i, /\baward-winning\b/i,
];

export async function run(slug: string, clientDir: string): Promise<AuditPassResult> {
  const pages = loadPages(clientDir);
  const findings = [];

  // ── Banned marketing language ─────────────────────────────────────────────
  const bannedHits: Map<string, string[]> = new Map();
  for (const page of pages) {
    const md = page.content.markdown.toLowerCase();
    for (const word of BANNED_WORDS) {
      if (md.includes(word)) {
        const pages = bannedHits.get(word) ?? [];
        pages.push(page.url);
        bannedHits.set(word, pages);
      }
    }
  }
  if (bannedHits.size > 0) {
    const examples = [...bannedHits.entries()]
      .map(([w, urls]) => `"${w}" (${urls.length} page${urls.length > 1 ? 's' : ''})`)
      .join(', ');
    findings.push(finding(
      'content', 'p1', 'medium',
      'Banned marketing language detected',
      `The site uses vague, overused words that signal low credibility: ${examples}.`,
      'Replace banned words with specific, evidence-based language. Instead of "stunning views," write "floor-to-ceiling windows overlooking the Catskill Mountains."',
      {
        why: 'Vague superlatives are invisible to readers — they\'ve been trained to skip them. Specific claims are memorable and credible.',
      },
    ));
  }

  // ── Weasel words ──────────────────────────────────────────────────────────
  const weaselPages: string[] = [];
  for (const page of pages) {
    const md = page.content.markdown;
    if (WEASEL_WORDS.some((re) => re.test(md))) {
      weaselPages.push(page.url);
    }
  }
  if (weaselPages.length > 2) {
    findings.push(finding(
      'content', 'p2', 'medium',
      'Unsubstantiated superlative claims',
      `${weaselPages.length} pages use "best," "leading," or similar claims without citation or evidence.`,
      'Remove or substantiate every superlative. Add the specific award, review count, or data point that justifies the claim.',
      { affected_pages: weaselPages.slice(0, 5) },
    ));
  }

  // ── Thin pages ────────────────────────────────────────────────────────────
  const thinPages = pages.filter((p) => p.content.wordCount > 0 && p.content.wordCount < 150);
  if (thinPages.length > 0) {
    findings.push(finding(
      'content', 'p1', 'heavy',
      'Thin content pages',
      `${thinPages.length} pages have fewer than 150 words of content — not enough to answer a visitor\'s questions or rank well.`,
      'Add genuine, helpful content: specific descriptions, FAQs, what to expect, what\'s included. Aim for at least 300 words on key pages.',
      { affected_pages: thinPages.slice(0, 8).map((p) => p.url) },
    ));
  }

  // ── Images without alt text ───────────────────────────────────────────────
  const noAltPages = pages.filter((p) => p.images.length > 0 &&
    (p.content.markdown.match(/!\[\]/g) ?? []).length > 0);
  if (noAltPages.length > 0) {
    findings.push(finding(
      'content', 'p1', 'medium',
      'Images missing alt text',
      `${noAltPages.length} pages have images with empty alt attributes, harming accessibility and image SEO.`,
      'Write descriptive alt text for every image. Describe what is shown and why it matters in context.',
      { affected_pages: noAltPages.slice(0, 5).map((p) => p.url) },
    ));
  }

  // ── Social proof presence ─────────────────────────────────────────────────
  const allTestimonials = pages.flatMap((p) => p.extracted.testimonials);
  if (allTestimonials.length < 3) {
    findings.push(finding(
      'content', 'p1', 'heavy',
      'Insufficient social proof on site',
      `Only ${allTestimonials.length} testimonials detected across all pages. For a venue business, social proof is a primary purchase driver.`,
      'Add at least 6-8 attributed testimonials from real clients. Include name, event type, and ideally a photo. Place the strongest one above the fold on the homepage.',
      { why: 'Buyers of venue services are making a high-stakes, emotional purchase. Seeing real people who made the same decision and were happy is the most powerful conversion element on the site.' },
    ));
  }

  // ── FAQ coverage ──────────────────────────────────────────────────────────
  const allFaqs = pages.flatMap((p) => p.extracted.faqs);
  if (allFaqs.length < 10) {
    findings.push(finding(
      'content', 'p1', 'heavy',
      'Low FAQ coverage',
      `Only ${allFaqs.length} FAQ entries detected. Venue clients have dozens of questions before they contact — unanswered questions become objections.`,
      'Build a dedicated FAQ page with at least 30-50 questions. Group by topic: venue spaces, catering, pricing, logistics, day-of details.',
      { why: 'FAQ pages serve dual purpose: they reduce inquiry friction for prospects and they rank for long-tail "can I" and "do you" searches.' },
    ));
  }

  const score = scoreFromFindings(findings);
  const summary = `Content quality analysis across ${pages.length} pages. ${findings.filter((f) => f.priority === 'p0').length} critical, ${findings.filter((f) => f.priority === 'p1').length} important, ${findings.filter((f) => f.priority === 'p2').length} minor issues.`;

  return {
    dimension: 'content',
    score,
    summary,
    findings,
    completed_at: new Date().toISOString(),
  };
}
