// Methodology: Upriver typography audit. Heuristic-only (no rendering /
// font-metrics inspection). Focuses on per-page heading hierarchy, font-stack
// hygiene, and type-scale signals derivable from extracted design tokens.
import type { AuditPassResult } from '@upriver/core';

import { finding, scoreFromFindings } from '../shared/finding-builder.js';
import { loadDesignTokens, loadPages, type PageData } from '../shared/loader.js';

interface HeadingIssue {
  pageSlug: string;
  kind: 'no-h1' | 'multi-h1' | 'skipped-level' | 'no-headings';
  detail: string;
}

/**
 * Run the typography base pass.
 */
export async function run(slug: string, clientDir: string): Promise<AuditPassResult> {
  void slug;
  const pages = loadPages(clientDir);
  const tokens = loadDesignTokens(clientDir);
  const findings = [];

  // Heading hierarchy.
  const issues: HeadingIssue[] = [];
  for (const page of pages) {
    if (page.metadata.statusCode && page.metadata.statusCode >= 400) continue;
    const issue = analyzeHeadingHierarchy(page);
    if (issue) issues.push(issue);
  }
  if (issues.length > 0) {
    const sample = issues
      .slice(0, 5)
      .map((i) => `${i.pageSlug} (${i.kind}: ${i.detail})`)
      .join('; ');
    const ratio = pages.length === 0 ? 0 : issues.length / pages.length;
    findings.push(
      finding(
        'design',
        ratio >= 0.5 ? 'p0' : 'p1',
        'medium',
        `Heading hierarchy issues on ${issues.length}/${pages.length} pages`,
        `Pages without a single H1, with multiple H1s, or with skipped heading levels — both a typography signal and an SEO/accessibility issue.`,
        'Restructure each page so it has exactly one H1 (the page title), with H2s for top-level sections and H3+ for nested groups. Avoid jumping from H1 directly to H3.',
        {
          evidence: `Examples: ${sample}${issues.length > 5 ? `, +${issues.length - 5} more` : ''}`,
          why:
            'Search engines and screen readers infer document structure from heading order. A skipped level or duplicate H1 confuses both, and the typographic system breaks visually too.',
        },
      ),
    );
  }

  // Font-stack hygiene. `tokens.fonts` may be `string[]` (older shape) or
  // `{ family: string; role?: string }[]` (current branding-extraction shape).
  const fonts = (tokens?.fonts ?? []) as Array<string | { family?: string }>;
  const distinctFonts = new Set(
    fonts
      .map((f) => (typeof f === 'string' ? f : f?.family ?? ''))
      .map((s) => s.toLowerCase().trim())
      .filter(Boolean),
  );
  if (distinctFonts.size === 0 && tokens) {
    findings.push(
      finding(
        'design',
        'p1',
        'light',
        'No fonts detected in design tokens',
        'The branding extraction did not surface any font families. Either the site relies entirely on system fonts (rare for a brand site) or extraction missed them.',
        'Re-run `upriver scrape <slug> --pages home` to refresh tokens, then audit the result.',
        {},
      ),
    );
  } else if (distinctFonts.size === 1) {
    findings.push(
      finding(
        'design',
        'p2',
        'light',
        'Single font family across the site',
        `Only one font family detected (\`${[...distinctFonts][0]}\`). Most brand identities pair a display face with a workhorse body font; using one signals an unfinished system.`,
        'Introduce a second family. One for display headings (with character) and one for body (highly readable at 14-16px).',
        {},
      ),
    );
  } else if (distinctFonts.size > 3) {
    findings.push(
      finding(
        'design',
        'p1',
        'medium',
        `${distinctFonts.size} font families loaded`,
        `${distinctFonts.size} distinct font families detected. Each adds 50-200KB of network weight and visual noise.`,
        'Consolidate to 2-3 families maximum. Audit which components actually need a third face; replace the rest with the primary pair.',
        { evidence: `Fonts: ${[...distinctFonts].slice(0, 6).join(', ')}` },
      ),
    );
  }

  // Type-scale ratio.
  const scaleIssue = analyzeTypeScale(tokens?.typography);
  if (scaleIssue) findings.push(scaleIssue);

  const score = scoreFromFindings(findings);
  const summary =
    `Typography: ${pages.length - issues.length}/${pages.length} pages have valid heading hierarchy; ` +
    `${distinctFonts.size} font famil${distinctFonts.size === 1 ? 'y' : 'ies'} detected.`;

  return {
    dimension: 'design',
    score,
    summary,
    findings,
    completed_at: new Date().toISOString(),
  };
}

/**
 * Inspect a single page's heading list for the most-impactful structural issue
 * (no h1, multiple h1, skipped level, no headings at all). Returns null when
 * the page is well-structured.
 */
function analyzeHeadingHierarchy(page: PageData): HeadingIssue | null {
  const headings = page.content.headings;
  if (!headings || headings.length === 0) {
    return { pageSlug: page.slug, kind: 'no-headings', detail: 'no headings detected' };
  }
  const h1s = headings.filter((h) => h.level === 1);
  if (h1s.length === 0) {
    return { pageSlug: page.slug, kind: 'no-h1', detail: 'page has no H1' };
  }
  if (h1s.length > 1) {
    return { pageSlug: page.slug, kind: 'multi-h1', detail: `${h1s.length} H1s` };
  }
  let prev = 0;
  for (const h of headings) {
    if (prev !== 0 && h.level > prev + 1) {
      return {
        pageSlug: page.slug,
        kind: 'skipped-level',
        detail: `H${prev} -> H${h.level} ("${h.text.slice(0, 32)}")`,
      };
    }
    prev = h.level;
  }
  return null;
}

/**
 * Analyze the type-scale ratio described by `tokens.typography`. Looks for a
 * `fontSizes` collection (string->string map of pixel/rem values) and checks
 * whether the ratios between adjacent steps fall in a healthy band
 * (1.125-1.5). Returns null when no usable size data is present.
 */
function analyzeTypeScale(typography: Record<string, unknown> | undefined) {
  if (!typography) return null;
  const fontSizes = typography['fontSizes'];
  if (!fontSizes || typeof fontSizes !== 'object') return null;
  const sizes: number[] = [];
  for (const v of Object.values(fontSizes as Record<string, unknown>)) {
    if (typeof v !== 'string') continue;
    const num = parsePxOrRem(v);
    if (num != null && num > 0) sizes.push(num);
  }
  if (sizes.length < 3) return null;
  sizes.sort((a, b) => a - b);
  const ratios: number[] = [];
  for (let i = 1; i < sizes.length; i += 1) {
    const a = sizes[i - 1]!;
    const b = sizes[i]!;
    if (a > 0) ratios.push(b / a);
  }
  const avg = ratios.reduce((s, r) => s + r, 0) / ratios.length;
  if (avg < 1.1) {
    return finding(
      'design',
      'p2',
      'light',
      `Type scale too tight (avg ratio ${avg.toFixed(2)})`,
      `Adjacent type sizes step up by an average of ${avg.toFixed(2)}x. Hierarchy will read flat — operators and visitors will struggle to scan.`,
      'Adopt a modular scale around 1.2-1.333 (minor third / perfect fourth). Most type systems pick a single ratio and apply it consistently.',
      {},
    );
  }
  if (avg > 1.6) {
    return finding(
      'design',
      'p2',
      'light',
      `Type scale too loose (avg ratio ${avg.toFixed(2)})`,
      `Adjacent type sizes step up by an average of ${avg.toFixed(2)}x. The scale will feel jumpy — adjacent sizes look unrelated rather than part of one system.`,
      'Tighten the scale to 1.25-1.5. A common baseline: 14, 16, 20, 24, 32, 48 px (~1.25x steps).',
      {},
    );
  }
  return null;
}

/** Parse a CSS length like `16px` or `1.25rem` to numeric pixels (assumes 16px root). */
function parsePxOrRem(s: string): number | null {
  const trimmed = s.trim();
  const m = /^(-?\d+(?:\.\d+)?)\s*(px|rem|em)?$/i.exec(trimmed);
  if (!m) return null;
  const n = Number(m[1]);
  if (!Number.isFinite(n)) return null;
  const unit = (m[2] ?? 'px').toLowerCase();
  if (unit === 'px') return n;
  return n * 16;
}
