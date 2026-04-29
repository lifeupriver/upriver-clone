// TODO(roadmap): E.6 — once the agent runner ships (E.3), invoke this generator
// from a track that wires its outputs into BaseLayout.astro automatically. For
// now the operator wires JSON-LD blocks by hand using `geo-artifacts.json`.
import type { AuditPackage } from '@upriver/core';

/**
 * Maximum length of a per-page TL;DR snippet, in characters. Keeps snippets
 * within the typical meta-description budget (≤ 320 chars), with margin.
 */
const TLDR_MAX_CHARS = 280;

/**
 * Maximum number of pages listed under "## Pages" in `llms.txt`. Caps the
 * file size; pages are ranked by `wordCount` descending to surface the
 * substantive ones first.
 */
const LLMS_TXT_MAX_PAGES = 12;

/**
 * Bundle of deterministic GEO/AEO artifacts derived from an `AuditPackage`.
 * Pure-data — file IO is performed by callers (the `improve geo` command).
 */
export interface GeoArtifacts {
  /** Plain-text llms.txt body. */
  llmsTxt: string;
  /** Plain-text ai.txt body (a sibling convention; same shape but minimal). */
  aiTxt: string;
  /** JSON-LD object for FAQ schema; empty if no FAQs. */
  faqJsonLd: Record<string, unknown> | null;
  /** JSON-LD object for Organization schema. */
  organizationJsonLd: Record<string, unknown>;
  /** Per-page TL;DR snippets keyed by page slug; non-empty pages only. */
  pageTldrs: Record<string, string>;
}

/**
 * Build all GEO artifacts from an audit package. Pure function — no IO.
 *
 * @param pkg - Validated audit package produced by `upriver synthesize`.
 * @returns Bundle of artifacts ready for callers to persist or render.
 */
export function buildGeoArtifacts(pkg: AuditPackage): GeoArtifacts {
  return {
    llmsTxt: renderLlmsTxt(pkg),
    aiTxt: renderAiTxt(pkg),
    faqJsonLd: buildFaqJsonLd(pkg),
    organizationJsonLd: buildOrganizationJsonLd(pkg),
    pageTldrs: buildPageTldrs(pkg),
  };
}

/**
 * Render the `llms.txt` content per the de-facto spec from llmstxt.org:
 * H1 site name, optional blockquote summary, then bulleted page links.
 *
 * Selects up to {@link LLMS_TXT_MAX_PAGES} pages ranked by `wordCount`
 * descending and excludes any page with `statusCode >= 400`.
 *
 * @param pkg - Audit package to render from.
 * @returns Newline-terminated plain-text body suitable for `public/llms.txt`.
 */
export function renderLlmsTxt(pkg: AuditPackage): string {
  const { meta, siteStructure } = pkg;
  const lines: string[] = [];
  lines.push(`# ${meta.clientName}`);
  lines.push('');
  const summary = pickSummary(pkg);
  if (summary) {
    lines.push(`> ${summary}`);
    lines.push('');
  }
  lines.push(`Site: ${meta.siteUrl}`);
  lines.push('');

  const pages = [...siteStructure.pages]
    .filter((p) => typeof p.statusCode === 'number' && p.statusCode < 400)
    .sort((a, b) => (b.wordCount ?? 0) - (a.wordCount ?? 0))
    .slice(0, LLMS_TXT_MAX_PAGES);

  if (pages.length > 0) {
    lines.push('## Pages');
    lines.push('');
    for (const page of pages) {
      const title = page.title?.trim() || page.slug || page.url;
      const desc = oneLine(page.description ?? '');
      const tail = desc.length > 0 ? `: ${desc}` : '';
      lines.push(`- [${title}](${page.url})${tail}`);
    }
    lines.push('');
  }

  const navLinks = siteStructure.navigation?.primary ?? [];
  if (navLinks.length > 0) {
    lines.push('## Navigation');
    lines.push('');
    for (const link of navLinks) {
      lines.push(`- [${link.label}](${link.href})`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Render `ai.txt` — a minimal sibling to `llms.txt` aimed at AI crawlers.
 * Includes the H1, a one-line description, the canonical homepage link, and
 * a `User-Agent: *` allow directive.
 *
 * @param pkg - Audit package to render from.
 * @returns Newline-terminated plain-text body suitable for `public/ai.txt`.
 */
export function renderAiTxt(pkg: AuditPackage): string {
  const { meta } = pkg;
  const summary = pickSummary(pkg);
  const lines: string[] = [];
  lines.push(`# ${meta.clientName}`);
  if (summary) lines.push(summary);
  lines.push(meta.siteUrl);
  lines.push('');
  lines.push('User-Agent: *');
  lines.push('Allow: /');
  lines.push('');
  return lines.join('\n');
}

/**
 * Build FAQ JSON-LD from `contentInventory.faqs`. Returns null if the audit
 * package has no FAQ entries.
 *
 * @param pkg - Audit package to read FAQs from.
 * @returns A `FAQPage` schema object, or null when no FAQs exist.
 */
export function buildFaqJsonLd(pkg: AuditPackage): Record<string, unknown> | null {
  const faqs = pkg.contentInventory?.faqs ?? [];
  const valid = faqs.filter((f) => f && f.question && f.answer);
  if (valid.length === 0) return null;

  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: valid.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}

/**
 * Build Organization JSON-LD with `name`, `url`, and `sameAs` social links.
 *
 * @param pkg - Audit package to read meta + social links from.
 * @returns A `schema.org/Organization` object.
 */
export function buildOrganizationJsonLd(pkg: AuditPackage): Record<string, unknown> {
  const { meta, contentInventory } = pkg;
  const sameAs = (contentInventory?.socialLinks ?? [])
    .map((s) => s?.url)
    .filter((u): u is string => typeof u === 'string' && u.length > 0);

  const org: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: meta.clientName,
    url: meta.siteUrl,
  };
  if (sameAs.length > 0) {
    org['sameAs'] = sameAs;
  }
  return org;
}

/**
 * Generate one TL;DR per page with content. Heuristic: take `description`
 * (or the first H1 heading text as fallback), keep the first two sentences,
 * and cap at {@link TLDR_MAX_CHARS} characters with an ellipsis.
 *
 * Pages with `wordCount === 0` are skipped — they have no content to
 * summarise and would produce noisy snippets.
 *
 * @param pkg - Audit package to read pages from.
 * @returns Map of page slug to TL;DR snippet.
 */
export function buildPageTldrs(pkg: AuditPackage): Record<string, string> {
  const out: Record<string, string> = {};
  const pages = pkg.siteStructure?.pages ?? [];
  for (const page of pages) {
    if (!page || page.wordCount === 0) continue;
    const seed = (page.description ?? '').trim().length > 0
      ? page.description
      : firstHeadingText(page.headings);
    const snippet = summarize(seed ?? '');
    if (snippet.length === 0) continue;
    out[page.slug] = snippet;
  }
  return out;
}

/**
 * Pick the best-available short summary for the site. Prefers the homepage
 * page's `description`; falls back to the audience descriptor in the brand
 * voice draft.
 */
function pickSummary(pkg: AuditPackage): string {
  const home = (pkg.siteStructure?.pages ?? []).find(
    (p) => p.slug === '' || p.slug === '/' || p.slug === 'home' || p.slug === 'index',
  );
  const candidates: Array<unknown> = [
    home?.description,
    pkg.brandVoiceDraft?.audienceDescription,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim().length > 0) {
      return oneLine(c);
    }
  }
  return '';
}

/**
 * Collapse internal whitespace and strip newlines so a string fits on one
 * line of `llms.txt` output.
 */
function oneLine(s: string): string {
  return s.replace(/\s+/g, ' ').trim();
}

/**
 * Pick the text of the first H1 heading on a page, or '' if none exists.
 */
function firstHeadingText(headings: Array<{ level: number; text: string }> | undefined): string {
  if (!headings) return '';
  const h1 = headings.find((h) => h.level === 1 && h.text);
  return h1 ? h1.text.trim() : '';
}

/**
 * Trim a free-form description to the first two sentences and cap at
 * {@link TLDR_MAX_CHARS} characters with an ellipsis when over budget.
 */
function summarize(raw: string): string {
  const cleaned = oneLine(raw);
  if (cleaned.length === 0) return '';
  // Split on sentence terminators followed by whitespace; keep terminator.
  const matches = cleaned.match(/[^.!?]+[.!?]?(?:\s|$)/g) ?? [cleaned];
  const first = matches.slice(0, 2).join(' ').trim();
  if (first.length <= TLDR_MAX_CHARS) return first;
  // Truncate to last whole word within budget − 1 to leave room for the ellipsis.
  const cut = first.slice(0, TLDR_MAX_CHARS - 1);
  const lastSpace = cut.lastIndexOf(' ');
  const trimmed = lastSpace > 40 ? cut.slice(0, lastSpace) : cut;
  return `${trimmed.replace(/[\s.!?,;:]+$/, '')}…`;
}
