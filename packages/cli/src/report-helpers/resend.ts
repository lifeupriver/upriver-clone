/**
 * Shared Resend sender for every CLI command that emails an artifact
 * (`report send`, `monitor`, `followup`).
 *
 * POSTs to the Resend API with native `fetch` — the API surface is small
 * enough that the `resend` npm package isn't worth the dependency.
 *
 * Resend requires the `from` address to be on a domain you've verified in
 * the Resend dashboard. If `from` is unverified Resend returns a 403 with a
 * clear message — callers surface that as a warning rather than aborting.
 */

/** Default sender; override with --from / UPRIVER_REPORT_FROM. */
export const DEFAULT_FROM = 'reports@upriverhudsonvalley.com';

const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

/** Cheap shape check for recipient flags — not full RFC 5322. */
export function isEmailAddress(value: string): boolean {
  return EMAIL_RE.test(value);
}

export interface ResendEmail {
  from: string;
  to: string;
  subject: string;
  /** Plain-text body. Always required — every email must degrade to text. */
  text: string;
  /** Optional HTML alternative (e.g. monitor's rendered report). */
  html?: string;
}

/**
 * The exact JSON body POSTed to Resend. Exported separately so the contract
 * (single recipient wrapped in an array, html only when present) is
 * unit-testable without a network.
 */
export function buildResendPayload(email: ResendEmail): Record<string, unknown> {
  return {
    from: email.from,
    to: [email.to],
    subject: email.subject,
    text: email.text,
    ...(email.html ? { html: email.html } : {}),
  };
}

/**
 * POST to the Resend API. Throws with the upstream error message on non-2xx
 * or a malformed response. `fetchImpl` is a test seam.
 */
export async function sendViaResend(
  args: ResendEmail & { apiKey: string; fetchImpl?: typeof fetch },
): Promise<{ id: string }> {
  const doFetch = args.fetchImpl ?? fetch;
  const res = await doFetch('https://api.resend.com/emails', {
    method: 'POST',
    signal: AbortSignal.timeout(30_000),
    headers: {
      authorization: `Bearer ${args.apiKey}`,
      'content-type': 'application/json',
    },
    body: JSON.stringify(buildResendPayload(args)),
  });
  if (!res.ok) {
    const errBody = await res.text().catch(() => '');
    throw new Error(`Resend ${res.status}: ${errBody.slice(0, 240) || res.statusText}`);
  }
  const json = (await res.json()) as { id?: string };
  if (!json.id) throw new Error('Resend response missing `id`');
  return { id: json.id };
}

export type SendEmailOutcome =
  | { status: 'sent'; id: string }
  | { status: 'skipped'; reason: string }
  | { status: 'failed'; error: string };

/**
 * Send when `RESEND_API_KEY` is configured; otherwise report `skipped` so the
 * caller can fall back to its print-for-manual-forwarding behavior. Delivery
 * failures are returned (not thrown) — an email hiccup must never fail a
 * pipeline stage whose artifacts are already on disk.
 */
export async function sendEmailIfConfigured(
  args: ResendEmail & { apiKey?: string; fetchImpl?: typeof fetch },
): Promise<SendEmailOutcome> {
  const apiKey = args.apiKey ?? process.env['RESEND_API_KEY'];
  if (!apiKey) return { status: 'skipped', reason: 'RESEND_API_KEY not set' };
  try {
    const { id } = await sendViaResend({ ...args, apiKey });
    return { status: 'sent', id };
  } catch (err) {
    return { status: 'failed', error: err instanceof Error ? err.message : String(err) };
  }
}
