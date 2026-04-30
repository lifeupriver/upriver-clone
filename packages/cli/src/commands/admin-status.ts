import { existsSync } from 'node:fs';

import { Args } from '@oclif/core';

import { clientDir } from '@upriver/core';

import { BaseCommand } from '../base-command.js';
import { readState } from '../admin/state.js';

export default class AdminStatus extends BaseCommand {
  static override description = 'F05 — show the natural-language admin status for a client.';
  static override args = { slug: Args.string({ description: 'Client slug', required: true }) };

  async run(): Promise<void> {
    const { args } = await this.parse(AdminStatus);
    const dir = clientDir(args.slug);
    if (!existsSync(dir)) this.error(`Client directory not found: ${dir}`);
    const state = readState(dir, args.slug);
    this.log(`\nAdmin status for ${args.slug}:`);
    this.log(`  GitHub repo:           ${state.github_repo ?? '(not deployed)'}`);
    this.log(`  Form deployed:         ${state.form_pin_set ? 'yes' : 'no'}`);
    this.log(`  Form URL:              ${state.form_url ?? '(not set)'}`);
    this.log(`  Paused:                ${state.paused ? 'YES' : 'no'}`);
    this.log(`  Deployed at:           ${state.deployed_at ?? '(never)'}`);
    this.log(`  Last change processed: ${state.last_change_processed_at ?? '(never)'}`);
  }
}
