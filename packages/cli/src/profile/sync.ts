import type { ClientDataSource } from '@upriver/core/data';
import type { ConflictEntry } from '@upriver/schemas';

import { readManifest, writeManifest } from '../generate/manifest.js';
import { mergeProfiles } from '../generate/profile-merge.js';
import { appendConflicts, bumpMeta, readProfile, writeProfile } from '../generate/profile-io.js';

export interface SyncResult {
  direction: 'pull' | 'push';
  sourceKind: string;
  destKind: string;
  mode: 'created' | 'merged';
  applied: number;
  unchanged: number;
  /** Newly queued conflicts (also appended to the destination's queue). */
  conflicts: ConflictEntry[];
  manifest: 'none' | 'copied' | 'diverged-copied';
  docCount: { source: number; dest: number };
}

async function countDocs(ds: ClientDataSource, slug: string): Promise<number> {
  return (await ds.listClientFiles(slug, 'docs')).filter((f) => f.endsWith('.md')).length;
}

/** Copy the manifest source→dest (source wins); flag divergence for a warning. */
async function syncManifest(
  source: ClientDataSource,
  dest: ClientDataSource,
  slug: string,
): Promise<SyncResult['manifest']> {
  const srcM = await readManifest(source, slug);
  const destM = await readManifest(dest, slug);
  if (Object.keys(srcM.docs).length === 0 && Object.keys(destM.docs).length === 0) return 'none';
  const diverged = JSON.stringify(srcM.docs) !== JSON.stringify(destM.docs);
  await writeManifest(dest, slug, srcM);
  return diverged ? 'diverged-copied' : 'copied';
}

/**
 * Copy a profile between the two data sources for the offline-divergence case
 * (spec 01 §2). `pull` is remote→local, `push` is local→remote. The profile is
 * merged with `mergeProfiles` (never a silent overwrite — conflicts queue to the
 * destination exactly as `import` does). The docs manifest is copied source-wins
 * with a divergence flag; `profile-conflicts.json` is the merge queue. Generated
 * doc files are NOT synced here (use `upriver sync pull/push` storage tooling) —
 * a source/dest count diff is reported.
 */
export async function syncProfile(
  direction: 'pull' | 'push',
  slug: string,
  sources: { local: ClientDataSource; remote: ClientDataSource },
  now: string,
): Promise<SyncResult> {
  const source = direction === 'pull' ? sources.remote : sources.local;
  const dest = direction === 'pull' ? sources.local : sources.remote;

  const srcProfile = await readProfile(source, slug);
  if (!srcProfile) {
    throw new Error(`No profile at the ${source.kind} source for "${slug}" — nothing to ${direction}.`);
  }
  const destProfile = await readProfile(dest, slug);

  const base: Omit<SyncResult, 'mode' | 'applied' | 'unchanged' | 'conflicts'> = {
    direction,
    sourceKind: source.kind,
    destKind: dest.kind,
    manifest: 'none',
    docCount: { source: 0, dest: 0 },
  };

  let partial: Pick<SyncResult, 'mode' | 'applied' | 'unchanged' | 'conflicts'>;
  if (!destProfile) {
    await writeProfile(dest, slug, srcProfile);
    partial = { mode: 'created', applied: 0, unchanged: 0, conflicts: [] };
  } else {
    const merge = mergeProfiles(destProfile, srcProfile, now);
    await writeProfile(dest, slug, bumpMeta(merge.profile, now));
    if (merge.conflicts.length > 0) await appendConflicts(dest, slug, merge.conflicts);
    partial = {
      mode: 'merged',
      applied: merge.applied.length,
      unchanged: merge.unchanged.length,
      conflicts: merge.conflicts,
    };
  }

  const manifest = await syncManifest(source, dest, slug);
  const docCount = { source: await countDocs(source, slug), dest: await countDocs(dest, slug) };

  return { ...base, ...partial, manifest, docCount };
}
