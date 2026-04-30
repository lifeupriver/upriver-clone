import { existsSync } from 'node:fs';

import { Args } from '@oclif/core';

import { clientDir } from '@upriver/core';

import { BaseCommand } from '../base-command.js';
import { readState, writeState } from '../admin/state.js';

export default class AdminRotatePin extends BaseCommand {
  static override description =
    'F05 — generate a fresh form PIN. The CLI prints the new PIN; the operator hashes it and updates FORM_PIN_HASH on the Vercel deployment. Old PIN stops working as soon as the deployment redeploys.';
  static override args = { slug: Args.string({ description: 'Client slug', required: true }) };

  async run(): Promise<void> {
    const { args } = await this.parse(AdminRotatePin);
    const dir = clientDir(args.slug);
    if (!existsSync(dir)) this.error(`Client directory not found: ${dir}`);
    const state = readState(dir, args.slug);
    if (!state.form_pin_set) {
      this.warn('Admin form is not deployed for this client. Run `upriver admin-deploy` first.');
    }

    const pin = generatePin();
    this.log('');
    this.log(`New form PIN: ${pin}`);
    this.log('');
    this.log('Next steps:');
    this.log(`  1. Hash the PIN:  pnpm dlx bcryptjs-cli hash "${pin}"`);
    this.log('  2. On the Vercel project, set FORM_PIN_HASH to the hash output');
    this.log('  3. Vercel auto-redeploys; old PIN stops working within 1 minute');
    this.log('  4. Share the new PIN with the client');

    state.last_change_processed_at = state.last_change_processed_at;
    writeState(dir, state);
  }
}

function generatePin(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += String(Math.floor(Math.random() * 10));
  return s;
}
