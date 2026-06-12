// Prospect-URL → client-slug derivation for the pitch engine (Spec 19).
// `urlToSlug` maps PAGE paths to artifact slugs; this maps a site's DOMAIN to
// the kebab-case directory slug under `clients/`. The result must satisfy
// `assertSafeSlug` because it becomes a filesystem path segment and a
// Supabase key.

// Common public suffixes stripped from the right of the hostname. Not a full
// PSL — covers the small-business domains this tool targets; anything else
// keeps its TLD label in the slug, which is safe (just uglier), never wrong.
const TWO_LEVEL_SUFFIXES = new Set([
  'co.uk',
  'org.uk',
  'me.uk',
  'com.au',
  'net.au',
  'org.au',
  'co.nz',
  'com.mx',
  'com.br',
  'co.in',
]);
const ONE_LEVEL_SUFFIXES = new Set([
  'com',
  'net',
  'org',
  'io',
  'co',
  'biz',
  'info',
  'us',
  'ca',
  'uk',
  'au',
  'nz',
  'cafe',
  'shop',
  'site',
  'online',
  'studio',
  'agency',
  'example',
]);

const SAFE_SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

/**
 * Derive a deterministic kebab-case client slug from a prospect URL or bare
 * domain. Throws a clean, single-line error for hosts that cannot become an
 * honest slug (IP literals, punycode/non-ASCII, unparseable input).
 */
export function domainToSlug(input: string): string {
  const trimmed = input.trim();
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;

  let host: string;
  try {
    host = new URL(withScheme).hostname.toLowerCase();
  } catch {
    throw new Error(`Cannot derive a slug from ${JSON.stringify(input)}: not a valid URL or domain`);
  }
  if (!host || !host.includes('.')) {
    throw new Error(`Cannot derive a slug from ${JSON.stringify(input)}: not a valid URL or domain`);
  }
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host) || host.startsWith('[')) {
    throw new Error(`Cannot derive a slug from an IP-literal host (${host}); pass the site's domain`);
  }
  if (host.split('.').some((label) => label.startsWith('xn--')) || !/^[a-z0-9.-]+$/.test(host)) {
    throw new Error(
      `Cannot derive a slug from a punycode/non-ASCII host (${host}); name the prospect with --slug instead`,
    );
  }

  let labels = host.split('.').filter(Boolean);
  if (labels[0] === 'www') labels = labels.slice(1);
  if (labels.length > 2 && TWO_LEVEL_SUFFIXES.has(labels.slice(-2).join('.'))) {
    labels = labels.slice(0, -2);
  } else if (labels.length > 1 && ONE_LEVEL_SUFFIXES.has(labels[labels.length - 1] ?? '')) {
    labels = labels.slice(0, -1);
  }

  const slug = labels
    .join('-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');

  if (!SAFE_SLUG_RE.test(slug)) {
    throw new Error(`Derived slug ${JSON.stringify(slug)} from ${host} is not a safe client slug`);
  }
  return slug;
}
