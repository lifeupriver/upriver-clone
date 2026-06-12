import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { Flags } from '@oclif/core';

import { BaseCommand } from '../base-command.js';
import { resolveClientDataSourceOrFail } from '../generate/data-source.js';
import { loadSiteRegistry } from '../diversity/registry.js';
import { buildCorpus, type HarvestSource } from '../harvest/corpus.js';
import { renderHarvestReport } from '../harvest/report.js';

/**
 * `upriver harvest` — sweep every client/prospect/matrix dir into one
 * versioned findings corpus + report (Spec 18 §3). Top-level on purpose: it
 * harvests prospects, clients, AND matrix runs, so neither `pitch harvest`
 * nor `diversity harvest` would name it honestly.
 *
 * Reads only standard artifacts (pitch/state.json, clone-qa/summary.json,
 * run-ledger.json, pitch/views.json, audit-package.json meta) — NEVER
 * pitch/share.json or anything token-bearing. The corpus is the sanitized,
 * committable derivative of the gitignored client dirs.
 */
export default class Harvest extends BaseCommand {
  static override description =
    'Sweep clients/prospects/matrix runs into a versioned findings corpus + calibration report (Spec 18).';

  static override examples = [
    '<%= config.bin %> harvest --dry-run',
    '<%= config.bin %> harvest',
    '<%= config.bin %> harvest --out /tmp/corpus',
  ];

  static override flags = {
    out: Flags.string({
      description: 'Output directory for <date>-harvest.json + <date>-harvest-report.md.',
      default: '.planning/website-rebuild-engine/corpus',
    }),
    'dry-run': Flags.boolean({
      description: 'List the sweep plan (slugs, kinds, artifacts found) without writing.',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { flags } = await this.parse(Harvest);
    const ds = resolveClientDataSourceOrFail((m) => this.error(m));

    // Matrix platform lookup is best-effort: a missing/invalid registry only
    // costs the platform column, never the sweep.
    let platformById = new Map<string, string>();
    try {
      const reg = loadSiteRegistry('config/site-registry.json');
      platformById = new Map(reg.sites.map((s) => [s.id, s.platform]));
    } catch {
      this.warn('config/site-registry.json missing or invalid — matrix platform column will be empty.');
    }

    const slugs = (await ds.listClientSlugs()).sort();
    const sources: HarvestSource[] = [];
    for (const slug of slugs) {
      const read = async (name: string): Promise<string | undefined> =>
        (await ds.readClientFileText(slug, name)) ?? undefined;

      const configYaml = await read('client-config.yaml');
      if (!configYaml) continue; // not a client dir

      const src: HarvestSource = { slug, configYaml };
      const platform = slug.startsWith('matrix-') ? platformById.get(slug.slice('matrix-'.length)) : undefined;
      if (platform) src.platform = platform;
      const fileFields: Array<[keyof HarvestSource & string, string]> = [
        ['pitchStateJson', 'pitch/state.json'],
        ['fidelitySummaryJson', 'clone-qa/summary.json'],
        ['runLedgerJson', 'run-ledger.json'],
        ['viewsJson', 'pitch/views.json'],
        ['auditPackageMetaJson', 'audit-package.json'],
      ];
      for (const [field, name] of fileFields) {
        const text = await read(name);
        if (text !== undefined) (src as unknown as Record<string, string>)[field] = text;
      }
      sources.push(src);
    }

    if (flags['dry-run']) {
      this.log(`\nharvest sweep plan — ${sources.length} source(s):`);
      for (const s of sources) {
        const have = [
          s.pitchStateJson && 'pitch/state',
          s.fidelitySummaryJson && 'clone-qa/summary',
          s.runLedgerJson && 'run-ledger',
          s.viewsJson && 'pitch/views',
          s.auditPackageMetaJson && 'audit-package',
        ].filter(Boolean);
        this.log(`  - ${s.slug.padEnd(24)} ${have.length > 0 ? have.join(', ') : '(config only)'}`);
      }
      this.log('\nDRY RUN — nothing written. Drop --dry-run to build the corpus.');
      return;
    }

    const corpus = buildCorpus(sources);
    const date = corpus.generatedAt.slice(0, 10);
    if (!existsSync(flags.out)) mkdirSync(flags.out, { recursive: true });
    const corpusPath = join(flags.out, `${date}-harvest.json`);
    const reportPath = join(flags.out, `${date}-harvest-report.md`);
    writeFileSync(corpusPath, `${JSON.stringify(corpus, null, 2)}\n`);
    writeFileSync(reportPath, renderHarvestReport(corpus));

    this.log(`\nHarvested ${corpus.sources.length} source(s); ${corpus.stats.scoredPages} scored page(s).`);
    this.log(`  Wrote ${corpusPath}`);
    this.log(`  Wrote ${reportPath}`);
  }
}
