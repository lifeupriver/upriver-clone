import { defineMiddleware } from 'astro:middleware';

import { getSessionUser, isOperator } from './lib/auth.js';
import { DataSourceUnavailableError, getDataSource } from './lib/data-source.js';

/** Path prefixes that require an `app_metadata.role === 'operator'` session. */
const OPERATOR_PATH_PREFIXES = ['/clients', '/api/enqueue'];

/** Paths bypass auth even in supabase mode (login flow + share-link routes). */
const PUBLIC_PATH_PREFIXES = [
  '/login',
  '/auth/',
  '/deliverables/',
  '/api/inngest', // unused in option (1a) but harmless to keep open; serve handler lives in worker
  '/_image', // Astro asset endpoint
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

  // Auth gate runs only when the dashboard is fronting Supabase storage —
  // i.e. on Vercel. Local dev with UPRIVER_DATA_SOURCE=local keeps the
  // existing token-or-no-auth behavior.
  if (
    getDataSource() === 'supabase' &&
    pathStartsWithAny(pathname, OPERATOR_PATH_PREFIXES) &&
    !pathIs(pathname, PUBLIC_PATH_PREFIXES)
  ) {
    const user = await getSessionUser(context.request, context.cookies);
    if (!isOperator(user)) {
      const isApi = pathname.startsWith('/api/');
      if (isApi) {
        return new Response(JSON.stringify({ error: 'forbidden — operator session required' }), {
          status: 403,
          headers: { 'content-type': 'application/json' },
        });
      }
      const next = encodeURIComponent(pathname + url.search);
      return new Response(null, {
        status: 302,
        headers: { location: `/login?next=${next}` },
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
