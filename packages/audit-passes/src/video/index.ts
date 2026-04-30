// F12 video audit — page-by-page video recommendation engine.
//
// Reads the scraped pages, optionally the F01 media inventory, optionally
// gap analysis output (so proposed pages are evaluated too), and produces a
// prioritized video plan. Output as findings (this pass) plus a richer plan
// JSON written by the standalone `video-audit` command.

import type { AuditPassResult, AuditFinding } from '@upriver/core';
import { loadPages, type PageData } from '../shared/loader.js';
import { finding, scoreFromFindings } from '../shared/finding-builder.js';
import { type PassOptions } from '../shared/vertical-pack.js';

export type VideoTypeId =
  | 'owner_introduction'
  | 'customer_testimonials'
  | 'drone_overview'
  | 'service_explainer'
  | 'behind_the_scenes'
  | 'brand_film'
  | 'faq_video'
  | 'process_howto'
  | 'service_detail'
  | 'real_moments_compilation';

export interface VideoTypeSpec {
  id: VideoTypeId;
  label: string;
  /** Length in seconds, [low, high]. */
  length: [number, number];
  /** Production complexity. Drives capture/post hour estimates and pricing. */
  complexity: 'low' | 'low-medium' | 'medium' | 'medium-high' | 'high';
  capture_minutes: number;
  post_minutes: number;
  /** Page contexts that this video type fits. Matched against page slug/url. */
  page_contexts: Array<'home' | 'about' | 'services' | 'service_detail' | 'faq' | 'gallery' | 'reviews' | 'location' | 'contact' | 'other'>;
  /** Lift estimate from typical Upriver projects. */
  cost_low: number;
  cost_high: number;
  description: string;
}

export const VIDEO_CATALOG: Record<VideoTypeId, VideoTypeSpec> = {
  owner_introduction: {
    id: 'owner_introduction',
    label: 'Owner introduction',
    length: [60, 120],
    complexity: 'low-medium',
    capture_minutes: 60,
    post_minutes: 180,
    page_contexts: ['about', 'home', 'services'],
    cost_low: 800,
    cost_high: 1500,
    description: 'The owner on camera explaining who they are and why they started the business. Highest trust-builder for service businesses where the owner is the brand.',
  },
  customer_testimonials: {
    id: 'customer_testimonials',
    label: 'Customer testimonials',
    length: [30, 90],
    complexity: 'low',
    capture_minutes: 90,
    post_minutes: 240,
    page_contexts: ['reviews', 'service_detail', 'home'],
    cost_low: 1500,
    cost_high: 3000,
    description: 'Real clients on camera describing their experience. The most valuable conversion content for high-consideration purchases.',
  },
  drone_overview: {
    id: 'drone_overview',
    label: 'Drone overview',
    length: [45, 90],
    complexity: 'medium',
    capture_minutes: 60,
    post_minutes: 180,
    page_contexts: ['home', 'location', 'gallery'],
    cost_low: 800,
    cost_high: 1800,
    description: 'Aerial footage of the property, location, or surroundings. Ideal for venues, hospitality, and outdoor experiences.',
  },
  service_explainer: {
    id: 'service_explainer',
    label: 'Service explainer',
    length: [60, 180],
    complexity: 'medium',
    capture_minutes: 120,
    post_minutes: 360,
    page_contexts: ['services', 'service_detail'],
    cost_low: 1200,
    cost_high: 2500,
    description: 'What happens when you work with the business. The process from inquiry to delivery, condensed.',
  },
  behind_the_scenes: {
    id: 'behind_the_scenes',
    label: 'Behind the scenes',
    length: [120, 240],
    complexity: 'medium-high',
    capture_minutes: 240,
    post_minutes: 480,
    page_contexts: ['about', 'services'],
    cost_low: 2000,
    cost_high: 4000,
    description: 'The day-to-day of the business. Builds emotional connection and answers "what is it actually like."',
  },
  brand_film: {
    id: 'brand_film',
    label: 'Brand film',
    length: [120, 300],
    complexity: 'high',
    capture_minutes: 360,
    post_minutes: 720,
    page_contexts: ['home'],
    cost_low: 3500,
    cost_high: 7000,
    description: 'The atmospheric, emotional anchor video for the business. Often a Home page hero. Communicates who they are more than what they do.',
  },
  faq_video: {
    id: 'faq_video',
    label: 'FAQ video answers',
    length: [30, 60],
    complexity: 'low',
    capture_minutes: 60,
    post_minutes: 120,
    page_contexts: ['faq'],
    cost_low: 800,
    cost_high: 1500,
    description: 'Owner or team answering individual common questions on camera. More personal and trustable than text FAQs.',
  },
  process_howto: {
    id: 'process_howto',
    label: 'Process / how-to',
    length: [90, 240],
    complexity: 'medium',
    capture_minutes: 120,
    post_minutes: 240,
    page_contexts: ['services', 'service_detail'],
    cost_low: 1200,
    cost_high: 2500,
    description: 'Education content for service businesses where part of the value is teaching the buyer.',
  },
  service_detail: {
    id: 'service_detail',
    label: 'Service detail short',
    length: [45, 90],
    complexity: 'low-medium',
    capture_minutes: 60,
    post_minutes: 120,
    page_contexts: ['service_detail', 'services'],
    cost_low: 600,
    cost_high: 1200,
    description: 'Short videos of specific offerings. Stack one per service for quick conversion-page bumps.',
  },
  real_moments_compilation: {
    id: 'real_moments_compilation',
    label: 'Real moments compilation',
    length: [60, 90],
    complexity: 'low',
    capture_minutes: 0,
    post_minutes: 240,
    page_contexts: ['home', 'gallery'],
    cost_low: 600,
    cost_high: 1200,
    description: 'Short, fast-cut compilation of authentic moments from existing footage. The easiest video to ship first.',
  },
};

/** Vertical-specific weighting for which video types matter most. */
export const VERTICAL_VIDEO_WEIGHTS: Record<string, Partial<Record<VideoTypeId, number>>> = {
  'wedding-venue': {
    brand_film: 0.25,
    drone_overview: 0.2,
    customer_testimonials: 0.2,
    real_moments_compilation: 0.15,
    service_detail: 0.2,
  },
  preschool: {
    owner_introduction: 0.25,
    behind_the_scenes: 0.25,
    customer_testimonials: 0.2,
    faq_video: 0.15,
    real_moments_compilation: 0.15,
  },
  restaurant: {
    owner_introduction: 0.2,
    behind_the_scenes: 0.25,
    service_detail: 0.25,
    real_moments_compilation: 0.15,
    drone_overview: 0.15,
  },
  'professional-services': {
    owner_introduction: 0.25,
    process_howto: 0.25,
    faq_video: 0.2,
    customer_testimonials: 0.2,
    service_explainer: 0.1,
  },
  generic: {
    owner_introduction: 0.25,
    customer_testimonials: 0.2,
    real_moments_compilation: 0.2,
    behind_the_scenes: 0.2,
    service_detail: 0.15,
  },
};

export type PageContext = VideoTypeSpec['page_contexts'][number];

export function classifyPageContext(page: PageData): PageContext {
  const slug = page.slug.toLowerCase();
  const url = page.url.toLowerCase();
  if (url.endsWith('/') || slug === 'home' || slug === 'index') return 'home';
  if (/about|story|team/.test(slug)) return 'about';
  if (/contact|reach/.test(slug)) return 'contact';
  if (/faq|questions/.test(slug)) return 'faq';
  if (/review|testimonial/.test(slug)) return 'reviews';
  if (/gallery|portfolio|photos/.test(slug)) return 'gallery';
  if (/location|directions|map/.test(slug)) return 'location';
  if (/service|menu|program|class/.test(slug)) return 'services';
  return 'other';
}

export interface VideoSuggestion {
  videoTypeId: VideoTypeId;
  page_url: string;
  page_context: PageContext;
  /** 0-100 score combining vertical weight, conversion proximity, novelty. */
  score: number;
  rationale: string;
}

export function suggestVideosForPage(page: PageData, vertical: string | undefined): VideoSuggestion[] {
  const ctx = classifyPageContext(page);
  const weights = VERTICAL_VIDEO_WEIGHTS[vertical ?? 'generic'] ?? VERTICAL_VIDEO_WEIGHTS['generic']!;
  const out: VideoSuggestion[] = [];
  for (const spec of Object.values(VIDEO_CATALOG)) {
    if (!spec.page_contexts.includes(ctx)) continue;
    const weight = weights[spec.id] ?? 0.05;
    const conversionBoost = ctx === 'home' || ctx === 'services' || ctx === 'service_detail' ? 0.1 : 0;
    const score = Math.round(Math.min(1, weight + conversionBoost) * 100);
    out.push({
      videoTypeId: spec.id,
      page_url: page.url,
      page_context: ctx,
      score,
      rationale: `${spec.label} fits a ${ctx} page in the ${vertical ?? 'generic'} vertical (weight ${weight.toFixed(2)}, conversion boost ${conversionBoost.toFixed(2)}).`,
    });
  }
  return out.sort((a, b) => b.score - a.score).slice(0, 3);
}

export async function run(
  slug: string,
  clientDir: string,
  opts: PassOptions = {},
): Promise<AuditPassResult> {
  const pages = loadPages(clientDir);
  const findings: AuditFinding[] = [];

  if (pages.length === 0) {
    return {
      dimension: 'video',
      score: 50,
      summary: 'No scraped pages available for video audit.',
      findings: [],
      completed_at: new Date().toISOString(),
    };
  }

  const allSuggestions = pages.flatMap((p) => suggestVideosForPage(p, opts.vertical));
  const counts = new Map<VideoTypeId, number>();
  for (const s of allSuggestions) counts.set(s.videoTypeId, (counts.get(s.videoTypeId) ?? 0) + 1);

  if (allSuggestions.length > 0) {
    findings.push(
      finding(
        'video',
        'p1',
        'heavy',
        'Video opportunities identified across the site',
        `${allSuggestions.length} video opportunities surfaced across ${pages.length} pages. The full prioritized plan with shot lists is in video-audit/plan.json.`,
        'Run `upriver video-audit <slug>` for a shoot-ready plan with shot lists, scripts, and a budget per video.',
      ),
    );
  }

  const homeHasVideo = pages.find((p) => classifyPageContext(p) === 'home' && /video|youtube|vimeo|mux/i.test(p.content.markdown ?? ''));
  if (!homeHasVideo) {
    findings.push(
      finding(
        'video',
        'p1',
        'medium',
        'Homepage has no video',
        'No video element detected on the homepage. A hero video lifts homepage conversion 20-40% on emotional-purchase verticals.',
        'Capture a real-moments compilation or brand film as Phase 1 of the video plan.',
      ),
    );
  }

  return {
    dimension: 'video',
    score: scoreFromFindings(findings),
    summary: `Mapped ${allSuggestions.length} video opportunities across ${pages.length} pages. Top types: ${[...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, n]) => `${id} (${n})`).join(', ')}.`,
    findings,
    completed_at: new Date().toISOString(),
  };
}
