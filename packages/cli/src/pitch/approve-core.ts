// The approve gate's decision logic (Spec 19 §8), pure so the refusal matrix
// is unit-tested away from oclif/Resend. `pitch approve` gathers the inputs
// (state, draft, suppression lookup, env) and acts on the verdict; only the
// command sends.

import { mintUnsubscribeToken } from '@upriver/core';
import { isEmailAddress } from '../report-helpers/resend.js';
import { finalizeEmailText, type PitchEmailDraft } from './email.js';
import type { PitchState } from './state.js';

export interface ApprovalOpts {
  state: PitchState | null;
  draft: PitchEmailDraft | null;
  to: string;
  from: string;
  suppressed: boolean;
  unsubscribeSecret: string;
  dashboardBaseUrl: string;
  postalAddress: string;
  now?: string;
}

export type ApprovalVerdict =
  | { kind: 'refused'; reason: string }
  | { kind: 'ok'; email: { to: string; from: string; subject: string; text: string } };

export function prepareApproval(opts: ApprovalOpts): ApprovalVerdict {
  const refuse = (reason: string): ApprovalVerdict => ({ kind: 'refused', reason });

  if (!opts.state) return refuse('no pitch state — run `upriver pitch run <url>` first');
  if (opts.state.status !== 'draft' && opts.state.status !== 'approved') {
    return refuse(
      `pitch is in state "${opts.state.status}" — only draft/approved pitches can be sent`,
    );
  }
  const expiresAt = opts.state.share?.expiresAt;
  const now = opts.now ?? new Date().toISOString();
  if (expiresAt && expiresAt <= now) {
    return refuse(
      `the preview share token expired at ${expiresAt} — re-run pitch run to mint a fresh bundle`,
    );
  }
  if (!opts.draft) return refuse('no email draft (pitch/email-draft.json) — run pitch run first');
  if (!opts.to) return refuse('no recipient — pass --to or seed identity.email in the profile');
  if (!isEmailAddress(opts.to)) return refuse(`"${opts.to}" is not a valid email address`);
  if (opts.suppressed) {
    return refuse(`${opts.to} is on the suppression list (they unsubscribed) — do not contact`);
  }
  if (!opts.unsubscribeSecret) {
    return refuse('UPRIVER_UNSUBSCRIBE_SECRET is not set — cannot build a working unsubscribe link');
  }
  if (!opts.postalAddress) {
    return refuse(
      'no postal address for the CAN-SPAM footer — set UPRIVER_OUTREACH_POSTAL or pass --postal',
    );
  }

  const token = mintUnsubscribeToken(opts.state.slug, opts.to, opts.unsubscribeSecret);
  const unsubscribeUrl = `${opts.dashboardBaseUrl.replace(/\/$/, '')}/api/unsubscribe?token=${token}`;
  const text = finalizeEmailText(opts.draft.text, {
    unsubscribeUrl,
    postalAddress: opts.postalAddress,
  });
  return {
    kind: 'ok',
    email: { to: opts.to, from: opts.from, subject: opts.draft.subject, text },
  };
}
