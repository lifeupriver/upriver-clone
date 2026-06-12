import { existsSync } from 'node:fs';

import { Args } from '@oclif/core';

import { clientDir } from '@upriver/core';

import { BaseCommand } from '../base-command.js';
import { generatePin, hashPin } from '../admin/pin.js';
import { readState, writeState } from '../admin/state.js';

export default class AdminRotatePin extends BaseCommand {
  static override description =
    'F05 — generate a fresh form PIN. Prints the PIN once (share it with the client) plus its scrypt hash; the operator sets FORM_PIN_HASH on the Vercel deployment to the hash. The old PIN stops working as soon as the deployment redeploys. Neither value is written to disk.';
  static override args = { slug: Args.string({ description: 'Client slug', required: true }) };

  async run(): Promise<void> {
    const { args } = await this.parse(AdminRotatePin);
    const dir = clientDir(args.slug);
    if (!existsSync(dir)) this.error(`Client directory not found: ${dir}`);
    const state = readState(dir, args.slug);
    if (!state.form_pin_set) {
      this.warn('Admin form is not deployed for this client. Run `upriver admin-deploy` first.');
    }

    // CSPRNG PIN; the plaintext appears ONLY in this terminal output. Files
    // under clients/<slug>/ sync to the shared bucket and must never carry it.
    const pin = generatePin();
    const hash = hashPin(pin);
    this.log('');
    this.log(`New form PIN (shown once): ${pin}`);
    this.log('');
    this.log('FORM_PIN_HASH value for Vercel:');
    this.log(`  ${hash}`);
    this.log('');
    this.log('Next steps:');
    this.log('  1. On the Vercel project, set FORM_PIN_HASH to the hash above');
    this.log('  2. Redeploy (Vercel redeploys on env change); old PIN stops working within 1 minute');
    this.log('  3. Share the new PIN with the client over a private channel');

    writeState(dir, state);
  }
}
