import { z } from 'zod';
import { profileFieldZ } from '../envelope.js';

/**
 * Per-finding decision recorded by a client during intake. Mirrors
 * `FindingDecision` in `@upriver/core` (`packages/core/src/types/intake.ts`).
 */
export const findingDecisionZ = z.enum(['fix', 'skip', 'discuss']);
export type FindingDecision = z.infer<typeof findingDecisionZ>;

/** Scope tier the client believes fits. Mirrors `ScopeTier` in core. */
export const scopeTierZ = z.enum(['polish', 'rebuild', 'rebuild-plus-content']);
export type ScopeTier = z.infer<typeof scopeTierZ>;

/**
 * The migrated `ClientIntake`, shapes preserved minus the version envelope
 * (PRD "Relationship to the existing intake/interview layer"; spec §6). Kept as
 * a plain object so the M4 migration is a copy, not a transform.
 */
export const auditDecisionsZ = z.object({
  findingDecisions: z.record(z.string(), findingDecisionZ),
  pageWants: z.record(z.string(), z.string()),
  referenceSites: z.array(z.string()),
  scopeTier: scopeTierZ.nullable(),
  submittedAt: z.string().nullable(),
});
export type AuditDecisions = z.infer<typeof auditDecisionsZ>;

/**
 * `auditDecisions` — the one section NOT leaf-wrapped. It is already
 * operator-confirmed client intent, so it is wrapped as a whole; the envelope's
 * own `updatedAt` supplies the timestamp the legacy `updatedAt` carried.
 */
export const auditDecisionsSectionZ = profileFieldZ(auditDecisionsZ);
export type AuditDecisionsSection = z.infer<typeof auditDecisionsSectionZ>;
