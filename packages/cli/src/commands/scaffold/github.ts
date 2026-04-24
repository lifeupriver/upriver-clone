import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';

export default class ScaffoldGithub extends BaseCommand {
  static override description = 'Create GitHub repo and push scaffolded code (dry-run by default)';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    commit: Flags.boolean({ description: 'Execute — without this flag only prints what would happen' }),
  };

  async run(): Promise<void> {
    this.log('upriver scaffold github — coming in Session 7');
  }
}
