import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { dirname, join, posix, relative } from 'node:path';
import { promisify } from 'node:util';
import { flagsToArgs } from '@upriver/core';
import { createSupabaseClientDataSourceFromEnv, type SupabaseClientDataSource } from '@upriver/core/data';
import { inngest } from '../client.js';
import { STAGE_RUN_EVENT, stageRunPayloadSchema, type StageRunPayload } from '../events.js';
import { ALLOWED_COMMANDS, commandToArgv } from './allowed-commands.js';
import { scrubSecrets } from './scrub-secrets.js';
import {
  SYNC_LOCK_PATH,
  SYNC_MANIFEST_PATH,
  buildSyncLock,
  buildSyncManifest,
  diffForPush,
  isSyncMetaPath,
  lockBlocks,
  parseSyncLock,
  removeBucketObjects,
  sha256Hex,
  type FileHashes,
} from './sync-state.js';

/**
 * Where the worker stages a client tree on the local filesystem before
 * running the CLI. The CLI reads from `<UPRIVER_CLIENTS_DIR>/<slug>/` by
 * convention. On Fly this points at the mounted volume (`/data/upriver` via
 * `UPRIVER_WORK_DIR` in fly.toml) so files written by one Inngest step are
 * still there when the next HTTP-delivered step runs — even across a machine
 * stop/start. Falls back to /tmp for local dev.
 */
const WORK_ROOT = process.env['UPRIVER_WORK_DIR'] ?? '/tmp/upriver';
const CLIENTS_ROOT = join(WORK_ROOT, 'clients');
/** Per-run pull baselines (hash manifests) live here between steps. */
const SYNC_META_ROOT = join(WORK_ROOT, '.sync-meta');

/**
 * Hard wall-clock cap on a single CLI stage. A wedged stage (browser that
 * never exits, claude waiting on interactive input) would otherwise hold its
 * per-slug concurrency lane — and the Inngest step — forever. SIGKILL rather
 * than the default SIGTERM: headless Chromium trees are notorious for
 * shrugging off TERM.
 */
const STAGE_TIMEOUT_MS = 30 * 60_000;

/**
 * Object-key prefix inside the bucket. Mirrors `SupabaseClientDataSource`'s
 * default — `createSupabaseClientDataSourceFromEnv` never overrides it.
 */
const BUCKET_PREFIX = 'clients';

/**
 * Resolved path to the upriver CLI bin inside the container. The Dockerfile
 * deploys workspace packages under `/app/packages/<name>/`, so the CLI's
 * `bin/run.js` lives at this fixed location. `UPRIVER_CLI_BIN` overrides for
 * tests or alternate layouts.
 */
function resolveCliBin(): string {
  return process.env['UPRIVER_CLI_BIN'] ?? '/app/packages/cli/bin/run.js';
}

const execFileAsync = promisify(execFile);

/** Supabase storage coordinates for raw REST calls (object deletes). */
function storageEnv(): { supabaseUrl: string; serviceKey: string; bucket: string } {
  const supabaseUrl = process.env['UPRIVER_SUPABASE_URL'];
  const serviceKey =
    process.env['UPRIVER_SUPABASE_SERVICE_KEY'] ?? process.env['UPRIVER_SUPABASE_PUBLISHABLE_KEY'];
  if (!supabaseUrl || !serviceKey) {
    throw new Error('UPRIVER_SUPABASE_URL and UPRIVER_SUPABASE_SERVICE_KEY must be set');
  }
  return {
    supabaseUrl,
    serviceKey,
    bucket: process.env['UPRIVER_SUPABASE_BUCKET'] ?? 'upriver',
  };
}

/** Filesystem-safe slice of an Inngest run id for temp-dir names. */
function safeRunId(runId: string): string {
  return runId.replace(/[^A-Za-z0-9_-]/g, '_');
}

function pullDirFor(runId: string): string {
  return join(WORK_ROOT, `.pull-${safeRunId(runId)}`);
}

function staleDirFor(slug: string, runId: string): string {
  return join(CLIENTS_ROOT, `.stale-${slug}-${safeRunId(runId)}`);
}

function baselinePathFor(runId: string): string {
  return join(SYNC_META_ROOT, `${safeRunId(runId)}.json`);
}

/**
 * Recursively walk the bucket under `clients/<slug>/<dir>` and return POSIX
 * relative paths to every file. Uses the supabase-specific
 * `listClientEntries` helper because the abstract `ClientDataSource`
 * interface is non-recursive.
 */
async function collectRemoteFiles(
  ds: SupabaseClientDataSource,
  slug: string,
  dir: string,
): Promise<string[]> {
  const out: string[] = [];
  const entries = await ds.listClientEntries(slug, dir);
  for (const entry of entries) {
    const rel = dir ? posix.join(dir, entry.name) : entry.name;
    if (entry.isDirectory) {
      const sub = await collectRemoteFiles(ds, slug, rel);
      out.push(...sub);
    } else {
      out.push(rel);
    }
  }
  return out;
}

/**
 * Walk a local tree and return every file's POSIX path relative to `root`.
 * Used after the CLI run to hash the outputs for the push diff.
 */
async function collectLocalFiles(root: string): Promise<string[]> {
  const out: string[] = [];
  async function walk(dir: string): Promise<void> {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true, encoding: 'utf8' });
    } catch {
      return;
    }
    for (const entry of entries) {
      const name = String(entry.name);
      const abs = join(dir, name);
      if (entry.isDirectory()) {
        await walk(abs);
      } else if (entry.isFile()) {
        out.push(relative(root, abs).split(/[\\/]/).join('/'));
      }
    }
  }
  await walk(root);
  return out;
}

/**
 * Pull `clients/<slug>/` from Supabase Storage into the local stage dir.
 *
 * Coherency:
 * - Refuses to start while another run's non-expired `.sync/lock.json` is in
 *   the bucket, then writes its own lock (cleared in the run's finally).
 * - Downloads into a FRESH `<work>/.pull-<runId>` dir and atomically swaps it
 *   into `<work>/clients/<slug>` (rename old → .stale, rename new → live, rm
 *   stale). Files deleted in the bucket can no longer survive locally from a
 *   previous run on the same machine and leak into this run's outputs.
 * - Records {path → sha256} of everything pulled (the push step's diff
 *   baseline) in `<work>/.sync-meta/<runId>.json`.
 */
async function pullClient(
  payload: StageRunPayload,
  runId: string,
): Promise<{ files: number; bytes: number }> {
  const ds = createSupabaseClientDataSourceFromEnv();

  // Same-slug concurrency guard. Inngest's per-slug concurrency key already
  // serializes runs within this app; the bucket lock additionally protects
  // against split-brain (two worker machines, a manual `upriver sync push`
  // racing a run, an orphaned run on a replaced machine).
  const existingLock = parseSyncLock(await ds.readClientFileText(payload.slug, SYNC_LOCK_PATH));
  if (lockBlocks(existingLock, runId)) {
    throw new Error(
      `client "${payload.slug}" is locked by run ${existingLock?.runId} (started ${existingLock?.startedAt}, ` +
        `expires 45 min after start) — refusing to start; Inngest will retry`,
    );
  }
  await ds.writeClientFile(
    payload.slug,
    SYNC_LOCK_PATH,
    JSON.stringify(buildSyncLock(runId), null, 2),
  );

  const remoteFiles = (await collectRemoteFiles(ds, payload.slug, '')).filter(
    (rel) => !isSyncMetaPath(rel),
  );

  const pullDir = pullDirFor(runId);
  await rm(pullDir, { recursive: true, force: true }); // leftovers from a retried attempt
  await mkdir(pullDir, { recursive: true });

  const pulledHashes: FileHashes = {};
  let bytes = 0;
  for (const rel of remoteFiles) {
    const data = await ds.readClientFile(payload.slug, rel);
    if (!data) continue;
    const target = join(pullDir, rel);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, data);
    pulledHashes[rel] = sha256Hex(data);
    bytes += data.byteLength;
  }

  // Atomic swap: the live dir is never a half-written mixture of old and new.
  const liveDir = join(CLIENTS_ROOT, payload.slug);
  const staleDir = staleDirFor(payload.slug, runId);
  await mkdir(CLIENTS_ROOT, { recursive: true });
  await rm(staleDir, { recursive: true, force: true });
  try {
    await rename(liveDir, staleDir);
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err; // ENOENT: first run on this machine
  }
  await rename(pullDir, liveDir);
  await rm(staleDir, { recursive: true, force: true });

  await mkdir(SYNC_META_ROOT, { recursive: true });
  await writeFile(
    baselinePathFor(runId),
    JSON.stringify({ slug: payload.slug, pulledHashes }),
    'utf8',
  );

  return { files: Object.keys(pulledHashes).length, bytes };
}

/** Pull-time hash baseline persisted by {@link pullClient}; null if lost. */
async function readPullBaseline(runId: string, slug: string): Promise<FileHashes | null> {
  try {
    const raw = await readFile(baselinePathFor(runId), 'utf8');
    const parsed = JSON.parse(raw) as { slug?: string; pulledHashes?: FileHashes };
    if (parsed.slug !== slug || !parsed.pulledHashes || typeof parsed.pulledHashes !== 'object') {
      return null;
    }
    return parsed.pulledHashes;
  } catch {
    return null;
  }
}

/**
 * Push the post-run local tree back to the bucket, then write
 * `clients/<slug>/.sync/manifest.json` as the FINAL upload.
 *
 * - Every file whose sha256 differs from the pull baseline (or that is new)
 *   is uploaded — no mtime heuristics, so outputs with preserved mtimes are
 *   never silently skipped.
 * - Files that were pulled but no longer exist locally are deleted from the
 *   bucket — only when the pull baseline is available; with no baseline the
 *   plan degrades to upload-everything/delete-nothing.
 * - Readers detect a torn push via the manifest: `status: 'complete'` is only
 *   ever written after every upload/delete landed. On failure a
 *   `status: 'failed'` manifest is uploaded best-effort before rethrowing.
 */
async function pushClient(
  payload: StageRunPayload,
  runId: string,
): Promise<{ uploaded: number; deleted: number; unchanged: number; bytes: number; baseline: 'pulled' | 'missing' }> {
  const ds = createSupabaseClientDataSourceFromEnv();
  const root = join(CLIENTS_ROOT, payload.slug);

  const localHashes: FileHashes = {};
  for (const rel of await collectLocalFiles(root)) {
    if (isSyncMetaPath(rel)) continue;
    localHashes[rel] = sha256Hex(await readFile(join(root, rel)));
  }

  const baseline = await readPullBaseline(runId, payload.slug);
  const plan = diffForPush(baseline, localHashes);

  try {
    let bytes = 0;
    for (const rel of plan.upload) {
      const buf = await readFile(join(root, rel));
      await ds.writeClientFile(payload.slug, rel, buf);
      bytes += buf.byteLength;
    }
    if (plan.remove.length > 0) {
      const env = storageEnv();
      await removeBucketObjects({
        ...env,
        keys: plan.remove.map((rel) => `${BUCKET_PREFIX}/${payload.slug}/${rel}`),
      });
    }
    await ds.writeClientFile(
      payload.slug,
      SYNC_MANIFEST_PATH,
      JSON.stringify(
        buildSyncManifest({ stage: payload.command, runId, status: 'complete', files: localHashes }),
        null,
        2,
      ),
    );
    return {
      uploaded: plan.upload.length,
      deleted: plan.remove.length,
      unchanged: plan.unchanged.length,
      bytes,
      baseline: baseline ? 'pulled' : 'missing',
    };
  } catch (err) {
    // Mark the bucket as torn so readers don't trust a half-pushed tree.
    try {
      await ds.writeClientFile(
        payload.slug,
        SYNC_MANIFEST_PATH,
        JSON.stringify(
          buildSyncManifest({ stage: payload.command, runId, status: 'failed', files: localHashes }),
          null,
          2,
        ),
      );
    } catch {
      // best-effort — the original failure is what matters
    }
    throw err;
  }
}

/**
 * Generic per-stage runner: validate → pull → spawn → push. Each phase is its
 * own `step.run` so Inngest can retry independently and the run timeline
 * shows where time was spent.
 *
 * Steps arrive as separate HTTP deliveries, so consecutive steps share state
 * only through the local disk — which is why production runs a SINGLE Fly
 * machine with a volume at UPRIVER_WORK_DIR (see fly.toml + DEPLOY.md).
 *
 * Concurrency (verified against Inngest v3 semantics): the array combines
 * both limits — at most 3 runs of this function across the app, AND at most
 * 1 run per `event.data.slug` (the key is a CEL expression evaluated per
 * event). Two stages on the same client would otherwise fight over
 * `<work>/clients/<slug>/` and the bucket-side write order. The bucket-side
 * `.sync/lock.json` (written at pull, cleared in the finally) backstops this
 * across machines.
 */
export const runStage = inngest.createFunction(
  {
    id: 'run-stage',
    name: 'Run pipeline stage',
    concurrency: [
      { limit: 3 },
      { key: 'event.data.slug', limit: 1 },
    ],
    retries: 1,
  },
  { event: STAGE_RUN_EVENT },
  async ({ event, step, runId }) => {
    const payload = await step.run('validate', () => {
      const parsed = stageRunPayloadSchema.parse(event.data);
      if (!ALLOWED_COMMANDS.has(parsed.command)) {
        throw new Error(`command not allowed: ${parsed.command}`);
      }
      return parsed;
    });

    try {
      const pullResult = await step.run('pull', () => pullClient(payload, runId));

      const spawnResult = await step.run('spawn', async () => {
        const argv = [
          resolveCliBin(),
          // oclif topic commands span multiple argv elements (space
          // separator) — e.g. `fixes-plan` spawns as `fixes plan`.
          ...commandToArgv(payload.command),
          payload.slug,
          ...payload.args,
          ...flagsToArgs(payload.flags),
        ];
        // Tail to keep the step return small. Inngest persists this verbatim,
        // so scrub env secrets the CLI may have echoed before anything leaves
        // the worker.
        const tail = (s: string): string => (s.length > 4_000 ? s.slice(-4_000) : s);
        try {
          const { stdout, stderr } = await execFileAsync('node', argv, {
            cwd: WORK_ROOT,
            env: { ...process.env, UPRIVER_CLIENTS_DIR: CLIENTS_ROOT },
            // Cap captured output so a chatty stage doesn't blow up Inngest's
            // step-state payload. Anything past this is dropped from the run
            // history but still reaches the container's stdout for fly logs.
            maxBuffer: 8 * 1024 * 1024,
            timeout: STAGE_TIMEOUT_MS,
            killSignal: 'SIGKILL',
          });
          return { stdoutTail: scrubSecrets(tail(stdout)), stderrTail: scrubSecrets(tail(stderr)) };
        } catch (err) {
          // execFile failures carry the captured output and the full command
          // line; rebuild a scrubbed, tailed error so secrets can't ride into
          // Inngest's persisted failure message either.
          const e = err as Error & { stdout?: unknown; stderr?: unknown };
          const firstLine = scrubSecrets(String(e.message ?? err)).split('\n', 1)[0] ?? 'stage spawn failed';
          const stderrTail = typeof e.stderr === 'string' ? scrubSecrets(tail(e.stderr)) : '';
          throw new Error(stderrTail ? `${firstLine}\nstderr tail:\n${stderrTail}` : firstLine);
        }
      });

      const pushResult = await step.run('push', () => pushClient(payload, runId));

      return {
        status: 'completed',
        pulled: pullResult,
        pushed: pushResult,
        stdoutTail: spawnResult.stdoutTail,
        stderrTail: spawnResult.stderrTail,
      };
    } finally {
      // Best-effort lock release + disk reclaim whether the run succeeded or
      // failed (the failure re-propagates after this). The work dir persists
      // across runs (Fly volume) — without cleanup, staged client trees
      // accumulate until the disk fills.
      await step.run('cleanup', async () => {
        let lockCleared = false;
        try {
          const ds = createSupabaseClientDataSourceFromEnv();
          const lock = parseSyncLock(await ds.readClientFileText(payload.slug, SYNC_LOCK_PATH));
          // Only clear a lock THIS run wrote. If the pull was refused because
          // another run holds the lock, that lock must survive our cleanup.
          if (lock?.runId === runId) {
            const env = storageEnv();
            await removeBucketObjects({
              ...env,
              keys: [`${BUCKET_PREFIX}/${payload.slug}/${SYNC_LOCK_PATH}`],
            });
            lockCleared = true;
          }
        } catch {
          // lock expires on its own after 45 min
        }
        try {
          await rm(join(CLIENTS_ROOT, payload.slug), { recursive: true, force: true });
          await rm(pullDirFor(runId), { recursive: true, force: true });
          await rm(staleDirFor(payload.slug, runId), { recursive: true, force: true });
          await rm(baselinePathFor(runId), { force: true });
          return { cleaned: true, lockCleared };
        } catch {
          return { cleaned: false, lockCleared };
        }
      });
    }
  },
);
