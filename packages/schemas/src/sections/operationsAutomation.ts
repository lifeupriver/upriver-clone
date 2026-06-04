import { z } from 'zod';
import { field } from '../envelope.js';

/** A recurring task — feeds I02 Skills and I03 routines. */
export const recurringTaskZ = z.object({
  task: z.string(),
  frequency: z.string().optional(),
  timeCost: z.string().optional(),
  currentMethod: z.string().optional(),
  priority: z.string().optional(),
});

/** Where a given escalation type should route (HV). */
export const escalationRouteZ = z.object({
  type: z.string(),
  route: z.string().optional(),
});

/** A response-SLA target by channel. */
export const responseSlaZ = z.object({
  channel: z.string(),
  sla: z.string().optional(),
});

/** The detection triggers that automations key off. */
export const automationTriggersZ = z.object({
  inquiryForm: z.string().optional(),
  contractSignedDetection: z.string().optional(),
  eventCompletionMarker: z.string().optional(),
});

/**
 * `operationsAutomation` — recurring work, triggers, routing, and SLAs.
 * `escalationRouting`, `sensitiveTopics`, and `spendCap` are HV (PRD §2.2).
 */
export const operationsAutomationSectionZ = z
  .object({
    recurringTasks: field(z.array(recurringTaskZ)),
    automationTriggers: field(automationTriggersZ),
    escalationRouting: field(z.array(escalationRouteZ)), // HV
    vipIndicators: field(z.array(z.string())),
    errorHandlingPreference: field(z.string()),
    sensitiveTopics: field(z.array(z.string())), // HV
    responseSlas: field(z.array(responseSlaZ)),
    spendCap: field(z.string()), // HV — money
    monitoring: field(
      z.object({ cadence: z.string().optional(), owner: z.string().optional() }),
    ),
  })
  .passthrough();

export type OperationsAutomationSection = z.infer<typeof operationsAutomationSectionZ>;
