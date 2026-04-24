import { Args } from '@oclif/core';
import { BaseCommand } from '../base-command.js';

export default class DesignBrief extends BaseCommand {
  static override description = 'Generate Claude Design handoff brief from audit-package.json';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  async run(): Promise<void> {
    this.log('upriver design-brief — coming in Session 4');
  }
}
