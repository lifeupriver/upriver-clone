import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, statSync, createWriteStream } from 'node:fs';
import { join, basename } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { assertPathInside } from '@upriver/core';

interface AssetEntry {
  url: string;
  localPath: string;
  type: string;
}

interface AssetManifest {
  generated_at: string;
  total: number;
  assets: AssetEntry[];
}

export interface DownloadResult {
  url: string;
  ok: boolean;
  localFilename?: string;
  error?: string;
}

const SKIP_DIRS = new Set(['node_modules', 'dist', '.astro', '.git']);

export function findCdnUrlsInRepo(srcDir: string, cdnHosts: string[]): Set<string> {
  const escapedHosts = cdnHosts.map((h) => h.replace(/\./g, '\\.')).join('|');
  // Restrict path to URL-safe chars; stop before another https?:// to handle
  // scrape-mangled content where adjacent URLs have no whitespace separator.
  const cdnPattern = new RegExp(
    `https?://(?:${escapedHosts})(?:(?!https?://)[A-Za-z0-9\\-._~%!$&'*+,;=:@/?#])*`,
    'gi',
  );
  const found = new Set<string>();
  const exts = ['.astro', '.md', '.mdx', '.tsx', '.jsx'];

  const walk = (dir: string): void => {
    for (const entry of readdirSync(dir)) {
      if (SKIP_DIRS.has(entry)) continue;
      const full = join(dir, entry);
      const stat = statSync(full);
      if (stat.isDirectory()) {
        walk(full);
      } else if (exts.some((ext) => entry.endsWith(ext))) {
        const content = readFileSync(full, 'utf-8');
        for (const m of content.matchAll(cdnPattern)) {
          found.add(m[0]);
        }
      }
    }
  };
  walk(srcDir);
  return found;
}

export function filterUnmatched(
  urls: Set<string>,
  imageManifest: Map<string, string>,
  filenameToLocal: Map<string, string>,
): string[] {
  const unmatched: string[] = [];
  for (const url of urls) {
    const noQ = url.split('?')[0]!;
    if (imageManifest.has(noQ)) continue;
    try {
      const u = new URL(url);
      const fn = decodeURIComponent(basename(u.pathname));
      if (filenameToLocal.has(fn)) continue;
    } catch {
      // unmatched
    }
    unmatched.push(url);
  }
  return unmatched;
}

function safeFilename(rawFilename: string, taken: Set<string>): string {
  let decoded = rawFilename;
  try {
    decoded = decodeURIComponent(rawFilename);
  } catch {
    // keep raw
  }
  let safe = decoded
    .replace(/\+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  // Reject any name that resolves to '.' or '..' or starts with one — these
  // could traverse out of outDir even after the post-resolve containment check.
  if (safe === '' || safe === '.' || safe === '..' || /^\.+$/.test(safe)) safe = 'asset';
  if (!taken.has(safe)) return safe;
  const dot = safe.lastIndexOf('.');
  const stem = dot > 0 ? safe.slice(0, dot) : safe;
  const ext = dot > 0 ? safe.slice(dot) : '';
  let i = 1;
  while (taken.has(`${stem}-${i}${ext}`)) i++;
  return `${stem}-${i}${ext}`;
}

async function fetchToFile(url: string, dest: string): Promise<void> {
  const maxAttempts = 3;
  let lastErr: unknown;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const res = await fetch(url);
      if (!res.ok) {
        // Retry 429/5xx; surface 4xx immediately.
        if ((res.status === 429 || res.status >= 500) && attempt < maxAttempts) {
          await sleep(backoffMs(attempt));
          continue;
        }
        throw new Error(`HTTP ${res.status}`);
      }
      if (!res.body) throw new Error('empty body');
      await pipeline(Readable.fromWeb(res.body as never), createWriteStream(dest));
      return;
    } catch (err) {
      lastErr = err;
      // Network errors only — fetch() throws TypeError on those. Don't retry
      // bad-status errors (those rethrow above).
      if (err instanceof TypeError && attempt < maxAttempts) {
        await sleep(backoffMs(attempt));
        continue;
      }
      throw err;
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error('download retries exhausted');
}

function backoffMs(attempt: number): number {
  const base = 500 * Math.pow(2, attempt - 1);
  return Math.round(base + Math.random() * base * 0.3);
}

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function hostKey(url: string): string {
  try {
    return new URL(url).host.toLowerCase();
  } catch {
    return 'unknown';
  }
}

export async function downloadMissing(args: {
  urls: string[];
  outDir: string;
  concurrency?: number;
  perHostConcurrency?: number;
  existingFilenames: Set<string>;
}): Promise<DownloadResult[]> {
  const { urls, outDir, existingFilenames } = args;
  const concurrency = args.concurrency ?? 8;
  const perHostMax = args.perHostConcurrency ?? 3;
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const taken = new Set(existingFilenames);
  const queue = [...urls];
  const results: DownloadResult[] = [];

  // Track in-flight requests per host so we don't burst on a single CDN.
  const hostInFlight = new Map<string, number>();
  const acquireHost = async (host: string): Promise<void> => {
    while ((hostInFlight.get(host) ?? 0) >= perHostMax) {
      await sleep(50);
    }
    hostInFlight.set(host, (hostInFlight.get(host) ?? 0) + 1);
  };
  const releaseHost = (host: string): void => {
    const cur = hostInFlight.get(host) ?? 0;
    if (cur <= 1) hostInFlight.delete(host);
    else hostInFlight.set(host, cur - 1);
  };

  const worker = async (): Promise<void> => {
    while (queue.length > 0) {
      const url = queue.shift();
      if (!url) break;
      const host = hostKey(url);
      await acquireHost(host);
      try {
        const u = new URL(url);
        const raw = basename(u.pathname);
        const filename = safeFilename(raw, taken);
        taken.add(filename);
        // Containment check: dest must resolve inside outDir even if the
        // filename somehow slips a separator past safeFilename.
        const dest = assertPathInside(join(outDir, filename), outDir);
        await fetchToFile(url, dest);
        results.push({ url, ok: true, localFilename: filename });
      } catch (e) {
        results.push({ url, ok: false, error: (e as Error).message });
      } finally {
        releaseHost(host);
      }
    }
  };

  const settled = await Promise.allSettled(
    Array.from({ length: concurrency }, () => worker()),
  );
  for (const s of settled) {
    if (s.status === 'rejected') {
      // Worker should never reject (errors are caught inside), but log if it does
      // so a single bad URL doesn't silently disappear.
      console.warn(
        `[download-missing] worker rejected: ${s.reason instanceof Error ? s.reason.message : String(s.reason)}`,
      );
    }
  }
  return results;
}

export function appendToAssetManifest(
  manifestPath: string,
  newEntries: { url: string; localPath: string }[],
): void {
  const m: AssetManifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  const existingUrls = new Set(m.assets.map((a) => a.url));
  for (const e of newEntries) {
    if (existingUrls.has(e.url)) continue;
    m.assets.push({ url: e.url, localPath: e.localPath, type: 'image' });
  }
  m.total = m.assets.length;
  writeFileSync(manifestPath, JSON.stringify(m, null, 2), 'utf-8');
}
