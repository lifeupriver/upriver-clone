import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../base-command.js';
import { resolveClientDataSourceOrFail } from '../../generate/data-source.js';
import { convertProspect } from '../../pitch/convert-core.js';

export default class PitchConvert extends BaseCommand {
  static override description =
    'Convert a pitch prospect into a client: flip stage to "client" and seed profile fields from their questionnaire answers.';

  static override examples = [
    '<%= config.bin %> pitch convert wildflourbakery',
    '<%= config.bin %> pitch convert wildflourbakery --no-answers   # convert before they answered',
  ];

  static override args = {
    slug: Args.string({ description: 'Prospect slug', required: true }),
  };

  static override flags = {
    'no-answers': Flags.boolean({
      description: 'Convert even though the prospect has not answered the questionnaire.',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(PitchConvert);
    const ds = resolveClientDataSourceOrFail((m) => this.error(m));

    let result;
    try {
      result = await convertProspect(ds, args.slug, { noAnswers: flags['no-answers'] });
    } catch (err) {
      this.error((err as Error).message, { exit: 1 });
    }

    this.log(
      result.flipped
        ? `✓ ${args.slug} converted: stage prospect → client`
        : `${args.slug} is already stage: client (no flip needed)`,
    );
    const filled = result.outcomes.filter((o) => o.kind === 'filled');
    if (filled.length > 0) {
      this.log(`  Profile seeded from questionnaire answers (source: interview):`);
      for (const o of filled) this.log(`    ${o.path}  ←  answer ${o.id}`);
    }
    if (result.conflicts > 0) {
      this.log(
        `  ${result.conflicts} answer(s) disagreed with verified/higher-provenance values — queued to profile-conflicts.json (run: upriver conflicts ${args.slug}).`,
      );
    }
    if (result.withoutAnswers) {
      this.log('  No questionnaire answers existed; converted without profile seeding.');
    }
  }
}
