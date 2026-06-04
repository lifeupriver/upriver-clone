import { z } from 'zod';
import { field } from '../envelope.js';

/** A single direct competitor and everything recon + analysis gathered on them. */
export const competitorZ = z.object({
  name: z.string(),
  site: z.string().optional(),
  location: z.string().optional(),
  founded: z.string().optional(),
  size: z.string().optional(),
  offering: z.string().optional(),
  pricingPosition: z.string().optional(),
  capacity: z.string().optional(),
  differentiators: z.array(z.string()).optional(),
  webPresence: z.string().optional(),
  socialPresence: z.string().optional(),
  seoPresence: z.string().optional(),
  ahrefsMetrics: z.record(z.string(), z.union([z.number(), z.string()])).optional(),
  reviewThemes: z.array(z.string()).optional(),
  whereTheyWin: z.string().optional(),
  whereWeWin: z.string().optional(),
  salesPositioningLanguage: z.string().optional(),
});

/** An indirect or adjacent alternative the customer might choose instead. */
export const indirectAlternativeZ = z.object({
  name: z.string(),
  type: z.string().optional(),
  note: z.string().optional(),
});

/** Market context surrounding the competitor set. */
export const marketContextZ = z.object({
  geography: z.string().optional(),
  size: z.string().optional(),
  saturation: z.string().optional(),
  dynamics: z.string().optional(),
  searchBehavior: z.string().optional(),
  priceRange: z.string().optional(),
  clientPosition: z.string().optional(),
});

/**
 * `competitors` — market context, the direct set (3–5), adjacent alternatives,
 * and positioning gaps (PRD §2.2). Recon-fillable (Ahrefs + manual).
 */
export const competitorsSectionZ = z
  .object({
    marketContext: field(marketContextZ),
    direct: field(z.array(competitorZ)),
    indirect: field(z.array(indirectAlternativeZ)),
    positioningGaps: field(z.array(z.string())),
  })
  .passthrough();

export type CompetitorsSection = z.infer<typeof competitorsSectionZ>;
