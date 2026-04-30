import { spawn, type ChildProcess } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Options for {@link withDashboardServer}. */
export interface WithDashboardServerOptions {
  /** TCP port to bind the dashboard SSR server on (`127.0.0.1`). */
  port: number;
  /** Absolute path to the clients directory passed via `UPRIVER_CLIENTS_DIR`. */
  clientsDir: string;
  /** Force `pnpm run build` even if `dist/server/entry.mjs` already exists. */
  rebuild?: boolean;
  /** Logger sink — typically `cmd.log.bind(cmd)` from an oclif command. */
  log: (msg: string) => void;
}

/**
 * Locate the `packages/dashboard` package by walking up from this compiled
 * file. Mirrors the strategy used by the `dashboard` and `report build`
 * commands.
 *
 * @returns Absolute path to the dashboard package, or `null` if not found.
 */
export function findDashboardDir(): string | null {
  const thisFile = fileURLToPath(import.meta.url);
  // dist layout: packages/cli/dist/commands/report/server.js
  const cliRoot = resolve(dirname(thisFile), '..', '..', '..');
  const candidates = [
    join(cliRoot, '..', 'dashboard'),
    join(process.cwd(), 'packages', 'dashboard'),
  ];
  for (const candidate of candidates) {
    if (existsSync(join(candidate, 'package.json'))) {
      return candidate;
    }
  }
  return null;
}

/**
 * Boot the Astro SSR dashboard, run the supplied function against its
 * `http://127.0.0.1:<port>` base URL, and tear the server down on exit.
 *
 * Behavior:
 * - Locates `packages/dashboard`. Throws if missing.
 * - If `rebuild` is true OR `dist/server/entry.mjs` is missing, runs
 *   `pnpm run build` in the dashboard dir first.
 * - Spawns `node dist/server/entry.mjs` with `HOST=127.0.0.1`,
 *   `PORT=<port>`, and `UPRIVER_CLIENTS_DIR=<clientsDir>`.
 * - Drains the child's stdout/stderr so the OS pipe buffer never fills up.
 * - Polls `/clients` for up to 30s. Throws if the server never responds.
 * - Calls `fn(baseUrl)` and returns its result.
 * - In `finally`, sends SIGTERM, escalating to SIGKILL after 2s.
 *
 * @param opts - Server options.
 * @param fn - Caller that receives the base URL and returns a promise.
 * @returns Whatever `fn` resolved to.
 * @throws If the dashboard package can't be found, the build fails, the
 *   server entry doesn't exist after build, or the server doesn't come up.
 */
export async function withDashboardServer<T>(
  opts: WithDashboardServerOptions,
  fn: (baseUrl: string) => Promise<T>,
): Promise<T> {
  const dashboardDir = findDashboardDir();
  if (!dashboardDir) {
    throw new Error(
      'Dashboard package not found. Run from the Upriver monorepo root with pnpm install completed.',
    );
  }

  const serverEntry = join(dashboardDir, 'dist', 'server', 'entry.mjs');
  if (opts.rebuild || !existsSync(serverEntry)) {
    opts.log(`[report] Building dashboard (${dashboardDir})...`);
    await runDashboardBuild(dashboardDir);
  }
  if (!existsSync(serverEntry)) {
    throw new Error(`Dashboard build did not produce ${serverEntry}. Aborting.`);
  }

  const baseUrl = `http://127.0.0.1:${opts.port}`;
  let server: ChildProcess | null = null;
  try {
    server = spawn('node', ['dist/server/entry.mjs'], {
      cwd: dashboardDir,
      env: {
        ...process.env,
        HOST: '127.0.0.1',
        PORT: String(opts.port),
        UPRIVER_CLIENTS_DIR: opts.clientsDir,
      },
      stdio: 'pipe',
    });
    drainStream(server, opts.log);

    const ready = await waitForUrl(`${baseUrl}/clients`, 30_000);
    if (!ready) {
      throw new Error(
        `SSR dashboard did not come up at ${baseUrl} within 30s.`,
      );
    }
    opts.log(`[report] SSR dashboard ready on ${baseUrl}.`);

    return await fn(baseUrl);
  } finally {
    if (server) {
      await stopServer(server);
    }
  }
}

/**
 * Run `pnpm run build` inside the dashboard package. Resolves on exit code 0;
 * rejects with a clear error otherwise.
 *
 * @param dashboardDir - Absolute path to the dashboard package.
 */
async function runDashboardBuild(dashboardDir: string): Promise<void> {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn('pnpm', ['run', 'build'], {
      cwd: dashboardDir,
      stdio: 'inherit',
      env: { ...process.env, UPRIVER_ASTRO_ADAPTER: 'node' },
    });
    child.on('error', (err) => {
      rejectPromise(
        new Error(`Failed to spawn pnpm for dashboard build: ${err.message}`),
      );
    });
    child.on('exit', (code) => {
      if (code === 0) {
        resolvePromise();
      } else {
        rejectPromise(
          new Error(`Dashboard build failed with exit code ${code ?? 'null'}.`),
        );
      }
    });
  });
}

/**
 * Drain a child's stdout/stderr so the OS pipe buffer never fills up and
 * deadlocks the SSR server. Output is forwarded to `log` line-by-line.
 *
 * @param child - The spawned child process.
 * @param log - Logger sink.
 */
function drainStream(child: ChildProcess, log: (msg: string) => void): void {
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => {
    for (const line of chunk.split(/\r?\n/)) {
      if (line.trim().length > 0) log(`[ssr] ${line}`);
    }
  });
  child.stderr?.on('data', (chunk: string) => {
    for (const line of chunk.split(/\r?\n/)) {
      if (line.trim().length > 0) log(`[ssr] ${line}`);
    }
  });
}

/**
 * Send SIGTERM to the SSR child and wait briefly for it to exit, escalating
 * to SIGKILL after 2s. Resolves once the process is gone.
 *
 * @param child - The child process to terminate.
 */
async function stopServer(child: ChildProcess): Promise<void> {
  if (child.exitCode !== null || child.killed) return;
  await new Promise<void>((resolvePromise) => {
    const timer = setTimeout(() => {
      try {
        child.kill('SIGKILL');
      } catch {
        /* ignore */
      }
    }, 2_000);
    child.once('exit', () => {
      clearTimeout(timer);
      resolvePromise();
    });
    try {
      child.kill('SIGTERM');
    } catch {
      clearTimeout(timer);
      resolvePromise();
    }
  });
}

/**
 * Poll `url` until it returns a 2xx response or `timeoutMs` elapses.
 *
 * @param url - The URL to probe.
 * @param timeoutMs - Maximum total wait, in milliseconds.
 * @returns `true` if the URL became reachable, `false` on timeout.
 */
async function waitForUrl(url: string, timeoutMs: number): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 1_500);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(t);
      if (res.ok) return true;
    } catch {
      /* not ready */
    }
    await sleep(500);
  }
  return false;
}

/**
 * Sleep helper.
 *
 * @param ms - Milliseconds to sleep.
 */
function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}
