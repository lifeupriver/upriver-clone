import { defineMiddleware } from 'astro:middleware';

import { createSupabaseServerClient, getSessionUser, isOperator } from './lib/auth.js';
import { DataSourceUnavailableError, getDataSource } from './lib/data-source.js';
import { validateShareToken } from './lib/share-token.js';

/** Path prefixes that require an `app_metadata.role === 'operator'` session. */
const OPERATOR_PATH_PREFIXES = ['/clients', '/api/enqueue', '/api/share-tokens', '/deliverables'];

/** Paths bypass auth even in supabase mode (login flow). */
const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/auth/',
  '/api/inngest', // unused in option (1a) but harmless to keep open; serve handler lives in worker
  '/_image', // Astro asset endpoint
  '/deliverables/expired', // branded share-link-expired page; client-facing, no auth
];

function pathIs(pathname: string, prefixes: readonly string[]): boolean {
  for (const p of prefixes) {
    if (pathname === p || pathname.startsWith(`${p}/`) || pathname.startsWith(p)) {
      return true;
    }
  }
  return false;
}

function pathStartsWithAny(pathname: string, prefixes: readonly string[]): boolean {
  return prefixes.some((p) => pathname.startsWith(p));
}

/**
 * Catch `DataSourceUnavailableError` from any route and return a clean 503
 * instead of a stack trace. This is the Phase 1 placeholder behavior for
 * filesystem-touching routes when the dashboard is deployed on Vercel
 * before Phase 2 storage abstraction lands.
 *
 * Phase 4 layers an auth gate *before* the error catch: in supabase data
 * source mode, operator-only paths (/clients, /api/enqueue) require a
 * Supabase Auth session whose `app_metadata.role === 'operator'`. Local
 * data source mode (operator's laptop) bypasses the gate so dev workflows
 * keep working.
 */
export const onRequest = defineMiddleware(async (context, next) => {
  const url = new URL(context.request.url);
  const pathname = url.pathname;

  // Catch-all for Supabase Auth's PKCE callback. The OTP flow's redirect_to
  // is supposed to be /auth/callback, but if the Redirect URL allowlist
  // misses it Supabase silently falls back to the Site URL — leaving the
  // user on / (or wherever) with `?code=…` in the URL. Exchange the code
  // wherever it shows up, then redirect to the same path with the param
  // stripped so the user lands cleanly.
  if (getDataSource() === 'supabase' && url.searchParams.has('code')) {
    const code = url.searchParams.get('code');
    if (code) {
      const supa = createSupabaseServerClient(context.request, context.cookies);
      const { error } = await supa.auth.exchangeCodeForSession(code);
      if (!error) {
        const dest = new URL(url);
        dest.searchParams.delete('code');
        // Strip other PKCE-flow params Supabase sometimes appends.
        dest.searchParams.delete('error');
        dest.searchParams.delete('error_description');
        // /auth/callback exists only to receive the code; once exchanged,
        // the path itself has nothing to render. Forward to ?next or
        // /clients so the user lands somewhere useful.
        let location = dest.pathname + dest.search + dest.hash;
        if (dest.pathname === '/auth/callback') {
          const nextParam = dest.searchParams.get('next');
          location = nextParam && nextParam.startsWith('/') ? nextParam : '/clients';
        }
        return new Response(null, {
          status: 302,
          headers: { location },
        });
      }
      // Code exchange failed (expired or already-used). Send to a branded
      // error page rather than letting the page-route render a 400.
      return new Response(null, {
        status: 302,
        headers: { location: '/auth/expired' },
      });
    }
  }

  // Auth gate runs only when the dashboard is fronting Supabase storage —
  // i.e. on Vercel. Local dev with UPRIVER_DATA_SOURCE=local keeps the
  // existing token-or-no-auth behavior.
  if (
    getDataSource() === 'supabase' &&
    pathStartsWithAny(pathname, OPERATOR_PATH_PREFIXES) &&
    !pathIs(pathname, PUBLIC_PATH_PREFIXES)
  ) {
    const user = await getSessionUser(context.request, context.cookies);
    const operator = isOperator(user);

    // /deliverables/<slug>/* has an additional public path: a valid share
    // token (`?t=<token>`) lets anonymous users in. The slug is the segment
    // immediately after `/deliverables/`. The bare `/deliverables` index
    // remains operator-only (it lists every slug — not for share-link
    // recipients).
    if (!operator && pathname.startsWith('/deliverables/')) {
      const segments = pathname.slice('/deliverables/'.length).split('/').filter(Boolean);
      const slug = segments[0];
      const token = url.searchParams.get('t');
      if (slug && token && (await validateShareToken(slug, token))) {
        // Token is valid for this slug — let the request through.
        return next();
      }
      // Token was supplied but didn't validate — show the client a branded
      // expired-link page rather than punting them to the operator login.
      if (slug && token) {
        return new Response(null, {
          status: 302,
          headers: { location: '/deliverables/expired' },
        });
      }
    }

    if (!operator) {
      const isApi = pathname.startsWith('/api/');
      if (isApi) {
        return new Response(JSON.stringify({ error: 'forbidden — operator session required' }), {
          status: 403,
          headers: { 'content-type': 'application/json' },
        });
      }
      const nextParam = encodeURIComponent(pathname + url.search);
      return new Response(null, {
        status: 302,
        headers: { location: `/login?next=${nextParam}` },
      });
    }
  }

  try {
    return await next();
  } catch (err) {
    if (err instanceof DataSourceUnavailableError) {
      const accept = context.request.headers.get('accept') ?? '';
      const wantsJson = accept.includes('application/json');
      const body = wantsJson
        ? JSON.stringify({ error: err.code, message: err.message })
        : placeholderHtml(err.message);
      return new Response(body, {
        status: 503,
        headers: {
          'content-type': wantsJson ? 'application/json' : 'text/html; charset=utf-8',
          'cache-control': 'no-store',
          'x-upriver-data-source': err.source,
        },
      });
    }
    throw err;
  }
});

function placeholderHtml(message: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Upriver — storage not yet wired</title>
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <style>
      body { font: 16px/1.5 system-ui, sans-serif; max-width: 42rem; margin: 4rem auto; padding: 0 1rem; color: #1f2937; }
      h1 { font-size: 1.5rem; margin-bottom: 1rem; }
      code { background: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 0.25rem; }
      .muted { color: #6b7280; font-size: 0.875rem; margin-top: 2rem; }
    </style>
  </head>
  <body>
    <h1>Storage backend not yet available</h1>
    <p>${escapeHtml(message)}</p>
    <p class="muted">503 — Phase 1 deploy. Filesystem-backed routes are unavailable on hosted environments until Phase 2 ships the Supabase data source.</p>
  </body>
</html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
