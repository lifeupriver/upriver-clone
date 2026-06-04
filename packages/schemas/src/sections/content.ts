import { z } from 'zod';
import { field } from '../envelope.js';
import {
  categoryCountZ,
  testimonialZ,
  reviewPlatformZ,
  vendorZ,
  writtenContentZ,
  visualBrandAssetsZ,
  productionCapacityZ,
} from './content.parts.js';

export * from './content.parts.js';

/**
 * `content` — photo/video/written inventory, testimonials, reviews, brand
 * assets, vendor network, and production capacity/gaps (PRD §2.2).
 * `photos.rights` and `videos.rights` are HV (legal — photographer/producer
 * usage rights); production capacity is interview-only (owners overestimate).
 */
export const contentSectionZ = z
  .object({
    photos: z.object({
      storage: field(z.string()),
      access: field(z.string()),
      counts: field(z.array(categoryCountZ)),
      categories: field(z.array(z.string())),
      heroShots: field(z.array(z.string())),
      rights: field(z.string()), // HV — legal
      gaps: field(z.array(z.string())),
    }).optional(),
    videos: z.object({
      storage: field(z.string()),
      counts: field(z.array(categoryCountZ)),
      categories: field(z.array(z.string())),
      muxIds: field(z.array(z.string())),
      rights: field(z.string()), // HV — legal
    }).optional(),
    written: field(writtenContentZ),
    testimonials: field(z.array(testimonialZ)),
    reviewPlatforms: field(z.array(reviewPlatformZ)),
    criticalReviewThemes: field(z.array(z.string())),
    visualBrandAssets: field(visualBrandAssetsZ),
    vendorNetwork: field(z.array(vendorZ)),
    performingThemes: field(z.array(z.string())),
    productionCapacity: field(productionCapacityZ),
    productionGaps: field(z.array(z.string())),
    ninetyDayPriorities: field(z.array(z.string())),
  })
  .passthrough();

export type ContentSection = z.infer<typeof contentSectionZ>;
