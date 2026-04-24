import { Args, Flags } from '@oclif/core';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stringify as stringifyYaml } from 'yaml';
import { BaseCommand } from '../base-command.js';
import {
  FirecrawlClient,
  writeClientConfig,
  detectPlatform,
  clientDir,
} from '@upriver/core';
import type { ClientConfig } from '@upriver/core';

export default class Init extends BaseCommand {
  static override description = 'Initialize a new client engagement and discover all site URLs';

  static override args = {
    url: Args.string({
      description: 'The client site URL (e.g. https://audreysfarmhouse.com)',
      required: true,
    }),
  };

  static override flags = {
    slug: Flags.string({
      description: 'Short identifier for this client (e.g. audreys)',
      required: true,
    }),
    name: Flags.string({
      description: 'Client display name (e.g. "Audrey\'s Farmhouse")',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Init);
    const { url } = args;
    const { slug } = flags;
    const name = flags.name ?? slug;
    const apiKey = this.getFirecrawlKey();

    this.log(`\nInitializing client: ${name} (${slug})`);
    this.log(`URL: ${url}\n`);

    // Create client directory structure
    const dir = clientDir(slug);
    for (const subdir of ['pages', 'screenshots', 'assets/images', 'audit', 'docs', 'reviews', 'gsc', 'repo']) {
      mkdirSync(join(dir, subdir), { recursive: true });
    }

    // Write initial config
    const config: ClientConfig = {
      slug,
      name,
      url,
      created_at: new Date().toISOString(),
    };
    writeClientConfig(config);
    this.log(`Created client directory: clients/${slug}/`);

    // Run Firecrawl Map
    this.log('Running Firecrawl Map to discover all URLs...');
    const fc = new FirecrawlClient({
      apiKey,
      clientSlug: slug,
      command: 'init',
      creditLogPath: join(dir, 'token-and-credit-usage.log'),
    });

    let urls: string[] = [];
    try {
      const mapResult = await fc.map(url);
      urls = mapResult.urls;
      this.log(`Found ${urls.length} URLs`);
    } catch (err) {
      this.warn(`Firecrawl Map failed: ${err instanceof Error ? err.message : String(err)}`);
      this.log('Continuing with just the root URL in the inventory.');
      urls = [url];
    }

    // Detect platform from a quick homepage scrape
    this.log('Detecting platform...');
    let platform: ClientConfig['platform'] = 'unknown';
    try {
      const homepageScrape = await fc.scrape(url, { formats: ['rawHtml'] });
      if (homepageScrape.rawHtml) {
        platform = detectPlatform(homepageScrape.rawHtml);
      }
    } catch {
      this.warn('Platform detection skipped — could not scrape homepage.');
    }

    if (platform && platform !== 'unknown') {
      this.log(`Detected platform: ${platform}`);
    } else {
      this.log('Platform: unknown (flag for manual identification)');
    }

    // Update config with platform
    const updatedConfig: ClientConfig = platform !== undefined
      ? { ...config, platform }
      : config;
    writeClientConfig(updatedConfig);

    // Write site-map.json
    const siteMap = { slug, url, discovered_at: new Date().toISOString(), urls };
    writeFileSync(join(dir, 'site-map.json'), JSON.stringify(siteMap, null, 2), 'utf8');

    // Estimate credit cost
    const estimatedCredits = 2 + urls.length * 3 + 5 + urls.length * 5 + 10;
    this.log(`\nEstimated credits for full scrape: ~${estimatedCredits}`);
    if (estimatedCredits > 500) {
      this.warn(`Credit estimate (${estimatedCredits}) exceeds 500 — review before running upriver scrape.`);
    }

    this.log(`\nDone. Next step: upriver discover ${slug}`);
    this.log(`Files written:`);
    this.log(`  clients/${slug}/client-config.yaml`);
    this.log(`  clients/${slug}/site-map.json`);
    this.log(`  clients/${slug}/token-and-credit-usage.log`);
  }
}
