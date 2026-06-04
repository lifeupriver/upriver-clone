import type { Confidence, IdentitySection } from '@upriver/schemas';

import { candidateListSchema, parseCandidates } from '../extraction.js';
import type { PathedCandidate, RawEvidence, ReconAdapter, ReconContext } from '../types.js';

/** Dot-paths the GBP adapter may fill. */
export const GBP_TARGET_PATHS: string[] = [
  'identity.gbp',
  'identity.hours',
  'identity.phone',
  'identity.primaryAddress',
  'identity.category',
  'content.reviewPlatforms',
  'seo.local',
];

function confidenceFor(path: string): Confidence {
  // NAP / hours / reviews read off the listing are reasonably trustworthy.
  if (['identity.hours', 'identity.phone', 'identity.primaryAddress', 'content.reviewPlatforms'].includes(path)) {
    return 'medium';
  }
  return 'low';
}

export const GBP_EXTRACTION_SCHEMA = candidateListSchema(GBP_TARGET_PATHS);

export const GBP_SYSTEM_PROMPT = [
  'You are a recon extractor for Upriver Consulting reading a public Google Business',
  'Profile / Google Maps listing. Extract verifiable facts into dot-path candidates.',
  '',
  'Hard rules:',
  '- Emit ONLY naked values (no source/confidence/verified). Use ONLY the allowed paths.',
  '- Omit anything not present in the content. Do NOT guess.',
  '- Put a supporting quote or the listing URL in `evidence`.',
  '',
  'Value shapes:',
  '- identity.gbp: { url?, status? } — status is best-effort ("claimed"/"unclaimed"/"unknown").',
  '- identity.hours: a single human-readable string.',
  '- identity.phone: a string. identity.category: a string.',
  '- identity.primaryAddress: { line1, city, state, postalCode }.',
  '- content.reviewPlatforms: array of { platform, count?, rating? } — for Google use platform "Google".',
  '- seo.local: { gbpStatus?, napConsistency? }.',
].join('\n');

interface GbpPayload {
  url: string;
  markdown: string;
}

/** The Google Maps search URL for a business when no GBP URL is known yet. */
export function mapsSearchUrl(name: string, area?: string): string {
  const query = area ? `${name} ${area}` : name;
  return `https://www.google.com/maps/search/${encodeURIComponent(query)}`;
}

/** Best-effort service area from the profile (serviceArea, else city/state). */
export function areaFromProfile(identity: IdentitySection | undefined): string | undefined {
  const serviceArea = identity?.serviceArea?.value;
  if (typeof serviceArea === 'string' && serviceArea.length > 0) return serviceArea;
  const addr = identity?.primaryAddress?.value;
  if (addr && typeof addr === 'object') {
    const a = addr as { city?: string; state?: string };
    const parts = [a.city, a.state].filter((x): x is string => Boolean(x));
    if (parts.length) return parts.join(', ');
  }
  return undefined;
}

export function buildGbpUserPrompt(listing: GbpPayload): string {
  return [
    'Extract recon candidates from this Google Business Profile / Maps listing.',
    'Return ONLY the JSON object matching the schema.',
    '',
    `Listing URL: ${listing.url}`,
    '',
    listing.markdown || '(no listing content scraped)',
  ].join('\n');
}

function knownGbpUrl(ctx: ReconContext): string | undefined {
  const gbp = ctx.profile.identity?.gbp?.value;
  if (gbp && typeof gbp === 'object') {
    const url = (gbp as { url?: unknown }).url;
    if (typeof url === 'string' && url.length > 0) return url;
  }
  return undefined;
}

export const gbpAdapter: ReconAdapter = {
  id: 'gbp',
  async gather(ctx: ReconContext): Promise<RawEvidence> {
    const url =
      knownGbpUrl(ctx) ?? mapsSearchUrl(ctx.config.name, areaFromProfile(ctx.profile.identity));
    ctx.log(`  gbp: scraping ${url}`);
    const result = await ctx.scrape(url, { formats: ['markdown'] });

    const evPath = 'recon/gbp/listing.json';
    await ctx.ds.writeClientFile(ctx.slug, evPath, `${JSON.stringify(result, null, 2)}\n`);

    const payload: GbpPayload = { url, markdown: result.markdown ?? '' };
    return { id: 'gbp', files: [evPath], payload };
  },

  async extract(evidence: RawEvidence, ctx: ReconContext): Promise<PathedCandidate[]> {
    const payload = evidence.payload as GbpPayload;
    const text = await ctx.llm({
      command: 'recon-gbp',
      systemPrompt: GBP_SYSTEM_PROMPT,
      userPrompt: buildGbpUserPrompt(payload),
      jsonSchema: GBP_EXTRACTION_SCHEMA,
    });
    return parseCandidates(text, { paths: GBP_TARGET_PATHS, confidence: confidenceFor });
  },
};
