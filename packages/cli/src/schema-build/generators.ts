// F02 schema build — JSON-LD generators for the most common Schema.org types
// for small business sites. Outputs validated, install-ready blocks. Distinct
// from the existing `schema` audit pass (which scores schemas already on the
// site); this module *generates* them.

import type { AuditPackage } from '@upriver/core';
import type { PageData } from '@upriver/audit-passes';

export interface BusinessFacts {
  name: string;
  url: string;
  description?: string;
  telephone?: string;
  email?: string;
  address?: ParsedAddress;
  hours?: OpeningHours[];
  priceRange?: string;
  sameAs?: string[];
  logoUrl?: string;
  imageUrl?: string;
}

export interface ParsedAddress {
  streetAddress: string;
  addressLocality: string;
  addressRegion: string;
  postalCode?: string;
  addressCountry: string;
}

export interface OpeningHours {
  /** e.g. "Mo-Fr" or "Mo,Tu,We" */
  dayOfWeek: string;
  opens: string;
  closes: string;
}

const DAY_MAP: Record<string, string> = {
  monday: 'Mo', mon: 'Mo',
  tuesday: 'Tu', tue: 'Tu', tues: 'Tu',
  wednesday: 'We', wed: 'We',
  thursday: 'Th', thu: 'Th', thur: 'Th', thurs: 'Th',
  friday: 'Fr', fri: 'Fr',
  saturday: 'Sa', sat: 'Sa',
  sunday: 'Su', sun: 'Su',
};

/** Parse a free-text US address into a Schema.org PostalAddress. Best effort. */
export function parseAddress(raw: string | undefined): ParsedAddress | undefined {
  if (!raw) return undefined;
  const text = raw.replace(/\s+/g, ' ').trim();
  // Match "<street>, <city>, <state> <zip>" or "<street>, <city>, <state>".
  const usRe = /^(.+?),\s*([^,]+?),\s*([A-Za-z]{2}|[A-Za-z\s]+?)(?:\s+(\d{5}(?:-\d{4})?))?$/;
  const m = text.match(usRe);
  if (m) {
    const streetAddress = (m[1] ?? '').trim();
    const addressLocality = (m[2] ?? '').trim();
    let addressRegion = (m[3] ?? '').trim();
    if (addressRegion.length > 2) addressRegion = stateAbbrev(addressRegion) ?? addressRegion;
    const result: ParsedAddress = {
      streetAddress,
      addressLocality,
      addressRegion,
      addressCountry: 'US',
    };
    if (m[4]) result.postalCode = m[4].trim();
    return result;
  }
  // Fallback: whole string as street, leave the rest empty.
  return {
    streetAddress: text,
    addressLocality: '',
    addressRegion: '',
    addressCountry: 'US',
  };
}

const STATE_NAMES: Record<string, string> = {
  alabama: 'AL', alaska: 'AK', arizona: 'AZ', arkansas: 'AR', california: 'CA',
  colorado: 'CO', connecticut: 'CT', delaware: 'DE', florida: 'FL', georgia: 'GA',
  hawaii: 'HI', idaho: 'ID', illinois: 'IL', indiana: 'IN', iowa: 'IA',
  kansas: 'KS', kentucky: 'KY', louisiana: 'LA', maine: 'ME', maryland: 'MD',
  massachusetts: 'MA', michigan: 'MI', minnesota: 'MN', mississippi: 'MS',
  missouri: 'MO', montana: 'MT', nebraska: 'NE', nevada: 'NV',
  'new hampshire': 'NH', 'new jersey': 'NJ', 'new mexico': 'NM', 'new york': 'NY',
  'north carolina': 'NC', 'north dakota': 'ND', ohio: 'OH', oklahoma: 'OK',
  oregon: 'OR', pennsylvania: 'PA', 'rhode island': 'RI', 'south carolina': 'SC',
  'south dakota': 'SD', tennessee: 'TN', texas: 'TX', utah: 'UT', vermont: 'VT',
  virginia: 'VA', washington: 'WA', 'west virginia': 'WV', wisconsin: 'WI', wyoming: 'WY',
};
function stateAbbrev(name: string): string | undefined {
  return STATE_NAMES[name.toLowerCase()];
}

/** Parse hours strings like "Mon-Fri 9-5; Sat closed" into Schema.org slots. */
export function parseHours(raw: string | undefined): OpeningHours[] {
  if (!raw) return [];
  const out: OpeningHours[] = [];
  const segments = raw.split(/[;\n]+/).map((s) => s.trim()).filter(Boolean);
  for (const seg of segments) {
    if (/closed/i.test(seg)) continue;
    // Match "<day(s)>: hh:mm am - hh:mm pm"
    const m = seg.match(
      /^([A-Za-z\s,\-]+?)[\s:]+(\d{1,2}(?::\d{2})?)\s*(am|pm|AM|PM)?\s*[-–to]+\s*(\d{1,2}(?::\d{2})?)\s*(am|pm|AM|PM)?$/,
    );
    if (!m) continue;
    const days = normalizeDays(m[1] ?? '');
    if (!days) continue;
    const opens = to24h(m[2] ?? '', m[3]);
    const closes = to24h(m[4] ?? '', m[5]);
    if (opens && closes) out.push({ dayOfWeek: days, opens, closes });
  }
  return out;
}

function normalizeDays(s: string): string | undefined {
  const trimmed = s.trim().toLowerCase();
  if (!trimmed) return undefined;
  // Range "mon - fri"
  const range = trimmed.match(/^([a-z]+)\s*[-–]\s*([a-z]+)$/);
  if (range) {
    const a = DAY_MAP[range[1] ?? ''];
    const b = DAY_MAP[range[2] ?? ''];
    if (a && b) return `${a}-${b}`;
  }
  const list = trimmed
    .split(/[,\s]+/)
    .map((d) => DAY_MAP[d])
    .filter(Boolean);
  if (list.length > 0) return list.join(',');
  return undefined;
}

function to24h(hm: string, ampm: string | undefined): string | undefined {
  const [hh, mm] = hm.split(':');
  let h = Number(hh);
  const m = mm ? Number(mm) : 0;
  if (Number.isNaN(h)) return undefined;
  if (ampm) {
    const ap = ampm.toLowerCase();
    if (ap === 'pm' && h !== 12) h += 12;
    if (ap === 'am' && h === 12) h = 0;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Build BusinessFacts from audit-package + raw client config snippets. */
export function deriveBusinessFacts(
  pkg: AuditPackage | null,
  fallback: { name: string; url: string },
): BusinessFacts {
  const meta = pkg?.meta;
  const ci = pkg?.contentInventory;
  const contact = ci?.contactInfo ?? {};
  const facts: BusinessFacts = {
    name: meta?.clientName ?? fallback.name,
    url: meta?.siteUrl ?? fallback.url,
  };
  if (contact.phone) facts.telephone = normalizePhone(contact.phone);
  if (contact.email) facts.email = contact.email;
  const parsedAddress = parseAddress(contact.address);
  if (parsedAddress) facts.address = parsedAddress;
  const hours = parseHours(contact.hours);
  if (hours.length > 0) facts.hours = hours;
  const social = (ci?.socialLinks ?? []).map((s) => s.url).filter(Boolean);
  if (social.length > 0) facts.sameAs = social;
  return facts;
}

function normalizePhone(raw: string): string {
  // E.164-ish: keep digits, prefix +1 for US-looking 10-digit numbers.
  const digits = raw.replace(/\D/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  return raw;
}

const VERTICAL_TO_SCHEMA_TYPE: Record<string, string> = {
  'wedding-venue': 'EventVenue',
  preschool: 'Preschool',
  restaurant: 'Restaurant',
  'professional-services': 'ProfessionalService',
};

export function localBusinessType(vertical: string | undefined): string {
  if (!vertical) return 'LocalBusiness';
  return VERTICAL_TO_SCHEMA_TYPE[vertical] ?? 'LocalBusiness';
}

interface JsonLd {
  '@context'?: string | string[];
  '@type'?: string | string[];
  '@id'?: string;
  [key: string]: unknown;
}

export function buildOrganization(facts: BusinessFacts): JsonLd {
  const node: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': `${facts.url}#organization`,
    name: facts.name,
    url: facts.url,
  };
  if (facts.logoUrl) node['logo'] = facts.logoUrl;
  if (facts.sameAs && facts.sameAs.length > 0) node['sameAs'] = facts.sameAs;
  return node;
}

export function buildLocalBusiness(
  facts: BusinessFacts,
  vertical: string | undefined,
): JsonLd | null {
  const type = localBusinessType(vertical);
  const node: JsonLd = {
    '@context': 'https://schema.org',
    '@type': type,
    '@id': `${facts.url}#${type.toLowerCase()}`,
    name: facts.name,
    url: facts.url,
  };
  if (facts.telephone) node['telephone'] = facts.telephone;
  if (facts.email) node['email'] = facts.email;
  if (facts.priceRange) node['priceRange'] = facts.priceRange;
  if (facts.address) {
    node['address'] = {
      '@type': 'PostalAddress',
      ...facts.address,
    };
  }
  if (facts.hours && facts.hours.length > 0) {
    node['openingHoursSpecification'] = facts.hours.map((h) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: expandDayCode(h.dayOfWeek),
      opens: h.opens,
      closes: h.closes,
    }));
  }
  if (facts.sameAs && facts.sameAs.length > 0) node['sameAs'] = facts.sameAs;
  if (facts.imageUrl) node['image'] = facts.imageUrl;
  return node;
}

const DAY_NAMES: Record<string, string> = {
  Mo: 'Monday', Tu: 'Tuesday', We: 'Wednesday', Th: 'Thursday',
  Fr: 'Friday', Sa: 'Saturday', Su: 'Sunday',
};
function expandDayCode(code: string): string[] {
  if (code.includes('-')) {
    // range like Mo-Fr
    const order = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    const [a, b] = code.split('-');
    const i = order.indexOf(a ?? '');
    const j = order.indexOf(b ?? '');
    if (i >= 0 && j >= i) return order.slice(i, j + 1).map((d) => DAY_NAMES[d] ?? d);
  }
  return code.split(',').map((d) => DAY_NAMES[d] ?? d);
}

export function buildFaqPage(faqs: Array<{ question: string; answer: string }>, pageUrl: string): JsonLd | null {
  if (faqs.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': `${pageUrl}#faq`,
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: {
        '@type': 'Answer',
        text: f.answer,
      },
    })),
  };
}

export function buildBreadcrumb(crumbs: Array<{ name: string; url: string }>): JsonLd | null {
  if (crumbs.length === 0) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      item: c.url,
    })),
  };
}

export function buildService(svc: { name: string; description?: string; provider: BusinessFacts }): JsonLd {
  const node: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Service',
    name: svc.name,
    provider: {
      '@type': 'Organization',
      name: svc.provider.name,
      url: svc.provider.url,
    },
  };
  if (svc.description) node['description'] = svc.description;
  return node;
}

export function buildPersonForTeamMember(
  member: { name: string; role?: string; page: string },
  facts: BusinessFacts,
): JsonLd {
  const node: JsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: member.name,
    worksFor: { '@type': 'Organization', name: facts.name, url: facts.url },
  };
  if (member.role) node['jobTitle'] = member.role;
  return node;
}

/**
 * Determine the page type from URL and content cues. The page-type drives
 * which schemas a per-page block contains.
 */
export type PageType = 'home' | 'about' | 'contact' | 'services' | 'faq' | 'gallery' | 'blog' | 'other';

export function classifyPage(page: PageData): PageType {
  const url = page.url.toLowerCase();
  const slug = page.slug.toLowerCase();
  if (url.endsWith('/') || slug === 'home' || slug === 'index') return 'home';
  if (/about|team|story/.test(slug)) return 'about';
  if (/contact|reach|locate/.test(slug)) return 'contact';
  if (/faq|questions/.test(slug)) return 'faq';
  if (/services|what-we-do|menu|programs/.test(slug)) return 'services';
  if (/gallery|portfolio|photos|work/.test(slug)) return 'gallery';
  if (/blog|news|stories/.test(slug)) return 'blog';
  return 'other';
}
