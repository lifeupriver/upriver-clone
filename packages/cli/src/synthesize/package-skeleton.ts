import type {
  AuditFinding,
  AuditPackage,
  AuditPassResult,
  ContentInventory,
  DesignSystem,
  ImplementationPhase,
  MissingPage,
  ScreenshotEntry,
  SitePage,
  SiteStructure,
} from '@upriver/core';

import type { LoadedPage } from './loader.js';

/**
 * The deterministic core of an audit package — everything `upriver scaffold`
 * hard-requires, built without any LLM call. `upriver synthesize` layers the
 * LLM-generated parts (brandVoiceDraft, implementationPlan, executive summary)
 * on top of this skeleton.
 *
 * Contract: every key here is ALWAYS present and JSON-serializable, even when
 * upstream data is sparse (no pages scraped, no design tokens, empty config).
 * The scaffold dereferences `meta.clientName`, `designSystem`,
 * `siteStructure.pages`, and `contentInventory` unconditionally — a missing
 * key crashes it, so the skeleton guarantees safe defaults instead.
 */
export interface PackageSkeleton {
  meta: AuditPackage['meta'];
  brandingProfile: AuditPackage['brandingProfile'];
  designSystem: DesignSystem;
  siteStructure: SiteStructure;
  contentInventory: ContentInventory;
  screenshots: AuditPackage['screenshots'];
  findings: AuditFinding[];
}

export interface PackageSkeletonInput {
  slug: string;
  /** Client config; `name`/`url` may be absent in sparse fixtures. */
  config: { name?: string | null | undefined; url?: string | null | undefined };
  pages: LoadedPage[];
  /** Parsed design-tokens.json (branding profile), or null when missing. */
  designTokens: unknown;
  passes: AuditPassResult[];
}

/**
 * Build the deterministic audit-package skeleton. Pure: no IO, no LLM, no
 * clock dependence besides `auditDate`. Guarantees the four scaffold-critical
 * keys (`meta.clientName`, `designSystem`, `siteStructure.pages`,
 * `contentInventory`) exist with safe defaults given minimal inputs.
 */
export function buildPackageSkeleton(input: PackageSkeletonInput): PackageSkeleton {
  const { slug, config } = input;
  const pages = input.pages ?? [];
  const passes = input.passes ?? [];

  const allFindings = passes
    .flatMap((p) => p.findings ?? [])
    .sort(sortByPriority);

  const findingsByPriority = {
    p0: allFindings.filter((f) => f.priority === 'p0').length,
    p1: allFindings.filter((f) => f.priority === 'p1').length,
    p2: allFindings.filter((f) => f.priority === 'p2').length,
  };

  const scoreByDimension = Object.fromEntries(passes.map((p) => [p.dimension, p.score]));
  const overallScore =
    passes.length > 0
      ? Math.round(passes.reduce((s, r) => s + (r.score ?? 0), 0) / passes.length)
      : 0;

  // Tolerate null/undefined/non-object design tokens — the design system
  // synthesizer below fills every field with neutral defaults.
  const tokens = input.designTokens;
  const brandingProfile = (
    tokens !== null && typeof tokens === 'object' && !Array.isArray(tokens) ? tokens : {}
  ) as AuditPackage['brandingProfile'];

  const clientName = (config?.name ?? '').trim() || slug;
  const siteUrl = (config?.url ?? '').trim();

  return {
    meta: {
      clientName,
      clientSlug: slug,
      siteUrl,
      auditDate: new Date().toISOString(),
      auditor: 'Upriver Consulting',
      totalPages: pages.length,
      totalFindings: allFindings.length,
      findingsByPriority,
      overallScore,
      scoreByDimension,
    },
    brandingProfile,
    designSystem: synthesizeDesignSystem(brandingProfile),
    siteStructure: {
      pages: pages.map(toSitePage),
      navigation: { primary: [], footer: [] },
      missingPages: extractMissingPages(passes),
    },
    contentInventory: aggregateContent(pages),
    screenshots: { pages: pages.map(toScreenshot) },
    findings: allFindings,
  };
}

export function sortByPriority(a: AuditFinding, b: AuditFinding): number {
  const order: Record<string, number> = { p0: 0, p1: 1, p2: 2 };
  return (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
}

function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  if (typeof v === 'string') return v.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

/** Default design tokens applied wherever the branding profile is sparse. */
export function synthesizeDesignSystem(profile: AuditPackage['brandingProfile']): DesignSystem {
  const colors = (profile.colors ?? {}) as Record<string, string>;
  const fonts = toStringArray(profile.fonts);
  const typography = profile.typography ?? {};
  const fontFamilies = typography.fontFamilies ?? {};
  const fontSizes = typography.fontSizes ?? {};
  const components = profile.components ?? {};

  return {
    colors: {
      primary: colors['primary'] ?? '#000000',
      secondary: colors['secondary'] ?? '#666666',
      accent: colors['accent'] ?? '#999999',
      background: colors['background'] ?? '#ffffff',
      textPrimary: colors['textPrimary'] ?? '#111111',
      textSecondary: colors['textSecondary'] ?? '#555555',
      ...colors,
    },
    typography: {
      headingFont: fontFamilies.heading ?? fonts[0] ?? 'serif',
      bodyFont: fontFamilies.primary ?? fonts[1] ?? fonts[0] ?? 'sans-serif',
      monoFont: fontFamilies.code ?? 'monospace',
      scale: {
        h1: fontSizes.h1 ?? '3rem',
        h2: fontSizes.h2 ?? '2.25rem',
        h3: fontSizes.h3 ?? '1.5rem',
        body: fontSizes.body ?? '1rem',
        small: '0.875rem',
      },
    },
    spacing: {
      baseUnit: 4,
      scale: [4, 8, 12, 16, 24, 32, 48, 64, 96, 128],
      borderRadius: profile.spacing?.borderRadius ?? '0.25rem',
    },
    components: {
      primaryButton: (components.buttonPrimary ?? {}) as Record<string, string>,
      secondaryButton: (components.buttonSecondary ?? {}) as Record<string, string>,
      inputField: (components.input ?? {}) as Record<string, string>,
    },
    logo: profile.logo ?? profile.images?.logo ?? '',
    favicon: profile.images?.favicon ?? '',
    colorScheme: profile.colorScheme ?? 'light',
    personality: toStringArray(profile.personality),
  };
}

export function toSitePage(p: LoadedPage): SitePage {
  return {
    url: p.url,
    slug: p.slug,
    title: p.metadata?.title ?? '',
    description: p.metadata?.description ?? '',
    wordCount: p.content?.wordCount ?? 0,
    headings: p.content?.headings ?? [],
    images: p.images ?? [],
    internalLinks: p.links?.internal ?? [],
    externalLinks: p.links?.external ?? [],
    ctaButtons: (p.extracted?.ctaButtons ?? []).map((c) => ({
      text: c.text,
      href: c.href,
      ...(c.type ? { type: c.type as 'primary' | 'secondary' | 'link' } : {}),
    })),
    schemaTypes: [],
    hasCanonical: Boolean(p.metadata?.canonical),
    statusCode: p.metadata?.statusCode ?? 200,
  };
}

export function toScreenshot(p: LoadedPage): ScreenshotEntry {
  return {
    url: p.url,
    slug: p.slug,
    desktop: p.screenshots?.desktop ?? null,
    mobile: p.screenshots?.mobile ?? null,
  };
}

export function extractMissingPages(passes: AuditPassResult[]): MissingPage[] {
  const sales = passes.find((p) => p.dimension === 'sales');
  if (!sales) return [];
  return (sales.findings ?? [])
    .filter((f) => /^Missing:/i.test(f.title))
    .map((f) => ({
      pageType: f.title.replace(/^Missing:\s*/i, ''),
      reason: f.description,
      priority: f.priority,
    }));
}

export function aggregateContent(pages: LoadedPage[]): ContentInventory {
  const inv: ContentInventory = {
    testimonials: [],
    teamMembers: [],
    faqs: [],
    pricing: [],
    socialLinks: [],
    contactInfo: {},
    eventSpaces: [],
  };

  for (const p of pages) {
    const ex = p.extracted ?? {};
    for (const t of ex.testimonials ?? []) {
      inv.testimonials.push({
        quote: t.quote,
        attribution: t.attribution ?? '',
        page: p.url,
      });
    }
    for (const m of ex.teamMembers ?? []) {
      inv.teamMembers.push({ name: m.name, role: m.role ?? '', page: p.url });
    }
    for (const f of ex.faqs ?? []) {
      inv.faqs.push({ question: f.question, answer: f.answer, page: p.url });
    }
    for (const pr of ex.pricing ?? []) {
      inv.pricing.push({ item: pr.item, price: pr.price ?? '', page: p.url });
    }
    for (const s of ex.socialLinks ?? []) {
      if (!inv.socialLinks.some((x) => x.platform === s.platform && x.url === s.url)) {
        inv.socialLinks.push({ platform: s.platform, url: s.url });
      }
    }
    for (const e of ex.eventSpaces ?? []) {
      inv.eventSpaces.push({
        name: e.name,
        ...(e.capacity !== undefined ? { capacity: e.capacity } : {}),
        description: e.description ?? '',
        page: p.url,
      });
    }
    const c = ex.contact ?? {};
    if (c.phone && !inv.contactInfo.phone) inv.contactInfo.phone = c.phone;
    if (c.email && !inv.contactInfo.email) inv.contactInfo.email = c.email;
    if (c.address && !inv.contactInfo.address) inv.contactInfo.address = c.address;
    if (c.hours && !inv.contactInfo.hours) inv.contactInfo.hours = c.hours;
  }

  return inv;
}

export function defaultPhases(findings: AuditFinding[]): ImplementationPhase[] {
  const ids = (filter: (f: AuditFinding) => boolean) =>
    findings.filter(filter).map((f) => f.id);
  return [
    {
      phase: 1,
      name: 'Quick wins',
      description: 'P0 findings with light implementation effort.',
      findings: ids((f) => f.priority === 'p0' && f.effort === 'light'),
      estimatedEffort: '1-2 weeks',
      estimatedImpact: 'High — immediate conversion lift',
    },
    {
      phase: 2,
      name: 'Structural fixes',
      description: 'SEO, schema, links, and design system corrections.',
      findings: ids(
        (f) =>
          ['seo', 'schema', 'links', 'design'].includes(f.dimension) && f.effort !== 'light',
      ),
      estimatedEffort: '2-4 weeks',
      estimatedImpact: 'Medium — search visibility and UX',
    },
    {
      phase: 3,
      name: 'Content build-out',
      description: 'Missing pages and content gaps.',
      findings: ids(
        (f) => ['content', 'sales'].includes(f.dimension) && f.effort === 'heavy',
      ),
      estimatedEffort: '4-6 weeks',
      estimatedImpact: 'High — pipeline depth',
    },
    {
      phase: 4,
      name: 'AEO and authority',
      description: 'AI search optimization, backlinks, local presence.',
      findings: ids((f) => ['aeo', 'backlinks', 'local'].includes(f.dimension)),
      estimatedEffort: '6-12 weeks',
      estimatedImpact: 'Medium — long-term moat',
    },
  ];
}
