import { spawn } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Args, Flags } from '@oclif/core';

import { clientDir } from '@upriver/core';

import { BaseCommand } from '../../base-command.js';
import { domainToSlug } from '../../util/domain-slug.js';
import {
  estimateTable,
  PITCH_MAX_BATCH_SPEND_USD_DEFAULT,
  PITCH_MAX_SPEND_USD_DEFAULT,
  sumLedgers,
  type SpendLedger,
} from '../../pitch/ledger.js';
import { PITCH_STATE_VERSION, type PitchState } from '../../pitch/state.js';

interface Outcome {
  url: string;
  slug: string;
  result: 'drafted' | 'failed' | 'skipped';
  detail: string;
}

export default class PitchBatch extends BaseCommand {
  static override description =
    'Run `pitch run` over a prospect list (one URL per line, # comments). Sequential — politeness and budget legibility over speed. Drafts only: NOTHING sends from batch; each send remains an explicit per-prospect `pitch approve`.';

  static override examples = [
    '<%= config.bin %> pitch batch prospects.txt --dry-run',
    '<%= config.bin %> pitch batch prospects.txt --max-batch-spend-usd 25',
  ];

  static override args = {
    file: Args.string({ description: 'Path to the prospect list', required: true }),
  };

  static override flags = {
    'max-spend-usd': Flags.integer({
      description: 'Per-prospect ceiling, passed through to each pitch run.',
      default: PITCH_MAX_SPEND_USD_DEFAULT,
    }),
    'max-batch-spend-usd': Flags.integer({
      description: 'Ceiling over the whole batch (sum of per-prospect ledgers), checked BEFORE each prospect.',
      default: PITCH_MAX_BATCH_SPEND_USD_DEFAULT,
    }),
    'expires-days': Flags.integer({ description: 'Preview expiry, passed through.' }),
    'base-url': Flags.string({ description: 'Dashboard origin, passed through.' }),
    'dry-run': Flags.boolean({
      description: 'List the prospects and the budget plan; run nothing.',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(PitchBatch);
    if (!existsSync(args.file)) this.error(`prospect list not found: ${args.file}`, { exit: 2 });

    const urls = readFileSync(args.file, 'utf8')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter((l) => l !== '' && !l.startsWith('#'));
    if (urls.length === 0) this.error('the prospect list has no URLs', { exit: 2 });

    const perProspectEst = estimateTable(flags['max-spend-usd']).totalUsd;
    if (flags['dry-run']) {
      this.log(`\npitch batch: ${urls.length} prospect(s)`);
      for (const url of urls) this.log(`  - ${url} → ${safeSlug(url)}`);
      this.log(
        `\nBudget: ≈$${perProspectEst.toFixed(2)}/prospect (ceiling $${flags['max-spend-usd']}), batch ceiling $${flags['max-batch-spend-usd']} (covers ~${Math.floor(flags['max-batch-spend-usd'] / perProspectEst)} prospects).`,
      );
      this.log('Nothing was executed (--dry-run).');
      return;
    }

    const binPath = process.argv[1];
    if (!binPath) this.error('Cannot determine the upriver bin path.', { exit: 2 });

    const outcomes: Outcome[] = [];
    const ledgers: SpendLedger[] = [];

    for (const url of urls) {
      const slug = safeSlug(url);
      if (slug === null) {
        outcomes.push({ url, slug: '—', result: 'failed', detail: 'cannot derive a slug' });
        continue;
      }

      const spentSoFar = sumLedgers(ledgers).estUsd;
      if (spentSoFar + perProspectEst > flags['max-batch-spend-usd']) {
        outcomes.push({
          url,
          slug,
          result: 'skipped',
          detail: `batch ceiling: $${spentSoFar.toFixed(2)} spent + ≈$${perProspectEst.toFixed(2)} next > $${flags['max-batch-spend-usd']}`,
        });
        continue;
      }

      this.log(`\n════════ pitch batch: ${url} (${slug}) ════════`);
      const argv = [binPath, 'pitch', 'run', url, '--max-spend-usd', String(flags['max-spend-usd'])];
      if (flags['expires-days'] !== undefined) argv.push('--expires-days', String(flags['expires-days']));
      if (flags['base-url']) argv.push('--base-url', flags['base-url']);

      const code = await runChild(argv);
      const state = readState(slug);
      if (state) ledgers.push(state.ledger);
      outcomes.push(
        code === 0
          ? { url, slug, result: 'drafted', detail: `≈$${(state?.ledger.estUsd ?? 0).toFixed(2)}` }
          : { url, slug, result: 'failed', detail: `pitch run exited ${code}${state ? ` (state: ${state.status})` : ''}` },
      );
    }

    this.log('\n════════ batch summary ════════');
    for (const o of outcomes) {
      this.log(`  [${o.result.padEnd(7)}] ${o.slug.padEnd(24)} ${o.url}  ${o.detail}`);
    }
    const drafted = outcomes.filter((o) => o.result === 'drafted').length;
    const failed = outcomes.filter((o) => o.result === 'failed').length;
    const skipped = outcomes.filter((o) => o.result === 'skipped').length;
    this.log(
      `\n${drafted} drafted, ${failed} failed, ${skipped} skipped — total est. spend ≈$${sumLedgers(ledgers).estUsd.toFixed(2)}.`,
    );
    this.log('Review each draft, then send per prospect: upriver pitch approve <slug>');
    if (failed > 0) this.error(`${failed} prospect(s) failed — see the summary above.`, { exit: 1 });
  }
}

function safeSlug(url: string): string | null {
  try {
    return domainToSlug(url);
  } catch {
    return null;
  }
}

function readState(slug: string): PitchState | null {
  try {
    const raw = JSON.parse(readFileSync(join(clientDir(slug), 'pitch', 'state.json'), 'utf8')) as PitchState;
    return raw.v === PITCH_STATE_VERSION ? raw : null;
  } catch {
    return null;
  }
}

function runChild(argv: string[]): Promise<number> {
  return new Promise((resolveP) => {
    const child = spawn(process.execPath, argv, { stdio: 'inherit', env: { ...process.env } });
    child.on('exit', (code) => resolveP(typeof code === 'number' ? code : 1));
    child.on('error', () => resolveP(1));
  });
}
