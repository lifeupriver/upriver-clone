import { createInterface } from 'node:readline/promises';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Args, Flags } from '@oclif/core';

import { clientDir } from '@upriver/core';

import { BaseCommand } from '../../base-command.js';
import { resolveClientDataSourceOrFail } from '../../generate/data-source.js';
import { readProfile } from '../../generate/profile-io.js';
import { DEFAULT_FROM, sendViaResend } from '../../report-helpers/resend.js';
import { prepareApproval } from '../../pitch/approve-core.js';
import type { PitchEmailDraft } from '../../pitch/email.js';
import { isEmailSuppressed } from '../../pitch/suppression.js';
import { readPitchState, recordStep, transition, writePitchState } from '../../pitch/state.js';

export default class PitchApprove extends BaseCommand {
  static override description =
    'Review and send a drafted pitch email. The ONLY path that sends prospect outreach: shows the exact email and links, checks the suppression list, then asks for confirmation.';

  static override examples = [
    '<%= config.bin %> pitch approve wildflourbakery --dry-run   # render without sending',
    '<%= config.bin %> pitch approve wildflourbakery',
    '<%= config.bin %> pitch approve wildflourbakery --to owner@example.com --yes',
  ];

  static override args = {
    slug: Args.string({ description: 'Prospect slug', required: true }),
  };

  static override flags = {
    to: Flags.string({
      description: 'Recipient email. Defaults to the profile’s identity.email.',
    }),
    from: Flags.string({
      description: `Sender. Defaults to UPRIVER_PITCH_FROM, then ${DEFAULT_FROM}.`,
    }),
    postal: Flags.string({
      description: 'Postal address for the CAN-SPAM footer. Defaults to UPRIVER_OUTREACH_POSTAL.',
    }),
    'base-url': Flags.string({
      description:
        'Public dashboard origin for the unsubscribe link. Defaults to UPRIVER_DASHBOARD_BASE_URL or http://localhost:4400.',
    }),
    yes: Flags.boolean({
      description: 'Skip the interactive confirmation (scripted local use).',
      default: false,
    }),
    'dry-run': Flags.boolean({
      description: 'Render the email and the checks without sending (keyless).',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(PitchApprove);
    const { slug } = args;
    const dir = clientDir(slug);
    const dryRun = flags['dry-run'];

    let state = null;
    try {
      state = readPitchState(dir);
    } catch {
      state = null;
    }

    const draftPath = join(dir, 'pitch', 'email-draft.json');
    let draft: PitchEmailDraft | null = null;
    if (existsSync(draftPath)) {
      try {
        draft = JSON.parse(readFileSync(draftPath, 'utf8')) as PitchEmailDraft;
      } catch {
        draft = null;
      }
    }

    let to = flags.to ?? '';
    if (!to) {
      const ds = resolveClientDataSourceOrFail((m) => this.error(m));
      try {
        const profile = await readProfile(ds, slug);
        const email = (profile?.identity as Record<string, { value?: unknown }> | undefined)?.[
          'email'
        ]?.value;
        if (typeof email === 'string') to = email;
      } catch {
        // no profile — the refusal matrix reports the missing recipient
      }
    }

    const from = flags.from ?? process.env['UPRIVER_PITCH_FROM'] ?? DEFAULT_FROM;
    const baseUrl =
      flags['base-url'] ?? process.env['UPRIVER_DASHBOARD_BASE_URL'] ?? 'http://localhost:4400';
    const postalAddress =
      flags.postal ??
      process.env['UPRIVER_OUTREACH_POSTAL'] ??
      (dryRun ? '[postal address — set UPRIVER_OUTREACH_POSTAL before sending]' : '');
    const unsubscribeSecret =
      process.env['UPRIVER_UNSUBSCRIBE_SECRET'] ?? (dryRun ? 'dry-run-secret' : '');

    // Suppression: fail closed. Skipped only in --dry-run (keyless path).
    let suppressed = false;
    if (!dryRun && to) {
      try {
        suppressed = await isEmailSuppressed(to);
      } catch (err) {
        this.error((err as Error).message, { exit: 1 });
      }
    }

    const verdict = prepareApproval({
      state,
      draft,
      to,
      from,
      suppressed,
      unsubscribeSecret,
      dashboardBaseUrl: baseUrl,
      postalAddress,
    });

    if (verdict.kind === 'refused') {
      this.error(`refusing to send: ${verdict.reason}`, { exit: 1 });
    }

    const teasers = (state?.steps['teasers']?.ok && existsSync(join(dir, 'docs')))
      ? '(see clients/' + slug + '/docs/doc-pitch-*.md)'
      : '(no teaser docs found)';
    this.log('\n———— pitch email (exactly what will be sent) ————');
    this.log(`From:    ${verdict.email.from}`);
    this.log(`To:      ${verdict.email.to}`);
    this.log(`Subject: ${verdict.email.subject}`);
    this.log('—');
    this.log(verdict.email.text);
    this.log('—————————————————————————————————————————————————');
    this.log(`Teaser docs: ${teasers}`);
    if (dryRun) {
      this.log('\n[dry-run] nothing sent; suppression list NOT checked.');
      return;
    }

    if (!flags.yes) {
      const rl = createInterface({ input: process.stdin, output: process.stdout });
      try {
        const answer = (await rl.question(`Send to ${verdict.email.to}? [y/N] `)).trim().toLowerCase();
        if (answer !== 'y' && answer !== 'yes') {
          this.log('Not sent.');
          return;
        }
      } finally {
        rl.close();
      }
    }

    const apiKey = process.env['RESEND_API_KEY'];
    if (!apiKey) this.error('RESEND_API_KEY is not set — cannot send.', { exit: 1 });

    const result = await sendViaResend({ ...verdict.email, apiKey });
    this.log(`✓ sent (resend id: ${result.id})`);

    writeFileSync(
      join(dir, 'pitch', 'sent-email.json'),
      `${JSON.stringify({ ...verdict.email, resendId: result.id, sentAt: new Date().toISOString() }, null, 2)}\n`,
    );
    let next = recordStep(state!, 'send', true, `to ${verdict.email.to}`);
    next = transition(next, 'sent');
    next.sentAt = new Date().toISOString();
    writePitchState(dir, next);
  }
}
