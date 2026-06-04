import type { FirecrawlBrandingProfile, FirecrawlScrapeResult } from '@upriver/core';
import type { Confidence } from '@upriver/schemas';

import { candidateListSchema, parseCandidates } from '../extraction.js';
import type { PathedCandidate, RawEvidence, ReconAdapter, ReconContext } from '../types.js';

/** Dot-paths the website adapter may fill (the LLM's allowed `path` enum). */
export const WEBSITE_TARGET_PATHS: string[] = [
  'identity.legalName',
  'identity.publicName',
  'identity.category',
  'identity.subcategory',
  'identity.yearEstablished',
  'identity.primaryAddress',
  'identity.serviceArea',
  'identity.phone',
  'identity.email',
  'identity.hours',
  'identity.socialHandles',
  'offerings.core',
  'positioning.keyDifferentiator',
  'positioning.outcomeDelivered',
  'content.testimonials',
  'content.written',
  'pricing.shareable',
];

/** Identity facts read straight off the page are medium confidence; the rest low. */
function confidenceFor(path: string): Confidence {
  return path.startsWith('identity.') ? 'medium' : 'low';
}

export const WEBSITE_EXTRACTION_SCHEMA = candidateListSchema(WEBSITE_TARGET_PATHS);

export const WEBSITE_SYSTEM_PROMPT = [
  'You are a recon extractor for Upriver Consulting. From the website content provided,',
  'extract verifiable business facts into candidates addressed by dot-path.',
  '',
  'Hard rules:',
  '- Emit ONLY naked values — never include source, confidence, or verified.',
  '- Use ONLY the allowed dot-paths. Omit anything you cannot support with a quote or URL',
  '  from the content. Do NOT guess, infer, or invent. Missing is better than wrong.',
  '- Put a short supporting quote or the URL in `evidence` for every candidate.',
  '',
  'Value shapes for the trickier paths:',
  '- identity.hours: a single human-readable string (e.g. "Mon–Fri 7:30am–5:30pm").',
  '- identity.yearEstablished: a number (e.g. 2014).',
  '- identity.primaryAddress: { line1, line2?, city, state, postalCode, country? }.',
  '- identity.socialHandles: array of { platform, handle?, url? }.',
  '- offerings.core: array of { name, components?, exclusions?, useCase?, priceRange? }.',
  '- positioning.keyDifferentiator / positioning.outcomeDelivered: a string.',
  '- content.testimonials: array of { quote, attribution?, theme? }.',
  '- content.written: { blogCount?, cadence?, topPosts? } — only if a blog is visible.',
  '- pricing.shareable: array of { item, price?, included?, excluded?, conditions? } —',
  '  ONLY pricing the site publishes openly.',
].join('\n');

interface WebsitePage {
  url: string;
  markdown: string;
  links: string[];
  title?: string;
  description?: string;
  branding?: FirecrawlBrandingProfile;
}

interface WebsitePayload {
  mode: 'scraped' | 'reused';
  pages: WebsitePage[];
}

const MAX_MD = 14000;

/**
 * Strip the noise that drowns real content on builder-platform pages (Square,
 * Squarespace, Wix): image and link URLs — which on a social-feed homepage can be
 * 90% of the bytes — while keeping the visible text (image alt text and link
 * labels). Collapses runs of blank lines.
 */
export function cleanPageText(markdown: string): string {
  return markdown
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1') // image: keep alt text, drop URL
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // link: keep label, drop URL
    .replace(/https?:\/\/\S+/g, ' ') // any remaining bare URLs
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Build the extraction user prompt from gathered pages. */
export function buildWebsiteUserPrompt(pages: WebsitePage[]): string {
  const blocks = pages.map((p) => {
    const cleaned = cleanPageText(p.markdown);
    const body = cleaned.length > MAX_MD ? `${cleaned.slice(0, MAX_MD)}\n…(truncated)` : cleaned;
    const meta = [p.title && `Title: ${p.title}`, p.description && `Description: ${p.description}`]
      .filter(Boolean)
      .join('\n');
    const links = p.links.slice(0, 30);
    return [
      `--- PAGE: ${p.url} ---`,
      meta,
      body || '(no text content)',
      links.length ? `Links: ${links.join(', ')}` : '',
    ]
      .filter(Boolean)
      .join('\n');
  });
  return [
    'Extract recon candidates from the following website content. Follow the schema and',
    'the rules in the system prompt. Return ONLY the JSON object.',
    '',
    ...blocks,
  ].join('\n');
}

const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function collectPalette(pages: WebsitePage[]): string[] {
  const seen = new Set<string>();
  for (const p of pages) {
    const colors = p.branding?.colors;
    if (!colors) continue;
    for (const v of Object.values(colors)) {
      if (typeof v === 'string' && HEX.test(v)) seen.add(v);
    }
  }
  return [...seen];
}

function pageFromScrape(url: string, r: FirecrawlScrapeResult): WebsitePage {
  const page: WebsitePage = {
    url,
    markdown: r.markdown ?? '',
    links: (r.links ?? []).map((l) => l.href).filter((h): h is string => Boolean(h)),
  };
  const title = r.metadata?.title ?? r.metadata?.ogTitle;
  const description = r.metadata?.description ?? r.metadata?.ogDescription;
  if (title) page.title = title;
  if (description) page.description = description;
  if (r.branding) page.branding = r.branding;
  return page;
}

function linksFromRecord(links: unknown): string[] {
  if (Array.isArray(links)) {
    return links
      .map((l) => (typeof l === 'string' ? l : (l as { href?: string })?.href))
      .filter((h): h is string => Boolean(h));
  }
  if (links && typeof links === 'object') {
    const obj = links as { internal?: unknown; external?: unknown };
    const flat = [...(Array.isArray(obj.internal) ? obj.internal : []), ...(Array.isArray(obj.external) ? obj.external : [])];
    return flat.filter((h): h is string => typeof h === 'string');
  }
  return [];
}

function pageFromRecord(rec: unknown): WebsitePage {
  const r = (rec ?? {}) as {
    url?: unknown;
    content?: { markdown?: unknown };
    links?: unknown;
    metadata?: { title?: unknown; description?: unknown };
  };
  const page: WebsitePage = {
    url: typeof r.url === 'string' ? r.url : '',
    markdown: typeof r.content?.markdown === 'string' ? r.content.markdown : '',
    links: linksFromRecord(r.links),
  };
  if (typeof r.metadata?.title === 'string') page.title = r.metadata.title;
  if (typeof r.metadata?.description === 'string') page.description = r.metadata.description;
  return page;
}

export const websiteAdapter: ReconAdapter = {
  id: 'website',
  async gather(ctx: ReconContext): Promise<RawEvidence> {
    const files: string[] = [];
    const existing = ctx.fresh ? [] : await ctx.ds.listClientFiles(ctx.slug, 'pages');
    const pageRecords = existing.filter((f) => f.endsWith('.json'));

    let pages: WebsitePage[];
    let mode: WebsitePayload['mode'];

    if (pageRecords.length > 0) {
      mode = 'reused';
      pages = [];
      for (const f of pageRecords) {
        const text = await ctx.ds.readClientFileText(ctx.slug, `pages/${f}`);
        if (text === null) continue;
        try {
          pages.push(pageFromRecord(JSON.parse(text)));
        } catch {
          /* skip unparseable records */
        }
      }
      ctx.log(`  website: reusing ${pages.length} page(s) from pages/ (pass --fresh to re-scrape)`);
    } else {
      mode = 'scraped';
      const url = ctx.config.url;
      const result = await ctx.scrape(url, {
        formats: ['markdown', 'links', 'branding'],
        onlyMainContent: true,
      });
      pages = [pageFromScrape(url, result)];
      const evPath = 'recon/website/homepage.json';
      await ctx.ds.writeClientFile(ctx.slug, evPath, `${JSON.stringify(result, null, 2)}\n`);
      files.push(evPath);
      ctx.log(`  website: scraped ${url}`);
    }

    const manifest = 'recon/website/source.json';
    await ctx.ds.writeClientFile(
      ctx.slug,
      manifest,
      `${JSON.stringify({ mode, urls: pages.map((p) => p.url), gatheredAt: ctx.now }, null, 2)}\n`,
    );
    files.push(manifest);

    const payload: WebsitePayload = { mode, pages };
    return { id: 'website', files, payload };
  },

  async extract(evidence: RawEvidence, ctx: ReconContext): Promise<PathedCandidate[]> {
    const payload = evidence.payload as WebsitePayload;
    const candidates: PathedCandidate[] = [];

    // Deterministic, cheap, low-confidence: dominant brand palette from Firecrawl.
    const palette = collectPalette(payload.pages);
    if (palette.length > 0) {
      candidates.push({
        path: 'content.visualBrandAssets',
        value: { palette },
        source: 'recon',
        confidence: 'low',
        evidence: 'Firecrawl branding extraction (dominant colors)',
      });
    }

    // LLM extraction of identity / offerings / positioning / testimonials / pricing.
    const text = await ctx.llm({
      command: 'recon-website',
      systemPrompt: WEBSITE_SYSTEM_PROMPT,
      userPrompt: buildWebsiteUserPrompt(payload.pages),
      jsonSchema: WEBSITE_EXTRACTION_SCHEMA,
    });
    candidates.push(...parseCandidates(text, { paths: WEBSITE_TARGET_PATHS, confidence: confidenceFor }));

    return candidates;
  },
};
