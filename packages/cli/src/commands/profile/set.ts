import { Args, Flags } from '@oclif/core';
import { clientProfileZ } from '@upriver/schemas';

import { BaseCommand } from '../../base-command.js';
import { resolveClientDataSourceOrFail } from '../../generate/data-source.js';
import { readProfile, writeProfile } from '../../generate/profile-io.js';
import { parseValueArg, planSet } from '../../profile/mutate.js';
import { validateSetPath } from '../../profile/paths.js';
import { formatIssues } from '../../profile/render.js';

export default class ProfileSet extends BaseCommand {
  static override description =
    'Operator write of a single profile field. Parses <value> as JSON if it parses, else as a string. Operator precedence means the write always applies; setting an HV field does NOT verify it — run `profile verify` for that.';

  static override examples = [
    `<%= config.bin %> profile set littlefriends pricing.deposit "One month's tuition"`,
    `<%= config.bin %> profile set littlefriends capacity.metrics '[{"label":"Licensed capacity","value":16}]'`,
    '<%= config.bin %> profile set littlefriends goals.budgetConstraints "$2k/mo" --evidence "owner email 5/1"',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
    path: Args.string({ description: 'Dot-path of the field, e.g. pricing.deposit', required: true }),
    value: Args.string({ description: 'Value — parsed as JSON if it parses, otherwise a string', required: true }),
  };

  static override flags = {
    evidence: Flags.string({ description: 'Evidence (quote or URL) recorded on the field envelope.' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ProfileSet);

    const check = validateSetPath(args.path);
    if (!check.ok) this.error(check.reason);

    const ds = resolveClientDataSourceOrFail((m) => this.error(m));
    const profile = await readProfile(ds, args.slug);
    if (!profile) {
      this.error(`No profile found for "${args.slug}". Run \`upriver profile import ${args.slug} <file>\` first.`);
    }

    const value = parseValueArg(args.value);
    const plan = planSet(profile, args.path, value, flags.evidence, new Date().toISOString());

    const parsed = clientProfileZ.safeParse(plan.profile);
    if (!parsed.success) {
      this.log(`Setting ${args.path} would make the profile invalid (${parsed.error.issues.length} issue(s)):`);
      this.log(formatIssues(parsed.error.issues));
      this.error(`Aborted: the value does not satisfy the schema at ${args.path}.`);
    }

    await writeProfile(ds, args.slug, plan.profile);
    this.log(`set ${args.path} = ${JSON.stringify(value)} (operator). revision ${plan.profile._meta.revision}.`);
    if (plan.resetVerified) {
      this.log(
        `  note: ${args.path} was verified; changing its value reset verification. Re-verify with \`upriver profile verify ${args.slug} ${args.path}\`.`,
      );
    }
  }
}
