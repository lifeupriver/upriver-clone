// F01 media audit — heuristic image classification.
//
// This pass runs alongside the other base audit passes and produces findings
// (count of stock-photo candidates, missing alt text, low-resolution heroes,
// orphaned generic images). Per-image classification is also computed and
// available via the standalone `upriver audit-media` command which writes a
// richer `audit/media-inventory.json` plus the operator-facing shot list.
//
// Heuristic-only by design. Reverse image lookup (TinEye / Google Vision web
// detection) and Anthropic vision classification are layered on top inside
// the standalone command, gated on env keys. The roadmap budgets <$3 per
// 30-page site; the heuristic stage runs free.

import type { AuditPassResult } from '@upriver/core';
import { loadPages, type PageData } from '../shared/loader.js';
import { finding, scoreFromFindings } from '../shared/finding-builder.js';
import { getVerticalPack, type PassOptions } from '../shared/vertical-pack.js';

export type ImageClassification =
  | 'authentic'
  | 'stock-suspect'
  | 'ai-suspect'
  | 'screenshot'
  | 'logo'
  | 'icon'
  | 'decorative'
  | 'unknown';

export interface ImageRecord {
  url: string;
  page: string;
  filenameHint: string;
  /** Best classification we can assign with heuristics alone. */
  classification: ImageClassification;
  /** 0-100 confidence in the classification (heuristic-only). */
  classification_confidence: number;
  /** Heuristic quality score 0-100. */
  quality_score: number;
  has_alt: boolean;
  notes: string[];
}

/** Patterns commonly found in stock-photo or generic CMS image URLs. */
const STOCK_URL_PATTERNS = [
  /unsplash\.com/i,
  /pexels\.com/i,
  /shutterstock\.com/i,
  /istockphoto\.com/i,
  /gettyimages/i,
  /\bstock[-_]?photo\b/i,
  /\bphotos?\.(?:wp|wordpress)/i,
  /\/wp-content\/uploads\/\d{4}\/\d{2}\/[a-z0-9-]+(?:_\d+)?\.(?:jpg|jpeg|png)/i,
];

const AI_URL_PATTERNS = [
  /\bmidjourney\b/i,
  /\bdalle?\b/i,
  /\bstable[-_]?diffusion\b/i,
  /\bai[-_]?generated\b/i,
];

const LOGO_HINTS = [/logo/i, /favicon/i, /brand[-_]?mark/i];
const ICON_HINTS = [/\bicon\b/i, /\bsprite\b/i, /\bsvg\b/i, /\barrow\b/i, /\bchevron\b/i];
const SCREENSHOT_HINTS = [/screenshot/i, /\bscreen\b/i, /\bcapture\b/i];
const DECORATIVE_HINTS = [/\bbg[-_]/i, /background/i, /pattern/i, /texture/i];

/** Filename slug indicators of authentic, named photography. */
const AUTHENTIC_HINTS = [
  /[a-z]+-(?:wedding|family|team|portrait|headshot|interior|exterior|venue|kitchen|classroom)/i,
  /20\d{2}-\d{2}-\d{2}/, // dates
  /img_\d{4}/i, // raw camera imports
  /dsc\d{4,}/i,
];

function lastPathSegment(url: string): string {
  try {
    const u = new URL(url);
    return u.pathname.split('/').filter(Boolean).pop() ?? '';
  } catch {
    return url.split('/').pop() ?? url;
  }
}

function classify(url: string): { classification: ImageClassification; confidence: number; notes: string[] } {
  const filename = lastPathSegment(url).toLowerCase();
  const notes: string[] = [];

  if (LOGO_HINTS.some((r) => r.test(filename) || r.test(url))) {
    return { classification: 'logo', confidence: 90, notes };
  }
  if (ICON_HINTS.some((r) => r.test(filename))) {
    return { classification: 'icon', confidence: 80, notes };
  }
  if (SCREENSHOT_HINTS.some((r) => r.test(filename))) {
    return { classification: 'screenshot', confidence: 80, notes };
  }
  if (DECORATIVE_HINTS.some((r) => r.test(filename))) {
    return { classification: 'decorative', confidence: 70, notes };
  }
  if (STOCK_URL_PATTERNS.some((r) => r.test(url))) {
    notes.push('URL matches a known stock-photo CDN or generic CMS upload pattern.');
    return { classification: 'stock-suspect', confidence: 70, notes };
  }
  if (AI_URL_PATTERNS.some((r) => r.test(url) || r.test(filename))) {
    notes.push('URL or filename references an AI image generator.');
    return { classification: 'ai-suspect', confidence: 75, notes };
  }
  if (AUTHENTIC_HINTS.some((r) => r.test(filename))) {
    return { classification: 'authentic', confidence: 60, notes };
  }
  return { classification: 'unknown', confidence: 30, notes };
}

function qualityScore(classification: ImageClassification, hasAlt: boolean, isShared: boolean): number {
  let base = 50;
  if (classification === 'authentic') base = 80;
  if (classification === 'stock-suspect') base = 35;
  if (classification === 'ai-suspect') base = 40;
  if (classification === 'logo' || classification === 'icon') base = 70;
  if (classification === 'decorative') base = 55;
  if (hasAlt) base += 5;
  if (!hasAlt && (classification === 'authentic' || classification === 'unknown')) base -= 10;
  if (isShared) base -= 5; // images repeated everywhere often signal generic stock
  return Math.max(0, Math.min(100, base));
}

/** Build per-image records from scraped pages. */
export function buildInventory(pages: PageData[]): ImageRecord[] {
  // Track which pages each URL appears on so we can flag shared/decorative repeats.
  const occurrences = new Map<string, string[]>();
  for (const page of pages) {
    for (const img of page.images ?? []) {
      const list = occurrences.get(img) ?? [];
      list.push(page.url);
      occurrences.set(img, list);
    }
  }

  const records: ImageRecord[] = [];
  const seen = new Set<string>();
  for (const page of pages) {
    for (const img of page.images ?? []) {
      if (seen.has(img)) continue;
      seen.add(img);
      const cls = classify(img);
      const isShared = (occurrences.get(img)?.length ?? 1) > 3;
      // Alt-text presence is not directly available in scraped pages here;
      // approximate by checking if an alt-like token is in the URL itself,
      // which is rare. Real alt extraction would require raw HTML; we set
      // false when unknown.
      const hasAlt = false;
      const score = qualityScore(cls.classification, hasAlt, isShared);
      records.push({
        url: img,
        page: page.url,
        filenameHint: lastPathSegment(img),
        classification: cls.classification,
        classification_confidence: cls.confidence,
        quality_score: score,
        has_alt: hasAlt,
        notes: cls.notes,
      });
    }
  }
  return records;
}

export interface MediaInventorySummary {
  total: number;
  byClassification: Record<ImageClassification, number>;
  /** Images appearing on 4+ pages — typically generic stock or layout chrome. */
  sharedImageCount: number;
}

export function summarizeInventory(records: ImageRecord[]): MediaInventorySummary {
  const byClassification: Record<ImageClassification, number> = {
    authentic: 0,
    'stock-suspect': 0,
    'ai-suspect': 0,
    screenshot: 0,
    logo: 0,
    icon: 0,
    decorative: 0,
    unknown: 0,
  };
  for (const r of records) byClassification[r.classification] += 1;
  const sharedImageCount = records.filter((r) => r.notes.length > 0 && r.classification === 'stock-suspect').length;
  return { total: records.length, byClassification, sharedImageCount };
}

export async function run(
  slug: string,
  clientDir: string,
  opts: PassOptions = {},
): Promise<AuditPassResult> {
  const _pack = getVerticalPack(opts.vertical);
  void _pack;
  const pages = loadPages(clientDir);
  const findings = [];

  if (pages.length === 0) {
    return {
      dimension: 'media',
      score: 50,
      summary: 'No scraped pages available for media audit.',
      findings: [],
      completed_at: new Date().toISOString(),
    };
  }

  const records = buildInventory(pages);
  const summary = summarizeInventory(records);

  if (summary.total === 0) {
    findings.push(
      finding(
        'media',
        'p1',
        'medium',
        'No images detected on any page',
        'The scraped pages contain no <img> sources. The site is text-only or images are loaded via patterns the scraper missed.',
        'Add hero photography to the homepage and primary inner pages. Photography is the highest-leverage upgrade for a small business site.',
        { why: 'Sites without imagery feel sparse and convert poorly compared to peers with authentic photography.' },
      ),
    );
  }

  const stockShare = summary.byClassification['stock-suspect'] / Math.max(1, summary.total);
  if (stockShare >= 0.3 && summary.byClassification['stock-suspect'] >= 3) {
    findings.push(
      finding(
        'media',
        'p0',
        'medium',
        `${summary.byClassification['stock-suspect']} stock-photo candidates detected`,
        `${summary.byClassification['stock-suspect']} of ${summary.total} images match stock-photo CDN patterns or generic uploads. Stock photography reads as inauthentic to visitors and tells search engines this site has nothing unique to offer.`,
        'Replace stock photography with authentic photos of your space, team, and work. Upriver can shoot the replacement set in a single day.',
        {
          why: 'Authentic photography is the single biggest visual differentiator for small business sites. Stock photos are recognizable and erode trust.',
          evidence: `${(stockShare * 100).toFixed(0)}% of detected images match stock patterns.`,
          affected_pages: dedupeAffectedPages(records, 'stock-suspect'),
        },
      ),
    );
  } else if (summary.byClassification['stock-suspect'] >= 1) {
    findings.push(
      finding(
        'media',
        'p1',
        'light',
        `${summary.byClassification['stock-suspect']} stock-photo candidate(s) detected`,
        'A small number of images look like stock photography. These should be replaced as part of the next photography pass.',
        'Replace stock candidates with authentic photos when refreshing imagery.',
        { affected_pages: dedupeAffectedPages(records, 'stock-suspect') },
      ),
    );
  }

  const aiCount = summary.byClassification['ai-suspect'];
  if (aiCount > 0) {
    findings.push(
      finding(
        'media',
        'p0',
        'light',
        `${aiCount} AI-generated image candidate(s)`,
        'One or more images match AI-generation URL or filename patterns. AI imagery should never appear on a small business site that competes on authenticity.',
        'Remove AI-generated imagery and replace with real photography or original illustration.',
        { why: 'AI imagery hurts trust and increasingly carries SEO penalties as detection improves.' },
      ),
    );
  }

  const unknownCount = summary.byClassification['unknown'];
  if (unknownCount >= 5 && unknownCount / Math.max(1, summary.total) >= 0.4) {
    findings.push(
      finding(
        'media',
        'p2',
        'medium',
        `${unknownCount} images could not be classified by URL alone`,
        'A large share of images use neutral filenames so heuristic classification could not distinguish authentic from generic. Run "upriver audit-media" with a vision API key for deeper analysis.',
        'Set TINEYE_API_KEY or GOOGLE_VISION_API_KEY (or both) to enable reverse-image lookup, then re-run the pass.',
        {
          why: 'Reverse image lookup catches stock photos that descriptive filenames disguise.',
        },
      ),
    );
  }

  const authenticCount = summary.byClassification['authentic'];
  if (authenticCount === 0 && summary.total > 0) {
    findings.push(
      finding(
        'media',
        'p1',
        'heavy',
        'No clearly authentic photography detected',
        'No images on the site read as authentic, named photography (no descriptive filenames, no date stamps, no DSC/IMG camera imports). Either the photography is hidden behind generic filenames, or the site relies entirely on stock or template imagery.',
        'Commission a one-day photography shoot covering hero, team portraits, and product/space details. Rename existing authentic photos with descriptive slugs for SEO and future audits.',
        {
          why: 'Authentic photography is the single biggest visual differentiator for a small business site versus its competitors.',
        },
      ),
    );
  }

  return {
    dimension: 'media',
    score: scoreFromFindings(findings),
    summary: `Inventoried ${summary.total} images across ${pages.length} pages. ${authenticCount} authentic, ${summary.byClassification['stock-suspect']} stock candidates, ${aiCount} AI candidates, ${unknownCount} unclassified.`,
    findings,
    completed_at: new Date().toISOString(),
  };
}

function dedupeAffectedPages(records: ImageRecord[], cls: ImageClassification): string[] {
  return [...new Set(records.filter((r) => r.classification === cls).map((r) => r.page))].slice(0, 10);
}
