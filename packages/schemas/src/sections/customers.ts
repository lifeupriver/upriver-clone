import { z } from 'zod';
import { field } from '../envelope.js';

/** The primary customer, demographic and psychographic. */
export const primaryCustomerZ = z.object({
  demographic: z.string().optional(),
  psychographic: z.string().optional(),
});

/**
 * `customers` — who buys, why they choose or pass, and how they decide
 * (PRD §2.2).
 */
export const customersSectionZ = z
  .object({
    primaryCustomer: field(primaryCustomerZ),
    discoveryChannels: field(z.array(z.string())),
    reasonsChooseUs: field(z.array(z.string())),
    reasonsWeLose: field(z.array(z.string())),
    praise: field(z.array(z.string())),
    lifetimeValue: field(z.string()),
    decisionCriteria: field(z.array(z.string())),
    decisionTimeline: field(z.string()),
    optionsConsidered: field(z.array(z.string())),
    priceSensitivity: field(z.string()),
  })
  .passthrough();

export type CustomersSection = z.infer<typeof customersSectionZ>;
