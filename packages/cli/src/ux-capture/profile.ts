/**
 * Playwright-driven UX profiler. For each live URL we capture:
 *
 *   - Carousels: every element matching common carousel patterns (Swiper,
 *     Slick, Flickity, Square Online's slideshow, generic [aria-roledescription=carousel]),
 *     with slide count, navigation chrome (dots/arrows), and a measured
 *     autoplay interval (sampled by polling DOM mutations for ~12s).
 *   - Animations: active CSS animations / Web Animations API entries via
 *     Element.getAnimations(), grouped by selector path with duration and
 *     type (transform / opacity / color).
 *   - Sticky / fixed elements: every element whose computed position is
 *     `sticky` or `fixed`, with rect + background. Catches sticky nav,
 *     floating CTAs, sticky cookie banners.
 *   - Hover effects: simulate hover on every visible <a> / <button> /
 *     [role=button] inside the viewport, snapshot computed style diffs
 *     against the resting state. Limited to 24 elements per page so we
 *     don't spend a minute on a busy page.
 *   - Scroll effects: take 5 screenshots at 0/25/50/75/100% scroll and
 *     stitch into a flipbook PNG. Shows sticky behavior, parallax,
 *     fade-in-on-scroll, etc.
 *   - Videos / iframes: source, autoplay, muted, loop attrs.
 *
 * Optionally records a 10-second video of: page load → scroll to bottom →
 * scroll back to top. Saved as `<page>.webm`.
 *
 * Output: `clients/<slug>/ux-profile/<page>.json` and optional flipbook PNG
 * + video. Designed so the clone agent prompt can read the JSON and faithfully
 * reproduce interactive behavior.
 */
import { mkdirSync, existsSync, createWriteStream, createReadStream } from 'node:fs';
import { join } from 'node:path';

import type { Browser, Page, BrowserContext } from 'playwright';

export interface CarouselInfo {
  selector: string;
  pattern: string;
  slideCount: number;
  hasDots: boolean;
  hasArrows: boolean;
  autoplay: boolean;
  intervalMs: number | null;
  initialSlide: string | null;
}

export interface AnimationInfo {
  selector: string;
  property: string;
  durationMs: number;
  iterations: number | 'infinite';
}

export interface StickyInfo {
  selector: string;
  position: 'sticky' | 'fixed';
  top: number | null;
  bottom: number | null;
  zIndex: number;
  background: string;
  rect: { x: number; y: number; width: number; height: number };
}

export interface HoverEffectInfo {
  selector: string;
  text: string;
  changes: string[];
}

export interface VideoInfo {
  selector: string;
  src: string;
  autoplay: boolean;
  muted: boolean;
  loop: boolean;
  controls: boolean;
}

export interface IframeInfo {
  selector: string;
  src: string;
  width: number;
  height: number;
}

export interface UxProfile {
  url: string;
  viewport: 'desktop' | 'mobile';
  capturedAt: string;
  pageHeight: number;
  carousels: CarouselInfo[];
  animations: AnimationInfo[];
  sticky: StickyInfo[];
  hoverEffects: HoverEffectInfo[];
  videos: VideoInfo[];
  iframes: IframeInfo[];
  flipbookPath?: string;
  videoPath?: string;
}

interface CaptureOptions {
  url: string;
  pageSlug: string;
  outDir: string;
  viewport: 'desktop' | 'mobile';
  recordVideo: boolean;
  flipbook: boolean;
  /** How long to watch carousels for autoplay timing measurements (ms). */
  carouselWatchMs: number;
  /** Max number of CTAs to probe for hover states. */
  hoverProbeLimit: number;
}

export async function captureUxProfile(
  browser: Browser,
  opts: CaptureOptions,
): Promise<UxProfile> {
  const viewport =
    opts.viewport === 'desktop'
      ? { width: 1440, height: 900 }
      : { width: 414, height: 896 };

  const ctxOpts: Parameters<Browser['newContext']>[0] = {
    viewport,
    isMobile: opts.viewport === 'mobile',
    deviceScaleFactor: 1,
  };
  if (opts.recordVideo) {
    ctxOpts.recordVideo = { dir: opts.outDir, size: viewport };
  }

  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  let videoPath: string | undefined;

  try {
    await page.goto(opts.url, { waitUntil: 'networkidle', timeout: 45_000 });
    // Trigger lazy content
    await page.evaluate(async () => {
      const total = document.documentElement.scrollHeight;
      for (let y = 0; y < total; y += 600) {
        window.scrollTo(0, y);
        await new Promise((r) => setTimeout(r, 80));
      }
      window.scrollTo(0, 0);
      await new Promise((r) => setTimeout(r, 200));
    });

    const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);

    const [carousels, animations, sticky, videos, iframes] = await Promise.all([
      detectCarousels(page, opts.carouselWatchMs),
      detectAnimations(page),
      detectSticky(page),
      detectVideos(page),
      detectIframes(page),
    ]);

    const hoverEffects = await captureHoverEffects(page, opts.hoverProbeLimit);

    let flipbookPath: string | undefined;
    if (opts.flipbook) {
      flipbookPath = join(opts.outDir, `${opts.pageSlug}-${opts.viewport}-flipbook.png`);
      await captureFlipbook(page, pageHeight, viewport, flipbookPath);
    }

    if (opts.recordVideo) {
      // Drive a short scroll choreography for the recording.
      await page.evaluate(async () => {
        await new Promise((r) => setTimeout(r, 600));
        const total = document.documentElement.scrollHeight;
        for (let y = 0; y < total; y += 200) {
          window.scrollTo(0, y);
          await new Promise((r) => setTimeout(r, 60));
        }
        await new Promise((r) => setTimeout(r, 400));
        window.scrollTo(0, 0);
        await new Promise((r) => setTimeout(r, 600));
      });
      videoPath = join(opts.outDir, `${opts.pageSlug}-${opts.viewport}.webm`);
      const v = page.video();
      // Close ctx first so the video flushes, then move it to the desired path.
      await ctx.close();
      if (v) {
        const original = await v.path();
        try {
          // Stream-copy so we don't depend on rename across mounts.
          await new Promise<void>((res, rej) => {
            createReadStream(original)
              .pipe(createWriteStream(videoPath!))
              .on('finish', () => res())
              .on('error', rej);
          });
        } catch {
          videoPath = original;
        }
      }
    } else {
      await ctx.close();
    }

    const profile: UxProfile = {
      url: opts.url,
      viewport: opts.viewport,
      capturedAt: new Date().toISOString(),
      pageHeight,
      carousels,
      animations,
      sticky,
      hoverEffects,
      videos,
      iframes,
    };
    if (flipbookPath) profile.flipbookPath = flipbookPath;
    if (videoPath) profile.videoPath = videoPath;
    return profile;
  } catch (err) {
    try {
      await ctx.close();
    } catch {
      /* ignore */
    }
    throw err;
  }
}

async function detectCarousels(page: Page, watchMs: number): Promise<CarouselInfo[]> {
  // Find candidates first (cheap), then watch for autoplay (expensive).
  const candidates = await page.evaluate(() => {
    type Cand = { selector: string; pattern: string; slideCount: number; hasDots: boolean; hasArrows: boolean; initialSlide: string | null };
    const out: Cand[] = [];
    const seen = new Set<Element>();

    const cssPath = (el: Element): string => {
      const parts: string[] = [];
      let cur: Element | null = el;
      let depth = 0;
      while (cur && cur.nodeType === 1 && depth < 6) {
        const tag = cur.tagName.toLowerCase();
        const id = (cur as HTMLElement).id;
        if (id) {
          parts.unshift(`${tag}#${id}`);
          break;
        }
        let sel = tag;
        const cls = ((cur as HTMLElement).className || '')
          .toString()
          .trim()
          .split(/\s+/)
          .filter((c) => c && !/^(active|is-|has-)/.test(c))
          .slice(0, 2);
        if (cls.length) sel += '.' + cls.join('.');
        parts.unshift(sel);
        cur = cur.parentElement;
        depth++;
      }
      return parts.join(' > ');
    };

    const PATTERNS: Array<[string, string, string]> = [
      ['.swiper', 'swiper', '.swiper-slide'],
      ['.slick-slider', 'slick', '.slick-slide:not(.slick-cloned)'],
      ['.flickity-enabled', 'flickity', '.flickity-slider > *'],
      ['.glide', 'glide', '.glide__slide'],
      ['.splide', 'splide', '.splide__slide'],
      ['[data-v-square-slideshow]', 'square-slideshow', '[data-v-square-slideshow] > *'],
      ['[role="region"][aria-roledescription="carousel"]', 'aria-carousel', '[role="group"]'],
      ['.carousel', 'generic-carousel', '.carousel-item, .carousel-slide, [role="group"]'],
    ];

    for (const [rootSel, pattern, slideSel] of PATTERNS) {
      for (const root of Array.from(document.querySelectorAll(rootSel))) {
        if (seen.has(root)) continue;
        seen.add(root);
        const slides = root.querySelectorAll(slideSel);
        if (slides.length < 2) continue;
        const dots = !!root.querySelector(
          '.swiper-pagination, .slick-dots, .flickity-page-dots, .glide__bullets, .splide__pagination, [role="tablist"]',
        );
        const arrows = !!root.querySelector(
          '.swiper-button-next, .slick-next, .flickity-prev-next-button, .glide__arrow, .splide__arrow',
        );
        const firstActive = root.querySelector(
          '.swiper-slide-active, .slick-active, .is-selected, .glide__slide--active, .splide__slide.is-active, [aria-current="true"]',
        );
        out.push({
          selector: cssPath(root),
          pattern,
          slideCount: slides.length,
          hasDots: dots,
          hasArrows: arrows,
          initialSlide: firstActive ? cssPath(firstActive) : null,
        });
      }
    }

    // Heuristic fallback: any wrapper with >= 2 visually-overlapping siblings
    // sized like the wrapper (≥ 80% width). Catches custom carousels.
    if (out.length === 0) {
      for (const wrap of Array.from(document.querySelectorAll('section, div'))) {
        const kids = (wrap as HTMLElement).children;
        if (kids.length < 2 || kids.length > 12) continue;
        const wrapW = (wrap as HTMLElement).getBoundingClientRect().width;
        if (wrapW < 320) continue;
        let stacked = 0;
        const positions = new Set<string>();
        for (const k of Array.from(kids)) {
          const r = (k as HTMLElement).getBoundingClientRect();
          if (r.width >= wrapW * 0.8 && r.height > 80) stacked++;
          positions.add(`${Math.round(r.x)},${Math.round(r.y)}`);
        }
        if (stacked >= 2 && positions.size === 1) {
          // All children at same position = stacked = carousel-like
          out.push({
            selector: cssPath(wrap),
            pattern: 'stacked-heuristic',
            slideCount: kids.length,
            hasDots: !!wrap.querySelector('button, [role="tab"]'),
            hasArrows: false,
            initialSlide: null,
          });
          if (out.length >= 4) break;
        }
      }
    }

    return out;
  });

  if (candidates.length === 0) return [];

  // Measure autoplay intervals by watching active-slide changes.
  const watched: CarouselInfo[] = [];
  for (const c of candidates) {
    const result = await page.evaluate(
      async ({ selector, pattern, watchMs }) => {
        const root = document.querySelector(selector);
        if (!root) return { autoplay: false, intervalMs: null as number | null };
        const ACTIVE_SELS = [
          '.swiper-slide-active',
          '.slick-active',
          '.is-selected',
          '.glide__slide--active',
          '.splide__slide.is-active',
          '[aria-current="true"]',
        ];
        const findActive = () => {
          for (const s of ACTIVE_SELS) {
            const el = root.querySelector(s);
            if (el) return el;
          }
          return null;
        };
        const ts: number[] = [];
        let last = findActive();
        const start = performance.now();
        await new Promise<void>((res) => {
          const tick = () => {
            const cur = findActive();
            if (cur && cur !== last) {
              ts.push(performance.now() - start);
              last = cur;
            }
            if (performance.now() - start < watchMs) requestAnimationFrame(tick);
            else res();
          };
          requestAnimationFrame(tick);
        });
        if (ts.length < 2) return { autoplay: false, intervalMs: null };
        const deltas = ts.slice(1).map((t, i) => t - ts[i]!);
        const avg = deltas.reduce((a, b) => a + b, 0) / deltas.length;
        return { autoplay: true, intervalMs: Math.round(avg) };
      },
      { selector: c.selector, pattern: c.pattern, watchMs },
    );
    watched.push({ ...c, ...result });
  }
  return watched;
}

async function detectAnimations(page: Page): Promise<AnimationInfo[]> {
  return page.evaluate(() => {
    const out: { selector: string; property: string; durationMs: number; iterations: number | 'infinite' }[] = [];
    const seen = new Set<string>();
    for (const el of Array.from(document.querySelectorAll('*'))) {
      const anims = (el as HTMLElement & { getAnimations?: () => Animation[] }).getAnimations?.();
      if (!anims || anims.length === 0) continue;
      for (const a of anims) {
        const eff = a.effect as KeyframeEffect | null;
        const timing = eff?.getTiming();
        if (!timing) continue;
        const dur = typeof timing.duration === 'number' ? timing.duration : 0;
        if (dur < 50) continue; // ignore micro-flickers
        const iter = timing.iterations === Infinity ? 'infinite' : (timing.iterations || 1);
        // Build a short selector
        const tag = el.tagName.toLowerCase();
        const id = (el as HTMLElement).id;
        const cls = ((el as HTMLElement).className || '').toString().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
        const sel = id ? `${tag}#${id}` : cls ? `${tag}.${cls}` : tag;
        const property = (eff as { composite?: string }).composite ?? 'opacity-or-transform';
        const key = `${sel}|${dur}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({ selector: sel, property, durationMs: Math.round(dur), iterations: iter as number | 'infinite' });
        if (out.length >= 30) break;
      }
      if (out.length >= 30) break;
    }
    return out;
  });
}

async function detectSticky(page: Page): Promise<StickyInfo[]> {
  return page.evaluate(() => {
    const out: StickyInfo[] = [];
    const W = window.innerWidth;
    for (const el of Array.from(document.querySelectorAll('header, nav, aside, footer, div, section'))) {
      const cs = getComputedStyle(el);
      if (cs.position !== 'sticky' && cs.position !== 'fixed') continue;
      const rect = (el as HTMLElement).getBoundingClientRect();
      if (rect.width < 60 || rect.height < 30) continue;
      // Skip offscreen tooltips / hidden tray.
      if (rect.width / W < 0.2 && cs.opacity === '0') continue;
      const tag = el.tagName.toLowerCase();
      const id = (el as HTMLElement).id;
      const cls = ((el as HTMLElement).className || '').toString().split(/\s+/).filter(Boolean).slice(0, 2).join('.');
      out.push({
        selector: id ? `${tag}#${id}` : cls ? `${tag}.${cls}` : tag,
        position: cs.position as 'sticky' | 'fixed',
        top: cs.top !== 'auto' ? parseInt(cs.top, 10) : null,
        bottom: cs.bottom !== 'auto' ? parseInt(cs.bottom, 10) : null,
        zIndex: parseInt(cs.zIndex, 10) || 0,
        background: cs.backgroundColor,
        rect: { x: Math.round(rect.x), y: Math.round(rect.y), width: Math.round(rect.width), height: Math.round(rect.height) },
      });
      if (out.length >= 10) break;
    }
    return out;
  });
}

interface StyleSnapshot { color: string; bg: string; border: string; transform: string; textDecoration: string; opacity: string }

async function captureHoverEffects(page: Page, limit: number): Promise<HoverEffectInfo[]> {
  // Pull the elements + their resting style server-side.
  const seeds = await page.evaluate((max: number) => {
    const targets = Array.from(
      document.querySelectorAll('a[href], button, [role="button"]'),
    ) as HTMLElement[];
    const visible = targets.filter((t) => {
      const r = t.getBoundingClientRect();
      const cs = getComputedStyle(t);
      return r.width > 20 && r.height > 16 && cs.visibility !== 'hidden' && cs.display !== 'none';
    });
    // Prefer visually large CTAs first.
    visible.sort((a, b) => {
      const ar = a.getBoundingClientRect();
      const br = b.getBoundingClientRect();
      return br.width * br.height - ar.width * ar.height;
    });
    return visible.slice(0, max).map((el, i) => {
      el.setAttribute('data-ux-probe', String(i));
      const cs = getComputedStyle(el);
      return {
        idx: i,
        text: (el.textContent || '').trim().slice(0, 60),
        rest: {
          color: cs.color,
          bg: cs.backgroundColor,
          border: cs.borderColor,
          transform: cs.transform,
          textDecoration: cs.textDecorationLine,
          opacity: cs.opacity,
        } as StyleSnapshot,
      };
    });
  }, limit);

  const out: HoverEffectInfo[] = [];
  for (const seed of seeds) {
    const sel = `[data-ux-probe="${seed.idx}"]`;
    try {
      await page.hover(sel, { timeout: 1500 });
      await page.waitForTimeout(160);
      const after = await page.evaluate((s: string) => {
        const el = document.querySelector(s);
        if (!el) return null;
        const cs = getComputedStyle(el);
        return {
          color: cs.color,
          bg: cs.backgroundColor,
          border: cs.borderColor,
          transform: cs.transform,
          textDecoration: cs.textDecorationLine,
          opacity: cs.opacity,
        } as StyleSnapshot;
      }, sel);
      if (!after) continue;
      const changes: string[] = [];
      for (const k of Object.keys(seed.rest) as (keyof StyleSnapshot)[]) {
        if (seed.rest[k] !== after[k]) changes.push(`${k}: ${seed.rest[k]} → ${after[k]}`);
      }
      if (changes.length === 0) continue;
      out.push({ selector: sel, text: seed.text, changes });
    } catch {
      /* ignore unhoverable */
    }
  }
  // Move mouse away to avoid lingering hover bias on next captures.
  await page.mouse.move(0, 0).catch(() => undefined);
  return out;
}

async function detectVideos(page: Page): Promise<VideoInfo[]> {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('video')).map((v, i) => {
      const tag = (v as HTMLElement).tagName.toLowerCase();
      const id = (v as HTMLElement).id;
      return {
        selector: id ? `${tag}#${id}` : `${tag}:nth-of-type(${i + 1})`,
        src: (v as HTMLVideoElement).currentSrc || (v as HTMLVideoElement).src || '',
        autoplay: (v as HTMLVideoElement).autoplay,
        muted: (v as HTMLVideoElement).muted,
        loop: (v as HTMLVideoElement).loop,
        controls: (v as HTMLVideoElement).controls,
      };
    });
  });
}

async function detectIframes(page: Page): Promise<IframeInfo[]> {
  return page.evaluate(() => {
    return Array.from(document.querySelectorAll('iframe'))
      .filter((f) => (f as HTMLIFrameElement).src && !(f as HTMLIFrameElement).src.startsWith('about:'))
      .map((f, i) => {
        const r = (f as HTMLIFrameElement).getBoundingClientRect();
        const id = (f as HTMLElement).id;
        return {
          selector: id ? `iframe#${id}` : `iframe:nth-of-type(${i + 1})`,
          src: (f as HTMLIFrameElement).src,
          width: Math.round(r.width),
          height: Math.round(r.height),
        };
      })
      .slice(0, 10);
  });
}

async function captureFlipbook(
  page: Page,
  pageHeight: number,
  viewport: { width: number; height: number },
  outPath: string,
): Promise<void> {
  // Resolve PNG lazily so this module stays import-side-effect-free.
  const { PNG } = await import('pngjs');

  const stops = [0, 0.25, 0.5, 0.75, 1];
  const max = Math.max(0, pageHeight - viewport.height);
  const frames: Buffer[] = [];
  for (const s of stops) {
    const y = Math.round(max * s);
    await page.evaluate((yy: number) => window.scrollTo(0, yy), y);
    await page.waitForTimeout(220);
    const buf = await page.screenshot({ type: 'png' });
    frames.push(buf);
  }

  // Decode → stitch horizontally
  const pngs = await Promise.all(
    frames.map(
      (buf) =>
        new Promise<InstanceType<typeof PNG>>((res, rej) => {
          const p = new PNG();
          p.parse(buf, (err: Error | null) => (err ? rej(err) : res(p)));
        }),
    ),
  );
  const w = pngs[0]!.width;
  const h = pngs[0]!.height;
  const out = new PNG({ width: w * pngs.length + 16 * (pngs.length - 1), height: h });
  out.data.fill(0xff);
  let x = 0;
  for (const p of pngs) {
    PNG.bitblt(p, out, 0, 0, w, h, x, 0);
    x += w + 16;
  }
  await new Promise<void>((res, rej) => {
    out.pack().pipe(createWriteStream(outPath)).on('finish', () => res()).on('error', rej);
  });
}

export async function ensureDir(p: string): Promise<void> {
  if (!existsSync(p)) mkdirSync(p, { recursive: true });
}
