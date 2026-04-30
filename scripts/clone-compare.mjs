#!/usr/bin/env node
/**
 * Render the cloned site, screenshot every page at the same viewports as the
 * live capture, and write side-by-side diff images to
 * `clients/<slug>/clone-compare/`. Used as the eyes for the iteration loop.
 *
 * Steps:
 *   1. `pnpm build` the cloned repo (so dist/client/ is fresh).
 *   2. Spawn an `astro preview` server (or use a static-files server pointing
 *      at dist/client) on a free port.
 *   3. For each page in audit-package.siteStructure.pages, navigate, capture
 *      full-page screenshot at 1440x900 desktop and 414x896 mobile.
 *   4. Stitch a side-by-side PNG (live | cloned) and write to clone-compare/.
 *   5. Compute a coarse pixel-similarity score using pixelmatch on a
 *      downscaled tile so it's fast even on tall pages.
 *
 * Usage:
 *   node scripts/clone-compare.mjs <slug> [--page <slug>] [--no-build]
 */
import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  createReadStream,
  createWriteStream,
} from 'node:fs';
import { spawn, spawnSync } from 'node:child_process';
import { join, resolve, dirname } from 'node:path';

const cliRoot = new URL('../packages/cli/node_modules/', import.meta.url).href;
const { chromium } = await import(`${cliRoot}playwright/index.mjs`);
const { PNG } = await import(`${cliRoot}pngjs/lib/png.js`);
const pixelmatch = (await import(`${cliRoot}pixelmatch/index.js`)).default;

const slug = process.argv[2];
if (!slug) {
  console.error('usage: clone-compare.mjs <slug> [--page <slug>] [--no-build]');
  process.exit(1);
}

const onlyPage = (() => {
  const i = process.argv.indexOf('--page');
  return i > 0 ? process.argv[i + 1] : null;
})();
const skipBuild = process.argv.includes('--no-build');

const projectRoot = resolve('.');
const clientDir = resolve(projectRoot, 'clients', slug);
const repoDir = join(clientDir, 'repo');
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

function slugify(p) {
  if (p.slug === 'home' || p.slug === '/' || p.slug === '') return 'home';
  return p.slug.replace(/^\/+|\/+$/g, '').replace(/\//g, '-').toLowerCase() || 'home';
}

function pagePath(p) {
  if (p.slug === 'home' || p.slug === '/' || p.slug === '') return '/';
  const norm = p.slug.startsWith('/') ? p.slug : `/${p.slug}`;
  return norm.replace(/\/+$/, '');
}

const compareDir = join(clientDir, 'clone-compare');
mkdirSync(compareDir, { recursive: true });

if (!skipBuild) {
  console.log('Building cloned repo...');
  const r = spawnSync('pnpm', ['build'], { cwd: repoDir, stdio: 'inherit' });
  if (r.status !== 0) {
    console.error('Build failed.');
    process.exit(1);
  }
}

// Use astro's `preview` command so SSR pages also render. dist/client serving
// works for fully-static builds, but the Vercel adapter splits them, so
// preview is more reliable across configs.
const PORT = 5500 + Math.floor(Math.random() * 200);
console.log(`Starting astro preview on :${PORT}...`);
// astro preview reads adapter config; the Vercel adapter doesn't support
// preview, so we fall back to a tiny static server reading dist/client.
const distClient = join(repoDir, 'dist', 'client');
if (!existsSync(distClient)) {
  console.error(`dist/client not found at ${distClient}. Run with build first.`);
  process.exit(1);
}
const server = spawn(
  process.execPath,
  ['-e', `
    import('node:http').then(({createServer})=>{
      import('node:fs').then(fs=>{
        import('node:path').then(({join, extname})=>{
          const root = ${JSON.stringify(distClient)};
          const MIME = {'.html':'text/html','.css':'text/css','.js':'text/javascript','.svg':'image/svg+xml','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.webp':'image/webp','.ico':'image/x-icon','.woff':'font/woff','.woff2':'font/woff2','.json':'application/json','.txt':'text/plain'};
          createServer((req,res)=>{
            let p = decodeURIComponent(req.url.split('?')[0]);
            if (p.endsWith('/')) p += 'index.html';
            else if (!extname(p)) p += '/index.html';
            const fp = join(root, p);
            if (!fp.startsWith(root)) { res.writeHead(403); res.end(); return; }
            fs.promises.readFile(fp).then(buf=>{
              res.writeHead(200, {'content-type': MIME[extname(fp).toLowerCase()]||'application/octet-stream'});
              res.end(buf);
            }).catch(()=>{ res.writeHead(404); res.end('Not found'); });
          }).listen(${PORT}, '127.0.0.1', ()=>console.log('READY'));
        });
      });
    });
  `],
  { stdio: ['ignore', 'pipe', 'inherit'] },
);
await new Promise((r) => {
  server.stdout.on('data', (c) => {
    if (c.toString().includes('READY')) r();
  });
});

const browser = await chromium.launch();

const liveDir = join(clientDir, 'screenshots', 'live');
const cloneDir = join(compareDir, 'cloned');
const sideDir = join(compareDir, 'side-by-side');
mkdirSync(join(cloneDir, 'desktop'), { recursive: true });
mkdirSync(join(cloneDir, 'mobile'), { recursive: true });
mkdirSync(join(sideDir, 'desktop'), { recursive: true });
mkdirSync(join(sideDir, 'mobile'), { recursive: true });

const summary = [];
for (const page of PAGES) {
  const fileSlug = slugify(page);
  const pagePathStr = pagePath(page);
  const url = `http://127.0.0.1:${PORT}${pagePathStr === '/' ? '/' : pagePathStr}`;
  console.log(`\n${pagePathStr} → ${fileSlug}`);

  for (const [label, viewport, isMobile] of [
    ['desktop', { width: 1440, height: 900 }, false],
    ['mobile', { width: 414, height: 896 }, true],
  ]) {
    const ctx = await browser.newContext({ viewport, isMobile, deviceScaleFactor: 1 });
    const pg = await ctx.newPage();
    let cloneShot = join(cloneDir, label, `${fileSlug}.png`);
    try {
      await pg.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
      await pg.evaluate(async () => {
        const total = document.documentElement.scrollHeight;
        for (let y = 0; y < total; y += 600) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 200));
      });
      await pg.screenshot({ path: cloneShot, fullPage: true, type: 'png' });
    } catch (err) {
      console.error(`  [${label}] failed: ${err.message}`);
      cloneShot = null;
    } finally {
      await ctx.close();
    }

    const liveShot = join(liveDir, label, `${fileSlug}.png`);
    if (!existsSync(liveShot) || !cloneShot) {
      console.log(`  [${label}] missing screenshot — skipping diff`);
      continue;
    }

    const sidePath = join(sideDir, label, `${fileSlug}.png`);
    const score = await stitchAndScore(liveShot, cloneShot, sidePath);
    summary.push({ page: fileSlug, viewport: label, similarity: score });
    console.log(`  [${label}] similarity=${(score * 100).toFixed(1)}%  → ${sidePath}`);
  }
}

writeFileSync(
  join(compareDir, 'summary.json'),
  JSON.stringify({ generatedAt: new Date().toISOString(), results: summary }, null, 2),
);
console.log(`\nWrote ${summary.length} comparisons → ${compareDir}/summary.json`);

await browser.close();
server.kill();

async function stitchAndScore(livePath, clonePath, outPath) {
  const live = await loadPng(livePath);
  const clone = await loadPng(clonePath);

  // Normalize to same width (the smaller of the two) for a fair tile compare.
  const w = Math.min(live.width, clone.width);
  const liveResized = cropTo(live, w, Math.min(live.height, 2400));
  const cloneResized = cropTo(clone, w, Math.min(clone.height, 2400));

  // Pad both to same height
  const h = Math.max(liveResized.height, cloneResized.height);
  const livePadded = padBottom(liveResized, h);
  const clonePadded = padBottom(cloneResized, h);

  // Stitch side by side: [live] | [clone]
  const out = new PNG({ width: w * 2 + 20, height: h });
  out.data.fill(0xff); // white
  PNG.bitblt(livePadded, out, 0, 0, w, h, 0, 0);
  PNG.bitblt(clonePadded, out, 0, 0, w, h, w + 20, 0);

  await new Promise((res, rej) => {
    out.pack().pipe(createWriteStream(outPath)).on('finish', res).on('error', rej);
  });

  // Cheap similarity: downscale-equivalent using stride sampling, then
  // pixelmatch on the trimmed top portion (1200px) to focus on hero/above-fold.
  const compareH = Math.min(1200, livePadded.height, clonePadded.height);
  const a = cropTo(livePadded, w, compareH);
  const b = cropTo(clonePadded, w, compareH);
  const diff = new PNG({ width: w, height: compareH });
  const mismatched = pixelmatch(a.data, b.data, diff.data, w, compareH, {
    threshold: 0.18,
    includeAA: false,
    alpha: 0.3,
  });
  const total = w * compareH;
  return 1 - mismatched / total;
}

function loadPng(p) {
  return new Promise((res, rej) => {
    const png = new PNG();
    createReadStream(p)
      .pipe(png)
      .on('parsed', () => res(png))
      .on('error', rej);
  });
}

function cropTo(src, w, h) {
  const out = new PNG({ width: w, height: h });
  PNG.bitblt(src, out, 0, 0, Math.min(w, src.width), Math.min(h, src.height), 0, 0);
  return out;
}

function padBottom(src, h) {
  if (src.height >= h) return cropTo(src, src.width, h);
  const out = new PNG({ width: src.width, height: h });
  out.data.fill(0xff);
  PNG.bitblt(src, out, 0, 0, src.width, src.height, 0, 0);
  return out;
}
