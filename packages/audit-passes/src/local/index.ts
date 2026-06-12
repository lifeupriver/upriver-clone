// Methodology: Local SEO best practices.
// Focus: NAP consistency, GBP signals, local keyword presence, citation readiness.
import type { AuditPassResult } from '@upriver/core';
import { loadPages, loadRawHtml } from '../shared/loader.js';
import { finding, scoreFromFindings } from '../shared/finding-builder.js';
import { getVerticalPack, type PassOptions } from '../shared/vertical-pack.js';

const GBP_PATTERNS = [
  /maps\.google|goo\.gl\/maps|place_id|google.*business|g\.page/i,
  /google\.com\/maps/i,
];

// Truly generic locality patterns — no place names baked in. Client-specific
// place tokens come from `city` / `region` / `serviceArea` in PassOptions
// (sourced from client-config.yaml); vertical-specific search-phrase copy is
// pulled from the vertical pack at runtime.
const GENERIC_LOCAL_PATTERNS = [
  /\bnear\s+(me|us)\b/i,
  /\b\w+\s+in\s+\w+,\s*[A-Z]{2}\b/, // "<thing> in <city>, <ST>"
];

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Build a regex matching the client's own place names (city, region,
 * service-area towns). Returns null when no locality data was provided —
 * callers then fall back to the generic patterns alone.
 */
function buildPlacePattern(opts: PassOptions): RegExp | null {
  const tokens = [opts.city, opts.region, ...(opts.serviceArea ?? [])]
    .map((t) => t?.trim())
    .filter((t): t is string => Boolean(t));
  if (tokens.length === 0) return null;
  return new RegExp(`\\b(${tokens.map(escapeRegExp).join('|')})\\b`, 'i');
}

/** Fill the pack's ranking-phrase template with known locality, leaving placeholders otherwise. */
function fillRankingPhrase(template: string, opts: PassOptions): string {
  if (!opts.city) return template;
  const withCity = template.replace('{city}', opts.city);
  return opts.region
    ? withCity.replace('{state}', opts.region)
    : withCity.replace(/,?\s*\{state\}/, '');
}

export async function run(
  slug: string,
  clientDir: string,
  opts: PassOptions = {},
): Promise<AuditPassResult> {
  // Online-only businesses opt out of local SEO entirely via
  // `localBusiness: false` in client-config.yaml. Score follows the
  // no-findings convention in scoreFromFindings.
  if (opts.localBusiness === false) {
    return {
      dimension: 'local',
      score: scoreFromFindings([]),
      summary: 'Not a local business — local-SEO checks skipped.',
      findings: [],
      completed_at: new Date().toISOString(),
    };
  }

  const pack = getVerticalPack(opts.vertical);
  const pages = loadPages(clientDir);
  const findings = [];

  const allText = pages.map((p) => p.content.markdown).join('\n');
  const allExternal = pages.flatMap((p) => p.links.external);
  const allRawHtml = pages.slice(0, 10).map((p) => loadRawHtml(p)).join('');

  // ── NAP consistency ───────────────────────────────────────────────────────
  const contactEntries = pages.map((p) => p.extracted.contact).filter((c) => c.phone || c.address);

  if (contactEntries.length === 0) {
    findings.push(finding(
      'local', 'p0', 'medium',
      'No NAP (Name, Address, Phone) information detected on the site',
      'No address or phone number was found in structured content across any page. NAP data is the foundation of local SEO.',
      'Add the full business name, physical address, and primary phone number to the footer of every page. Use consistent formatting matching your Google Business Profile.',
      {
        why: 'Google cross-references NAP data between the website and third-party directories. Inconsistency suppresses local-pack rankings.',
      },
    ));
  } else {
    const phones = [...new Set(contactEntries.map((c) => c.phone).filter(Boolean) as string[])];
    const addresses = [...new Set(contactEntries.map((c) => c.address).filter(Boolean) as string[])];

    if (phones.length > 1) {
      findings.push(finding(
        'local', 'p1', 'light',
        'Inconsistent phone numbers across pages',
        `${phones.length} different phone numbers found: ${phones.join(' | ')}. NAP inconsistency hurts local search rankings.`,
        'Standardize to a single primary phone number and use it consistently everywhere — website, GBP, directories.',
        {
          evidence: phones.join(' | '),
          why: 'Google\'s local algorithm penalizes NAP inconsistency between the website and directory listings.',
        },
      ));
    }

    if (addresses.length > 1) {
      findings.push(finding(
        'local', 'p1', 'light',
        'Inconsistent address formats across pages',
        `${addresses.length} different address formats found. Even formatting differences (abbreviations, suite formats) can signal inconsistency.`,
        'Use a single canonical address format everywhere. Match exactly what is on your Google Business Profile.',
        { evidence: addresses.slice(0, 3).join(' | ') },
      ));
    }
  }

  // ── Google Business Profile link ──────────────────────────────────────────
  const hasGbpLink = allExternal.some((l) => GBP_PATTERNS.some((p) => p.test(l)));
  const hasGbpInHtml = GBP_PATTERNS.some((p) => p.test(allRawHtml));

  if (!hasGbpLink && !hasGbpInHtml) {
    findings.push(finding(
      'local', 'p1', 'light',
      'No Google Business Profile link or embed detected',
      'No link to the Google Business Profile or embedded Google Map was found. GBP links signal legitimacy to Google.',
      'Embed a Google Map on the contact page and link to the GBP listing. Add a "See us on Google" link near the address.',
      { why: 'A Google Maps embed on the contact page directly increases the likelihood of appearing in Google\'s local 3-pack.' },
    ));
  }

  // ── Local keyword presence ─────────────────────────────────────────────────
  // When the client config supplies real place names, mentioning them is the
  // strongest locality signal. Otherwise fall back to the generic patterns.
  const placePattern = buildPlacePattern(opts);
  const genericMatches = GENERIC_LOCAL_PATTERNS.filter((p) => p.test(allText));
  const hasLocalSignal = placePattern
    ? placePattern.test(allText) || genericMatches.length >= 2
    : genericMatches.length >= 2;
  if (!hasLocalSignal) {
    const rankingPhrase = fillRankingPhrase(pack.rankingPhraseTemplate, opts);
    findings.push(finding(
      'local', 'p0', 'heavy',
      'Low local keyword density — site not optimized for geographic search terms',
      `The site rarely mentions specific location names (city, region, state). ${pack.buyer} search for "${pack.searchQueryExample}" — if those words aren't on the site, it won't rank.`,
      `Naturally incorporate location keywords throughout the site: city/town name, region name, and state. Target phrases like "${rankingPhrase}" in title tags and H1s.`,
      {
        why: `"${pack.searchQueryExample}" is one of the highest-volume search terms for ${pack.noun} discovery. Ranking for these phrases is the #1 traffic opportunity.`,
        ...(placePattern
          ? { evidence: `None of the configured place names (${[opts.city, opts.region, ...(opts.serviceArea ?? [])].filter(Boolean).join(', ')}) appear in the site copy.` }
          : {}),
      },
    ));
  }

  // ── Citation directory presence ───────────────────────────────────────────
  const linkedDirs = pack.directories.filter((d) => allExternal.some((l) => d.pattern.test(l)));
  const missingDirs = pack.directories.filter((d) => !allExternal.some((l) => d.pattern.test(l)));

  if (missingDirs.length > 3) {
    findings.push(finding(
      'local', 'p1', 'medium',
      `Missing links to ${missingDirs.length} relevant local directories`,
      `The site does not link to: ${missingDirs.map((d) => d.label).join(', ')}. Directory profiles are citation sources that strengthen local SEO.`,
      `Create or claim profiles on ${missingDirs.slice(0, 4).map((d) => d.label).join(', ')}. Link to them from the site footer or contact page. Keep NAP consistent across all profiles.`,
      {
        evidence: `Linked: ${linkedDirs.map((d) => d.label).join(', ') || 'none'} | Missing: ${missingDirs.map((d) => d.label).join(', ')}`,
        why: `Each quality citation (consistent NAP on a reputable directory) is a local ranking signal. Industry-specific directories matter most for ${pack.noun} discovery.`,
      },
    ));
  }

  // ── Schema geo coordinates ────────────────────────────────────────────────
  const hasGeo = /geo|latitude|longitude|hasMap/i.test(allRawHtml);
  if (!hasGeo) {
    findings.push(finding(
      'local', 'p2', 'light',
      'No geo coordinates in schema markup',
      'No geographic coordinates (latitude/longitude) found in JSON-LD or meta tags. Geo data helps Google precisely locate the business.',
      'Add geo coordinates to the LocalBusiness JSON-LD schema: "geo": { "@type": "GeoCoordinates", "latitude": XX.XXXX, "longitude": -XX.XXXX }',
    ));
  }

  const score = scoreFromFindings(findings);
  const hasPhone = pages.some((p) => p.extracted.contact.phone);
  const hasAddr = pages.some((p) => p.extracted.contact.address);
  const summary = `Local SEO: NAP ${hasPhone ? '✓' : '✗'} phone, ${hasAddr ? '✓' : '✗'} address. ${linkedDirs.length}/${pack.directories.length} directories linked. ${findings.length} issues found.`;

  return {
    dimension: 'local',
    score,
    summary,
    findings,
    completed_at: new Date().toISOString(),
  };
}
