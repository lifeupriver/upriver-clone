import { Args } from '@oclif/core';
import {
  LocalFsClientDataSource,
  createSupabaseClientDataSourceFromEnv,
  type ClientDataSource,
} from '@upriver/core/data';

import { BaseCommand } from '../../base-command.js';
import { renderSyncResult } from '../../profile/render.js';
import { syncProfile } from '../../profile/sync.js';

export default class ProfilePull extends BaseCommand {
  static override description =
    'Pull the remote (Supabase) profile into the local profile, merging by the standard rules — conflicts queue and verified values are never overwritten. The docs manifest is copied (source wins); generated doc files are not synced here (use `upriver sync pull`).';

  static override examples = ['<%= config.bin %> profile pull littlefriends'];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(ProfilePull);
    const local = new LocalFsClientDataSource();
    let remote: ClientDataSource;
    try {
      remote = createSupabaseClientDataSourceFromEnv();
    } catch (err) {
      return this.error(
        `${(err as Error).message}\nprofile pull/push sync the local profile against Supabase; set the UPRIVER_SUPABASE_* vars.`,
      );
    }
    const result = await syncProfile('pull', args.slug, { local, remote }, new Date().toISOString());
    this.log(renderSyncResult(args.slug, result));
  }
}
