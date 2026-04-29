import { Args, Flags } from '@oclif/core';
import { readdirSync, readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { BaseCommand } from '../base-command.js';
import {
  FirecrawlClient,
  readClientConfig,
  updateClientConfig,
  clientDir,
  fetchGscData,
  detectPlatform,
} from '@upriver/core';
import type { FirecrawlScrapeResult } from '@upriver/core';

const REVIEW_SOURCES = [
  { platform: 'google', urlTemplate: (name: string) => `https://www.google.com/search?q=${encodeURIComponent(name + ' reviews')}` },
  { platform: 'weddingwire', urlTemplate: (name: string) => `https://www.weddingwire.com/search?q=${encodeURIComponent(name)}` },
  { platform: 'theknot', urlTemplate: (name: string) => `https://www.theknot.com/marketplace/search?q=${encodeURIComponent(name)}` },
];

interface ContentInventoryPage {
  url: string;
  slug: string;
  title: string;
  description: string;
  wordCount: number;
  discoveredAt: string;
}

export default class Discover extends BaseCommand {
  static override description = 'Run full URL discovery and quick content inventory without spending screenshot or branding credits';

  static override args = {
    slug: Args.string({
      description: 'Client slug (e.g. audreys)',
      required: true,
    }),
  };

  static override flags = {
    resume: Flags.boolean({
      description: 'Skip stages that have already completed',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Discover);
    const { slug } = args;
    const apiKey = this.getFirecrawlKey();
    const dir = clientDir(slug);
    const config = readClientConfig(slug);

    this.log(`\nDiscover: ${config.name} (${slug})`);

    const fc = new FirecrawlClient({
      apiKey,
      clientSlug: slug,
      command: 'discover',
      creditLogPath: join(dir, 'token-and-credit-usage.log'),
    });

    // Step 1: Map all URLs
    this.log('\n[1/4] Mapping all site URLs...');
    let urls: string[] = [];

    const siteMapPath = join(dir, 'site-map.json');
    if (flags.resume && existsSync(siteMapPath)) {
      const existing = JSON.parse(
        await import('node:fs').then((fs) => fs.readFileSync(siteMapPath, 'utf8')),
      ) as { urls: string[] };
      urls = existing.urls;
      this.log(`  Resuming — loaded ${urls.length} URLs from site-map.json`);
    } else {
      try {
        const mapResult = await fc.map(config.url);
        urls = mapResult.urls;
        this.log(`  Found ${urls.length} URLs`);

        const siteMap = {
          slug,
          url: config.url,
          discovered_at: new Date().toISOString(),
          urls,
        };
        writeFileSync(siteMapPath, JSON.stringify(siteMap, null, 2), 'utf8');
      } catch (err) {
        this.warn(`Map failed: ${err instanceof Error ? err.message : String(err)}`);
        urls = [config.url];
        this.log('  Using root URL only.');
      }
    }

    // Step 2: Quick batch scrape for content inventory (markdown + metadata only)
    this.log(`\n[2/4] Quick content inventory scrape (${urls.length} pages, markdown + metadata)...`);

    const contentInventoryPath = join(dir, 'content-inventory.json');
    let pages: ContentInventoryPage[] = [];

    if (flags.resume && existsSync(contentInventoryPath)) {
      this.log('  Resuming — content-inventory.json already exists, skipping scrape.');
    } else if (pagesDirectoryHasRecords(join(dir, 'pages'))) {
      // G.6 — single Firecrawl batch: if `upriver scrape` has already pulled
      // these URLs, reuse those page records instead of re-scraping. The
      // ContentInventoryPage shape is a strict subset of PageRecord.
      const reused = inventoryFromExistingPages(join(dir, 'pages'));
      pages = reused;
      writeFileSync(
        contentInventoryPath,
        JSON.stringify({ slug, pages, generated_at: new Date().toISOString(), source: 'reused-from-pages' }, null, 2),
        'utf8',
      );
      this.log(
        `  Reused ${pages.length} page record(s) from clients/${slug}/pages/ — no Firecrawl credits spent.`,
      );
    } else {
      try {
        let done = 0;
        const results = await fc.batchScrape(
          urls,
          { formats: ['markdown'], onlyMainContent: true },
          async (r) => {
            done++;
            process.stdout.write(`\r  Scraped ${done}/${urls.length} pages...`);
            const page = this.pageFromScrape(r);
            if (page.url) pages.push(page);
          },
        );

        // Fallback: if onPage wasn't called (synchronous response), map results now
        if (pages.length === 0) {
          pages = results
            .map((r) => this.pageFromScrape(r))
            .filter((p) => p.url);
        }

        process.stdout.write('\n');
        writeFileSync(contentInventoryPath, JSON.stringify({ slug, pages, generated_at: new Date().toISOString() }, null, 2), 'utf8');
        this.log(`  Content inventory written: ${pages.length} pages`);

        // Detect / confirm platform from first rawHtml result if not already set
        if (!config.platform || config.platform === 'unknown') {
          const homepageResult = results.find((r) => r.url === config.url || r.url === config.url + '/');
          if (homepageResult?.rawHtml) {
            const detectedPlatform = detectPlatform(homepageResult.rawHtml);
            if (detectedPlatform !== undefined) {
              updateClientConfig(slug, { platform: detectedPlatform });
            }
            this.log(`  Platform detected: ${detectedPlatform}`);
          }
        }
      } catch (err) {
        this.warn(`Batch scrape failed: ${err instanceof Error ? err.message : String(err)}`);
        this.log('  Content inventory will be empty. Run upriver scrape for full extraction.');
      }
    }

    // Step 3: Review mining (customer-research skill pattern)
    this.log('\n[3/4] Mining public reviews...');
    await this.mineReviews(fc, config.name, slug, dir);

    // Step 4: GSC data if configured
    this.log('\n[4/4] Google Search Console data...');
    const gscConfig = config.gsc;

    if (!gscConfig || !gscConfig.verified) {
      this.warn('GSC not configured or not verified. Skipping GSC pull.');
      this.log('  To enable: add the Upriver service account as a Full User on the GSC property,');
      this.log('  then set gsc.verified: true and gsc.property in client-config.yaml.');
      this.log('  Finding: GSC data is missing from this audit — note this as an onboarding gap.');
    } else {
      const gscDir = join(dir, 'gsc');
      mkdirSync(gscDir, { recursive: true });

      if (flags.resume && existsSync(join(gscDir, 'gsc-data.json'))) {
        this.log('  Resuming — gsc-data.json already exists, skipping.');
      } else {
        try {
          const gscData = await fetchGscData(gscConfig.property, slug, 'discover');
          writeFileSync(join(gscDir, 'gsc-data.json'), JSON.stringify(gscData, null, 2), 'utf8');
          this.log(`  GSC data written: ${gscData.top_queries.length} queries, ${gscData.top_pages.length} pages`);
        } catch (err) {
          this.warn(`GSC pull failed: ${err instanceof Error ? err.message : String(err)}`);
          this.log('  Continuing without GSC data.');
        }
      }
    }

    this.log('\nDiscover complete. Files written:');
    this.log(`  clients/${slug}/site-map.json`);
    this.log(`  clients/${slug}/content-inventory.json`);
    this.log(`  clients/${slug}/reviews/`);
    if (gscConfig?.verified) this.log(`  clients/${slug}/gsc/gsc-data.json`);
    this.log(`\nNext step: upriver scrape ${slug}`);
  }

  private pageFromScrape(r: FirecrawlScrapeResult): ContentInventoryPage {
    const url = r.url || r.metadata?.sourceURL || r.metadata?.url || '';
    const title = r.metadata?.title ?? '';
    const description = r.metadata?.description ?? '';
    const wordCount = r.markdown ? r.markdown.split(/\s+/).filter(Boolean).length : 0;
    const rawSlug = url ? url.replace(/https?:\/\/[^/]+/, '').replace(/\/$/, '') || '/' : '/';

    return {
      url,
      slug: rawSlug,
      title,
      description,
      wordCount,
      discoveredAt: new Date().toISOString(),
    };
  }

  private async mineReviews(
    fc: FirecrawlClient,
    clientName: string,
    slug: string,
    dir: string,
  ): Promise<void> {
    const reviewsDir = join(dir, 'reviews');
    mkdirSync(reviewsDir, { recursive: true });

    for (const source of REVIEW_SOURCES) {
      const outPath = join(reviewsDir, `${source.platform}.json`);
      if (existsSync(outPath)) {
        this.log(`  ${source.platform}: already mined, skipping.`);
        continue;
      }

      const searchUrl = source.urlTemplate(clientName);
      try {
        const result = await fc.scrape(searchUrl, {
          formats: ['markdown'],
          onlyMainContent: true,
        });

        const reviews = this.extractReviews(result.markdown ?? '', source.platform);
        writeFileSync(
          outPath,
          JSON.stringify({ platform: source.platform, source_url: searchUrl, raw_markdown: result.markdown ?? '', extracted_reviews: reviews, mined_at: new Date().toISOString() }, null, 2),
          'utf8',
        );
        this.log(`  ${source.platform}: ${reviews.length} reviews extracted`);
      } catch (err) {
        this.warn(`  ${source.platform} review mining failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  private extractReviews(markdown: string, platform: string): Array<{ quote: string; attribution?: string; rating?: string }> {
    // Extract quoted text blocks and star ratings as a heuristic
    const reviews: Array<{ quote: string; attribution?: string; rating?: string }> = [];

    // Match common review patterns in scraped markdown
    const quotePattern = /"([^"]{30,500})"/g;
    let match;
    while ((match = quotePattern.exec(markdown)) !== null) {
      const quote = match[1]?.trim();
      if (quote && !quote.includes('http')) {
        reviews.push({ quote });
      }
    }

    // Also look for rating patterns (e.g. "5/5", "5 stars", "★★★★★")
    const ratingPattern = /(\d)[\/.]5\s*stars?|★{3,5}/gi;
    const ratingMatches = markdown.match(ratingPattern);
    if (ratingMatches && reviews.length > 0) {
      reviews.forEach((r, i) => {
        if (ratingMatches[i]) r.rating = ratingMatches[i];
      });
    }

    return reviews.slice(0, 20); // cap at 20 per source
  }
}

/**
 * G.6 — return true when `pagesDir` already has at least one `<slug>.json` page
 * record (written by `upriver scrape`). Discover can then reuse those records
 * instead of issuing a duplicate Firecrawl batch for the same URLs.
 */
function pagesDirectoryHasRecords(pagesDir: string): boolean {
  if (!existsSync(pagesDir)) return false;
  try {
    return readdirSync(pagesDir).some((f) => f.endsWith('.json'));
  } catch {
    return false;
  }
}

/**
 * G.6 — derive the `ContentInventoryPage[]` shape from already-scraped
 * `<dir>/pages/*.json` records. Preserves the same field set discover would
 * produce from a fresh Firecrawl batch (url, slug, title, description,
 * wordCount, discoveredAt). Pages that fail to parse are skipped silently —
 * one malformed file shouldn't kill the whole inventory.
 */
function inventoryFromExistingPages(pagesDir: string): ContentInventoryPage[] {
  const out: ContentInventoryPage[] = [];
  for (const file of readdirSync(pagesDir)) {
    if (!file.endsWith('.json')) continue;
    try {
      const raw = readFileSync(join(pagesDir, file), 'utf8');
      const parsed = JSON.parse(raw) as {
        url?: string;
        slug?: string;
        scraped_at?: string;
        metadata?: { title?: string; description?: string };
        content?: { wordCount?: number };
      };
      const url = parsed.url ?? '';
      if (!url) continue;
      out.push({
        url,
        slug: parsed.slug ?? '',
        title: parsed.metadata?.title ?? '',
        description: parsed.metadata?.description ?? '',
        wordCount: parsed.content?.wordCount ?? 0,
        discoveredAt: parsed.scraped_at ?? new Date().toISOString(),
      });
    } catch {
      // skip malformed file
    }
  }
  return out;
}
