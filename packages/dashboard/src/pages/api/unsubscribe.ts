// One-click unsubscribe for pitch outreach (Spec 19 §8). CAN-SPAM posture:
// no login, no confirmation step beyond the click, works from the email
// footer link. The token is HMAC-verified (shared secret with the CLI's
// `pitch approve`), then the address goes onto `outreach_suppression` via
// the service-role client. Idempotent: unsubscribing twice is a 200.

import type { APIRoute } from 'astro';
import { createClient } from '@supabase/supabase-js';
import { verifyUnsubscribeToken } from '@upriver/core';

export const prerender = false;

function page(status: number, title: string, body: string): Response {
  return new Response(
    `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>${title}</title></head>` +
      `<body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem;"><h1 style="font-size:1.25rem">${title}</h1><p>${body}</p></body></html>`,
    {
      status,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'x-robots-tag': 'noindex, nofollow',
        'cache-control': 'no-store',
      },
    },
  );
}

export const GET: APIRoute = async ({ url }) => {
  const token = url.searchParams.get('token') ?? '';
  const secret = process.env['UPRIVER_UNSUBSCRIBE_SECRET'] ?? '';
  const verified = secret ? verifyUnsubscribeToken(token, secret) : null;
  if (!verified) {
    return page(
      400,
      'Link not valid',
      'This unsubscribe link is invalid or has been altered. Reply to the original email and we will remove you manually.',
    );
  }

  const sbUrl = process.env['UPRIVER_SUPABASE_URL'];
  const serviceKey =
    process.env['UPRIVER_SUPABASE_SERVICE_KEY'] ??
    process.env['UPRIVER_SUPABASE_SERVICE_ROLE_KEY'];
  if (!sbUrl || !serviceKey) {
    return page(
      503,
      'Temporarily unavailable',
      'We could not record your request right now. Reply to the original email and we will remove you manually.',
    );
  }

  const sb = createClient(sbUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { error } = await sb.from('outreach_suppression').insert({
    email: verified.email.toLowerCase(),
    slug: verified.slug,
  });
  // 23505 = unique violation: already suppressed — that's a success.
  if (error && error.code !== '23505') {
    return page(
      503,
      'Temporarily unavailable',
      'We could not record your request right now. Reply to the original email and we will remove you manually.',
    );
  }

  return page(
    200,
    "You're unsubscribed",
    'You will not receive further outreach from us at this address.',
  );
};
