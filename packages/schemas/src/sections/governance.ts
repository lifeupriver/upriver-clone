import { z } from 'zod';
import { field } from '../envelope.js';

/** Per-user memory / incognito posture. */
export const memoryPostureZ = z.object({
  user: z.string(),
  posture: z.string().optional(),
});

/** Who owns each surface after the engagement, and the rotation plan. */
export const offboardingPlanZ = z.object({
  vercelOwner: z.string().optional(),
  supabaseOwner: z.string().optional(),
  cloudinaryOwner: z.string().optional(),
  credentialRotation: z.string().optional(),
});

/**
 * `governance` — HV throughout (safety / compliance) (PRD §2.2). Gated by
 * `governance.**`; nothing here reaches a generator until verified.
 */
export const governanceSectionZ = z
  .object({
    regulatedData: field(z.array(z.string())), // PHI / PCI / GDPR
    dataResidency: field(z.string()),
    complianceCerts: field(z.array(z.string())), // HIPAA, SOC 2, audit logs
    itSecurityFunctionExists: field(z.boolean()),
    reviewResponsePolicy: field(z.string()),
    emailCompliancePosture: field(z.string()),
    dataRetention: field(z.string()),
    memoryIncognitoPosture: field(z.array(memoryPostureZ)),
    offboardingPlan: field(offboardingPlanZ),
  })
  .passthrough();

export type GovernanceSection = z.infer<typeof governanceSectionZ>;
