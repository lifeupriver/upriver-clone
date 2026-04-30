import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { Args, Flags } from '@oclif/core';
import { clientDir } from '@upriver/core';
import { PDFDocument } from 'pdf-lib';

import { BaseCommand } from '../../base-command.js';
import { withDashboardServer } from '../../report-helpers/server.js';

interface PdfRouteSpec {
  /** URL path appended to `/deliverables/<slug>`. Empty string for cover. */
  route: string;
  /** Output filename (no extension) inside `report-pdfs/`. */
  name: string;
}

const ROUTES: ReadonlyArray<PdfRouteSpec> = [
  { route: '', name: 'index' },
  { route: '/scorecard', name: 'scorecard' },
  { route: '/findings', name: 'findings' },
  { route: '/next-steps', name: 'next-steps' },
];

const VALID_FORMATS = ['Letter', 'A4'] as const;
type PdfFormat = (typeof VALID_FORMATS)[number];

/**
 * `upriver report pdf <slug>` — render the four audit report pages with
 * Playwright/Chromium, save per-route PDFs to `clients/<slug>/report-pdfs/`
 * for debugging, then merge them into a single deliverable PDF (default
 * `clients/<slug>/report.pdf`).
 *
 * Workstream A.5 — see `.planning/roadmap/`.
 */
export default class ReportPdf extends BaseCommand {
  static override description =
    'Render the audit report as a merged PDF (plus per-route PDFs for debugging) for <slug>';

  static override examples = [
    '<%= config.bin %> report pdf acme-co',
    '<%= config.bin %> report pdf acme-co --format A4',
    '<%= config.bin %> report pdf acme-co --out ./acme.pdf',
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
      default: 4400,
    }),
    rebuild: Flags.boolean({
      description: 'Force `astro build` even if dashboard dist already exists',
      default: false,
    }),
    out: Flags.string({
      description: 'Override path for the merged PDF (default: clients/<slug>/report.pdf)',
    }),
    format: Flags.string({
      description: 'Page format (Letter or A4)',
      options: [...VALID_FORMATS],
      default: 'Letter',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ReportPdf);
    const slug = args.slug;

    // a. Verify client exists and has been synthesized.
    const clientsBase = resolve('./clients');
    const clientPath = clientDir(slug, clientsBase);
    const auditPkg = join(clientPath, 'audit-package.json');
    if (!existsSync(auditPkg)) {
      this.error(
        `Client ${slug} has no audit-package.json. Run synthesize first.`,
      );
    }

    const format = flags.format as PdfFormat;
    const perRouteDir = join(clientPath, 'report-pdfs');
    mkdirSync(perRouteDir, { recursive: true });
    const mergedOut = flags.out ? resolve(flags.out) : join(clientPath, 'report.pdf');

    // b. Lazy-import Playwright so users without it get a clean error.
    let chromium: typeof import('playwright').chromium;
    try {
      const pw = await import('playwright');
      chromium = pw.chromium;
    } catch {
      this.error(
        'Playwright not installed. Install: pnpm exec playwright install chromium',
      );
    }

    // c. Boot dashboard, render each route to PDF.
    const perRoutePaths: string[] = [];
    await withDashboardServer(
      {
        port: flags.port,
        clientsDir: clientsBase,
        rebuild: flags.rebuild,
        log: (msg) => this.log(msg),
      },
      async (baseUrl) => {
        const browser = await chromium.launch({ headless: true });
        try {
          for (const { route, name } of ROUTES) {
            const url = `${baseUrl}/deliverables/${slug}${route}`;
            const ctx = await browser.newContext({
              viewport: { width: 1440, height: 900 },
              deviceScaleFactor: 1,
            });
            const page = await ctx.newPage();
            try {
              // Apply @media print rules BEFORE navigation so the SSR DOM
              // hydrates with the print-mode styles already in effect.
              await page.emulateMedia({ media: 'print' });
              await page.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
              // Settle web fonts so headings render with the correct face.
              await page.evaluate('document.fonts.ready');
              const pdfBytes = await page.pdf({
                format,
                printBackground: true,
                margin: {
                  top: '14mm',
                  right: '14mm',
                  bottom: '14mm',
                  left: '14mm',
                },
              });
              const outPath = join(perRouteDir, `${name}.pdf`);
              writeFileSync(outPath, pdfBytes);
              perRoutePaths.push(outPath);
              this.log(`[report-pdf] ${url} → ${outPath}`);
            } finally {
              await page.close().catch(() => {});
              await ctx.close().catch(() => {});
            }
          }
        } finally {
          await browser.close().catch(() => {});
        }
      },
    );

    // d. Merge per-route PDFs in route order into a single deliverable.
    const outDoc = await PDFDocument.create();
    for (const pdfPath of perRoutePaths) {
      const bytes = readFileSync(pdfPath);
      const src = await PDFDocument.load(bytes);
      const pages = await outDoc.copyPages(src, src.getPageIndices());
      for (const p of pages) outDoc.addPage(p);
    }
    const mergedBytes = await outDoc.save();
    mkdirSync(resolve(mergedOut, '..'), { recursive: true });
    writeFileSync(mergedOut, mergedBytes);

    const sizeBytes = statSync(mergedOut).size;
    this.log(
      `[report-pdf] Merged PDF written: ${mergedOut} (${formatBytes(sizeBytes)})`,
    );
  }
}

/**
 * Render a byte count as a human-friendly string (KB/MB).
 *
 * @param bytes - File size in bytes.
 * @returns Short, human-readable size string.
 */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
