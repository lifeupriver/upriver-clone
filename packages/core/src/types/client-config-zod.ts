import { z } from 'zod';
import { VERTICALS } from './client-config.js';

export const GscConfigZ = z
  .object({
    property: z.string(),
    verified: z.boolean(),
    service_account_added: z.string().optional(),
  })
  .passthrough();

export const PricingTierZ = z
  .object({
    name: z.string().min(1),
    price: z.string().min(1),
    scope: z.string(),
    description: z.string(),
  })
  .passthrough();

export const ClientConfigZ = z
  .object({
    slug: z.string().min(1),
    name: z.string().min(1),
    url: z.string().url('client-config.yaml `url` must be a valid URL'),
    platform: z
      .enum(['squarespace', 'wordpress', 'wix', 'webflow', 'showit', 'unknown'])
      .optional(),
    // Derived from the VERTICALS tuple in client-config.ts so the union type
    // and this enum can never drift apart.
    vertical: z.enum(VERTICALS).optional(),
    created_at: z.string(),
    gsc: GscConfigZ.optional(),
    vercel_preview_url: z.string().url().optional(),
    github_repo: z.string().optional(),
    supabase_project_ref: z.string().optional(),
    dev_port: z.number().int().min(1).max(65535).optional(),
    // Optional per-client engagement pricing for the portal's next-steps page.
    pricing: z.array(PricingTierZ).optional(),
    // Optional locality fields consumed by the `local` audit pass. All
    // additive: existing configs without them parse exactly as before.
    city: z.string().optional(),
    region: z.string().optional(),
    serviceArea: z.array(z.string()).optional(),
    localBusiness: z.boolean().optional(),
  })
  // passthrough so we don't break on fields not yet in this schema. Required
  // fields are still validated.
  .passthrough();
