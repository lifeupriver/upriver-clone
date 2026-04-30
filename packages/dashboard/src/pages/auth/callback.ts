import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@/lib/auth';

export const prerender = false;

/**
 * Magic-link landing. Supabase redirects here with `?code=...` after the user
 * clicks the email link. Exchanging the code populates the session cookies
 * via the SSR cookie adapter, after which we forward to the original
 * destination (`?next=/path`) or `/clients`.
 */
export const GET: APIRoute = async ({ request, cookies, redirect }) => {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const next = url.searchParams.get('next') ?? '/clients';

  if (!code) {
    return new Response('missing ?code', { status: 400 });
  }

  const supa = createSupabaseServerClient(request, cookies);
  const { error } = await supa.auth.exchangeCodeForSession(code);
  if (error) {
    return new Response(`auth callback failed: ${error.message}`, { status: 400 });
  }

  return redirect(next);
};
