import { z } from 'zod';
import { field } from '../envelope.js';
import { toolZ, accessChecklistItemZ, browserDeviceZ } from './toolsAndAccess.parts.js';

export * from './toolsAndAccess.parts.js';

/**
 * `toolsAndAccess` — HV throughout (access / credentials) (PRD §2.2). The full
 * stack inventory, per-tool access status, the access-grant checklist, plan
 * tier + billing owner, API key ownership + spend caps (money), and the
 * browser/device landscape. Gated by `toolsAndAccess.**`.
 */
export const toolsAndAccessSectionZ = z
  .object({
    stack: field(z.array(toolZ)),
    crm: field(toolZ),
    emailPlatform: field(toolZ),
    scheduling: field(toolZ),
    websiteCms: field(toolZ),
    assetStorage: field(toolZ),
    analytics: field(z.array(toolZ)), // GA4 / GSC / Ahrefs / Umami
    paymentProcessor: field(toolZ),
    eSignature: field(toolZ),
    socialAccounts: field(z.array(toolZ)),
    automationPlatform: field(toolZ), // n8n
    supabase: field(toolZ),
    slack: field(toolZ),
    accessChecklist: field(z.array(accessChecklistItemZ)),
    plan: z.object({
      tier: field(z.string()), // Anthropic plan tier
      billingOwner: field(z.string()),
    }).optional(),
    apiSpend: z.object({
      keyOwnership: field(z.string()),
      caps: field(z.string()), // HV — money
    }).optional(),
    browserDeviceLandscape: field(z.array(browserDeviceZ)),
  })
  .passthrough();

export type ToolsAndAccessSection = z.infer<typeof toolsAndAccessSectionZ>;
