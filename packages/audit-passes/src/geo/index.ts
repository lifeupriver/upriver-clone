// Methodology: .agents/skills/geo/SKILL.md (when present)
// Focus: Generative Engine Optimization — answer-readiness for AI search
// crawlers. Distinct from `aeo` (which scores Q&A coverage / featured-snippet
// eligibility). GEO is about giving AI systems machine-friendly summaries,
// canonical facts, and entity disambiguation cues so a model can quote the
// site directly without hallucinating.
import { existsSync } from 'node:fs';
import { join } from 'node:path';

import type { AuditPassResult } from '@upriver/core';

import { finding, scoreFromFindings } from '../shared/finding-builder.js';
import { loadPages, type PageData } from '../shared/loader.js';
import { getVerticalPack, type PassOptions } from '../shared/vertical-pack.js';

/**
 * Headings that indicate the page provides an AI-friendly TL;DR / summary
 * block. Matched case-insensitively against heading text.
 */
const TLDR_HEADING_PATTERN =
  /\b(tl;?dr|summary|in\s+short|at\s+a\s+glance|key\s+takeaways|key\s+facts|fast\s+facts|quick\s+facts)\b/i;

/**
 * Approximate detectors for the canonical-fact entries an LLM most often needs
 * when answering a question about a local business. Each is a regex over the
 * combined markdown of all pages.
 */
const FACTOID_PATTERNS: Array<{ key: string; label: string; pattern: RegExp }> = [
  {
    key: 'year-founded',
    label: 'Year founded / established',
    pattern: /\b(founded|established|since|opened|opened\s+(?:our\s+)?doors)\s+(?:in\s+)?(?:19|20)\d{2}\b/i,
  },
  {
    key: 'service-area',
    label: 'Service area / location qualifier',
    pattern:
      /\b(serv(?:e|es|ing)|located\s+in|based\s+in|nestled\s+in|in\s+the\s+heart\s+of)\s+[A-Z][\w\s,'-]+/,
  },
  {
    key: 'prices',
    label: 'Concrete pricing or starting-from numbers',
    // either explicit pricing entries or "$1,234" / "starts at $..." in body copy
    pattern: /\$\s?\d[\d,]*(?:\.\d{2})?|\bstarting\s+at\b|\bfrom\s+\$\d/i,
  },
];

/**
 * Run the GEO base pass.
 *
 * @param slug - Client slug (unused today; kept for parity with other passes).
 * @param clientDir - Absolute path to the client directory (`clients/<slug>`).
 * @returns The pass result with findings, score, and a one-line summary.
 */
export async function run(
  slug: string,
  clientDir: string,
  opts: PassOptions = {},
): Promise<AuditPassResult> {
  void slug;
  const pages = loadPages(clientDir);
  const findings = [];

  // ── TL;DR / summary coverage ──────────────────────────────────────────────
  const pagesWithSummary = pages.filter(hasSummaryHeading);
  const tldrRatio = pages.length === 0 ? 0 : pagesWithSummary.length / pages.length;
  if (pages.length >= 3 && tldrRatio < 0.25) {
    findings.push(
      finding(
        'geo',
        'p0',
        'medium',
        'No TL;DR / summary blocks for AI extraction',
        `${pagesWithSummary.length} of ${pages.length} pages include a "TL;DR", "Summary", or "Key takeaways" heading. AI search crawlers preferentially quote concise summary blocks; without them they fall back to fragmentary copy.`,
        'Add a 2–4 sentence TL;DR or "At a glance" block near the top of each pillar page. Use a heading the crawler can latch onto (`## Summary`, `## At a glance`, or `## Key facts`).',
        {
          why:
            'ChatGPT and Perplexity preferentially surface a single dense paragraph when answering "what is X". Pages without one get summarized via heuristics that often miss the value prop.',
        },
      ),
    );
  } else if (pages.length >= 3 && tldrRatio < 0.6) {
    findings.push(
      finding(
        'geo',
        'p1',
        'light',
        'TL;DR coverage uneven across pages',
        `${pagesWithSummary.length} of ${pages.length} pages have a summary block. Filling the gap on the remaining pages is a fast win for AI citation coverage.`,
        'Add a "Summary" or "Key takeaways" heading + 2–4 sentence block to each pillar page that doesn\'t already have one.',
        {},
      ),
    );
  }

  // ── llms.txt presence ─────────────────────────────────────────────────────
  const cloneRepoDir = opts.cloneRepoDir ?? join(clientDir, 'repo');
  const llmsTxtPath = join(cloneRepoDir, 'public', 'llms.txt');
  if (!existsSync(llmsTxtPath)) {
    findings.push(
      finding(
        'geo',
        'p1',
        'light',
        'No `public/llms.txt` published',
        '`llms.txt` is the emerging convention (analogous to `robots.txt`) for telling AI crawlers which URLs and summaries to ingest first. The site does not publish one.',
        'Generate `public/llms.txt` listing the canonical pages, business description, and key facts. The `upriver improve <slug> --track ai-search` track produces a deterministic version.',
        { evidence: `expected at ${llmsTxtPath}` },
      ),
    );
  }

  // ── Structured factoids ───────────────────────────────────────────────────
  const allMarkdown = pages.map((p) => p.content.markdown).join('\n');
  const hasPricingExtracted = pages.some((p) => p.extracted.pricing.length > 0);
  const missingFactoids = FACTOID_PATTERNS.filter((f) => {
    if (f.key === 'prices' && hasPricingExtracted) return false;
    return !f.pattern.test(allMarkdown);
  });
  if (missingFactoids.length >= 2) {
    findings.push(
      finding(
        'geo',
        'p0',
        'medium',
        `${missingFactoids.length} canonical facts missing for AI extraction`,
        `An AI assistant answering "tell me about ${pages[0]?.metadata.title ?? 'this business'}" cannot find: ${missingFactoids.map((f) => f.label).join('; ')}.`,
        'Surface each missing fact in copy and structured markup (Organization JSON-LD `foundingDate`, `areaServed`, `priceRange`). Inline the same numbers in the visible TL;DR so crawlers do not have to dereference structured data.',
        {
          why:
            'Without canonical facts in plain text, AI answers either omit the business or substitute hallucinated values. Both outcomes erode trust signals.',
        },
      ),
    );
  } else if (missingFactoids.length === 1) {
    const m = missingFactoids[0];
    if (m) {
      findings.push(
        finding(
          'geo',
          'p1',
          'light',
          `Canonical fact missing: ${m.label}`,
          `${m.label} could not be detected anywhere on the site.`,
          `Add ${m.label.toLowerCase()} to the visible copy and the Organization JSON-LD block.`,
          {},
        ),
      );
    }
  }

  // ── Entity disambiguation ─────────────────────────────────────────────────
  const businessName = inferBusinessName(pages);
  const locationCue = detectLocationCue(pages);
  if (businessName && !locationCue) {
    findings.push(
      finding(
        'geo',
        'p1',
        'light',
        'Business name not disambiguated by location',
        `"${businessName}" appears across the site but no nearby copy ties it to a city, region, or address. AI crawlers can confuse it with similarly-named businesses elsewhere.`,
        getVerticalPack(opts.vertical).entityDisambiguationExample,
        {
          why:
            'When ChatGPT and Google\'s AI Overview see an ambiguous brand name, they often cite the wrong entity or refuse to answer. Location anchoring is the cheapest disambiguator.',
        },
      ),
    );
  }

  const score = scoreFromFindings(findings);
  const factoidCovered = FACTOID_PATTERNS.length - missingFactoids.length;
  const summary =
    `GEO readiness: ${pagesWithSummary.length}/${pages.length} pages have TL;DR, ` +
    `${factoidCovered}/${FACTOID_PATTERNS.length} canonical facts present, ` +
    `llms.txt ${existsSync(llmsTxtPath) ? 'present' : 'missing'}.`;

  return {
    dimension: 'geo',
    score,
    summary,
    findings,
    completed_at: new Date().toISOString(),
  };
}

/** Does this page have at least one heading text matching `TLDR_HEADING_PATTERN`? */
function hasSummaryHeading(p: PageData): boolean {
  return p.content.headings.some((h) => TLDR_HEADING_PATTERN.test(h.text));
}

/**
 * Best-effort guess at the business name from the homepage metadata. Strips a
 * trailing " | suffix" or " - suffix" since most title tags use the
 * "Brand | Tagline" pattern.
 */
function inferBusinessName(pages: PageData[]): string | null {
  const home = pages.find((p) => /\/?$/.test(new URL(p.url).pathname.replace(/\/$/, '')) && new URL(p.url).pathname.replace(/\/$/, '') === '');
  const candidate = (home ?? pages[0])?.metadata.title;
  if (!candidate) return null;
  const cleaned = candidate.split(/\s+[|\-–—]\s+/)[0]?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : null;
}

/**
 * Detect a city/state/region cue anywhere in the body copy or metadata.
 * Conservative: only counts capitalized two-word place names or `, XX` state
 * codes.
 */
function detectLocationCue(pages: PageData[]): boolean {
  const haystack = pages
    .map((p) => `${p.metadata.title ?? ''}\n${p.metadata.description ?? ''}\n${p.content.markdown}`)
    .join('\n');
  if (/,\s*[A-Z]{2}\b/.test(haystack)) return true;
  if (/\bin\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\s*,\s*[A-Z][a-z]+/.test(haystack)) return true;
  for (const p of pages) {
    if (p.extracted.contact.address && p.extracted.contact.address.length > 0) return true;
  }
  return false;
}
