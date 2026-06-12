/**
 * Pure path/redirect guards for the auth middleware.
 *
 * Extracted from `src/middleware.ts` so the matching rules are unit testable
 * (the middleware itself imports `astro:middleware`, which only resolves
 * inside an Astro build). Two bugs live here historically:
 *
 * - prefix matching used a bare `startsWith(p)`, so `/logind` matched the
 *   `/login` public prefix and `/clientsfoo` matched the `/clients` operator
 *   prefix — matching must be exact-segment;
 * - the `?next=` redirect check used a bare `startsWith('/')`, which admits
 *   protocol-relative `//evil.com` (and `/\evil.com`, which browsers
 *   normalize to `//evil.com`) — an open redirect.
 */

/**
 * True iff `pathname` equals a prefix or sits underneath it as a path
 * segment. `/login` matches `/login` and `/login/x`, never `/logind`.
 * Prefixes with a trailing slash (e.g. `/auth/`) are normalized so `/auth`
 * and `/auth/expired` both match.
 *
 * @param pathname - Request pathname.
 * @param prefixes - Path prefixes to test against.
 */
export function pathIs(pathname: string, prefixes: readonly string[]): boolean {
  for (const p of prefixes) {
    const base = p.endsWith('/') ? p.slice(0, -1) : p;
    if (pathname === base || pathname.startsWith(`${base}/`)) {
      return true;
    }
  }
  return false;
}

/**
 * True iff `p` is a safe same-origin redirect target: it must start with a
 * single `/` and not be protocol-relative (`//…`) or backslash-tricked
 * (`/\…`, which browsers treat as `//…`).
 *
 * @param p - Candidate redirect path (e.g. a `?next=` query value).
 */
export function safeNext(p: string | null | undefined): p is string {
  return (
    typeof p === 'string' && p.startsWith('/') && !p.startsWith('//') && !p.startsWith('/\\')
  );
}
