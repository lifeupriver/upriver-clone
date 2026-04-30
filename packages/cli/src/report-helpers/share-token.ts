import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { clientDir } from '@upriver/core';

/**
 * Persisted share-link metadata for a client. The token is generated once at
 * first call and reused on subsequent calls so any previously-distributed
 * share URL keeps resolving.
 */
export interface ShareInfo {
  token: string;
  createdAt: string;
  /** Host portion only, no trailing slash (e.g., `'https://reports.upriver.com'`). */
  baseUrl: string;
}

/**
 * Resolve the clients base directory, honoring the `UPRIVER_CLIENTS_DIR`
 * environment override used by the dashboard server and tests. Falls back to
 * the `./clients` convention used elsewhere in the CLI.
 *
 * @returns Absolute or relative path to the clients base directory.
 */
function resolveClientsBase(): string {
  return process.env['UPRIVER_CLIENTS_DIR'] ?? './clients';
}

/**
 * Strip a trailing slash from a URL, if present. Used to normalize the
 * persisted `baseUrl` so `buildShareUrl` can join it without producing
 * double slashes.
 *
 * @param url - Input URL or host string.
 * @returns The same string with one trailing slash removed.
 */
function stripTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

/**
 * Load existing share metadata from `clients/<slug>/share.json`, or create a
 * new entry if missing. The token is a 16-byte random value encoded as
 * base64url, generated once and reused on subsequent calls (idempotent).
 *
 * @param slug - Client slug; must match a directory under the clients base.
 * @param baseUrl - Host portion of the published report (no trailing slash
 *   required; one is stripped if present). Used only on first creation.
 * @returns The persisted `ShareInfo` for this client.
 */
export function loadOrCreateShareInfo(slug: string, baseUrl: string): ShareInfo {
  const dir = clientDir(slug, resolveClientsBase());
  mkdirSync(dir, { recursive: true });
  const path = join(dir, 'share.json');

  if (existsSync(path)) {
    const raw = readFileSync(path, 'utf8');
    const parsed = JSON.parse(raw) as ShareInfo;
    if (
      typeof parsed.token === 'string' &&
      typeof parsed.createdAt === 'string' &&
      typeof parsed.baseUrl === 'string' &&
      parsed.token.length > 0
    ) {
      return parsed;
    }
    // Fall through: corrupt file is overwritten with a fresh token.
  }

  const info: ShareInfo = {
    token: randomBytes(16).toString('base64url'),
    createdAt: new Date().toISOString(),
    baseUrl: stripTrailingSlash(baseUrl),
  };
  writeFileSync(path, `${JSON.stringify(info, null, 2)}\n`, 'utf8');
  return info;
}

/**
 * Compose the share URL for a client given its persisted `ShareInfo`. The
 * URL form is `<baseUrl>/<slug>-<token>/` — the trailing slash matches the
 * static export's `index.html` directory listing, and `<slug>-<token>`
 * keeps the path opaque while still being human-debuggable.
 *
 * @param slug - Client slug.
 * @param info - Persisted share metadata.
 * @returns Absolute share URL with a trailing slash.
 */
export function buildShareUrl(slug: string, info: ShareInfo): string {
  return `${stripTrailingSlash(info.baseUrl)}/${slug}-${info.token}/`;
}
