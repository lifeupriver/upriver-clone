import { z } from 'zod';
import { field } from '../envelope.js';

/**
 * A single offering. `priceRange` is HV (money) — gated via the array envelope
 * `offerings.core` (see hv.ts: `offerings.core.*.priceRange`).
 */
export const offeringZ = z.object({
  name: z.string(),
  components: z.array(z.string()).optional(),
  exclusions: z.array(z.string()).optional(),
  useCase: z.string().optional(),
  priceRange: z.string().optional(),
});

/**
 * `offerings` — what the business sells, plus the explicit anti-over-promise
 * "don't-do" list (HV) (PRD §2.2).
 */
export const offeringsSectionZ = z
  .object({
    core: field(z.array(offeringZ)),
    secondary: field(z.array(offeringZ)),
    discontinued: field(z.array(offeringZ)),
    dontDo: field(z.array(z.string())), // HV — the anti-over-promise list
    seasonal: field(z.array(offeringZ)),
  })
  .passthrough();

export type OfferingsSection = z.infer<typeof offeringsSectionZ>;
