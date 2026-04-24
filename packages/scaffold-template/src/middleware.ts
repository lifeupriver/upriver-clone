import { defineMiddleware } from 'astro:middleware';
import { authAdapter } from './lib/auth-adapter';

const ADMIN_PREFIX = '/admin';
const PUBLIC_ADMIN_PATHS = new Set(['/admin/login']);

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;

  if (!pathname.startsWith(ADMIN_PREFIX) || PUBLIC_ADMIN_PATHS.has(pathname)) {
    return next();
  }

  const token = context.cookies.get('upriver_session')?.value;
  if (!token) {
    return context.redirect('/admin/login');
  }

  try {
    const session = await authAdapter.findSessionByToken(token);
    if (!session || new Date(session.expires_at) < new Date()) {
      return context.redirect('/admin/login');
    }
    context.locals.user = session.auth_users ?? null;
    context.locals.session = session;
  } catch {
    return context.redirect('/admin/login');
  }

  return next();
});
