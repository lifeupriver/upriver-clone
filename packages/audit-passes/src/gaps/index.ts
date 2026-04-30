// F09 gap analysis — identify missing pages, missing features, and propose
// an information architecture for the rebuild. Reads the vertical pack's
// expectedPages list (already encoded for wedding-venue, preschool,
// restaurant, professional-services, generic) and a feature catalog defined
// here for the most common gaps small business sites have.
//
// Subroutines:
//   A. Industry baseline check (always runs)
//   B. Competitor comparison (gated on competitor scrape data; skipped when absent)
//   C. UX flow analysis (deep mode only; LLM-driven; lives in the standalone command)
//
// Outputs from this pass are AuditPassResult findings only. The standalone
// `gap-analysis` command produces the full deliverable bundle including
// proposed-sitemap.json which feeds rebuild stages.

import type { AuditPassResult, AuditFinding } from '@upriver/core';
import { loadPages, type PageData } from '../shared/loader.js';
import { finding, scoreFromFindings } from '../shared/finding-builder.js';
import { getVerticalPack, type PassOptions } from '../shared/vertical-pack.js';

export type FeatureId =
  | 'contact_form'
  | 'phone_number_visible'
  | 'email_visible'
  | 'hours_widget'
  | 'map_embed'
  | 'booking_calendar'
  | 'reservation_widget'
  | 'pricing_visible'
  | 'online_menu'
  | 'inquiry_form_with_date'
  | 'document_upload_portal'
  | 'tour_booking'
  | 'photo_gallery'
  | 'video_hero';

export interface FeatureSpec {
  id: FeatureId;
  label: string;
  /** Substring or regex hits inside raw HTML / extracted contact / page text that count as "present". */
  detectors: Array<RegExp | { extracted: 'phone' | 'email' | 'address' | 'hours' }>;
  /** Recommended implementations the rebuild can wire in. */
  implementations: string[];
  rationale: string;
  effort: 'light' | 'medium' | 'heavy';
}

export const FEATURE_CATALOG: Record<FeatureId, FeatureSpec> = {
  contact_form: {
    id: 'contact_form',
    label: 'Contact form',
    detectors: [/<form[^>]*(?:contact|inquir|message)/i, /typeform|tally\.so|jotform|gravityforms|wpforms/i],
    implementations: ['Tally.so embed', 'Astro form + Resend', 'HoneyBook for venues'],
    rationale: 'Direct lead capture without phone friction. The single most consequential conversion path on a small-business site.',
    effort: 'light',
  },
  phone_number_visible: {
    id: 'phone_number_visible',
    label: 'Phone number visible site-wide',
    detectors: [{ extracted: 'phone' }, /tel:\+?\d/],
    implementations: ['Header tel: link', 'Footer phone block'],
    rationale: 'Many users prefer phone for first contact, especially for higher-trust services.',
    effort: 'light',
  },
  email_visible: {
    id: 'email_visible',
    label: 'Email address visible',
    detectors: [{ extracted: 'email' }, /mailto:/i],
    implementations: ['Footer email link', 'Contact page email block'],
    rationale: 'Some inquiries are easier to send by email than through a form.',
    effort: 'light',
  },
  hours_widget: {
    id: 'hours_widget',
    label: 'Operating hours visible',
    detectors: [{ extracted: 'hours' }, /\bhours\b/i, /\bopen\b.{0,40}(am|pm|monday|tuesday)/i],
    implementations: ['Footer hours block', 'Schema OpeningHoursSpecification (covered by F02)'],
    rationale: 'Reduces inbound "are you open today" calls and drives in-person visits.',
    effort: 'light',
  },
  map_embed: {
    id: 'map_embed',
    label: 'Embedded map',
    detectors: [/google\.com\/maps|maps\.google|mapbox|openstreetmap/i, /<iframe[^>]*maps/i],
    implementations: ['Google Maps embed on contact page', 'Static map image with link to directions'],
    rationale: 'Helps visitors confirm location at a glance and links straight into navigation apps.',
    effort: 'light',
  },
  booking_calendar: {
    id: 'booking_calendar',
    label: 'Self-service booking calendar',
    detectors: [/cal\.com|calendly|savvycal/i, /<iframe[^>]*booking/i],
    implementations: ['Cal.com', 'Calendly', 'SavvyCal', 'custom Astro form against an availability table'],
    rationale: 'Reduces booking friction. Replaces email back-and-forth with self-service scheduling.',
    effort: 'medium',
  },
  reservation_widget: {
    id: 'reservation_widget',
    label: 'Reservation widget',
    detectors: [/opentable|resy|tock|sevenrooms/i],
    implementations: ['OpenTable', 'Resy', 'Tock', 'SevenRooms'],
    rationale: 'Restaurant traffic that comes ready to book leaves immediately if reservations require a phone call.',
    effort: 'medium',
  },
  pricing_visible: {
    id: 'pricing_visible',
    label: 'Pricing or pricing tier visible',
    detectors: [/\bprice|pricing|tuition|rate|package|investment/i, /\$\d/],
    implementations: ['Pricing page with tiers', 'Inline pricing badges per service'],
    rationale: 'Visible pricing pre-qualifies leads and reduces low-fit inquiries.',
    effort: 'light',
  },
  online_menu: {
    id: 'online_menu',
    label: 'Online menu (HTML, not PDF)',
    detectors: [/menu/i, /<table[^>]*menu/i],
    implementations: ['Astro content collection per menu section', 'Toast or Square menu sync'],
    rationale: 'PDF menus break on mobile and never index for SEO. HTML menus rank for "<dish> near me" searches.',
    effort: 'medium',
  },
  inquiry_form_with_date: {
    id: 'inquiry_form_with_date',
    label: 'Inquiry form with event date and guest count',
    detectors: [/<input[^>]*(date|guests|count)/i, /honeybook|17hats/i],
    implementations: ['HoneyBook embed', 'Custom inquiry form storing in Supabase', 'Tally with date and number fields'],
    rationale: 'Date and guest count let the operator triage inquiries without a phone call.',
    effort: 'medium',
  },
  document_upload_portal: {
    id: 'document_upload_portal',
    label: 'Secure document upload',
    detectors: [/sharefile|onehub|securefilepro|<input[^>]*type="?file/i],
    implementations: ['SmartVault', 'ShareFile', 'Bento for CPAs', 'Supabase Storage with auth'],
    rationale: 'Secure document handoff is required for tax and legal work. Email is not a substitute.',
    effort: 'heavy',
  },
  tour_booking: {
    id: 'tour_booking',
    label: 'Tour booking workflow',
    detectors: [/book.*tour|schedule.*tour|tour.*sign.up/i, /cal\.com|calendly/i],
    implementations: ['Cal.com tour event type', 'Custom tour-request form'],
    rationale: 'Tours convert. A self-service tour booker turns warm leads into walked-in visitors.',
    effort: 'medium',
  },
  photo_gallery: {
    id: 'photo_gallery',
    label: 'Photo gallery',
    detectors: [/gallery|portfolio|photos/i],
    implementations: ['Astro picture grid pulling from Cloudinary', 'Simple lightbox over public images'],
    rationale: 'For photography-heavy verticals, the gallery is often the conversion lever.',
    effort: 'light',
  },
  video_hero: {
    id: 'video_hero',
    label: 'Hero video on the homepage',
    detectors: [/<video|youtube\.com\/embed|vimeo\.com|mux\.com/i],
    implementations: ['Mux player on homepage', 'Self-hosted MP4 with poster'],
    rationale: 'Video heroes lift homepage conversion by 20-40% on emotional-purchase verticals.',
    effort: 'medium',
  },
};

/** Vertical → required & recommended feature ids. */
export const VERTICAL_FEATURE_REQUIREMENTS: Record<string, { required: FeatureId[]; recommended: FeatureId[] }> = {
  'wedding-venue': {
    required: ['contact_form', 'phone_number_visible', 'inquiry_form_with_date', 'photo_gallery'],
    recommended: ['booking_calendar', 'tour_booking', 'video_hero', 'map_embed'],
  },
  preschool: {
    required: ['contact_form', 'phone_number_visible', 'hours_widget', 'tour_booking'],
    recommended: ['photo_gallery', 'pricing_visible', 'map_embed'],
  },
  restaurant: {
    required: ['phone_number_visible', 'hours_widget', 'reservation_widget', 'online_menu'],
    recommended: ['photo_gallery', 'map_embed', 'video_hero'],
  },
  'professional-services': {
    required: ['contact_form', 'phone_number_visible', 'booking_calendar', 'pricing_visible'],
    recommended: ['document_upload_portal', 'map_embed'],
  },
  generic: {
    required: ['contact_form', 'phone_number_visible', 'hours_widget'],
    recommended: ['map_embed', 'photo_gallery'],
  },
};

export interface DetectedFeatures {
  present: Set<FeatureId>;
  missing: FeatureId[];
}

export function detectFeatures(pages: PageData[], vertical: string | undefined): DetectedFeatures {
  const reqs = VERTICAL_FEATURE_REQUIREMENTS[vertical ?? 'generic'] ?? VERTICAL_FEATURE_REQUIREMENTS['generic']!;
  const allIds: FeatureId[] = [...new Set([...reqs.required, ...reqs.recommended])];
  const present = new Set<FeatureId>();
  const corpus = pages.map((p) => p.content.markdown ?? '').join('\n');
  for (const id of allIds) {
    const spec = FEATURE_CATALOG[id];
    for (const d of spec.detectors) {
      if (d instanceof RegExp) {
        if (d.test(corpus)) {
          present.add(id);
          break;
        }
      } else {
        const present2 = pages.some((p) => {
          const ex = p.extracted.contact;
          if (d.extracted === 'phone') return Boolean(ex.phone);
          if (d.extracted === 'email') return Boolean(ex.email);
          if (d.extracted === 'address') return Boolean(ex.address);
          if (d.extracted === 'hours') return Boolean(ex.hours);
          return false;
        });
        if (present2) {
          present.add(id);
          break;
        }
      }
    }
  }
  const missing = allIds.filter((id) => !present.has(id));
  return { present, missing };
}

export interface ExpectedPageMatch {
  label: string;
  priority: 'p0' | 'p1' | 'p2';
  /** URL of the page that satisfies this expectation, or null if missing. */
  matchedUrl: string | null;
}

export function detectExpectedPages(
  pages: PageData[],
  vertical: string | undefined,
): ExpectedPageMatch[] {
  const pack = getVerticalPack(vertical);
  return pack.expectedPages.map((ep) => {
    const match = pages.find((p) => ep.pattern.test(p.url) || ep.pattern.test(p.slug));
    return {
      label: ep.label,
      priority: ep.priority,
      matchedUrl: match ? match.url : null,
    };
  });
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
      dimension: 'gaps',
      score: 50,
      summary: 'No scraped pages available for gap analysis.',
      findings: [],
      completed_at: new Date().toISOString(),
    };
  }

  const expected = detectExpectedPages(pages, opts.vertical);
  const missingPages = expected.filter((e) => !e.matchedUrl);
  const features = detectFeatures(pages, opts.vertical);
  const reqs = VERTICAL_FEATURE_REQUIREMENTS[opts.vertical ?? 'generic'] ?? VERTICAL_FEATURE_REQUIREMENTS['generic']!;

  for (const m of missingPages) {
    findings.push(
      finding(
        'gaps',
        m.priority,
        m.priority === 'p0' ? 'medium' : 'light',
        `Missing page: ${m.label}`,
        `The site does not have a ${m.label.toLowerCase()}. This is a ${m.priority.toUpperCase()} expectation for this industry.`,
        `Add a ${m.label} during the rebuild. The proposed sitemap (proposed-sitemap.json) places this page in the primary navigation when applicable.`,
      ),
    );
  }

  for (const id of features.missing) {
    if (!reqs.required.includes(id) && !reqs.recommended.includes(id)) continue;
    const spec = FEATURE_CATALOG[id];
    const required = reqs.required.includes(id);
    findings.push(
      finding(
        'gaps',
        required ? 'p0' : 'p1',
        spec.effort,
        `Missing feature: ${spec.label}`,
        `${spec.label} was not detected on the site. ${spec.rationale}`,
        `Wire in ${spec.label.toLowerCase()} during the rebuild. Recommended implementations: ${spec.implementations.join(', ')}.`,
      ),
    );
  }

  return {
    dimension: 'gaps',
    score: scoreFromFindings(findings),
    summary: `Compared against the ${opts.vertical ?? 'generic'} baseline. ${missingPages.length} expected pages missing, ${features.missing.length} expected features missing.`,
    findings,
    completed_at: new Date().toISOString(),
  };
}
