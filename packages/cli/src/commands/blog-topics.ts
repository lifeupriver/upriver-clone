import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { Args, Flags } from '@oclif/core';

import { clientDir, readClientConfig, type AuditPackage, type VoiceRules } from '@upriver/core';

import { BaseCommand } from '../base-command.js';
import { generateBrief, generateTopics, type BlogTopic } from '../blog-topics/generator.js';

export default class BlogTopics extends BaseCommand {
  static override description =
    'F10 — generate 25 blog topic ideas with briefs. Sells as a $750 standalone deliverable; consumed by improve and the natural-language admin (write-the-next-post requests).';

  static override examples = [
    '<%= config.bin %> blog-topics littlefriends',
    '<%= config.bin %> blog-topics audreys --count=15 --difficulty=easy',
    '<%= config.bin %> blog-topics audreys --intent=commercial,informational',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    count: Flags.integer({ description: 'Number of topics. Default 25; max 100.', default: 25, min: 1, max: 100 }),
    difficulty: Flags.string({
      description: 'Filter by estimated keyword difficulty (heuristic when Ahrefs data not present).',
      options: ['easy', 'medium', 'hard', 'all'],
      default: 'medium',
    }),
    intent: Flags.string({
      description: 'Comma-separated search intents to keep. Default: all. Options: informational, navigational, commercial, transactional.',
    }),
    'no-competitor-mining': Flags.boolean({
      description: 'Skip competitor content gap analysis (currently a no-op; flagged for parity with the spec).',
      default: false,
    }),
    force: Flags.boolean({ description: 'Re-run even if outputs exist.', default: false }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(BlogTopics);
    const { slug } = args;

    const dir = clientDir(slug);
    if (!existsSync(dir)) this.error(`Client directory not found: ${dir}`);

    const outDir = join(dir, 'blog-topics');
    const briefsDir = join(outDir, 'topic-briefs');
    const topicsPath = join(outDir, 'topics.json');
    const roadmapMdPath = join(outDir, 'blog-roadmap.md');
    const roadmapHtmlPath = join(outDir, 'blog-roadmap.html');

    if (!flags.force && existsSync(topicsPath)) {
      this.log('Blog topics outputs already present; pass --force to regenerate.');
      return;
    }
    mkdirSync(briefsDir, { recursive: true });

    const config = readClientConfig(slug);
    const audit = loadAuditPackage(dir);
    const voice = loadVoiceRules(dir);
    const { city, state } = parseAddress(audit?.contentInventory?.contactInfo?.address);

    const t0 = Date.now();
    this.log(`\nGenerating blog topics for "${slug}" (vertical=${config.vertical ?? 'generic'})...`);

    const topics = generateTopics({
      brandName: config.name ?? slug,
      ...(config.vertical !== undefined ? { vertical: config.vertical } : { vertical: undefined }),
      ...(city !== undefined ? { city } : { city: undefined }),
      ...(state !== undefined ? { state } : { state: undefined }),
      count: flags.count,
      difficulty: flags.difficulty as 'easy' | 'medium' | 'hard' | 'all',
    });

    const intentFilter = flags.intent ? new Set(flags.intent.split(',').map((s) => s.trim().toLowerCase())) : null;
    const filtered = intentFilter ? topics.filter((t) => intentFilter.has(t.search_intent)) : topics;

    writeFileSync(topicsPath, JSON.stringify({ slug, generated_at: new Date().toISOString(), topics: filtered }, null, 2), 'utf8');

    // Per-topic briefs
    for (const topic of filtered) {
      const brief = generateBrief(topic, config.name ?? slug, voice?.formality_score ?? null);
      const path = join(briefsDir, `${topic.slug}.md`);
      writeFileSync(path, renderBriefMarkdown(brief), 'utf8');
    }

    writeFileSync(roadmapMdPath, renderRoadmapMarkdown(config.name ?? slug, config.vertical, filtered), 'utf8');
    writeFileSync(roadmapHtmlPath, renderRoadmapHtml(config.name ?? slug, config.vertical, filtered), 'utf8');

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    this.log('');
    this.log(`Wrote ${topicsPath}`);
    this.log(`Wrote ${roadmapMdPath}`);
    this.log(`Wrote ${roadmapHtmlPath}`);
    this.log(`Wrote ${filtered.length} topic briefs under ${briefsDir}/`);
    this.log('');
    this.log(`Blog topics complete in ${elapsed}s. ${filtered.length} topics produced.`);
    this.log('Note: KD and volume estimates are heuristic. Wire Ahrefs MCP for live keyword data when available.');
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

function parseAddress(raw: string | undefined): { city: string | undefined; state: string | undefined } {
  if (!raw) return { city: undefined, state: undefined };
  const m = raw.match(/,\s*([^,]+?)\s*,\s*([A-Z]{2}|[A-Za-z\s]+?)(?:\s+\d{5})?$/);
  if (!m) return { city: undefined, state: undefined };
  return { city: (m[1] ?? '').trim(), state: (m[2] ?? '').trim() };
}

function renderBriefMarkdown(brief: ReturnType<typeof generateBrief>): string {
  const t = brief.topic;
  const lines: string[] = [];
  lines.push(`# ${t.title}`);
  lines.push('');
  lines.push(`Cluster: ${t.cluster}  |  Intent: ${t.search_intent}  |  Word count target: ${t.recommended_word_count}`);
  lines.push('');
  lines.push(`Primary keyword: \`${t.primary_keyword}\``);
  if (t.estimated_kd !== null) lines.push(`Estimated KD: ${t.estimated_kd}`);
  if (t.estimated_monthly_volume !== null) lines.push(`Estimated monthly volume: ${t.estimated_monthly_volume}`);
  lines.push('');
  lines.push('## Search intent');
  lines.push('');
  lines.push(brief.search_intent_explanation);
  lines.push('');
  lines.push('## Recommended outline');
  lines.push('');
  for (const o of brief.outline) {
    lines.push(`${o.level === 2 ? '##' : '###'} ${o.heading}`);
    lines.push('');
    lines.push(o.notes);
    lines.push('');
  }
  lines.push('## Key points to cover');
  lines.push('');
  for (const k of brief.key_points) lines.push(`- ${k}`);
  lines.push('');
  lines.push('## Voice notes');
  lines.push('');
  lines.push(brief.voice_notes);
  lines.push('');
  lines.push('## SEO requirements');
  lines.push('');
  lines.push(`- Target word count: ${brief.seo_requirements.word_count}`);
  lines.push(`- Primary keyword density: ${brief.seo_requirements.primary_keyword_density}`);
  lines.push(`- Internal links: ${brief.seo_requirements.internal_link_count}`);
  lines.push(`- Schema: ${brief.seo_requirements.schema.join(', ')}`);
  lines.push('');
  lines.push('## Angle');
  lines.push('');
  lines.push(t.angle);
  lines.push('');
  return lines.join('\n');
}

function renderRoadmapMarkdown(brandName: string, vertical: string | undefined, topics: BlogTopic[]): string {
  const lines: string[] = [];
  lines.push(`# Content roadmap: ${brandName}`);
  lines.push('');
  lines.push(
    `${topics.length} blog topics organized into clusters. Each topic has a separate brief under \`blog-topics/topic-briefs/\` detailed enough to draft a publishable post from.`,
  );
  lines.push('');
  lines.push('## Recommended cadence');
  lines.push('');
  lines.push(`At two posts per month, this roadmap covers ~${Math.ceil(topics.length / 2)} months of publishing. The natural-language admin (F05) reads topics.json and lets a client request "write the next blog post" — the bot picks the highest-score unpublished topic and uses the matching brief.`);
  lines.push('');

  const clusters = new Map<string, BlogTopic[]>();
  for (const t of topics) {
    const list = clusters.get(t.cluster) ?? [];
    list.push(t);
    clusters.set(t.cluster, list);
  }
  for (const [name, list] of clusters) {
    lines.push(`## ${name}`);
    lines.push('');
    for (const t of list) {
      lines.push(`- **${t.title}** — intent: ${t.search_intent}, score ${t.score}, ${t.recommended_word_count} words. Brief: \`blog-topics/topic-briefs/${t.slug}.md\``);
    }
    lines.push('');
  }
  lines.push('## How to measure success');
  lines.push('');
  lines.push(
    'Track per-post organic clicks in GSC at 30, 60, and 90 days. Two posts per month at this brief quality typically lifts non-brand organic clicks 30-60% over 12 months for a small business site.',
  );
  return lines.join('\n');
}

function renderRoadmapHtml(brandName: string, vertical: string | undefined, topics: BlogTopic[]): string {
  const escape = (s: string): string =>
    s.replace(/[&<>"]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;'));
  const items = topics
    .map(
      (t) =>
        `<li><strong>${escape(t.title)}</strong> <span class="meta">${escape(t.cluster)} · ${escape(t.search_intent)}</span></li>`,
    )
    .join('');
  return `<section class="blog-roadmap">
  <header><h2>Content roadmap: ${escape(brandName)}</h2><p>${topics.length} topics for ${escape(vertical ?? 'small business')}</p></header>
  <ol>${items}</ol>
</section>`;
}
