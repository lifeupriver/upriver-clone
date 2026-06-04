import { z } from 'zod';
import { field } from '../envelope.js';

/** A differentiator with the proof that backs it and how marketing uses it. */
export const verifiableDifferentiatorZ = z.object({
  claim: z.string(),
  proof: z.string().optional(),
  marketingUse: z.string().optional(),
});

/** An award or certification, with its source and link. */
export const awardZ = z.object({
  name: z.string(),
  date: z.string().optional(),
  source: z.string().optional(),
  link: z.string().optional(),
});

/** A track-record number (e.g. "200+ weddings hosted"). */
export const trackRecordNumberZ = z.object({
  label: z.string(),
  value: z.string().optional(),
});

/**
 * `positioning` — differentiation, proof, and the recommended positioning
 * statement (an operator-analysis output, stored on the profile) (PRD §2.2,
 * §2.4).
 */
export const positioningSectionZ = z
  .object({
    keyDifferentiator: field(z.string()),
    verifiableDifferentiators: field(z.array(verifiableDifferentiatorZ)),
    outcomeDelivered: field(z.string()),
    awards: field(z.array(awardZ)),
    trackRecordNumbers: field(z.array(trackRecordNumberZ)),
    comparison: field(z.string()),
    recommendedStatement: field(z.string()),
  })
  .passthrough();

export type PositioningSection = z.infer<typeof positioningSectionZ>;
