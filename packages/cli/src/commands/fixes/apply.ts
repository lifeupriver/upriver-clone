import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';

export default class FixesApply extends BaseCommand {
  static override description = 'Apply approved audit fixes via headless Claude Code agent';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    parallel: Flags.boolean({ description: 'Apply independent fixes concurrently via git worktrees' }),
  };

  async run(): Promise<void> {
    this.log('upriver fixes apply — coming in Session 8');
  }
}
