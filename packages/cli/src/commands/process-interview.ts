import Anthropic from '@anthropic-ai/sdk';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  clientDir,
  FirecrawlClient,
  logUsageEvent,
  readClientConfig,
} from '@upriver/core';
import type { AuditPackage, FirecrawlScrapeResult } from '@upriver/core';

const MODEL = 'claude-opus-4-7';
const INPUT_BUDGET_TOKENS = 30_000;
const INPUT_BUDGET_CHARS = INPUT_BUDGET_TOKENS * 4; // rough tokens→chars estimate
const MAX_TOKENS = 16000;
const SKILL_PATH = '.agents/skills/customer-research/SKILL.md';

interface InterviewSynthesis {
  brandVoiceGuide: string;
  faqBank: string;
  aestheticOverrides: string;
  assetGaps: string;
  productMarketingContext: string;
}

export default class ProcessInterview extends BaseCommand {
  static override description =
    'Mine public reviews, synthesize interview transcript, and produce brand/voice/FAQ/asset docs';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    transcript: Flags.string({
      description: 'Path to interview transcript file (txt or md)',
      required: true,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ProcessInterview);
    const { slug } = args;
    const anthropicKey = this.requireEnv('ANTHROPIC_API_KEY');
    const firecrawlKey = this.requireEnv('FIRECRAWL_API_KEY');

    const dir = clientDir(slug);
    const pkgPath = join(dir, 'audit-package.json');
    if (!existsSync(pkgPath)) {
      this.error(
        `No audit-package.json at ${pkgPath}. Run "upriver synthesize ${slug}" first.`,
      );
    }
    if (!existsSync(flags.transcript)) {
      this.error(`Transcript file not found: ${flags.transcript}`);
    }

    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as AuditPackage;
    const transcript = readFileSync(flags.transcript, 'utf8');
    const config = readClientConfig(slug);

    this.log(`\nProcessing interview for "${pkg.meta.clientName}"...`);

    // Read the customer-research skill so the synthesis prompt follows its framework.
    const skillGuidance = readSkill(this);

    // Mine public reviews via Firecrawl.
    this.log(`\n  [1/3] Mining public reviews (Google, WeddingWire, The Knot)...`);
    const firecrawl = new FirecrawlClient({
      apiKey: firecrawlKey,
      clientSlug: slug,
      command: 'process-interview',
      creditLogPath: join(dir, 'usage.log'),
    });
    const reviewMined = await mineReviews(firecrawl, config.name, this);
    writeFileSync(
      join(dir, 'voc-reviews.md'),
      reviewMined.combined,
      'utf8',
    );
    this.log(`      Wrote ${join(dir, 'voc-reviews.md')} (${reviewMined.sourceCount} sources)`);

    // Build combined VOC input and synthesize.
    this.log(`\n  [2/3] Synthesizing brand voice guide, FAQ bank, and overrides...`);
    const anthropic = new Anthropic({ apiKey: anthropicKey });
    const synthesis = await synthesizeInterview({
      anthropic,
      slug,
      pkg,
      transcript,
      minedReviews: reviewMined.combined,
      skillGuidance,
      cmd: this,
    });

    // Write deliverables.
    this.log(`\n  [3/3] Writing deliverables...`);
    const docsDir = join(dir, 'docs');
    const repoAgentsDir = join(dir, 'repo', '.agents');
    mkdirSync(docsDir, { recursive: true });
    mkdirSync(repoAgentsDir, { recursive: true });

    const outputs: Array<[string, string]> = [
      [join(docsDir, 'brand-voice-guide.md'), synthesis.brandVoiceGuide],
      [join(docsDir, 'faq-bank.md'), synthesis.faqBank],
      [join(docsDir, 'aesthetic-overrides.md'), synthesis.aestheticOverrides],
      [join(docsDir, 'asset-gaps.md'), synthesis.assetGaps],
      [
        join(repoAgentsDir, 'product-marketing-context.md'),
        synthesis.productMarketingContext,
      ],
    ];
    for (const [path, body] of outputs) {
      writeFileSync(path, body.trim() + '\n', 'utf8');
      this.log(`      Wrote ${path}`);
    }

    this.log(`\nInterview processing complete.`);
    this.log(`Next: upriver design-brief ${slug}`);
  }
}

function readSkill(cmd: BaseCommand): string {
  if (!existsSync(SKILL_PATH)) {
    cmd.warn(
      `customer-research skill not found at ${SKILL_PATH} — synthesis will run without it.`,
    );
    return '';
  }
  return readFileSync(SKILL_PATH, 'utf8');
}

interface MinedReviews {
  combined: string;
  sourceCount: number;
}

async function mineReviews(
  firecrawl: FirecrawlClient,
  clientName: string,
  cmd: BaseCommand,
): Promise<MinedReviews> {
  const targets = [
    {
      label: 'Google reviews',
      url: `https://www.google.com/search?q=${encodeURIComponent(`${clientName} reviews site:google.com`)}`,
    },
    {
      label: 'WeddingWire',
      url: `https://www.google.com/search?q=${encodeURIComponent(`${clientName} site:weddingwire.com`)}`,
    },
    {
      label: 'The Knot',
      url: `https://www.google.com/search?q=${encodeURIComponent(`${clientName} site:theknot.com`)}`,
    },
  ];

  const sections: string[] = [`# Mined Public Reviews — ${clientName}`, ''];
  let sourceCount = 0;

  for (const target of targets) {
    try {
      const res: FirecrawlScrapeResult = await firecrawl.scrape(target.url, {
        formats: ['markdown'],
        onlyMainContent: true,
      });
      const md = (res.markdown ?? '').trim();
      if (md.length > 40) {
        sections.push(`## ${target.label}`);
        sections.push(`Source: ${target.url}`);
        sections.push('');
        sections.push(truncate(md, 8000));
        sections.push('');
        sourceCount++;
      } else {
        sections.push(`## ${target.label}`);
        sections.push(`Source: ${target.url}`);
        sections.push('(no content extracted)');
        sections.push('');
      }
    } catch (err) {
      cmd.warn(`Review mining failed for ${target.label}: ${String(err)}`);
      sections.push(`## ${target.label}`);
      sections.push(`Source: ${target.url}`);
      sections.push(`(scrape failed: ${String(err)})`);
      sections.push('');
    }
  }

  return { combined: sections.join('\n'), sourceCount };
}

function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max) + '\n\n[... truncated ...]' : s;
}

interface SynthesizeArgs {
  anthropic: Anthropic;
  slug: string;
  pkg: AuditPackage;
  transcript: string;
  minedReviews: string;
  skillGuidance: string;
  cmd: BaseCommand;
}

async function synthesizeInterview(args: SynthesizeArgs): Promise<InterviewSynthesis> {
  const { anthropic, slug, pkg, transcript, minedReviews, skillGuidance, cmd } = args;

  const auditSummary = summarizeAuditForPrompt(pkg);
  const prompt = buildSynthesisPrompt({
    clientName: pkg.meta.clientName,
    siteUrl: pkg.meta.siteUrl,
    auditSummary,
    transcript,
    minedReviews,
    skillGuidance,
  });

  // Guardrail: keep prompt under the declared 30K-token input budget.
  const trimmed = prompt.length > INPUT_BUDGET_CHARS
    ? prompt.slice(0, INPUT_BUDGET_CHARS)
    : prompt;
  if (trimmed.length < prompt.length) {
    cmd.warn(
      `Synthesis prompt trimmed from ${prompt.length} to ${trimmed.length} chars to stay under the 30K-token budget.`,
    );
  }

  const resp = await anthropic.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content: trimmed }],
  });

  await logUsageEvent({
    client_slug: slug,
    event_type: 'claude_api',
    model: MODEL,
    input_tokens: resp.usage.input_tokens,
    output_tokens: resp.usage.output_tokens,
    command: 'process-interview',
  });

  const block = resp.content.find((b) => b.type === 'text');
  if (!block || block.type !== 'text') {
    throw new Error('Claude returned no text content');
  }
  return parseSynthesis(block.text);
}

function parseSynthesis(text: string): InterviewSynthesis {
  const cleaned = text
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();
  const first = cleaned.indexOf('{');
  const last = cleaned.lastIndexOf('}');
  if (first < 0 || last < 0) {
    throw new Error('Synthesis response did not contain a JSON object');
  }
  const parsed = JSON.parse(cleaned.slice(first, last + 1)) as Partial<InterviewSynthesis>;
  const required: Array<keyof InterviewSynthesis> = [
    'brandVoiceGuide',
    'faqBank',
    'aestheticOverrides',
    'assetGaps',
    'productMarketingContext',
  ];
  for (const key of required) {
    if (typeof parsed[key] !== 'string' || !parsed[key]) {
      throw new Error(`Synthesis response missing "${key}"`);
    }
  }
  return parsed as InterviewSynthesis;
}

function summarizeAuditForPrompt(pkg: AuditPackage): string {
  const { meta, findings, siteStructure, contentInventory, brandVoiceDraft } = pkg;
  const top = findings
    .filter((f) => f.priority === 'p0' || f.priority === 'p1')
    .slice(0, 25)
    .map((f) => `- [${f.priority}/${f.dimension}] ${f.title} — ${f.description}`)
    .join('\n');
  const missing = siteStructure.missingPages
    .map((m) => `- ${m.pageType} [${m.priority}]: ${m.reason}`)
    .join('\n');
  const testimonials = contentInventory.testimonials
    .slice(0, 6)
    .map((t) => `- "${t.quote}"${t.attribution ? ` — ${t.attribution}` : ''}`)
    .join('\n');

  return `Overall score: ${meta.overallScore}/100 (${meta.totalFindings} findings)

Top findings (P0/P1):
${top || '(none)'}

Missing pages:
${missing || '(none)'}

Brand voice draft:
- Tone: ${brandVoiceDraft?.tone ?? '(none)'}
- Characteristics: ${brandVoiceDraft?.voiceCharacteristics?.join(', ') ?? '(none)'}
- Audience: ${brandVoiceDraft?.audienceDescription ?? '(none)'}
- Keywords: ${brandVoiceDraft?.keywords?.join(', ') ?? '(none)'}
- Banned: ${brandVoiceDraft?.bannedWords?.join(', ') ?? '(none)'}

On-site testimonials:
${testimonials || '(none)'}`;
}

interface PromptArgs {
  clientName: string;
  siteUrl: string;
  auditSummary: string;
  transcript: string;
  minedReviews: string;
  skillGuidance: string;
}

function buildSynthesisPrompt(args: PromptArgs): string {
  const { clientName, siteUrl, auditSummary, transcript, minedReviews, skillGuidance } = args;

  return `You are synthesizing a client interview transcript plus mined public reviews into the finished voice-of-customer and brand documents that will drive a website rebuild.

Follow the framework defined in the customer-research skill below. Use its extraction template (jobs to be done, pains, trigger events, desired outcomes, vocabulary, alternatives) on the transcript AND on the mined reviews. Cluster themes, apply frequency × intensity scoring, flag confidence levels, and surface money quotes. Do NOT invent a parallel framework.

# customer-research skill (authoritative framework)
${skillGuidance || '(skill unavailable — apply standard VOC synthesis)'}

# Client
- Name: ${clientName}
- Site: ${siteUrl}

# Audit summary (context from the site audit)
${auditSummary}

# Mined public reviews (Google, WeddingWire, The Knot)
${minedReviews}

# Interview transcript (primary source — the client's own words)
${transcript}

---

# Your task

Produce five markdown deliverables. Return them in a single JSON object. No prose outside the JSON, no markdown fences around the object itself.

Required JSON shape (each value is a markdown string):

{
  "brandVoiceGuide": "# Brand Voice Guide — ${clientName}\\n...",
  "faqBank": "# FAQ Bank — ${clientName}\\n...",
  "aestheticOverrides": "# Aesthetic & Strategic Overrides — ${clientName}\\n...",
  "assetGaps": "# Asset Gaps — ${clientName}\\n...",
  "productMarketingContext": "# Product Marketing Context: ${clientName}\\n..."
}

## brandVoiceGuide (richer than the auto-drafted version)
Required sections:
- Voice in three words (pulled from how the client actually talks in the transcript)
- What the brand sounds like now (verbatim from transcript + reviews)
- What it should sound like (rewritten samples using the client's actual vocabulary)
- Tone guidelines — grounded in specific transcript quotes with attribution like "(interview)" or "(Google review)"
- Word choices: Use / Avoid (each sourced from the transcript or reviews)
- Sample headlines (10) — written in the synthesized voice
- Voice do's and don'ts (5 each) with concrete before/after examples
- Audience profile (pulled from JTBD + trigger events from the research)
- Content type guidance (homepage hero, inquiry form, email auto-reply, Instagram caption, FAQ entry)
- Money quotes bank: 8-12 verbatim quotes, each tagged with source and the theme they represent
- Confidence notes: flag any voice claim as High/Medium/Low per the skill's guardrails

## faqBank
50-100 Q&As written in the client's voice. Answer the questions the AEO findings flagged as missing, plus the objections the mined reviews surface. Group under headings (Planning & Booking, Pricing & Packages, The Space & Logistics, Vendors & Catering, Day-Of Experience, After the Event, etc.). For every Q&A:
- Question in how a prospect would actually phrase it (prefer review/transcript phrasing)
- Answer in the client's voice — specific, not corporate — keep under 120 words
- If an answer pulls a verbatim phrase from the transcript, keep it verbatim

## aestheticOverrides
Every audit finding the client explicitly wants to override or soften, based on the transcript. Format each as:
- **Audit said**: (paraphrase the finding)
- **Client says**: (verbatim quote from transcript if possible)
- **Decision**: override / soften / accept-as-is
- **Reasoning**: why the client's call wins here (their business context)
- **Rebuild implication**: what we do differently because of this
Only include items the transcript actually addresses. If the client didn't push back on a finding, don't list it.

## assetGaps
Photo, video, and brand-file needs. Two sections:
1. **Needed shots/clips** — derived from the audit's missing pages and content gaps, refined by what the client said they have / don't have in the interview. Each item: what to shoot, where, approximate count, priority.
2. **Client has but hasn't shared** — things the transcript implies exist (past photos, testimonial videos, press mentions) that need to be gathered.

## productMarketingContext
A richer replacement for the auto-generated .agents/product-marketing-context.md. Required sections:
- What we do (1 paragraph grounded in the transcript)
- Target audience (JTBD framing: functional, emotional, social)
- Trigger events (what sends a couple looking for this venue)
- Top pains customers voice (verbatim from reviews/transcript, with source tags)
- Desired outcomes (what success looks like to the customer, in their words)
- Key differentiators (what the client believes — pulled from transcript)
- Tone and voice summary (one paragraph pointing to brand-voice-guide.md for detail)
- Primary conversion goal and funnel flow (confirmed in interview)
- Key offers and pricing posture (what they will/won't publish)
- Proof points (money quotes from reviews + transcript)
- Competitors and alternatives considered (from reviews / transcript)
- Common objections and how the client answers them
- Gaps still to resolve (things the transcript didn't settle)

Hard rules:
- Every claim about customer voice must be traceable to a transcript line or a mined review. Tag sources inline: (interview), (Google), (WeddingWire), (The Knot).
- Prefer verbatim quotes over paraphrase whenever possible.
- If a theme only appears in one source, label it Low confidence per the skill.
- Do not invent reviews or quotes. If mined reviews are empty, say so and lean on the transcript, but never fabricate.
- Keep each markdown document self-contained — no "see above" references between them.
- Output ONLY the JSON object described. No preamble, no explanation, no trailing notes.`;
}
