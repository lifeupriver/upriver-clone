import { candidateListSchema, parseCandidates } from '../extraction.js';
import type { PathedCandidate, RawEvidence, ReconAdapter, ReconContext } from '../types.js';

/**
 * The only schema-writable target: the confirmed handle set. Follower counts,
 * last-post recency, and cadence have no canonical schema home this build, so the
 * adapter records them in each candidate's `evidence` string (build spec 04 §1 —
 * "low confidence by design").
 */
export const SOCIALS_TARGET_PATHS: string[] = ['identity.socialHandles'];

export const SOCIALS_EXTRACTION_SCHEMA = candidateListSchema(SOCIALS_TARGET_PATHS);

export const SOCIALS_SYSTEM_PROMPT = [
  'You are a recon extractor for Upriver Consulting confirming a business\'s social',
  'profiles from their scraped public pages.',
  '',
  'Hard rules:',
  '- Emit ONLY naked values (no source/confidence/verified). Use ONLY the allowed path.',
  '- Confirm only handles whose page content actually matches this business. Omit dead or',
  '  mismatched handles. Do NOT guess.',
  '',
  'Return a single candidate:',
  '- identity.socialHandles: array of { platform, handle?, url? } for the CONFIRMED profiles.',
  '  In `evidence`, summarize follower count, last-post recency, and posting cadence per',
  '  handle if visible (e.g. "instagram ~1.2k followers, last post 3d ago, ~2/wk").',
].join('\n');

interface SocialProfile {
  platform: string;
  handle?: string;
  url: string;
  markdown: string;
}

interface SocialsPayload {
  profiles: SocialProfile[];
}

interface ProfileHandle {
  platform: string;
  handle?: string;
  url?: string;
}

/** Handles already on the profile (filled by `website` or a prior run / hand-fill). */
export function handlesFromProfile(ctx: ReconContext): ProfileHandle[] {
  const value = ctx.profile.identity?.socialHandles?.value;
  if (!Array.isArray(value)) return [];
  return value.filter((h): h is ProfileHandle => Boolean(h) && typeof h === 'object');
}

function slugifyPlatform(platform: string): string {
  return platform.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'profile';
}

export function buildSocialsUserPrompt(profiles: SocialProfile[]): string {
  const blocks = profiles.map((p) =>
    [`--- ${p.platform} (${p.url}) ---`, p.markdown.slice(0, 4000) || '(no content)'].join('\n'),
  );
  return ['Confirm these social profiles and return ONLY the JSON object.', '', ...blocks].join('\n');
}

export const socialsAdapter: ReconAdapter = {
  id: 'socials',
  async gather(ctx: ReconContext): Promise<RawEvidence> {
    const handles = handlesFromProfile(ctx);
    const files: string[] = [];
    const profiles: SocialProfile[] = [];

    for (const h of handles) {
      if (!h.url) continue;
      let markdown = '';
      try {
        const result = await ctx.scrape(h.url, { formats: ['markdown'] });
        markdown = result.markdown ?? '';
        const evPath = `recon/socials/${slugifyPlatform(h.platform)}.json`;
        await ctx.ds.writeClientFile(ctx.slug, evPath, `${JSON.stringify(result, null, 2)}\n`);
        files.push(evPath);
      } catch (err) {
        // A single dead/blocked profile must not sink the rest.
        ctx.log(`  socials: ${h.platform} scrape failed — ${err instanceof Error ? err.message : String(err)}`);
      }
      const profile: SocialProfile = { platform: h.platform, url: h.url, markdown };
      if (h.handle) profile.handle = h.handle;
      profiles.push(profile);
    }

    const manifest = 'recon/socials/source.json';
    await ctx.ds.writeClientFile(
      ctx.slug,
      manifest,
      `${JSON.stringify({ handles: profiles.map((p) => ({ platform: p.platform, url: p.url })), gatheredAt: ctx.now }, null, 2)}\n`,
    );
    files.push(manifest);

    const payload: SocialsPayload = { profiles };
    return { id: 'socials', files, payload };
  },

  async extract(evidence: RawEvidence, ctx: ReconContext): Promise<PathedCandidate[]> {
    const payload = evidence.payload as SocialsPayload;
    if (payload.profiles.length === 0) return [];

    const text = await ctx.llm({
      command: 'recon-socials',
      systemPrompt: SOCIALS_SYSTEM_PROMPT,
      userPrompt: buildSocialsUserPrompt(payload.profiles),
      jsonSchema: SOCIALS_EXTRACTION_SCHEMA,
    });
    return parseCandidates(text, { paths: SOCIALS_TARGET_PATHS, confidence: () => 'low' });
  },
};
