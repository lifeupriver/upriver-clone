#!/usr/bin/env node
// Manual synthesizer: assembles audit-package.json + supporting docs from
// pre-generated LLM artifacts in clients/<slug>/synth-inputs/, bypassing
// the Anthropic SDK calls in `upriver synthesize`.

import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { computeImpactMetrics } from '../packages/cli/dist/synthesize/impact-metrics.js';
import { loadPagesAndTokens } from '../packages/cli/dist/synthesize/loader.js';
import {
  buildProductMarketingContext,
  buildBrandVoiceGuide,
  buildClientClaudeMd,
} from '../packages/cli/dist/docs/client-docs.js';
import { readClientConfig, clientDir } from '../packages/cli/node_modules/@upriver/core/dist/index.js';

const slug = process.argv[2];
if (!slug) {
  console.error('usage: node scripts/synthesize-manual.mjs <slug>');
  process.exit(1);
}

const dir = resolve(clientDir(slug));
if (!existsSync(dir)) throw new Error(`Client dir not found: ${dir}`);

const config = readClientConfig(slug);
const auditDir = join(dir, 'audit');
const synthDir = join(dir, 'synth-inputs');

const passes = readdirSync(auditDir)
  .filter((f) => f.endsWith('.json') && f !== 'summary.json')
  .map((f) => JSON.parse(readFileSync(join(auditDir, f), 'utf8')));

const allFindings = passes
  .flatMap((p) => p.findings)
  .sort((a, b) => {
    const order = { p0: 0, p1: 1, p2: 2 };
    return (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
  });

const findingsByPriority = {
  p0: allFindings.filter((f) => f.priority === 'p0').length,
  p1: allFindings.filter((f) => f.priority === 'p1').length,
  p2: allFindings.filter((f) => f.priority === 'p2').length,
};

const scoreByDimension = Object.fromEntries(passes.map((p) => [p.dimension, p.score]));
const overallScore = Math.round(passes.reduce((s, r) => s + r.score, 0) / passes.length);

const { pages, designTokens } = loadPagesAndTokens(dir);
const impactMetrics = computeImpactMetrics({ passes, findings: allFindings, pages, scoreByDimension });

const brandingProfile = designTokens ?? {};

function toStringArray(v) {
  if (Array.isArray(v)) return v.filter((x) => typeof x === 'string');
  if (typeof v === 'string') return v.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

function synthesizeDesignSystem(profile) {
  const colors = profile.colors ?? {};
  const fonts = toStringArray(profile.fonts?.map?.((f) => (typeof f === 'string' ? f : f.family)) ?? profile.fonts);
  const typography = profile.typography ?? {};
  const fontFamilies = typography.fontFamilies ?? {};
  const fontSizes = typography.fontSizes ?? {};
  const components = profile.components ?? {};
  return {
    colors: {
      primary: colors.primary ?? '#000000',
      secondary: colors.secondary ?? '#666666',
      accent: colors.accent ?? '#999999',
      background: colors.background ?? '#ffffff',
      textPrimary: colors.textPrimary ?? '#111111',
      textSecondary: colors.textSecondary ?? '#555555',
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
      primaryButton: components.buttonPrimary ?? {},
      secondaryButton: components.buttonSecondary ?? {},
      inputField: components.input ?? {},
    },
    logo: profile.logo ?? profile.images?.logo ?? '',
    favicon: profile.images?.favicon ?? '',
    colorScheme: profile.colorScheme ?? 'light',
    personality: toStringArray(
      profile.personality && typeof profile.personality === 'object'
        ? Object.values(profile.personality)
        : profile.personality,
    ),
  };
}

const designSystem = synthesizeDesignSystem(brandingProfile);

function toSitePage(p) {
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
      ...(c.type ? { type: c.type } : {}),
    })),
    schemaTypes: [],
    hasCanonical: Boolean(p.metadata?.canonical),
    statusCode: p.metadata?.statusCode ?? 200,
  };
}

function toScreenshot(p) {
  return {
    url: p.url,
    slug: p.slug,
    desktop: p.screenshots?.desktop ?? null,
    mobile: p.screenshots?.mobile ?? null,
  };
}

function extractMissingPages(passes) {
  const sales = passes.find((p) => p.dimension === 'sales');
  if (!sales) return [];
  return sales.findings
    .filter((f) => /^Missing:/i.test(f.title))
    .map((f) => ({
      pageType: f.title.replace(/^Missing:\s*/i, ''),
      reason: f.description,
      priority: f.priority,
    }));
}

function aggregateContent(pages) {
  const inv = {
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
    for (const t of ex.testimonials ?? []) inv.testimonials.push({ quote: t.quote, attribution: t.attribution ?? '', page: p.url });
    for (const m of ex.teamMembers ?? []) inv.teamMembers.push({ name: m.name, role: m.role ?? '', page: p.url });
    for (const f of ex.faqs ?? []) inv.faqs.push({ question: f.question, answer: f.answer, page: p.url });
    for (const pr of ex.pricing ?? []) inv.pricing.push({ item: pr.item, price: pr.price ?? '', page: p.url });
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

const sitePages = pages.map(toSitePage);
const missingPages = extractMissingPages(passes);
const siteStructure = { pages: sitePages, navigation: { primary: [], footer: [] }, missingPages };
const contentInventory = aggregateContent(pages);
const screenshots = { pages: pages.map(toScreenshot) };

const brandVoiceDraft = JSON.parse(readFileSync(join(synthDir, 'brand-voice.json'), 'utf8'));
const implementationPlan = JSON.parse(readFileSync(join(synthDir, 'implementation-plan.json'), 'utf8'));
const executiveSummary = readFileSync(join(synthDir, 'executive-summary.md'), 'utf8');

implementationPlan.quickWins = allFindings.filter((f) => f.priority === 'p0' && f.effort === 'light');
implementationPlan.requiresClientInput ??= [];
implementationPlan.requiresNewContent ??= [];
implementationPlan.requiresAssets ??= [];

const auditPackage = {
  meta: {
    clientName: config.name,
    clientSlug: slug,
    siteUrl: config.url,
    auditDate: new Date().toISOString(),
    auditor: 'Upriver Consulting',
    totalPages: pages.length,
    totalFindings: allFindings.length,
    findingsByPriority,
    overallScore,
    scoreByDimension,
  },
  brandingProfile,
  designSystem,
  siteStructure,
  contentInventory,
  screenshots,
  findings: allFindings,
  brandVoiceDraft,
  implementationPlan,
  impactMetrics,
};

const pkgPath = join(dir, 'audit-package.json');
writeFileSync(pkgPath, JSON.stringify(auditPackage, null, 2), 'utf8');
console.log(`  Wrote ${pkgPath}`);

const execPath = join(dir, 'executive-summary.md');
writeFileSync(execPath, executiveSummary, 'utf8');
console.log(`  Wrote ${execPath}`);

const repoAgentsDir = join(dir, 'repo', '.agents');
const docsDir = join(dir, 'docs');
const repoDir = join(dir, 'repo');
mkdirSync(repoAgentsDir, { recursive: true });
mkdirSync(docsDir, { recursive: true });

const pmContextPath = join(repoAgentsDir, 'product-marketing-context.md');
writeFileSync(pmContextPath, buildProductMarketingContext(auditPackage), 'utf8');
console.log(`  Wrote ${pmContextPath}`);

const brandGuidePath = join(docsDir, 'brand-voice-guide.md');
writeFileSync(brandGuidePath, buildBrandVoiceGuide(auditPackage, executiveSummary), 'utf8');
console.log(`  Wrote ${brandGuidePath}`);

const claudeMdPath = join(repoDir, 'CLAUDE.md');
writeFileSync(claudeMdPath, buildClientClaudeMd(auditPackage), 'utf8');
console.log(`  Wrote ${claudeMdPath}`);

console.log(`\nSynthesis complete. ${allFindings.length} findings, score ${overallScore}/100.`);
