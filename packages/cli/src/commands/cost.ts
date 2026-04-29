import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { Args, Flags } from '@oclif/core';
import { clientDir } from '@upriver/core';

import { BaseCommand } from '../base-command.js';
import {
  estimateCostForCommand,
  renderUsageSummary,
  summarizeUsageLog,
  DEFAULT_USD_PER_CREDIT,
} from '../util/cost-summary.js';

/**
 * `upriver cost <slug>` — surface the running token/credit cost for a client
 * by parsing `<clientDir>/token-and-credit-usage.log`. With `--estimate
 * <command>`, prints an estimated credit cost for a future invocation based on
 * the historical average for that command.
 *
 * Roadmap: Workstream F.4.
 */
export default class Cost extends BaseCommand {
  static override description =
    'Summarize token-and-credit-usage.log for a client; optionally estimate a future command (F.4).';

  static override examples = [
    '<%= config.bin %> cost audreys',
    '<%= config.bin %> cost audreys --estimate scrape',
    '<%= config.bin %> cost audreys --usd-per-credit 0.0015',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    estimate: Flags.string({
      description:
        'Estimate credit cost for a future invocation of the named command, using historical average.',
    }),
    'usd-per-credit': Flags.string({
      description: `USD per credit (default ${DEFAULT_USD_PER_CREDIT}). Override when the rate is known.`,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Cost);
    const { slug } = args;

    const base = process.env['UPRIVER_CLIENTS_DIR'] ?? './clients';
    const dir = resolve(clientDir(slug, base));
    if (!existsSync(dir)) {
      this.error(`Client directory not found at ${dir}.`);
    }

    const usdPerCredit = flags['usd-per-credit'] ? Number(flags['usd-per-credit']) : DEFAULT_USD_PER_CREDIT;
    if (!Number.isFinite(usdPerCredit) || usdPerCredit < 0) {
      this.error(`--usd-per-credit must be a non-negative number, got ${flags['usd-per-credit']}`);
    }

    const summary = summarizeUsageLog(dir, usdPerCredit);
    this.log('');
    this.log(renderUsageSummary(summary));

    if (flags.estimate) {
      const est = estimateCostForCommand(summary, flags.estimate);
      this.log('');
      if (!est) {
        this.log(
          `Estimate for "${flags.estimate}": no historical data — run the command at least once before relying on an estimate.`,
        );
      } else {
        const usd = est.credits * usdPerCredit;
        this.log(
          `Estimate for "${flags.estimate}": ~${est.credits.toFixed(1)} credit(s) (~$${usd.toFixed(3)}), based on ${est.basis} prior run(s).`,
        );
      }
    }
    this.log('');
  }
}
