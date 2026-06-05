import { createHash } from 'node:crypto';

import type { ClientDataSource } from '@upriver/core/data';
import { generatedIds, type Manifest, type ManifestEntry } from '@upriver/schemas';

// The manifest shape + the approved-set derivation are the shared coverage
// contract (promoted to @upriver/schemas with `buildShowModel` — Build Spec 06).
// Re-exported here so the generate engine's existing imports keep resolving.
export { generatedIds, type Manifest, type ManifestEntry };

/** `clients/<slug>/docs/manifest.json` — tracks generated docs and approvals. */
export const MANIFEST_PATH = 'docs/manifest.json';

/** Stable short content hash, used for change detection (spec §4). */
export function hashContent(s: string): string {
  return createHash('sha256').update(s).digest('hex').slice(0, 16);
}

export async function readManifest(ds: ClientDataSource, slug: string): Promise<Manifest> {
  const text = await ds.readClientFileText(slug, MANIFEST_PATH);
  if (text === null) return { version: 1, docs: {} };
  try {
    const parsed = JSON.parse(text) as Partial<Manifest>;
    return parsed.docs ? { version: 1, docs: parsed.docs } : { version: 1, docs: {} };
  } catch {
    return { version: 1, docs: {} };
  }
}

export async function writeManifest(
  ds: ClientDataSource,
  slug: string,
  manifest: Manifest,
): Promise<void> {
  await ds.writeClientFile(slug, MANIFEST_PATH, JSON.stringify(manifest, null, 2) + '\n');
}

export function upsertEntry(manifest: Manifest, entry: ManifestEntry): Manifest {
  return { version: 1, docs: { ...manifest.docs, [entry.id]: entry } };
}

export function setApproved(manifest: Manifest, id: string, approved: boolean): Manifest {
  const entry = manifest.docs[id];
  if (!entry) return manifest;
  return { version: 1, docs: { ...manifest.docs, [id]: { ...entry, approved } } };
}
