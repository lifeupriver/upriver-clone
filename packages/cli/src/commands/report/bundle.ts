import { execFileSync } from 'node:child_process';
import { existsSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import { Args, Flags } from '@oclif/core';
import { clientDir } from '@upriver/core';

import { BaseCommand } from '../../base-command.js';

/**
 * F.6 light variant — bundle the deliverable artifacts a client receives at
 * the end of an engagement into a single zip alongside the client directory.
 *
 * Until the full Supabase upload pipeline lands (F.6 proper), this gives
 * operators a deterministic file they can hand to the client over any
 * channel (email, Drive, GitHub release).
 *
 * Bundle contents (each included only when present on disk):
 *   - report-static/                  (the static HTML report from `report build`)
 *   - audit-package.json
 *   - clone-fidelity-findings.json
 *   - improvement-opportunities.md
 *   - fixes-plan.md
 *   - intake.json
 *
 * Output path:
 *   `<clientDir>/upriver-report-YYYY-MM-DD.zip`
 *
 * Implementation note: shells out to the system `zip` binary rather than
 * pulling in a node zip dependency. macOS / Linux ship with `zip`; Windows
 * users would need Git-Bash or WSL. That tradeoff is intentional — see the
 * roadmap scope rule about avoiding new deps when a light option exists.
 */
export default class ReportBundle extends BaseCommand {
  static override description =
    'Zip the report-static + audit/intake/fidelity/opportunities files into a single deliverable bundle (F.6 light).';

  static override examples = [
    '<%= config.bin %> report bundle audreys',
    '<%= config.bin %> report bundle audreys --out /tmp/audreys-handoff.zip',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    out: Flags.string({
      description: 'Output zip path. Defaults to <clientDir>/upriver-report-<YYYY-MM-DD>.zip.',
    }),
    force: Flags.boolean({
      description: 'Overwrite an existing zip at the output path.',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ReportBundle);
    const { slug } = args;

    const base = process.env['UPRIVER_CLIENTS_DIR'] ?? './clients';
    const dir = resolve(clientDir(slug, base));
    if (!existsSync(dir)) {
      this.error(`Client directory not found at ${dir}.`);
    }

    const dateStamp = new Date().toISOString().slice(0, 10);
    const outPath = flags.out ? resolve(flags.out) : join(dir, `upriver-report-${dateStamp}.zip`);

    if (existsSync(outPath) && !flags.force) {
      this.error(`Output already exists at ${outPath}. Pass --force to overwrite.`);
    }

    // Candidate files / dirs in the bundle. Each is included only when it
    // actually exists — the bundle is best-effort, not gated on completeness.
    const candidates = [
      'report-static',
      'audit-package.json',
      'clone-fidelity-findings.json',
      'improvement-opportunities.md',
      'fixes-plan.md',
      'intake.json',
    ];
    const present: string[] = [];
    const missing: string[] = [];
    for (const c of candidates) {
      if (existsSync(join(dir, c))) present.push(c);
      else missing.push(c);
    }

    if (present.length === 0) {
      this.error(
        `Nothing to bundle for "${slug}" — none of the expected artifacts exist yet. Run \`upriver report build ${slug}\` first.`,
      );
    }

    this.log(`\nBundling "${slug}" -> ${outPath}`);
    for (const p of present) {
      const full = join(dir, p);
      const stat = statSync(full);
      this.log(
        `  + ${p}${stat.isDirectory() ? '/' : ''}${stat.isFile() ? `  (${(stat.size / 1024).toFixed(1)} KB)` : ''}`,
      );
    }
    if (missing.length > 0) {
      this.log(`  (skipping missing: ${missing.join(', ')})`);
    }

    if (existsSync(outPath) && flags.force) {
      try {
        execFileSync('rm', ['-f', outPath], { stdio: 'pipe' });
      } catch {
        // best-effort; zip will overwrite
      }
    }

    // `zip -r <out> <files...>` — invoked from the client directory so the
    // archive entries are relative to it (no parent path leaks).
    try {
      execFileSync('zip', ['-r', '-q', outPath, ...present], {
        cwd: dir,
        stdio: 'inherit',
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.error(
        `\`zip\` exited non-zero: ${msg.split('\n')[0]}. The system zip binary is required (macOS / Linux). For Windows, install via Git-Bash or WSL.`,
      );
    }

    if (!existsSync(outPath)) {
      this.error(`Expected ${outPath} after zip exited 0, but the file is missing.`);
    }
    const size = statSync(outPath).size;
    this.log(`\nWrote ${relative(process.cwd(), outPath)} (${(size / 1024).toFixed(1)} KB)`);
    this.log('');
  }
}
