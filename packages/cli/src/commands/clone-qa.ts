import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'node:fs';
import { join, basename, relative } from 'node:path';
import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { resolveScaffoldPaths } from '../scaffold/template-writer.js';

interface PageQa {
  route: string;
  slug: string;
  liveScreenshot: string | null;
  cloneScreenshot: string;
  status: 'ok' | 'no-live' | 'navigation-failed';
  navTimeMs?: number;
  error?: string;
}

export default class CloneQa extends BaseCommand {
  static override description =
    'Visual QA: screenshot every cloned route at desktop, render side-by-side HTML report against the live screenshots.';

  static override examples = [
    '<%= config.bin %> clone-qa audreys',
    '<%= config.bin %> clone-qa audreys --port 4322 --width 1440',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    port: Flags.integer({
      description: 'Local dev-server port for the cloned site',
      default: 4322,
    }),
    width: Flags.integer({ description: 'Viewport width', default: 1280 }),
    height: Flags.integer({ description: 'Viewport height', default: 800 }),
    'full-page': Flags.boolean({
      description: 'Capture full scrollable page (default: viewport only)',
      default: true,
      allowNo: true,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CloneQa);
    const { slug } = args;
    const { clientDir, repoDir } = resolveScaffoldPaths(slug);

    if (!existsSync(repoDir)) {
      this.error(`Scaffolded repo not found at ${repoDir}.`);
    }

    const liveDir = join(clientDir, 'screenshots', 'desktop');
    const outDir = join(clientDir, 'clone-qa', 'desktop');
    mkdirSync(outDir, { recursive: true });

    const pagesDir = join(repoDir, 'src', 'pages');
    const slugs = readdirSync(pagesDir)
      .filter((f) => f.endsWith('.astro'))
      .map((f) => basename(f, '.astro'))
      .sort();

    if (slugs.length === 0) this.error('No .astro pages found in cloned repo.');

    this.log(`\nClone QA for "${slug}" — ${slugs.length} routes`);
    this.log(`  Local dev:  http://localhost:${flags.port}`);
    this.log(`  Viewport:   ${flags.width}x${flags.height}${flags['full-page'] ? ' (full page)' : ''}`);
    this.log(`  Live shots: ${liveDir}`);
    this.log(`  Output:     ${outDir}`);

    let chromium: typeof import('playwright').chromium;
    try {
      const pw = await import('playwright');
      chromium = pw.chromium;
    } catch {
      this.error('Playwright not installed. Run: pnpm --filter @upriver/cli exec playwright install chromium');
    }

    const baseUrl = `http://localhost:${flags.port}`;
    try {
      const ping = await fetch(baseUrl, { signal: AbortSignal.timeout(2000) });
      if (!ping.ok && ping.status >= 500) throw new Error(`HTTP ${ping.status}`);
    } catch (e) {
      this.error(
        `Cloned dev server not reachable at ${baseUrl}. Start it with:\n  cd ${relative(process.cwd(), repoDir)} && pnpm dev --port ${flags.port}`,
      );
    }

    const browser = await chromium.launch();
    const context = await browser.newContext({
      viewport: { width: flags.width, height: flags.height },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    const results: PageQa[] = [];
    for (const fileSlug of slugs) {
      const route = fileSlug === 'index' ? '/' : `/${fileSlug}`;
      const liveSlug = fileSlug === 'index' ? 'home' : fileSlug;
      const liveShot = join(liveDir, `${liveSlug}.png`);
      const cloneShot = join(outDir, `${liveSlug}.png`);
      const liveExists = existsSync(liveShot);

      const t0 = Date.now();
      try {
        const resp = await page.goto(`${baseUrl}${route}`, {
          waitUntil: 'networkidle',
          timeout: 20000,
        });
        if (!resp || resp.status() >= 400) throw new Error(`HTTP ${resp?.status() ?? 'no-response'}`);
        await page.screenshot({ path: cloneShot, fullPage: flags['full-page'] });
        const navTimeMs = Date.now() - t0;
        results.push({
          route,
          slug: liveSlug,
          liveScreenshot: liveExists ? liveShot : null,
          cloneScreenshot: cloneShot,
          status: liveExists ? 'ok' : 'no-live',
          navTimeMs,
        });
        this.log(`  ✓ ${route.padEnd(50)} ${navTimeMs}ms${liveExists ? '' : '  (no live screenshot to compare)'}`);
      } catch (e) {
        results.push({
          route,
          slug: liveSlug,
          liveScreenshot: liveExists ? liveShot : null,
          cloneScreenshot: cloneShot,
          status: 'navigation-failed',
          error: (e as Error).message,
        });
        this.log(`  ✗ ${route.padEnd(50)} ${(e as Error).message}`);
      }
    }

    await browser.close();

    const reportHtml = renderReport({
      slug,
      results,
      liveDir,
      outDir,
      viewport: { width: flags.width, height: flags.height },
      fullPage: flags['full-page'],
    });
    const reportPath = join(clientDir, 'clone-qa', 'index.html');
    writeFileSync(reportPath, reportHtml, 'utf-8');

    const ok = results.filter((r) => r.status === 'ok').length;
    const noLive = results.filter((r) => r.status === 'no-live').length;
    const failed = results.filter((r) => r.status === 'navigation-failed').length;

    this.log(`\n  Summary: ${ok} compared, ${noLive} no-live-shot, ${failed} failed`);
    this.log(`  Report:  file://${reportPath}`);
    this.log('');
  }
}

function renderReport(args: {
  slug: string;
  results: PageQa[];
  liveDir: string;
  outDir: string;
  viewport: { width: number; height: number };
  fullPage: boolean;
}): string {
  const { slug, results, liveDir, outDir, viewport, fullPage } = args;
  const reportDir = join(outDir, '..');

  const rel = (p: string): string => relative(reportDir, p);

  const rows = results
    .map((r) => {
      const livePath = r.liveScreenshot ? rel(r.liveScreenshot) : null;
      const clonePath = rel(r.cloneScreenshot);
      const statusBadge =
        r.status === 'ok'
          ? `<span class="b ok">ok</span>`
          : r.status === 'no-live'
            ? `<span class="b warn">no live shot</span>`
            : `<span class="b err">failed</span>`;
      const errorBlock = r.error ? `<div class="err-msg">${escapeHtml(r.error)}</div>` : '';
      return `
        <section class="row" id="${escapeHtml(r.slug)}">
          <header>
            <h2><a href="http://localhost:4322${r.route}" target="_blank">${escapeHtml(r.route)}</a></h2>
            <div class="meta">${statusBadge}${r.navTimeMs ? ` · ${r.navTimeMs}ms` : ''}</div>
          </header>
          ${errorBlock}
          <div class="grid">
            <figure>
              <figcaption>Live (Squarespace)</figcaption>
              ${livePath ? `<img src="${escapeHtml(livePath)}" loading="lazy" />` : `<div class="no-img">No live screenshot</div>`}
            </figure>
            <figure>
              <figcaption>Cloned (Astro)</figcaption>
              <img src="${escapeHtml(clonePath)}" loading="lazy" />
            </figure>
          </div>
        </section>`;
    })
    .join('\n');

  const toc = results
    .map((r) => {
      const dot = r.status === 'ok' ? '·' : r.status === 'no-live' ? '!' : '✗';
      return `<li><a href="#${escapeHtml(r.slug)}"><span class="dot ${r.status}">${dot}</span>${escapeHtml(r.route)}</a></li>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>Clone QA — ${escapeHtml(slug)}</title>
  <style>
    :root {
      --bg: #fafaf8;
      --ink: #1b1b1b;
      --muted: #6b6b6b;
      --line: #e5e5e2;
      --ok: #2f7a3a;
      --warn: #b08a16;
      --err: #b03333;
    }
    * { box-sizing: border-box; }
    body { margin: 0; font: 14px/1.5 ui-sans-serif, system-ui, sans-serif; background: var(--bg); color: var(--ink); }
    .layout { display: grid; grid-template-columns: 240px 1fr; min-height: 100vh; }
    nav { position: sticky; top: 0; align-self: start; height: 100vh; overflow-y: auto; padding: 1rem; border-right: 1px solid var(--line); background: white; }
    nav h1 { font-size: 14px; margin: 0 0 0.5rem; }
    nav .info { color: var(--muted); font-size: 12px; margin-bottom: 1rem; }
    nav ul { list-style: none; padding: 0; margin: 0; }
    nav li { margin: 0; }
    nav a { display: block; padding: 4px 6px; color: var(--ink); text-decoration: none; border-radius: 3px; font-size: 12px; }
    nav a:hover { background: var(--bg); }
    .dot { display: inline-block; width: 14px; text-align: center; margin-right: 4px; font-weight: bold; }
    .dot.ok { color: var(--ok); }
    .dot.no-live { color: var(--warn); }
    .dot.navigation-failed { color: var(--err); }
    main { padding: 1.5rem; max-width: 100%; }
    .row { background: white; border: 1px solid var(--line); border-radius: 6px; padding: 1rem; margin-bottom: 1.5rem; }
    .row header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.75rem; }
    .row h2 { font-size: 16px; margin: 0; }
    .row h2 a { color: var(--ink); text-decoration: none; }
    .row h2 a:hover { text-decoration: underline; }
    .meta { color: var(--muted); font-size: 12px; }
    .b { display: inline-block; padding: 2px 6px; border-radius: 3px; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
    .b.ok { background: #d8efde; color: var(--ok); }
    .b.warn { background: #f6efd8; color: var(--warn); }
    .b.err { background: #f6dada; color: var(--err); }
    .err-msg { background: #f6dada; color: var(--err); padding: 8px 12px; border-radius: 4px; font-family: ui-monospace, monospace; font-size: 12px; margin-bottom: 0.75rem; }
    .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; }
    figure { margin: 0; }
    figcaption { font-size: 11px; color: var(--muted); margin-bottom: 4px; text-transform: uppercase; letter-spacing: 0.05em; font-weight: 600; }
    img { width: 100%; height: auto; display: block; border: 1px solid var(--line); border-radius: 3px; }
    .no-img { padding: 4rem 1rem; background: var(--bg); border: 1px dashed var(--line); border-radius: 3px; text-align: center; color: var(--muted); font-style: italic; }
  </style>
</head>
<body>
  <div class="layout">
    <nav>
      <h1>Clone QA — ${escapeHtml(slug)}</h1>
      <div class="info">
        ${results.length} routes · ${viewport.width}×${viewport.height}${fullPage ? ' · full page' : ''}
      </div>
      <ul>${toc}</ul>
    </nav>
    <main>${rows}</main>
  </div>
</body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
