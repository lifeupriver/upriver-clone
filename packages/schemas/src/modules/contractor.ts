import { z } from 'zod';

/**
 * Contractor module — typed stub. Present so `modules` typing is real from day
 * one.
 *
 * TODO (Build Spec 02+): concrete slots — project size range and typical
 * ticket, trade licenses and bonding/insurance, service radius, lead-time and
 * crew capacity, warranty terms, permit handling.
 */
export const contractorModuleZ = z.object({}).passthrough();
export type ContractorModule = z.infer<typeof contractorModuleZ>;
