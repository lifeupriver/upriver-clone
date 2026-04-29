import Anthropic from '@anthropic-ai/sdk';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import {
  clientDir,
  FirecrawlClient,
  readClientConfig,
} from '@upriver/core';
import type { AuditPackage, FirecrawlScrapeResult } from '@upriver/core';
import { cachedClaudeCall } from '../util/cached-llm.js';

const MODEL = 'claude-opus-4-7';
const INPUT_BUDGET_TOKENS = 30_000;
const INPUT_BUDGET_CHARS = INPUT_BUDGET_TOKENS * 4; // rough tokens→chars estimate
const MAX_TOKENS_PER_DOC = 6000;
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

interface DocSpec {
  key: keyof InterviewSynthesis;
  label: string;
  brief: (clientName: string) => string;
}

const DOC_SPECS: DocSpec[] = [
  {
    key: 'brandVoiceGuide',
    label: 'Brand Voice Guide',
    brief: (name) => `Write \`brand-voice-guide.md\` for ${name}. Required sections (in this order, as markdown headings):

- # Brand Voice Guide — ${name}
- ## Voice in three words (3 words pulled from the client's transcript phrasing)
- ## What the brand sounds like now (verbatim quotes from current site / transcript)
- ## What it should sound like (3-5 rewritten samples in the client's actual vocabulary)
- ## Tone guidelines (5-7 bullets, each grounded in a transcript quote with attribution like "(interview)")
- ## Word choices: ### Use (8-12 from client's vocab) and ### Avoid (8-12 banned with reasons)
- ## Sample headlines (10) in the synthesized voice
- ## Voice do's and don'ts (5 each, with concrete before/after examples)
- ## Audience profile (JTBD framing pulled from transcript)
- ## Content type guidance (homepage hero, inquiry form, email auto-reply, Instagram caption, FAQ entry)
- ## Money quotes bank (8-12 verbatim quotes, each tagged with source)
- ## Confidence notes (label voice claims High / Medium / Low)`,
  },
  {
    key: 'faqBank',
    label: 'FAQ Bank',
    brief: (name) => `Write \`faq-bank.md\` for ${name}. Produce 50-100 Q&As written in the client's voice. Group under headings (e.g., Planning & Booking, Pricing & Packages, The Space & Logistics, Vendors & Catering, Day-Of Experience, After the Event, etc.). Answer the questions the AEO findings flagged as missing, plus the objections the mined reviews surface. For every Q&A:
- Question phrased the way a prospect would actually phrase it
- Answer in the client's voice — specific, not corporate — keep under 120 words
- If an answer pulls a verbatim phrase from the transcript, keep it verbatim
Start with: \`# FAQ Bank — ${name}\`.`,
  },
  {
    key: 'aestheticOverrides',
    label: 'Aesthetic & Strategic Overrides',
    brief: (name) => `Write \`aesthetic-overrides.md\` for ${name}. Every audit finding the client explicitly wants to override or soften, based on the transcript. Format each as:
- **Audit said**: (paraphrase the finding)
- **Client says**: (verbatim quote from transcript if possible)
- **Decision**: override / soften / accept-as-is
- **Reasoning**: why the client's call wins here (their business context)
- **Rebuild implication**: what we do differently because of this
Only include items the transcript actually addresses. If the client didn't push back on a finding, don't list it. Start with: \`# Aesthetic & Strategic Overrides — ${name}\`.`,
  },
  {
    key: 'assetGaps',
    label: 'Asset Gaps',
    brief: (name) => `Write \`asset-gaps.md\` for ${name}. Two sections:
1. **Needed shots/clips** — derived from the audit's missing pages and content gaps, refined by what the client said they have / don't have in the interview. Each item: what to shoot, where, approximate count, priority.
2. **Client has but hasn't shared** — things the transcript implies exist (past photos, testimonial videos, press mentions) that need to be gathered.
Start with: \`# Asset Gaps — ${name}\`.`,
  },
  {
    key: 'productMarketingContext',
    label: 'Product Marketing Context',
    brief: (name) => `Write a richer \`product-marketing-context.md\` for ${name}. Required sections:
- # Product Marketing Context: ${name}
- ## What we do (1 paragraph grounded in the transcript)
- ## Target audience (JTBD framing: functional, emotional, social)
- ## Trigger events (what sends a customer looking for this)
- ## Top pains customers voice (verbatim from reviews/transcript, with source tags)
- ## Desired outcomes (what success looks like to the customer, in their words)
- ## Key differentiators (what the client believes — pulled from transcript)
- ## Tone and voice summary (one paragraph pointing to brand-voice-guide.md for detail)
- ## Primary conversion goal and funnel flow (confirmed in interview)
- ## Key offers and pricing posture (what they will/won't publish)
- ## Proof points (money quotes from reviews + transcript)
- ## Competitors and alternatives considered (from reviews / transcript)
- ## Common objections and how the client answers them
- ## Gaps still to resolve (things the transcript didn't settle)`,
  },
];

async function synthesizeInterview(args: SynthesizeArgs): Promise<InterviewSynthesis> {
  const { anthropic, slug, pkg, transcript, minedReviews, skillGuidance, cmd } = args;
  const auditSummary = summarizeAuditForPrompt(pkg);
  const sharedContext = buildSharedContext({
    clientName: pkg.meta.clientName,
    siteUrl: pkg.meta.siteUrl,
    auditSummary,
    transcript,
    minedReviews,
    skillGuidance,
  });

  const debugDir = join(clientDir(slug), 'process-interview-debug');
  const result: Partial<InterviewSynthesis> = {};

  for (const [i, spec] of DOC_SPECS.entries()) {
    cmd.log(`      [${i + 1}/${DOC_SPECS.length}] ${spec.label}...`);
    const md = await callOneDoc({
      anthropic,
      slug,
      sharedContext,
      spec,
      clientName: pkg.meta.clientName,
      cmd,
      debugDir,
    });
    result[spec.key] = md;
  }

  return result as InterviewSynthesis;
}

interface CallOneDocArgs {
  anthropic: Anthropic;
  slug: string;
  sharedContext: string;
  spec: DocSpec;
  clientName: string;
  cmd: BaseCommand;
  debugDir: string;
}

async function callOneDoc(args: CallOneDocArgs): Promise<string> {
  const { anthropic, slug, sharedContext, spec, clientName, cmd, debugDir } = args;
  const prompt = `${sharedContext}

---

# Your task: produce ONE markdown document

${spec.brief(clientName)}

## Hard rules
- Output ONLY the markdown for this single document. No preamble, no explanation, no fenced code block wrapping the output, no JSON.
- Tag every claim about customer voice to a transcript line or a mined review with a source marker like (interview), (Google review), (WeddingWire), (The Knot).
- Prefer verbatim quotes over paraphrase whenever possible.
- If a theme only appears in one source, label it Low confidence per the customer-research skill's guardrails.
- Do not invent reviews or quotes. If mined reviews are empty, say so and lean on the transcript only.
- Begin your response with the document's first heading. End your response when the document ends. No trailing notes.`;

  const trimmed = prompt.length > INPUT_BUDGET_CHARS ? prompt.slice(0, INPUT_BUDGET_CHARS) : prompt;
  if (trimmed.length < prompt.length) {
    cmd.warn(
      `${spec.label} prompt trimmed from ${prompt.length} to ${trimmed.length} chars to stay under the 30K-token budget.`,
    );
  }

  let result: { text: string; usage: { input_tokens: number; output_tokens: number } };
  try {
    const callResult = await cachedClaudeCall({
      anthropic,
      slug,
      command: 'process-interview',
      model: MODEL,
      maxTokens: MAX_TOKENS_PER_DOC,
      messages: [{ role: 'user', content: trimmed }],
      log: (msg) => cmd.log(msg),
    });
    result = { text: callResult.text, usage: callResult.usage };
  } catch (err) {
    // Mirror prior debug behavior for empty-text failures.
    if (err instanceof Error && /no text content/i.test(err.message)) {
      mkdirSync(debugDir, { recursive: true });
      writeFileSync(
        join(debugDir, `${spec.key}.raw.json`),
        JSON.stringify({ error: err.message }, null, 2),
        'utf8',
      );
      throw new Error(
        `${spec.label}: model returned no usable text. Raw response saved to ${debugDir}/${spec.key}.raw.json`,
      );
    }
    throw err;
  }

  if (!result.text.trim()) {
    mkdirSync(debugDir, { recursive: true });
    writeFileSync(
      join(debugDir, `${spec.key}.raw.json`),
      JSON.stringify({ usage: result.usage, text: result.text }, null, 2),
      'utf8',
    );
    throw new Error(
      `${spec.label}: model returned no usable text. Raw response saved to ${debugDir}/${spec.key}.raw.json`,
    );
  }

  // Clean any incidental fence wrapping the model added despite the rule.
  const text = result.text
    .replace(/^```(?:markdown|md)?\s*\n/i, '')
    .replace(/\n```\s*$/, '')
    .trim();
  return text;
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

function buildSharedContext(args: PromptArgs): string {
  const { clientName, siteUrl, auditSummary, transcript, minedReviews, skillGuidance } = args;

  return `You are synthesizing a client interview transcript plus mined public reviews into voice-of-customer and brand documents for a website rebuild.

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
${transcript}`;
}
