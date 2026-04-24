import { Args, Flags } from '@oclif/core';
import {
  writeFileSync,
  mkdirSync,
  existsSync,
  readFileSync,
  createWriteStream,
} from 'node:fs';
import { join, extname } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { BaseCommand } from '../base-command.js';
import {
  FirecrawlClient,
  readClientConfig,
  clientDir,
} from '@upriver/core';
import type {
  FirecrawlScrapeResult,
  FirecrawlBrandingProfile,
} from '@upriver/core';

// Combined extraction schema — all structured data in one JSON pass
const COMBINED_SCHEMA = {
  type: 'object',
  properties: {
    ctaButtons: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          text: { type: 'string' },
          href: { type: 'string' },
          type: { type: 'string', enum: ['primary', 'secondary', 'link'] },
          location: { type: 'string', description: 'Where on the page (hero, nav, footer, etc.)' },
        },
        required: ['text', 'href'],
      },
    },
    contact: {
      type: 'object',
      properties: {
        phone: { type: 'string' },
        email: { type: 'string' },
        address: { type: 'string' },
        hours: { type: 'string' },
      },
    },
    teamMembers: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          role: { type: 'string' },
          bio: { type: 'string' },
        },
        required: ['name'],
      },
    },
    testimonials: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          quote: { type: 'string' },
          attribution: { type: 'string' },
          rating: { type: 'string' },
          source: { type: 'string', description: 'Google, WeddingWire, The Knot, etc.' },
        },
        required: ['quote'],
      },
    },
    faqs: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          question: { type: 'string' },
          answer: { type: 'string' },
        },
        required: ['question', 'answer'],
      },
    },
    pricing: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          item: { type: 'string' },
          price: { type: 'string' },
          description: { type: 'string' },
        },
        required: ['item'],
      },
    },
    socialLinks: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          platform: { type: 'string' },
          url: { type: 'string' },
        },
        required: ['platform', 'url'],
      },
    },
    eventSpaces: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          capacity: { type: 'string' },
          description: { type: 'string' },
          features: { type: 'array', items: { type: 'string' } },
        },
        required: ['name'],
      },
    },
  },
};

// Key pages that get the branding format (in addition to homepage)
const KEY_PAGE_PATTERNS = ['/about', '/contact', '/venues', '/wedding', '/gallery', '/events'];

interface PageRecord {
  url: string;
  slug: string;
  scraped_at: string;
  metadata: {
    title: string;
    description: string;
    statusCode?: number;
    canonical?: string;
    ogImage?: string;
  };
  content: {
    markdown: string;
    wordCount: number;
    headings: Array<{ level: number; text: string }>;
  };
  links: {
    internal: string[];
    external: string[];
  };
  images: string[];
  screenshots: {
    desktop: string | null;
    mobile: string | null;
  };
  extracted: {
    ctaButtons: unknown[];
    contact: unknown;
    teamMembers: unknown[];
    testimonials: unknown[];
    faqs: unknown[];
    pricing: unknown[];
    socialLinks: unknown[];
    eventSpaces: unknown[];
  };
  rawHtmlPath: string | null;
  hasBranding: boolean;
}

export default class Scrape extends BaseCommand {
  static override description =
    'Run the full deep scrape pass: markdown, html, rawHtml, screenshots, images, links, branding, json extraction';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    pages: Flags.string({
      description: 'Comma-separated page slugs to scrape (default: all)',
    }),
    resume: Flags.boolean({
      description: 'Skip pages that already have a pages/[slug].json file',
      default: false,
    }),
    'skip-mobile': Flags.boolean({
      description: 'Skip mobile screenshot pass (saves ~35 credits)',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Scrape);
    const { slug } = args;
    const apiKey = this.getFirecrawlKey();
    const dir = clientDir(slug);
    const config = readClientConfig(slug);

    // Load URL list
    const siteMapPath = join(dir, 'site-map.json');
    if (!existsSync(siteMapPath)) {
      this.error(`No site-map.json found. Run: upriver init ${slug} first.`);
    }
    const siteMap = JSON.parse(readFileSync(siteMapPath, 'utf8')) as { urls: string[] };
    let urls = siteMap.urls;

    // Apply --pages filter
    if (flags.pages) {
      const filter = new Set(flags.pages.split(',').map((s) => s.trim()));
      urls = urls.filter((u) => {
        const p = new URL(u).pathname.replace(/\/$/, '') || '/';
        return filter.has(p) || filter.has(p.slice(1));
      });
      this.log(`Filtered to ${urls.length} pages: ${flags.pages}`);
    }

    // Apply --resume filter
    if (flags.resume) {
      const before = urls.length;
      urls = urls.filter((u) => !existsSync(join(dir, 'pages', `${urlToSlug(u)}.json`)));
      this.log(`Resume: skipping ${before - urls.length} already-scraped pages, ${urls.length} remaining.`);
    }

    if (urls.length === 0) {
      this.log('All pages already scraped. Use --resume=false to re-scrape.');
      return;
    }

    // Create directory structure
    for (const sub of ['pages', 'screenshots/desktop', 'screenshots/mobile', 'assets/images', 'rawhtml']) {
      mkdirSync(join(dir, sub), { recursive: true });
    }

    const fc = new FirecrawlClient({
      apiKey,
      clientSlug: slug,
      command: 'scrape',
      creditLogPath: join(dir, 'token-and-credit-usage.log'),
    });

    const assetManifest: Array<{ url: string; localPath: string; type: string }> = [];
    let scraped = 0;

    // ── Phase 1: Main content + desktop screenshot + JSON extraction ──────────
    this.log(`\n[1/3] Main scrape: ${urls.length} pages (markdown, rawHtml, screenshot, images, links, json)...`);
    this.log('      This takes 2-5 minutes. Screenshots are downloaded as each page completes.\n');

    const phase1Results: FirecrawlScrapeResult[] = [];

    await fc.batchScrape(
      urls,
      {
        formats: ['markdown', 'rawHtml', 'screenshot', 'links', 'summary'],
        onlyMainContent: false,
        screenshot: { fullPage: true, quality: 85, viewport: { width: 1440, height: 900 } },
      },
      async (result) => {
        scraped++;
        const pageUrl = result.url || result.metadata?.sourceURL || result.metadata?.url || '';
        if (!pageUrl) return;

        process.stdout.write(`\r  [${scraped}/${urls.length}] ${pageUrl.slice(0, 60)}...`);
        phase1Results.push(result);

        // Download screenshot immediately — URLs expire in 24 hours
        const screenshotLocal = await downloadScreenshot(
          result.screenshot,
          join(dir, 'screenshots/desktop'),
          urlToSlug(pageUrl),
        );
        if (screenshotLocal) {
          assetManifest.push({ url: result.screenshot!, localPath: screenshotLocal, type: 'screenshot-desktop' });
        }

        // Extract image URLs from rawHtml and download
        const imgUrls = extractImageUrls(result.rawHtml ?? '', pageUrl);
        for (const imgUrl of imgUrls.slice(0, 20)) {
          const local = await downloadImage(imgUrl, join(dir, 'assets/images'));
          if (local) assetManifest.push({ url: imgUrl, localPath: local, type: 'image' });
        }

        // Save rawHtml to disk
        let rawHtmlPath: string | null = null;
        if (result.rawHtml) {
          rawHtmlPath = join(dir, 'rawhtml', `${urlToSlug(pageUrl)}.html`);
          writeFileSync(rawHtmlPath, result.rawHtml, 'utf8');
        }

        // Write initial page record (will be updated with JSON extraction)
        const record = buildPageRecord(result, pageUrl, screenshotLocal, null, rawHtmlPath, imgUrls);
        writeFileSync(
          join(dir, 'pages', `${urlToSlug(pageUrl)}.json`),
          JSON.stringify(record, null, 2),
          'utf8',
        );
      },
    );

    process.stdout.write('\n');
    this.log(`  Phase 1 complete: ${phase1Results.length} pages scraped.`);

    // ── Phase 2: JSON extraction (structured data from all pages) ─────────────
    this.log(`\n[2/3] JSON extraction: ${urls.length} pages (CTAs, contacts, testimonials, FAQs, pricing)...`);

    let jsonDone = 0;
    const jsonResults = await fc.batchScrape(
      urls,
      {
        formats: ['json'],
        jsonOptions: { schema: COMBINED_SCHEMA },
      },
      async (result) => {
        jsonDone++;
        process.stdout.write(`\r  [${jsonDone}/${urls.length}] extracting structured data...`);
      },
    );

    process.stdout.write('\n');

    // Merge JSON extraction results into page records
    for (const r of jsonResults) {
      const pageUrl = r.url || r.metadata?.sourceURL || r.metadata?.url || '';
      if (!pageUrl) continue;
      const pagePath = join(dir, 'pages', `${urlToSlug(pageUrl)}.json`);
      if (existsSync(pagePath)) {
        const existing = JSON.parse(readFileSync(pagePath, 'utf8')) as PageRecord;
        if (r.json) {
          const j = r.json as Record<string, unknown>;
          existing.extracted = {
            ctaButtons: (j['ctaButtons'] as unknown[]) ?? [],
            contact: j['contact'] ?? {},
            teamMembers: (j['teamMembers'] as unknown[]) ?? [],
            testimonials: (j['testimonials'] as unknown[]) ?? [],
            faqs: (j['faqs'] as unknown[]) ?? [],
            pricing: (j['pricing'] as unknown[]) ?? [],
            socialLinks: (j['socialLinks'] as unknown[]) ?? [],
            eventSpaces: (j['eventSpaces'] as unknown[]) ?? [],
          };
        }
        writeFileSync(pagePath, JSON.stringify(existing, null, 2), 'utf8');
      }
    }

    this.log(`  JSON extraction complete.`);

    // ── Phase 3: Branding (homepage + key pages) ──────────────────────────────
    const brandingUrls = selectBrandingUrls(urls, config.url);
    this.log(`\n[3/3] Branding extraction: ${brandingUrls.length} pages (homepage + key pages)...`);

    let brandingProfile: FirecrawlBrandingProfile | null = null;

    for (const u of brandingUrls) {
      try {
        const result = await fc.scrape(u, { formats: ['branding'] });
        if (result.branding && !brandingProfile) {
          brandingProfile = result.branding;
        }
        // Merge branding into the page record
        const pagePath = join(dir, 'pages', `${urlToSlug(u)}.json`);
        if (existsSync(pagePath)) {
          const existing = JSON.parse(readFileSync(pagePath, 'utf8')) as PageRecord;
          existing.hasBranding = true;
          writeFileSync(pagePath, JSON.stringify(existing, null, 2), 'utf8');
        }
        this.log(`  Branding extracted: ${u}`);
      } catch (err) {
        this.warn(`  Branding failed for ${u}: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Write design-tokens.json
    if (brandingProfile) {
      writeFileSync(
        join(dir, 'design-tokens.json'),
        JSON.stringify({ extracted_at: new Date().toISOString(), source_url: config.url, ...brandingProfile }, null, 2),
        'utf8',
      );
      this.log(`  design-tokens.json written.`);
    } else {
      this.warn('  No branding data extracted. design-tokens.json not written.');
    }

    // ── Mobile screenshots (optional) ────────────────────────────────────────
    if (!flags['skip-mobile']) {
      this.log(`\n[4/4] Mobile screenshots: ${urls.length} pages (375px viewport)...`);
      let mobileDone = 0;

      await fc.batchScrape(
        urls,
        {
          formats: ['screenshot'],
          screenshot: { fullPage: true, quality: 80, viewport: { width: 375, height: 812 } },
        },
        async (result) => {
          mobileDone++;
          process.stdout.write(`\r  [${mobileDone}/${urls.length}] mobile screenshots...`);
          const pageUrl = result.url || result.metadata?.sourceURL || result.metadata?.url || '';
          if (!pageUrl) return;

          const local = await downloadScreenshot(
            result.screenshot,
            join(dir, 'screenshots/mobile'),
            urlToSlug(pageUrl),
          );
          if (local) {
            assetManifest.push({ url: result.screenshot!, localPath: local, type: 'screenshot-mobile' });
            // Update page record with mobile screenshot path
            const pagePath = join(dir, 'pages', `${urlToSlug(pageUrl)}.json`);
            if (existsSync(pagePath)) {
              const existing = JSON.parse(readFileSync(pagePath, 'utf8')) as PageRecord;
              existing.screenshots.mobile = local;
              writeFileSync(pagePath, JSON.stringify(existing, null, 2), 'utf8');
            }
          }
        },
      );
      process.stdout.write('\n');
    }

    // Write asset manifest
    writeFileSync(
      join(dir, 'asset-manifest.json'),
      JSON.stringify({ generated_at: new Date().toISOString(), total: assetManifest.length, assets: assetManifest }, null, 2),
      'utf8',
    );

    this.log(`\nScrape complete.`);
    this.log(`  Pages scraped:       ${phase1Results.length}`);
    this.log(`  Screenshots (desk):  ${assetManifest.filter((a) => a.type === 'screenshot-desktop').length}`);
    this.log(`  Screenshots (mob):   ${assetManifest.filter((a) => a.type === 'screenshot-mobile').length}`);
    this.log(`  Images downloaded:   ${assetManifest.filter((a) => a.type === 'image').length}`);
    this.log(`  Design tokens:       ${brandingProfile ? 'written' : 'missing'}`);
    this.log(`\nFiles written:`);
    this.log(`  clients/${slug}/pages/          (${phase1Results.length} JSON files)`);
    this.log(`  clients/${slug}/screenshots/    (desktop + mobile)`);
    this.log(`  clients/${slug}/assets/images/`);
    this.log(`  clients/${slug}/design-tokens.json`);
    this.log(`  clients/${slug}/asset-manifest.json`);
    this.log(`  clients/${slug}/rawhtml/`);
    this.log(`\nNext step: upriver audit ${slug}`);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function urlToSlug(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, '') || '/';
    if (path === '/') return 'home';
    return path
      .slice(1)
      .replace(/\//g, '-')
      .replace(/[^a-z0-9-]/gi, '-')
      .replace(/-+/g, '-')
      .toLowerCase()
      .slice(0, 80);
  } catch {
    return 'unknown';
  }
}

function selectBrandingUrls(urls: string[], homeUrl: string): string[] {
  const home = urls.find((u) => {
    try {
      return new URL(u).pathname === '/' || new URL(u).pathname === '';
    } catch {
      return false;
    }
  }) ?? homeUrl;

  const keyMatches = urls
    .filter((u) => KEY_PAGE_PATTERNS.some((p) => u.toLowerCase().includes(p)))
    .slice(0, 2);

  return [...new Set([home, ...keyMatches])];
}

function buildPageRecord(
  result: FirecrawlScrapeResult,
  pageUrl: string,
  desktopScreenshot: string | null,
  mobileScreenshot: string | null,
  rawHtmlPath: string | null,
  images: string[] = [],
): PageRecord {
  const md = result.markdown ?? '';
  const headings = extractHeadings(md);
  const wordCount = md.split(/\s+/).filter(Boolean).length;
  const allLinks = result.links ?? [];
  let baseHost = '';
  try { baseHost = new URL(pageUrl).hostname; } catch { /* ignore */ }
  const internal = allLinks.filter((l) => { if (!l?.href) return false; try { return new URL(l.href).hostname === baseHost; } catch { return l.href.startsWith('/'); } }).map((l) => l.href);
  const external = allLinks.filter((l) => { if (!l?.href) return false; try { return new URL(l.href).hostname !== baseHost; } catch { return false; } }).map((l) => l.href);

  return {
    url: pageUrl,
    slug: urlToSlug(pageUrl),
    scraped_at: new Date().toISOString(),
    metadata: {
      title: result.metadata?.title ?? '',
      description: result.metadata?.description ?? '',
      ...(result.metadata?.statusCode !== undefined ? { statusCode: result.metadata.statusCode } : {}),
      ...(result.metadata?.canonical !== undefined ? { canonical: result.metadata.canonical } : {}),
      ...(result.metadata?.ogImage !== undefined ? { ogImage: result.metadata.ogImage } : {}),
    },
    content: {
      markdown: md,
      wordCount,
      headings,
    },
    links: { internal, external },
    images,
    screenshots: { desktop: desktopScreenshot, mobile: mobileScreenshot },
    extracted: {
      ctaButtons: [],
      contact: {},
      teamMembers: [],
      testimonials: [],
      faqs: [],
      pricing: [],
      socialLinks: [],
      eventSpaces: [],
    },
    rawHtmlPath,
    hasBranding: false,
  };
}

function extractHeadings(markdown: string): Array<{ level: number; text: string }> {
  const headings: Array<{ level: number; text: string }> = [];
  for (const line of markdown.split('\n')) {
    const m = line.match(/^(#{1,6})\s+(.+)/);
    if (m?.[1] && m?.[2]) {
      headings.push({ level: m[1].length, text: m[2].trim() });
    }
  }
  return headings;
}

function extractImageUrls(rawHtml: string, pageUrl: string): string[] {
  const urls: string[] = [];
  const seen = new Set<string>();
  const pattern = /(?:src|data-src|srcset)=["']([^"']+\.(?:jpg|jpeg|png|gif|webp|svg|avif)[^"']*)/gi;
  let m: RegExpExecArray | null;
  let base = '';
  try { base = new URL(pageUrl).origin; } catch { /* ignore */ }

  while ((m = pattern.exec(rawHtml)) !== null) {
    let u = m[1]?.split(' ')[0]?.trim() ?? '';
    if (!u || u.startsWith('data:')) continue;
    if (u.startsWith('//')) u = 'https:' + u;
    else if (u.startsWith('/')) u = base + u;
    else if (!u.startsWith('http')) continue;
    if (!seen.has(u)) { seen.add(u); urls.push(u); }
  }
  return urls;
}

async function downloadScreenshot(
  url: string | undefined,
  dir: string,
  slug: string,
): Promise<string | null> {
  if (!url) return null;
  const localPath = join(dir, `${slug}.png`);
  try {
    const res = await fetch(url);
    if (!res.ok || !res.body) return null;
    mkdirSync(dir, { recursive: true });
    const stream = createWriteStream(localPath);
    await pipeline(Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]), stream);
    return localPath;
  } catch {
    return null;
  }
}

async function downloadImage(url: string, dir: string): Promise<string | null> {
  if (!url || !url.startsWith('http')) return null;
  try {
    const ext = extname(new URL(url).pathname) || '.jpg';
    const name = url.split('/').pop()?.split('?')[0] ?? `img-${Date.now()}`;
    const safeName = name.replace(/[^a-z0-9._-]/gi, '-').slice(0, 80);
    const localPath = join(dir, safeName.endsWith(ext) ? safeName : safeName + ext);
    if (existsSync(localPath)) return localPath;
    const res = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!res.ok || !res.body) return null;
    mkdirSync(dir, { recursive: true });
    const stream = createWriteStream(localPath);
    await pipeline(Readable.fromWeb(res.body as Parameters<typeof Readable.fromWeb>[0]), stream);
    return localPath;
  } catch {
    return null;
  }
}
