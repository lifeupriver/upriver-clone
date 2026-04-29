import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, basename } from 'node:path';

interface AssetManifestEntry {
  url: string;
  localPath: string;
  type: string;
}

interface AssetManifest {
  generated_at: string;
  total: number;
  assets: AssetManifestEntry[];
}

export interface RewriteOptions {
  clientDomain: string;
  cdnHosts: string[];
  imageManifest: Map<string, string>;
  filenameToLocal: Map<string, string>;
}

export interface RewriteReport {
  internalLinksRewritten: number;
  cdnImagesRewritten: number;
  unmatchedExternal: string[];
  totalChanges: number;
}

export interface RewriteResult {
  content: string;
  report: RewriteReport;
}

export function buildAssetIndex(manifestPath: string): {
  imageManifest: Map<string, string>;
  filenameToLocal: Map<string, string>;
} {
  const manifest: AssetManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const imageManifest = new Map<string, string>();
  const filenameToLocal = new Map<string, string>();

  for (const asset of manifest.assets) {
    if (asset.type !== 'image') continue;
    const localFilename = basename(asset.localPath);

    const urlNoQuery = asset.url.split('?')[0]!;
    imageManifest.set(urlNoQuery, localFilename);

    try {
      const u = new URL(asset.url);
      const urlFilename = decodeURIComponent(basename(u.pathname));
      if (urlFilename && !filenameToLocal.has(urlFilename)) {
        filenameToLocal.set(urlFilename, localFilename);
      }
    } catch (err) {
      if (process.env['UPRIVER_DEBUG']) {
        console.warn(`[rewrite-links] skipping malformed manifest URL ${asset.url}: ${(err as Error).message}`);
      }
    }
  }

  return { imageManifest, filenameToLocal };
}

export function rewriteContent(input: string, opts: RewriteOptions): RewriteResult {
  const report: RewriteReport = {
    internalLinksRewritten: 0,
    cdnImagesRewritten: 0,
    unmatchedExternal: [],
    totalChanges: 0,
  };

  // 1. Rewrite client-domain URLs (any subdomain) to local routes.
  //    https://audreysfarmhouse.com/foo  -> /foo
  //    https://audreysfarmhouse.com/     -> /
  //    https://audreysfarmhouse.com/#bar -> /#bar
  //    https://app.audreysfarmhouse.com/login -> /login (404 locally is preferable to bouncing)
  //    Path/tail char classes are URL-safe + negative-lookahead on https?:// to
  //    handle scrape-mangled content where adjacent URLs have no separator.
  const escapedDomain = opts.clientDomain.replace(/\./g, '\\.');
  const pathChar = `(?:(?!https?://)[A-Za-z0-9\\-._~%!$&'*+,;=:@/])`;
  const tailChar = `(?:(?!https?://)[A-Za-z0-9\\-._~%!$&'*+,;=:@/?#])`;
  const domainPattern = new RegExp(
    `https?://(?:[a-z0-9-]+\\.)?${escapedDomain}((?:/${pathChar}*)?)([?#]${tailChar}*)?`,
    'gi',
  );
  let result = input.replace(domainPattern, (_match, path: string, tail: string) => {
    report.internalLinksRewritten++;
    const p = flattenPath(path || '');
    const t = tail || '';
    if (!p && !t) return '/';
    return p + t;
  });

  // 1b. Flatten nested href paths to match the cloned Astro file slugs.
  //     `href="/the-greenhouses/lodging"` -> `href="/the-greenhouses-lodging"`.
  //     Preserves any `?query` and `#fragment` suffix.
  //     Skips `/api/` and `/admin/` (legitimate nested routes).
  const nestedHrefRe = /\bhref="\/([a-z0-9][a-z0-9-]*\/[a-z0-9][a-z0-9/-]*)([?#][^"]*)?"/gi;
  result = result.replace(nestedHrefRe, (match, p, tail) => {
    const path = String(p);
    if (path.startsWith('api/') || path.startsWith('admin/')) return match;
    report.internalLinksRewritten++;
    return `href="/${path.replace(/\//g, '-')}${tail || ''}"`;
  });

  // 2. Rewrite Squarespace CDN image URLs to /images/<localFilename>.
  //    Char class restricts to URL-safe chars only; negative lookahead stops
  //    the match before another https?:// (handles scrape-mangled markdown
  //    with no whitespace between adjacent URLs).
  for (const cdnHost of opts.cdnHosts) {
    const escapedHost = cdnHost.replace(/\./g, '\\.');
    const cdnPattern = new RegExp(
      `https?://${escapedHost}(?:(?!https?://)[A-Za-z0-9\\-._~%!$&'*+,;=:@/?#])*`,
      'gi',
    );
    result = result.replace(cdnPattern, (match) => {
      const urlNoQuery = match.split('?')[0]!;
      let localFilename = opts.imageManifest.get(urlNoQuery);

      if (!localFilename) {
        try {
          const u = new URL(match);
          const filename = decodeURIComponent(basename(u.pathname));
          localFilename = opts.filenameToLocal.get(filename);
        } catch (err) {
          if (process.env['UPRIVER_DEBUG']) {
            console.warn(`[rewrite-links] could not parse CDN URL ${match}: ${(err as Error).message}`);
          }
        }
      }

      if (localFilename) {
        report.cdnImagesRewritten++;
        return `/images/${localFilename}`;
      }

      report.unmatchedExternal.push(match);
      return match;
    });
  }

  report.totalChanges = report.internalLinksRewritten + report.cdnImagesRewritten;
  return { content: result, report };
}

const SKIP_DIRS = new Set(['node_modules', 'dist', '.astro', '.git']);

export function rewriteRepo(
  rootDir: string,
  opts: RewriteOptions,
  options: { dryRun?: boolean; extensions?: string[] } = {},
): {
  filesChanged: number;
  filesScanned: number;
  perFileReports: Map<string, RewriteReport>;
  aggregate: RewriteReport;
} {
  const exts = options.extensions ?? ['.astro', '.md', '.mdx', '.tsx', '.jsx'];
  const perFileReports = new Map<string, RewriteReport>();
  const aggregate: RewriteReport = {
    internalLinksRewritten: 0,
    cdnImagesRewritten: 0,
    unmatchedExternal: [],
    totalChanges: 0,
  };
  let filesChanged = 0;
  let filesScanned = 0;

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      if (SKIP_DIRS.has(entry)) continue;
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (exts.some((ext) => entry.endsWith(ext))) {
        filesScanned++;
        const content = readFileSync(full, 'utf-8');
        const { content: rewritten, report } = rewriteContent(content, opts);
        if (report.totalChanges > 0) {
          if (!options.dryRun) writeFileSync(full, rewritten, 'utf-8');
          filesChanged++;
          perFileReports.set(full, report);
          aggregate.internalLinksRewritten += report.internalLinksRewritten;
          aggregate.cdnImagesRewritten += report.cdnImagesRewritten;
          aggregate.unmatchedExternal.push(...report.unmatchedExternal);
          aggregate.totalChanges += report.totalChanges;
        }
      }
    }
  };
  walk(rootDir);

  return { filesChanged, filesScanned, perFileReports, aggregate };
}

export const DEFAULT_CDN_HOSTS = [
  'images.squarespace-cdn.com',
  'static1.squarespace.com',
  'assets.squarespace.com',
];

/**
 * Convert a Squarespace-style nested path (`/the-greenhouses/lodging`) to the
 * flat slug used by the cloned Astro site (`/the-greenhouses-lodging`). The
 * scaffold/clone pipeline derives one .astro file per leaf URL with `/` joined
 * by `-`, so internal hrefs need to match that convention.
 */
function flattenPath(path: string): string {
  if (!path || path === '/') return path;
  const trimmed = path.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!trimmed) return '/';
  if (!trimmed.includes('/')) return `/${trimmed}`;
  return `/${trimmed.replace(/\//g, '-')}`;
}
