import { z } from 'zod';
import { identitySectionZ, type IdentitySection } from './sections/identity.js';
import { peopleSectionZ, type PeopleSection } from './sections/people.js';
import { offeringsSectionZ, type OfferingsSection } from './sections/offerings.js';
import { pricingSectionZ, type PricingSection } from './sections/pricing.js';
import { capacitySectionZ, type CapacitySection } from './sections/capacity.js';
import { customersSectionZ, type CustomersSection } from './sections/customers.js';
import { positioningSectionZ, type PositioningSection } from './sections/positioning.js';
import { voiceSectionZ, type VoiceSection } from './sections/voice.js';
import { salesProcessSectionZ, type SalesProcessSection } from './sections/salesProcess.js';
import { contentSectionZ, type ContentSection } from './sections/content.js';
import { competitorsSectionZ, type CompetitorsSection } from './sections/competitors.js';
import { seoSectionZ, type SeoSection } from './sections/seo.js';
import { toolsAndAccessSectionZ, type ToolsAndAccessSection } from './sections/toolsAndAccess.js';
import {
  operationsAutomationSectionZ,
  type OperationsAutomationSection,
} from './sections/operationsAutomation.js';
import { governanceSectionZ, type GovernanceSection } from './sections/governance.js';
import { goalsSectionZ, type GoalsSection } from './sections/goals.js';
import { auditDecisionsSectionZ, type AuditDecisionsSection } from './sections/auditDecisions.js';
import { preschoolModuleZ } from './modules/preschool.js';
import { venueModuleZ } from './modules/venue.js';
import { contractorModuleZ } from './modules/contractor.js';
import { restaurantModuleZ } from './modules/restaurant.js';

/**
 * Document metadata. `revision` increments on every persisted write so callers
 * can detect concurrent modification and re-merge (spec §2); `version` is the
 * schema version, bumped on breaking changes.
 */
export const profileMetaZ = z.object({
  version: z.literal(1),
  slug: z.string().min(1),
  createdAt: z.string(),
  updatedAt: z.string(),
  revision: z.number().int().nonnegative(),
});
export type ProfileMeta = z.infer<typeof profileMetaZ>;

/** Industry modules — add fields, never fork the core (PRD §2.3). */
export const modulesZ = z
  .object({
    preschool: preschoolModuleZ.optional(),
    venue: venueModuleZ.optional(),
    contractor: contractorModuleZ.optional(),
    restaurant: restaurantModuleZ.optional(),
  })
  .passthrough();
export type Modules = z.infer<typeof modulesZ>;

/**
 * The Client Profile — the contract for `clients/<slug>/profile.json`.
 *
 * The type is written explicitly from the per-section types (rather than
 * `z.infer` of the composed schema) so its declaration stays serializable: the
 * fully-inferred 17-section envelope type is far too large for `.d.ts` emit
 * (TS7056). `_meta` is required; every section is optional — a profile is valid
 * at any fill level, and coverage (not validity) reports what is missing.
 */
export interface ClientProfile {
  _meta: ProfileMeta;
  identity?: IdentitySection;
  people?: PeopleSection;
  offerings?: OfferingsSection;
  pricing?: PricingSection;
  capacity?: CapacitySection;
  customers?: CustomersSection;
  positioning?: PositioningSection;
  voice?: VoiceSection;
  salesProcess?: SalesProcessSection;
  content?: ContentSection;
  competitors?: CompetitorsSection;
  seo?: SeoSection;
  toolsAndAccess?: ToolsAndAccessSection;
  operationsAutomation?: OperationsAutomationSection;
  governance?: GovernanceSection;
  goals?: GoalsSection;
  auditDecisions?: AuditDecisionsSection;
  modules?: Modules;
}

/**
 * Runtime schema. Composed in spec §3 build order. Kept internal so its
 * oversized inferred type never reaches the public API surface; the exported
 * `clientProfileZ` is the same runtime value under a compact annotation, so
 * `.parse`, `.safeParse`, and AST introspection all behave normally.
 */
const clientProfileSchema = z
  .object({
    _meta: profileMetaZ,
    identity: identitySectionZ.optional(),
    people: peopleSectionZ.optional(),
    offerings: offeringsSectionZ.optional(),
    pricing: pricingSectionZ.optional(),
    capacity: capacitySectionZ.optional(),
    customers: customersSectionZ.optional(),
    positioning: positioningSectionZ.optional(),
    voice: voiceSectionZ.optional(),
    salesProcess: salesProcessSectionZ.optional(),
    content: contentSectionZ.optional(),
    competitors: competitorsSectionZ.optional(),
    seo: seoSectionZ.optional(),
    toolsAndAccess: toolsAndAccessSectionZ.optional(),
    operationsAutomation: operationsAutomationSectionZ.optional(),
    governance: governanceSectionZ.optional(),
    goals: goalsSectionZ.optional(),
    auditDecisions: auditDecisionsSectionZ.optional(),
    modules: modulesZ.optional(),
  })
  .passthrough();

export const clientProfileZ = clientProfileSchema as unknown as z.ZodType<
  ClientProfile,
  z.ZodTypeDef,
  unknown
>;

/** A fresh, empty profile — `_meta` only, revision 0. Callers persist it. */
export function createEmptyProfile(slug: string, now: string): ClientProfile {
  return { _meta: { version: 1, slug, createdAt: now, updatedAt: now, revision: 0 } };
}
