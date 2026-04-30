import { execFileSync } from 'node:child_process';
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { basename, join, resolve } from 'node:path';

import { Args, Flags } from '@oclif/core';
import { clientDir } from '@upriver/core';

import { BaseCommand } from '../base-command.js';

interface MajorPagesFile {
  generatedAt: string;
  slug: string;
  siteUrl: string;
  major: Array<{ path: string; url: string; title: string; reason: string; slug: string }>;
}

interface ManifestEntry {
  path: string;
  url: string;
  title: string;
  reason: string;
  fileSlug: string;
  desktop?: { file: string; width: number; height: number };
  mobile?: { file: string; width: number; height: number };
}

const DESKTOP_VIEWPORT = { width: 1440, height: 900 } as const;
const MOBILE_VIEWPORT = { width: 414, height: 896 } as const;

export default class CaptureMajor extends BaseCommand {
  static override description =
    'Capture full-page Playwright screenshots (desktop + mobile) of every page in clients/<slug>/major-pages.json. Output: clients/<slug>/design-handoff/{desktop,mobile}/<page>.png + manifest.json + a single <slug>-design-handoff.zip ready to drag into Claude Design.';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    'reuse-live': Flags.boolean({
      description: 'Reuse existing screenshots from clients/<slug>/screenshots/live/ when present (skip Playwright for those pages)',
      default: true,
      allowNo: true,
    }),
    force: Flags.boolean({
      description: 'Re-capture every page even if a screenshot already exists in design-handoff/',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CaptureMajor);
    const { slug } = args;
    const dir = clientDir(slug);
    if (!existsSync(dir)) this.error(`Client directory not found: ${dir}`);

    const majorPath = join(dir, 'major-pages.json');
    if (!existsSync(majorPath)) {
      this.error(`major-pages.json missing — run "upriver major-pages ${slug}" first.`);
    }
    const major = JSON.parse(readFileSync(majorPath, 'utf8')) as MajorPagesFile;
    if (major.major.length === 0) this.error('No major pages to capture.');

    const handoffDir = join(dir, 'design-handoff');
    const desktopDir = join(handoffDir, 'desktop');
    const mobileDir = join(handoffDir, 'mobile');
    mkdirSync(desktopDir, { recursive: true });
    mkdirSync(mobileDir, { recursive: true });

    const liveDesktopDir = join(dir, 'screenshots', 'live', 'desktop');
    const liveMobileDir = join(dir, 'screenshots', 'live', 'mobile');

    const entries: ManifestEntry[] = [];
    let toCapture: Array<{ entry: ManifestEntry; viewport: 'desktop' | 'mobile' }> = [];

    for (const m of major.major) {
      const fileSlug = pageFileSlug(m.path);
      const entry: ManifestEntry = {
        path: m.path,
        url: m.url,
        title: m.title,
        reason: m.reason,
        fileSlug,
      };

      const desktopOut = join(desktopDir, `${fileSlug}.png`);
      const mobileOut = join(mobileDir, `${fileSlug}.png`);

      const desktopReused = tryReuse({
        out: desktopOut,
        live: join(liveDesktopDir, `${fileSlug}.png`),
        force: flags.force,
        reuseLive: flags['reuse-live'],
      });
      const mobileReused = tryReuse({
        out: mobileOut,
        live: join(liveMobileDir, `${fileSlug}.png`),
        force: flags.force,
        reuseLive: flags['reuse-live'],
      });

      if (desktopReused) {
        entry.desktop = { file: relativeToHandoff(desktopOut, handoffDir), ...probeDimensions(desktopOut) };
      } else {
        toCapture.push({ entry, viewport: 'desktop' });
      }
      if (mobileReused) {
        entry.mobile = { file: relativeToHandoff(mobileOut, handoffDir), ...probeDimensions(mobileOut) };
      } else {
        toCapture.push({ entry, viewport: 'mobile' });
      }
      entries.push(entry);
    }

    if (toCapture.length > 0) {
      this.log(`Launching Playwright for ${toCapture.length} screenshot(s)...`);
      const { chromium } = await import('playwright');
      const browser = await chromium.launch();
      try {
        for (const job of toCapture) {
          const out = job.viewport === 'desktop'
            ? join(desktopDir, `${job.entry.fileSlug}.png`)
            : join(mobileDir, `${job.entry.fileSlug}.png`);
          this.log(`  ${job.viewport.padEnd(7)} ${job.entry.url} → ${basename(out)}`);
          try {
            await captureFullPage(browser, job.entry.url, out, job.viewport);
            const dims = probeDimensions(out);
            const fileRel = relativeToHandoff(out, handoffDir);
            if (job.viewport === 'desktop') job.entry.desktop = { file: fileRel, ...dims };
            else job.entry.mobile = { file: fileRel, ...dims };
          } catch (err) {
            this.warn(`    [${job.viewport}] failed: ${(err as Error).message}`);
          }
        }
      } finally {
        await browser.close();
      }
    } else {
      this.log('All screenshots already present (use --force to recapture).');
    }

    const manifest = {
      generatedAt: new Date().toISOString(),
      slug,
      siteUrl: major.siteUrl,
      viewports: { desktop: DESKTOP_VIEWPORT, mobile: MOBILE_VIEWPORT },
      pages: entries,
    };
    const manifestPath = join(handoffDir, 'manifest.json');
    writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
    this.log(`\nWrote ${manifestPath}`);

    const zipPath = join(handoffDir, `${slug}-design-handoff.zip`);
    if (existsSync(zipPath)) rmSync(zipPath);
    try {
      execFileSync(
        'zip',
        ['-r', '-q', basename(zipPath), 'desktop', 'mobile', 'manifest.json'],
        { cwd: handoffDir, stdio: 'pipe' },
      );
      this.log(`Wrote ${zipPath}`);
    } catch (err) {
      this.warn(`zip failed: ${(err as Error).message} — desktop/ + mobile/ + manifest.json are still on disk.`);
    }

    this.log(`\nDone. ${entries.length} page(s) ready for Claude Design.`);
  }
}

function tryReuse(args: { out: string; live: string; force: boolean; reuseLive: boolean }): boolean {
  const { out, live, force, reuseLive } = args;
  if (force) return false;
  if (existsSync(out)) return true;
  if (reuseLive && existsSync(live)) {
    copyFileSync(live, out);
    return true;
  }
  return false;
}

function relativeToHandoff(absPath: string, handoffDir: string): string {
  return absPath.startsWith(handoffDir + '/') ? absPath.slice(handoffDir.length + 1) : absPath;
}

function probeDimensions(file: string): { width: number; height: number } {
  // PNG header parse: bytes 16..23 are width/height as big-endian uint32.
  try {
    const buf = readFileSync(file);
    if (buf.length < 24) return { width: 0, height: 0 };
    const width = buf.readUInt32BE(16);
    const height = buf.readUInt32BE(20);
    return { width, height };
  } catch {
    try {
      const size = statSync(file).size;
      return size > 0 ? { width: 0, height: 0 } : { width: 0, height: 0 };
    } catch {
      return { width: 0, height: 0 };
    }
  }
}

function pageFileSlug(path: string): string {
  if (path === '/' || path === '') return 'home';
  return path.replace(/^\/+|\/+$/g, '').replace(/\//g, '-').toLowerCase() || 'home';
}

interface ChromiumBrowser {
  newContext(opts: unknown): Promise<unknown>;
}

async function captureFullPage(
  browser: ChromiumBrowser,
  url: string,
  outPath: string,
  viewportLabel: 'desktop' | 'mobile',
): Promise<void> {
  const viewport = viewportLabel === 'desktop' ? DESKTOP_VIEWPORT : MOBILE_VIEWPORT;
  const isMobile = viewportLabel === 'mobile';
  const ctx = (await browser.newContext({
    viewport,
    isMobile,
    deviceScaleFactor: 1,
  })) as { newPage: () => Promise<unknown>; close: () => Promise<void> };
  try {
    const pg = (await ctx.newPage()) as {
      goto: (u: string, o: unknown) => Promise<unknown>;
      evaluate: (fn: () => Promise<unknown>) => Promise<unknown>;
      screenshot: (o: unknown) => Promise<unknown>;
    };
    await pg.goto(url, { waitUntil: 'networkidle', timeout: 30_000 });
    await pg.evaluate(async () => {
      const total = document.documentElement.scrollHeight;
      for (let y = 0; y < total; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 80));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 200));
    });
    await pg.screenshot({ path: outPath, fullPage: true, type: 'png' });
  } finally {
    await ctx.close();
  }
}
