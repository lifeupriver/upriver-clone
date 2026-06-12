import { isAbsolute, relative, resolve, sep } from 'node:path';

/**
 * Resolve `child` and assert it is contained within `parent`. Returns the
 * absolute resolved path on success; throws if `child` would escape `parent`.
 *
 * Use this at every fs write whose path is influenced by external data
 * (manifests, URL parsing, config) to prevent path traversal.
 */
export function assertPathInside(child: string, parent: string): string {
  const abs = resolve(child);
  const root = resolve(parent);
  const rel = relative(root, abs);
  // rel === '' means abs IS root (allowed). Otherwise reject if it would
  // escape via `..` or is unrelatedly absolute.
  if (rel === '' || (rel !== '..' && !rel.startsWith(`..${sep}`) && !isAbsolute(rel))) {
    return abs;
  }
  throw new Error(`Path escapes containing directory: ${child} not inside ${parent}`);
}

/**
 * Canonical client-slug shape: kebab-case, lowercase alphanumeric, must not
 * start with a hyphen. Mirrors the regex enforced at the dashboard/worker
 * route boundaries — validate again here because slugs flow into filesystem
 * paths and storage object keys.
 */
const SAFE_SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Assert `slug` is a safe kebab-case client slug and return it. Throws on
 * anything else (`..`, separators, uppercase, underscores, empty string) so
 * a hostile slug can never become a path segment.
 */
export function assertSafeSlug(slug: string): string {
  if (!SAFE_SLUG_RE.test(slug)) {
    throw new Error(
      `Invalid client slug ${JSON.stringify(slug)}: expected lowercase kebab-case (${SAFE_SLUG_RE})`,
    );
  }
  return slug;
}
