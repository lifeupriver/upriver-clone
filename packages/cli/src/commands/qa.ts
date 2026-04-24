import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';

export default class Qa extends BaseCommand {
  static override description = 'Run all audit passes against the live or preview URL and produce a launch readiness report';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    'preview-url': Flags.string({ description: 'Vercel preview URL to audit' }),
    mode: Flags.string({ options: ['preview', 'production'], default: 'preview' }),
  };

  async run(): Promise<void> {
    this.log('upriver qa — coming in Session 8');
  }
}
