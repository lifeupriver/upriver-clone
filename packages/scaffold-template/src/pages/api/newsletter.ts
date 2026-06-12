import type { APIRoute } from 'astro';
import {
  findEmail,
  findName,
  isHoneypotTripped,
  json,
  parseSubmission,
  successResponse,
  validateLimits,
} from '../../lib/forms';
import { isSupabaseConfigured, supabaseAnon } from '../../lib/supabase-server';

export const prerender = false;

// Public newsletter signup endpoint — subscribe forms POST here (the
// `upriver clone` pass wires source-site newsletter forms to this route).
// Stores via the `subscribe_newsletter` security-definer RPC, the only
// write path the anon key has into public.newsletter_signups (see
// supabase/migrations/001_schema.sql).
export const POST: APIRoute = async ({ request }) => {
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
  const name = findName(fields);

  if (!isSupabaseConfigured()) {
    console.error(
      '[api/newsletter] Supabase is not configured — set PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY. Signup NOT stored.',
    );
    return json(
      { ok: false, error: 'Form backend is not configured (Supabase env vars missing)' },
      503,
    );
  }

  const { data, error } = await supabaseAnon.rpc('subscribe_newsletter', {
    p_email: email,
    p_name: name,
  });
  if (error) {
    console.error(`[api/newsletter] subscribe_newsletter RPC failed: ${error.message}`);
    return json({ ok: false, error: 'Could not sign you up — please try again later' }, 502);
  }

  return successResponse(request, submission, { id: data });
};
