/**
 * Static preview server for cloned Astro builds.
 *
 * Serves files from `clients/<slug>/repo/dist/client/` under
 * `/preview/<slug>/<path>`. HTML responses are rewritten on the fly so
 * root-relative asset URLs (`/_astro/foo.js`, `/images/bar.png`) resolve
 * inside the prefixed iframe instead of hitting the dashboard's own
 * routes. Path-traversal is rejected.
 *
 * This is a local-only feature today: the dashboard reads the laptop
 * filesystem directly. The Supabase data source intentionally returns
 * 503 — built artifacts live in the bucket but streaming binary blobs
 * through the dashboard isn't worth the bandwidth bill versus pointing
 * the operator at the deployed clone.
 */
import { readFile, stat } from 'node:fs/promises';
import { extname, join, resolve, sep } from 'node:path';

import type { APIRoute } from 'astro';

export const prerender = false;

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.htm': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.otf': 'font/otf',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
};

function safeJoin(root: string, rel: string): string | null {
  const target = resolve(root, rel);
  const rootResolved = resolve(root);
  if (target !== rootResolved && !target.startsWith(rootResolved + sep)) return null;
  return target;
}

function clientsBaseDir(): string {
  return process.env['UPRIVER_CLIENTS_DIR'] ?? 'clients';
}

export const GET: APIRoute = async ({ params }) => {
  const slug = params.slug;
  if (!slug || !/^[a-z0-9][a-z0-9-]{0,63}$/i.test(slug)) {
    return new Response('Invalid slug', { status: 400 });
  }
  const rawPath = params.path ?? '';
  const wantsIndex = rawPath === '' || rawPath.endsWith('/');
  const relPath = wantsIndex ? join(rawPath, 'index.html') : rawPath;

  const distRoot = resolve(clientsBaseDir(), slug, 'repo', 'dist', 'client');
  let target = safeJoin(distRoot, relPath);
  if (!target) return new Response('Forbidden', { status: 403 });

  // Try the file as given; if that fails AND there's no extension, fall back
  // to <path>/index.html so /admissions and /admissions/ both resolve.
  let info: Awaited<ReturnType<typeof stat>> | null = null;
  try {
    info = await stat(target);
  } catch {
    info = null;
  }
  if (!info || info.isDirectory()) {
    const fallback = safeJoin(distRoot, join(relPath, 'index.html'));
    if (fallback) {
      try {
        info = await stat(fallback);
        if (info.isFile()) target = fallback;
      } catch {
        info = null;
      }
    }
  }
  if (!info || !info.isFile()) {
    return new Response('Not found', { status: 404 });
  }

  const ext = extname(target).toLowerCase();
  const type = MIME[ext] ?? 'application/octet-stream';

  if (ext === '.html' || ext === '.htm') {
    const text = await readFile(target, 'utf8');
    const rewritten = rewriteHtml(text, slug);
    return new Response(rewritten, { status: 200, headers: { 'content-type': type } });
  }
  if (ext === '.css') {
    const text = await readFile(target, 'utf8');
    const rewritten = rewriteCss(text, slug);
    return new Response(rewritten, { status: 200, headers: { 'content-type': type } });
  }
  const buf = await readFile(target);
  return new Response(new Uint8Array(buf), { status: 200, headers: { 'content-type': type } });
};

const ROOT_PATHS = ['_astro', 'images', 'fonts', 'assets'];

function rewriteHtml(html: string, slug: string): string {
  // 1. Inject a <base> tag for relative URLs (handles things like
  //    href="about" inside nav menus).
  const baseTag = `<base href="/preview/${slug}/">`;
  let out = html.replace(/<head([^>]*)>/i, (m, attrs) => `<head${attrs}>${baseTag}`);

  // 2. Prefix root-relative URLs in href/src/srcset that point at known
  //    Astro/build dirs. Matching only the known directory list keeps us
  //    from clobbering external absolute URLs that just happen to share
  //    a leading slash inside content (rare but possible).
  for (const dir of ROOT_PATHS) {
    const re = new RegExp(`(href|src|srcset|poster|content)=("|')\\/${dir}\\/`, 'g');
    out = out.replace(re, (_m, attr, q) => `${attr}=${q}/preview/${slug}/${dir}/`);
  }
  // 3. Same for `url(/_astro/...)` inside inline <style>.
  out = rewriteCss(out, slug);
  return out;
}

function rewriteCss(css: string, slug: string): string {
  let out = css;
  for (const dir of ROOT_PATHS) {
    const re = new RegExp(`url\\((\\s*)("|'|)\\/${dir}\\/`, 'g');
    out = out.replace(re, (_m, ws, q) => `url(${ws}${q}/preview/${slug}/${dir}/`);
  }
  return out;
}
