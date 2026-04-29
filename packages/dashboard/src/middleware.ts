import { defineMiddleware } from 'astro:middleware';

import { DataSourceUnavailableError } from './lib/data-source.js';

/**
 * Catch `DataSourceUnavailableError` from any route and return a clean 503
 * instead of a stack trace. This is the Phase 1 placeholder behavior for
 * filesystem-touching routes when the dashboard is deployed on Vercel
 * before Phase 2 storage abstraction lands.
 */
export const onRequest = defineMiddleware(async (context, next) => {
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
