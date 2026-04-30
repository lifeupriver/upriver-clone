/**
 * Capture typography + logo dimensions from a live site by booting a real
 * browser, navigating to the homepage, and reading `getComputedStyle` for
 * every key element role.
 *
 * Output structure is consumed by the scaffold's `applyDesignTokens` step
 * so the cloned site emits CSS custom properties that match the live site
 * pixel-for-pixel. If the live font isn't a free Google Fonts family, the
 * scaffold's `resolveFont` substitute table maps it to the closest match
 * (e.g. "Square Market" → Inter).
 */

import type { Browser } from 'playwright';

export interface RoleStyle {
  /** Quoted CSS font-family list as the browser computed it. */
  fontFamily: string;
  /** First family token, lower-cased and unquoted (the substitution key). */
  primaryFamily: string;
  fontSizePx: number;
  fontWeight: number;
  lineHeightPx: number | null;
  letterSpacingPx: number | null;
  textTransform: string;
  fontStyle: string;
}

export interface LogoMeasurement {
  /** Rendered bounding box in CSS pixels. */
  width: number;
  height: number;
  /** Natural intrinsic dimensions of the source image. */
  naturalWidth: number;
  naturalHeight: number;
  /** Source URL the logo loaded from. */
  src: string;
}

export interface TypographyCapture {
  url: string;
  capturedAt: string;
  viewport: { width: number; height: number };
  body: RoleStyle;
  h1: RoleStyle | null;
  h2: RoleStyle | null;
  h3: RoleStyle | null;
  h4: RoleStyle | null;
  link: RoleStyle | null;
  button: RoleStyle | null;
  navLink: RoleStyle | null;
  /** Distinct font families that actually rendered (after fallbacks resolved). */
  observedFamilies: string[];
  logo: LogoMeasurement | null;
}

const DESKTOP_VIEWPORT = { width: 1440, height: 900 };

export async function captureTypography(
  browser: Browser,
  url: string,
): Promise<TypographyCapture> {
  const ctx = await browser.newContext({
    viewport: DESKTOP_VIEWPORT,
    deviceScaleFactor: 1,
  });
  const page = await ctx.newPage();
  try {
    await page.goto(url, { waitUntil: 'networkidle', timeout: 45_000 });
    // Allow custom-font load to settle.
    await page.evaluate(() => (document as Document & { fonts?: { ready?: Promise<unknown> } }).fonts?.ready);
    await page.waitForTimeout(200);

    const result = await page.evaluate(() => {
      const px = (s: string): number | null => {
        const n = parseFloat(s);
        return Number.isFinite(n) ? n : null;
      };

      const styleOf = (el: Element | null) => {
        if (!el) return null;
        const cs = getComputedStyle(el);
        const family = cs.fontFamily;
        const primary = (family.split(',')[0] || '').replace(/['"]/g, '').trim().toLowerCase();
        const lh = cs.lineHeight === 'normal' ? null : px(cs.lineHeight);
        const ls = cs.letterSpacing === 'normal' ? null : px(cs.letterSpacing);
        return {
          fontFamily: family,
          primaryFamily: primary,
          fontSizePx: px(cs.fontSize) ?? 16,
          fontWeight: parseInt(cs.fontWeight, 10) || 400,
          lineHeightPx: lh,
          letterSpacingPx: ls,
          textTransform: cs.textTransform,
          fontStyle: cs.fontStyle,
        };
      };

      // Find first visible element matching selector.
      const firstVisible = (sel: string): Element | null => {
        const els = Array.from(document.querySelectorAll(sel));
        for (const el of els) {
          const r = (el as HTMLElement).getBoundingClientRect();
          const cs = getComputedStyle(el);
          if (r.width < 1 || r.height < 1) continue;
          if (cs.display === 'none' || cs.visibility === 'hidden') continue;
          if ((el.textContent || '').trim().length < 1 && el.tagName !== 'IMG' && el.tagName !== 'BUTTON') continue;
          return el;
        }
        return null;
      };

      const findLogo = (): { el: HTMLImageElement; src: string } | null => {
        const candidates: HTMLImageElement[] = [];
        const headerImgs = Array.from(document.querySelectorAll('header img, nav img, [class*="logo" i] img, [id*="logo" i] img, [class*="brand" i] img, a[href="/"] img, a[href$="/"] img')) as HTMLImageElement[];
        for (const img of headerImgs) {
          const r = img.getBoundingClientRect();
          if (r.width < 16 || r.height < 16) continue;
          if (r.top > 400) continue; // headers are at the top
          candidates.push(img);
        }
        // Also any <img> with alt or src containing "logo".
        for (const img of Array.from(document.querySelectorAll('img')) as HTMLImageElement[]) {
          const r = img.getBoundingClientRect();
          if (r.width < 16 || r.height < 16) continue;
          if (r.top > 400) continue;
          const alt = (img.alt || '').toLowerCase();
          const src = (img.currentSrc || img.src || '').toLowerCase();
          if (alt.includes('logo') || src.includes('logo') || alt.includes('brand') || src.includes('brand')) {
            candidates.push(img);
          }
        }
        if (candidates.length === 0) return null;
        // Prefer leftmost (header-left convention), then topmost.
        candidates.sort((a, b) => {
          const ar = a.getBoundingClientRect();
          const br = b.getBoundingClientRect();
          return ar.left - br.left || ar.top - br.top;
        });
        const el = candidates[0]!;
        return { el, src: el.currentSrc || el.src };
      };

      const observedFamilies = new Set<string>();
      const collectFamily = (s: ReturnType<typeof styleOf>): void => {
        if (s) observedFamilies.add(s.primaryFamily);
      };

      const body = styleOf(document.body)!;
      collectFamily(body);

      const h1 = styleOf(firstVisible('h1'));
      collectFamily(h1);
      const h2 = styleOf(firstVisible('h2'));
      collectFamily(h2);
      const h3 = styleOf(firstVisible('h3'));
      collectFamily(h3);
      const h4 = styleOf(firstVisible('h4'));
      collectFamily(h4);

      // Link inside the main content (not nav).
      const linkEl =
        firstVisible('main a[href], article a[href]') ?? firstVisible('a[href]');
      const link = styleOf(linkEl);
      collectFamily(link);

      // Button (prefer styled, sized).
      const button = styleOf(firstVisible('button, [role="button"], input[type="submit"]'));
      collectFamily(button);

      // Nav link.
      const navLinkEl = firstVisible('header nav a[href], nav a[href]');
      const navLink = styleOf(navLinkEl);
      collectFamily(navLink);

      const logoFound = findLogo();
      const logo = logoFound
        ? (() => {
            const r = logoFound.el.getBoundingClientRect();
            return {
              width: Math.round(r.width),
              height: Math.round(r.height),
              naturalWidth: logoFound.el.naturalWidth,
              naturalHeight: logoFound.el.naturalHeight,
              src: logoFound.src,
            };
          })()
        : null;

      return {
        body,
        h1,
        h2,
        h3,
        h4,
        link,
        button,
        navLink,
        observedFamilies: Array.from(observedFamilies).sort(),
        logo,
      };
    });

    return {
      url,
      capturedAt: new Date().toISOString(),
      viewport: DESKTOP_VIEWPORT,
      ...result,
    };
  } finally {
    await ctx.close();
  }
}
