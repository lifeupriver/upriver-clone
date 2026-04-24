import { defineCollection, z } from 'astro:content';

const pages = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    heroHeadline: z.string().optional(),
    heroSubhead: z.string().optional(),
    ctaLabel: z.string().optional(),
    ctaHref: z.string().optional(),
    order: z.number().optional(),
  }),
});

const testimonials = defineCollection({
  type: 'data',
  schema: z.object({
    quote: z.string(),
    author: z.string(),
    role: z.string().optional(),
    company: z.string().optional(),
    avatar: z.string().optional(),
  }),
});

const faqs = defineCollection({
  type: 'data',
  schema: z.object({
    question: z.string(),
    answer: z.string(),
    order: z.number().optional(),
  }),
});

const team = defineCollection({
  type: 'data',
  schema: z.object({
    name: z.string(),
    role: z.string(),
    bio: z.string().optional(),
    photo: z.string().optional(),
    order: z.number().optional(),
  }),
});

export const collections = { pages, testimonials, faqs, team };
