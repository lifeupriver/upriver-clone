import type { ClientIntake } from '@upriver/core';
import {
  conflictEntry,
  createEmptyProfile,
  mergeCandidate,
  type AuditDecisions,
  type AuditDecisionsSection,
  type Candidate,
  type ClientProfile,
  type ConflictEntry,
  type ProfileField,
} from '@upriver/schemas';

import { resolveClientDataSource } from '../generate/data-source.js';
import { bumpMeta, readProfile } from '../generate/profile-io.js';

/** Path of the legacy intake artifact, relative to `clients/<slug>/`. */
export const LEGACY_INTAKE_PATH = 'intake.json';

/**
 * Strip a legacy `ClientIntake` down to the profile's `auditDecisions` value:
 * the version envelope and `updatedAt` are dropped (the profile envelope carries
 * provenance + its own `updatedAt`). The migration is a copy, not a transform.
 */
export function clientIntakeToAuditDecisions(intake: ClientIntake): AuditDecisions {
  return {
    findingDecisions: intake.findingDecisions,
    pageWants: intake.pageWants,
    referenceSites: intake.referenceSites,
    scopeTier: intake.scopeTier,
    submittedAt: intake.submittedAt,
  };
}

/**
 * Reconstruct the legacy `ClientIntake` shape from a profile's `auditDecisions`
 * section. `version` is constant `1`; `updatedAt` comes from the envelope (the
 * timestamp the legacy `updatedAt` carried). Keys are emitted in the canonical
 * `ClientIntake` order so a downstream `JSON.stringify` is byte-identical to the
 * legacy file — the dashboard API contract depends on this.
 */
export function auditDecisionsToClientIntake(section: AuditDecisionsSection): ClientIntake {
  const v = section.value as AuditDecisions;
  return {
    version: 1,
    findingDecisions: v.findingDecisions,
    pageWants: v.pageWants,
    referenceSites: v.referenceSites,
    scopeTier: v.scopeTier,
    submittedAt: v.submittedAt,
    updatedAt: section.updatedAt,
  };
}

/** Structural deep-equality for plain JSON values (objects, arrays, primitives). */
function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (Array.isArray(a) || Array.isArray(b)) {
    if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
    return a.every((x, i) => deepEqual(x, b[i]));
  }
  if (typeof a === 'object' && typeof b === 'object') {
    const ao = a as Record<string, unknown>;
    const bo = b as Record<string, unknown>;
    const ak = Object.keys(ao);
    const bk = Object.keys(bo);
    if (ak.length !== bk.length) return false;
    return ak.every((k) => k in bo && deepEqual(ao[k], bo[k]));
  }
  return false;
}

/**
 * The outcome of folding a legacy `intake.json` into a profile's
 * `auditDecisions`. Pure planning — the command performs the I/O.
 *
 * - `apply`    — write `toWrite` (the merged, revision-bumped profile).
 * - `noop`     — the profile already carries an equal value; nothing to do.
 * - `conflict` — the profile already carries a *differing* value; queue
 *                `conflict` and leave the profile untouched (never overwrite).
 */
export type MigrationPlan =
  | { kind: 'apply'; toWrite: ClientProfile; before: AuditDecisions | null; after: AuditDecisions }
  | { kind: 'noop' }
  | { kind: 'conflict'; conflict: ConflictEntry };

/**
 * Decide how to fold `legacy` into `existing`'s `auditDecisions` (spec §1.2).
 *
 * `auditDecisions` is wrapped as an operator-sourced unit. An operator candidate
 * always wins under `mergeCandidate`'s precedence, so to honor the spec's
 * "do not overwrite a differing section" we guard explicitly: an existing,
 * non-null, *differing* value becomes a queued conflict rather than an
 * overwrite. Equal values are a no-op; absent values apply (creating an empty
 * profile when none exists). The envelope's `updatedAt` preserves the legacy
 * `updatedAt`; `_meta` carries the migration timestamp.
 */
export function planMigration(
  existing: ClientProfile | null,
  legacy: ClientIntake,
  slug: string,
  now: string,
): MigrationPlan {
  const after = clientIntakeToAuditDecisions(legacy);
  const candidate: Candidate<AuditDecisions> = { value: after, source: 'operator' };

  const existingEnv = existing?.auditDecisions;
  if (existingEnv && existingEnv.value != null) {
    if (deepEqual(existingEnv.value, after)) return { kind: 'noop' };
    return {
      kind: 'conflict',
      conflict: conflictEntry(
        'auditDecisions',
        {
          existing: existingEnv as unknown as ProfileField<unknown>,
          candidate: candidate as Candidate<unknown>,
        },
        now,
      ),
    };
  }

  // Apply. mergeCandidate against an empty slot is always `applied`; passing the
  // legacy `updatedAt` as `now` stamps the envelope with the intake's own time.
  const outcome = mergeCandidate(undefined, candidate, legacy.updatedAt);
  const field = outcome.kind === 'applied' ? outcome.field : undefined;
  /* c8 ignore next */
  if (!field) throw new Error('unreachable: empty-slot merge did not apply');

  const base = existing ?? createEmptyProfile(slug, now);
  const next: ClientProfile = { ...base, auditDecisions: field };
  return {
    kind: 'apply',
    toWrite: bumpMeta(next, now),
    before: existingEnv?.value ?? null,
    after,
  };
}

/**
 * Read the persisted client intake for a slug, profile-first.
 *
 * Returns the profile's `auditDecisions` reconstructed as a `ClientIntake` when
 * present; otherwise falls back to the legacy `clients/<slug>/intake.json`.
 * Returns `null` when neither exists. The legacy fallback is read through the
 * data source and warns (not throws) on a malformed file, so a legacy-only
 * client behaves bit-identically to the pre-migration reader.
 */
export async function readIntake(slug: string): Promise<ClientIntake | null> {
  const ds = resolveClientDataSource();

  const profile = await readProfile(ds, slug);
  const section = profile?.auditDecisions;
  if (section && section.value != null) {
    return auditDecisionsToClientIntake(section);
  }

  const raw = await ds.readClientFileText(slug, LEGACY_INTAKE_PATH);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as ClientIntake;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[intake-reader] failed to parse ${slug}/${LEGACY_INTAKE_PATH}: ${msg}`);
    return null;
  }
}
