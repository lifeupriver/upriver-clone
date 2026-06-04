import { z } from 'zod';

/**
 * Venue module — typed stub (maps to the `wedding-venue` vertical in
 * `client-config.ts`). Present so `modules` typing and the vertical-enum
 * alignment are real from day one; the venue archetype is already implicit in
 * the core extraction (guest counts in `capacity`, preferred vendors in
 * `content.vendorNetwork`, The Knot in `competitors`).
 *
 * TODO (Build Spec 02+): concrete slots — guest-count tiers per space,
 * preferred/required vendor lists, in-house vs BYO catering and bar policy,
 * rain plan, noise ordinance / curfew, ceremony+reception layouts.
 */
export const venueModuleZ = z.object({}).passthrough();
export type VenueModule = z.infer<typeof venueModuleZ>;
