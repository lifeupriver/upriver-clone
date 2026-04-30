import { execFile } from 'node:child_process';
import { mkdir, readdir, readFile, stat, writeFile } from 'node:fs/promises';
import { dirname, join, posix, relative } from 'node:path';
import { promisify } from 'node:util';
import { createSupabaseClientDataSourceFromEnv, type SupabaseClientDataSource } from '@upriver/core/data';
import { inngest } from '../client.js';
import { STAGE_RUN_EVENT, stageRunPayloadSchema, type StageRunPayload } from '../events.js';

/** Allowlist mirrors the dashboard's enqueue endpoint and the API route. */
const ALLOWED_COMMANDS: ReadonlySet<string> = new Set([
  'init',
  'scrape',
  'audit',
  'synthesize',
  'design-brief',
  'scaffold',
  'clone',
  'fixes-plan',
  'qa',
]);

/**
 * Where the worker stages a client tree on the local (ephemeral) filesystem
 * before running the CLI. The CLI reads from `<UPRIVER_CLIENTS_DIR>/<slug>/`
 * by convention; pointing it at `/tmp/upriver/clients` keeps the Docker image
 * unchanged between requests.
 */
const WORK_ROOT = '/tmp/upriver';
const CLIENTS_ROOT = `${WORK_ROOT}/clients`;

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

/**
 * Convert a flags object into alternating CLI argv. Mirrors the helper in
 * `packages/dashboard/src/lib/run-cli.ts` — kept inline because moving it to
 * `@upriver/core` is a refactor outside Phase 3.5e's scope.
 */
function flagsToArgs(flags: Record<string, string | boolean | number>): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(flags)) {
    if (value === false || value === undefined || value === null) continue;
    if (value === true) {
      out.push(`--${key}`);
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      out.push(`--${key}`, String(value));
    }
  }
  return out;
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
 * Walk a local tree and yield every file's path (relative to `root`) plus its
 * mtime. Used after the CLI run to identify outputs to push back to the
 * bucket.
 */
async function collectLocalFiles(
  root: string,
): Promise<Array<{ rel: string; mtimeMs: number }>> {
  const out: Array<{ rel: string; mtimeMs: number }> = [];
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
        const s = await stat(abs);
        out.push({ rel: relative(root, abs).split(/[\\/]/).join('/'), mtimeMs: s.mtimeMs });
      }
    }
  }
  await walk(root);
  return out;
}

/**
 * Pull every file under `clients/<slug>/` from Supabase Storage into the
 * worker's local stage directory. Returns the count + total bytes pulled so
 * Inngest's run history shows useful breadcrumbs.
 */
async function pullClient(payload: StageRunPayload): Promise<{ files: number; bytes: number }> {
  const ds = createSupabaseClientDataSourceFromEnv();
  const remoteFiles = await collectRemoteFiles(ds, payload.slug, '');
  const dest = join(CLIENTS_ROOT, payload.slug);
  await mkdir(dest, { recursive: true });

  let bytes = 0;
  for (const rel of remoteFiles) {
    const data = await ds.readClientFile(payload.slug, rel);
    if (!data) continue;
    const target = join(dest, rel);
    await mkdir(dirname(target), { recursive: true });
    await writeFile(target, data);
    bytes += data.byteLength;
  }
  return { files: remoteFiles.length, bytes };
}

/**
 * Push every file modified after `cutoffMs` back to the bucket. Avoids
 * re-uploading inputs that the CLI didn't touch — important on long pipelines
 * where the input tree is big and the deltas are small (e.g. `scrape` writes
 * ~MB of cached pages, `synthesize` only touches a handful).
 */
async function pushClient(
  payload: StageRunPayload,
  cutoffMs: number,
): Promise<{ files: number; bytes: number }> {
  const ds = createSupabaseClientDataSourceFromEnv();
  const root = join(CLIENTS_ROOT, payload.slug);
  const files = await collectLocalFiles(root);
  let count = 0;
  let bytes = 0;
  for (const { rel, mtimeMs } of files) {
    if (mtimeMs <= cutoffMs) continue;
    const buf = await readFile(join(root, rel));
    await ds.writeClientFile(payload.slug, rel, buf);
    count += 1;
    bytes += buf.byteLength;
  }
  return { files: count, bytes };
}

/**
 * Generic per-stage runner: validate → pull → spawn → push. Each phase is its
 * own `step.run` so Inngest can retry independently and the run timeline
 * shows where time was spent.
 *
 * Concurrency: 3 globally, 1 per slug — two stages on the same client would
 * fight over `/tmp/upriver/clients/<slug>/` and the bucket-side write order.
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
  async ({ event, step }) => {
    const payload = await step.run('validate', () => {
      const parsed = stageRunPayloadSchema.parse(event.data);
      if (!ALLOWED_COMMANDS.has(parsed.command)) {
        throw new Error(`command not allowed: ${parsed.command}`);
      }
      return parsed;
    });

    const pullResult = await step.run('pull', () => pullClient(payload));

    const spawnResult = await step.run('spawn', async () => {
      const cutoffMs = Date.now();
      const argv = [
        resolveCliBin(),
        payload.command,
        payload.slug,
        ...payload.args,
        ...flagsToArgs(payload.flags),
      ];
      const { stdout, stderr } = await execFileAsync('node', argv, {
        cwd: WORK_ROOT,
        env: { ...process.env, UPRIVER_CLIENTS_DIR: CLIENTS_ROOT },
        // Cap captured output so a chatty stage doesn't blow up Inngest's
        // step-state payload. Anything past this is dropped from the run
        // history but still reaches the container's stdout for fly logs.
        maxBuffer: 8 * 1024 * 1024,
      });
      // Tail to keep the step return small. Inngest persists this verbatim.
      const tail = (s: string): string => (s.length > 4_000 ? s.slice(-4_000) : s);
      return { cutoffMs, stdoutTail: tail(stdout), stderrTail: tail(stderr) };
    });

    const pushResult = await step.run('push', () =>
      pushClient(payload, spawnResult.cutoffMs),
    );

    return {
      status: 'completed',
      pulled: pullResult,
      pushed: pushResult,
      stdoutTail: spawnResult.stdoutTail,
      stderrTail: spawnResult.stderrTail,
    };
  },
);
