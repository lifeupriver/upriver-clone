import { existsSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../base-command.js';
import { auditEmbeds, type FormEmbed, type IframeEmbed, type ScriptWidget } from '../clone/embed-audit.js';
import { resolveScaffoldPaths, loadAuditPackage } from '../scaffold/template-writer.js';

export default class CloneEmbeds extends BaseCommand {
  static override description =
    'Audit iframes, forms, and 3rd-party script widgets across the cloned site vs the live site. Flags missing embeds (Google Maps, YouTube, Calendly, Mailchimp, HubSpot, inquiry forms, newsletter signups) with concrete suggestions for how to reproduce them. Exits non-zero on missing embeds.';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    'no-build': Flags.boolean({ description: 'Skip rebuilding the cloned site before auditing.' }),
    json: Flags.boolean({ description: 'Print machine-readable JSON only.' }),
    'allow-missing': Flags.boolean({
      description: "Don't fail when embeds are missing — just report.",
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CloneEmbeds);
    const { slug } = args;
    const { clientDir, repoDir } = resolveScaffoldPaths(slug);
    if (!existsSync(repoDir)) {
      this.error(`Cloned repo not found at ${repoDir}. Run "upriver scaffold ${slug}" first.`);
    }
    const pkg = loadAuditPackage(clientDir);
    const distClient = join(repoDir, 'dist', 'client');
    const rawHtmlDir = join(clientDir, 'rawhtml');
    if (!existsSync(rawHtmlDir)) {
      this.error(`No rawhtml/ for ${slug}. Run "upriver scrape ${slug}" first.`);
    }

    if (!flags['no-build'] || !existsSync(distClient)) {
      this.log('Building cloned repo to refresh dist/client...');
      const r = spawnSync('pnpm', ['build'], { cwd: repoDir, stdio: 'inherit' });
      if (r.status !== 0) this.error(`Build failed (exit ${r.status}).`);
    }

    const report = auditEmbeds(rawHtmlDir, distClient, pkg);

    const reportPath = join(clientDir, 'clone-embed-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2), 'utf8');

    if (flags.json) {
      this.log(JSON.stringify(report, null, 2));
    } else {
      this.printHuman(report);
    }
    this.log(`\nReport written to ${reportPath}`);

    if (report.missing.length > 0 && !flags['allow-missing']) {
      this.exit(1);
    }
  }

  private printHuman(report: ReturnType<typeof auditEmbeds>): void {
    this.log(`\nClone embed audit`);
    this.log(`  Live embeds:    ${report.summary.liveTotal}`);
    this.log(`  Clone embeds:   ${report.summary.cloneTotal}`);
    this.log(`  Missing:        ${report.summary.missingTotal}`);

    if (report.missing.length > 0) {
      this.log(`\nMISSING ON CLONE:`);
      for (const m of report.missing) {
        const e = m.embed;
        if (e.kind === 'iframe') {
          const i = e as IframeEmbed;
          this.log(`  [iframe ${i.provider}] ${m.livePath}`);
          this.log(`    src: ${shorten(i.src)}`);
          this.log(`    fix: ${m.suggestion}`);
        } else if (e.kind === 'form') {
          const f = e as FormEmbed;
          this.log(`  [form ${f.recognizable}] ${m.livePath}  (${f.fieldCount} fields, action="${f.action ?? ''}")`);
          this.log(`    fix: ${m.suggestion}`);
        } else {
          const s = e as ScriptWidget;
          this.log(`  [script ${s.provider}] ${m.livePath}`);
          this.log(`    src: ${shorten(s.src)}`);
          this.log(`    fix: ${m.suggestion}`);
        }
      }
    }

    this.log(`\nPER-PAGE COVERAGE:`);
    for (const p of report.livePages) {
      const cp = report.clonePages.find((x) => x.page === p.page);
      const liveCount =
        p.iframes.length + p.forms.filter((f) => f.fieldCount > 0).length + p.scripts.length;
      const cloneCount = cp
        ? cp.iframes.length + cp.forms.filter((f) => f.fieldCount > 0).length + cp.scripts.length
        : 0;
      this.log(`  ${p.page.padEnd(40)} live=${liveCount}  clone=${cloneCount}`);
    }
  }
}

function shorten(s: string): string {
  return s.length > 100 ? s.slice(0, 100) + '…' : s;
}
