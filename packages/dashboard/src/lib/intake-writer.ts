import type { ClientIntake } from '@upriver/core';
import type { ClientDataSource } from '@upriver/core/data';
import {
  clientProfileZ,
  createEmptyProfile,
  mergeCandidate,
  type AuditDecisions,
  type AuditDecisionsSection,
  type Candidate,
  type ClientProfile,
} from '@upriver/schemas';

import { resolveClientDataSource } from './data-source.js';

/**
 * Build a fresh, empty `ClientIntake` skeleton.
 *
 * Used as the base for the first POST from the intake form when no prior
 * `intake.json` exists. `submittedAt` stays null until the first write —
 * `/api/intake/[slug]` flips it on successful save.
 *
 * @returns A new `ClientIntake` with `version: 1`, empty maps/arrays,
 *          `scopeTier: null`, `submittedAt: null`, and `updatedAt = now`.
 */
export function emptyIntake(): ClientIntake {
  return {
    version: 1,
    findingDecisions: {},
    pageWants: {},
    referenceSites: [],
    scopeTier: null,
    submittedAt: null,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Strip a `ClientIntake` to the profile's `auditDecisions` value: the version
 * envelope and `updatedAt` are dropped (the profile envelope carries provenance
 * and its own `updatedAt`). Kept in lockstep with the CLI's `intake-reader.ts`.
 */
function clientIntakeToAuditDecisions(intake: ClientIntake): AuditDecisions {
  return {
    findingDecisions: intake.findingDecisions,
    pageWants: intake.pageWants,
    referenceSites: intake.referenceSites,
    scopeTier: intake.scopeTier,
    submittedAt: intake.submittedAt,
  };
}

/** Read + validate `profile.json` through the data source; `null` if absent. */
async function readProfile(ds: ClientDataSource, slug: string): Promise<ClientProfile | null> {
  const text = await ds.readClientFileText(slug, 'profile.json');
  if (text === null) return null;
  return clientProfileZ.parse(JSON.parse(text));
}

/** Persist a profile (the caller owns `_meta`). */
async function writeProfile(ds: ClientDataSource, slug: string, profile: ClientProfile): Promise<void> {
  await ds.writeClientFile(slug, 'profile.json', `${JSON.stringify(profile, null, 2)}\n`);
}

/**
 * Persist a `ClientIntake` via the configured data source, dual-writing during
 * the migration freeze period:
 *
 *  1. **Profile (canonical).** Fold the intake into the profile's
 *     `auditDecisions` section through the shared `mergeCandidate` path, source
 *     `operator`, with a revision bump. The envelope's `updatedAt` is stamped
 *     with the *intake's own* `updatedAt` — the invariant that keeps a
 *     reconstructed read byte-identical to the legacy mirror and to this write's
 *     own response.
 *  2. **Legacy mirror.** Write `intake.json` byte-for-byte as before, so an
 *     un-migrated CLI consumer on an old checkout still functions.
 *
 * An `operator` candidate always applies under the merge rules, so a write is
 * never silently dropped.
 *
 * @param slug - Client slug.
 * @param intake - The intake document to persist (its `updatedAt` is authoritative).
 */
export async function writeIntake(slug: string, intake: ClientIntake): Promise<void> {
  const ds = resolveClientDataSource();
  const stamp = intake.updatedAt;

  // 1. Profile (canonical store).
  const candidate: Candidate<AuditDecisions> = {
    value: clientIntakeToAuditDecisions(intake),
    source: 'operator',
  };
  const base = (await readProfile(ds, slug)) ?? createEmptyProfile(slug, stamp);
  const outcome = mergeCandidate(base.auditDecisions, candidate, stamp);
  const field: AuditDecisionsSection =
    outcome.kind === 'applied'
      ? (outcome.field as AuditDecisionsSection)
      : // Unreachable for an operator candidate; build directly rather than drop the write.
        { value: candidate.value, source: 'operator', confidence: 'high', verified: false, updatedAt: stamp };
  const next: ClientProfile = {
    ...base,
    auditDecisions: field,
    _meta: { ...base._meta, revision: base._meta.revision + 1, updatedAt: stamp },
  };
  await writeProfile(ds, slug, next);

  // 2. Legacy mirror (frozen fallback during the migration window).
  await ds.writeClientFile(slug, 'intake.json', `${JSON.stringify(intake, null, 2)}\n`);
}
