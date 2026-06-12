// Canonical URL → artifact-slug mapping for scraped pages. Every per-page
// artifact (pages/*.json, rawhtml/*.html, screenshots, clone prompts) is
// keyed on this slug, so two URLs mapping to the same slug silently
// overwrite each other's artifacts and corrupt the engagement.
//
// Rules:
//  - `/` → `home`.
//  - A flat, ASCII, ≤60-char path keeps its clean slug (`/menu` → `menu`),
//    preserving artifact names for existing clients and fixtures.
//  - Anything lossy under sanitization (non-ASCII paths that collapse to
//    dashes), nested (`/about/us` vs `/about-us`), truncated, or carrying a
//    query string gets a deterministic 6-char hash suffix so distinct URLs
//    always yield distinct slugs.

import { createHash } from 'node:crypto';

const MAX_BASE = 60;

export function urlToSlug(url: string): string {
  try {
    const u = new URL(url);
    const path = u.pathname.replace(/\/$/, '') || '/';
    if (path === '/' && !u.search) return 'home';

    let decoded = path;
    try {
      decoded = decodeURIComponent(path);
    } catch {
      // keep the raw path — the hash still disambiguates
    }

    const flattened = decoded.slice(1).replace(/\//g, '-').toLowerCase();
    const base = flattened
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, MAX_BASE);

    const nested = decoded.slice(1).includes('/');
    const lossless =
      base === flattened && flattened.length <= MAX_BASE && base.length > 0;

    if (lossless && !nested && !u.search) return base;

    const hash = createHash('sha256')
      .update(u.pathname + u.search)
      .digest('hex')
      .slice(0, 6);
    return base.length > 0 ? `${base}-${hash}` : `page-${hash}`;
  } catch {
    return 'unknown';
  }
}
