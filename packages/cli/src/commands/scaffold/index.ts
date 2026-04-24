import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';

export default class Scaffold extends BaseCommand {
  static override description = 'Generate Astro 6 hybrid repo for the client';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    'supabase-project-ref': Flags.string({ description: 'Supabase project reference ID' }),
  };

  async run(): Promise<void> {
    this.log('upriver scaffold — coming in Session 6');
  }
}
