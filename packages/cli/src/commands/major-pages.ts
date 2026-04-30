import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { Args, Flags } from '@oclif/core';
import { clientDir } from '@upriver/core';
import type { AuditPackage } from '@upriver/core';

import { BaseCommand } from '../base-command.js';
import { canonicalPath, classify, extractNavHrefs } from '../major-pages/classify.js';
import type { ClassifyResult } from '../major-pages/classify.js';

export default class MajorPages extends BaseCommand {
  static override description =
    'Classify a client\'s discovered pages into "major" (homepage + nav targets + conventional hubs + content pages worth cloning) and "skipped" (blog details, product details, editor chrome). Writes clients/<slug>/major-pages.json — consumed by `upriver clone` and `upriver capture-major`.';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    include: Flags.string({
      description: 'Force a path into "major" even if the heuristic skipped it (repeatable)',
      multiple: true,
    }),
    exclude: Flags.string({
      description: 'Force a path into "skipped" (repeatable)',
      multiple: true,
    }),
    max: Flags.integer({
      description: 'Cap the major list (default 25). Excess pages move to skipped with reason "over-cap".',
      default: 25,
    }),
    json: Flags.boolean({ description: 'Print the JSON output instead of a human-readable table' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(MajorPages);
    const { slug } = args;
    const dir = clientDir(slug);
    if (!existsSync(dir)) this.error(`Client directory not found: ${dir}`);

    const auditPath = join(dir, 'audit-package.json');
    if (!existsSync(auditPath)) this.error(`audit-package.json missing at ${auditPath}`);
    const pkg = JSON.parse(readFileSync(auditPath, 'utf8')) as AuditPackage;

    const navHrefs: string[] = [];
    for (const item of pkg.siteStructure.navigation?.primary ?? []) {
      if (item.href) navHrefs.push(item.href);
      for (const child of item.children ?? []) {
        if (child.href) navHrefs.push(child.href);
      }
    }
    if (navHrefs.length === 0) {
      const homeRaw = join(dir, 'rawhtml', 'home.html');
      if (existsSync(homeRaw)) {
        navHrefs.push(...extractNavHrefs(readFileSync(homeRaw, 'utf8')));
      }
    }

    const result = classify({
      pages: pkg.siteStructure.pages,
      navHrefs,
      siteUrl: pkg.meta.siteUrl,
      include: flags.include ?? [],
      exclude: flags.exclude ?? [],
      max: flags.max,
    });

    const output = {
      generatedAt: new Date().toISOString(),
      slug,
      siteUrl: pkg.meta.siteUrl,
      navHrefCount: navHrefs.length,
      max: flags.max,
      major: result.major.map((m) => ({
        path: canonicalPath(m.page),
        url: m.page.url,
        title: m.page.title,
        reason: m.reason,
        slug: m.page.slug,
      })),
      skipped: result.skipped.map((s) => ({
        path: canonicalPath(s.page),
        url: s.page.url,
        title: s.page.title,
        reason: s.reason,
        detail: s.detail,
        slug: s.page.slug,
      })),
    };

    const outPath = join(dir, 'major-pages.json');
    writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf8');

    if (flags.json) {
      this.log(JSON.stringify(output, null, 2));
      return;
    }

    this.printTable(result);
    this.log(`\nWrote ${outPath}`);
  }

  private printTable(result: ClassifyResult): void {
    this.log(`\nMajor pages (${result.major.length}):`);
    for (const m of result.major) {
      const path = canonicalPath(m.page);
      this.log(`  [${m.reason.padEnd(18)}] ${path.padEnd(40)} ${m.page.title.slice(0, 60)}`);
    }
    this.log(`\nSkipped pages (${result.skipped.length}):`);
    for (const s of result.skipped) {
      const path = canonicalPath(s.page);
      const detail = s.detail ? ` (${s.detail})` : '';
      this.log(`  [${s.reason.padEnd(18)}] ${path.padEnd(40)}${detail}`);
    }
  }
}
