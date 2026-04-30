import { existsSync } from 'node:fs';

import { Args, Flags } from '@oclif/core';

import { clientDir } from '@upriver/core';

import { BaseCommand } from '../base-command.js';
import { readState, writeState } from '../admin/state.js';

export default class AdminPause extends BaseCommand {
  static override description =
    'F05 — pause or resume natural-language admin processing for a client. While paused, admin-process refuses to run and the webhook handler should refuse to process incoming events.';
  static override args = { slug: Args.string({ description: 'Client slug', required: true }) };
  static override flags = { resume: Flags.boolean({ description: 'Resume processing.', default: false }) };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(AdminPause);
    const dir = clientDir(args.slug);
    if (!existsSync(dir)) this.error(`Client directory not found: ${dir}`);
    const state = readState(dir, args.slug);
    state.paused = !flags.resume;
    writeState(dir, state);
    this.log(`Admin for ${args.slug}: ${state.paused ? 'PAUSED' : 'resumed'}.`);
  }
}
