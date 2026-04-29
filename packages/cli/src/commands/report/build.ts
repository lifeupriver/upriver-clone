import { spawn, type ChildProcess } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Args, Flags } from '@oclif/core';
import { clientDir } from '@upriver/core';

import { BaseCommand } from '../../base-command.js';
import { rewriteHtml } from './rewrite.js';

interface RouteSpec {
  /** URL path appended to `/deliverables/<slug>`. Empty string for cover. */
  route: string;
  /** Output filename inside `report-static/`. */
  filename: string;
}

const ROUTES: ReadonlyArray<RouteSpec> = [
  { route: '', filename: 'index.html' },
  { route: '/scorecard', filename: 'scorecard.html' },
  { route: '/findings', filename: 'findings.html' },
  { route: '/next-steps', filename: 'next-steps.html' },
];

/**
 * `upriver report build <slug>` — produce a self-contained static export of
 * the four-page audit report at `clients/<slug>/report-static/`. Boots the
 * Astro SSR dashboard against the local clients dir, fetches each route,
 * rewrites absolute URLs to relative ones, and copies the dashboard's
 * client-side asset bundle plus any client screenshots alongside the HTML.
 *
 * Workstream A.2 — see `.planning/roadmap/`.
 */
export default class ReportBuild extends BaseCommand {
  static override description =
    'Build a self-contained static export of the audit report for <slug>';

  static override examples = [
    '<%= config.bin %> report build acme-co',
    '<%= config.bin %> report build acme-co --port 4400 --rebuild',
  ];

  static override args = {
    slug: Args.string({
      description: 'Client slug (matches a directory under ./clients/)',
      required: true,
    }),
  };

  static override flags = {
    port: Flags.integer({
      description: 'Port to bind the local SSR dashboard on',
      default: 4399,
    }),
    rebuild: Flags.boolean({
      description: 'Force `astro build` even if dashboard dist already exists',
      default: false,
    }),
    upload: Flags.boolean({
      description: 'Upload the export to remote storage (not yet wired)',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ReportBuild);
    const slug = args.slug;

    // a. Verify the client exists and has been synthesized.
    const clientsBase = resolve('./clients');
    const clientPath = clientDir(slug, clientsBase);
    const auditPkg = join(clientPath, 'audit-package.json');
    if (!existsSync(auditPkg)) {
      this.error(
        `Client ${slug} has no audit-package.json. Run synthesize first.`,
      );
    }

    // b. Locate the dashboard dir.
    const dashboardDir = this.findDashboardDir();
    if (!dashboardDir) {
      this.error(
        'Dashboard package not found. Run from the Upriver monorepo root with pnpm install completed.',
      );
    }

    // c. Build the dashboard if needed.
    const serverEntry = join(dashboardDir, 'dist', 'server', 'entry.mjs');
    if (flags.rebuild || !existsSync(serverEntry)) {
      this.log(`[report] Building dashboard (${dashboardDir})...`);
      await this.runAstroBuild(dashboardDir);
    }
    if (!existsSync(serverEntry)) {
      this.error(
        `Dashboard build did not produce ${serverEntry}. Aborting.`,
      );
    }

    // d. Spawn the SSR server.
    const port = flags.port;
    const baseUrl = `http://127.0.0.1:${port}`;
    const reportStaticDir = join(clientPath, 'report-static');
    mkdirSync(reportStaticDir, { recursive: true });

    let server: ChildProcess | null = null;
    try {
      server = spawn('node', ['dist/server/entry.mjs'], {
        cwd: dashboardDir,
        env: {
          ...process.env,
          HOST: '127.0.0.1',
          PORT: String(port),
          UPRIVER_CLIENTS_DIR: clientsBase,
        },
        stdio: 'pipe',
      });
      drainStream(server, this);

      // e. Wait for the server to come up.
      const ready = await waitForUrl(`${baseUrl}/deliverables/${slug}`, 30_000);
      if (!ready) {
        throw new Error(
          `SSR dashboard did not come up at ${baseUrl} within 30s.`,
        );
      }
      this.log(`[report] SSR dashboard ready on ${baseUrl}.`);

      // f. Fetch each route and save raw HTML.
      const captured = new Map<string, string>();
      for (const { route, filename } of ROUTES) {
        const url = `${baseUrl}/deliverables/${slug}${route}`;
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(
            `Fetch failed for ${url}: HTTP ${res.status} ${res.statusText}`,
          );
        }
        const html = await res.text();
        captured.set(filename, html);
        this.log(`[report] Captured ${url} → ${filename}`);
      }

      // g. Rewrite + write each file.
      const seenUnrewritten = new Set<string>();
      for (const { filename } of ROUTES) {
        const raw = captured.get(filename);
        if (raw === undefined) continue;
        const rewritten = rewriteHtml(raw, slug, (path) => {
          if (seenUnrewritten.has(path)) return;
          seenUnrewritten.add(path);
          this.warn(`Unrewritten absolute path encountered: ${path}`);
        });
        writeFileSync(join(reportStaticDir, filename), rewritten, 'utf8');
      }
    } finally {
      // h. Stop the SSR server.
      if (server) {
        await stopServer(server);
      }
    }

    // i. Copy `_astro` client bundle.
    const astroSrc = join(dashboardDir, 'dist', 'client', '_astro');
    const astroDst = join(reportStaticDir, '_astro');
    if (existsSync(astroSrc)) {
      cpSync(astroSrc, astroDst, { recursive: true });
      this.log(`[report] Copied ${astroSrc} → ${astroDst}`);
    } else {
      this.warn(
        `Expected client asset dir not found: ${astroSrc}. Report may be unstyled.`,
      );
    }

    // j. Favicon (best-effort).
    const faviconSrc = join(dashboardDir, 'dist', 'client', 'favicon.svg');
    if (existsSync(faviconSrc)) {
      cpSync(faviconSrc, join(reportStaticDir, 'favicon.svg'));
    }

    // k. Screenshots (best-effort).
    const screenshotsSrc = join(clientPath, 'screenshots');
    if (existsSync(screenshotsSrc)) {
      cpSync(screenshotsSrc, join(reportStaticDir, 'screenshots'), {
        recursive: true,
      });
      this.log(`[report] Copied ${screenshotsSrc} → screenshots/`);
    }

    // l. README.
    writeFileSync(
      join(reportStaticDir, 'README.md'),
      buildReadme(readClientName(clientPath, slug)),
      'utf8',
    );

    const absOut = resolve(reportStaticDir);
    this.log(`[report] Static export complete: ${absOut}`);

    // --upload stub. Exit 0 so the local artifact is still acknowledged.
    if (flags.upload) {
      // TODO(roadmap): A.6 wire Supabase upload.
      this.warn(
        `--upload not yet wired. Output ready at ${absOut}. Configure UPRIVER_SUPABASE_URL + UPRIVER_SUPABASE_SERVICE_KEY to enable.`,
      );
    }
  }

  /**
   * Walk up from this compiled file to locate `packages/dashboard`. Mirrors
   * the strategy used by the `dashboard` command.
   *
   * @returns Absolute path to the dashboard package, or `null` if not found.
   */
  private findDashboardDir(): string | null {
    const thisFile = fileURLToPath(import.meta.url);
    // dist layout: packages/cli/dist/commands/report/build.js
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
   * Run `pnpm run build` inside the dashboard package and resolve when it
   * exits successfully. Rejects with a clear error otherwise.
   *
   * @param dashboardDir - Absolute path to the dashboard package.
   */
  private async runAstroBuild(dashboardDir: string): Promise<void> {
    await new Promise<void>((resolvePromise, rejectPromise) => {
      const child = spawn('pnpm', ['run', 'build'], {
        cwd: dashboardDir,
        stdio: 'inherit',
      });
      child.on('error', (err) => {
        rejectPromise(
          new Error(
            `Failed to spawn pnpm for dashboard build: ${err.message}`,
          ),
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
}

/**
 * Drain a child process's stdout/stderr so the OS pipe buffer never fills up
 * and deadlocks the SSR server. Output is passed through to the caller's
 * logger so the operator can see SSR errors live.
 *
 * @param child - The spawned child process.
 * @param cmd - The command instance owning the logger.
 */
function drainStream(child: ChildProcess, cmd: BaseCommand): void {
  child.stdout?.setEncoding('utf8');
  child.stderr?.setEncoding('utf8');
  child.stdout?.on('data', (chunk: string) => {
    for (const line of chunk.split(/\r?\n/)) {
      if (line.trim().length > 0) cmd.log(`[ssr] ${line}`);
    }
  });
  child.stderr?.on('data', (chunk: string) => {
    for (const line of chunk.split(/\r?\n/)) {
      if (line.trim().length > 0) cmd.warn(`[ssr] ${line}`);
    }
  });
}

/**
 * Send SIGTERM to the SSR child and wait briefly for it to exit, escalating
 * to SIGKILL after 3s. Resolves once the process is gone.
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
    }, 3_000);
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

/**
 * Best-effort read of the client display name from `client-config.yaml`.
 * Falls back to the slug if the config is unavailable. Avoids re-throwing —
 * we only need a friendly heading for the README.
 *
 * @param clientPath - Absolute path to the client directory.
 * @param slug - The client slug, used as fallback.
 * @returns A display name suitable for the README heading.
 */
function readClientName(clientPath: string, slug: string): string {
  const cfgPath = join(clientPath, 'client-config.yaml');
  if (!existsSync(cfgPath)) return slug;
  try {
    const raw = readFileSync(cfgPath, 'utf8');
    // Very narrow extraction — avoids pulling yaml into this command file.
    const m = raw.match(/^\s*name\s*:\s*['"]?(.+?)['"]?\s*$/m);
    if (m && m[1]) return m[1];
  } catch {
    /* fall through */
  }
  return slug;
}

/**
 * Build the README.md text shipped alongside the static export.
 *
 * @param clientName - Display name for the report heading.
 * @returns README markdown content.
 */
function buildReadme(clientName: string): string {
  const generated = new Date().toISOString();
  return [
    `# ${clientName} Audit Report (static export)`,
    '',
    `Generated ${generated} by upriver report build.`,
    '',
    'Open `index.html` in a browser. Pages:',
    '- index.html — overview',
    '- scorecard.html — dimension scorecard',
    '- findings.html — full findings',
    '- next-steps.html — pricing tiers and intake CTA',
    '',
    'Hosted version: TODO(roadmap): A.6 inject share-link URL.',
    '',
  ].join('\n');
}

