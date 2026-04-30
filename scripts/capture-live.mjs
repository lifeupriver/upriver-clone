#!/usr/bin/env node
/**
 * Capture full-page screenshots of every page in a client's siteStructure
 * via Playwright. Output to clients/<slug>/screenshots/live/<page>.png at
 * desktop and mobile viewports. Used as the visual truth baseline for the
 * pixel-accurate clone iteration loop.
 */
import { mkdirSync, readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
// Resolve playwright from packages/cli where it's installed.
const { chromium } = await import(
  new URL('../packages/cli/node_modules/playwright/index.mjs', import.meta.url).href
);

const slug = process.argv[2];
if (!slug) {
  console.error('usage: capture-live.mjs <slug> [--page <slug>]');
  process.exit(1);
}

const onlyPage = (() => {
  const i = process.argv.indexOf('--page');
  return i > 0 ? process.argv[i + 1] : null;
})();

const clientDir = resolve('clients', slug);
const auditPath = join(clientDir, 'audit-package.json');
if (!existsSync(auditPath)) {
  console.error(`audit-package.json missing at ${auditPath}`);
  process.exit(1);
}

const pkg = JSON.parse(readFileSync(auditPath, 'utf8'));
const allPages = pkg.siteStructure.pages.filter((p) => p.statusCode < 400);

const PAGES = onlyPage
  ? allPages.filter((p) => slugify(p) === onlyPage || p.slug === onlyPage)
  : allPages;

if (PAGES.length === 0) {
  console.error(`No matching page for "${onlyPage}".`);
  process.exit(1);
}

const desktopDir = join(clientDir, 'screenshots', 'live', 'desktop');
const mobileDir = join(clientDir, 'screenshots', 'live', 'mobile');
mkdirSync(desktopDir, { recursive: true });
mkdirSync(mobileDir, { recursive: true });

function slugify(p) {
  if (p.slug === 'home' || p.slug === '/' || p.slug === '') return 'home';
  return p.slug.replace(/^\/+|\/+$/g, '').replace(/\//g, '-').toLowerCase() || 'home';
}

const browser = await chromium.launch();
console.log(`Capturing ${PAGES.length} page(s) for ${slug}...`);

for (const page of PAGES) {
  const fileSlug = slugify(page);
  const url = page.url;
  console.log(`  ${url} → ${fileSlug}.png`);

  for (const [label, dir, viewport, isMobile] of [
    ['desktop', desktopDir, { width: 1440, height: 900 }, false],
    ['mobile', mobileDir, { width: 414, height: 896 }, true],
  ]) {
    const ctx = await browser.newContext({
      viewport,
      isMobile,
      deviceScaleFactor: 1,
    });
    const pg = await ctx.newPage();
    try {
      await pg.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
      // Trigger any lazy images by scrolling top→bottom→top.
      await pg.evaluate(async () => {
        const total = document.documentElement.scrollHeight;
        for (let y = 0; y < total; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 80));
        }
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 200));
      });
      await pg.screenshot({
        path: join(dir, `${fileSlug}.png`),
        fullPage: true,
        type: 'png',
      });
    } catch (err) {
      console.error(`    [${label}] failed: ${err.message}`);
    } finally {
      await ctx.close();
    }
  }
}

await browser.close();
console.log('Done.');
