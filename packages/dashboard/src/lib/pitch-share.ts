/**
 * Pitch-portal token validation (Spec 19 §5). Mirrors the interview
 * magic-link pattern — file-backed `clients/<slug>/pitch/share.json` read
 * through the ClientDataSource — extended with expiry and revocation. Fail
 * closed on anything unexpected: a preview we cannot positively authorize
 * is a preview we do not serve.
 */
import { resolveClientDataSource } from './data-source.js';

export type PitchTokenVerdict = 'ok' | 'expired' | 'invalid';

interface PitchShareInfo {
  token?: unknown;
  expiresAt?: unknown;
  revoked?: unknown;
}

export async function validatePitchToken(
  slug: string,
  token: string | null | undefined,
  now: Date = new Date(),
): Promise<PitchTokenVerdict> {
  if (!token || token.length < 16 || token.length > 256) return 'invalid';
  const ds = resolveClientDataSource();
  const raw = await ds.readClientFileText(slug, 'pitch/share.json');
  if (!raw) return 'invalid';
  let share: PitchShareInfo;
  try {
    share = JSON.parse(raw) as PitchShareInfo;
  } catch {
    return 'invalid';
  }
  if (share.revoked === true) return 'invalid';
  if (typeof share.token !== 'string' || share.token.length !== token.length) return 'invalid';
  let diff = 0;
  for (let i = 0; i < token.length; i++) diff |= share.token.charCodeAt(i) ^ token.charCodeAt(i);
  if (diff !== 0) return 'invalid';
  if (typeof share.expiresAt !== 'string' || Number.isNaN(Date.parse(share.expiresAt))) {
    return 'invalid';
  }
  if (Date.parse(share.expiresAt) <= now.getTime()) return 'expired';
  return 'ok';
}

export const PITCH_ROBOTS_HEADER = 'noindex, nofollow';

/** Inject `<meta name="robots">` into a staged preview's head (belt to the X-Robots-Tag braces). */
export function injectNoindexMeta(html: string): string {
  const meta = '<meta name="robots" content="noindex, nofollow">';
  if (html.includes('noindex')) return html;
  const headIdx = html.search(/<head[^>]*>/i);
  if (headIdx >= 0) {
    const insertAt = html.indexOf('>', headIdx) + 1;
    return `${html.slice(0, insertAt)}\n${meta}${html.slice(insertAt)}`;
  }
  return `${meta}\n${html}`;
}
