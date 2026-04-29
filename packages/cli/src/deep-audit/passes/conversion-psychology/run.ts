import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { DeepPassSpec } from '../../runner.js';

/**
 * Loaded context for the conversion-psychology deep pass. Surfaces only the
 * conversion-relevant signals — CTAs, social proof, contact info, and the
 * first 600 chars of each page (proxy for first-fold copy) — so the prompt
 * stays focused on what an LLM can actually reason about.
 */
export interface ConversionPsychologyCtx {
  clientName: string;
  siteUrl: string;
  pages: Array<{
    url: string;
    title: string;
    firstFold: string;
    ctas: Array<{ text: string; href: string; type?: string }>;
    testimonials: number;
    eventSpaces: number;
    pricing: number;
    contact: { phone?: string; email?: string; address?: string };
  }>;
  intakePageWants: Record<string, string>;
  brandVoiceMd: string | null;
}

/**
 * C.4 — conversion-psychology deep pass. Asks the agent to evaluate value-
 * proposition clarity, friction points, social-proof strength, and CTA
 * quality across the site. Findings carry `dimension: 'sales'` so they merge
 * into the same plan the existing sales base pass produces.
 */
export const conversionPsychologyPass: DeepPassSpec<ConversionPsychologyCtx> = {
  id: 'conversion-psychology',
  dimension: 'sales',
  loadContext: (slug, clientDir) => loadContext(slug, clientDir),
  buildPrompt: (ctx) => buildPrompt(ctx),
};

function loadContext(slug: string, clientDir: string): ConversionPsychologyCtx {
  void slug;
  const pagesDir = join(clientDir, 'pages');
  const pages: ConversionPsychologyCtx['pages'] = [];
  if (existsSync(pagesDir)) {
    for (const file of readdirSync(pagesDir)) {
      if (!file.endsWith('.json')) continue;
      try {
        const raw = readFileSync(join(pagesDir, file), 'utf8');
        const parsed = JSON.parse(raw) as {
          url?: string;
          metadata?: { title?: string; statusCode?: number };
          content?: { markdown?: string };
          extracted?: {
            ctaButtons?: Array<{ text: string; href: string; type?: string }>;
            testimonials?: unknown[];
            eventSpaces?: unknown[];
            pricing?: unknown[];
            contact?: { phone?: string; email?: string; address?: string };
          };
        };
        if (!parsed.url) continue;
        if (parsed.metadata?.statusCode && parsed.metadata.statusCode >= 400) continue;
        const md = parsed.content?.markdown ?? '';
        pages.push({
          url: parsed.url,
          title: parsed.metadata?.title ?? '',
          firstFold: md.slice(0, 600),
          ctas: (parsed.extracted?.ctaButtons ?? []).slice(0, 12),
          testimonials: parsed.extracted?.testimonials?.length ?? 0,
          eventSpaces: parsed.extracted?.eventSpaces?.length ?? 0,
          pricing: parsed.extracted?.pricing?.length ?? 0,
          contact: parsed.extracted?.contact ?? {},
        });
      } catch {
        // skip malformed
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

export function buildPrompt(ctx: ConversionPsychologyCtx): string {
  const pageList =
    ctx.pages.length === 0
      ? '_(no scraped pages — provide general guidance based on the site URL and brand context)_'
      : ctx.pages
          .slice(0, 20)
          .map((p) => {
            const ctaLines = p.ctas
              .slice(0, 6)
              .map((c) => `    - "${c.text}" -> ${c.href}${c.type ? ` (${c.type})` : ''}`)
              .join('\n');
            const signals = [
              p.testimonials > 0 ? `${p.testimonials} testimonial(s)` : null,
              p.eventSpaces > 0 ? `${p.eventSpaces} event-space record(s)` : null,
              p.pricing > 0 ? `${p.pricing} pricing item(s)` : null,
            ]
              .filter(Boolean)
              .join(', ');
            const contactBits = [p.contact.phone && 'phone', p.contact.email && 'email', p.contact.address && 'address']
              .filter(Boolean)
              .join('+') || 'none';
            return `### ${p.url}\n  Title: ${p.title}\n  Signals: ${signals || '(none)'}; contact: ${contactBits}\n  CTAs:\n${ctaLines || '    - (no CTAs detected)'}\n  First-fold copy: """${p.firstFold.replace(/\s+/g, ' ').slice(0, 280)}..."""`;
          })
          .join('\n\n');

  const wantsList = Object.entries(ctx.intakePageWants)
    .filter(([, v]) => typeof v === 'string' && v.trim().length > 0)
    .map(([slug, v]) => `- **${slug}**: ${v.trim().split(/\r?\n/).join(' ')}`)
    .join('\n');

  const brandBlock = ctx.brandVoiceMd
    ? `## Brand voice\n\n${ctx.brandVoiceMd.trim()}\n\n`
    : '';

  return `You are conducting a conversion-psychology audit for ${ctx.clientName || 'the client'} (${ctx.siteUrl || 'unknown URL'}).

Evaluate four pillars across the site and produce findings:
  1. **Value-prop clarity.** Does the first-fold copy answer "what is this and why should I care" within ~5 seconds? Specific value > generic claims.
  2. **Friction points.** What's making conversion harder than it needs to be? Hidden pricing, missing contact info, vague next steps, scary forms, broken trust signals.
  3. **Social proof strength.** Testimonials, case studies, named clients, press mentions, ratings. Are they specific and credible, or generic?
  4. **CTA quality.** Are the right CTAs in the right places? Specific labels ("Tour the venue") beat generic ("Learn more"). Primary CTAs above the fold. Phone numbers clickable.

## Pages and signals (top 20)

${pageList}

${wantsList ? `## Client priorities from intake\n\n${wantsList}\n\n` : ''}${brandBlock}## Output format (mandatory)

Respond with a single JSON object inside a fenced \`\`\`json code block. Schema:

\`\`\`json
{
  "summary": "one-sentence assessment of conversion readiness",
  "findings": [
    {
      "id": "sales-deep-001",
      "title": "Short imperative title",
      "description": "What's wrong",
      "priority": "p0 | p1 | p2",
      "effort": "light | medium | heavy",
      "recommendation": "Concrete next step (a CTA to add, a section to write, a friction to remove)",
      "why_it_matters": "Why this affects conversion in 1-2 sentences",
      "evidence": "Optional: page URL or specific CTA text",
      "affected_pages": ["optional", "list"]
    }
  ]
}
\`\`\`

Guidelines:
- Aim for 4-8 findings, prioritized by revenue impact.
- p0 = active conversion blocker (e.g. no contact info, no pricing signal, dead CTAs). p1 = meaningful drag. p2 = polish.
- Recommendations must be concrete: name the CTA copy, the section to add, the friction to cut. Not "improve CTAs".
- Do NOT include any prose outside the fenced JSON block.
`;
}
