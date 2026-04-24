import { Args } from '@oclif/core';
import { BaseCommand } from '../base-command.js';

export default class Clone extends BaseCommand {
  static override description = 'Run Claude Code headless agent to visually clone the site page by page';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  async run(): Promise<void> {
    this.log('upriver clone — coming in Session 7');
  }
}
