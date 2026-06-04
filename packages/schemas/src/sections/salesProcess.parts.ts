import { z } from 'zod';

/** A lead source and its economics. Response time is secret-shopper measured. */
export const leadSourceZ = z.object({
  channel: z.string(),
  volumePerMonth: z.number().optional(),
  percentOfTotal: z.number().optional(),
  quality: z.string().optional(),
  cost: z.string().optional(),
  landingPoint: z.string().optional(),
  firstResponder: z.string().optional(),
});

/** Measured response time by channel and season. */
export const responseTimeZ = z.object({
  channel: z.string().optional(),
  season: z.string().optional(),
  time: z.string().optional(),
});

/** The conversion event (tour, consult, tasting, …). */
export const conversionEventZ = z.object({
  name: z.string(),
  format: z.string().optional(),
  length: z.string().optional(),
  location: z.string().optional(),
  owner: z.string().optional(),
  scheduling: z.string().optional(),
  agenda: z.string().optional(),
  showUpRate: z.string().optional(),
  conversionRate: z.string().optional(),
});

/** A follow-up cadence for a given scenario. */
export const followUpCadenceZ = z.object({
  scenario: z.string(),
  steps: z.array(z.string()).optional(),
});

/** A funnel stage volume and a stage conversion rate. */
export const stageVolumeZ = z.object({ stage: z.string(), volume: z.number().optional() });
export const conversionRateZ = z.object({ stage: z.string(), rate: z.string().optional() });

/** Inquiry / booking volume by season. */
export const seasonalityZ = z.object({
  season: z.string(),
  inquiryVolume: z.string().optional(),
  bookingVolume: z.string().optional(),
});

/** A top bottleneck, with evidence, cost, and the fix. */
export const bottleneckZ = z.object({
  description: z.string(),
  evidence: z.string().optional(),
  cost: z.string().optional(),
  fix: z.string().optional(),
});

/** A response SLA target by channel. */
export const slaTargetZ = z.object({ channel: z.string(), target: z.string().optional() });
