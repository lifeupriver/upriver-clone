import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';

import pixelmatch from 'pixelmatch';
import { PNG } from 'pngjs';

/**
 * Per-page pixel-diff outcome produced by {@link computePixelScore}.
 */
export interface PixelDiffResult {
  totalPixels: number;
  matchedPixels: number;
  differingPixels: number;
  /** 0-100. 100 = identical (or no usable comparison images). */
  score: number;
  /** Path to the diff PNG written, or null when one side was missing. */
  diffPath: string | null;
}

/**
 * Per-page copy-completeness outcome produced by {@link computeCopyScore}.
 */
export interface CopyDiffResult {
  liveTokens: number;
  cloneTokens: number;
  sharedTokens: number;
  /** Up to 30 sample words present live, missing in clone. */
  missingFromClone: string[];
  /** 0-100. 100 = clone covers all live tokens. */
  score: number;
}

/**
 * Combined fidelity result for a single cloned page.
 */
export interface PageFidelity {
  pageSlug: string;
  pixel: PixelDiffResult;
  copy: CopyDiffResult;
  /** Weighted overall score = 0.6 * pixel.score + 0.4 * copy.score. */
  overall: number;
  status: 'scored' | 'no-live-shot' | 'no-clone-shot' | 'error';
  errorMessage?: string;
}

/**
 * Aggregated fidelity summary written to `clone-qa/summary.json`.
 */
export interface FidelitySummary {
  generatedAt: string;
  overall: number;
  pages: PageFidelity[];
}

const PIXEL_WEIGHT = 0.6;
const COPY_WEIGHT = 0.4;
const MISSING_TOKEN_SAMPLE_LIMIT = 30;
const MIN_TOKEN_LENGTH = 3;

/**
 * Tokenize markdown / plain text into a Set of lowercase tokens.
 *
 * Strategy: lowercase the input, split on any non-alphanumeric run, drop tokens
 * shorter than 3 characters. Unicode is intentionally not preserved (the source
 * markdown is ASCII-leaning); this is fine for an MVP completeness signal.
 *
 * @param text - Raw text to tokenize.
 * @returns Set of unique lowercase tokens (length >= 3, alphanumeric only).
 */
export function tokenize(text: string): Set<string> {
  const out = new Set<string>();
  if (!text) return out;
  const parts = text.toLowerCase().split(/[^a-z0-9]+/);
  for (const t of parts) {
    if (t.length >= MIN_TOKEN_LENGTH) out.add(t);
  }
  return out;
}

/**
 * Compare live-text and clone-text token sets and produce a CopyDiffResult.
 * Score = round(100 * shared / max(1, liveTokens)). Captures up to 30
 * sampled tokens that live has but clone is missing for diagnostics.
 *
 * @param liveText - The live page's extracted text (e.g. content.markdown).
 * @param cloneText - The cloned Astro page's extracted visible text.
 * @returns CopyDiffResult with token counts, sample missing tokens, and score.
 */
export function computeCopyScore(liveText: string, cloneText: string): CopyDiffResult {
  const liveSet = tokenize(liveText);
  const cloneSet = tokenize(cloneText);
  const missing: string[] = [];
  let shared = 0;
  for (const t of liveSet) {
    if (cloneSet.has(t)) {
      shared += 1;
    } else if (missing.length < MISSING_TOKEN_SAMPLE_LIMIT) {
      missing.push(t);
    }
  }
  const denom = Math.max(1, liveSet.size);
  const score = Math.round((100 * shared) / denom);
  return {
    liveTokens: liveSet.size,
    cloneTokens: cloneSet.size,
    sharedTokens: shared,
    missingFromClone: missing,
    score,
  };
}

/**
 * Read a PNG file synchronously into a {@link PNG} instance.
 * Returns null if the file is missing or unreadable.
 *
 * @param path - Absolute path to a PNG file.
 * @returns Parsed PNG, or null on any IO/decode failure.
 */
function readPng(path: string): PNG | null {
  if (!existsSync(path)) return null;
  try {
    const buf = readFileSync(path);
    return PNG.sync.read(buf);
  } catch {
    return null;
  }
}

/**
 * Crop an RGBA buffer to a smaller (width, height) by slicing the top-left
 * region. No scaling — we keep dependencies light and avoid the cost of
 * resampling. Returns a fresh Buffer of length cropW * cropH * 4.
 *
 * @param src - Source RGBA buffer (rowstride = srcW * 4).
 * @param srcW - Source width in pixels.
 * @param cropW - Target width in pixels (<= srcW).
 * @param cropH - Target height in pixels (<= source height).
 * @returns A new Buffer containing the cropped RGBA region.
 */
function cropRgba(src: Buffer, srcW: number, cropW: number, cropH: number): Buffer {
  if (srcW === cropW) {
    return Buffer.from(src.subarray(0, cropW * cropH * 4));
  }
  const out = Buffer.alloc(cropW * cropH * 4);
  const srcStride = srcW * 4;
  const dstStride = cropW * 4;
  for (let y = 0; y < cropH; y += 1) {
    src.copy(out, y * dstStride, y * srcStride, y * srcStride + dstStride);
  }
  return out;
}

/**
 * Compare two PNG files using pixelmatch. The larger image is cropped (not
 * scaled) to the smaller's width and height; this keeps the dependency
 * surface small and avoids the cost of resampling. A diff PNG showing
 * per-pixel differences is written to `diffOutPath`.
 *
 * If either side is missing or unreadable, returns `score: 0` and
 * `diffPath: null` with the appropriate counts zeroed out.
 *
 * @param livePath - Absolute path to the live screenshot PNG.
 * @param clonePath - Absolute path to the clone screenshot PNG.
 * @param diffOutPath - Absolute path where the diff PNG should be written.
 * @returns PixelDiffResult with counts, score, and the diff path (or null).
 */
export async function computePixelScore(
  livePath: string,
  clonePath: string,
  diffOutPath: string,
): Promise<PixelDiffResult> {
  const live = readPng(livePath);
  const clone = readPng(clonePath);
  if (!live || !clone) {
    return {
      totalPixels: 0,
      matchedPixels: 0,
      differingPixels: 0,
      score: 0,
      diffPath: null,
    };
  }
  const w = Math.min(live.width, clone.width);
  const h = Math.min(live.height, clone.height);
  const liveBuf = cropRgba(live.data, live.width, w, h);
  const cloneBuf = cropRgba(clone.data, clone.width, w, h);
  const diffPng = new PNG({ width: w, height: h });
  const differingPixels = pixelmatch(liveBuf, cloneBuf, diffPng.data, w, h, {
    threshold: 0.1,
    alpha: 0.4,
  });
  mkdirSync(dirname(diffOutPath), { recursive: true });
  writeFileSync(diffOutPath, PNG.sync.write(diffPng));
  const totalPixels = w * h;
  const matchedPixels = totalPixels - differingPixels;
  const score = totalPixels === 0
    ? 0
    : Math.round(100 * (1 - differingPixels / totalPixels));
  return {
    totalPixels,
    matchedPixels,
    differingPixels,
    score,
    diffPath: diffOutPath,
  };
}

/** Args for {@link scorePage}. */
export interface ScorePageArgs {
  pageSlug: string;
  livePath: string | null;
  clonePath: string | null;
  diffOutPath: string;
  liveText: string;
  cloneText: string;
}

/**
 * Compute a single page's fidelity given screenshot paths and extracted text.
 * Resolves to a PageFidelity describing pixel + copy results, the weighted
 * overall, and a status indicating whether scoring proceeded.
 *
 * @param args - See {@link ScorePageArgs}.
 * @returns PageFidelity with status `'scored' | 'no-live-shot' | 'no-clone-shot' | 'error'`.
 */
export async function scorePage(args: ScorePageArgs): Promise<PageFidelity> {
  const { pageSlug, livePath, clonePath, diffOutPath, liveText, cloneText } = args;
  const copy = computeCopyScore(liveText, cloneText);
  if (!livePath || !existsSync(livePath)) {
    return {
      pageSlug,
      pixel: { totalPixels: 0, matchedPixels: 0, differingPixels: 0, score: 0, diffPath: null },
      copy,
      overall: Math.round(COPY_WEIGHT * copy.score),
      status: 'no-live-shot',
    };
  }
  if (!clonePath || !existsSync(clonePath)) {
    return {
      pageSlug,
      pixel: { totalPixels: 0, matchedPixels: 0, differingPixels: 0, score: 0, diffPath: null },
      copy,
      overall: Math.round(COPY_WEIGHT * copy.score),
      status: 'no-clone-shot',
    };
  }
  try {
    const pixel = await computePixelScore(livePath, clonePath, diffOutPath);
    const overall = Math.round(PIXEL_WEIGHT * pixel.score + COPY_WEIGHT * copy.score);
    return { pageSlug, pixel, copy, overall, status: 'scored' };
  } catch (err) {
    return {
      pageSlug,
      pixel: { totalPixels: 0, matchedPixels: 0, differingPixels: 0, score: 0, diffPath: null },
      copy,
      overall: Math.round(COPY_WEIGHT * copy.score),
      status: 'error',
      errorMessage: err instanceof Error ? err.message : String(err),
    };
  }
}

/**
 * Aggregate per-page fidelity scores into a single overall score. Only pages
 * with `status === 'scored'` count toward the mean. Returns 0 when no pages
 * scored (so the summary is still well-formed).
 *
 * @param pages - All per-page fidelity results.
 * @returns Mean overall score across `scored` pages, rounded.
 */
export function aggregateOverall(pages: PageFidelity[]): number {
  const scored = pages.filter((p) => p.status === 'scored');
  if (scored.length === 0) return 0;
  const sum = scored.reduce((acc, p) => acc + p.overall, 0);
  return Math.round(sum / scored.length);
}
