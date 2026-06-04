import { z } from 'zod';
import { field } from '../envelope.js';
import {
  leadSourceZ,
  responseTimeZ,
  conversionEventZ,
  followUpCadenceZ,
  stageVolumeZ,
  conversionRateZ,
  seasonalityZ,
  bottleneckZ,
  slaTargetZ,
} from './salesProcess.parts.js';

export * from './salesProcess.parts.js';

/**
 * `salesProcess` — lead sources through close, funnel metrics, seasonality, and
 * bottlenecks (PRD §2.2). `close.definition` (money) and
 * `funnel.revenuePerCustomer` (money) are HV; response times are
 * secret-shopper-sourced, not owner-stated (§2.4, §3.2).
 */
export const salesProcessSectionZ = z
  .object({
    leadSources: field(z.array(leadSourceZ)),
    firstTouch: z.object({
      steps: field(z.array(z.string())),
      responseTime: field(z.array(responseTimeZ)),
      template: field(z.string()),
    }).optional(),
    qualifyingQuestions: field(z.array(z.string())),
    qualificationCriteria: field(z.array(z.string())),
    disqualificationCriteria: field(z.array(z.string())),
    conversionEvent: field(conversionEventZ),
    close: z.object({
      definition: field(z.string()), // HV — money
      steps: field(z.array(z.string())),
      tools: field(z.array(z.string())),
      timeToSigned: field(z.string()),
      dropOff: field(z.string()),
    }).optional(),
    followUpCadences: field(z.array(followUpCadenceZ)),
    funnel: z.object({
      stageVolumes: field(z.array(stageVolumeZ)),
      conversionRates: field(z.array(conversionRateZ)),
      revenuePerCustomer: field(z.string()), // HV — money
      dataQualityNotes: field(z.string()),
    }).optional(),
    seasonality: field(z.array(seasonalityZ)),
    bottlenecks: field(z.array(bottleneckZ)),
    responseSlaTargets: field(z.array(slaTargetZ)),
  })
  .passthrough();

export type SalesProcessSection = z.infer<typeof salesProcessSectionZ>;
