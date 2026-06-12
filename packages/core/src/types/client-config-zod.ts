import { z } from 'zod';

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
    vertical: z
      .enum(['wedding-venue', 'preschool', 'restaurant', 'professional-services', 'generic'])
      .optional(),
    created_at: z.string(),
    gsc: GscConfigZ.optional(),
    vercel_preview_url: z.string().url().optional(),
    github_repo: z.string().optional(),
    supabase_project_ref: z.string().optional(),
    dev_port: z.number().int().min(1).max(65535).optional(),
    // Optional per-client engagement pricing for the portal's next-steps page.
    pricing: z.array(PricingTierZ).optional(),
  })
  // passthrough so we don't break on fields not yet in this schema. Required
  // fields are still validated.
  .passthrough();
