// Generate Vercel redirect rules from gap analysis output.
//
// F09's `proposed-sitemap.json` contains a `current_to_proposed` map of
// every URL that moved during the rebuild. The finalize stage writes those
// as Vercel `redirects` entries (status 301) so SEO equity follows the new
// IA. Operator can override or extend by hand-editing vercel.json after
// finalize runs; we only own the entries we generated.

import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

interface ProposedSitemap {
  proposed?: Record<string, unknown>;
  current_to_proposed: Record<string, string>;
  rationale?: string[];
}

export interface VercelRedirectRule {
  source: string;
  destination: string;
  permanent: boolean;
}

export interface VercelConfigPartial {
  redirects?: VercelRedirectRule[];
  [key: string]: unknown;
}

export interface ApplyRedirectsResult {
  count: number;
  /** Sources we added or updated (relative paths). */
  sources: string[];
  /** Sources that were already in vercel.json from a non-Upriver source — left untouched. */
  preserved: string[];
}

const UPRIVER_REDIRECT_MARK = '__upriver_proposed_sitemap';

export function loadProposedSitemap(clientDir: string): ProposedSitemap | null {
  const p = join(clientDir, 'proposed-sitemap.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8')) as ProposedSitemap;
  } catch {
    return null;
  }
}

/**
 * Convert an absolute URL or path to the path component Vercel matches on.
 * Drops scheme, host, query, and fragment; ensures a leading slash.
 */
export function pathOf(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname || '/';
  } catch {
    if (url.startsWith('/')) return url.split('?')[0]!.split('#')[0]!;
    return `/${url}`;
  }
}

/** Build Vercel redirect rules. Skips entries where source === destination. */
export function buildRedirectRules(map: Record<string, string>): VercelRedirectRule[] {
  const rules: VercelRedirectRule[] = [];
  const seen = new Set<string>();
  for (const [from, to] of Object.entries(map)) {
    const source = pathOf(from);
    const destination = pathOf(to);
    if (!source || !destination || source === destination) continue;
    if (seen.has(source)) continue;
    seen.add(source);
    rules.push({ source, destination, permanent: true });
  }
  return rules;
}

/**
 * Apply redirect rules to vercel.json. Preserves existing rules that did not
 * come from Upriver (we only own entries flagged with the marker comment via
 * a sibling tracking key). Idempotent — re-running replaces our entries.
 */
export function applyRedirectsToVercelConfig(
  repoDir: string,
  rules: VercelRedirectRule[],
): ApplyRedirectsResult {
  const vercelPath = join(repoDir, 'vercel.json');
  let config: VercelConfigPartial = {};
  if (existsSync(vercelPath)) {
    try {
      config = JSON.parse(readFileSync(vercelPath, 'utf8')) as VercelConfigPartial;
    } catch {
      config = {};
    }
  }

  // Strip our previously-owned entries (tracked in a sibling key).
  const ownedSources = new Set<string>(
    (config[UPRIVER_REDIRECT_MARK] as string[] | undefined) ?? [],
  );
  const preExisting: VercelRedirectRule[] = (config.redirects ?? []).filter(
    (r) => !ownedSources.has(r.source),
  );

  // Filter out rules whose source already has a non-Upriver redirect; leave those alone.
  const preservedSources = new Set(preExisting.map((r) => r.source));
  const owned: VercelRedirectRule[] = [];
  const preserved: string[] = [];
  for (const rule of rules) {
    if (preservedSources.has(rule.source)) {
      preserved.push(rule.source);
      continue;
    }
    owned.push(rule);
  }

  config.redirects = [...preExisting, ...owned];
  config[UPRIVER_REDIRECT_MARK] = owned.map((r) => r.source);

  writeFileSync(vercelPath, JSON.stringify(config, null, 2) + '\n', 'utf8');

  return {
    count: owned.length,
    sources: owned.map((r) => r.source),
    preserved,
  };
}
