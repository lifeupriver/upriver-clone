import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { Args, Flags } from '@oclif/core';
import { clientDir } from '@upriver/core';
import type { AuditPackage } from '@upriver/core';

import { BaseCommand } from '../../base-command.js';
import { extractSubject, renderEmailTemplate } from './email-template.js';
import { buildShareUrl, loadOrCreateShareInfo } from './share-token.js';

const DEFAULT_BASE_URL = 'https://reports.upriver.com';
const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/**
 * `upriver report send <slug>` — render a "View report" email body for the
 * operator to forward manually. Generates (or reuses) a per-client share
 * token, builds a share URL against the configured report host, populates
 * the email template, and prints the result. Persists `last-share-email.json`
 * under the client directory for audit trail; SMTP delivery is intentionally
 * not wired yet.
 *
 * Workstream A.6 — see `.planning/roadmap/`.
 */
export default class ReportSend extends BaseCommand {
  static override description =
    'Render a "View report" email body for <slug> for the operator to forward';

  static override examples = [
    '<%= config.bin %> report send acme-co --to client@example.com',
    '<%= config.bin %> report send acme-co --to client@example.com --base-url https://reports.example.com',
    '<%= config.bin %> report send acme-co --to client@example.com --write-to-file ./email.md',
  ];

  static override args = {
    slug: Args.string({
      description: 'Client slug (matches a directory under ./clients/)',
      required: true,
    }),
  };

  static override flags = {
    to: Flags.string({
      description: 'Recipient email address (operator forwards manually)',
      required: true,
    }),
    'base-url': Flags.string({
      description:
        'Override UPRIVER_REPORT_HOST. Default chain: flag → env → https://reports.upriver.com',
    }),
    'write-to-file': Flags.string({
      description: 'Also write the rendered email body (incl. To/Subject) to this path',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ReportSend);
    const slug = args.slug;
    const to = flags.to;

    if (!EMAIL_RE.test(to)) {
      this.error(`--to does not look like an email address: ${to}`);
    }

    const clientsBase = resolve(process.env['UPRIVER_CLIENTS_DIR'] ?? './clients');
    const clientPath = clientDir(slug, clientsBase);
    const auditPkgPath = join(clientPath, 'audit-package.json');
    if (!existsSync(auditPkgPath)) {
      this.error(
        `Client ${slug} has no audit-package.json at ${auditPkgPath}. Run synthesize first.`,
      );
    }

    let pkg: AuditPackage;
    try {
      pkg = JSON.parse(readFileSync(auditPkgPath, 'utf8')) as AuditPackage;
    } catch (err) {
      this.error(
        `Failed to read ${auditPkgPath}: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    const baseUrl =
      flags['base-url'] ?? process.env['UPRIVER_REPORT_HOST'] ?? DEFAULT_BASE_URL;
    const info = loadOrCreateShareInfo(slug, baseUrl);
    const shareUrl = buildShareUrl(slug, info);

    const clientName = pkg.meta?.clientName ?? slug;
    const clientFirstName = deriveFirstName(clientName);
    const siteUrl = pkg.meta?.siteUrl ?? '';
    const auditDate = pkg.meta?.auditDate ?? new Date().toISOString().slice(0, 10);
    const overallScore = pkg.meta?.overallScore ?? 'n/a';
    const criticalCount = pkg.meta?.findingsByPriority?.p0 ?? 0;
    const topRecommendation = deriveTopRecommendation(pkg);

    const body = renderEmailTemplate({
      clientName,
      clientFirstName,
      siteUrl,
      shareUrl,
      shareToken: info.token,
      auditDate,
      overallScore,
      criticalCount,
      topRecommendation,
    });
    const subject = extractSubject(body);

    const fullEmail = [`To: ${to}`, `Subject: ${subject}`, '----', body].join('\n');
    this.log(fullEmail);

    if (flags['write-to-file']) {
      const outPath = resolve(flags['write-to-file']);
      const outDir = dirname(outPath);
      if (!existsSync(outDir)) {
        this.error(`Output directory does not exist: ${outDir}`);
      }
      writeFileSync(outPath, fullEmail, 'utf8');
      this.log(`[report] Wrote email body to ${outPath}`);
    }

    const recordPath = join(clientPath, 'last-share-email.json');
    const record = {
      to,
      sentAt: null,
      shareUrl,
      token: info.token,
      renderedAt: new Date().toISOString(),
    };
    writeFileSync(recordPath, `${JSON.stringify(record, null, 2)}\n`, 'utf8');

    this.log(
      `Email body printed above. SMTP send not yet wired — TODO(roadmap): A.6 SMTP integration. Forward this to ${to} manually.`,
    );
  }
}

/**
 * Derive a friendly first name from a client display name. Splits on
 * whitespace, takes the first word, and strips trailing punctuation. Falls
 * back to `'there'` when the name is empty or unusable.
 *
 * @param clientName - Full client display name (e.g., `'Jane Doe, CEO'`).
 * @returns A short greeting token (e.g., `'Jane'`).
 */
function deriveFirstName(clientName: string): string {
  const trimmed = (clientName ?? '').trim();
  if (!trimmed) return 'there';
  const first = trimmed.split(/\s+/)[0] ?? '';
  const cleaned = first.replace(/[,.;:!?"'`]+$/, '');
  return cleaned || 'there';
}

/**
 * Pull the highest-priority recommendation text out of an audit package.
 * Sorts findings by priority (`p0 < p1 < p2`) and returns the first
 * recommendation string. Returns a graceful fallback when no findings exist.
 *
 * @param pkg - Parsed audit package.
 * @returns A short recommendation string suitable for an email highlight.
 */
function deriveTopRecommendation(pkg: AuditPackage): string {
  const findings = pkg.findings ?? [];
  if (findings.length === 0) return 'See full report for details.';
  const priorityRank: Record<string, number> = { p0: 0, p1: 1, p2: 2 };
  const sorted = [...findings].sort(
    (a, b) => (priorityRank[a.priority] ?? 9) - (priorityRank[b.priority] ?? 9),
  );
  const top = sorted[0];
  return top?.recommendation?.trim() || top?.title || 'See full report for details.';
}
