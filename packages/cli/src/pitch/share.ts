// Pitch portal share tokens (Spec 19 §5). File-backed at
// `clients/<slug>/pitch/share.json`, following the interview-token pattern
// (in-handler validation through ClientDataSource, identical under
// local/Supabase) extended with EXPIRY and REVOCATION — the two properties
// the guardrails demand for a prospect-facing preview. The plaintext lives
// in the client dir like interview-share.json (gitignored/confidential);
// `pitch revoke` rotates it away.

import { randomBytes } from 'node:crypto';

export const PITCH_SHARE_PATH = 'pitch/share.json';
export const PITCH_SHARE_DEFAULT_DAYS = 14;
export const PITCH_SHARE_MAX_DAYS = 30;

export interface PitchShareInfo {
  v: 1;
  token: string;
  createdAt: string;
  expiresAt: string;
  revoked?: boolean;
}

export function mintPitchShare(opts: { now?: Date; expiresDays?: number } = {}): PitchShareInfo {
  const now = opts.now ?? new Date();
  const days = Math.min(
    Math.max(Math.floor(opts.expiresDays ?? PITCH_SHARE_DEFAULT_DAYS), 1),
    PITCH_SHARE_MAX_DAYS,
  );
  return {
    v: 1,
    token: randomBytes(24).toString('base64url'),
    createdAt: now.toISOString(),
    expiresAt: new Date(now.getTime() + days * 24 * 60 * 60 * 1000).toISOString(),
  };
}

export function buildPitchPortalUrl(baseUrl: string, slug: string, token: string): string {
  return `${baseUrl.replace(/\/$/, '')}/pitch/${slug}?t=${token}`;
}
