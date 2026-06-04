import { Args, Flags } from '@oclif/core';
import { createEmptyProfile } from '@upriver/schemas';

import { BaseCommand } from '../../../base-command.js';
import { resolveClientDataSourceOrFail } from '../../../generate/data-source.js';
import { appendConflicts, bumpMeta, readProfile, writeProfile } from '../../../generate/profile-io.js';
import { recordSecretShopper } from '../../../recon/adapters/secret-shopper.js';
import { mergeCandidates, structurallyValid } from '../../../recon/merge-candidates.js';

export default class ReconSecretShopperRecord extends BaseCommand {
  static override description =
    'Record the business\'s reply to a logged secret-shopper inquiry; computes the response time and merges it into salesProcess.firstTouch.responseTime as a recon candidate (never verified).';

  static override examples = [
    '<%= config.bin %> recon secret-shopper record littlefriends --response "Thanks! We have a tour Tuesday."',
    '<%= config.bin %> recon secret-shopper record littlefriends --id web-form-2026-06-04T09:00:00Z --response "..." --at 2026-06-04T13:30:00Z',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    response: Flags.string({ description: 'The reply text the business sent.', required: true }),
    id: Flags.string({ description: 'Inquiry id (default: the most recent pending inquiry).' }),
    at: Flags.string({ description: 'ISO timestamp the reply arrived (default: now).' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ReconSecretShopperRecord);
    const { slug } = args;
    const ds = resolveClientDataSourceOrFail((m) => this.error(m));
    const respondedAt = flags.at ?? new Date().toISOString();

    const { entry, candidate } = await recordSecretShopper(ds, slug, {
      response: flags.response,
      respondedAt,
      ...(flags.id ? { id: flags.id } : {}),
    });

    const now = new Date().toISOString();
    if (!structurallyValid(candidate.path, candidate.value, now)) {
      this.error(`Computed candidate failed schema validation for ${candidate.path}.`);
    }

    const existing = await readProfile(ds, slug);
    const profile = existing ?? createEmptyProfile(slug, now);
    const merged = mergeCandidates(profile, [candidate], now);

    const changed = merged.outcomes.some((o) => o.kind === 'filled' || o.kind === 'skipped');
    if (changed) await writeProfile(ds, slug, bumpMeta(merged.profile, now));
    if (merged.conflicts.length > 0) await appendConflicts(ds, slug, merged.conflicts);

    this.log(`Recorded reply for "${entry.id}" — response time ${entry.responseTime}.`);
    const outcome = merged.outcomes[0]?.kind ?? 'unchanged';
    this.log(`  salesProcess.firstTouch.responseTime: ${outcome}.`);
    if (merged.conflicts.length > 0) {
      this.log('  (a higher-precedence value exists — conflict queued for operator review.)');
    }
  }
}
