import Anthropic from '@anthropic-ai/sdk';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { Args } from '@oclif/core';
import { BaseCommand } from '../base-command.js';
import { clientDir } from '@upriver/core';
import type {
  AuditFinding,
  AuditPackage,
  ContentInventory,
  MissingPage,
  SitePage,
} from '@upriver/core';
import { cachedClaudeCall } from '../util/cached-llm.js';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 16000;

export default class InterviewPrep extends BaseCommand {
  static override description =
    'Generate customized client interview guide from audit findings';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  async run(): Promise<void> {
    const { args } = await this.parse(InterviewPrep);
    const { slug } = args;
    const apiKey = this.requireEnv('ANTHROPIC_API_KEY');

    const dir = clientDir(slug);
    const pkgPath = join(dir, 'audit-package.json');
    if (!existsSync(pkgPath)) {
      this.error(
        `No audit-package.json at ${pkgPath}. Run "upriver synthesize ${slug}" first.`,
      );
    }
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8')) as AuditPackage;

    this.log(`\nGenerating interview guide for "${pkg.meta.clientName}"...`);

    const prompt = buildInterviewPrompt(pkg);

    const anthropic = new Anthropic({ apiKey });
    const { text, usage, fromCache } = await cachedClaudeCall({
      anthropic,
      slug,
      command: 'interview-prep',
      model: MODEL,
      maxTokens: MAX_TOKENS,
      messages: [{ role: 'user', content: prompt }],
      log: (msg) => this.log(msg),
    });
    const body = stripFences(text).trim();

    const outPath = join(dir, 'interview-guide.md');
    writeFileSync(outPath, body + '\n', 'utf8');
    this.log(`\nWrote ${outPath}`);
    this.log(
      `  ${usage.input_tokens} in / ${usage.output_tokens} out tokens${fromCache ? ' (cached)' : ''}`,
    );
    this.log(`\nNext: walk through the guide with the client, then run:`);
    this.log(`  upriver process-interview ${slug} --transcript <path>`);
  }
}

function stripFences(text: string): string {
  return text
    .replace(/^```(?:markdown|md)?\s*/i, '')
    .replace(/\s*```\s*$/, '');
}

function findingsByDimension(findings: AuditFinding[]): Record<string, AuditFinding[]> {
  const grouped: Record<string, AuditFinding[]> = {};
  for (const f of findings) {
    (grouped[f.dimension] ??= []).push(f);
  }
  return grouped;
}

function summarizeFindings(findings: AuditFinding[], max = 15): string {
  if (findings.length === 0) return '  (none)';
  return findings
    .slice(0, max)
    .map(
      (f) =>
        `  - [${f.priority}] ${f.title} — ${f.description}${f.why_it_matters ? ` (${f.why_it_matters})` : ''}`,
    )
    .join('\n');
}

function summarizeMissingPages(missing: MissingPage[]): string {
  if (missing.length === 0) return '  (none flagged)';
  return missing
    .map((m) => `  - ${m.pageType} [${m.priority}] — ${m.reason}`)
    .join('\n');
}

function summarizeContent(inv: ContentInventory): string {
  const lines: string[] = [];
  lines.push(`  - testimonials: ${inv.testimonials.length}`);
  lines.push(`  - team members: ${inv.teamMembers.length}`);
  lines.push(`  - FAQs on site: ${inv.faqs.length}`);
  lines.push(`  - pricing entries: ${inv.pricing.length}`);
  lines.push(`  - event spaces: ${inv.eventSpaces.length}`);
  lines.push(
    `  - contact: phone=${inv.contactInfo.phone ? 'yes' : 'no'}, email=${inv.contactInfo.email ? 'yes' : 'no'}, hours=${inv.contactInfo.hours ? 'yes' : 'no'}`,
  );
  lines.push(
    `  - social: ${inv.socialLinks.map((s) => s.platform).join(', ') || 'none'}`,
  );
  return lines.join('\n');
}

function detectIntegrations(pages: SitePage[]): string[] {
  const known: Record<string, string> = {
    'tave.com': 'Tave CRM inquiry form',
    'honeybook.com': 'HoneyBook CRM / booking',
    'dubsado.com': 'Dubsado CRM',
    'calendly.com': 'Calendly scheduling',
    'acuityscheduling.com': 'Acuity scheduling',
    'squareup.com': 'Square booking / payments',
    'mailchimp.com': 'Mailchimp newsletter',
    'constantcontact.com': 'Constant Contact newsletter',
    'instagram.com': 'Instagram feed embed',
    'vimeo.com': 'Vimeo video embed',
    'youtube.com': 'YouTube video embed',
    'youtu.be': 'YouTube video embed',
    'hubspot.com': 'HubSpot forms / CRM',
    'typeform.com': 'Typeform',
    'jotform.com': 'JotForm',
    'google.com/maps': 'Google Maps embed',
    'planoly.com': 'Planoly gallery',
    'zola.com': 'Zola registry / wedding site',
    'theknot.com': 'The Knot listing',
    'weddingwire.com': 'WeddingWire listing',
  };
  const hits = new Set<string>();
  for (const p of pages) {
    for (const href of p.externalLinks ?? []) {
      for (const [domain, label] of Object.entries(known)) {
        if (href.includes(domain)) hits.add(label);
      }
    }
  }
  return [...hits];
}

function buildInterviewPrompt(pkg: AuditPackage): string {
  const { meta, siteStructure, contentInventory, brandVoiceDraft, findings } = pkg;
  const grouped = findingsByDimension(findings);

  const aeoFindings = grouped['aeo'] ?? [];
  const salesFindings = grouped['sales'] ?? [];
  const contentFindings = grouped['content'] ?? [];
  const designFindings = grouped['design'] ?? [];
  const schemaFindings = grouped['schema'] ?? [];
  const seoFindings = grouped['seo'] ?? [];

  const integrations = detectIntegrations(siteStructure.pages);
  const pagesList = siteStructure.pages
    .slice(0, 20)
    .map((p) => `  - ${p.slug} (${p.wordCount} words, ${p.images.length} images)`)
    .join('\n');

  const sampleHeadings = siteStructure.pages
    .slice(0, 6)
    .flatMap((p) => p.headings.slice(0, 3).map((h) => h.text))
    .slice(0, 20);

  const tone = brandVoiceDraft?.tone ?? '(not drafted)';
  const voice = brandVoiceDraft?.voiceCharacteristics?.join(', ') ?? '(none)';
  const audience = brandVoiceDraft?.audienceDescription ?? '(not drafted)';
  const bannedWords = brandVoiceDraft?.bannedWords?.slice(0, 10) ?? [];

  return `You are preparing a customized interview guide for a venue/hospitality consultant to run with their client. The goal of the interview is to (a) fill the content gaps the audit found, (b) lock in the client's actual voice, (c) collect answers the Claude Design team needs before the rebuild, and (d) surface aesthetic/strategic opinions the client would want to override from the audit.

This is NOT a generic questionnaire. Every question should be tied to a specific audit finding, missing page, content gap, or integration detected on the current site. Generic wedding-venue questions are a failure — the client should feel the consultant has actually read their site.

# Client context

**Name**: ${meta.clientName}
**URL**: ${meta.siteUrl}
**Overall audit score**: ${meta.overallScore}/100
**Total findings**: ${meta.totalFindings} (P0: ${meta.findingsByPriority.p0}, P1: ${meta.findingsByPriority.p1}, P2: ${meta.findingsByPriority.p2})
**Pages scraped**: ${meta.totalPages}

## Brand voice draft (auto-generated — needs client validation)
- Tone: ${tone}
- Characteristics: ${voice}
- Audience: ${audience}
- Cliches to avoid: ${bannedWords.join(', ') || '(none listed)'}

## Current site inventory
${summarizeContent(contentInventory)}

## Pages on site
${pagesList || '  (none)'}

## Sample headings pulled from site
${sampleHeadings.map((h) => `  - "${h}"`).join('\n') || '  (none)'}

## Detected third-party integrations (from external links)
${integrations.length ? integrations.map((i) => `  - ${i}`).join('\n') : '  (none detected — ask how inquiries flow)'}

# Audit findings by dimension

## AEO / AI search (${aeoFindings.length} findings) — topics the site does NOT cover that AI assistants would want to surface
${summarizeFindings(aeoFindings, 20)}

## Sales / conversion (${salesFindings.length} findings)
${summarizeFindings(salesFindings, 15)}

### Missing pages (from sales pass)
${summarizeMissingPages(siteStructure.missingPages)}

## Content (${contentFindings.length} findings)
${summarizeFindings(contentFindings, 15)}

## Design / UX (${designFindings.length} findings)
${summarizeFindings(designFindings, 12)}

## Schema / structured data (${schemaFindings.length} findings)
${summarizeFindings(schemaFindings, 8)}

## SEO (${seoFindings.length} findings)
${summarizeFindings(seoFindings, 10)}

# Your task

Generate the interview guide as a single markdown document. Use this exact top-level structure:

\`\`\`
# Interview Guide — ${meta.clientName}

> How to use this guide: [2-3 sentences on how the consultant should run the conversation, how long to allocate, what to record]

## 1. Customized FAQ Questions (100 total)

These are questions to ask the client so we can write their FAQ page in their actual voice. They are prioritized by what the audit found missing — AEO gaps first (topics AI assistants would want answered), then sales/conversion gaps (objections unanswered on the site), then general FAQ coverage.

### 1.1 High-priority (tied to AEO / AI search gaps — ask these first)
[25-35 numbered questions, each ending with a one-line "(why: links to finding or topic gap)"]

### 1.2 High-priority (tied to sales conversion gaps and missing pages)
[20-30 numbered questions — pricing transparency, availability, process, objections]

### 1.3 Standard coverage (logistics, vendors, policies, general venue FAQ)
[the remainder, to bring the total to 100]

## 2. Brand Voice Probes

Questions designed to get the client talking in their actual voice, with side-by-side examples so the consultant can hear the difference between wrong-voice and right-voice answers.

[For 6-8 probes, each formatted exactly as:
### Probe N: [short name]
**Ask**: [the question to read aloud]
**Wrong answer (generic / cliche — flag it if you hear this)**:
> [example of a flat, on-brand-for-no-one answer, using some of the banned words above if relevant]
**Right answer (the voice we're listening for)**:
> [example of an answer that sounds like the drafted tone/characteristics — specific, textured, the client's own words]
**Listen for**: [2-3 bullets on what signal to capture]
]

## 3. Asset Gap Checklist

A checklist the consultant fills in during the interview. Generated from the photo/image gaps and missing-page requirements the audit surfaced.

### 3.1 Photography we need
- [ ] [specific shot, tied to a missing page or content gap]
- [ ] ...

### 3.2 Video we need
- [ ] [specific clip / b-roll]
- [ ] ...

### 3.3 Logo / brand files we need from the client
- [ ] ...

### 3.4 Testimonials and reviews we should collect
- [ ] ...

## 4. Technical Integration Questions

Specific to integrations detected on the current site (or missing). Each question should reference the actual tool or gap.

[8-15 numbered questions. If a CRM was detected, ask about the inquiry flow. If none was detected, ask how inquiries currently arrive. Include questions about: where inquiries route, who answers them and how fast, what fields they need captured, what downstream automation exists, calendar/availability system, payment/contract tools, newsletter list, social embeds, video hosting.]

## 5. Aesthetic and Strategic Overrides

The audit has strong opinions. The client may not agree with all of them. For each finding the client is likely to want to override or soften, frame an explicit question so they can push back with reasoning. The rebuild should reflect their business, not the audit template.

[For 6-10 specific audit findings that are subjective calls — design/tone/content/sales — format as:
### Override N: [short name]
**Audit said**: [paraphrase the finding, including dimension and priority]
**Why the audit said it**: [one sentence]
**Ask the client**: [open-ended question inviting them to push back]
**If they override**: [one line on what we do differently in the rebuild]
]

Choose findings that are opinion-driven, not objective bugs. (Don't ask them to override a broken canonical tag.) Lean toward design/UX choices, brand voice recommendations, tone of specific pages, whether to publish pricing, whether to add comparison content, whether a "missing page" actually fits their business.
\`\`\`

Hard rules:
- Exactly 100 FAQ questions in section 1 total, numbered continuously across 1.1/1.2/1.3.
- Every AEO question in 1.1 must tie to a specific finding from the list above (reference the finding title or topic).
- Every sales question in 1.2 must tie to a finding or missing page from the list above.
- Asset gap checklist must reference the actual missing pages and content gaps — not generic "get good photos."
- Integration questions must name the specific tools detected (or their absence).
- Aesthetic override prompts must paraphrase actual findings from the list — don't invent findings.
- Write in the tone of an experienced consultant talking to a venue owner. Warm but specific. No corporate filler.
- Output ONLY the markdown document. No preface, no explanation, no code fences wrapping the whole thing.`;
}
