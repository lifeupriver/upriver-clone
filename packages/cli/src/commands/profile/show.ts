import { Args, Flags } from '@oclif/core';
import { COVERAGE_MAP, type DeliverableId } from '@upriver/schemas';

import { BaseCommand } from '../../base-command.js';
import { resolveClientDataSourceOrFail } from '../../generate/data-source.js';
import { readManifest } from '../../generate/manifest.js';
import { readConflicts, readProfile } from '../../generate/profile-io.js';
import { renderDeliverableDetail, renderShow } from '../../profile/render.js';
import { buildDeliverableDetail, buildShowModel } from '../../profile/show-model.js';

export default class ProfileShow extends BaseCommand {
  static override description =
    'Show the Client Profile coverage report: per-deliverable readiness (ready / blocked by fields, HV, or upstream docs), the conflict queue, generated-but-unapproved docs blocking downstream, and per-section fill stats.';

  static override examples = [
    '<%= config.bin %> profile show littlefriends',
    '<%= config.bin %> profile show littlefriends --json',
    '<%= config.bin %> profile show littlefriends --deliverable doc-02',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    json: Flags.boolean({
      description: 'Emit the report model as JSON (machine output for the dashboard view).',
      default: false,
    }),
    deliverable: Flags.string({
      description: 'Show a single deliverable in detail, including the exact missing/unverified paths.',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ProfileShow);
    const ds = resolveClientDataSourceOrFail((m) => this.error(m));

    const profile = await readProfile(ds, args.slug);
    if (!profile) {
      this.error(
        `No profile found for "${args.slug}". Run \`upriver profile import ${args.slug} <file>\` first.`,
      );
    }
    const manifest = await readManifest(ds, args.slug);

    if (flags.deliverable !== undefined) {
      const id = flags.deliverable as DeliverableId;
      if (!COVERAGE_MAP.some((d) => d.id === id)) {
        this.error(
          `Unknown deliverable "${flags.deliverable}". Valid ids: ${COVERAGE_MAP.map((d) => d.id).join(', ')}`,
        );
      }
      const detail = buildDeliverableDetail(profile, manifest, id);
      this.log(flags.json ? JSON.stringify(detail, null, 2) : renderDeliverableDetail(detail));
      return;
    }

    const conflicts = await readConflicts(ds, args.slug);
    const model = buildShowModel(profile, manifest, conflicts);
    this.log(flags.json ? JSON.stringify(model, null, 2) : renderShow(model));
  }
}
