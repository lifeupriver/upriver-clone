import type { APIRoute } from 'astro';
import {
  findEmail,
  findMessage,
  findName,
  isHoneypotTripped,
  json,
  parseSubmission,
  successResponse,
  validateLimits,
} from '../../lib/forms';
import { isSupabaseConfigured, supabaseAnon } from '../../lib/supabase-server';

export const prerender = false;

// Public inquiry endpoint — contact / inquiry / RSVP forms POST here (the
// `upriver clone` pass wires source-site forms to this route). Stores via
// the `submit_inquiry` security-definer RPC, which is the only write path
// the anon key has into public.inquiries (see
// supabase/migrations/001_schema.sql).
export const POST: APIRoute = ({ request }) => handleInquiry(request, 'inquiry');

/** Shared by /api/inquiry and /api/donate. */
export async function handleInquiry(request: Request, formLabel: string): Promise<Response> {
  let submission;
  try {
    submission = await parseSubmission(request);
  } catch {
    return json({ ok: false, error: 'Could not parse request body' }, 400);
  }
  const { fields } = submission;

  const limitError = validateLimits(fields);
  if (limitError) return json({ ok: false, error: limitError }, 400);

  // Bots that fill the hidden honeypot get a success-looking response with
  // nothing stored.
  if (isHoneypotTripped(fields)) return successResponse(request, submission);

  const email = findEmail(fields);
  if (!email) {
    return json({ ok: false, error: 'A valid email address is required' }, 400);
  }
  const name = findName(fields) ?? 'Website visitor';
  let message = findMessage(fields);
  if (formLabel !== 'inquiry') message = `[${formLabel} form]\n${message}`;

  if (!isSupabaseConfigured()) {
    console.error(
      `[api/${formLabel}] Supabase is not configured — set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY. Submission NOT stored.`,
    );
    return json(
      { ok: false, error: 'Form backend is not configured (Supabase env vars missing)' },
      503,
    );
  }

  const { data, error } = await supabaseAnon.rpc('submit_inquiry', {
    p_name: name,
    p_email: email,
    p_message: message,
  });
  if (error) {
    console.error(`[api/${formLabel}] submit_inquiry RPC failed: ${error.message}`);
    return json({ ok: false, error: 'Could not store your message — please try again later' }, 502);
  }

  return successResponse(request, submission, { id: data });
}
