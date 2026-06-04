import { clientProfileZ, type ClientProfile, type ConflictEntry } from '@upriver/schemas';
import type { ClientDataSource } from '@upriver/core/data';

/** Client-artifact paths, relative to `clients/<slug>/`. */
export const PROFILE_PATH = 'profile.json';
export const CONFLICTS_PATH = 'profile-conflicts.json';

/**
 * Read and validate `clients/<slug>/profile.json` through the data source.
 * Returns `null` if absent; throws (with grouped zod issues left to the caller)
 * if present but invalid.
 */
export async function readProfile(
  ds: ClientDataSource,
  slug: string,
): Promise<ClientProfile | null> {
  const text = await ds.readClientFileText(slug, PROFILE_PATH);
  if (text === null) return null;
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch (err) {
    throw new Error(`${slug}/${PROFILE_PATH} is not valid JSON: ${(err as Error).message}`);
  }
  return clientProfileZ.parse(json);
}

/** Persist a profile exactly as given (the caller owns `_meta`). */
export async function writeProfile(
  ds: ClientDataSource,
  slug: string,
  profile: ClientProfile,
): Promise<void> {
  await ds.writeClientFile(slug, PROFILE_PATH, JSON.stringify(profile, null, 2) + '\n');
}

/**
 * Return a copy with `_meta.revision` incremented and `updatedAt` set — the
 * bump applied on every persisted update write (spec §2). Pure.
 */
export function bumpMeta(profile: ClientProfile, now: string): ClientProfile {
  return {
    ...profile,
    _meta: { ...profile._meta, revision: profile._meta.revision + 1, updatedAt: now },
  };
}

/** Read the conflict queue (for `profile show`-style reporting). `[]` if absent. */
export async function readConflicts(
  ds: ClientDataSource,
  slug: string,
): Promise<ConflictEntry[]> {
  const text = await ds.readClientFileText(slug, CONFLICTS_PATH);
  if (text === null) return [];
  try {
    return JSON.parse(text) as ConflictEntry[];
  } catch {
    return [];
  }
}

/** Append conflict entries to `clients/<slug>/profile-conflicts.json`. */
export async function appendConflicts(
  ds: ClientDataSource,
  slug: string,
  entries: ConflictEntry[],
): Promise<void> {
  if (entries.length === 0) return;
  const prior = await readConflicts(ds, slug);
  const all = [...prior, ...entries];
  await ds.writeClientFile(slug, CONFLICTS_PATH, JSON.stringify(all, null, 2) + '\n');
}
