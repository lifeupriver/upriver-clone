import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { clientDir } from '@upriver/core';
import type { ClientIntake } from '@upriver/core';

/**
 * Resolve the clients base directory, honoring the `UPRIVER_CLIENTS_DIR`
 * environment override (matches the convention used elsewhere in the CLI).
 *
 * @returns Absolute or relative path to the clients base directory.
 */
function resolveClientsBase(): string {
  return process.env['UPRIVER_CLIENTS_DIR'] ?? './clients';
}

/**
 * Read the `intake.json` for a client. Returns null if the file is absent or
 * unparseable. Logs to `console.warn` on parse failure so the operator knows
 * the file is malformed (we don't want a silent miss).
 *
 * @param slug - Client slug; resolves to `<base>/<slug>/intake.json`.
 * @returns Parsed `ClientIntake`, or null if the file is missing or invalid.
 */
export function readIntake(slug: string): ClientIntake | null {
  const path = join(clientDir(slug, resolveClientsBase()), 'intake.json');
  if (!existsSync(path)) return null;
  let raw: string;
  try {
    raw = readFileSync(path, 'utf8');
  } catch {
    return null;
  }
  try {
    return JSON.parse(raw) as ClientIntake;
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(`[intake-reader] failed to parse ${path}: ${msg}`);
    return null;
  }
}
