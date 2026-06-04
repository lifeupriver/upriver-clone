import { z } from 'zod';
import { field } from '../envelope.js';

/**
 * One capacity metric. The concrete slots are module-defined (venue guest
 * counts, preschool enrollment by age group, contractor project size,
 * restaurant seating); the core stores them generically (PRD §2.2, §2.3).
 */
export const capacityMetricZ = z.object({
  label: z.string(),
  value: z.union([z.number(), z.string()]).optional(),
  unit: z.string().optional(),
});

/** Yes / no / maybe lists of event or engagement types. */
export const engagementTypesZ = z.object({
  yes: z.array(z.string()).optional(),
  no: z.array(z.string()).optional(),
  maybe: z.array(z.string()).optional(),
});

/**
 * `capacity` — HV throughout (availability) (PRD §2.2). Gated by `capacity.**`.
 */
export const capacitySectionZ = z
  .object({
    metrics: field(z.array(capacityMetricZ)),
    bookingLeadTime: field(
      z.object({ typical: z.string().optional(), minimum: z.string().optional() }),
    ),
    blackoutDates: field(z.array(z.string())),
    engagementTypes: field(engagementTypesZ),
  })
  .passthrough();

export type CapacitySection = z.infer<typeof capacitySectionZ>;
