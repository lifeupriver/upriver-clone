import type { SitePage } from '@upriver/core';

export interface ClassifyInput {
  pages: SitePage[];
  navHrefs: string[];
  siteUrl: string;
  include?: string[];
  exclude?: string[];
  max?: number;
}

export type SkipReason =
  | 'editor-chrome'
  | 'blog-detail'
  | 'product-detail'
  | 'tag-archive'
  | 'pagination'
  | 'utility'
  | 'error-page'
  | 'thin-stub'
  | 'duplicate'
  | 'over-cap'
  | 'forced-exclude';

export interface SkippedPage {
  page: SitePage;
  reason: SkipReason;
  detail?: string;
}

export type MajorReason = 'homepage' | 'nav' | 'hub' | 'meaningful-content' | 'forced-include';

export interface MajorPage {
  page: SitePage;
  reason: MajorReason;
}

export interface ClassifyResult {
  major: MajorPage[];
  skipped: SkippedPage[];
}

const ALWAYS_SKIP_PREFIXES = [
  '/s/',
  '/cart',
  '/checkout',
  '/login',
  '/log-in',
  '/signin',
  '/sign-in',
  '/signup',
  '/sign-up',
  '/register',
  '/logout',
  '/log-out',
  '/signout',
  '/sign-out',
  '/account',
  '/profile',
  '/settings',
  '/forgot-password',
  '/reset-password',
  '/admin/',
  '/api/',
];

const ALWAYS_SKIP_EXACT = new Set([
  '/cart',
  '/checkout',
  '/order',
  '/orders',
  '/login',
  '/sitemap',
  '/sitemap.xml',
  '/sitemap-xml',
  '/robots.txt',
  '/feed',
  '/rss',
  '/atom.xml',
  '/search',
  '/support',
  '/404',
  '/403',
  '/500',
]);

const BLOG_PATTERNS = [
  /^\/blog\/[^/]+$/i,
  /^\/posts?\/[^/]+$/i,
  /^\/news\/[^/]+$/i,
  /^\/articles?\/[^/]+$/i,
  /^\/stories?\/[^/]+/i,
  /^\/(19|20)\d{2}\/\d{1,2}\//,
];

const PRODUCT_PATTERNS = [
  /^\/product\//i,
  /^\/products\/[^/]+\//i,
  /^\/shop\/[^/]+\//i,
  /^\/store\/[^/]+/i,
  /^\/item\/[^/]+/i,
  /^\/p\/[^/]+/i,
];

const TAG_PATTERNS = [
  /^\/tags?\//i,
  /^\/categor(y|ies)\//i,
  /^\/topics?\//i,
  /^\/authors?\//i,
];

const PAGINATION_PATTERNS = [/^\/page\/\d+/i, /[?&]page=\d+/i];

const HUB_PATTERNS = [
  /^\/about(\b|\/|-)/i,
  /^\/contact/i,
  /^\/services?(\b|\/|-)/i,
  /^\/team(\b|\/|-)/i,
  /^\/menu(\b|\/|-)/i,
  /^\/faqs?(\b|\/|-|\d)/i,
  /^\/pricing/i,
  /^\/admissions?/i,
  /^\/programs?(\b|\/|-)/i,
  /^\/locations?(\b|\/|-)/i,
  /^\/hours/i,
  /^\/visit/i,
  /^\/careers/i,
  /^\/work(\b|\/|-)/i,
  /^\/portfolio/i,
];

/**
 * Classify each page in the audit-package as a major page (worth cloning +
 * screenshotting for Claude Design) or skipped (blog detail, product detail,
 * editor chrome, etc).
 */
export function classify(input: ClassifyInput): ClassifyResult {
  const { pages, navHrefs, siteUrl, include = [], exclude = [], max = 25 } = input;

  const navPaths = new Set(
    navHrefs
      .map((h) => normalizeHref(h, siteUrl))
      .filter((p): p is string => p !== null),
  );
  const includeSet = new Set(include.map((p) => normalizePath(p)));
  const excludeSet = new Set(exclude.map((p) => normalizePath(p)));

  const major: MajorPage[] = [];
  const skipped: SkippedPage[] = [];
  const seenPaths = new Set<string>();

  for (const page of pages) {
    if (page.statusCode >= 400) {
      skipped.push({ page, reason: 'error-page', detail: `status ${page.statusCode}` });
      continue;
    }

    const path = canonicalPath(page);

    if (excludeSet.has(path)) {
      skipped.push({ page, reason: 'forced-exclude' });
      continue;
    }

    if (includeSet.has(path)) {
      if (!seenPaths.has(path)) {
        major.push({ page, reason: 'forced-include' });
        seenPaths.add(path);
      }
      continue;
    }

    const skipReason = detectSkipReason(path);
    if (skipReason) {
      skipped.push({ page, reason: skipReason });
      continue;
    }

    if (seenPaths.has(path)) {
      skipped.push({ page, reason: 'duplicate' });
      continue;
    }

    const majorReason = detectMajorReason(path, page, navPaths);
    if (majorReason) {
      major.push({ page, reason: majorReason });
      seenPaths.add(path);
      continue;
    }

    skipped.push({ page, reason: 'thin-stub', detail: `${page.headings?.length ?? 0} headings` });
  }

  const priority: Record<MajorReason, number> = {
    'forced-include': 0,
    homepage: 1,
    nav: 2,
    hub: 3,
    'meaningful-content': 4,
  };
  major.sort((a, b) => priority[a.reason] - priority[b.reason]);

  if (major.length > max) {
    const overflow = major.splice(max);
    for (const m of overflow) {
      skipped.push({ page: m.page, reason: 'over-cap' });
    }
  }

  return { major, skipped };
}

function detectSkipReason(path: string): SkipReason | null {
  if (ALWAYS_SKIP_EXACT.has(path)) return 'editor-chrome';
  if (ALWAYS_SKIP_PREFIXES.some((p) => path.startsWith(p))) return 'editor-chrome';
  if (PRODUCT_PATTERNS.some((re) => re.test(path))) return 'product-detail';
  if (BLOG_PATTERNS.some((re) => re.test(path))) return 'blog-detail';
  if (TAG_PATTERNS.some((re) => re.test(path))) return 'tag-archive';
  if (PAGINATION_PATTERNS.some((re) => re.test(path))) return 'pagination';
  if (/-(nav|sitemap|footer)$/.test(path)) return 'editor-chrome';
  return null;
}

function detectMajorReason(
  path: string,
  page: SitePage,
  navPaths: Set<string>,
): MajorReason | null {
  if (path === '/' || path === '') return 'homepage';
  if (navPaths.has(path)) return 'nav';
  if (HUB_PATTERNS.some((re) => re.test(path))) return 'hub';
  const headingCount = page.headings?.length ?? 0;
  const hasH1 = (page.headings ?? []).some((h) => h.level === 1);
  if (headingCount >= 2 && hasH1) return 'meaningful-content';
  return null;
}

export function canonicalPath(page: SitePage): string {
  try {
    const urlPath = new URL(page.url).pathname || '/';
    if (urlPath === '/' || urlPath === '') return '/';
    return urlPath.toLowerCase().replace(/\/+$/, '') || '/';
  } catch {
    /* fall through */
  }
  const slugLower = (page.slug || '').toLowerCase().replace(/^\/+|\/+$/g, '');
  if (slugLower === 'home' || slugLower === 'index' || slugLower === '') return '/';
  return `/${slugLower}`;
}

function normalizePath(p: string): string {
  if (!p) return '/';
  if (/^https?:/i.test(p)) {
    try {
      return new URL(p).pathname.toLowerCase().replace(/\/+$/, '') || '/';
    } catch {
      return '/';
    }
  }
  const lower = p.toLowerCase();
  if (lower === 'home' || lower === 'index') return '/';
  const stripped = lower.replace(/\/+$/, '');
  return stripped.startsWith('/') ? stripped || '/' : `/${stripped}`;
}

function normalizeHref(href: string, siteUrl: string): string | null {
  if (!href) return null;
  const trimmed = href.trim();
  if (!trimmed) return null;
  if (/^(mailto:|tel:|javascript:|#)/i.test(trimmed)) return null;
  try {
    const base = new URL(siteUrl);
    const url = new URL(trimmed, base);
    if (url.hostname.replace(/^www\./, '') !== base.hostname.replace(/^www\./, '')) {
      return null;
    }
    return normalizePath(url.pathname);
  } catch {
    return normalizePath(trimmed);
  }
}

/**
 * Extract every href that appears inside a <header> or <nav> element in the
 * homepage rawhtml. Best-effort regex parse — good enough for nav discovery
 * across Squarespace, Wix, custom sites.
 */
export function extractNavHrefs(html: string): string[] {
  const hrefs = new Set<string>();
  const blocks: string[] = [];
  const tagRe = /<(header|nav)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(html))) blocks.push(m[2] ?? '');
  const haystack = blocks.length > 0 ? blocks.join('\n') : html;
  const hrefRe = /<a\b[^>]*\bhref=["']([^"'#][^"']*)["']/gi;
  while ((m = hrefRe.exec(haystack))) {
    const v = m[1];
    if (v) hrefs.add(v);
  }
  return Array.from(hrefs);
}
