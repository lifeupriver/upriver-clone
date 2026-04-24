import { Args } from '@oclif/core';
import { BaseCommand } from '../base-command.js';

export default class Audit extends BaseCommand {
  static override description = 'Run all 10 audit passes concurrently against scraped data';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  async run(): Promise<void> {
    this.log('upriver audit — coming in Session 3');
  }
}
