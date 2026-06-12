// Preview staging (Spec 19 §1 step 7 / §5). The portal serves ONE file —
// `pitch/preview/index.html` — so the built homepage is made self-contained
// here: local stylesheets/scripts inlined, local images converted to data
// URIs (remote URLs pass through untouched). A budget caps how much binary
// weight gets inlined; anything over stays a reference and simply won't
// render in the preview, which beats an unbounded multi-megabyte page.

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { assertPathInside } from '@upriver/core';

const MIME: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

const DEFAULT_TOTAL_BUDGET = 6 * 1024 * 1024;

function mimeFor(path: string): string {
  const dot = path.lastIndexOf('.');
  const ext = dot >= 0 ? path.slice(dot).toLowerCase().split('?')[0] : '';
  return MIME[ext ?? ''] ?? 'application/octet-stream';
}

function isLocal(ref: string): boolean {
  return ref.startsWith('/') && !ref.startsWith('//');
}

export interface InlineOptions {
  totalBudgetBytes?: number;
}

/**
 * Inline local asset references in built homepage HTML. `readAsset` resolves
 * a site-absolute path ("/images/x.jpg") to bytes, or null when missing —
 * missing/over-budget references are left untouched.
 */
export function inlineAssets(
  html: string,
  readAsset: (path: string) => Buffer | null,
  opts: InlineOptions = {},
): string {
  let budget = opts.totalBudgetBytes ?? DEFAULT_TOTAL_BUDGET;

  const take = (path: string): Buffer | null => {
    const buf = readAsset(path.split('?')[0] ?? path);
    if (!buf || buf.length > budget) return null;
    budget -= buf.length;
    return buf;
  };

  const inlineCssUrls = (css: string): string =>
    css.replace(/url\(\s*(['"]?)(\/[^)'"\s]+)\1\s*\)/g, (whole, _q: string, ref: string) => {
      const buf = take(ref);
      return buf ? `url(data:${mimeFor(ref)};base64,${buf.toString('base64')})` : whole;
    });

  let out = html;

  // <link rel="stylesheet" href="/..."> → <style>…</style>
  out = out.replace(
    /<link\b[^>]*rel=["']stylesheet["'][^>]*>/gi,
    (tag) => {
      const href = tag.match(/href=["']([^"']+)["']/i)?.[1];
      if (!href || !isLocal(href)) return tag;
      const buf = take(href);
      return buf ? `<style>${inlineCssUrls(buf.toString('utf8'))}</style>` : tag;
    },
  );

  // <script src="/...">…</script> → inline script (keep type attr)
  out = out.replace(
    /<script\b([^>]*)\bsrc=["']([^"']+)["']([^>]*)>\s*<\/script>/gi,
    (tag, pre: string, src: string, post: string) => {
      if (!isLocal(src)) return tag;
      const buf = take(src);
      if (!buf) return tag;
      const attrs = `${pre} ${post}`.replace(/\s+/g, ' ').trim();
      return `<script${attrs ? ` ${attrs}` : ''}>${buf.toString('utf8')}</script>`;
    },
  );

  // <img src="/..."> (and source/video poster) → data URI
  out = out.replace(
    /(<(?:img|source|video)\b[^>]*?\b(?:src|poster)=["'])(\/[^"']+)(["'])/gi,
    (whole, before: string, ref: string, after: string) => {
      const buf = take(ref);
      return buf
        ? `${before}data:${mimeFor(ref)};base64,${buf.toString('base64')}${after}`
        : whole;
    },
  );

  return out;
}

/**
 * Read the built homepage from `repo/dist/`, inline its local assets, and
 * write `clients/<slug>/pitch/preview/index.html`. Throws with a pointed
 * message when the build output is missing.
 */
export function stagePreview(clientDir: string, repoDir: string): string {
  const distDir = join(repoDir, 'dist');
  const indexPath = join(distDir, 'index.html');
  if (!existsSync(indexPath)) {
    throw new Error(
      `no built homepage at ${indexPath} — did the repo build step succeed?`,
    );
  }
  const html = readFileSync(indexPath, 'utf8');
  const staged = inlineAssets(html, (ref) => {
    const abs = resolve(distDir, `.${ref}`);
    try {
      assertPathInside(abs, distDir);
    } catch {
      return null;
    }
    return existsSync(abs) ? readFileSync(abs) : null;
  });

  const outDir = join(clientDir, 'pitch', 'preview');
  mkdirSync(outDir, { recursive: true });
  const outPath = join(outDir, 'index.html');
  writeFileSync(outPath, staged);
  return outPath;
}
