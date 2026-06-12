import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * GitHub webhook signature verification (F05).
 *
 * Pure function — (secret, headers, rawBody) in, verdict out — so the gate
 * contract is unit-testable without an HTTP server, same pattern as
 * `functions/allowed-commands.ts` and `functions/scrub-secrets.ts`.
 *
 * Fail-closed invariants:
 *  - No configured secret  → reject. An unset GITHUB_WEBHOOK_SECRET must never
 *    mean "accept everything".
 *  - Missing / non-string / malformed signature header → reject before any
 *    crypto runs.
 *  - Digest comparison is `timingSafeEqual` with an explicit length check
 *    first (`timingSafeEqual` throws on length mismatch rather than
 *    returning false).
 */

export interface WebhookVerifyResult {
  ok: boolean;
  /** Machine-readable failure reason for server-side logs. Never sent to the caller. */
  reason:
    | 'ok'
    | 'secret-unset'
    | 'missing-header'
    | 'malformed-header'
    | 'signature-mismatch';
}

const SIGNATURE_HEADER = 'x-hub-signature-256';

/** `sha256=` + 64 hex chars — the only shape GitHub ever sends. */
const SIGNATURE_RE = /^sha256=([0-9a-f]{64})$/i;

export function verifyGithubSignature(
  secret: string | undefined,
  headers: Record<string, string | string[] | undefined>,
  rawBody: Buffer | Uint8Array,
): WebhookVerifyResult {
  if (!secret || secret.length === 0) {
    return { ok: false, reason: 'secret-unset' };
  }

  // Express lowercases incoming header names; normalize anyway so the helper
  // is safe with caller-built header maps too.
  const raw =
    headers[SIGNATURE_HEADER] ??
    Object.entries(headers).find(([k]) => k.toLowerCase() === SIGNATURE_HEADER)?.[1];

  if (raw === undefined) return { ok: false, reason: 'missing-header' };
  // Repeated headers arrive as an array — a single signature is the only
  // legitimate shape, so anything else is treated as malformed.
  if (typeof raw !== 'string') return { ok: false, reason: 'malformed-header' };

  const match = SIGNATURE_RE.exec(raw.trim());
  if (!match || !match[1]) return { ok: false, reason: 'malformed-header' };

  const provided = Buffer.from(match[1].toLowerCase(), 'hex');
  const expected = createHmac('sha256', secret).update(rawBody).digest();

  // The regex pins `provided` to 32 bytes, but keep the explicit guard:
  // timingSafeEqual throws (rather than returning false) on length mismatch.
  if (provided.length !== expected.length) {
    return { ok: false, reason: 'signature-mismatch' };
  }
  if (!timingSafeEqual(provided, expected)) {
    return { ok: false, reason: 'signature-mismatch' };
  }
  return { ok: true, reason: 'ok' };
}
