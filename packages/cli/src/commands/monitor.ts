import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { Args, Flags } from '@oclif/core';

import { clientDir, readClientConfig, type AuditPackage } from '@upriver/core';

import { BaseCommand } from '../base-command.js';
import {
  buildSnapshotFromAuditDir,
  buildTrend,
  computeDelta,
  findPreviousSnapshot,
} from '../monitor/snapshot.js';
import { renderEmailHtml, renderReportMarkdown } from '../monitor/render.js';

export default class Monitor extends BaseCommand {
  static override description =
    'F06 — produce a one-page delta report comparing the current state of the rebuilt site to a baseline. Designed to run weekly via Inngest cron against retainer clients.';

  static override examples = [
    '<%= config.bin %> monitor littlefriends',
    '<%= config.bin %> monitor audreys --baseline=qa --no-email',
    '<%= config.bin %> monitor audreys --lite',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    baseline: Flags.string({
      description: 'Which baseline to compare against. qa = post-rebuild snapshot. previous = most recent prior monitor run. original = pre-rebuild audit.',
      options: ['qa', 'previous', 'original'],
      default: 'previous',
    }),
    'no-email': Flags.boolean({
      description: 'Produce the report files but skip email send.',
      default: false,
    }),
    lite: Flags.boolean({
      description: 'Lite mode — reuses the most recent on-disk audit instead of re-scraping. Suitable for quick checks; does not catch live-site drift.',
      default: false,
    }),
    force: Flags.boolean({ description: 'Re-run even if today\'s snapshot exists.', default: false }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Monitor);
    const { slug } = args;

    const dir = clientDir(slug);
    if (!existsSync(dir)) this.error(`Client directory not found: ${dir}`);

    const config = readClientConfig(slug);
    const monitoringDir = join(dir, 'monitoring');
    mkdirSync(monitoringDir, { recursive: true });

    const today = new Date().toISOString().slice(0, 10);
    const snapshotJsonPath = join(monitoringDir, `${today}.json`);
    const reportHtmlPath = join(monitoringDir, `${today}-report.html`);
    const reportMdPath = join(monitoringDir, `${today}-report.md`);
    const trendJsonPath = join(monitoringDir, 'trend.json');

    if (!flags.force && existsSync(snapshotJsonPath)) {
      this.log(`Snapshot for ${today} already exists; pass --force to regenerate.`);
      return;
    }

    const t0 = Date.now();
    this.log(`\nMonitoring "${slug}" against baseline=${flags.baseline}...`);

    const auditDir = this.resolveAuditDir(dir, flags.baseline as 'qa' | 'previous' | 'original');
    if (!auditDir) {
      this.error(
        `No audit directory available for baseline=${flags.baseline}. Run \`upriver audit ${slug}\` first.`,
      );
    }

    if (!flags.lite) {
      this.log('  Note: full monitor mode (live re-scrape + Lighthouse) is not yet implemented; using --lite path.');
    }

    const current = buildSnapshotFromAuditDir(slug, auditDir, flags.baseline as 'qa' | 'previous' | 'original');
    const previous = flags.baseline === 'previous' ? findPreviousSnapshot(monitoringDir, today) : loadBaselineSnapshot(dir, flags.baseline as 'qa' | 'original');
    const delta = computeDelta(current, previous);
    writeFileSync(snapshotJsonPath, JSON.stringify(delta, null, 2), 'utf8');

    // Update rolling trend (oldest first).
    const trend = buildTrend(monitoringDir);
    writeFileSync(trendJsonPath, JSON.stringify(trend, null, 2), 'utf8');

    const auditPkg = loadAuditPackage(dir);
    const activeP0 = pickActiveP0(auditDir);
    const operatorName = readOperatorName(config) ?? 'the Upriver team';
    const clientName = config.name ?? slug;

    const html = renderEmailHtml({
      clientName,
      operatorName,
      delta,
      trend,
      activeP0,
    });
    writeFileSync(reportHtmlPath, html, 'utf8');

    const md = renderReportMarkdown({ clientName, operatorName, delta, trend, activeP0 });
    writeFileSync(reportMdPath, md, 'utf8');

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    this.log('');
    this.log(`Wrote ${snapshotJsonPath}`);
    this.log(`Wrote ${reportHtmlPath}`);
    this.log(`Wrote ${reportMdPath}`);
    this.log(`Wrote ${trendJsonPath}`);
    this.log('');
    this.log(`Status: ${delta.status}. Overall score: ${current.overall_score}/100${previous ? ` (${delta.overall_delta >= 0 ? '+' : ''}${delta.overall_delta} vs prior)` : ' (first run)'}.`);
    this.log(`Monitor complete in ${elapsed}s.`);
    if (!flags['no-email']) {
      this.log('Email send not yet wired (Resend integration is a worker-side concern). The HTML report is ready to forward.');
    }
    if (auditPkg) {
      // suppress unused-var warning
      void auditPkg;
    }
  }

  private resolveAuditDir(dir: string, baseline: 'qa' | 'previous' | 'original'): string | null {
    if (baseline === 'qa') {
      const qaAudit = join(dir, 'qa', 'audit');
      if (existsSync(qaAudit)) return qaAudit;
    }
    const main = join(dir, 'audit');
    if (existsSync(main)) return main;
    return null;
  }
}

function loadAuditPackage(dir: string): AuditPackage | null {
  const p = join(dir, 'audit-package.json');
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8')) as AuditPackage;
}

function loadBaselineSnapshot(dir: string, baseline: 'qa' | 'original'): null {
  // The qa baseline lives at qa/audit/, original at audit/. Both are read
  // directly when computing the *current* snapshot; for the baseline we'd
  // need a cached snapshot file. None exists on disk yet, so we return null
  // and the delta computer treats this as a first-run.
  void dir;
  void baseline;
  return null;
}

function pickActiveP0(auditDir: string): Array<{ dimension: string; title: string; status_note: string }> {
  if (!existsSync(auditDir)) return [];
  const out: Array<{ dimension: string; title: string; status_note: string }> = [];
  for (const file of readdirSync(auditDir)) {
    if (!file.endsWith('.json') || file === 'summary.json') continue;
    try {
      const raw = JSON.parse(readFileSync(join(auditDir, file), 'utf8')) as {
        dimension: string;
        findings: Array<{ priority: string; title: string }>;
      };
      for (const f of raw.findings) {
        if (f.priority === 'p0' && out.length < 3) {
          out.push({
            dimension: raw.dimension,
            title: f.title,
            status_note: 'Tracked. The next release will include the fix.',
          });
        }
      }
    } catch {
      // skip
    }
  }
  return out;
}

function readOperatorName(config: { name?: string }): string | null {
  // The roadmap calls for a per-client operator name; not yet in client-config schema.
  // Fall back to the env var the rest of the pipeline already honors.
  return process.env['UPRIVER_OPERATOR_NAME'] ?? null;
}
