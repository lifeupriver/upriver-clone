import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
import { join, resolve } from 'node:path';

import { Args, Flags } from '@oclif/core';
import { clientDir } from '@upriver/core';

import { BaseCommand } from '../../base-command.js';
import { rewriteHtml } from '../../report-helpers/rewrite.js';
import { findDashboardDir, withDashboardServer } from '../../report-helpers/server.js';

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
    force: Flags.boolean({
      description: 'Rebuild the static report even if report-static/index.html already exists',
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

    // b. Resolve the dashboard dir (used later for static asset copy).
    const dashboardDir = findDashboardDir();
    if (!dashboardDir) {
      this.error(
        'Dashboard package not found. Run from the Upriver monorepo root with pnpm install completed.',
      );
    }

    const reportStaticDir = join(clientPath, 'report-static');
    mkdirSync(reportStaticDir, { recursive: true });

    const indexPath = join(reportStaticDir, 'index.html');
    const skipBuild = this.skipIfExists('report-static/index.html', indexPath, {
      force: flags.force,
    });

    // If the static export already exists and we're not also uploading, bail out before
    // spawning the dashboard. When --upload is also passed, fall through to the upload
    // stub so users can re-run cheaply once a hosted upload is wired.
    if (skipBuild && !flags.upload) return;

    if (!skipBuild) {
      // c. Boot SSR dashboard, fetch each route, rewrite, and write to disk.
      await withDashboardServer(
        {
          port: flags.port,
          clientsDir: clientsBase,
          rebuild: flags.rebuild,
          log: (msg) => this.log(msg),
        },
        async (baseUrl) => {
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
        },
      );

      // d. Copy `_astro` client bundle.
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

      // e. Favicon (best-effort).
      const faviconSrc = join(dashboardDir, 'dist', 'client', 'favicon.svg');
      if (existsSync(faviconSrc)) {
        cpSync(faviconSrc, join(reportStaticDir, 'favicon.svg'));
      }

      // f. Screenshots (best-effort).
      const screenshotsSrc = join(clientPath, 'screenshots');
      if (existsSync(screenshotsSrc)) {
        cpSync(screenshotsSrc, join(reportStaticDir, 'screenshots'), {
          recursive: true,
        });
        this.log(`[report] Copied ${screenshotsSrc} → screenshots/`);
      }

      // g. README.
      writeFileSync(
        join(reportStaticDir, 'README.md'),
        buildReadme(readClientName(clientPath, slug)),
        'utf8',
      );
    }

    const absOut = resolve(reportStaticDir);
    if (!skipBuild) {
      this.log(`[report] Static export complete: ${absOut}`);
    }

    // --upload stub. Exit 0 so the local artifact is still acknowledged.
    if (flags.upload) {
      // TODO(roadmap): A.6 wire Supabase upload.
      this.warn(
        `--upload not yet wired. Output ready at ${absOut}. To produce a share URL once hosted, run: upriver report send ${slug} --to client@example.com.`,
      );
    }
  }
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
    'Hosted version: run `upriver report send <slug> --to ...` to mint a share URL.',
    '',
  ].join('\n');
}
