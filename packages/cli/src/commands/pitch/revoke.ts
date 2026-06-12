import { Args } from '@oclif/core';
import { randomBytes } from 'node:crypto';

import { BaseCommand } from '../../base-command.js';
import { resolveClientDataSourceOrFail } from '../../generate/data-source.js';
import { PITCH_SHARE_PATH, type PitchShareInfo } from '../../pitch/share.js';
import { clientDir } from '@upriver/core';
import { readPitchState, transition, writePitchState } from '../../pitch/state.js';

export default class PitchRevoke extends BaseCommand {
  static override description =
    'Take a pitch down: invalidate the preview share token and the questionnaire link immediately (the takedown-on-request guardrail, in one command).';

  static override examples = ['<%= config.bin %> pitch revoke wildflourbakery'];

  static override args = {
    slug: Args.string({ description: 'Prospect slug', required: true }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(PitchRevoke);
    const { slug } = args;
    const ds = resolveClientDataSourceOrFail((m) => this.error(m));

    // 1. Preview token: mark revoked (the portal fails closed on the flag).
    const shareRaw = await ds.readClientFileText(slug, PITCH_SHARE_PATH);
    if (shareRaw !== null) {
      let share: PitchShareInfo | null = null;
      try {
        share = JSON.parse(shareRaw) as PitchShareInfo;
      } catch {
        share = null;
      }
      const revoked: PitchShareInfo = {
        v: 1,
        token: share?.token ?? 'revoked',
        createdAt: share?.createdAt ?? new Date().toISOString(),
        expiresAt: new Date().toISOString(),
        revoked: true,
      };
      await ds.writeClientFile(slug, PITCH_SHARE_PATH, `${JSON.stringify(revoked, null, 2)}\n`);
      this.log('✓ preview share token revoked');
    } else {
      this.log('no preview share token existed');
    }

    // 2. Questionnaire magic link: rotate the token to a value nobody holds.
    const interviewRaw = await ds.readClientFileText(slug, 'interview-share.json');
    if (interviewRaw !== null) {
      await ds.writeClientFile(
        slug,
        'interview-share.json',
        `${JSON.stringify({ token: randomBytes(24).toString('base64url'), createdAt: new Date().toISOString(), rotatedBy: 'pitch revoke' }, null, 2)}\n`,
      );
      this.log('✓ questionnaire link rotated (old link is dead)');
    }

    // 3. State (best effort — revoke must work even on a half-finished run).
    try {
      const dir = clientDir(slug);
      const state = readPitchState(dir);
      if (state.status !== 'revoked') {
        writePitchState(dir, transition(state, 'revoked'));
      }
      this.log('✓ pitch state → revoked');
    } catch {
      this.warn('no pitch state to update (share tokens are revoked regardless)');
    }
  }
}
