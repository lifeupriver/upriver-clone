import { z } from 'zod';
import { field } from '../envelope.js';

/** A postal address. All parts optional — recon fills what it finds. */
export const addressZ = z.object({
  line1: z.string().optional(),
  line2: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional(),
  country: z.string().optional(),
});

/** A social profile handle and its URL. */
export const socialHandleZ = z.object({
  platform: z.string(),
  handle: z.string().optional(),
  url: z.string().optional(),
});

/** Google Business Profile pointer and claim status. */
export const gbpZ = z.object({
  url: z.string().optional(),
  status: z.string().optional(),
});

/**
 * `identity` — who the business is. Mostly recon-fillable (PRD §2.2, §2.4).
 * Built first because everything references slug/name.
 */
export const identitySectionZ = z
  .object({
    legalName: field(z.string()),
    publicName: field(z.string()),
    dbas: field(z.array(z.string())),
    category: field(z.string()),
    subcategory: field(z.string()),
    yearEstablished: field(z.number().int()),
    history: field(z.string()),
    primaryAddress: field(addressZ),
    mailingAddress: field(addressZ),
    serviceArea: field(z.string()),
    phone: field(z.string()),
    email: field(z.string()),
    website: field(z.string()),
    gbp: field(gbpZ),
    socialHandles: field(z.array(socialHandleZ)),
    hours: field(z.string()),
  })
  .passthrough();

export type IdentitySection = z.infer<typeof identitySectionZ>;
