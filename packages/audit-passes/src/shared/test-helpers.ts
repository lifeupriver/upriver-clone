// Shared test fixtures for audit-pass tests. Not exported from the package
// barrel — import directly from './shared/test-helpers.js' inside *.test.ts.
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { PageData } from './loader.js';

/** Build a complete PageData record from a sparse override set. */
export function makePage(opts: Partial<PageData> & { url: string }): PageData {
  return {
    url: opts.url,
    slug: opts.slug ?? opts.url.replace(/\W+/g, '-'),
    scraped_at: opts.scraped_at ?? new Date().toISOString(),
    metadata: opts.metadata ?? {},
    content: opts.content ?? { markdown: '', wordCount: 0, headings: [] },
    links: opts.links ?? { internal: [], external: [] },
    images: opts.images ?? [],
    screenshots: opts.screenshots ?? { desktop: null, mobile: null },
    extracted: opts.extracted ?? {
      ctaButtons: [],
      contact: {},
      teamMembers: [],
      testimonials: [],
      faqs: [],
      pricing: [],
      socialLinks: [],
      eventSpaces: [],
    },
    rawHtmlPath: opts.rawHtmlPath ?? null,
    hasBranding: opts.hasBranding ?? false,
  };
}

/**
 * Create a throwaway client directory with a `pages/` folder containing one
 * JSON file per page record. Pass an empty array for an empty pages dir.
 * Caller is responsible for `rmSync(dir, { recursive: true, force: true })`.
 */
export function makeClientDir(prefix: string, pages: PageData[]): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  mkdirSync(join(dir, 'pages'), { recursive: true });
  pages.forEach((p, i) => {
    writeFileSync(join(dir, 'pages', `page-${i}.json`), JSON.stringify(p, null, 2));
  });
  return dir;
}
