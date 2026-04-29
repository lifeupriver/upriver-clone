import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { DeepPassSpec } from '../../runner.js';

/**
 * One competitor record loaded from `<clientDir>/competitors/<name>.json`.
 * Shape mirrors `packages/audit-passes/src/competitors/index.ts:CompetitorData`
 * with a few extra fields the deep pass uses if present.
 */
interface CompetitorRecord {
  url: string;
  name?: string;
  pageCount?: number;
  hasGallery?: boolean;
  hasPricing?: boolean;
  hasVirtualTour?: boolean;
  testimonialCount?: number;
  faqCount?: number;
  topPages?: Array<{ url: string; title?: string; wordCount?: number }>;
}

/**
 * Loaded context for the competitor-deep pass. The client side is a
 * compressed summary of their own audit (overall score, top finding ids per
 * dimension), so the agent has shared vocabulary when describing gaps.
 */
export interface CompetitorDeepCtx {
  clientName: string;
  siteUrl: string;
  clientSummary: {
    overallScore: number;
    pageCount: number;
    hasPricing: boolean;
    hasGallery: boolean;
    testimonialCount: number;
    faqCount: number;
    topFindingIds: string[];
  };
  competitors: CompetitorRecord[];
}

/**
 * C.5 — competitor-deep pass. Compares the client against scraped competitor
 * records on positioning, content depth, and pricing transparency. Returns
 * findings under `dimension: 'competitors'` so they merge with the base
 * competitors pass output.
 */
export const competitorDeepPass: DeepPassSpec<CompetitorDeepCtx> = {
  id: 'competitor-deep',
  dimension: 'competitors',
  loadContext: (slug, clientDir) => loadContext(slug, clientDir),
  buildPrompt: (ctx) => buildPrompt(ctx),
};

function loadContext(slug: string, clientDir: string): CompetitorDeepCtx {
  void slug;
  let clientName = '';
  let siteUrl = '';
  let overallScore = 0;
  const topFindingIds: string[] = [];

  const pkgPath = join(clientDir, 'audit-package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
        meta?: { clientName?: string; siteUrl?: string; overallScore?: number };
        findings?: Array<{ id: string; priority: string; dimension: string }>;
      };
      clientName = pkg.meta?.clientName ?? '';
      siteUrl = pkg.meta?.siteUrl ?? '';
      overallScore = pkg.meta?.overallScore ?? 0;
      const sorted = (pkg.findings ?? [])
        .filter((f) => f.priority === 'p0' || f.priority === 'p1')
        .slice(0, 12)
        .map((f) => f.id);
      topFindingIds.push(...sorted);
    } catch {
      // skip
    }
  }

  // Roll up the same surface from the client's own pages so the agent can
  // compare apples-to-apples with the per-competitor record shape.
  const pagesDir = join(clientDir, 'pages');
  let pageCount = 0;
  let hasPricing = false;
  let hasGallery = false;
  let testimonialCount = 0;
  let faqCount = 0;
  if (existsSync(pagesDir)) {
    for (const file of readdirSync(pagesDir)) {
      if (!file.endsWith('.json')) continue;
      try {
        const parsed = JSON.parse(readFileSync(join(pagesDir, file), 'utf8')) as {
          metadata?: { statusCode?: number };
          extracted?: {
            pricing?: unknown[];
            testimonials?: unknown[];
            faqs?: unknown[];
          };
          images?: string[];
        };
        if (parsed.metadata?.statusCode && parsed.metadata.statusCode >= 400) continue;
        pageCount += 1;
        if ((parsed.extracted?.pricing?.length ?? 0) > 0) hasPricing = true;
        if ((parsed.images?.length ?? 0) >= 6) hasGallery = true;
        testimonialCount += parsed.extracted?.testimonials?.length ?? 0;
        faqCount += parsed.extracted?.faqs?.length ?? 0;
      } catch {
        // skip
      }
    }
  }

  const competitors: CompetitorRecord[] = [];
  const competitorsDir = join(clientDir, 'competitors');
  if (existsSync(competitorsDir)) {
    for (const file of readdirSync(competitorsDir)) {
      if (!file.endsWith('.json')) continue;
      try {
        const parsed = JSON.parse(readFileSync(join(competitorsDir, file), 'utf8')) as CompetitorRecord;
        if (typeof parsed.url === 'string' && parsed.url.length > 0) {
          competitors.push({ ...parsed, name: parsed.name ?? deriveName(parsed.url) });
        }
      } catch {
        // skip
      }
    }
  }

  return {
    clientName,
    siteUrl,
    clientSummary: {
      overallScore,
      pageCount,
      hasPricing,
      hasGallery,
      testimonialCount,
      faqCount,
      topFindingIds,
    },
    competitors,
  };
}

function deriveName(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
}

export function buildPrompt(ctx: CompetitorDeepCtx): string {
  const c = ctx.clientSummary;
  const clientLine = `**${ctx.clientName || 'Client'}** (${ctx.siteUrl || 'unknown URL'}): score ${c.overallScore}/100, ${c.pageCount} pages, ${c.hasPricing ? 'pricing visible' : 'no pricing'}, ${c.hasGallery ? 'gallery' : 'no gallery'}, ${c.testimonialCount} testimonials, ${c.faqCount} FAQs.`;

  const competitorBlock =
    ctx.competitors.length === 0
      ? '_(no competitor data on disk — run `upriver discover <slug>` and populate clients/<slug>/competitors/ first)_'
      : ctx.competitors
          .slice(0, 6)
          .map((cp) => {
            const top = (cp.topPages ?? [])
              .slice(0, 5)
              .map((p) => `    - ${p.url}${p.title ? ` — "${p.title}"` : ''}${p.wordCount ? ` (${p.wordCount.toLocaleString()} words)` : ''}`)
              .join('\n');
            return `### ${cp.name ?? cp.url}\n  ${cp.pageCount ?? '?'} pages, ${cp.hasPricing ? 'pricing visible' : 'no pricing'}, ${cp.hasGallery ? 'gallery' : 'no gallery'}, ${cp.testimonialCount ?? 0} testimonials, ${cp.faqCount ?? 0} FAQs.${top ? `\n  Top pages:\n${top}` : ''}`;
          })
          .join('\n\n');

  const findingsLine =
    c.topFindingIds.length > 0
      ? `Top open client findings: ${c.topFindingIds.map((id) => `\`${id}\``).join(', ')}.`
      : 'No client findings to anchor on yet.';

  return `You are conducting a competitor-deep audit. Your job is to identify where the client is losing on positioning, content depth, or pricing transparency relative to the competitors below.

## Client

${clientLine}

${findingsLine}

## Competitors

${competitorBlock}

## What to evaluate

  1. **Positioning.** Whose category language and value prop will buyers find more credible? Is the client positioned higher-end / lower-end / undifferentiated?
  2. **Content depth.** Where do competitors have content the client doesn't (FAQs, galleries, virtual tours, blog posts, location pages)? Where does the client lead?
  3. **Pricing transparency.** Do competitors publish pricing the client hides, or vice versa? What's the buyer's expectation in this market?
  4. **Trust signals.** Testimonials, certifications, named clients, press, awards. Strength asymmetries either direction.

## Output format (mandatory)

Respond with a single JSON object inside a fenced \`\`\`json code block. Schema:

\`\`\`json
{
  "summary": "one-sentence assessment of the client's competitive position",
  "findings": [
    {
      "id": "competitors-deep-001",
      "title": "Short imperative title",
      "description": "What the gap is, with which competitor",
      "priority": "p0 | p1 | p2",
      "effort": "light | medium | heavy",
      "recommendation": "Concrete next step (a page to add, a price band to publish, a testimonial to source)",
      "why_it_matters": "Why this gap loses deals in 1-2 sentences",
      "evidence": "Optional: competitor URL or specific feature"
    }
  ]
}
\`\`\`

Guidelines:
- Aim for 3-7 findings. The competitor surface is naturally narrow.
- p0 only when the client is materially worse on a high-stakes signal (no pricing while every competitor has it, no testimonials in a trust-heavy category, etc.).
- Recommendations must be concrete: name the missing page, the price band to publish, the testimonial to source.
- Acknowledge wins where the client genuinely leads — those are findings too (priority p2, dimension competitors), framed as "lean into X" rather than "fix Y".
- Do NOT include any prose outside the fenced JSON block.
`;
}
