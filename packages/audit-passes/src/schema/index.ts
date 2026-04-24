// Methodology: .agents/skills/schema-markup/SKILL.md
// Focus: JSON-LD presence, LocalBusiness/Event/FAQPage schema, required properties
import type { AuditPassResult } from '@upriver/core';
import { loadPages, loadRawHtml } from '../shared/loader.js';
import { finding, scoreFromFindings } from '../shared/finding-builder.js';

function extractJsonLd(html: string): Record<string, unknown>[] {
  const results: Record<string, unknown>[] = [];
  const regex = /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    try {
      const parsed = JSON.parse(match[1] ?? '');
      if (Array.isArray(parsed)) results.push(...parsed);
      else results.push(parsed);
    } catch {
      // malformed JSON-LD
    }
  }
  return results;
}

function getTypes(schemas: Record<string, unknown>[]): string[] {
  return schemas.map((s) => {
    const t = s['@type'];
    return Array.isArray(t) ? t[0] : String(t ?? '');
  }).filter(Boolean);
}

export async function run(slug: string, clientDir: string): Promise<AuditPassResult> {
  const pages = loadPages(clientDir);
  const findings = [];

  // ── Collect all JSON-LD across pages ────────────────────────────────────
  const allSchemas: Array<{ url: string; schemas: Record<string, unknown>[] }> = [];
  for (const page of pages) {
    const html = loadRawHtml(page);
    if (!html) continue;
    const schemas = extractJsonLd(html);
    if (schemas.length > 0) {
      allSchemas.push({ url: page.url, schemas });
    }
  }

  const pagesWithSchema = allSchemas.length;
  const allTypes = allSchemas.flatMap((s) => getTypes(s.schemas));

  // ── LocalBusiness or Organization schema ─────────────────────────────────
  const hasLocalBusiness = allTypes.some((t) =>
    /LocalBusiness|FoodEstablishment|EventVenue|Organization|WeddingService/i.test(t),
  );

  if (!hasLocalBusiness) {
    findings.push(finding(
      'schema', 'p0', 'medium',
      'No LocalBusiness or Organization schema markup',
      'No JSON-LD schema for LocalBusiness, Organization, or EventVenue was found. This is the foundational schema for any venue business.',
      'Add LocalBusiness or EventVenue JSON-LD to the homepage and every page. Include: name, address, telephone, url, openingHours, geo coordinates.',
      {
        why: 'LocalBusiness schema enables rich results in Google Search and Google Maps, directly increasing click-through rates for local searches.',
      },
    ));
  } else {
    // Validate required properties
    const localBusinessSchema = allSchemas
      .flatMap((s) => s.schemas)
      .find((s) => /LocalBusiness|EventVenue|Organization/i.test(String(s['@type'] ?? '')));

    if (localBusinessSchema) {
      const missingProps: string[] = [];
      if (!localBusinessSchema.name) missingProps.push('name');
      if (!localBusinessSchema.address) missingProps.push('address');
      if (!localBusinessSchema.telephone) missingProps.push('telephone');
      if (!localBusinessSchema.url) missingProps.push('url');

      if (missingProps.length > 0) {
        findings.push(finding(
          'schema', 'p1', 'light',
          'LocalBusiness schema missing required properties',
          `The LocalBusiness/Organization schema is present but missing: ${missingProps.join(', ')}.`,
          `Add the missing properties to the JSON-LD schema: ${missingProps.join(', ')}.`,
          {
            evidence: `Missing: ${missingProps.join(', ')}`,
            why: 'Incomplete schema reduces the eligibility for rich results and knowledge panel features.',
          },
        ));
      }
    }
  }

  // ── FAQPage schema ────────────────────────────────────────────────────────
  const hasFaqSchema = allTypes.some((t) => /FAQPage/i.test(t));
  const allFaqs = pages.flatMap((p) => p.extracted.faqs);

  if (allFaqs.length >= 5 && !hasFaqSchema) {
    findings.push(finding(
      'schema', 'p1', 'medium',
      'FAQ content present but no FAQPage schema markup',
      'The site has FAQ content but no FAQPage JSON-LD schema. FAQPage schema enables Google to display Q&A directly in search results.',
      'Add FAQPage JSON-LD schema to the FAQ page. Each question/answer pair should be a Question entity with acceptedAnswer.',
      {
        why: 'FAQPage rich results take up 3x more SERP space than regular results and can drive significantly more clicks without ranking higher.',
      },
    ));
  }

  // ── Event schema ──────────────────────────────────────────────────────────
  const hasEventSchema = allTypes.some((t) => /^Event$/i.test(t));
  const hasEventSpaces = pages.some((p) => p.extracted.eventSpaces.length > 0);

  if (hasEventSpaces && !hasEventSchema) {
    findings.push(finding(
      'schema', 'p2', 'light',
      'No Event schema for venue event spaces',
      'Event spaces are described on the site but no Event or EventVenue schema is present.',
      'Consider adding Event schema for recurring or sample events, and EventVenue schema for the venue spaces themselves.',
      { why: 'Event schema can surface venue pages in Google\'s Events panel for location-based searches.' },
    ));
  }

  // ── BreadcrumbList schema ─────────────────────────────────────────────────
  const hasBreadcrumb = allTypes.some((t) => /BreadcrumbList/i.test(t));
  if (!hasBreadcrumb && pages.length > 5) {
    findings.push(finding(
      'schema', 'p2', 'light',
      'No BreadcrumbList schema',
      'No breadcrumb schema detected. BreadcrumbList schema helps Google display site structure in search results.',
      'Add BreadcrumbList JSON-LD to all non-homepage pages. This is typically handled automatically by CMS plugins.',
      { why: 'Breadcrumbs in search results improve click-through rates and help users understand site structure.' },
    ));
  }

  // ── Review/AggregateRating schema ─────────────────────────────────────────
  const hasReviewSchema = allTypes.some((t) => /AggregateRating|Review/i.test(t));
  const allTestimonials = pages.flatMap((p) => p.extracted.testimonials);

  if (allTestimonials.length >= 3 && !hasReviewSchema) {
    findings.push(finding(
      'schema', 'p1', 'medium',
      'Testimonials present but no Review/AggregateRating schema',
      'The site has testimonials but no structured review markup. AggregateRating schema enables star ratings in search results.',
      'Add AggregateRating schema with review count and average score. Gather and display verified reviews to qualify for rich results.',
      {
        why: 'Star ratings in search results increase click-through rates by 15-30% on average. For a venue business, social proof in SERPs is a significant competitive advantage.',
      },
    ));
  }

  const score = scoreFromFindings(findings);
  const summary = `Schema markup: ${pagesWithSchema} of ${pages.length} pages have JSON-LD. Types found: ${[...new Set(allTypes)].join(', ') || 'none'}. ${findings.length} issues found.`;

  return {
    dimension: 'schema',
    score,
    summary,
    findings,
    completed_at: new Date().toISOString(),
  };
}
