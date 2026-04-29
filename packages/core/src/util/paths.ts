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
