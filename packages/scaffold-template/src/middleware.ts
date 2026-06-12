import { defineMiddleware } from 'astro:middleware';
import { getSessionUser } from './lib/supabase-server';

const ADMIN_PREFIX = '/admin';
const PUBLIC_ADMIN_PATHS = new Set(['/admin/login']);

// Non-admin paths that still need `locals.user` resolved — their handlers
// enforce auth themselves (change-request 401s without a user).
const USER_RESOLVED_PATHS = new Set(['/api/change-request']);

export const onRequest = defineMiddleware(async (context, next) => {
  const { pathname } = context.url;
  context.locals.user = null;

  const isGatedAdminPath = pathname.startsWith(ADMIN_PREFIX) && !PUBLIC_ADMIN_PATHS.has(pathname);
  if (!isGatedAdminPath && !USER_RESOLVED_PATHS.has(pathname)) {
    return next();
  }

  // Supabase Auth session (set by /admin/login via @supabase/ssr cookies).
  // Returns null when Supabase isn't configured or the token is invalid.
  context.locals.user = await getSessionUser(context.request, context.cookies);

  if (isGatedAdminPath && !context.locals.user) {
    return context.redirect('/admin/login');
  }

  return next();
});
