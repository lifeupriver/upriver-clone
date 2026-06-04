import { Args, Flags } from '@oclif/core';

import { BaseCommand } from '../../../base-command.js';
import { resolveClientDataSourceOrFail } from '../../../generate/data-source.js';
import { startSecretShopper } from '../../../recon/adapters/secret-shopper.js';

export default class ReconSecretShopperStart extends BaseCommand {
  static override description =
    'Log a secret-shopper inquiry you have sent MANUALLY to the client\'s business (build spec 04 §1.6). Records the channel + sent timestamp; recon never contacts the business itself.';

  static override examples = [
    '<%= config.bin %> recon secret-shopper start littlefriends --channel web-form',
    '<%= config.bin %> recon secret-shopper start littlefriends --channel email --at 2026-06-04T09:00:00Z',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    channel: Flags.string({
      description: 'How the inquiry was sent (web-form, email, phone, sms, ...).',
      default: 'web-form',
    }),
    at: Flags.string({ description: 'ISO timestamp the inquiry was sent (default: now).' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ReconSecretShopperStart);
    const ds = resolveClientDataSourceOrFail((m) => this.error(m));
    const sentAt = flags.at ?? new Date().toISOString();

    const entry = await startSecretShopper(ds, args.slug, { channel: flags.channel, sentAt });

    this.log(`Logged secret-shopper inquiry "${entry.id}" (channel: ${entry.channel}, sent: ${entry.sentAt}).`);
    this.log(
      `When the business replies, run:\n  upriver recon secret-shopper record ${args.slug} --response "<their reply>"`,
    );
  }
}
