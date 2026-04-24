// Methodology: .agents/skills/seo-audit/SKILL.md
// Priority order: crawlability → technical foundations → on-page → content quality
import type { AuditPassResult } from '@upriver/core';
import { loadPages, loadRawHtml } from '../shared/loader.js';
import { finding, scoreFromFindings } from '../shared/finding-builder.js';

const ANALYTICS_PATTERNS = [
  'gtag(', 'google-analytics', 'googletagmanager', 'plausible.io', 'umami',
];

const BANNED_SEO_PATTERNS = [
  { pattern: /<meta name="robots" content="[^"]*noindex/i, label: 'noindex meta tag' },
];

export async function run(slug: string, clientDir: string): Promise<AuditPassResult> {
  const pages = loadPages(clientDir);
  const findings = [];
  const urlSet = new Set(pages.map((p) => p.url));

  // ── Canonical tags ────────────────────────────────────────────────────────
  const missingCanonical = pages.filter((p) => !p.metadata.canonical);
  if (missingCanonical.length > 0) {
    findings.push(finding(
      'seo', 'p1', 'medium',
      'Missing canonical tags',
      `${missingCanonical.length} pages have no canonical tag, leaving duplicate content signals unresolved.`,
      'Add a self-referencing canonical tag to every page.',
      {
        evidence: `${missingCanonical.length} of ${pages.length} pages missing canonical`,
        affected_pages: missingCanonical.slice(0, 10).map((p) => p.url),
        why: 'Without canonical tags, search engines may index duplicate or near-duplicate versions of the same page, splitting ranking signals.',
      },
    ));
  }

  // ── Meta titles ───────────────────────────────────────────────────────────
  const missingTitle = pages.filter((p) => !p.metadata.title);
  const shortTitle = pages.filter((p) => p.metadata.title && p.metadata.title.length < 20);
  const longTitle = pages.filter((p) => p.metadata.title && p.metadata.title.length > 60);

  if (missingTitle.length > 0) {
    findings.push(finding(
      'seo', 'p0', 'light',
      'Pages missing title tags',
      `${missingTitle.length} pages have no title tag.`,
      'Add a unique, descriptive title tag (50-60 characters) to every page.',
      {
        affected_pages: missingTitle.slice(0, 10).map((p) => p.url),
        why: 'Title tags are the single most important on-page SEO element. Missing titles mean Google writes its own — usually worse.',
      },
    ));
  }
  if (longTitle.length > 3) {
    findings.push(finding(
      'seo', 'p1', 'light',
      'Title tags too long (truncated in search results)',
      `${longTitle.length} pages have title tags over 60 characters, which Google truncates in search results.`,
      'Rewrite title tags to 50-60 characters, leading with the primary keyword.',
      { affected_pages: longTitle.slice(0, 10).map((p) => p.url) },
    ));
  }

  // ── Meta descriptions ─────────────────────────────────────────────────────
  const missingDesc = pages.filter((p) => !p.metadata.description);
  if (missingDesc.length > pages.length * 0.3) {
    findings.push(finding(
      'seo', 'p1', 'medium',
      'Most pages missing meta descriptions',
      `${missingDesc.length} of ${pages.length} pages have no meta description.`,
      'Write unique meta descriptions (140-160 characters) for every page. Include the primary keyword and a call to action.',
      {
        affected_pages: missingDesc.slice(0, 5).map((p) => p.url),
        why: 'Meta descriptions are the primary copy in search results. Missing ones cause Google to pull random body text — usually a worse click-through rate.',
      },
    ));
  }

  // ── Heading structure ─────────────────────────────────────────────────────
  const noH1 = pages.filter((p) => !p.content.headings.some((h) => h.level === 1));
  if (noH1.length > 0) {
    findings.push(finding(
      'seo', 'p1', 'medium',
      'Pages missing H1 tags',
      `${noH1.length} pages have no H1 heading, which weakens keyword signals for those pages.`,
      'Add one H1 to every page that clearly states the primary topic and includes the target keyword.',
      { affected_pages: noH1.slice(0, 10).map((p) => p.url) },
    ));
  }

  const multiH1 = pages.filter((p) => p.content.headings.filter((h) => h.level === 1).length > 1);
  if (multiH1.length > 2) {
    findings.push(finding(
      'seo', 'p2', 'light',
      'Multiple H1 tags on some pages',
      `${multiH1.length} pages have more than one H1, which dilutes the primary topic signal.`,
      'Use exactly one H1 per page. Demote secondary headings to H2.',
      { affected_pages: multiH1.slice(0, 5).map((p) => p.url) },
    ));
  }

  // ── Thin content ──────────────────────────────────────────────────────────
  const thinPages = pages.filter((p) => p.content.wordCount > 0 && p.content.wordCount < 200);
  if (thinPages.length > 0) {
    findings.push(finding(
      'seo', 'p1', 'heavy',
      'Thin content pages (under 200 words)',
      `${thinPages.length} pages have fewer than 200 words. Google considers these thin and may exclude them from rankings.`,
      'Expand thin pages to at least 300 words with useful, specific content. Alternatively, noindex pages that can\'t be meaningfully expanded.',
      {
        affected_pages: thinPages.slice(0, 10).map((p) => p.url),
        why: 'Thin content pages can drag down the overall quality assessment of the entire site, not just the individual pages.',
      },
    ));
  }

  // ── Analytics ─────────────────────────────────────────────────────────────
  const homePage = pages.find((p) => { try { return new URL(p.url).pathname === '/'; } catch { return false; } });
  if (homePage) {
    const rawHtml = loadRawHtml(homePage);
    const hasAnalytics = ANALYTICS_PATTERNS.some((pat) => rawHtml.toLowerCase().includes(pat));
    if (!hasAnalytics) {
      findings.push(finding(
        'seo', 'p0', 'light',
        'No analytics tool detected',
        'No Google Analytics, Plausible, or Umami script found on the homepage. Without analytics, there is no visibility into traffic, conversions, or user behavior.',
        'Install Google Analytics 4 or Plausible. Connect to Google Search Console and submit the sitemap.',
        { why: 'Without analytics, every decision about the site is based on guesswork. This is the single most important tracking gap to close.' },
      ));
    }
  }

  // ── HTTPS ─────────────────────────────────────────────────────────────────
  const httpPages = pages.filter((p) => p.url.startsWith('http:'));
  if (httpPages.length > 0) {
    findings.push(finding(
      'seo', 'p0', 'medium',
      'Pages served over HTTP (not HTTPS)',
      `${httpPages.length} pages are on HTTP. Google treats HTTPS as a ranking signal and Chrome marks HTTP sites as "Not Secure."`,
      'Enable HTTPS across the entire site and set up HTTP→HTTPS redirects.',
      { affected_pages: httpPages.map((p) => p.url) },
    ));
  }

  // ── noindex tags ──────────────────────────────────────────────────────────
  for (const page of pages.slice(0, 20)) {
    const rawHtml = loadRawHtml(page);
    for (const { pattern, label } of BANNED_SEO_PATTERNS) {
      if (pattern.test(rawHtml)) {
        findings.push(finding(
          'seo', 'p0', 'light',
          `Indexation blocked: ${label}`,
          `${page.url} has a ${label} that prevents Google from indexing it.`,
          'Remove the noindex directive unless this page is intentionally excluded from search.',
          { page: page.url },
        ));
      }
    }
  }

  // ── Duplicate titles ──────────────────────────────────────────────────────
  const titleMap = new Map<string, string[]>();
  for (const p of pages) {
    const t = (p.metadata.title ?? '').trim().toLowerCase();
    if (!t) continue;
    const existing = titleMap.get(t) ?? [];
    existing.push(p.url);
    titleMap.set(t, existing);
  }
  const duplicateTitles = [...titleMap.values()].filter((urls) => urls.length > 1);
  if (duplicateTitles.length > 0) {
    const flat = duplicateTitles.flat();
    findings.push(finding(
      'seo', 'p1', 'medium',
      'Duplicate title tags across pages',
      `${duplicateTitles.length} title tag values are shared by multiple pages. Search engines may struggle to differentiate them.`,
      'Write a unique, keyword-specific title tag for every page. No two pages should share a title.',
      { affected_pages: flat.slice(0, 10) },
    ));
  }

  const score = scoreFromFindings(findings);
  const summary = findings.length === 0
    ? 'No significant SEO issues found.'
    : `Found ${findings.length} SEO issues: ${findings.filter((f) => f.priority === 'p0').length} critical, ${findings.filter((f) => f.priority === 'p1').length} important, ${findings.filter((f) => f.priority === 'p2').length} minor.`;

  return {
    dimension: 'seo',
    score,
    summary,
    findings,
    completed_at: new Date().toISOString(),
  };
}
