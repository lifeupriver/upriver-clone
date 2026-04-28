import { existsSync } from 'node:fs';
import { relative, basename } from 'node:path';
import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { resolveScaffoldPaths } from '../scaffold/template-writer.js';
import {
  buildAssetIndex,
  rewriteRepo,
  DEFAULT_CDN_HOSTS,
  type RewriteOptions,
} from '../clone/rewrite-links.js';
import {
  findCdnUrlsInRepo,
  filterUnmatched,
  downloadMissing,
  appendToAssetManifest,
} from '../clone/download-missing.js';

export default class Finalize extends BaseCommand {
  static override description =
    'Rewrite client-domain links and CDN image URLs in the cloned repo to local routes/assets';

  static override examples = [
    '<%= config.bin %> finalize audreys',
    '<%= config.bin %> finalize audreys --dry-run',
    '<%= config.bin %> finalize audreys --download-missing',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    'dry-run': Flags.boolean({ description: 'Report changes without writing files or downloading' }),
    verbose: Flags.boolean({ description: 'Print per-file change report' }),
    'download-missing': Flags.boolean({
      description: 'Fetch any CDN images not in the manifest before rewriting',
    }),
    concurrency: Flags.integer({ description: 'Parallel downloads', default: 8 }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Finalize);
    const { slug } = args;
    const { clientDir, repoDir } = resolveScaffoldPaths(slug);

    if (!existsSync(repoDir)) {
      this.error(`Scaffolded repo not found at ${repoDir}. Run "upriver scaffold ${slug}" first.`);
    }

    const config = this.getConfig(slug);
    const clientDomain = stripScheme(config.url);
    if (!clientDomain) this.error(`Could not derive domain from client config url: ${config.url}`);

    const manifestPath = `${clientDir}/asset-manifest.json`;
    if (!existsSync(manifestPath)) {
      this.error(`asset-manifest.json not found at ${manifestPath}.`);
    }

    this.log(`\nFinalizing "${slug}" — rewriting client-domain & CDN URLs in ${repoDir}`);
    this.log(`  Client domain: ${clientDomain}`);

    let { imageManifest, filenameToLocal } = buildAssetIndex(manifestPath);
    this.log(`  Asset manifest: ${imageManifest.size} URL keys, ${filenameToLocal.size} filenames`);

    const srcDir = `${repoDir}/src`;
    const publicImagesDir = `${repoDir}/public/images`;

    if (flags['download-missing']) {
      this.log(`\n  Scanning for unmatched CDN URLs...`);
      const allCdnUrls = findCdnUrlsInRepo(srcDir, DEFAULT_CDN_HOSTS);
      const unmatched = filterUnmatched(allCdnUrls, imageManifest, filenameToLocal);
      this.log(`  Found ${allCdnUrls.size} total CDN URLs, ${unmatched.length} unmatched.`);

      if (unmatched.length > 0 && !flags['dry-run']) {
        this.log(`  Downloading ${unmatched.length} missing assets to ${publicImagesDir}...`);
        const taken = new Set(Array.from(filenameToLocal.values()));
        const results = await downloadMissing({
          urls: unmatched,
          outDir: publicImagesDir,
          concurrency: flags.concurrency,
          existingFilenames: taken,
        });

        const ok = results.filter((r) => r.ok);
        const failed = results.filter((r) => !r.ok);
        this.log(`  Downloaded: ${ok.length} ok, ${failed.length} failed`);

        if (failed.length > 0) {
          this.log(`  Failures (first 5):`);
          for (const f of failed.slice(0, 5)) this.log(`    [${f.error}] ${f.url}`);
        }

        const newEntries = ok.map((r) => ({
          url: r.url,
          localPath: `clients/${slug}/repo/public/images/${r.localFilename!}`,
        }));
        appendToAssetManifest(manifestPath, newEntries);
        this.log(`  Updated ${basename(manifestPath)} with ${newEntries.length} new entries.`);

        // Rebuild lookup tables to include the freshly downloaded assets
        const reloaded = buildAssetIndex(manifestPath);
        imageManifest = reloaded.imageManifest;
        filenameToLocal = reloaded.filenameToLocal;
      }
    }

    const opts: RewriteOptions = {
      clientDomain,
      cdnHosts: DEFAULT_CDN_HOSTS,
      imageManifest,
      filenameToLocal,
    };

    const result = rewriteRepo(srcDir, opts, { dryRun: flags['dry-run'] });

    this.log(`\n  Files scanned: ${result.filesScanned}`);
    this.log(`  Files changed: ${result.filesChanged}${flags['dry-run'] ? ' (dry-run, no writes)' : ''}`);
    this.log(`  Internal links rewritten: ${result.aggregate.internalLinksRewritten}`);
    this.log(`  CDN images rewritten:     ${result.aggregate.cdnImagesRewritten}`);
    this.log(`  Unmatched external URLs:  ${result.aggregate.unmatchedExternal.length}`);

    if (flags.verbose) {
      this.log(`\n  Per-file changes:`);
      const sorted = Array.from(result.perFileReports.entries()).sort(
        (a, b) => b[1].totalChanges - a[1].totalChanges,
      );
      for (const [path, report] of sorted) {
        this.log(
          `    ${relative(repoDir, path).padEnd(50)}  links:${report.internalLinksRewritten}  imgs:${report.cdnImagesRewritten}`,
        );
      }
    }

    if (result.aggregate.unmatchedExternal.length > 0) {
      this.log(`\n  Unmatched external URLs (left as-is):`);
      const unique = Array.from(new Set(result.aggregate.unmatchedExternal));
      for (const url of unique.slice(0, 10)) this.log(`    ${url}`);
      if (unique.length > 10) this.log(`    ... and ${unique.length - 10} more`);
      this.log(`\n  Tip: re-run with --download-missing to fetch them.`);
    }

    this.log('');
  }
}

function stripScheme(url: string): string {
  return url.replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
}
