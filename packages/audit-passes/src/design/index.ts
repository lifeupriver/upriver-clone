// Methodology: Upriver design audit (Dimension 3) using Firecrawl branding extraction
import type { AuditPassResult } from '@upriver/core';
import { loadPages, loadDesignTokens } from '../shared/loader.js';
import { finding, scoreFromFindings } from '../shared/finding-builder.js';
import { getVerticalPack, type PassOptions } from '../shared/vertical-pack.js';

export async function run(
  slug: string,
  clientDir: string,
  opts: PassOptions = {},
): Promise<AuditPassResult> {
  const pack = getVerticalPack(opts.vertical);
  const pages = loadPages(clientDir);
  const tokens = loadDesignTokens(clientDir);
  const findings = [];

  if (!tokens) {
    findings.push(finding(
      'design', 'p1', 'light',
      'No design tokens extracted',
      'The branding extraction did not produce design tokens. Run upriver scrape with branding format to get design system data.',
      'Re-run: upriver scrape <slug> --pages home',
    ));
    return { dimension: 'design', score: 50, summary: 'Design tokens unavailable.', findings, completed_at: new Date().toISOString() };
  }

  // ── Color palette consistency ─────────────────────────────────────────────
  const colors = tokens.colors ?? {};
  const colorValues = Object.values(colors).filter(Boolean) as string[];
  const uniqueColors = new Set(colorValues.map((c) => c.toLowerCase()));

  if (uniqueColors.size > 6) {
    findings.push(finding(
      'design', 'p1', 'medium',
      `Too many distinct colors in use (${uniqueColors.size})`,
      `The design system has ${uniqueColors.size} distinct color values. A coherent visual identity typically uses 3-5.`,
      'Consolidate to a 3-color system: primary (brand), neutral (backgrounds/text), accent (CTAs). Audit every page element against this palette.',
      { evidence: `Colors detected: ${[...uniqueColors].slice(0, 6).join(', ')}` },
    ));
  }

  // ── Font consistency ──────────────────────────────────────────────────────
  const fonts = tokens.fonts ?? [];
  if (fonts.length > 3) {
    findings.push(finding(
      'design', 'p1', 'medium',
      `Too many font families loading (${fonts.length})`,
      `${fonts.length} font families detected. Extra fonts add load time and reduce visual consistency.`,
      'Reduce to 2 font families maximum: one for headings, one for body. Remove unused font imports.',
      {
        evidence: `Fonts: ${fonts.slice(0, 6).join(', ')}`,
        why: 'Each additional web font adds 50-200KB to page load and creates visual inconsistency when different components were built at different times.',
      },
    ));
  }

  // ── Screenshots present ───────────────────────────────────────────────────
  const withScreenshots = pages.filter((p) => p.screenshots.desktop);
  const withMobile = pages.filter((p) => p.screenshots.mobile);

  if (withScreenshots.length < pages.length * 0.5) {
    findings.push(finding(
      'design', 'p2', 'light',
      'Desktop screenshots incomplete',
      `Only ${withScreenshots.length} of ${pages.length} pages have desktop screenshots captured.`,
      'Re-run upriver scrape to capture missing screenshots for visual review.',
    ));
  }

  // ── Mobile design ─────────────────────────────────────────────────────────
  if (withMobile.length === 0) {
    findings.push(finding(
      'design', 'p1', 'light',
      'No mobile screenshots captured',
      'Mobile screenshots are missing. Without them, mobile design quality cannot be assessed.',
      'Re-run upriver scrape (mobile screenshots are in Phase 4). Review every page at 375px width.',
      { why: pack.mobileWhy },
    ));
  }

  // ── Brand personality ─────────────────────────────────────────────────────
  const personality = tokens.personality ?? [];
  if (personality.length === 0) {
    findings.push(finding(
      'design', 'p2', 'light',
      'Brand personality traits not detected',
      'Firecrawl could not extract brand personality signals from the site. This may indicate the site lacks strong visual identity cues.',
      'Ensure the homepage communicates a clear aesthetic: use consistent imagery tone, defined color usage, and purposeful white space.',
    ));
  }

  // ── CTA button consistency ────────────────────────────────────────────────
  const allCtas = pages.flatMap((p) => p.extracted.ctaButtons);
  const ctaTypes = new Set(allCtas.map((c) => (c.text ?? '').toLowerCase().trim()));
  if (ctaTypes.size > 8) {
    findings.push(finding(
      'design', 'p1', 'medium',
      `Inconsistent CTA copy (${ctaTypes.size} variations)`,
      `${ctaTypes.size} different CTA button labels found across the site. Inconsistent CTAs reduce conversion rates and weaken brand voice.`,
      'Standardize to 2-3 primary CTA variants and use them consistently. Suggested: "Book a Tour," "Check Availability," "Contact Us."',
      { evidence: [...ctaTypes].slice(0, 8).join(' | ') },
    ));
  }

  const score = scoreFromFindings(findings);
  const colorScheme = tokens.colorScheme ?? 'unknown';
  const summary = `Design system analysis: ${colorScheme} color scheme, ${fonts.length} font families, ${uniqueColors.size} colors. ${findings.length} issues found.`;

  return {
    dimension: 'design',
    score,
    summary,
    findings,
    completed_at: new Date().toISOString(),
  };
}
