import Anthropic from '@anthropic-ai/sdk';
import { existsSync, readFileSync } from 'node:fs';
import type { AuditPassResult, AuditFinding, AuditDimension } from '@upriver/core';
import type { PageData } from '@upriver/audit-passes';
import { loadPages, loadDesignTokens, loadRawHtml } from '@upriver/audit-passes';
import { loadSkill } from '../skill-loader.js';
import { pickSamplePages } from '../sample.js';
import { parseFindingsJson, findingsRequestPrompt } from '../parse-findings.js';

const MODEL = 'claude-opus-4-7';

export interface SkillPassOpts {
  skillName: string;
  dimension: AuditDimension;
  systemRole: string;
  taskDescription: string;
  sampleSize?: number;
  includeHtml?: boolean;
  anthropic: Anthropic;
  log: (msg: string) => void;
}

export async function runSkillPass(slug: string, clientDir: string, opts: SkillPassOpts): Promise<AuditPassResult> {
  const skill = loadSkill(opts.skillName);
  if (!skill) {
    return {
      dimension: opts.dimension,
      score: 0,
      summary: `Skill "${opts.skillName}" not installed. Run: npx skills add <owner>/${opts.skillName}`,
      findings: [],
      completed_at: new Date().toISOString(),
    };
  }

  const pages = loadPages(clientDir);
  const tokens = loadDesignTokens(clientDir);
  const sample = pickSamplePages(pages, opts.sampleSize ?? 4);
  if (sample.length === 0) {
    return {
      dimension: opts.dimension,
      score: 0,
      summary: `No pages available for ${opts.skillName} pass.`,
      findings: [],
      completed_at: new Date().toISOString(),
    };
  }

  opts.log(`    ${opts.skillName} on ${sample.length} sample pages`);

  const allFindings: AuditFinding[] = [];
  for (const page of sample) {
    try {
      const findings = await analyze(page, skill.skillMd, opts, tokens);
      allFindings.push(...findings);
      opts.log(`      ${page.slug.padEnd(28)} +${findings.length}`);
    } catch (err) {
      opts.log(`      ${page.slug.padEnd(28)} ERR ${String(err).slice(0, 100)}`);
    }
  }

  const score = scoreFromFindings(allFindings);
  return {
    dimension: opts.dimension,
    score,
    summary: `${opts.skillName} skill applied to ${sample.length} sample pages. ${allFindings.length} findings.`,
    findings: allFindings,
    completed_at: new Date().toISOString(),
  };
}

async function analyze(
  page: PageData,
  skillMd: string,
  opts: SkillPassOpts,
  tokens: ReturnType<typeof loadDesignTokens>,
): Promise<AuditFinding[]> {
  const tokenSummary = tokens
    ? `Design tokens: colors=${Object.values(tokens.colors ?? {}).slice(0, 6).join(', ')}; fonts=${(tokens.fonts ?? []).slice(0, 4).join(', ')}`
    : 'Design tokens: unavailable';

  const htmlExcerpt = opts.includeHtml ? loadRawHtml(page).slice(0, 12_000) : '';

  const pageContext = `URL: ${page.url}
Title: ${page.metadata.title ?? '(none)'}
Word count: ${page.content.wordCount}
${tokenSummary}
${htmlExcerpt ? `\nHTML excerpt (first 12KB):\n\n\`\`\`html\n${htmlExcerpt}\n\`\`\`\n` : ''}`;

  const userPrompt = `${opts.taskDescription}

Page being audited:

${pageContext}

${page.screenshots.desktop ? 'A screenshot of the page is attached.' : ''}

${findingsRequestPrompt(opts.dimension)}`;

  const userContent: Array<Anthropic.ImageBlockParam | Anthropic.TextBlockParam> = [];
  if (page.screenshots.desktop && existsSync(page.screenshots.desktop)) {
    const data = readFileSync(page.screenshots.desktop).toString('base64');
    userContent.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data },
    });
  }
  userContent.push({ type: 'text', text: userPrompt });

  const resp = await opts.anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: `${opts.systemRole}\n\nSKILL.md content for context:\n\n${skillMd}`,
    messages: [{ role: 'user', content: userContent }],
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  return parseFindingsJson(text, opts.dimension, page.url);
}

function scoreFromFindings(findings: AuditFinding[]): number {
  if (findings.length === 0) return 90;
  const deductions = findings.reduce((s, f) => s + (f.priority === 'p0' ? 10 : f.priority === 'p1' ? 5 : 1), 0);
  return Math.max(0, Math.min(100, 100 - deductions));
}
