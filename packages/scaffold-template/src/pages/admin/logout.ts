import type { APIRoute } from 'astro';
import { authAdapter } from '../../lib/auth-adapter';

export const prerender = false;

export const POST: APIRoute = async ({ cookies, redirect }) => {
  const token = cookies.get('upriver_session')?.value;
  if (token) {
    try {
      await authAdapter.deleteSession(token);
    } catch {
      // swallow — cookie is cleared regardless
    }
    cookies.delete('upriver_session', { path: '/' });
  }
  return redirect('/admin/login');
};
