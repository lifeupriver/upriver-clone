import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '@/lib/auth';

export const prerender = false;

/**
 * Clear the Supabase session and redirect to /login. Accepts POST (CSRF-safe
 * default for sign-out from forms) and GET (convenient direct link from a
 * dropdown). Either way, the SSR cookie adapter writes empty session cookies.
 */
async function handle(request: Request, cookies: import('astro').AstroCookies): Promise<Response> {
  const supa = createSupabaseServerClient(request, cookies);
  await supa.auth.signOut();
  return new Response(null, {
    status: 302,
    headers: { location: '/login' },
  });
}

export const GET: APIRoute = ({ request, cookies }) => handle(request, cookies);
export const POST: APIRoute = ({ request, cookies }) => handle(request, cookies);
