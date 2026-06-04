import { createInterface } from 'node:readline/promises';

import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command.js';
import { resolveClientDataSourceOrFail } from '../../generate/data-source.js';
import { generatedIds, readManifest } from '../../generate/manifest.js';
import { readProfile, writeProfile } from '../../generate/profile-io.js';
import { pendingHvVerifications, planVerify } from '../../profile/mutate.js';

export default class ProfileVerify extends BaseCommand {
  // Variadic: `verify <slug> <path...>` — extra positionals are HV paths.
  static override strict = false;

  static override description =
    'Verify human-verify-required fields — the ONLY path past an HV gate. Each path must be HV and have a non-null value. Setting a value and verifying it are two separate acts.';

  static override examples = [
    '<%= config.bin %> profile verify littlefriends pricing.deposit pricing.shareable',
    `<%= config.bin %> profile verify littlefriends 'offerings.core.*.priceRange' --evidence "owner call 5/2"`,
    '<%= config.bin %> profile verify littlefriends --all-filled',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    evidence: Flags.string({ description: 'Evidence recorded on each verified field.' }),
    'all-filled': Flags.boolean({
      description: 'Verify every filled, unverified HV field after a per-field y/N prompt (needs a TTY).',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, argv, flags } = await this.parse(ProfileVerify);
    const slug = args.slug;

    const ds = resolveClientDataSourceOrFail((m) => this.error(m));
    const profile = await readProfile(ds, slug);
    if (!profile) {
      this.error(`No profile found for "${slug}". Run \`upriver profile import ${slug} <file>\` first.`);
    }
    const generated = generatedIds(await readManifest(ds, slug));

    let paths = (argv as string[]).slice(1);

    if (flags['all-filled']) {
      if (paths.length > 0) this.error('Pass either explicit paths or --all-filled, not both.');
      const pending = pendingHvVerifications(profile);
      if (pending.length === 0) {
        this.log('No filled, unverified HV fields to verify.');
        return;
      }
      if (!process.stdin.isTTY) {
        this.log('--all-filled needs a TTY for the per-field y/N prompt. It refuses in a non-TTY. It would offer:');
        for (const p of pending) this.log(`  - ${p.path} = ${JSON.stringify(p.value)}`);
        this.error('Refused: --all-filled needs an interactive terminal.');
      }
      paths = await this.promptForPaths(pending);
      if (paths.length === 0) {
        this.log('Nothing verified.');
        return;
      }
    } else if (paths.length === 0) {
      this.error('Provide at least one path to verify, or use --all-filled.');
    }

    const plan = planVerify(profile, paths, flags.evidence, generated, new Date().toISOString());
    for (const item of plan.items) {
      this.log(item.ok ? `  verified ${item.path}` : `  skipped  ${item.path}: ${item.reason}`);
    }

    if (plan.verifiedCount > 0) {
      await writeProfile(ds, slug, plan.profile);
      this.log(`\n${plan.verifiedCount} field(s) verified. revision ${plan.profile._meta.revision}.`);
      this.log(
        plan.unblocked.length > 0
          ? `unblocked: ${plan.unblocked.join(', ')}`
          : 'no deliverables newly unblocked.',
      );
    } else {
      this.log('\nNo fields verified (nothing written).');
      this.exit(1);
    }
  }

  private async promptForPaths(
    pending: ReturnType<typeof pendingHvVerifications>,
  ): Promise<string[]> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    const chosen: string[] = [];
    try {
      for (const p of pending) {
        const ev = p.evidence ? `  evidence: ${p.evidence}\n` : '';
        const answer = (
          await rl.question(`Verify ${p.path}?\n  value: ${JSON.stringify(p.value)}\n${ev}[y/N] `)
        )
          .trim()
          .toLowerCase();
        if (answer === 'y' || answer === 'yes') chosen.push(p.path);
      }
    } finally {
      rl.close();
    }
    return chosen;
  }
}
