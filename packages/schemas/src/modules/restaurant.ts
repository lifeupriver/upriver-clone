import { z } from 'zod';

/**
 * Restaurant module — typed stub (maps to the `restaurant` vertical in
 * `client-config.ts`). Present so `modules` typing and the vertical-enum
 * alignment are real from day one.
 *
 * TODO (Build Spec 02+): concrete slots — seating/covers capacity, service
 * periods and hours, reservation platform, menu + dietary/allergen handling,
 * private-event and catering capacity, health-inspection grade.
 */
export const restaurantModuleZ = z.object({}).passthrough();
export type RestaurantModule = z.infer<typeof restaurantModuleZ>;
