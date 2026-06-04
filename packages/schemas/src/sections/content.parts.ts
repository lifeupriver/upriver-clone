import { z } from 'zod';

/** A count of assets in a category (photos or videos). */
export const categoryCountZ = z.object({
  category: z.string(),
  count: z.number().optional(),
});

/** A testimonial, grouped by theme, with the use cases it supports. */
export const testimonialZ = z.object({
  quote: z.string(),
  attribution: z.string().optional(),
  theme: z.string().optional(),
  useCases: z.array(z.string()).optional(),
});

/** A review platform and the standing on it. */
export const reviewPlatformZ = z.object({
  platform: z.string(),
  count: z.number().optional(),
  rating: z.number().optional(),
  responseRate: z.string().optional(),
});

/** A vendor or partner, and whether they can be featured. */
export const vendorZ = z.object({
  vendor: z.string(),
  category: z.string().optional(),
  featurable: z.boolean().optional(),
});

/** Written-content inventory. */
export const writtenContentZ = z.object({
  blogCount: z.number().optional(),
  blogRange: z.string().optional(),
  cadence: z.string().optional(),
  topPosts: z.array(z.string()).optional(),
  longForm: z.array(z.string()).optional(),
  existingFaq: z.array(z.string()).optional(),
  press: z.array(z.string()).optional(),
  newsletter: z.string().optional(),
});

/** Visual brand assets, including the hex palette. */
export const visualBrandAssetsZ = z.object({
  logos: z.array(z.string()).optional(),
  palette: z.array(z.string()).optional(),
  typography: z.array(z.string()).optional(),
  templates: z.array(z.string()).optional(),
  brandGuidelinesDoc: z.string().optional(),
});

/** Who makes content and how much time they have (interview-sourced). */
export const productionCapacityZ = z.object({
  whoCreates: z.array(z.string()).optional(),
  hoursPerWeek: z.string().optional(),
});
