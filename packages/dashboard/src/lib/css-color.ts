/**
 * Strict validation for scraped CSS color tokens.
 *
 * Extracted from `components/astro/CoverHeader.astro` so the gate is unit
 * testable. The accent color comes from a Firecrawl branding profile — i.e.
 * scraped, untrusted input — and is interpolated into an inline `style`
 * attribute, so a prefix check is not enough: `#fff;background:url(...)` or
 * `rgb(0,0,0)}body{...}` must be rejected outright. Each pattern matches the
 * FULL value and admits no `;`, `}`, quotes, or nested `(`/`url(`.
 */
const CSS_COLOR_PATTERNS: ReadonlyArray<RegExp> = [
  /^#[0-9a-fA-F]{3,8}$/,
  /^rgba?\(\s*[\d.,\s%]+\)$/,
  /^hsla?\(\s*[\d.,\s%deg]+\)$/,
];

/**
 * True iff `value` (trimmed) is a recognizable hex/rgb()/hsl() color in its
 * entirety. Anything else — including values that merely START with a color —
 * is rejected, and callers fall back to the default accent.
 *
 * @param value - Scraped color token (untrusted).
 * @returns Type-narrowing boolean.
 */
export function isValidCssColor(value: string | undefined | null): value is string {
  if (!value || typeof value !== 'string') return false;
  const trimmed = value.trim();
  return CSS_COLOR_PATTERNS.some((re) => re.test(trimmed));
}
