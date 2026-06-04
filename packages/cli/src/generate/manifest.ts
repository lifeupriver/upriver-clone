import { createHash } from 'node:crypto';

import type { ClientDataSource } from '@upriver/core/data';
import type { DeliverableId } from '@upriver/schemas';

/** `clients/<slug>/docs/manifest.json` — tracks generated docs and approvals. */
export const MANIFEST_PATH = 'docs/manifest.json';

export interface ManifestEntry {
  id: DeliverableId;
  /** Client-artifact path of the generated doc, e.g. `docs/doc-01-brand-voice-guide.md`. */
  path: string;
  generatedAt: string;
  specHash: string;
  profileSliceHash: string;
  markers: number;
  /** Approval at the Continue gate is what counts a doc as "generated" for downstream deps. */
  approved: boolean;
}

export interface Manifest {
  version: 1;
  docs: Record<string, ManifestEntry>;
}

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

/** Approved deliverable ids — the "generated" set passed to `deliverableReadiness`. */
export function generatedIds(manifest: Manifest): DeliverableId[] {
  return Object.values(manifest.docs)
    .filter((e) => e.approved)
    .map((e) => e.id);
}

export function upsertEntry(manifest: Manifest, entry: ManifestEntry): Manifest {
  return { version: 1, docs: { ...manifest.docs, [entry.id]: entry } };
}

export function setApproved(manifest: Manifest, id: string, approved: boolean): Manifest {
  const entry = manifest.docs[id];
  if (!entry) return manifest;
  return { version: 1, docs: { ...manifest.docs, [id]: { ...entry, approved } } };
}
