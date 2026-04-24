import { Args } from '@oclif/core';
import { BaseCommand } from '../base-command.js';

export default class Synthesize extends BaseCommand {
  static override description = 'Compile audit passes into audit-package.json and generate client documents';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  async run(): Promise<void> {
    this.log('upriver synthesize — coming in Session 4');
  }
}
