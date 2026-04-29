import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { Args, Flags } from '@oclif/core';
import type { AuditPackage } from '@upriver/core';

import { BaseCommand } from '../../base-command.js';
import { compareAudits, renderCompareMarkdown } from '../../report-compare/diff.js';

/**
 * `upriver report compare <before> <after>` — diff two audit-package.json
 * files and emit a markdown report.
 *
 * Roadmap: Workstream E.5 stub. Operators can drive this manually today by
 * pointing at "before" / "after" client subdirs (or by snapshotting
 * audit-package.json before/after running improvement tracks). When
 * preview-deploy infra lands, this becomes the engine for the full E.5
 * automated re-audit flow.
 */
export default class ReportCompare extends BaseCommand {
  static override description =
    'Diff two audit-package.json files and emit a markdown comparison (E.5 stub).';

  static override examples = [
    '<%= config.bin %> report compare clients/audreys-before clients/audreys-after',
    '<%= config.bin %> report compare ./before.json ./after.json --out diff.md',
  ];

  static override args = {
    before: Args.string({
      description: 'Path to the "before" audit-package.json (or a directory containing one).',
      required: true,
    }),
    after: Args.string({
      description: 'Path to the "after" audit-package.json (or a directory containing one).',
      required: true,
    }),
  };

  static override flags = {
    out: Flags.string({
      description: 'Output markdown path. Defaults to ./audit-comparison.md.',
    }),
    'before-label': Flags.string({ description: 'Label for the before column.', default: 'Before' }),
    'after-label': Flags.string({ description: 'Label for the after column.', default: 'After' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ReportCompare);
    const before = loadPackage(args.before);
    const after = loadPackage(args.after);

    const result = compareAudits(before, after);
    const md = renderCompareMarkdown(result, {
      before: flags['before-label'],
      after: flags['after-label'],
    });

    const outPath = resolve(flags.out ?? 'audit-comparison.md');
    writeFileSync(outPath, md, 'utf8');

    this.log('');
    this.log(`Wrote ${outPath}`);
    this.log(
      `  Overall: ${result.overallBefore} -> ${result.overallAfter} (${result.overallDelta >= 0 ? '+' : ''}${result.overallDelta})`,
    );
    this.log(
      `  Findings: ${result.findings.closed.length} closed, ${result.findings.added.length} added, ${result.findings.unchanged.length} unchanged`,
    );
    this.log('');
  }
}

/**
 * Resolve a CLI argument to an `AuditPackage`. Accepts either a direct
 * `audit-package.json` path or a directory that contains one. Errors with a
 * clear message when neither resolves.
 */
function loadPackage(arg: string): AuditPackage {
  const direct = resolve(arg);
  const candidates = [direct, `${direct}/audit-package.json`];
  for (const path of candidates) {
    if (existsSync(path)) {
      try {
        return JSON.parse(readFileSync(path, 'utf8')) as AuditPackage;
      } catch (err) {
        throw new Error(
          `Failed to parse ${path} as JSON: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }
  }
  throw new Error(
    `Could not resolve "${arg}" — expected a path to audit-package.json or a directory containing one.`,
  );
}
