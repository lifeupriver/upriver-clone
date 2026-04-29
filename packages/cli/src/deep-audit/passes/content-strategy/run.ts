import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { DeepPassSpec } from '../../runner.js';

/**
 * Loaded context for the content-strategy deep pass. Kept slim — only the
 * fields the prompt actually references — so prompt drift is reviewable.
 */
export interface ContentStrategyCtx {
  clientName: string;
  siteUrl: string;
  pages: Array<{ url: string; title: string; wordCount: number; headings: string[] }>;
  intakePageWants: Record<string, string>;
  brandVoiceMd: string | null;
}

/**
 * C.3 — content-strategy deep pass. Asks the agent to identify pillar pages,
 * content gaps, and cluster opportunities given the scraped site content,
 * intake "page wants", and brand voice. Findings carry `dimension: content`
 * so they merge into the same plan the existing content base pass produces.
 */
export const contentStrategyPass: DeepPassSpec<ContentStrategyCtx> = {
  id: 'content-strategy',
  dimension: 'content',
  loadContext: (slug, clientDir) => loadContext(slug, clientDir),
  buildPrompt: (ctx) => buildPrompt(ctx),
};

/**
 * Read scraped pages, intake, and brand voice into a `ContentStrategyCtx`.
 * Tolerant — missing files degrade silently rather than throwing so a partial
 * client dir still produces a usable (if narrower) prompt.
 */
function loadContext(slug: string, clientDir: string): ContentStrategyCtx {
  void slug;
  const pagesDir = join(clientDir, 'pages');
  const pages: ContentStrategyCtx['pages'] = [];
  if (existsSync(pagesDir)) {
    for (const file of readdirSync(pagesDir)) {
      if (!file.endsWith('.json')) continue;
      try {
        const raw = readFileSync(join(pagesDir, file), 'utf8');
        const parsed = JSON.parse(raw) as {
          url?: string;
          metadata?: { title?: string; statusCode?: number };
          content?: { wordCount?: number; headings?: Array<{ level: number; text: string }> };
        };
        if (!parsed.url) continue;
        if (parsed.metadata?.statusCode && parsed.metadata.statusCode >= 400) continue;
        pages.push({
          url: parsed.url,
          title: parsed.metadata?.title ?? '',
          wordCount: parsed.content?.wordCount ?? 0,
          headings: (parsed.content?.headings ?? []).map((h) => `h${h.level}: ${h.text}`),
        });
      } catch {
        // skip
      }
    }
  }

  const intakePath = join(clientDir, 'intake.json');
  let intakePageWants: Record<string, string> = {};
  if (existsSync(intakePath)) {
    try {
      const parsed = JSON.parse(readFileSync(intakePath, 'utf8')) as { pageWants?: Record<string, string> };
      intakePageWants = parsed.pageWants ?? {};
    } catch {
      // skip
    }
  }

  const brandPath = join(clientDir, 'docs', 'brand-voice-guide.md');
  const brandVoiceMd = existsSync(brandPath) ? safeRead(brandPath) : null;

  // Pull client name from audit-package if present.
  let clientName = '';
  let siteUrl = '';
  const pkgPath = join(clientDir, 'audit-package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as {
        meta?: { clientName?: string; siteUrl?: string };
      };
      clientName = pkg.meta?.clientName ?? '';
      siteUrl = pkg.meta?.siteUrl ?? '';
    } catch {
      // skip
    }
  }

  return { clientName, siteUrl, pages, intakePageWants, brandVoiceMd };
}

function safeRead(path: string): string | null {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

/**
 * Build the agent prompt. The shape of the expected JSON response is shown
 * inline so the agent has the exact contract; the caller's runner.ts parses
 * that exact shape.
 */
export function buildPrompt(ctx: ContentStrategyCtx): string {
  const pageList =
    ctx.pages.length === 0
      ? '_(no scraped pages — provide cluster-ideation guidance based only on the URL and brand context)_'
      : ctx.pages
          .slice(0, 30)
          .map(
            (p) =>
              `- ${p.url} — "${p.title}" (${p.wordCount.toLocaleString()} words)\n${p.headings.slice(0, 8).map((h) => `    ${h}`).join('\n')}`,
          )
          .join('\n');

  const wantsList = Object.entries(ctx.intakePageWants)
    .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
    .map(([slug, v]) => `- **${slug}**: ${v.trim().split(/\r?\n/).join(' ')}`)
    .join('\n');

  const brandBlock = ctx.brandVoiceMd
    ? `## Brand voice\n\n${ctx.brandVoiceMd.trim()}\n`
    : '';

  return `You are conducting a content-strategy audit for ${ctx.clientName || 'the client'} (${ctx.siteUrl || 'unknown URL'}).

Identify:
  1. Pillar pages they have but underutilize (long content with no cluster spokes).
  2. Pillar pages they should have but don't (topic gaps for their vertical).
  3. Cluster expansion opportunities (1 pillar -> N spoke articles).
  4. Content the intake says the client wants that the site doesn't yet provide.

## Pages on the site (top 30)

${pageList}

${wantsList ? `## Client priorities from intake\n\n${wantsList}\n\n` : ''}${brandBlock}## Output format (mandatory)

Respond with a single JSON object inside a fenced \`\`\`json code block. Schema:

\`\`\`json
{
  "summary": "one-sentence summary of content-strategy state",
  "findings": [
    {
      "id": "content-deep-001",
      "title": "Short imperative title",
      "description": "What's wrong / what's missing",
      "priority": "p0 | p1 | p2",
      "effort": "light | medium | heavy",
      "recommendation": "Concrete next step",
      "why_it_matters": "Why this matters in 1-2 sentences",
      "evidence": "Optional: page URL or snippet supporting the finding",
      "affected_pages": ["optional", "list", "of", "page", "slugs"]
    }
  ]
}
\`\`\`

Guidelines:
- Aim for 4-8 findings, not 20.
- Prioritize commercial impact: revenue-relevant pages > nice-to-have content.
- Use p0 only for active blockers; most strategic gaps are p1 or p2.
- Recommendation must be specific (a page to write, a topic cluster, a CTA to add) — not "improve content".
- If the site is solid and the gaps are minor, return fewer findings rather than padding.
- Do NOT include any prose outside the fenced JSON block.
`;
}
