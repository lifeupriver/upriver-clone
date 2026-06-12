/**
 * Token-preserving link builders for the share-link client portal
 * (`/deliverables/<slug>/*`).
 *
 * In supabase mode the middleware requires a valid `?t=<share-token>` on EVERY
 * `/deliverables/<slug>/*` request from a non-operator (see middleware.ts).
 * Any internal portal link built without the token therefore dead-ends a
 * client on the operator login. Every internal `/deliverables/...` href and
 * redirect on the portal surface must be built through `deliverableHref` so
 * the token survives navigation.
 *
 * Operators browsing the same pages have no `?t=` in their URL; passing
 * `token = null` keeps their links clean.
 */

export type ReportTab = 'overview' | 'scorecard' | 'findings' | 'next-steps';

export interface ReportTabLink {
  id: ReportTab;
  label: string;
  href: string;
}

/**
 * Build an internal portal link: `/deliverables/<slug><path>`, appending
 * `?t=<token>` (URL-encoded) when a share token is present.
 *
 * @param slug - Client slug (already a path segment; encoded defensively).
 * @param path - Suffix after the slug, e.g. `''`, `'/scorecard'`, or a path
 *   that already carries a query string (joined with `&` in that case).
 * @param token - Share token from the inbound URL (`Astro.url.searchParams
 *   .get('t')`), or null/empty for operator sessions — then no `?t=` is added.
 */
export function deliverableHref(slug: string, path: string, token: string | null): string {
  const base = `/deliverables/${encodeURIComponent(slug)}${path}`;
  if (token === null || token === '') return base;
  const sep = path.includes('?') ? '&' : '?';
  return `${base}${sep}t=${encodeURIComponent(token)}`;
}

/**
 * The report shell's tab strip, with every href carrying the share token when
 * one is present. ReportLayout.astro consumes this — keeping the construction
 * here (instead of inline in the layout) lets a unit test assert no tab can
 * regress to a token-less href.
 */
export function reportTabs(slug: string, token: string | null): ReportTabLink[] {
  return [
    { id: 'overview',   label: 'Overview',   href: deliverableHref(slug, '', token) },
    { id: 'scorecard',  label: 'Scorecard',  href: deliverableHref(slug, '/scorecard', token) },
    { id: 'findings',   label: 'Findings',   href: deliverableHref(slug, '/findings', token) },
    { id: 'next-steps', label: 'Next steps', href: deliverableHref(slug, '/next-steps', token) },
  ];
}

/**
 * Where a deliverable page sends the viewer when its artifact (e.g.
 * audit-package.json) doesn't exist yet.
 *
 * - Share-token client: the branded "not ready yet" page, token preserved —
 *   NOT `/clients`, which bounces an anonymous client to the operator login.
 * - Operator (no token): the client's operator workspace, as before.
 */
export function missingDeliverableRedirect(slug: string, token: string | null): string {
  if (token) return deliverableHref(slug, '/not-ready', token);
  return `/clients/${encodeURIComponent(slug)}`;
}
