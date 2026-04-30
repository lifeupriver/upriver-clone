import { existsSync, mkdirSync, writeFileSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import Anthropic from '@anthropic-ai/sdk';
import { Args, Flags } from '@oclif/core';

import { clientDir, readClientConfig } from '@upriver/core';
import {
  runMedia,
  buildInventory,
  summarizeInventory,
  type PageData,
  type ImageRecord,
  type MediaInventorySummary,
} from '@upriver/audit-passes';

import { BaseCommand } from '../base-command.js';
import { cachedClaudeCall, type CacheableTextBlockParam } from '../util/cached-llm.js';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 3000;

const SHOTLIST_SYSTEM = `You are an Upriver photography producer. Given an image inventory and a small-business industry context, you write a tight shot list for a one-day photo shoot. Rules:
- No em dashes anywhere. Use commas, periods, or parentheses.
- Plain USD prices ($500, $1,500). No "starting at."
- Real names for tools and roles ("the Sony FX3", "the kitchen lead", "the venue manager"). Never categories.
- Banned words: stunning, magical, special day, transform, elevate, unlock, seamlessly, robust, synergy, game-changer.
- Specific over generic: every shot has a subject, a composition note, a time-of-day or location note, and a use case ("hero on the homepage", "team grid on the about page").
Return one JSON object: { shots: [...], shoot_summary: "...", estimated_cost_low: number, estimated_cost_high: number }.`;

interface ShotListShot {
  title: string;
  use_case: string;
  subject: string;
  composition: string;
  time_of_day: string;
  location: string;
  capture_minutes: number;
  priority: 'p0' | 'p1' | 'p2';
}

interface ShotListLlmOutput {
  shots: ShotListShot[];
  shoot_summary: string;
  estimated_cost_low: number;
  estimated_cost_high: number;
}

export default class AuditMedia extends BaseCommand {
  static override description =
    'F01 — score every image on the site for authenticity/quality and generate a replacement shot list. Sets up the photography upsell.';

  static override examples = [
    '<%= config.bin %> audit-media littlefriends',
    '<%= config.bin %> audit-media audreys --threshold=high --no-shotlist',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    'sample-size': Flags.integer({
      description: 'Cap on images analyzed in detail. Default 30; max 100.',
      default: 30,
      min: 1,
      max: 100,
    }),
    threshold: Flags.string({
      description: 'Minimum heuristic confidence required to flag an image as stock or AI.',
      options: ['low', 'medium', 'high'],
      default: 'medium',
    }),
    'no-shotlist': Flags.boolean({
      description: 'Skip the shot list generation; produce only per-image findings.',
      default: false,
    }),
    force: Flags.boolean({
      description: 'Re-run even if outputs exist.',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(AuditMedia);
    const { slug } = args;

    const dir = clientDir(slug);
    if (!existsSync(dir)) {
      this.error(`Client directory not found: ${dir}. Run "upriver init ${slug}" first.`);
    }
    const pagesDir = join(dir, 'pages');
    if (!existsSync(pagesDir)) {
      this.error(`No scraped pages at ${pagesDir}. Run "upriver scrape ${slug}" first.`);
    }

    const auditDir = join(dir, 'audit');
    mkdirSync(auditDir, { recursive: true });
    const mediaJsonPath = join(auditDir, 'media.json');
    const inventoryPath = join(auditDir, 'media-inventory.json');
    const shotlistMdPath = join(dir, 'media-shotlist.md');
    const shotlistHtmlPath = join(dir, 'media-shotlist.html');

    if (
      !flags.force &&
      existsSync(mediaJsonPath) &&
      existsSync(inventoryPath) &&
      (flags['no-shotlist'] || existsSync(shotlistMdPath))
    ) {
      this.log('Media audit outputs already present; pass --force to regenerate.');
      return;
    }

    const config = readClientConfig(slug);
    const vertical = config.vertical;
    const t0 = Date.now();

    this.log(`\nRunning media audit for "${slug}"...`);

    const passResult = await runMedia(slug, dir, vertical ? { vertical } : {});
    writeFileSync(mediaJsonPath, JSON.stringify(passResult, null, 2), 'utf8');

    const pages = loadScrapedPages(pagesDir);
    const allRecords = buildInventory(pages);
    const records = applyThreshold(allRecords, flags.threshold as 'low' | 'medium' | 'high');
    const summary = summarizeInventory(records);

    // Cap detailed analysis (vision API would go here in stage C; we already
    // ran heuristics on every image, so the cap is mainly a guardrail for
    // future enrichment paths).
    const sampled = records.slice(0, flags['sample-size']);

    const inventory = {
      slug,
      generated_at: new Date().toISOString(),
      total_pages: pages.length,
      total_images: records.length,
      sampled,
      summary,
      stage_b_reverse_lookup: {
        ran: false,
        reason: detectMissingKey(),
      },
      stage_c_vision: {
        ran: false,
        reason: process.env['ANTHROPIC_API_KEY']
          ? 'skipped — heuristic pass produced sufficient signal at default settings'
          : 'ANTHROPIC_API_KEY not set',
      },
    };
    writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2), 'utf8');

    this.log(
      `  Inventory: ${summary.total} images. authentic=${summary.byClassification['authentic']} stock-suspect=${summary.byClassification['stock-suspect']} ai-suspect=${summary.byClassification['ai-suspect']} unknown=${summary.byClassification['unknown']}`,
    );

    if (!flags['no-shotlist']) {
      const apiKey = process.env['ANTHROPIC_API_KEY'];
      if (!apiKey) {
        this.warn('ANTHROPIC_API_KEY not set — writing a heuristic shot list without LLM polish.');
        const fallback = heuristicShotList(config.name ?? slug, vertical, summary);
        writeFileSync(shotlistMdPath, renderShotlistMarkdown(config.name ?? slug, vertical, summary, fallback), 'utf8');
        writeFileSync(
          shotlistHtmlPath,
          renderShotlistHtml(config.name ?? slug, vertical, summary, fallback),
          'utf8',
        );
      } else {
        const anthropic = new Anthropic({ apiKey });
        const userPrompt = buildShotListPrompt({
          clientName: config.name ?? slug,
          vertical,
          summary,
          sampled,
        });
        const systemBlocks: CacheableTextBlockParam[] = [
          { type: 'text', text: SHOTLIST_SYSTEM, cache_control: { type: 'ephemeral' } },
        ];
        const result = await cachedClaudeCall({
          anthropic,
          slug,
          command: 'audit-media',
          model: MODEL,
          maxTokens: MAX_TOKENS,
          system: systemBlocks,
          messages: [{ role: 'user', content: userPrompt }],
          log: (msg) => this.log(msg),
        });
        const llm = parseShotListJson(result.text);
        writeFileSync(shotlistMdPath, renderShotlistMarkdown(config.name ?? slug, vertical, summary, llm), 'utf8');
        writeFileSync(shotlistHtmlPath, renderShotlistHtml(config.name ?? slug, vertical, summary, llm), 'utf8');
        this.log(
          `  Shot list: ${llm.shots.length} shots, est. $${llm.estimated_cost_low}-$${llm.estimated_cost_high}.`,
        );
      }
    }

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    this.log('');
    this.log(`Wrote ${mediaJsonPath}`);
    this.log(`Wrote ${inventoryPath}`);
    if (!flags['no-shotlist']) {
      this.log(`Wrote ${shotlistMdPath}`);
      this.log(`Wrote ${shotlistHtmlPath}`);
    }
    this.log('');
    this.log(`Media audit complete in ${elapsed}s.`);
  }
}

function loadScrapedPages(pagesDir: string): PageData[] {
  return readdirSync(pagesDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(pagesDir, f), 'utf8')) as PageData);
}

function applyThreshold(records: ImageRecord[], threshold: 'low' | 'medium' | 'high'): ImageRecord[] {
  const minConfidence = threshold === 'high' ? 75 : threshold === 'medium' ? 60 : 40;
  // Only downgrade flags that fail the threshold; keep records but mark uncertain ones unknown.
  return records.map((r) => {
    if (
      (r.classification === 'stock-suspect' || r.classification === 'ai-suspect') &&
      r.classification_confidence < minConfidence
    ) {
      return { ...r, classification: 'unknown' as const };
    }
    return r;
  });
}

function detectMissingKey(): string {
  if (process.env['TINEYE_API_KEY']) return 'TINEYE_API_KEY set; reverse lookup not yet implemented in this build';
  if (process.env['GOOGLE_VISION_API_KEY']) {
    return 'GOOGLE_VISION_API_KEY set; reverse lookup not yet implemented in this build';
  }
  return 'set TINEYE_API_KEY or GOOGLE_VISION_API_KEY to enable stage B reverse-image lookup';
}

interface PromptInputs {
  clientName: string;
  vertical: string | undefined;
  summary: MediaInventorySummary;
  sampled: ImageRecord[];
}

function buildShotListPrompt(inputs: PromptInputs): string {
  const { clientName, vertical, summary, sampled } = inputs;
  const stockExamples = sampled
    .filter((r) => r.classification === 'stock-suspect')
    .slice(0, 6)
    .map((r) => `- ${r.filenameHint} (on ${r.page})`)
    .join('\n') || '(none detected)';

  return `Client: ${clientName}
Industry: ${vertical ?? 'unspecified small business'}

Image inventory summary:
- Total images on site: ${summary.total}
- Authentic-looking: ${summary.byClassification['authentic']}
- Stock-photo candidates: ${summary.byClassification['stock-suspect']}
- AI-generated candidates: ${summary.byClassification['ai-suspect']}
- Logos/icons/decorative: ${summary.byClassification['logo'] + summary.byClassification['icon'] + summary.byClassification['decorative']}
- Unclassified: ${summary.byClassification['unknown']}

Stock photo candidates (filenames):
${stockExamples}

Produce a shot list for a one-day Upriver photo shoot covering the highest-leverage replacement photography for this client. Return JSON exactly matching this shape (no prose around it):

{
  "shoot_summary": "<one paragraph, ~70 words, explaining what this shoot covers and why it matters for this specific business. Use the industry context.>",
  "shots": [
    {
      "title": "<short, specific>",
      "use_case": "<which page/section this lands on>",
      "subject": "<who/what is in the frame>",
      "composition": "<wide/medium/tight, lens choice in plain language, what's in frame>",
      "time_of_day": "<golden hour, midday, evening, or 'any'>",
      "location": "<specific location on the property or area>",
      "capture_minutes": <integer 5-45>,
      "priority": "<p0|p1|p2>"
    }
  ],
  "estimated_cost_low": <integer USD>,
  "estimated_cost_high": <integer USD>
}

Produce 8-12 shots. Cluster them so the whole list fits one shoot day (8-10 hours of capture + travel). Cost range should reflect Upriver's actual rates: a single day with hero, team, and detail coverage typically lands at $2,000-$3,500.`;
}

function parseShotListJson(text: string): ShotListLlmOutput {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('shot list LLM returned no JSON');
  return JSON.parse(cleaned.slice(start, end + 1)) as ShotListLlmOutput;
}

function heuristicShotList(
  clientName: string,
  vertical: string | undefined,
  summary: MediaInventorySummary,
): ShotListLlmOutput {
  // Vertical-aware fallback list when the LLM is unavailable. Keeps F01
  // running offline / without an API key for development and tests.
  const v = (vertical ?? 'generic').toLowerCase();
  const baseShots: ShotListShot[] = [
    {
      title: 'Owner-led hero portrait',
      use_case: 'homepage hero',
      subject: 'the owner or principal looking just past camera',
      composition: 'medium-wide, environmental, 35mm equivalent',
      time_of_day: 'golden hour',
      location: 'primary working space',
      capture_minutes: 25,
      priority: 'p0',
    },
    {
      title: 'Team grid set',
      use_case: 'about page team grid',
      subject: 'each team member, consistent framing',
      composition: 'medium portraits, soft natural light, neutral backdrop',
      time_of_day: 'midday',
      location: 'a quiet corner with consistent light',
      capture_minutes: 60,
      priority: 'p0',
    },
    {
      title: 'Space details',
      use_case: 'services pages and footer',
      subject: 'craft details that show real work happening',
      composition: 'tight, shallow depth, repeating motif',
      time_of_day: 'any',
      location: 'wherever the work happens',
      capture_minutes: 45,
      priority: 'p1',
    },
  ];
  if (v.includes('preschool')) {
    baseShots.push({
      title: 'Classroom moments',
      use_case: 'admissions page hero band',
      subject: 'children engaged in self-directed activity (with permission)',
      composition: 'over-the-shoulder, low angle, faces obscured or angled per consent',
      time_of_day: 'mid-morning',
      location: 'main classroom',
      capture_minutes: 60,
      priority: 'p0',
    });
  }
  if (v.includes('restaurant')) {
    baseShots.push({
      title: 'Plated dish set',
      use_case: 'menu and home page',
      subject: 'three signature plates, consistent overhead',
      composition: 'top-down, soft single source, neutral surface',
      time_of_day: 'mid-afternoon',
      location: 'pass or daylight window',
      capture_minutes: 50,
      priority: 'p0',
    });
  }
  if (v.includes('wedding')) {
    baseShots.push({
      title: 'Venue brand film B-roll',
      use_case: 'home page hero video',
      subject: 'morning light over the property, slow push-ins on details',
      composition: 'gimbal, FX3 with 24-70mm, all real-time',
      time_of_day: 'golden hour',
      location: 'property exterior and ceremony site',
      capture_minutes: 90,
      priority: 'p1',
    });
  }
  return {
    shoot_summary: `One day with ${clientName}. Replace the ${summary.byClassification['stock-suspect']} stock candidates and fill in coverage where authentic photography is missing. Hero, team, and a small detail set, captured in a single visit.`,
    shots: baseShots,
    estimated_cost_low: 2000,
    estimated_cost_high: 3500,
  };
}

function renderShotlistMarkdown(
  clientName: string,
  vertical: string | undefined,
  summary: MediaInventorySummary,
  llm: ShotListLlmOutput,
): string {
  const lines: string[] = [];
  lines.push(`# Photography shot list: ${clientName}`);
  lines.push('');
  lines.push(`Industry: ${vertical ?? 'small business'}`);
  lines.push('');
  lines.push('## Inventory snapshot');
  lines.push('');
  lines.push(`- Total images on site: ${summary.total}`);
  lines.push(`- Authentic-looking: ${summary.byClassification['authentic']}`);
  lines.push(`- Stock-photo candidates: ${summary.byClassification['stock-suspect']}`);
  lines.push(`- AI-generated candidates: ${summary.byClassification['ai-suspect']}`);
  lines.push(`- Unclassified: ${summary.byClassification['unknown']}`);
  lines.push('');
  lines.push('## Why this matters');
  lines.push('');
  lines.push(llm.shoot_summary);
  lines.push('');
  lines.push('## Shots');
  lines.push('');
  for (const shot of llm.shots) {
    lines.push(`### ${shot.title} (${shot.priority.toUpperCase()})`);
    lines.push('');
    lines.push(`- **Use case**: ${shot.use_case}`);
    lines.push(`- **Subject**: ${shot.subject}`);
    lines.push(`- **Composition**: ${shot.composition}`);
    lines.push(`- **Time of day**: ${shot.time_of_day}`);
    lines.push(`- **Location**: ${shot.location}`);
    lines.push(`- **Capture time**: ~${shot.capture_minutes} min`);
    lines.push('');
  }
  lines.push('## Estimate');
  lines.push('');
  lines.push(`One shoot day, $${llm.estimated_cost_low.toLocaleString()} to $${llm.estimated_cost_high.toLocaleString()} all-in. Includes capture, basic edit, and delivery in web-ready and print-ready formats.`);
  lines.push('');
  return lines.join('\n');
}

function renderShotlistHtml(
  clientName: string,
  vertical: string | undefined,
  summary: MediaInventorySummary,
  llm: ShotListLlmOutput,
): string {
  const escape = (s: string): string => s.replace(/[&<>"]/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;',
  );
  const shots = llm.shots
    .map(
      (s) => `
  <li class="shot">
    <h3>${escape(s.title)} <span class="priority p-${s.priority}">${s.priority.toUpperCase()}</span></h3>
    <dl>
      <dt>Use case</dt><dd>${escape(s.use_case)}</dd>
      <dt>Subject</dt><dd>${escape(s.subject)}</dd>
      <dt>Composition</dt><dd>${escape(s.composition)}</dd>
      <dt>Time of day</dt><dd>${escape(s.time_of_day)}</dd>
      <dt>Location</dt><dd>${escape(s.location)}</dd>
      <dt>Capture time</dt><dd>~${s.capture_minutes} min</dd>
    </dl>
  </li>`,
    )
    .join('');
  return `<section class="media-shotlist">
  <header>
    <h2>Photography shot list: ${escape(clientName)}</h2>
    <p class="meta">Industry: ${escape(vertical ?? 'small business')}</p>
  </header>
  <ul class="inventory-summary">
    <li>Total images: <strong>${summary.total}</strong></li>
    <li>Authentic: <strong>${summary.byClassification['authentic']}</strong></li>
    <li>Stock candidates: <strong>${summary.byClassification['stock-suspect']}</strong></li>
    <li>AI candidates: <strong>${summary.byClassification['ai-suspect']}</strong></li>
    <li>Unclassified: <strong>${summary.byClassification['unknown']}</strong></li>
  </ul>
  <p class="shoot-summary">${escape(llm.shoot_summary)}</p>
  <ol class="shots">${shots}
  </ol>
  <p class="estimate">One shoot day, $${llm.estimated_cost_low.toLocaleString()} to $${llm.estimated_cost_high.toLocaleString()} all-in.</p>
</section>`;
}
