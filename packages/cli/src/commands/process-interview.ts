import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';

export default class ProcessInterview extends BaseCommand {
  static override description = 'Synthesize interview transcript into brand voice guide, FAQ bank, and audience insights';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    transcript: Flags.string({ description: 'Path to interview transcript file', required: true }),
  };

  async run(): Promise<void> {
    this.log('upriver process-interview — coming in Session 5');
  }
}
