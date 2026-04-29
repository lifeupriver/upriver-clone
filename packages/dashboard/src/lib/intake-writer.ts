import type { ClientIntake } from '@upriver/core';

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
 * Persist a `ClientIntake` to `clients/<slug>/intake.json` via the configured
 * data source. The caller is responsible for ensuring the slug exists (in
 * practice, the API handler checks `clientExists` first).
 *
 * @param slug - Client slug.
 * @param intake - The intake document to persist.
 */
export async function writeIntake(slug: string, intake: ClientIntake): Promise<void> {
  await resolveClientDataSource().writeClientFile(
    slug,
    'intake.json',
    `${JSON.stringify(intake, null, 2)}\n`,
  );
}
