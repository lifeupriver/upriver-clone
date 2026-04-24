import { Args } from '@oclif/core';
import { BaseCommand } from '../base-command.js';

export default class LaunchChecklist extends BaseCommand {
  static override description = 'Generate DNS migration, redirect, GSC, and analytics launch checklist';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  async run(): Promise<void> {
    this.log('upriver launch-checklist — coming in Session 8');
  }
}
