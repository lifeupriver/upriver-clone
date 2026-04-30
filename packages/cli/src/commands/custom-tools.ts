import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { Args, Flags } from '@oclif/core';

import { clientDir, readClientConfig, type AuditPackage, type VoiceRules } from '@upriver/core';
import type { PageData } from '@upriver/audit-passes';

import { BaseCommand } from '../base-command.js';
import { claudeCliCall, claudeCliAvailable } from '../util/claude-cli.js';

const MODEL = 'sonnet';

interface ToolConcept {
  name: string;
  problem: string;
  capabilities: string[];
  integrations: string[];
  technical_sketch: string;
  effort_hours_min: number;
  effort_hours_max: number;
  price_low: number;
  price_high: number;
  prerequisites: string[];
  sales_angle: string;
  composite_score: number;
}

interface LlmOutput {
  signals: string[];
  concepts: ToolConcept[];
  proposal_markdown: string;
  sales_talking_points_markdown: string;
}

const SYSTEM_PROMPT = `You are an Upriver product strategist. You analyze a small business's website and propose 3 to 5 bespoke backend tools that would replace their current spreadsheet-and-email workflows. Tone: warm-professional, first-person from the operator. Voice rules:
- No em dashes anywhere.
- Plain USD prices ($500, $5,000, $12,000). No "starting at."
- Real tool names always (Cloudinary, HoneyBook, OpenTable, QuickBooks). Never categories.
- Banned words: stunning, magical, special day, transform, elevate, unlock, seamlessly, robust, synergy, game-changer.
- Specificity over genericism. "A custom inquiry pipeline that flags date conflicts" beats "a CRM."
Return one JSON object: { signals, concepts, proposal_markdown, sales_talking_points_markdown }. No prose around the JSON.`;

const VERTICAL_EXAMPLE_TOOLS: Record<string, Array<{ name: string; problem: string }>> = {
  preschool: [
    { name: 'Curriculum builder', problem: 'Teachers spend 4 to 6 hours per week building lesson plans from scratch' },
    { name: 'Parent communication portal', problem: 'Daily reports, photo sharing, and tuition autopay all live in different places' },
    { name: 'Teacher schedule manager', problem: 'Shift coverage, ratios, and substitute assignments are tracked on paper' },
    { name: 'Enrollment pipeline tracker', problem: 'Inquiries from the website live in an inbox until someone has time' },
  ],
  restaurant: [
    { name: 'Recipe development system', problem: 'Cost per plate, allergens, prep time live in three different spreadsheets' },
    { name: 'Seasonal menu builder', problem: 'Menu rotates 4 times a year and every rotation is a 2-day project' },
    { name: 'Prep schedule generator', problem: 'Prep cooks make daily lists from reservation counts plus walk-in averages, by hand' },
  ],
  'professional-services': [
    { name: 'Tax deadline tracker', problem: 'Per-client deadlines for 50 to 200 clients tracked in shared sheets' },
    { name: 'Document collection portal', problem: 'Tax document handoff happens over email today, with no audit trail' },
    { name: 'Engagement letter generator', problem: 'Boilerplate engagement letters require 30 minutes of manual customization per client' },
  ],
  'wedding-venue': [
    { name: 'Inquiry pipeline manager', problem: 'Date conflicts get caught only after a couple has been quoted' },
    { name: 'Preferred vendor relationship tracker', problem: 'Vendor referrals and reciprocity are tracked in one operator\'s head' },
    { name: 'Package builder', problem: 'Custom packages are recreated in Word for each couple' },
  ],
  generic: [
    { name: 'Inquiry pipeline manager', problem: 'New inquiries from the website live in an inbox without a status' },
    { name: 'Operations dashboard', problem: 'Weekly status updates are pieced together from 3-4 systems' },
  ],
};

export default class CustomTools extends BaseCommand {
  static override description =
    'F11 — propose 3-5 bespoke backend tools tailored to the client\'s industry and operational signals. High-margin upsell ($5K-$15K per tool).';

  static override examples = [
    '<%= config.bin %> custom-tools littlefriends',
    '<%= config.bin %> custom-tools audreys --count=5 --depth=deep --budget-tier=high',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    count: Flags.integer({ description: 'Number of tool concepts. Default 5; max 10.', default: 5, min: 1, max: 10 }),
    depth: Flags.string({
      description: 'standard = industry baseline + operator signals. deep = adds an LLM analysis of the full scraped site.',
      options: ['standard', 'deep'],
      default: 'standard',
    }),
    'operations-input': Flags.string({
      description: 'Optional path to a markdown/text file of operator observations from a discovery call.',
    }),
    'budget-tier': Flags.string({
      description: 'low excludes >40h tools. medium excludes >120h. high includes everything.',
      options: ['low', 'medium', 'high'],
      default: 'medium',
    }),
    force: Flags.boolean({ description: 'Re-run even if outputs exist.', default: false }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(CustomTools);
    const { slug } = args;

    const dir = clientDir(slug);
    if (!existsSync(dir)) this.error(`Client directory not found: ${dir}`);

    const outDir = join(dir, 'custom-tools');
    mkdirSync(outDir, { recursive: true });
    const conceptsPath = join(outDir, 'concepts.json');
    const proposalMdPath = join(outDir, 'proposal.md');
    const proposalHtmlPath = join(outDir, 'proposal.html');
    const talkingPointsPath = join(outDir, 'sales-talking-points.md');

    if (
      !flags.force &&
      [conceptsPath, proposalMdPath, talkingPointsPath].every((p) => existsSync(p))
    ) {
      this.log('Custom-tools outputs already present; pass --force to regenerate.');
      return;
    }

    const config = readClientConfig(slug);
    const audit = loadAuditPackage(dir);
    const voice = loadVoiceRules(dir);
    const gaps = loadGaps(dir);
    const operatorObservations = flags['operations-input'] ? readFileSync(flags['operations-input'], 'utf8') : '';
    const sampledPages = loadSampledPages(dir, flags.depth === 'deep' ? 12 : 4);

    const t0 = Date.now();
    this.log(`\nGenerating custom tools concepts for "${slug}" (vertical=${config.vertical ?? 'generic'}, depth=${flags.depth})...`);

    const claudeReady = await claudeCliAvailable();
    let llm: LlmOutput;
    if (!claudeReady) {
      this.warn('claude CLI not on PATH — writing template-driven proposal without LLM polish.');
      llm = this.fallbackOutput(config.name ?? slug, config.vertical, flags.count);
    } else {
      try {
        const userPrompt = buildPrompt({
          clientName: config.name ?? slug,
          vertical: config.vertical,
          audit,
          voice,
          gaps,
          sampledPages,
          operatorObservations,
          count: flags.count,
          budgetTier: flags['budget-tier'] as 'low' | 'medium' | 'high',
        });
        const result = await claudeCliCall({
          slug,
          command: 'custom-tools',
          model: MODEL,
          systemPrompt: SYSTEM_PROMPT,
          userPrompt,
          log: (msg) => this.log(msg),
        });
        llm = parseJsonOutput(result.text);
      } catch (err) {
        this.warn(`LLM call failed: ${err instanceof Error ? err.message : String(err)}. Using fallback.`);
        llm = this.fallbackOutput(config.name ?? slug, config.vertical, flags.count);
      }
    }

    // Filter by budget tier on the cheap side (LLM should already respect it).
    const tierMax: Record<string, number> = { low: 40, medium: 120, high: 1000 };
    const cap = tierMax[flags['budget-tier']] ?? 120;
    const concepts = llm.concepts.filter((c) => c.effort_hours_min <= cap).slice(0, flags.count);

    writeFileSync(
      conceptsPath,
      JSON.stringify(
        { slug, generated_at: new Date().toISOString(), depth: flags.depth, signals: llm.signals, concepts },
        null,
        2,
      ),
      'utf8',
    );
    writeFileSync(proposalMdPath, llm.proposal_markdown, 'utf8');
    writeFileSync(proposalHtmlPath, mdToBasicHtml(config.name ?? slug, llm.proposal_markdown), 'utf8');
    writeFileSync(talkingPointsPath, llm.sales_talking_points_markdown, 'utf8');

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    this.log('');
    this.log(`Wrote ${conceptsPath}`);
    this.log(`Wrote ${proposalMdPath}`);
    this.log(`Wrote ${proposalHtmlPath}`);
    this.log(`Wrote ${talkingPointsPath}`);
    this.log('');
    this.log(`${concepts.length} tool concept${concepts.length === 1 ? '' : 's'} produced in ${elapsed}s.`);
    if (concepts.length > 0) {
      const total = concepts.reduce(
        (acc, c) => ({ low: acc.low + c.price_low, high: acc.high + c.price_high }),
        { low: 0, high: 0 },
      );
      this.log(`Total project value if all built: $${total.low.toLocaleString()}-$${total.high.toLocaleString()}.`);
    }
  }

  private fallbackOutput(clientName: string, vertical: string | undefined, count: number): LlmOutput {
    const examples = VERTICAL_EXAMPLE_TOOLS[vertical ?? 'generic'] ?? VERTICAL_EXAMPLE_TOOLS['generic']!;
    const concepts: ToolConcept[] = examples.slice(0, count).map((e, i) => ({
      name: e.name,
      problem: e.problem,
      capabilities: ['(operator: fill in 5-8 bullets after a discovery call)'],
      integrations: [],
      technical_sketch: 'A small Astro + Supabase app served from the rebuilt site, surfaced through the natural-language admin.',
      effort_hours_min: 60 + i * 20,
      effort_hours_max: 100 + i * 30,
      price_low: 6000 + i * 2000,
      price_high: 12000 + i * 4000,
      prerequisites: [],
      sales_angle: 'This is the conversation to have after the rebuild ships.',
      composite_score: 70 - i * 5,
    }));
    const proposal = `# Custom tooling proposal: ${clientName}\n\n${concepts.map((c) => `## ${c.name}\n\n**The problem.** ${c.problem}\n\n**Effort.** ${c.effort_hours_min}-${c.effort_hours_max} hours. $${c.price_low.toLocaleString()}-$${c.price_high.toLocaleString()}.\n`).join('\n')}\n`;
    const talking = `# Sales talking points (operator-only): ${clientName}\n\nclaude CLI was not available, so this is a template fallback. Re-run with the claude CLI installed for tailored prep.\n`;
    return {
      signals: ['(claude CLI unavailable; signals not extracted)'],
      concepts,
      proposal_markdown: proposal,
      sales_talking_points_markdown: talking,
    };
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

function loadGaps(dir: string): unknown {
  const p = join(dir, 'audit', 'gaps.json');
  if (!existsSync(p)) return null;
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch {
    return null;
  }
}

function loadSampledPages(dir: string, maxPages: number): PageData[] {
  const pagesDir = join(dir, 'pages');
  if (!existsSync(pagesDir)) return [];
  const files = readdirSync(pagesDir).filter((f) => f.endsWith('.json'));
  const pages: PageData[] = [];
  for (const f of files) {
    try {
      pages.push(JSON.parse(readFileSync(join(pagesDir, f), 'utf8')) as PageData);
    } catch {
      // skip
    }
  }
  return pages.sort((a, b) => (b.content?.markdown?.length ?? 0) - (a.content?.markdown?.length ?? 0)).slice(0, maxPages);
}

function buildPrompt(args: {
  clientName: string;
  vertical: string | undefined;
  audit: AuditPackage | null;
  voice: VoiceRules | null;
  gaps: unknown;
  sampledPages: PageData[];
  operatorObservations: string;
  count: number;
  budgetTier: 'low' | 'medium' | 'high';
}): string {
  const { clientName, vertical, audit, voice, gaps, sampledPages, operatorObservations, count, budgetTier } = args;
  const vExamples = VERTICAL_EXAMPLE_TOOLS[vertical ?? 'generic'] ?? VERTICAL_EXAMPLE_TOOLS['generic']!;
  const exampleBlock = vExamples
    .map((e) => `- ${e.name}: ${e.problem}`)
    .join('\n');

  const voiceBlock = voice
    ? `Voice rules: formality ${voice.formality_score.toFixed(2)}, warmth ${voice.warmth_score.toFixed(2)}. Required markers: ${voice.required_voice_markers.slice(0, 5).join(', ') || 'none'}. Banned: ${voice.banned_words.slice(0, 8).join(', ')}.`
    : 'No voice rules available; warm-professional default.';

  const auditBlock = audit?.contentInventory
    ? `Audit inventory: ${audit.contentInventory.teamMembers?.length ?? 0} team members, ${audit.contentInventory.eventSpaces?.length ?? 0} services/spaces, ${audit.contentInventory.testimonials?.length ?? 0} testimonials.`
    : 'No audit-package.json available.';

  const corpus = sampledPages
    .map((p) => `# ${p.metadata.title ?? p.slug}\n${(p.content?.markdown ?? '').slice(0, 2500)}`)
    .join('\n\n')
    .slice(0, 25000);

  const obsBlock = operatorObservations
    ? `\nOperator observations from discovery call:\n"""\n${operatorObservations.slice(0, 4000)}\n"""\n`
    : '';

  const tierEffort: Record<typeof budgetTier, string> = {
    low: '20-50 hours per tool',
    medium: '50-120 hours per tool',
    high: '120-300 hours per tool',
  };

  return `Client: ${clientName}
Industry: ${vertical ?? 'small business'}
Budget tier: ${budgetTier} (${tierEffort[budgetTier]})

${voiceBlock}

${auditBlock}

Vertical examples for inspiration (do not copy verbatim — produce concepts specific to THIS client):
${exampleBlock}

Gap analysis output (when present, use to ensure proposed tools cover beyond standard rebuild scope):
${gaps ? JSON.stringify(gaps).slice(0, 4000) : '(not run)'}
${obsBlock}
Sampled site copy:
"""
${corpus}
"""

Produce ${count} tool concepts. Return JSON exactly:

{
  "signals": ["<5-10 short observations about operational workflows the client likely runs by hand or via spreadsheet, derived from copy>"],
  "concepts": [
    {
      "name": "<short, specific>",
      "problem": "<2-3 sentences naming hours, frequencies, current workarounds>",
      "capabilities": ["<5-8 specific bullets>"],
      "integrations": ["<named tools, not categories>"],
      "technical_sketch": "<one paragraph describing architecture in plain language>",
      "effort_hours_min": <int>,
      "effort_hours_max": <int>,
      "price_low": <int USD>,
      "price_high": <int USD>,
      "prerequisites": ["<what the client needs in place>"],
      "sales_angle": "<one paragraph the operator can open a pitch with>",
      "composite_score": <int 0-100>
    }
  ],
  "proposal_markdown": "<client-facing markdown doc, ~700-1100 words. Reads as strategic recommendations, not a feature checklist. Voice-matched.>",
  "sales_talking_points_markdown": "<operator-only markdown, ~500-800 words. Per concept: discovery questions, likely objections, scoping trade-offs, an analogy that lands.>"
}

Pricing must reflect Upriver's rates: $100-$150/hour. Effort estimates: low=20-50h, medium=50-120h, high=120-300h. Stay within ${tierEffort[budgetTier]} per concept.`;
}

function parseJsonOutput(text: string): LlmOutput {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('no JSON in custom-tools output');
  const parsed = JSON.parse(cleaned.slice(start, end + 1)) as LlmOutput;
  if (!Array.isArray(parsed.concepts)) throw new Error('custom-tools output missing concepts array');
  return parsed;
}

function mdToBasicHtml(clientName: string, md: string): string {
  const escape = (s: string): string =>
    s.replace(/[&<>]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : '&gt;'));
  // Minimal renderer — headings + paragraphs + lists. Good enough for the
  // report bundle; the markdown is the canonical version.
  const lines = md.split('\n');
  const html: string[] = [];
  let inUl = false;
  for (const line of lines) {
    const h = line.match(/^(#{1,4})\s+(.+)$/);
    if (h) {
      if (inUl) { html.push('</ul>'); inUl = false; }
      const lvl = h[1]!.length;
      html.push(`<h${lvl}>${escape(h[2]!)}</h${lvl}>`);
      continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      if (!inUl) { html.push('<ul>'); inUl = true; }
      html.push(`<li>${escape(line.replace(/^\s*[-*]\s+/, ''))}</li>`);
      continue;
    }
    if (inUl) { html.push('</ul>'); inUl = false; }
    if (line.trim() === '') html.push('');
    else html.push(`<p>${escape(line)}</p>`);
  }
  if (inUl) html.push('</ul>');
  return `<!doctype html><html><head><meta charset="utf-8"><title>Custom tooling proposal: ${escape(clientName)}</title></head><body style="font-family:system-ui,sans-serif;max-width:680px;margin:32px auto;padding:0 16px;line-height:1.55;color:#0f172a">${html.join('\n')}</body></html>`;
}
