import { z } from 'zod';
import { field } from '../envelope.js';

/** A keyword target with its current and target rank. */
export const keywordTargetZ = z.object({
  keyword: z.string(),
  volume: z.number().optional(),
  difficulty: z.number().optional(),
  currentPosition: z.number().optional(),
  targetPosition: z.number().optional(),
  rationale: z.string().optional(),
});

/** A long-tail keyword cluster. */
export const longTailClusterZ = z.object({
  cluster: z.string(),
  keywords: z.array(z.string()).optional(),
});

/**
 * `seo` — baseline metrics, keyword targets, local, AEO, technical, and the
 * content plan (PRD §2.2). Baseline is recon-fillable; targets are operator
 * analysis confirmed by the owner (HV gate at the deliverable, per §3.2).
 */
export const seoSectionZ = z
  .object({
    baseline: field(
      z.object({
        dr: z.number().optional(),
        traffic: z.number().optional(),
        keywords: z.number().optional(),
        backlinks: z.number().optional(),
        referringDomains: z.number().optional(),
        indexedPages: z.number().optional(),
        topPages: z.array(z.string()).optional(),
        brandedVsNonBranded: z.string().optional(),
      }),
    ),
    primaryKeywordTargets: field(z.array(keywordTargetZ)),
    longTailClusters: field(z.array(longTailClusterZ)),
    local: field(
      z.object({
        gbpStatus: z.string().optional(),
        napConsistency: z.string().optional(),
        citations: z.string().optional(),
        reviewStrategy: z.string().optional(),
      }),
    ),
    aeo: field(
      z.object({
        questionKeywords: z.array(z.string()).optional(),
        schemaStatus: z.string().optional(),
      }),
    ),
    technical: field(
      z.object({
        cwv: z.string().optional(),
        indexation: z.string().optional(),
        mobile: z.string().optional(),
        topIssues: z.array(z.string()).optional(),
      }),
    ),
    contentPlan: field(
      z.object({
        cadence: z.string().optional(),
        pillars: z.array(z.string()).optional(),
        ninetyDayCalendar: z.array(z.string()).optional(),
      }),
    ),
    measurementTargets: field(
      z.object({ ninetyDay: z.string().optional(), twelveMonth: z.string().optional() }),
    ),
  })
  .passthrough();

export type SeoSection = z.infer<typeof seoSectionZ>;
