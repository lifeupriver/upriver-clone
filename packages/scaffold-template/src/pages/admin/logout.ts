import type { APIRoute } from 'astro';
import { createSupabaseServerClient } from '../../lib/supabase-server';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies, redirect }) => {
  try {
    const supabase = createSupabaseServerClient(request, cookies);
    // Revokes the refresh token and clears the sb-* auth cookies through
    // the @supabase/ssr cookie adapter.
    await supabase.auth.signOut();
  } catch {
    // swallow — the user lands on the login page regardless
  }
  return redirect('/admin/login');
};
