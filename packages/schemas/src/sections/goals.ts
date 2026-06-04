import { z } from 'zod';
import { field } from '../envelope.js';

/**
 * Engagement scope fork choices (from doc 13's build sequence). These drive
 * which deliverables are in play for the client (PRD §2.2, §2.3).
 */
export const engagementScopeZ = z.object({
  websiteScope: z.enum(['A', 'B', 'C']).optional(),
  phase1Automation: z.array(z.string()).optional(),
  contentProduction: z.string().optional(),
  retainerContinuation: z.string().optional(),
});

/**
 * `goals` — the outcome sought, constraints, and engagement forks.
 * `budgetConstraints` and `redLines` are HV (PRD §2.2).
 */
export const goalsSectionZ = z
  .object({
    primaryOutcome: field(z.string()),
    urgencyTimeline: field(z.string()),
    budgetConstraints: field(z.string()), // HV — money
    contentHoursPerWeek: field(z.string()),
    redLines: field(z.array(z.string())), // HV — things the business won't do
    engagementScope: field(engagementScopeZ),
  })
  .passthrough();

export type GoalsSection = z.infer<typeof goalsSectionZ>;
