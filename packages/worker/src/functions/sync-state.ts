import { createHash } from 'node:crypto';

/**
 * Pure logic for the worker's client-state sync (run-stage's pull/push):
 * manifest diffing, hash compare, and pull-lock expiry. Extracted from
 * run-stage.ts so the contract is unit-testable without Supabase or a
 * filesystem — run-stage supplies the fs/storage I/O, this module decides
 * what to upload, delete, and refuse.
 *
 * Bucket layout (all under `clients/<slug>/`):
 *   .sync/manifest.json — written LAST on every push. Readers detect a torn
 *                         push by `status !== 'complete'` or by a manifest
 *                         whose `files` disagree with the bucket.
 *   .sync/lock.json     — written at pull, cleared in the run's finally.
 *                         A non-expired lock from another run refuses the
 *                         pull (Inngest retries later).
 *
 * `.sync/**` paths are sync-machinery, not client artifacts: they are never
 * pulled into the local tree, never diffed, and never deleted by the
 * disappeared-files pass.
 */

/** Bucket-relative directory holding sync metadata for a slug. */
export const SYNC_DIR = '.sync';
export const SYNC_MANIFEST_PATH = `${SYNC_DIR}/manifest.json`;
export const SYNC_LOCK_PATH = `${SYNC_DIR}/lock.json`;

/**
 * A lock older than this no longer blocks. Slightly above the 30-minute
 * per-stage SIGKILL timeout: any healthy run has either finished or been
 * killed (and cleared its lock) well before 45 minutes, so a survivor lock
 * means the run died without its finally (machine crash, OOM).
 */
export const LOCK_TTL_MS = 45 * 60_000;

/** Map of bucket-relative POSIX path → sha256 hex of the file contents. */
export type FileHashes = Record<string, string>;

export interface SyncManifest {
  version: 1;
  /** CLI command the producing run executed (e.g. 'scrape'). */
  stage: string;
  /** Inngest run id of the producing run. */
  runId: string;
  /** ISO timestamp of the manifest write. */
  timestamp: string;
  /**
   * 'complete' — every upload/delete in the push landed, `files` describes
   * the bucket exactly. 'failed' — the push died partway; `files` is the
   * state the push was *trying* to reach, and the bucket may be torn.
   */
  status: 'complete' | 'failed';
  files: FileHashes;
}

export interface SyncLock {
  runId: string;
  /** ISO timestamp when the holder pulled. */
  startedAt: string;
}

/** sha256 hex digest of file contents. */
export function sha256Hex(data: Uint8Array | string): string {
  return createHash('sha256').update(data).digest('hex');
}

/** Whether a bucket-relative path is sync machinery (never synced/diffed). */
export function isSyncMetaPath(rel: string): boolean {
  return rel === SYNC_DIR || rel.startsWith(`${SYNC_DIR}/`);
}

/** Parse `.sync/lock.json` content; null for missing/garbage input. */
export function parseSyncLock(raw: string | null | undefined): SyncLock | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SyncLock>;
    if (typeof parsed.runId !== 'string' || parsed.runId.length === 0) return null;
    if (typeof parsed.startedAt !== 'string') return null;
    return { runId: parsed.runId, startedAt: parsed.startedAt };
  } catch {
    return null;
  }
}

/** Parse `.sync/manifest.json` content; null for missing/garbage input. */
export function parseSyncManifest(raw: string | null | undefined): SyncManifest | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<SyncManifest>;
    if (parsed.version !== 1) return null;
    if (typeof parsed.stage !== 'string' || typeof parsed.runId !== 'string') return null;
    if (typeof parsed.timestamp !== 'string') return null;
    if (parsed.status !== 'complete' && parsed.status !== 'failed') return null;
    if (!parsed.files || typeof parsed.files !== 'object') return null;
    const files: FileHashes = {};
    for (const [k, v] of Object.entries(parsed.files)) {
      if (typeof v === 'string') files[k] = v;
    }
    return {
      version: 1,
      stage: parsed.stage,
      runId: parsed.runId,
      timestamp: parsed.timestamp,
      status: parsed.status,
      files,
    };
  } catch {
    return null;
  }
}

export function buildSyncLock(runId: string, now: Date = new Date()): SyncLock {
  return { runId, startedAt: now.toISOString() };
}

export function buildSyncManifest(args: {
  stage: string;
  runId: string;
  status: 'complete' | 'failed';
  files: FileHashes;
  now?: Date;
}): SyncManifest {
  return {
    version: 1,
    stage: args.stage,
    runId: args.runId,
    timestamp: (args.now ?? new Date()).toISOString(),
    status: args.status,
    files: args.files,
  };
}

/**
 * Should `runId` refuse to pull given the lock currently in the bucket?
 *
 * - no lock → proceed.
 * - our own lock (same runId, e.g. an Inngest retry of this run) → proceed.
 * - another run's lock younger than {@link LOCK_TTL_MS} → BLOCK.
 * - another run's lock past the TTL, or with an unparseable `startedAt`
 *   (corrupt garbage must not wedge the slug forever) → proceed; the caller
 *   overwrites it with its own lock.
 */
export function lockBlocks(lock: SyncLock | null, runId: string, nowMs: number = Date.now()): boolean {
  if (!lock) return false;
  if (lock.runId === runId) return false;
  const startedMs = Date.parse(lock.startedAt);
  if (Number.isNaN(startedMs)) return false;
  return nowMs - startedMs < LOCK_TTL_MS;
}

export interface PushPlan {
  /** Local paths that are new or whose hash changed since pull — upload. */
  upload: string[];
  /** Paths present at pull but gone locally — delete from the bucket. */
  remove: string[];
  /** Paths whose hash is unchanged — skip. */
  unchanged: string[];
}

/**
 * Diff the post-run local tree against the hashes captured at pull time.
 *
 * `pulled === null` means the pull baseline is unavailable (e.g. the machine
 * lost local state between steps). The safe degenerate plan is: upload
 * EVERYTHING, delete NOTHING — without a trustworthy baseline a missing
 * local file is indistinguishable from a lost one, and deleting on a guess
 * could destroy bucket artifacts.
 */
export function diffForPush(pulled: FileHashes | null, local: FileHashes): PushPlan {
  const localPaths = Object.keys(local).sort();
  if (pulled === null) {
    return { upload: localPaths, remove: [], unchanged: [] };
  }
  const upload: string[] = [];
  const unchanged: string[] = [];
  for (const rel of localPaths) {
    if (pulled[rel] === local[rel]) unchanged.push(rel);
    else upload.push(rel);
  }
  const remove = Object.keys(pulled)
    .filter((rel) => !(rel in local) && !isSyncMetaPath(rel))
    .sort();
  return { upload, remove, unchanged };
}

/**
 * Batch-delete objects from Supabase Storage via the REST API.
 *
 * `@upriver/core`'s `SupabaseClientDataSource` deliberately exposes no
 * delete (the dashboard never deletes), so the worker talks to
 * `DELETE /storage/v1/object/<bucket>` directly — the same endpoint
 * supabase-js `storage.from(bucket).remove(keys)` wraps. `keys` are full
 * object keys (`clients/<slug>/<path>`). Chunked to stay under request-size
 * limits. `fetchImpl` is a test seam.
 */
export async function removeBucketObjects(args: {
  supabaseUrl: string;
  serviceKey: string;
  bucket: string;
  keys: string[];
  fetchImpl?: typeof fetch;
}): Promise<void> {
  if (args.keys.length === 0) return;
  const doFetch = args.fetchImpl ?? fetch;
  const endpoint = `${args.supabaseUrl.replace(/\/+$/, '')}/storage/v1/object/${args.bucket}`;
  const CHUNK = 100;
  for (let i = 0; i < args.keys.length; i += CHUNK) {
    const prefixes = args.keys.slice(i, i + CHUNK);
    const res = await doFetch(endpoint, {
      method: 'DELETE',
      signal: AbortSignal.timeout(30_000),
      headers: {
        authorization: `Bearer ${args.serviceKey}`,
        apikey: args.serviceKey,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ prefixes }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`storage delete failed (${res.status}): ${body.slice(0, 240) || res.statusText}`);
    }
  }
}
