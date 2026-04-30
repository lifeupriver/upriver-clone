import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { Args, Flags } from '@oclif/core';

import { clientDir, readClientConfig, type AuditPackage, type VoiceRules } from '@upriver/core';

import { BaseCommand } from '../base-command.js';
import { buildSnapshotFromAuditDir, computeDelta } from '../monitor/snapshot.js';
import { claudeCliCall, claudeCliAvailable } from '../util/claude-cli.js';

const MODEL = 'sonnet';

const SYSTEM_PROMPT = `You are an Upriver operator writing two short documents for a former client whose website you rebuilt 6+ months ago. Tone is warm and professional, first person from the operator. Voice rules:
- No em dashes anywhere. Use commas, periods, or parentheses.
- Plain USD prices ($500, $2,000/mo). Never "starting at."
- Real tool names always (Cloudinary, HoneyBook, OpenTable). Never categories.
- Banned words: stunning, magical, special day, transform, elevate, unlock, seamlessly, robust, synergy, game-changer.
- Sentence case in body. UPPERCASE only for headings.
- Every claim is backed by a number or a specific observation. No superlatives.
Return one JSON object with keys "case_study" and "reengagement", each a markdown string. No prose around the JSON.`;

interface LlmDocs {
  case_study: string;
  reengagement: string;
}

export default class Followup extends BaseCommand {
  static override description =
    'F07 — 6-month re-audit producing case study + re-engagement docs for a former client. Combine with monitor for retainer maintenance; followup is for clients whose engagement has ended.';

  static override examples = [
    '<%= config.bin %> followup littlefriends',
    '<%= config.bin %> followup audreys --mode=reengagement --target-recipient="Audrey,audrey@example.com"',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    mode: Flags.string({
      description: 'Which output to produce.',
      options: ['case-study', 'reengagement', 'both'],
      default: 'both',
    }),
    'no-send': Flags.boolean({ description: 'Produce documents without sending.', default: false }),
    'target-recipient': Flags.string({
      description: 'Recipient name and email for the re-engagement doc, in "Name,email" format.',
    }),
    force: Flags.boolean({ description: 'Re-run even if outputs exist.', default: false }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Followup);
    const { slug } = args;

    const dir = clientDir(slug);
    if (!existsSync(dir)) this.error(`Client directory not found: ${dir}`);

    const config = readClientConfig(slug);
    const today = new Date().toISOString().slice(0, 10);
    const outDir = join(dir, 'followups');
    mkdirSync(outDir, { recursive: true });
    const snapshotPath = join(outDir, `${today}.json`);
    const caseStudyPath = join(outDir, `${today}-case-study.md`);
    const reengagementPath = join(outDir, `${today}-reengagement.md`);

    if (
      !flags.force &&
      existsSync(snapshotPath) &&
      (flags.mode === 'reengagement' || existsSync(caseStudyPath)) &&
      (flags.mode === 'case-study' || existsSync(reengagementPath))
    ) {
      this.log('Followup outputs already present; pass --force to regenerate.');
      return;
    }

    const t0 = Date.now();
    this.log(`\nGenerating followup for "${slug}" (mode=${flags.mode})...`);

    const auditDir = join(dir, 'audit');
    if (!existsSync(auditDir)) this.error('No audit/ directory; run audit first.');
    const qaAuditDir = join(dir, 'qa', 'audit');
    const current = buildSnapshotFromAuditDir(slug, auditDir, 'original');
    const baselineDir = existsSync(qaAuditDir) ? qaAuditDir : auditDir;
    const baseline = buildSnapshotFromAuditDir(slug, baselineDir, 'qa');
    const delta = computeDelta(current, baseline);
    writeFileSync(snapshotPath, JSON.stringify(delta, null, 2), 'utf8');

    const audit = loadAuditPackage(dir);
    const voice = loadVoiceRules(dir);
    const recipientName = parseRecipient(flags['target-recipient'])?.name ?? config.name ?? 'the client';

    const docs = await this.generateDocs({
      slug,
      clientName: config.name ?? slug,
      vertical: config.vertical,
      delta,
      audit,
      voice,
      recipientName,
      mode: flags.mode as 'case-study' | 'reengagement' | 'both',
    });

    if (flags.mode !== 'reengagement') writeFileSync(caseStudyPath, docs.case_study, 'utf8');
    if (flags.mode !== 'case-study') writeFileSync(reengagementPath, docs.reengagement, 'utf8');

    // Optionally copy case study to operator's content workflow path.
    const caseStudiesPath = process.env['UPRIVER_CASE_STUDIES_PATH'];
    if (caseStudiesPath && flags.mode !== 'reengagement') {
      try {
        mkdirSync(caseStudiesPath, { recursive: true });
        writeFileSync(join(caseStudiesPath, `${slug}-${today}-case-study.md`), docs.case_study, 'utf8');
        this.log(`  Copied case study to ${caseStudiesPath}.`);
      } catch (err) {
        this.warn(`Could not copy to UPRIVER_CASE_STUDIES_PATH: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    this.log('');
    this.log(`Wrote ${snapshotPath}`);
    if (flags.mode !== 'reengagement') this.log(`Wrote ${caseStudyPath}`);
    if (flags.mode !== 'case-study') this.log(`Wrote ${reengagementPath}`);
    this.log('');
    this.log(`Followup complete in ${elapsed}s.`);
    if (!flags['no-send']) {
      this.log('Send not yet wired (Resend integration is a worker-side concern). Forward the markdown manually for now.');
    }
  }

  private async generateDocs(args: {
    slug: string;
    clientName: string;
    vertical: string | undefined;
    delta: ReturnType<typeof computeDelta>;
    audit: AuditPackage | null;
    voice: VoiceRules | null;
    recipientName: string;
    mode: 'case-study' | 'reengagement' | 'both';
  }): Promise<LlmDocs> {
    const claudeReady = await claudeCliAvailable();
    if (!claudeReady) {
      console.warn('claude CLI not on PATH — writing template-driven docs without LLM polish.');
      return this.fallbackDocs(args);
    }

    const userPrompt = buildPrompt(args);
    try {
      const result = await claudeCliCall({
        slug: args.slug,
        command: 'followup',
        model: MODEL,
        systemPrompt: SYSTEM_PROMPT,
        userPrompt,
      });
      const cleaned = result.text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
      const start = cleaned.indexOf('{');
      const end = cleaned.lastIndexOf('}');
      if (start === -1 || end === -1) throw new Error('no JSON in followup LLM output');
      const parsed = JSON.parse(cleaned.slice(start, end + 1)) as LlmDocs;
      if (typeof parsed.case_study !== 'string' || typeof parsed.reengagement !== 'string') {
        throw new Error('followup LLM output missing required keys');
      }
      return parsed;
    } catch (err) {
      console.warn(`Followup LLM call failed: ${err instanceof Error ? err.message : String(err)}. Falling back to template.`);
      return this.fallbackDocs(args);
    }
  }

  private fallbackDocs(args: {
    clientName: string;
    delta: ReturnType<typeof computeDelta>;
    recipientName: string;
  }): LlmDocs {
    const { clientName, delta, recipientName } = args;
    const overall = delta.current.overall_score;
    const previousOverall = delta.previous?.overall_score ?? overall;
    const trendLine = delta.previous
      ? `Overall site score sits at ${overall}/100 today, compared to ${previousOverall}/100 at launch.`
      : `Overall site score is ${overall}/100 across ${Object.keys(delta.current.pass_scores).length} dimensions.`;
    const caseStudy = `# Case study: ${clientName}\n\n## What we built\n\n(Operator: paste design-brief summary here)\n\n## Six months later\n\n${trendLine} ${delta.current.p0_count} priority-0 issues currently flagged.\n\n## What worked\n\n(Operator: pull 2-3 specific wins from the snapshot)\n\n## What is drifting\n\n(Operator: pull from the deltas where scores dropped)\n`;
    const reengagement = `Hi ${recipientName},\n\nIt has been 6 months since ${clientName} launched. I ran a fresh audit this week so we could compare where things stand to where we left them.\n\n${trendLine}\n\nA few things are working well, and a few have drifted in a way that is worth a 30-minute conversation. Reply to this email and I will send a calendar link.\n`;
    return { case_study: caseStudy, reengagement };
  }
}

function loadAuditPackage(dir: string): AuditPackage | null {
  const p = join(dir, 'audit-package.json');
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8')) as AuditPackage;
}

function loadVoiceRules(dir: string): VoiceRules | null {
  const p = join(dir, 'voice', 'voice-rules.json');
  if (!existsSync(p)) return null;
  return JSON.parse(readFileSync(p, 'utf8')) as VoiceRules;
}

function parseRecipient(arg: string | undefined): { name: string; email: string } | null {
  if (!arg) return null;
  const [name, email] = arg.split(',').map((s) => s.trim());
  if (!name || !email) return null;
  return { name, email };
}

function buildPrompt(args: {
  clientName: string;
  vertical: string | undefined;
  delta: ReturnType<typeof computeDelta>;
  audit: AuditPackage | null;
  voice: VoiceRules | null;
  recipientName: string;
}): string {
  const { clientName, vertical, delta, audit, voice, recipientName } = args;
  const voiceBlock = voice
    ? `Voice rules from F03: formality ${voice.formality_score.toFixed(2)}, warmth ${voice.warmth_score.toFixed(2)}. Required markers: ${voice.required_voice_markers.slice(0, 5).join(', ') || 'none'}. Banned (must avoid): ${voice.banned_words.slice(0, 8).join(', ')}.`
    : 'No voice rules available; use a warm-professional default register.';

  const passBlock = Object.entries(delta.current.pass_scores)
    .map(([dim, score]) => {
      const prev = delta.previous?.pass_scores?.[dim];
      const d = delta.pass_score_deltas[dim];
      return `- ${dim}: ${score}/100${typeof d === 'number' && prev !== undefined ? ` (was ${prev}, ${d >= 0 ? '+' : ''}${d})` : ''}`;
    })
    .join('\n');

  const auditSummary = audit?.meta
    ? `Original audit summary: ${audit.meta.totalFindings} findings at launch (${JSON.stringify(audit.meta.findingsByPriority)}). Overall score then: ${audit.meta.overallScore}/100.`
    : 'No audit-package.json available.';

  return `Client: ${clientName}
Industry: ${vertical ?? 'small business'}
Recipient name for the re-engagement doc: ${recipientName}

${voiceBlock}

${auditSummary}

Current state vs. baseline:
- Overall: ${delta.current.overall_score}/100${delta.previous ? ` (was ${delta.previous.overall_score}, ${delta.overall_delta >= 0 ? '+' : ''}${delta.overall_delta})` : ' (no baseline)'}
- Priority-0 findings: ${delta.current.p0_count}${delta.previous ? ` (was ${delta.previous.p0_count})` : ''}
- Per-dimension scores:
${passBlock}

Produce two markdown documents.

Document 1 — case_study (operator-facing draft, ~600 words). Sections:
- Problem statement (2-3 sentences sourced from the original audit's priorities)
- Approach (2-3 sentences on what Upriver shipped — invent reasonable specifics from the dimensions that improved most)
- Metrics with deltas (bullet list, every claim a number)
- Placeholder line: "Client quote goes here."

Document 2 — reengagement (polished doc to send to ${recipientName}, ~450 words, written in the brand voice when voice rules are present, otherwise a warm-professional register). Sections:
- Brief opening acknowledgment + thanks (2 short paragraphs)
- What is still working (3-5 specific data points)
- What has drifted (1 paragraph per issue, drawn from passes whose scores dropped or whose P0 count grew)
- Recommended next steps (3-5 named scoped opportunities, each with a rough hour or dollar range)
- Closing CTA: a clear next step ("Reply and I will send a calendar link")

Return as a single JSON object: { "case_study": "<markdown>", "reengagement": "<markdown>" }.`;
}
