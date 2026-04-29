import { z } from 'zod';

/**
 * Runtime-validating Zod schemas for the structured data Firecrawl extracts
 * per page. Mirrors the JSON Schemas in extraction-schemas.ts but actually
 * runs against returned values to keep malformed/changed responses from
 * silently corrupting downstream audit passes.
 */

export const CtaButtonZ = z.object({
  text: z.string(),
  href: z.string(),
  type: z.enum(['primary', 'secondary', 'link']).optional(),
  location: z.string().optional(),
});

export const ContactZ = z
  .object({
    phone: z.string().optional(),
    email: z.string().optional(),
    address: z.string().optional(),
    hours: z.string().optional(),
  })
  .partial();

export const TeamMemberZ = z.object({
  name: z.string(),
  role: z.string().optional(),
});

export const TestimonialZ = z.object({
  quote: z.string(),
  attribution: z.string().optional(),
});

export const FaqZ = z.object({
  question: z.string(),
  answer: z.string(),
});

export const PricingItemZ = z.object({
  item: z.string(),
  price: z.string().optional(),
  description: z.string().optional(),
});

export const SocialLinkZ = z.object({
  platform: z.string(),
  url: z.string(),
});

export const EventSpaceZ = z.object({
  name: z.string().optional(),
  capacity: z.union([z.number(), z.string()]).optional(),
  description: z.string().optional(),
}).passthrough();

export const ExtractedZ = z.object({
  ctaButtons: z.array(CtaButtonZ).default([]),
  contact: ContactZ.default({}),
  teamMembers: z.array(TeamMemberZ).default([]),
  testimonials: z.array(TestimonialZ).default([]),
  faqs: z.array(FaqZ).default([]),
  pricing: z.array(PricingItemZ).default([]),
  socialLinks: z.array(SocialLinkZ).default([]),
  eventSpaces: z.array(EventSpaceZ).default([]),
});

export type Extracted = z.infer<typeof ExtractedZ>;

/**
 * Filter-style coercion: parse element-by-element and drop failures rather
 * than rejecting the whole array. Returns the cleaned array and a count of
 * skipped elements so callers can log.
 */
export function coerceArray<T>(
  raw: unknown,
  schema: z.ZodType<T>,
): { items: T[]; skipped: number } {
  if (!Array.isArray(raw)) return { items: [], skipped: 0 };
  const items: T[] = [];
  let skipped = 0;
  for (const el of raw) {
    const r = schema.safeParse(el);
    if (r.success) items.push(r.data);
    else skipped++;
  }
  return { items, skipped };
}
