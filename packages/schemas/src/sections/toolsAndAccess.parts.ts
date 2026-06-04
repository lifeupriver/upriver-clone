import { z } from 'zod';

/**
 * One tool in the stack: where it lives, who holds the credentials, and what
 * it can automate. Access/credential leaves are HV (PRD §2.2).
 */
export const toolZ = z.object({
  name: z.string().optional(),
  url: z.string().optional(),
  accessStatus: z.string().optional(),
  credentialHolder: z.string().optional(),
  apiCapability: z.string().optional(),
  webhookCapability: z.string().optional(),
});

/** One line of the access-grant checklist. */
export const accessChecklistItemZ = z.object({
  item: z.string(),
  status: z.string().optional(),
});

/** Per-user browser / device landscape (for Claude-in-Chrome and routines). */
export const browserDeviceZ = z.object({
  user: z.string().optional(),
  browser: z.string().optional(),
  alwaysOnMachine: z.string().optional(),
  os: z.string().optional(),
});
