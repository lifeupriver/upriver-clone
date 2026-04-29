import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ClientIntake } from '@upriver/core';
import { getClientsBase } from './fs-reader.js';

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
 * Persist a `ClientIntake` to `clients/<slug>/intake.json`.
 *
 * Writes pretty-printed JSON synchronously; matches the rest of the dashboard's
 * sync IO style. The caller is responsible for ensuring the client directory
 * already exists (in practice, the API handler checks `clientExists` first).
 *
 * @param slug - Client slug (directory name under the clients base path).
 * @param intake - The intake document to persist.
 */
export function writeIntake(slug: string, intake: ClientIntake): void {
  const path = join(getClientsBase(), slug, 'intake.json');
  writeFileSync(path, `${JSON.stringify(intake, null, 2)}\n`, 'utf8');
}
