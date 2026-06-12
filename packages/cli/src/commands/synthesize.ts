import Anthropic from '@anthropic-ai/sdk';
import { existsSync, readFileSync, readdirSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { clientDir, readClientConfig } from '@upriver/core';
import type {
  AuditPackage,
  AuditFinding,
  AuditPassResult,
  BrandVoiceDraft,
  ContentInventory,
  DesignSystem,
  ImplementationPlan,
  MissingPage,
} from '@upriver/core';
import {
  buildProductMarketingContext,
  buildBrandVoiceGuide,
  buildClientClaudeMd,
} from '../docs/client-docs.js';
import { computeImpactMetrics } from '../synthesize/impact-metrics.js';
import { loadPagesAndTokens, type LoadedPage } from '../synthesize/loader.js';
import { buildPackageSkeleton, defaultPhases } from '../synthesize/package-skeleton.js';
import { cachedClaudeCall, type CacheableTextBlockParam } from '../util/cached-llm.js';
import { claudeCliCall, claudeCliAvailable } from '../util/claude-cli.js';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 8000;

export default class Synthesize extends BaseCommand {
  static override description =
    'Compile audit passes into audit-package.json and generate client documents';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    force: Flags.boolean({
      description: 'Re-synthesize even if audit-package.json already exists',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Synthesize);
    const { slug } = args;
    const rawKey = process.env['ANTHROPIC_API_KEY'];
    const forceCli = Boolean(process.env['UPRIVER_USE_CLAUDE_CLI']);
    const looksValid = (k: string | undefined): k is string =>
      typeof k === 'string' && k.startsWith('sk-ant-') && !k.endsWith('...') && k.length > 20;
    const apiKey = !forceCli && looksValid(rawKey) ? rawKey : undefined;
    if (!apiKey) {
      const cliReady = await claudeCliAvailable();
      if (!cliReady) {
        this.error(
          'Neither ANTHROPIC_API_KEY is set nor the `claude` CLI is on PATH. Install Claude Code (npm i -g @anthropic-ai/claude-code) to use your Claude Max subscription, or set ANTHROPIC_API_KEY.',
        );
      }
      this.log('  Using `claude` CLI (Claude Max subscription) — no ANTHROPIC_API_KEY set.');
    } else {
      this.log('  Using Anthropic API key (ANTHROPIC_API_KEY).');
    }

    const dir = clientDir(slug);
    if (!existsSync(dir)) this.error(`Client directory not found: ${dir}`);

    const config = readClientConfig(slug);
    const auditDir = join(dir, 'audit');
    if (!existsSync(auditDir)) {
      this.error(`No audit/ directory at ${auditDir}. Run "upriver audit ${slug}" first.`);
    }

    const pkgPath = join(dir, 'audit-package.json');
    if (this.skipIfExists('audit-package.json', pkgPath, { force: flags.force })) return;

    this.log(`\nSynthesizing audit-package.json for "${slug}"...`);

    const { pages, designTokens } = loadPagesAndTokens(dir);
    const passes = loadAuditPasses(auditDir);
    if (passes.length === 0) this.error('No audit pass JSON files found.');

    // Deterministic core first. The skeleton ALWAYS emits the keys the
    // scaffold hard-requires (meta.clientName, designSystem,
    // siteStructure.pages, contentInventory) with safe defaults, even when
    // upstream data is sparse.
    const skeleton = buildPackageSkeleton({ slug, config, pages, designTokens, passes });
    const allFindings = skeleton.findings;
    const { overallScore, scoreByDimension } = skeleton.meta;
    const { designSystem, contentInventory } = skeleton;
    const missingPages = skeleton.siteStructure.missingPages;

    const impactMetrics = computeImpactMetrics({
      passes,
      findings: allFindings,
      pages,
      scoreByDimension,
    });

    const anthropic = apiKey ? new Anthropic({ apiKey }) : null;
    const systemBlocks = systemContextBlocks(skeleton.meta.clientName, skeleton.meta.siteUrl, overallScore);

    this.log('  [1/3] Drafting brand voice...');
    const brandVoiceDraft = await callClaude<BrandVoiceDraft>(
      anthropic,
      slug,
      'synthesize',
      brandVoicePrompt(skeleton.meta.clientName, contentInventory, designSystem, pages),
      this,
      systemBlocks,
    );

    this.log('  [2/3] Writing executive summary...');
    const executiveSummary = await callClaudeText(
      anthropic,
      slug,
      'synthesize',
      executiveSummaryPrompt(skeleton.meta.clientName, overallScore, allFindings, scoreByDimension),
      this,
      systemBlocks,
    );

    this.log('  [3/3] Building implementation plan...');
    const implementationPlan = await callClaude<ImplementationPlan>(
      anthropic,
      slug,
      'synthesize',
      implementationPlanPrompt(allFindings, missingPages),
      this,
      systemBlocks,
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

    // Skeleton first (guaranteed scaffold-critical keys), LLM layers on top.
    const auditPackage: AuditPackage = {
      ...skeleton,
      brandVoiceDraft,
      implementationPlan,
      impactMetrics,
    };

    writeFileSync(pkgPath, JSON.stringify(auditPackage, null, 2), 'utf8');
    this.log(`\n  Wrote ${pkgPath}`);

    const execPath = join(dir, 'executive-summary.md');
    writeFileSync(execPath, executiveSummary, 'utf8');
    this.log(`  Wrote ${execPath}`);

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

/**
 * Build the shared system-prompt context for synthesize's three sub-calls.
 *
 * Returns `CacheableTextBlockParam[]` so the last block can carry a
 * `cache_control: { type: 'ephemeral' }` marker. With prompt caching enabled,
 * this stable preamble is reused across all three synthesize calls within the
 * SDK's cache window, cutting input-token cost on the 2nd and 3rd calls.
 *
 * @param clientName - Display name for the client.
 * @param siteUrl - Client's site URL.
 * @param overallScore - Audit overall score (0-100).
 * @returns Cacheable system blocks, last entry marked ephemeral.
 */
function systemContextBlocks(
  clientName: string,
  siteUrl: string,
  overallScore: number,
): CacheableTextBlockParam[] {
  return [
    {
      type: 'text',
      text:
        'You are part of Upriver Consulting\'s synthesize step, compiling a website ' +
        'audit into client-facing artifacts (brand voice draft, executive summary, ' +
        'implementation plan). Be concrete, plain-spoken, and grounded in the audit ' +
        'evidence the user message provides — no generic boilerplate.',
    },
    {
      type: 'text',
      text:
        `Client: ${clientName}\nSite: ${siteUrl}\nAudit overall score: ${overallScore}/100\n\n` +
        'When the user message asks for JSON, return ONLY valid JSON with no prose ' +
        'or markdown fences. When it asks for markdown, return ONLY markdown with no ' +
        'preface or explanation.',
      cache_control: { type: 'ephemeral' },
    },
  ];
}

async function callClaude<T>(
  anthropic: Anthropic | null,
  slug: string,
  command: string,
  prompt: string,
  cmd: BaseCommand,
  system?: CacheableTextBlockParam[],
): Promise<T> {
  const text = await callClaudeText(anthropic, slug, command, prompt, cmd, system);
  return parseJson<T>(text);
}

function systemBlocksToString(system?: CacheableTextBlockParam[]): string {
  if (!system || system.length === 0) return '';
  return system.map((b) => b.text).join('\n\n');
}

async function callClaudeText(
  anthropic: Anthropic | null,
  slug: string,
  command: string,
  prompt: string,
  cmd: BaseCommand,
  system?: CacheableTextBlockParam[],
): Promise<string> {
  try {
    if (anthropic) {
      const { text } = await cachedClaudeCall({
        anthropic,
        slug,
        command,
        model: MODEL,
        maxTokens: MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
        ...(system ? { system } : {}),
        log: (msg) => cmd.log(msg),
      });
      return text;
    }
    const { text } = await claudeCliCall({
      slug,
      command,
      model: MODEL,
      systemPrompt: systemBlocksToString(system),
      userPrompt: prompt,
      log: (msg) => cmd.log(msg),
    });
    return text;
  } catch (err) {
    cmd.warn(`Claude error: ${String(err)}`);
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
