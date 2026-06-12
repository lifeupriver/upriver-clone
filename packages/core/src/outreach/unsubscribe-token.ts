// One-click unsubscribe tokens (Spec 19 §8). HMAC-signed, storage-free: the
// token carries `slug` + `email` opaquely (base64url JSON + HMAC-SHA256), so
// the pitch email footer can be built anywhere the shared secret exists and
// the dashboard endpoint can verify without a lookup. Nothing about the
// prospect is readable from the token without the secret... except by
// decoding — the payload is encoded, not encrypted — so the token is still
// treated as a secret-bearing URL: sent only to the prospect themselves.
//
// Secret: UPRIVER_UNSUBSCRIBE_SECRET (CLI approve + dashboard must share it).

import { createHmac, timingSafeEqual } from 'node:crypto';

const SIG_BYTES = 16; // truncated hex chars below = SIG_BYTES * 2

function sign(payload: string, secret: string): string {
  return createHmac('sha256', secret).update(payload, 'utf8').digest('hex').slice(0, SIG_BYTES * 2);
}

export function mintUnsubscribeToken(slug: string, email: string, secret: string): string {
  if (!secret) throw new Error('unsubscribe token: empty secret');
  const payload = Buffer.from(JSON.stringify({ s: slug, e: email }), 'utf8').toString('base64url');
  return `${payload}.${sign(payload, secret)}`;
}

export function verifyUnsubscribeToken(
  token: string,
  secret: string,
): { slug: string; email: string } | null {
  if (!secret || !token || token.length > 2048) return null;
  const dot = token.lastIndexOf('.');
  if (dot <= 0) return null;
  const payload = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  const expected = sign(payload, secret);
  if (sig.length !== expected.length) return null;
  try {
    if (!timingSafeEqual(Buffer.from(sig, 'utf8'), Buffer.from(expected, 'utf8'))) return null;
    const parsed = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8')) as {
      s?: unknown;
      e?: unknown;
    };
    if (typeof parsed.s !== 'string' || typeof parsed.e !== 'string') return null;
    return { slug: parsed.s, email: parsed.e };
  } catch {
    return null;
  }
}
