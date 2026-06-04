import { fieldFilled, type Confidence } from '@upriver/schemas';

import { candidateListSchema, parseCandidates } from '../extraction.js';
import type { PathedCandidate, RawEvidence, ReconAdapter, ReconContext, SearchResult } from '../types.js';
import { areaFromProfile } from './gbp.js';

/** serp only proposes the direct competitor set. */
export const SERP_TARGET_PATHS: string[] = ['competitors.direct'];

export const SERP_EXTRACTION_SCHEMA = candidateListSchema(SERP_TARGET_PATHS);

export const SERP_SYSTEM_PROMPT = [
  'You are a recon analyst for Upriver Consulting. From the web-search results below,',
  'identify the DIRECT competitors of the client business — same category, same area.',
  '',
  'Hard rules:',
  '- Emit ONLY naked values (no source/confidence/verified). Use ONLY the allowed path.',
  '- EXCLUDE the client itself, directories/aggregators (Yelp, Niche, Google, Facebook),',
  '  and unrelated results. Include at most 5.',
  '- These are low-confidence leads for an operator to curate — do not over-claim.',
  '',
  'Return one candidate:',
  '- competitors.direct: array of { name, site? } for the direct competitors found.',
].join('\n');

interface SerpPayload {
  query: string;
  results: SearchResult[];
}

/** The business category to search on: profile category, else config vertical. */
export function categoryFor(ctx: ReconContext): string {
  const cat = ctx.profile.identity?.category?.value;
  if (typeof cat === 'string' && cat.length > 0) return cat;
  if (ctx.config.vertical && ctx.config.vertical !== 'generic') {
    return ctx.config.vertical.replace(/-/g, ' ');
  }
  return 'local business';
}

export function buildSerpQuery(ctx: ReconContext): string {
  const area = areaFromProfile(ctx.profile.identity);
  return area ? `${categoryFor(ctx)} ${area}` : categoryFor(ctx);
}

export function buildSerpUserPrompt(payload: SerpPayload): string {
  const lines = payload.results
    .slice(0, 20)
    .map((r, i) => `${i + 1}. ${r.title} — ${r.url}${r.description ? `\n   ${r.description}` : ''}`);
  return [
    `Search query: "${payload.query}"`,
    'Identify the direct competitors among these results. Return ONLY the JSON object.',
    '',
    ...lines,
  ].join('\n');
}

export const serpAdapter: ReconAdapter = {
  id: 'serp',
  async gather(ctx: ReconContext): Promise<RawEvidence> {
    const query = buildSerpQuery(ctx);
    ctx.log(`  serp: searching "${query}"`);
    const results = await ctx.search(query, { limit: 10 });

    const evPath = 'recon/serp/results.json';
    await ctx.ds.writeClientFile(
      ctx.slug,
      evPath,
      `${JSON.stringify({ query, results, searchedAt: ctx.now }, null, 2)}\n`,
    );

    const payload: SerpPayload = { query, results };
    return { id: 'serp', files: [evPath], payload };
  },

  async extract(evidence: RawEvidence, ctx: ReconContext): Promise<PathedCandidate[]> {
    // Only propose competitors when the operator hasn't curated a set yet.
    if (fieldFilled(ctx.profile, 'competitors.direct')) {
      ctx.log('  serp: competitors.direct already filled — recording evidence only');
      return [];
    }
    const payload = evidence.payload as SerpPayload;
    if (payload.results.length === 0) return [];

    const text = await ctx.llm({
      command: 'recon-serp',
      systemPrompt: SERP_SYSTEM_PROMPT,
      userPrompt: buildSerpUserPrompt(payload),
      jsonSchema: SERP_EXTRACTION_SCHEMA,
    });
    return parseCandidates(text, { paths: SERP_TARGET_PATHS, confidence: confidenceFor });
  },
};

function confidenceFor(): Confidence {
  return 'low';
}
