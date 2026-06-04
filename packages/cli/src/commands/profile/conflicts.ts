import { Args, Flags } from '@oclif/core';
import { clientProfileZ } from '@upriver/schemas';

import { BaseCommand } from '../../base-command.js';
import { resolveClientDataSourceOrFail } from '../../generate/data-source.js';
import { readConflicts, readProfile, writeProfile } from '../../generate/profile-io.js';
import { writeConflicts } from '../../profile/io.js';
import { planResolve, type ResolvePlan } from '../../profile/mutate.js';
import { formatIssues, renderConflicts } from '../../profile/render.js';

export default class ProfileConflicts extends BaseCommand {
  static override description =
    'List the profile conflict queue, or resolve an entry by keeping the existing value or the candidate (a kept candidate is written as an operator-sourced value).';

  static override examples = [
    '<%= config.bin %> profile conflicts littlefriends',
    '<%= config.bin %> profile conflicts littlefriends --resolve 1 --keep existing',
    '<%= config.bin %> profile conflicts littlefriends --resolve 2 --keep candidate',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    resolve: Flags.integer({ description: 'Resolve conflict number N (1-based, as shown in the list).' }),
    keep: Flags.string({
      description: 'With --resolve: which side to keep.',
      options: ['existing', 'candidate'],
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ProfileConflicts);

    const ds = resolveClientDataSourceOrFail((m) => this.error(m));
    const profile = await readProfile(ds, args.slug);
    if (!profile) {
      this.error(`No profile found for "${args.slug}". Run \`upriver profile import ${args.slug} <file>\` first.`);
    }
    const conflicts = await readConflicts(ds, args.slug);

    if (flags.resolve === undefined) {
      this.log(renderConflicts(conflicts));
      return;
    }
    if (flags.keep === undefined) {
      this.error('--resolve requires --keep existing|candidate.');
    }

    let plan: ResolvePlan;
    try {
      plan = planResolve(
        profile,
        conflicts,
        flags.resolve - 1,
        flags.keep as 'existing' | 'candidate',
        new Date().toISOString(),
      );
    } catch (err) {
      return this.error((err as Error).message);
    }

    if (plan.applied) {
      const parsed = clientProfileZ.safeParse(plan.profile);
      if (!parsed.success) {
        this.log(formatIssues(parsed.error.issues));
        this.error(`Aborted: keeping the candidate at ${plan.path} would make the profile invalid.`);
      }
      await writeProfile(ds, args.slug, plan.profile);
    }
    await writeConflicts(ds, args.slug, plan.conflicts);

    this.log(
      `Resolved #${flags.resolve} (${plan.path}) — kept ${plan.keep}.${plan.applied ? ` revision ${plan.profile._meta.revision}.` : ''}`,
    );
    this.log(`${plan.conflicts.length} conflict(s) remaining.`);
  }
}
