/**
 * HTML rewrite helpers for the static report export. Converts the absolute
 * URLs emitted by the Astro SSR dashboard (e.g. `/_astro/foo.css`,
 * `/deliverables/<slug>/scorecard`, `/clients/<slug>`) into relative paths
 * suitable for opening directly from disk.
 *
 * The function is pure and idempotent: applying it twice to the same input
 * yields the same output as applying it once.
 */

/**
 * Escape a string for safe use inside a `RegExp` literal.
 *
 * @param value - The raw string to escape.
 * @returns A regex-safe version of `value`.
 */
function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Rewrite an Astro-rendered HTML page so that asset URLs and report-internal
 * navigation links are all relative to the static export directory.
 *
 * Rules applied (in order):
 *   1. `(href|src|action)="/_astro/...` → `(href|src|action)="_astro/...`
 *   2. `(href|src)="/favicon...`        → `(href|src)="favicon...`
 *   3. Cross-page report nav links to `/deliverables/<slug>(/.*)?` are
 *      rewritten to the matching `index.html` / `<tab>.html` filename.
 *   4. The DeliverableLayout back-link `/clients/<slug>` becomes
 *      `index.html` — when the report is shared standalone, the operator
 *      dashboard URL is meaningless so we land users back on the cover.
 *   5. Any remaining `(href|src)="/<path>"` is reported via the supplied
 *      `onUnrewritten` callback (when provided) but otherwise left alone.
 *
 * @param html - The raw HTML emitted by the SSR dashboard.
 * @param slug - The client slug whose deliverables are being exported.
 * @param onUnrewritten - Optional callback invoked once per unanticipated
 *   absolute path encountered after the known rules have been applied.
 * @returns The rewritten HTML string.
 */
export function rewriteHtml(
  html: string,
  slug: string,
  onUnrewritten?: (match: string) => void,
): string {
  const slugEsc = escapeRegExp(slug);
  let out = html;

  // 1. Astro asset bundle.
  out = out.replace(/(href|src|action)="\/_astro\//g, '$1="_astro/');

  // 2. Favicon and other root-level static assets named `favicon*`.
  out = out.replace(/(href|src)="\/favicon/g, '$1="favicon');

  // 3. Cross-page report nav links produced by ReportLayout.
  //    Order matters: longest path first so `/scorecard` etc. don't collide
  //    with the bare `/deliverables/<slug>` route.
  const tabMap: Array<{ suffix: string; file: string }> = [
    { suffix: '/scorecard', file: 'scorecard.html' },
    { suffix: '/findings', file: 'findings.html' },
    { suffix: '/next-steps', file: 'next-steps.html' },
    { suffix: '', file: 'index.html' },
  ];
  for (const { suffix, file } of tabMap) {
    const re = new RegExp(`href="/deliverables/${slugEsc}${escapeRegExp(suffix)}"`, 'g');
    out = out.replace(re, `href="${file}"`);
  }

  // 4. DeliverableLayout back-link to the operator dashboard.
  const backRe = new RegExp(`href="/clients/${slugEsc}"`, 'g');
  out = out.replace(backRe, 'href="index.html"');

  // 5. Surface any remaining absolute paths so we can extend the rules.
  if (onUnrewritten) {
    const remaining = /(?:href|src)="(\/[^"#?]*)"/g;
    let m: RegExpExecArray | null;
    while ((m = remaining.exec(out)) !== null) {
      const path = m[1];
      if (path === undefined) continue;
      onUnrewritten(path);
    }
  }

  return out;
}
