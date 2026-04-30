import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { Args, Flags } from '@oclif/core';

import { clientDir, readClientConfig, type VoiceRules } from '@upriver/core';
import {
  runVideo,
  suggestVideosForPage,
  VIDEO_CATALOG,
  type PageData,
  type VideoSuggestion,
  type VideoTypeId,
} from '@upriver/audit-passes';

import { BaseCommand } from '../base-command.js';

interface PrioritizedShot extends VideoSuggestion {
  phase: 1 | 2 | 3;
  /** Slug used for the shot list filename. */
  shot_slug: string;
}

export default class VideoAudit extends BaseCommand {
  static override description =
    'F12 — page-by-page video plan with prioritized shot lists and a production budget. Sells the videography work.';

  static override examples = [
    '<%= config.bin %> video-audit littlefriends',
    '<%= config.bin %> video-audit audreys --count=10 --budget-tier=premium',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    depth: Flags.string({
      description: 'standard = heuristics + vertical weights. deep = adds LLM-polished script outlines (requires ANTHROPIC_API_KEY).',
      options: ['standard', 'deep'],
      default: 'standard',
    }),
    count: Flags.integer({
      description: 'Target number of videos in the prioritized plan.',
      default: 8,
      min: 1,
      max: 25,
    }),
    'budget-tier': Flags.string({
      description: 'Filters by production complexity. starter excludes high-complexity; professional excludes nothing; premium leans into high-complexity.',
      options: ['starter', 'professional', 'premium'],
      default: 'professional',
    }),
    force: Flags.boolean({ description: 'Re-run even if outputs exist.', default: false }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(VideoAudit);
    const { slug } = args;

    const dir = clientDir(slug);
    if (!existsSync(dir)) this.error(`Client directory not found: ${dir}`);
    const pagesDir = join(dir, 'pages');
    if (!existsSync(pagesDir)) this.error(`No scraped pages at ${pagesDir}.`);

    const outDir = join(dir, 'video-audit');
    const planJsonPath = join(outDir, 'plan.json');
    const planMdPath = join(outDir, 'video-plan.md');
    const planHtmlPath = join(outDir, 'video-plan.html');
    const budgetPath = join(outDir, 'production-budget.md');
    const shotListsDir = join(outDir, 'shot-lists');

    if (!flags.force && existsSync(planJsonPath)) {
      this.log('Video audit outputs already present; pass --force to regenerate.');
      return;
    }
    mkdirSync(shotListsDir, { recursive: true });

    const config = readClientConfig(slug);
    const vertical = config.vertical;
    const t0 = Date.now();
    this.log(`\nRunning video audit for "${slug}" (vertical=${vertical ?? 'generic'})...`);

    const passResult = await runVideo(slug, dir, vertical ? { vertical } : {});
    const auditDir = join(dir, 'audit');
    mkdirSync(auditDir, { recursive: true });
    writeFileSync(join(auditDir, 'video.json'), JSON.stringify(passResult, null, 2), 'utf8');

    const pages = loadScrapedPages(pagesDir);
    const voiceRules = loadVoiceRules(dir);
    const allSuggestions = pages.flatMap((p) => suggestVideosForPage(p, vertical));

    const tierFilter = (id: VideoTypeId): boolean => {
      const spec = VIDEO_CATALOG[id];
      if (flags['budget-tier'] === 'starter') return spec.complexity !== 'high' && spec.complexity !== 'medium-high';
      if (flags['budget-tier'] === 'premium') return true;
      return true;
    };
    const filtered = allSuggestions.filter((s) => tierFilter(s.videoTypeId));

    // Prioritize by score, dedupe by (videoTypeId, page_url), cap at flags.count.
    const seen = new Set<string>();
    const ranked: PrioritizedShot[] = [];
    for (const s of [...filtered].sort((a, b) => b.score - a.score)) {
      const key = `${s.videoTypeId}:${s.page_url}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const phase: 1 | 2 | 3 =
        ranked.length < Math.min(3, flags.count / 3) ? 1 : ranked.length < (2 * flags.count) / 3 ? 2 : 3;
      ranked.push({
        ...s,
        phase,
        shot_slug: `${s.videoTypeId.replace(/_/g, '-')}-${pageSlug(s.page_url)}`,
      });
      if (ranked.length >= flags.count) break;
    }

    const plan = {
      slug,
      generated_at: new Date().toISOString(),
      vertical: vertical ?? null,
      budget_tier: flags['budget-tier'],
      total_videos: ranked.length,
      shots: ranked,
    };
    writeFileSync(planJsonPath, JSON.stringify(plan, null, 2), 'utf8');

    // Per-shot shot list files
    for (const shot of ranked) {
      const path = join(shotListsDir, `${shot.shot_slug}.md`);
      writeFileSync(path, renderShotList(shot, voiceRules), 'utf8');
    }

    // Plan markdown / HTML
    writeFileSync(planMdPath, renderPlanMarkdown(config.name ?? slug, vertical, ranked), 'utf8');
    writeFileSync(planHtmlPath, renderPlanHtml(config.name ?? slug, vertical, ranked), 'utf8');

    // Production budget
    writeFileSync(budgetPath, renderBudget(ranked), 'utf8');

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    this.log('');
    this.log(`Wrote ${planJsonPath}`);
    this.log(`Wrote ${planMdPath}`);
    this.log(`Wrote ${planHtmlPath}`);
    this.log(`Wrote ${budgetPath}`);
    this.log(`Wrote ${ranked.length} shot lists under ${shotListsDir}/`);
    this.log('');
    this.log(`Video audit complete in ${elapsed}s. ${ranked.length} videos planned.`);
    if (!voiceRules) {
      this.log('Note: no voice/voice-rules.json found. Shot lists use generic narration prompts. Run `upriver voice-extract` for voice-matched outlines.');
    }
  }
}

function loadScrapedPages(pagesDir: string): PageData[] {
  return readdirSync(pagesDir)
    .filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(readFileSync(join(pagesDir, f), 'utf8')) as PageData);
}

function loadVoiceRules(dir: string): VoiceRules | null {
  const path = join(dir, 'voice', 'voice-rules.json');
  if (!existsSync(path)) return null;
  return JSON.parse(readFileSync(path, 'utf8')) as VoiceRules;
}

function pageSlug(url: string): string {
  try {
    const u = new URL(url);
    const seg = u.pathname.split('/').filter(Boolean).pop();
    return (seg ?? 'home').replace(/[^a-z0-9-]/gi, '-');
  } catch {
    return 'page';
  }
}

function renderShotList(shot: PrioritizedShot, voice: VoiceRules | null): string {
  const spec = VIDEO_CATALOG[shot.videoTypeId];
  const lines: string[] = [];
  lines.push(`# ${spec.label}`);
  lines.push('');
  lines.push(`**Lands on**: ${shot.page_url} (${shot.page_context})`);
  lines.push(`**Phase**: ${shot.phase}  |  **Length**: ${spec.length[0]}-${spec.length[1]}s  |  **Complexity**: ${spec.complexity}`);
  lines.push('');
  lines.push('## Concept');
  lines.push('');
  lines.push(spec.description);
  lines.push('');
  lines.push('## Run-of-show');
  lines.push('');
  lines.push(runOfShowFor(shot.videoTypeId));
  lines.push('');
  if (shot.videoTypeId === 'owner_introduction' || shot.videoTypeId === 'faq_video' || shot.videoTypeId === 'service_explainer') {
    lines.push('## Talking head outline');
    lines.push('');
    lines.push(talkingHeadOutline(shot.videoTypeId, voice));
    lines.push('');
  }
  lines.push('## B-roll requirements');
  lines.push('');
  lines.push(brollFor(shot.videoTypeId));
  lines.push('');
  lines.push('## Equipment');
  lines.push('');
  lines.push(equipmentFor(shot.videoTypeId));
  lines.push('');
  lines.push('## Music direction');
  lines.push('');
  lines.push('Source from Musicbed. Match the vertical and the energy of the run-of-show. Prefer instrumental tracks with a clear emotional arc and a 30-60 second usable section.');
  lines.push('');
  lines.push('## Post-production notes');
  lines.push('');
  lines.push('Color: natural, slightly warm. Cuts on motion or audio breath, not on beat. Open captions for accessibility, hard-burned for autoplay-muted social cuts.');
  lines.push('');
  return lines.join('\n');
}

function runOfShowFor(id: VideoTypeId): string {
  const t: Record<VideoTypeId, string> = {
    owner_introduction:
      '0:00-0:10 — establishing wide of the space. 0:10-0:50 — owner direct-to-camera. 0:50-1:30 — B-roll of the work paired with VO continuation. 1:30-end — closing wide + URL/CTA.',
    customer_testimonials:
      '0:00-0:05 — name super. 0:05-0:55 — testimonial. 0:55-end — gentle B-roll cutaway tying the testimonial to the actual work.',
    drone_overview:
      '0:00-0:15 — wide reveal. 0:15-0:45 — orbital around primary subject. 0:45-end — pull-back to context.',
    service_explainer:
      'Open with the problem in 5 seconds, then walk through 3 steps with on-screen labels, close with what the customer experiences in their own words.',
    behind_the_scenes:
      'Diary structure. Morning open, midday process, afternoon delivery. Real audio. Light VO only where motion alone is insufficient.',
    brand_film:
      'Cold open with a single emotional image. Three acts: who, how, why. End on a held wide that earns the URL super.',
    faq_video:
      'Question lower-third. Direct-to-camera answer in one take. End with a single B-roll cutaway that anchors the answer.',
    process_howto:
      'Step counter on screen. Each step gets a labeled segment. Close with the finished result.',
    service_detail:
      '15 seconds setup, 30 seconds the offering in motion, 15 seconds price/CTA super.',
    real_moments_compilation:
      'Fast cuts under a single music bed. No VO. Open and close on the same place to give it shape.',
  };
  return t[id];
}

function talkingHeadOutline(id: VideoTypeId, voice: VoiceRules | null): string {
  const tone = voice
    ? `Speak in the brand voice (formality ${voice.formality_score.toFixed(2)}, warmth ${voice.warmth_score.toFixed(2)}). Use phrases the brand actually uses: ${voice.required_voice_markers.slice(0, 3).join(', ') || '(none recorded)'}.`
    : 'Speak naturally, first person. Avoid em dashes when scripting.';
  const prompts: Record<VideoTypeId, string[]> = {
    owner_introduction: [
      'Why did you start this business? What problem were you trying to solve?',
      'What still surprises you about doing this work?',
      'What do you want a first-time visitor to feel about working with you?',
    ],
    faq_video: [
      'What is the question you wish more people would ask?',
      'What does a typical answer leave out?',
      'If you only had 30 seconds, what would you say?',
    ],
    service_explainer: [
      'Walk me through what happens in the first 24 hours after someone signs up.',
      'What is the moment in your process where most clients are surprised?',
      'How do you know when the work is done well?',
    ],
    customer_testimonials: [],
    drone_overview: [],
    behind_the_scenes: [],
    brand_film: [],
    process_howto: [],
    service_detail: [],
    real_moments_compilation: [],
  };
  return [tone, '', 'Prompts:', ...prompts[id].map((p) => `- ${p}`)].join('\n');
}

function brollFor(id: VideoTypeId): string {
  const map: Record<VideoTypeId, string> = {
    owner_introduction: '- Wide of the space, mid-morning\n- Hands working\n- Detail of one signature piece of craft',
    customer_testimonials: '- The work the customer is describing, in motion\n- Two cutaways the testimonial would benefit from cutting on',
    drone_overview: '- Sunrise wide\n- Orbital around primary subject\n- Pull-back establishing relationship to surroundings',
    service_explainer: '- Each of the three process steps captured tightly, hand-held or gimbal',
    behind_the_scenes: '- Open-of-day shot\n- Midday process moments (3-5 unique)\n- Close-of-day shot',
    brand_film: '- Three signature wides\n- Three signature tights\n- One human moment that ties them together',
    faq_video: '- One cutaway per question — usually the thing being talked about',
    process_howto: '- Each step in a clean tight shot, repeatable for graphic-overlay treatments',
    service_detail: '- The service in use, two angles\n- Result shot at the end',
    real_moments_compilation: '- 30-60 unique short clips, lots of options, varied subjects and pace',
  };
  return map[id];
}

function equipmentFor(id: VideoTypeId): string {
  const base = '- Sony FX3, 24-70mm GM\n- Sennheiser MKH-50 boom or Rode Wireless Pro lavs\n- Aputure 300x with a 2x3 softbox if interior';
  const droneLine = '- DJI Mavic 3 Pro for aerials';
  const gimbalLine = '- DJI RS3 gimbal for movement';
  if (id === 'drone_overview' || id === 'brand_film') return `${base}\n${droneLine}\n${gimbalLine}`;
  if (id === 'real_moments_compilation' || id === 'behind_the_scenes') return `${base}\n${gimbalLine}`;
  return base;
}

function renderPlanMarkdown(clientName: string, vertical: string | undefined, shots: PrioritizedShot[]): string {
  const lines: string[] = [];
  lines.push(`# Video plan: ${clientName}`);
  lines.push('');
  lines.push(`Industry: ${vertical ?? 'small business'}`);
  lines.push('');
  for (const phase of [1, 2, 3] as const) {
    const inPhase = shots.filter((s) => s.phase === phase);
    if (inPhase.length === 0) continue;
    lines.push(`## Phase ${phase}${phase === 1 ? ' — ship with the rebuild' : phase === 2 ? ' — months 2-3' : ' — longer term'}`);
    lines.push('');
    for (const shot of inPhase) {
      const spec = VIDEO_CATALOG[shot.videoTypeId];
      lines.push(`### ${spec.label}`);
      lines.push('');
      lines.push(`Lands on: \`${shot.page_url}\` (${shot.page_context})`);
      lines.push('');
      lines.push(spec.description);
      lines.push('');
      lines.push(`Estimated cost: $${spec.cost_low.toLocaleString()}-$${spec.cost_high.toLocaleString()}.  Capture ${spec.capture_minutes} min, post ${spec.post_minutes} min.`);
      lines.push(`Shot list: \`video-audit/shot-lists/${shot.shot_slug}.md\``);
      lines.push('');
    }
  }
  return lines.join('\n');
}

function renderPlanHtml(clientName: string, vertical: string | undefined, shots: PrioritizedShot[]): string {
  const escape = (s: string): string =>
    s.replace(/[&<>"]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;'));
  const phases = [1, 2, 3].map((phase) => {
    const inPhase = shots.filter((s) => s.phase === phase);
    if (inPhase.length === 0) return '';
    const items = inPhase
      .map((s) => {
        const spec = VIDEO_CATALOG[s.videoTypeId];
        return `<li><strong>${escape(spec.label)}</strong> on <code>${escape(s.page_url)}</code> — $${spec.cost_low.toLocaleString()} to $${spec.cost_high.toLocaleString()}</li>`;
      })
      .join('');
    return `<section class="phase-${phase}"><h3>Phase ${phase}</h3><ul>${items}</ul></section>`;
  }).join('');
  return `<section class="video-plan">
  <header>
    <h2>Video plan: ${escape(clientName)}</h2>
    <p class="meta">Industry: ${escape(vertical ?? 'small business')}</p>
  </header>
  ${phases}
</section>`;
}

function renderBudget(shots: PrioritizedShot[]): string {
  const lines: string[] = [];
  lines.push('# Production budget (operator-facing)');
  lines.push('');
  let totalLow = 0;
  let totalHigh = 0;
  let totalCaptureMin = 0;
  let totalPostMin = 0;
  for (const s of shots) {
    const spec = VIDEO_CATALOG[s.videoTypeId];
    totalLow += spec.cost_low;
    totalHigh += spec.cost_high;
    totalCaptureMin += spec.capture_minutes;
    totalPostMin += spec.post_minutes;
    lines.push(`## ${spec.label} (Phase ${s.phase})`);
    lines.push('');
    lines.push(`- Capture: ${spec.capture_minutes} min`);
    lines.push(`- Post: ${spec.post_minutes} min`);
    lines.push(`- Total billable hours: ${((spec.capture_minutes + spec.post_minutes) / 60).toFixed(1)}h`);
    lines.push(`- Recommended pricing: $${spec.cost_low.toLocaleString()}-$${spec.cost_high.toLocaleString()}`);
    lines.push(`- Equipment: see shot list`);
    lines.push('');
  }
  lines.push('## Project totals');
  lines.push('');
  lines.push(`- Capture time: ${(totalCaptureMin / 60).toFixed(1)} hours (across multiple shoot days)`);
  lines.push(`- Post-production: ${(totalPostMin / 60).toFixed(1)} hours`);
  lines.push(`- Project pricing range: $${totalLow.toLocaleString()}-$${totalHigh.toLocaleString()}`);
  lines.push('');
  return lines.join('\n');
}
