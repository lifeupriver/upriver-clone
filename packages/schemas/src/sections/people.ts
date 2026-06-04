import { z } from 'zod';
import { field } from '../envelope.js';

/** An owner of the business. */
export const ownerZ = z.object({
  name: z.string(),
  role: z.string().optional(),
});

/** A key team member, with scope and whether they are a public contact. */
export const teamMemberZ = z.object({
  name: z.string(),
  role: z.string().optional(),
  scope: z.string().optional(),
  publicContact: z.boolean().optional(),
});

/** A routing rule: a trigger and where it should go. */
export const routingRuleZ = z.object({
  trigger: z.string(),
  route: z.string().optional(),
});

/** The billing contact (HV — money). */
export const billingContactZ = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
});

/** The client-side technical collaborator, if any. */
export const technicalCollaboratorZ = z.object({
  exists: z.boolean().optional(),
  os: z.string().optional(),
  stackComfort: z.string().optional(),
});

/**
 * `people` — owners, team, routing, and the technical collaborator (PRD §2.2).
 * `routing.doNotRoute` and `billingContact` are HV (see hv.ts).
 */
export const peopleSectionZ = z
  .object({
    owners: field(z.array(ownerZ)),
    foundingStory: field(z.string()),
    keyTeam: field(z.array(teamMemberZ)),
    routing: z.object({
      rules: field(z.array(routingRuleZ)),
      doNotRoute: field(z.array(z.string())), // HV
    }).optional(),
    billingContact: field(billingContactZ), // HV
    technicalCollaborator: field(technicalCollaboratorZ),
  })
  .passthrough();

export type PeopleSection = z.infer<typeof peopleSectionZ>;
