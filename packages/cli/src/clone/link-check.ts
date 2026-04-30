/**
 * Crawl the built cloned site (`dist/client/`) and audit its internal link
 * graph against the live site's siteStructure. Three categories of issue:
 *
 *   1. Broken links — `href`/`src` on a cloned page resolves to no file
 *      under dist/client/. The clone would 404 in a browser.
 *   2. Missing pages — the live audit-package's siteStructure has page
 *      `/foo` but the cloned dist has no `/foo/index.html`. The clone is
 *      incomplete.
 *   3. Orphan pages — the cloned dist has a page nothing links to from
 *      anywhere else in the cloned site.
 *
 * Pure filesystem reads, no Playwright, deterministic — cheap to run after
 * every build and can gate CI.
 */
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, resolve } from 'node:path';

import type { AuditPackage, SitePage } from '@upriver/core';

export interface BrokenLink {
  fromPage: string;
  rawTarget: string;
  resolved: string;
  attr: 'href' | 'src' | 'srcset' | 'action' | 'poster';
}

export interface MissingPage {
  livePath: string;
  expectedPath: string;
  liveSlug: string;
}

export interface OrphanPage {
  page: string;
}

export interface LinkAuditReport {
  generatedAt: string;
  distRoot: string;
  pageCount: number;
  internalLinkCount: number;
  externalLinkCount: number;
  brokenLinks: BrokenLink[];
  missingPages: MissingPage[];
  orphanPages: OrphanPage[];
  graph: Record<string, string[]>;
  pages: string[];
}

const HTML_ATTR_RE = /\b(href|src|srcset|action|poster)\s*=\s*("([^"]*)"|'([^']*)')/gi;

const SKIP_LEADING_PROTOCOLS = ['http://', 'https://', 'mailto:', 'tel:', 'javascript:', 'data:', '#'];

export function listClonedPages(distRoot: string): string[] {
  const out: string[] = [];
  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      const st = statSync(full);
      if (st.isDirectory()) walk(full);
      else if (entry.endsWith('.html')) out.push('/' + relative(distRoot, full));
    }
  };
  walk(distRoot);
  return out.sort();
}

export function extractLinks(html: string): Array<{ attr: BrokenLink['attr']; target: string }> {
  const results: Array<{ attr: BrokenLink['attr']; target: string }> = [];
  for (const m of html.matchAll(HTML_ATTR_RE)) {
    const attr = m[1]!.toLowerCase() as BrokenLink['attr'];
    const value = (m[3] ?? m[4] ?? '').trim();
    if (!value) continue;
    if (attr === 'srcset') {
      const first = value.split(',')[0]!.trim().split(/\s+/)[0]!;
      if (first) results.push({ attr, target: decodeEntities(first) });
    } else {
      results.push({ attr, target: decodeEntities(value) });
    }
  }
  return results;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&#x2F;/gi, '/')
    .replace(/&#47;/g, '/')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

export function resolveTarget(
  distRoot: string,
  fromPage: string,
  rawTarget: string,
): string | null {
  const target = rawTarget.split('#')[0]!.split('?')[0]!.trim();
  if (!target) return null;
  if (SKIP_LEADING_PROTOCOLS.some((p) => target.toLowerCase().startsWith(p))) return null;
  if (target.startsWith('//')) return null;

  let abs: string;
  if (target.startsWith('/')) {
    abs = resolve(distRoot, '.' + target);
  } else {
    const fromDir = join(distRoot, fromPage, '..');
    abs = resolve(fromDir, target);
  }
  const rootResolved = resolve(distRoot);
  if (abs !== rootResolved && !abs.startsWith(rootResolved + '/')) return null;
  return abs;
}

export function existsResolvedTarget(absPath: string): boolean {
  if (existsSync(absPath)) {
    try {
      const st = statSync(absPath);
      if (st.isFile()) return true;
      if (st.isDirectory()) return existsSync(join(absPath, 'index.html'));
    } catch {
      return false;
    }
  }
  if (existsSync(absPath + '.html')) return true;
  if (existsSync(join(absPath, 'index.html'))) return true;
  return false;
}

function liveUrlToExpected(distRoot: string, page: SitePage): string {
  let path = page.slug || '/';
  try {
    if (/^https?:/i.test(path)) path = new URL(path).pathname || '/';
  } catch {
    /* fall through */
  }
  if (page.slug === 'home' || path === '/' || path === '') return join(distRoot, 'index.html');
  if (!path.startsWith('/')) path = '/' + path;
  path = path.replace(/\/+$/, '');
  return join(distRoot, path.slice(1), 'index.html');
}

export function auditClonedLinks(distRoot: string, pkg: AuditPackage): LinkAuditReport {
  if (!existsSync(distRoot)) {
    throw new Error(`dist/client not found at ${distRoot} — build the cloned repo first.`);
  }
  const pages = listClonedPages(distRoot);
  const graph: Record<string, string[]> = {};
  const broken: BrokenLink[] = [];
  let internalLinkCount = 0;
  let externalLinkCount = 0;
  const incoming = new Map<string, number>();
  pages.forEach((p) => incoming.set(p, 0));

  for (const page of pages) {
    const html = readFileSync(join(distRoot, page.slice(1)), 'utf8');
    const links = extractLinks(html);
    const targets: string[] = [];
    for (const { attr, target } of links) {
      if (SKIP_LEADING_PROTOCOLS.some((p) => target.toLowerCase().startsWith(p))) {
        externalLinkCount++;
        continue;
      }
      if (target.startsWith('//')) {
        externalLinkCount++;
        continue;
      }
      // Server endpoints — form actions to /api/* are handled by the Astro
      // adapter at runtime and won't exist as static files. Don't flag them.
      if (
        attr === 'action' &&
        (target.startsWith('/api/') || target.startsWith('/_actions/'))
      ) {
        externalLinkCount++;
        continue;
      }
      const resolved = resolveTarget(distRoot, page, target);
      if (!resolved) continue;
      internalLinkCount++;
      if (!existsResolvedTarget(resolved)) {
        broken.push({ fromPage: page, rawTarget: target, resolved, attr });
        continue;
      }
      let landingPage = '/' + relative(distRoot, resolved);
      try {
        if (statSync(resolved).isDirectory()) landingPage = landingPage + '/index.html';
      } catch {
        /* ignore */
      }
      if (existsSync(resolved + '.html')) landingPage = landingPage + '.html';
      if (pages.includes(landingPage) && landingPage !== page) {
        targets.push(landingPage);
        incoming.set(landingPage, (incoming.get(landingPage) ?? 0) + 1);
      }
    }
    graph[page] = Array.from(new Set(targets)).sort();
  }

  const livePages = pkg.siteStructure.pages.filter((p) => p.statusCode < 400);
  const missingPages: MissingPage[] = [];
  for (const lp of livePages) {
    const expected = liveUrlToExpected(distRoot, lp);
    if (!existsSync(expected)) {
      missingPages.push({
        livePath: tryUrlPath(lp.url) ?? lp.slug,
        expectedPath: expected,
        liveSlug: lp.slug,
      });
    }
  }

  const orphanPages: OrphanPage[] = [];
  for (const p of pages) {
    if (p === '/index.html') continue;
    if ((incoming.get(p) ?? 0) === 0) orphanPages.push({ page: p });
  }

  return {
    generatedAt: new Date().toISOString(),
    distRoot,
    pageCount: pages.length,
    internalLinkCount,
    externalLinkCount,
    brokenLinks: broken,
    missingPages,
    orphanPages,
    graph,
    pages,
  };
}

function tryUrlPath(s: string): string | null {
  try {
    return new URL(s).pathname || '/';
  } catch {
    return null;
  }
}
