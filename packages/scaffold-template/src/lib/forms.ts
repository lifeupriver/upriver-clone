// Shared plumbing for the public form endpoints (/api/inquiry,
// /api/newsletter, /api/donate). Server-only.
//
// Behavior contract (the `upriver clone` prompt wires source-site forms to
// these endpoints, so keep it stable):
// - Accepts application/x-www-form-urlencoded, multipart/form-data, and
//   application/json bodies.
// - Honeypot: a filled hidden `website` or `_hp` field gets a
//   success-looking response with nothing stored (bots learn nothing).
// - Plain form POSTs are answered with a 303 redirect back to the referring
//   page (or a hidden `_redirect` path) with `?submitted=1` appended; JSON
//   callers get JSON.
// - When Supabase isn't configured the endpoints fail honestly with a 503
//   so QA catches the misconfiguration — they never pretend success.

export const MAX_FIELDS = 50;
export const MAX_FIELD_LENGTH = 5000;
export const MAX_EMAIL_LENGTH = 254;

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HONEYPOT_FIELDS = ['website', '_hp'];
// Internal/control fields that should never end up in a stored message.
const INTERNAL_FIELDS = new Set(['_redirect', ...HONEYPOT_FIELDS]);

export interface ParsedSubmission {
  fields: Record<string, string>;
  /** True when the caller sent JSON (and should be answered with JSON). */
  isJson: boolean;
}

export async function parseSubmission(request: Request): Promise<ParsedSubmission> {
  const contentType = request.headers.get('content-type') ?? '';
  const fields: Record<string, string> = {};

  if (contentType.includes('application/json')) {
    const body = (await request.json()) as Record<string, unknown>;
    for (const [key, value] of Object.entries(body)) {
      if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
        fields[key] = String(value);
      }
    }
    return { fields, isJson: true };
  }

  // request.formData() handles both urlencoded and multipart bodies.
  const form = await request.formData();
  for (const [key, value] of form.entries()) {
    if (typeof value === 'string') fields[key] = value;
  }
  return { fields, isJson: false };
}

/** Returns an error message when the submission exceeds basic size limits. */
export function validateLimits(fields: Record<string, string>): string | null {
  const keys = Object.keys(fields);
  if (keys.length === 0) return 'Empty submission';
  if (keys.length > MAX_FIELDS) return `Too many fields (max ${MAX_FIELDS})`;
  for (const key of keys) {
    if ((fields[key] ?? '').length > MAX_FIELD_LENGTH) {
      return `Field "${key}" is too long (max ${MAX_FIELD_LENGTH} characters)`;
    }
  }
  return null;
}

export function isHoneypotTripped(fields: Record<string, string>): boolean {
  return HONEYPOT_FIELDS.some((name) => (fields[name] ?? '').trim().length > 0);
}

export function isValidEmail(value: string): boolean {
  return value.length <= MAX_EMAIL_LENGTH && EMAIL_RE.test(value);
}

/**
 * Case-insensitive field lookup, tolerant of `-`/`_`/space differences —
 * cloned forms preserve the source site's field names (`First-Name`,
 * `your_email`, …).
 */
export function getField(fields: Record<string, string>, ...names: string[]): string | null {
  const normalized = new Map<string, string>();
  for (const [key, value] of Object.entries(fields)) {
    normalized.set(normalizeKey(key), value);
  }
  for (const name of names) {
    const hit = normalized.get(normalizeKey(name));
    if (hit !== undefined && hit.trim().length > 0) return hit.trim();
  }
  return null;
}

/** First field whose name contains "email" and whose value looks like one. */
export function findEmail(fields: Record<string, string>): string | null {
  const direct = getField(fields, 'email');
  if (direct && isValidEmail(direct)) return direct;
  for (const [key, value] of Object.entries(fields)) {
    if (/email/i.test(key) && isValidEmail(value.trim())) return value.trim();
  }
  return null;
}

export function findName(fields: Record<string, string>): string | null {
  const single = getField(fields, 'name', 'full_name', 'fullname', 'your_name');
  if (single) return single;
  const first = getField(fields, 'first_name', 'firstname', 'fname');
  const last = getField(fields, 'last_name', 'lastname', 'lname');
  const joined = [first, last].filter(Boolean).join(' ').trim();
  return joined.length > 0 ? joined : null;
}

/**
 * Best-effort message extraction. Falls back to serializing the remaining
 * fields (`key: value` lines) so RSVP-style forms without a message body
 * still arrive intact in /admin/inquiries.
 */
export function findMessage(fields: Record<string, string>): string {
  const direct = getField(
    fields,
    'message',
    'comments',
    'comment',
    'inquiry',
    'question',
    'details',
    'body',
    'notes',
  );
  if (direct) return direct;

  const lines: string[] = [];
  for (const [key, value] of Object.entries(fields)) {
    if (INTERNAL_FIELDS.has(key)) continue;
    if (/email/i.test(key)) continue;
    if (value.trim().length === 0) continue;
    lines.push(`${key}: ${value.trim()}`);
  }
  return lines.length > 0 ? lines.join('\n') : '(no message provided)';
}

export function json(payload: unknown, status = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

/**
 * Success response: JSON for JSON callers; 303 redirect back to the
 * referring page with `?submitted=1` for plain form POSTs. A hidden
 * `_redirect` field overrides the destination (same-origin paths only —
 * no open redirect). Falls back to JSON when neither is usable.
 */
export function successResponse(
  request: Request,
  submission: ParsedSubmission,
  payload: Record<string, unknown> = {},
): Response {
  if (submission.isJson) return json({ ok: true, ...payload });
  const target = redirectTarget(request, submission.fields);
  if (!target) return json({ ok: true, ...payload });

  const dest = new URL(target, request.url);
  dest.searchParams.set('submitted', '1');
  return new Response(null, {
    status: 303,
    headers: { location: dest.pathname + dest.search },
  });
}

function redirectTarget(request: Request, fields: Record<string, string>): string | null {
  const requested = (fields['_redirect'] ?? '').trim();
  // Root-relative paths only — `//evil.com` would be an open redirect.
  if (requested.startsWith('/') && !requested.startsWith('//')) return requested;

  const referer = request.headers.get('referer');
  if (referer) {
    try {
      const ref = new URL(referer);
      if (ref.origin === new URL(request.url).origin) return ref.pathname + ref.search;
    } catch {
      /* unparseable referer — fall through */
    }
  }
  return null;
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]+/g, '');
}
