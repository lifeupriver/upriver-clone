import { join } from 'node:path';

import { Args, Flags } from '@oclif/core';
import { clientDir } from '@upriver/core';
import { createEmptyProfile } from '@upriver/schemas';

import { BaseCommand } from '../base-command.js';
import { resolveClientDataSource } from '../generate/data-source.js';
import { appendConflicts, bumpMeta, readProfile, writeProfile } from '../generate/profile-io.js';
import { claudeCliAvailable } from '../util/claude-cli.js';
import { DEFAULT_ADAPTER_IDS, selectAdapters } from '../recon/adapters/index.js';
import { createReconContext } from '../recon/build-context.js';
import { renderDryRun, renderReport } from '../recon/report.js';
import { planRecon, runRecon } from '../recon/run.js';

export default class Recon extends BaseCommand {
  static override description =
    'Automated profile fill (build spec 04 §4.1). Runs recon adapters (website, gbp, socials, geo, serp) and merges source:"recon" candidates into the Client Profile — filling gaps, never overwriting higher-precedence data, never marking anything verified.';

  static override examples = [
    '<%= config.bin %> recon littlefriends',
    '<%= config.bin %> recon littlefriends --adapters website,gbp',
    '<%= config.bin %> recon littlefriends --dry-run',
    '<%= config.bin %> recon littlefriends --adapters website --fresh',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    adapters: Flags.string({
      description: `Comma-separated adapters to run (default: ${DEFAULT_ADAPTER_IDS.join(',')}).`,
    }),
    'dry-run': Flags.boolean({
      description: 'Gather nothing; report which adapters would run and which recon targets are unfilled.',
      default: false,
    }),
    fresh: Flags.boolean({
      description: 'Re-scrape even when cached page evidence (clients/<slug>/pages/) exists.',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Recon);
    const { slug } = args;

    const requested = flags.adapters
      ? flags.adapters.split(',').map((s) => s.trim()).filter(Boolean)
      : DEFAULT_ADAPTER_IDS;
    const { adapters, unknown } = selectAdapters(requested);
    if (unknown.length > 0) {
      this.error(`Unknown adapter(s): ${unknown.join(', ')}. Valid: ${DEFAULT_ADAPTER_IDS.join(', ')}`);
    }
    if (adapters.length === 0) this.error('No adapters selected.');

    const ds = resolveClientDataSource();
    const config = this.getConfig(slug); // readClientConfig — errors clearly if missing
    const existing = await readProfile(ds, slug);
    const now = new Date().toISOString();
    const profile = existing ?? createEmptyProfile(slug, now);

    if (flags['dry-run']) {
      this.log(renderDryRun(planRecon({ profile }, adapters)));
      return;
    }

    // Live run needs Firecrawl (scrape/search) and the read-only `claude` CLI (extraction).
    const firecrawlKey = this.getFirecrawlKey();
    if (!(await claudeCliAvailable())) {
      this.error(
        'The `claude` CLI is required for recon extraction. Install Claude Code (npm i -g @anthropic-ai/claude-code) and log in to your Claude Max subscription.',
      );
    }

    const ctx = createReconContext({
      slug,
      config,
      profile,
      now,
      fresh: flags.fresh,
      ds,
      firecrawlKey,
      creditLogPath: join(clientDir(slug), 'token-and-credit-usage.log'),
      log: (m) => this.log(m),
    });

    this.log(`\nRecon for "${slug}" — adapters: ${adapters.map((a) => a.id).join(', ')}\n`);
    const run = await runRecon(ctx, adapters);

    const changed = run.perAdapter
      .flatMap((a) => a.outcomes)
      .some((o) => o.kind === 'filled' || o.kind === 'skipped');
    if (changed) await writeProfile(ds, slug, bumpMeta(run.profileAfter, now));
    if (run.conflicts.length > 0) await appendConflicts(ds, slug, run.conflicts);

    this.log(`\n${renderReport(run)}`);
    if (!changed && run.conflicts.length === 0) this.log('\n(no profile changes)');
    else if (changed) this.log(`\nProfile written for "${slug}".`);
  }
}
