import Anthropic from '@anthropic-ai/sdk';
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Args } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { clientDir, readClientConfig, logUsageEvent } from '@upriver/core';
import type {
  AuditPackage,
  AuditFinding,
  AuditPassResult,
  BrandVoiceDraft,
  ContentInventory,
  DesignSystem,
  ImplementationPlan,
  ImplementationPhase,
  MissingPage,
  ScreenshotEntry,
  SitePage,
  SiteStructure,
} from '@upriver/core';
import {
  buildProductMarketingContext,
  buildBrandVoiceGuide,
  buildClientClaudeMd,
} from '../docs/client-docs.js';
import { loadPagesAndTokens, type LoadedPage } from '../synthesize/loader.js';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 8000;

export default class Synthesize extends BaseCommand {
  static override description =
    'Compile audit passes into audit-package.json and generate client documents';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(Synthesize);
    const { slug } = args;
    const apiKey = this.requireEnv('ANTHROPIC_API_KEY');

    const dir = clientDir(slug);
    if (!existsSync(dir)) this.error(`Client directory not found: ${dir}`);

    const config = readClientConfig(slug);
    const auditDir = join(dir, 'audit');
    if (!existsSync(auditDir)) {
      this.error(`No audit/ directory at ${auditDir}. Run "upriver audit ${slug}" first.`);
    }

    this.log(`\nSynthesizing audit-package.json for "${slug}"...`);

    const { pages, designTokens } = loadPagesAndTokens(dir);
    const passes = loadAuditPasses(auditDir);
    if (passes.length === 0) this.error('No audit pass JSON files found.');

    const allFindings = passes
      .flatMap((p) => p.findings)
      .sort(sortByPriority);

    const findingsByPriority = {
      p0: allFindings.filter((f) => f.priority === 'p0').length,
      p1: allFindings.filter((f) => f.priority === 'p1').length,
      p2: allFindings.filter((f) => f.priority === 'p2').length,
    };

    const scoreByDimension = Object.fromEntries(passes.map((p) => [p.dimension, p.score]));
    const overallScore = Math.round(passes.reduce((s, r) => s + r.score, 0) / passes.length);

    const brandingProfile = (designTokens ?? {}) as AuditPackage['brandingProfile'];
    const designSystem = synthesizeDesignSystem(brandingProfile);
    const sitePages = pages.map(toSitePage);
    const missingPages = extractMissingPages(passes);
    const siteStructure: SiteStructure = {
      pages: sitePages,
      navigation: { primary: [], footer: [] },
      missingPages,
    };
    const contentInventory = aggregateContent(pages);
    const screenshots = { pages: pages.map(toScreenshot) };

    const anthropic = new Anthropic({ apiKey });

    this.log('  [1/3] Drafting brand voice...');
    const brandVoiceDraft = await callClaude<BrandVoiceDraft>(
      anthropic,
      slug,
      'synthesize',
      brandVoicePrompt(config.name, contentInventory, designSystem, pages),
      this,
    );

    this.log('  [2/3] Writing executive summary...');
    const executiveSummary = await callClaudeText(
      anthropic,
      slug,
      'synthesize',
      executiveSummaryPrompt(config.name, overallScore, allFindings, scoreByDimension),
      this,
    );

    this.log('  [3/3] Building implementation plan...');
    const implementationPlan = await callClaude<ImplementationPlan>(
      anthropic,
      slug,
      'synthesize',
      implementationPlanPrompt(allFindings, missingPages),
      this,
    );

    // quickWins is always derived locally for type safety; Claude only proposes the phase plan
    implementationPlan.quickWins = allFindings.filter(
      (f) => f.priority === 'p0' && f.effort === 'light',
    );
    if (!implementationPlan.phases?.length) {
      implementationPlan.phases = defaultPhases(allFindings);
    }
    implementationPlan.requiresClientInput ??= [];
    implementationPlan.requiresNewContent ??= [];
    implementationPlan.requiresAssets ??= [];

    const auditPackage: AuditPackage = {
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
    };

    const pkgPath = join(dir, 'audit-package.json');
    writeFileSync(pkgPath, JSON.stringify(auditPackage, null, 2), 'utf8');
    this.log(`\n  Wrote ${pkgPath}`);

    const repoAgentsDir = join(dir, 'repo', '.agents');
    const docsDir = join(dir, 'docs');
    const repoDir = join(dir, 'repo');
    mkdirSync(repoAgentsDir, { recursive: true });
    mkdirSync(docsDir, { recursive: true });

    const pmContextPath = join(repoAgentsDir, 'product-marketing-context.md');
    writeFileSync(pmContextPath, buildProductMarketingContext(auditPackage), 'utf8');
    this.log(`  Wrote ${pmContextPath}`);

    const brandGuidePath = join(docsDir, 'brand-voice-guide.md');
    writeFileSync(
      brandGuidePath,
      buildBrandVoiceGuide(auditPackage, executiveSummary),
      'utf8',
    );
    this.log(`  Wrote ${brandGuidePath}`);

    const claudeMdPath = join(repoDir, 'CLAUDE.md');
    writeFileSync(claudeMdPath, buildClientClaudeMd(auditPackage), 'utf8');
    this.log(`  Wrote ${claudeMdPath}`);

    this.log(`\nSynthesis complete. ${allFindings.length} findings, score ${overallScore}/100.`);
    this.log(`Next: upriver design-brief ${slug}`);
  }
}

function loadAuditPasses(auditDir: string): AuditPassResult[] {
  return readdirSync(auditDir)
    .filter((f) => f.endsWith('.json') && f !== 'summary.json')
    .map((f) => JSON.parse(readFileSync(join(auditDir, f), 'utf8')) as AuditPassResult);
}

function sortByPriority(a: AuditFinding, b: AuditFinding): number {
  const order: Record<string, number> = { p0: 0, p1: 1, p2: 2 };
  return (order[a.priority] ?? 9) - (order[b.priority] ?? 9);
}

function toStringArray(v: unknown): string[] {
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  if (typeof v === 'string') return v.split(/[,;]/).map((s) => s.trim()).filter(Boolean);
  return [];
}

function synthesizeDesignSystem(profile: AuditPackage['brandingProfile']): DesignSystem {
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

function toSitePage(p: LoadedPage): SitePage {
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

function toScreenshot(p: LoadedPage): ScreenshotEntry {
  return {
    url: p.url,
    slug: p.slug,
    desktop: p.screenshots?.desktop ?? null,
    mobile: p.screenshots?.mobile ?? null,
  };
}

function extractMissingPages(passes: AuditPassResult[]): MissingPage[] {
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

function aggregateContent(pages: LoadedPage[]): ContentInventory {
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

function defaultPhases(findings: AuditFinding[]): ImplementationPhase[] {
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

async function callClaude<T>(
  anthropic: Anthropic,
  slug: string,
  command: string,
  prompt: string,
  cmd: BaseCommand,
): Promise<T> {
  const text = await callClaudeText(anthropic, slug, command, prompt, cmd);
  return parseJson<T>(text);
}

async function callClaudeText(
  anthropic: Anthropic,
  slug: string,
  command: string,
  prompt: string,
  cmd: BaseCommand,
): Promise<string> {
  try {
    const resp = await anthropic.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
    });

    await logUsageEvent({
      client_slug: slug,
      event_type: 'claude_api',
      model: MODEL,
      input_tokens: resp.usage.input_tokens,
      output_tokens: resp.usage.output_tokens,
      command,
    });

    const block = resp.content.find((b) => b.type === 'text');
    if (!block || block.type !== 'text') throw new Error('Claude returned no text content');
    return block.text;
  } catch (err) {
    cmd.warn(`Claude API error: ${String(err)}`);
    throw err;
  }
}

function parseJson<T>(text: string): T {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  const candidates = ['{', '['].map((c) => cleaned.indexOf(c)).filter((i) => i >= 0);
  const start = candidates.length ? Math.min(...candidates) : 0;
  const slice = cleaned.slice(start);
  const end = Math.max(slice.lastIndexOf('}'), slice.lastIndexOf(']'));
  const json = end >= 0 ? slice.slice(0, end + 1) : slice;
  return JSON.parse(json) as T;
}

function brandVoicePrompt(
  clientName: string,
  inv: ContentInventory,
  ds: DesignSystem,
  pages: LoadedPage[],
): string {
  const sampleHeadings = pages
    .slice(0, 8)
    .flatMap((p) => (p.content?.headings ?? []).slice(0, 4).map((h) => h.text))
    .slice(0, 30);
  const sampleQuotes = inv.testimonials.slice(0, 5).map((t) => t.quote);
  const personality = ds.personality.join(', ') || 'unspecified';

  return `You are drafting the brand voice profile for "${clientName}" based on scraped site content.

Site personality traits (from branding extraction): ${personality}
Sample headings from the site:
${sampleHeadings.map((h) => `- ${h}`).join('\n') || '- (none)'}

Sample testimonial quotes:
${sampleQuotes.map((q) => `- "${q}"`).join('\n') || '- (none)'}

FAQs found: ${inv.faqs.length}. Team members: ${inv.teamMembers.length}.

Return ONLY valid JSON matching this exact schema (no prose, no markdown fences):
{
  "tone": "one sentence describing the recommended tone",
  "keywords": ["8-12 brand-relevant words/phrases"],
  "bannedWords": ["6-10 cliches or generic words this brand should avoid"],
  "sampleHeadlines": ["10 headline options in the recommended voice"],
  "sampleBodyCopy": ["3 short paragraphs in the recommended voice"],
  "voiceCharacteristics": ["5-7 short adjective phrases"],
  "audienceDescription": "2-3 sentences describing the target audience"
}`;
}

function executiveSummaryPrompt(
  clientName: string,
  score: number,
  findings: AuditFinding[],
  scoreByDim: Record<string, number>,
): string {
  const p0 = findings.filter((f) => f.priority === 'p0').slice(0, 6);
  const p0Lines = p0
    .map((f) => `- [${f.dimension}] ${f.title}: ${f.description}`)
    .join('\n');
  const dimLines = Object.entries(scoreByDim)
    .map(([d, s]) => `- ${d}: ${s}/100`)
    .join('\n');

  return `Write a 1-page executive summary for the website audit of "${clientName}".

Overall score: ${score}/100
Scores by dimension:
${dimLines}

Top critical (P0) findings:
${p0Lines || '(none)'}

Structure (use these markdown headings exactly):
## What's working
2-3 specific strengths drawn from dimensions scoring 70+. Concrete, not vague.

## What's costing you inquiries
The top 3 P0 findings rephrased in plain English with revenue impact framing.

## What we're recommending
Three sentences on the rebuild scope: phased plan, what we fix first, what comes later.

Keep total length under 400 words. Plain markdown only — no preface, no metadata.`;
}

function implementationPlanPrompt(
  findings: AuditFinding[],
  missingPages: MissingPage[],
): string {
  const summary = findings.slice(0, 60).map((f) => ({
    id: f.id,
    dimension: f.dimension,
    priority: f.priority,
    effort: f.effort,
    title: f.title,
  }));
  const missing = missingPages.map((m) => `- ${m.pageType} (${m.priority})`).join('\n');

  return `You are building the implementation plan for a website rebuild.

Findings (id, dimension, priority, effort, title):
${JSON.stringify(summary, null, 2)}

Missing pages:
${missing || '(none)'}

Return ONLY valid JSON (no prose, no markdown fences) matching this schema:
{
  "phases": [
    {
      "phase": 1,
      "name": "Quick wins",
      "description": "string",
      "findings": ["finding-id-1", "finding-id-2"],
      "estimatedEffort": "e.g. 1-2 weeks",
      "estimatedImpact": "string"
    }
  ],
  "quickWins": [],
  "requiresClientInput": ["specific items: brand preferences, FAQ answers, photos, etc."],
  "requiresNewContent": ["page types or content blocks that must be written"],
  "requiresAssets": ["photos, video, logo files, etc."]
}

Phases must be exactly four, in this order: 1=Quick wins, 2=Structural fixes (seo/schema/links/design), 3=Content build-out (content/sales/missing pages), 4=AEO and authority (aeo/backlinks/local). quickWins should list any P0 findings with light effort (use the finding ids from the input list — string array of ids is acceptable).`;
}
