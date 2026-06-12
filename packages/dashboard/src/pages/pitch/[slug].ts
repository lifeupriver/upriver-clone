// Prospect-facing pitch preview (Spec 19 §5): serves the staged static
// homepage rebuild from `clients/<slug>/pitch/preview/index.html`, gated by
// the file-backed pitch share token (`?t=`). Every response — including the
// failures — carries noindex headers: this is a rebuild of the PROSPECT'S
// OWN content and must never be indexed or published as ours.

import type { APIRoute } from 'astro';
import { resolveClientDataSource } from '../../lib/data-source.js';
import {
  injectNoindexMeta,
  PITCH_ROBOTS_HEADER,
  validatePitchToken,
} from '../../lib/pitch-share.js';
import { escapeHtml, markdownToHtml } from '../../lib/markdown.js';

export const prerender = false;

const BASE_HEADERS: Record<string, string> = {
  'x-robots-tag': PITCH_ROBOTS_HEADER,
  'cache-control': 'no-store',
};

function htmlResponse(status: number, html: string): Response {
  return new Response(html, {
    status,
    headers: { ...BASE_HEADERS, 'content-type': 'text/html; charset=utf-8' },
  });
}

function messagePage(title: string, body: string): string {
  return (
    `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><title>${escapeHtml(title)}</title></head>` +
    `<body style="font-family: system-ui, sans-serif; max-width: 32rem; margin: 4rem auto; padding: 0 1rem;"><h1 style="font-size:1.25rem">${escapeHtml(title)}</h1><p>${escapeHtml(body)}</p></body></html>`
  );
}

export async function handlePitchPreview(
  slug: string | undefined,
  token: string | null,
): Promise<Response> {
  if (!slug) return htmlResponse(404, messagePage('Not found', 'Unknown preview.'));
  const verdict = await validatePitchToken(slug, token);
  if (verdict === 'expired') {
    return htmlResponse(
      410,
      messagePage('Preview expired', 'This preview link has expired. Reply to our email and we will mint a fresh one.'),
    );
  }
  if (verdict !== 'ok') {
    return htmlResponse(404, messagePage('Not found', 'This preview link is not valid.'));
  }

  const ds = resolveClientDataSource();
  const html = await ds.readClientFileText(slug, 'pitch/preview/index.html');
  if (html === null) {
    return htmlResponse(404, messagePage('Not ready', 'This preview is not staged yet.'));
  }
  return htmlResponse(200, injectNoindexMeta(html));
}

/**
 * Teaser doc view: `?doc=doc-pitch-01` renders the matching generated
 * markdown under the same token gate.
 */
export async function handlePitchTeaser(
  slug: string | undefined,
  token: string | null,
  docId: string,
): Promise<Response> {
  if (!slug) return htmlResponse(404, messagePage('Not found', 'Unknown preview.'));
  if (!/^doc-pitch-0[1-4]$/.test(docId)) {
    return htmlResponse(404, messagePage('Not found', 'Unknown teaser.'));
  }
  const verdict = await validatePitchToken(slug, token);
  if (verdict === 'expired') {
    return htmlResponse(410, messagePage('Preview expired', 'This link has expired.'));
  }
  if (verdict !== 'ok') {
    return htmlResponse(404, messagePage('Not found', 'This link is not valid.'));
  }

  const ds = resolveClientDataSource();
  const files = await ds.listClientFiles(slug, 'docs');
  const file = files.find((f: string) => f.startsWith(`${docId}-`) && f.endsWith('.md'));
  const md = file ? await ds.readClientFileText(slug, `docs/${file}`) : null;
  if (md === null) {
    return htmlResponse(404, messagePage('Not ready', 'This teaser is not generated yet.'));
  }
  const body =
    `<!doctype html><html><head><meta charset="utf-8"><meta name="robots" content="noindex, nofollow"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Upriver — preview notes</title></head>` +
    `<body style="font-family: system-ui, sans-serif; max-width: 42rem; margin: 3rem auto; padding: 0 1rem; line-height: 1.6;">${markdownToHtml(md)}</body></html>`;
  return htmlResponse(200, body);
}

export const GET: APIRoute = async ({ params, url }) => {
  const token = url.searchParams.get('t');
  const doc = url.searchParams.get('doc');
  if (doc) return handlePitchTeaser(params['slug'], token, doc);
  return handlePitchPreview(params['slug'], token);
};
