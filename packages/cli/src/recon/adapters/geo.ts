import type { PathedCandidate, RawEvidence, ReconAdapter, ReconContext } from '../types.js';
import { areaFromProfile } from './gbp.js';

/**
 * GEO check: ask the model what it knows about the business and record the
 * description as an accuracy snapshot (build spec 04 §1). `seo.aeo` (questionKeywords
 * / schemaStatus) is not derivable from this snapshot, so geo is **evidence-only**
 * this build — `extract` returns no candidates and the run reports it as
 * informational. The committed snapshot is the deliverable.
 */
export const GEO_SYSTEM_PROMPT = [
  'You are a general-purpose AI assistant answering from your own knowledge — you have',
  'NO web access and NO tools for this question. In 2–4 sentences, describe what you know',
  'about the business named below: what they do, where they are, and any reputation you',
  'recall. If you do not recognize the business, say so plainly rather than inventing',
  'details. This is a calibration snapshot of how AI assistants currently describe them.',
].join('\n');

export function buildGeoQuestion(name: string, area?: string): string {
  return `What do you know about ${name}${area ? ` in ${area}` : ''}?`;
}

interface GeoPayload {
  question: string;
  answer: string;
}

export const geoAdapter: ReconAdapter = {
  id: 'geo',
  async gather(ctx: ReconContext): Promise<RawEvidence> {
    const question = buildGeoQuestion(ctx.config.name, areaFromProfile(ctx.profile.identity));
    ctx.log('  geo: querying the model for its description of the business');
    const answer = await ctx.llm({
      command: 'recon-geo',
      systemPrompt: GEO_SYSTEM_PROMPT,
      userPrompt: question,
      // No json-schema: this is a free-text calibration snapshot, not extraction.
    });

    const evPath = 'recon/geo/snapshot.json';
    await ctx.ds.writeClientFile(
      ctx.slug,
      evPath,
      `${JSON.stringify({ question, answer, capturedAt: ctx.now }, null, 2)}\n`,
    );

    const payload: GeoPayload = { question, answer };
    return { id: 'geo', files: [evPath], payload };
  },

  async extract(_evidence: RawEvidence, _ctx: ReconContext): Promise<PathedCandidate[]> {
    // Evidence-only: the GEO snapshot has no canonical schema home this build.
    return [];
  },
};
