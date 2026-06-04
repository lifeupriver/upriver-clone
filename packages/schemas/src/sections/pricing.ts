import { z } from 'zod';
import { field } from '../envelope.js';

/** A shareable price line — safe to publish. */
export const shareablePriceZ = z.object({
  item: z.string(),
  price: z.string().optional(),
  included: z.array(z.string()).optional(),
  excluded: z.array(z.string()).optional(),
  conditions: z.string().optional(),
});

/** A non-shareable price question and the approved deflection answer. */
export const deflectionZ = z.object({
  askedQuestion: z.string(),
  deflectionAnswer: z.string().optional(),
});

/**
 * `pricing` — HV throughout (money) (PRD §2.2). Every leaf is gated by
 * `pricing.**` in hv.ts; no generator consumes pricing until verified.
 */
export const pricingSectionZ = z
  .object({
    shareable: field(z.array(shareablePriceZ)),
    nonShareable: field(z.array(deflectionZ)),
    seasonal: field(z.array(shareablePriceZ)),
    discounts: field(z.array(z.string())),
    deposit: field(z.string()),
    paymentSchedule: field(z.string()),
    acceptedMethods: field(z.array(z.string())),
    refundPolicy: field(z.string()),
    reschedulingPolicy: field(z.string()),
    visibilityPolicy: field(z.string()),
    lastUpdated: field(z.string()),
  })
  .passthrough();

export type PricingSection = z.infer<typeof pricingSectionZ>;
