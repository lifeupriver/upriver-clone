import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

import { Args, Flags } from '@oclif/core';
import type { AuditPackage } from '@upriver/core';

import { BaseCommand } from '../base-command.js';
import { auditClonedLinks } from '../clone/link-check.js';
import { resolveScaffoldPaths, loadAuditPackage } from '../scaffold/template-writer.js';

export default class CloneLinks extends BaseCommand {
  static override description =
    'Audit the cloned site\'s internal link graph: broken links, missing pages, orphan pages. Exits non-zero if any broken links or missing pages exist.';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    'no-build': Flags.boolean({
      description: 'Skip rebuilding the cloned site before auditing.',
    }),
    json: Flags.boolean({ description: 'Print machine-readable JSON only.' }),
    'allow-orphans': Flags.boolean({
      description: 'Treat orphan pages as informational, not failures.',
      default: true,
    }),
    'fail-on-orphans': Flags.boolean({
      description: 'Treat orphan pages as failures (overrides --allow-orphans).',
    }),
    'allow-missing': Flags.boolean({
      description: 'Don\'t fail if some live URLs have no cloned equivalent (e.g. /s/order, /s/shop, /sitemap.xml).',
    }),
    /**
     * Live paths the operator wants to consciously skip — Square Online cart
     * routes, sitemap, etc. Repeatable.
     */
    'skip-live': Flags.string({
      description: 'Live URL pathname to ignore from the missing-pages check (repeatable, e.g. --skip-live /s/order --skip-live /sitemap.xml).',
      multiple: true,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CloneLinks);
    const { slug } = args;

    const { clientDir, repoDir } = resolveScaffoldPaths(slug);
    if (!existsSync(repoDir)) {
      this.error(`Cloned repo not found at ${repoDir}. Run "upriver scaffold ${slug}" first.`);
    }

    const pkg = loadAuditPackage(clientDir);

    const distClient = join(repoDir, 'dist', 'client');
    if (!flags['no-build'] || !existsSync(distClient)) {
      this.log('Building cloned repo to refresh dist/client...');
      const r = spawnSync('pnpm', ['build'], { cwd: repoDir, stdio: 'inherit' });
      if (r.status !== 0) {
        this.error(`Build failed (exit ${r.status}). Fix build errors before auditing links.`);
      }
    }

    // Square Online (and similar SaaS site builders) inject editor-chrome
    // pages we never want to clone: cart, shop, sitemap, story templates.
    // These are platform features, not brand pages.
    const DEFAULT_SKIP = [
      // Square Online editor chrome — cart / shop / story templates.
      '/s/order',
      '/s/shop',
      '/s/stories',
      '/s/stories/story-title',
      // Square Online auto-generated product pages (clone if the client
      // actually sells products; default-skip to avoid noise).
      '/product',
      // Square Online's auto-generated support page.
      '/support',
      // Crawler artifacts.
      '/sitemap.xml',
      '/sitemap',
      '/robots.txt',
      // Generic auth/transactional.
      '/cart',
      '/checkout',
      '/login',
      '/signin',
      '/signup',
      '/account',
      '/profile',
    ];
    const skipSet = new Set(
      [...DEFAULT_SKIP, ...(flags['skip-live'] ?? [])].map((s) => s.replace(/\/+$/, '')),
    );
    const filteredPkg: AuditPackage = JSON.parse(JSON.stringify(pkg)) as AuditPackage;
    if (skipSet.size > 0) {
      filteredPkg.siteStructure.pages = filteredPkg.siteStructure.pages.filter((p) => {
        let path: string;
        try {
          path = new URL(p.url).pathname || '/';
        } catch {
          path = p.slug.startsWith('/') ? p.slug : '/' + p.slug;
        }
        path = path.replace(/\/+$/, '') || '/';
        // Match direct path AND any prefix-based skip (so /s/order skips /s/order/whatever).
        for (const skip of skipSet) {
          if (path === skip || path.startsWith(skip + '/')) return false;
        }
        return true;
      });
    }

    const report = auditClonedLinks(distClient, filteredPkg);

    const reportPath = join(clientDir, 'clone-link-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

    if (flags.json) {
      this.log(JSON.stringify(report, null, 2));
    } else {
      this.printHuman(report);
    }
    this.log(`\nReport written to ${reportPath}`);

    const failOnOrphans = flags['fail-on-orphans'] === true;
    const failed =
      report.brokenLinks.length > 0 ||
      (!flags['allow-missing'] && report.missingPages.length > 0) ||
      (failOnOrphans && report.orphanPages.length > 0);

    if (failed) {
      this.exit(1);
    }
  }

  private printHuman(report: ReturnType<typeof auditClonedLinks>): void {
    this.log(`\nClone link audit`);
    this.log(`  Pages built:        ${report.pageCount}`);
    this.log(`  Internal links:     ${report.internalLinkCount}`);
    this.log(`  External links:     ${report.externalLinkCount}`);
    this.log(`  Broken links:       ${report.brokenLinks.length}`);
    this.log(`  Missing pages:      ${report.missingPages.length}`);
    this.log(`  Orphan pages:       ${report.orphanPages.length}`);

    if (report.brokenLinks.length > 0) {
      this.log(`\nBROKEN LINKS:`);
      for (const b of report.brokenLinks) {
        this.log(`  [${b.attr}] ${b.fromPage}  →  ${b.rawTarget}`);
      }
    }

    if (report.missingPages.length > 0) {
      this.log(`\nMISSING PAGES (live URLs without cloned equivalent):`);
      for (const m of report.missingPages) {
        this.log(`  ${m.livePath}  (expected ${shorten(m.expectedPath)})`);
      }
    }

    if (report.orphanPages.length > 0) {
      this.log(`\nORPHAN PAGES (no internal link points to them):`);
      for (const o of report.orphanPages) {
        this.log(`  ${o.page}`);
      }
    }

    // Per-page graph summary (compact)
    this.log(`\nLINK GRAPH:`);
    for (const [page, targets] of Object.entries(report.graph)) {
      if (targets.length === 0) {
        this.log(`  ${page}  →  (none)`);
      } else {
        this.log(`  ${page}  →  ${targets.length} target(s)`);
      }
    }
  }
}

function shorten(s: string): string {
  // Trim verbose absolute paths so the table stays readable.
  const i = s.indexOf('/dist/client/');
  return i >= 0 ? '…' + s.slice(i) : s;
}
