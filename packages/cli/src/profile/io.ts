import type { ClientDataSource } from '@upriver/core/data';
import type { ConflictEntry } from '@upriver/schemas';

import { CONFLICTS_PATH } from '../generate/profile-io.js';

/**
 * Overwrite the conflict queue at `clients/<slug>/profile-conflicts.json`.
 * `profile-io`'s `appendConflicts` only ever appends; `conflicts --resolve` and
 * the sync commands need to rewrite the trimmed queue.
 */
export async function writeConflicts(
  ds: ClientDataSource,
  slug: string,
  entries: ConflictEntry[],
): Promise<void> {
  await ds.writeClientFile(slug, CONFLICTS_PATH, `${JSON.stringify(entries, null, 2)}\n`);
}
