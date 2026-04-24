import { Args } from '@oclif/core';
import { BaseCommand } from '../base-command.js';

export default class InterviewPrep extends BaseCommand {
  static override description = 'Generate customized interview guide from audit findings';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  async run(): Promise<void> {
    this.log('upriver interview-prep — coming in Session 5');
  }
}
