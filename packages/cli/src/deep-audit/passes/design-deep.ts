import Anthropic from '@anthropic-ai/sdk';
import { existsSync, readFileSync } from 'node:fs';
import type { AuditPassResult, AuditFinding } from '@upriver/core';
import type { PageData } from '@upriver/audit-passes';
import { loadPages, loadDesignTokens, runDesign } from '@upriver/audit-passes';
import { loadSkill, loadReference } from '../skill-loader.js';
import { pickSamplePages } from '../sample.js';
import { parseFindingsJson, findingsRequestPrompt } from '../parse-findings.js';

const MODEL = 'claude-opus-4-7';

const LENSES: Array<{ name: string; references: string[] }> = [
  { name: 'evaluation', references: ['audit', 'critique', 'polish', 'heuristics-scoring'] },
  { name: 'layout-typography', references: ['layout', 'typeset', 'typography', 'cognitive-load'] },
  { name: 'color', references: ['color-and-contrast', 'colorize'] },
  { name: 'interaction-motion', references: ['interaction-design', 'motion-design', 'animate'] },
  { name: 'responsive', references: ['responsive-design', 'adapt', 'spatial-design'] },
  { name: 'copy', references: ['clarify', 'ux-writing'] },
  { name: 'energy', references: ['bolder', 'quieter', 'delight', 'distill', 'overdrive'] },
  { name: 'robustness', references: ['harden', 'onboard', 'optimize'] },
];

interface RunOpts {
  anthropic: Anthropic;
  log: (msg: string) => void;
}

export async function runDesignDeep(slug: string, clientDir: string, opts: RunOpts): Promise<AuditPassResult> {
  const baseline = await runDesign(slug, clientDir);
  const skill = loadSkill('impeccable');
  if (!skill) {
    return { ...baseline, summary: `${baseline.summary} (impeccable skill not installed; deterministic only)` };
  }

  const pages = loadPages(clientDir);
  const tokens = loadDesignTokens(clientDir);
  const sample = pickSamplePages(pages, 4);
  if (sample.length === 0) return baseline;

  opts.log(`    impeccable: ${LENSES.length} lenses × ${sample.length} pages = ${LENSES.length * sample.length} calls`);

  const allFindings: AuditFinding[] = [...baseline.findings];

  for (const page of sample) {
    for (const lens of LENSES) {
      try {
        const findings = await runLens({
          anthropic: opts.anthropic,
          skillMd: skill.skillMd,
          lens,
          page,
          tokens,
        });
        allFindings.push(...findings);
        opts.log(`      ${lens.name.padEnd(22)} ${page.slug.padEnd(24)} +${findings.length}`);
      } catch (err) {
        opts.log(`      ${lens.name.padEnd(22)} ${page.slug.padEnd(24)} ERR ${String(err).slice(0, 80)}`);
      }
    }
  }

  const score = scoreFromFindings(allFindings);
  return {
    dimension: 'design',
    score,
    summary: `Deterministic + impeccable deep design audit on ${sample.length} sample pages across ${LENSES.length} lenses. ${allFindings.length} findings.`,
    findings: allFindings,
    completed_at: new Date().toISOString(),
  };
}

interface LensArgs {
  anthropic: Anthropic;
  skillMd: string;
  lens: { name: string; references: string[] };
  page: PageData;
  tokens: ReturnType<typeof loadDesignTokens>;
}

async function runLens(args: LensArgs): Promise<AuditFinding[]> {
  const skill = loadSkill('impeccable')!;
  const referenceTexts = args.lens.references
    .map((r) => ({ name: r, body: loadReference(skill, r) }))
    .filter((r): r is { name: string; body: string } => Boolean(r.body));

  const referenceBlock = referenceTexts
    .map((r) => `### reference/${r.name}.md\n\n${r.body}`)
    .join('\n\n---\n\n');

  const screenshotBlocks = buildScreenshotBlocks(args.page);
  const tokenSummary = args.tokens
    ? `Design tokens:\n- color scheme: ${args.tokens.colorScheme ?? 'unknown'}\n- colors: ${Object.values(args.tokens.colors ?? {}).join(', ')}\n- fonts: ${(args.tokens.fonts ?? []).join(', ')}`
    : 'Design tokens: unavailable';

  const pageContext = `URL: ${args.page.url}
Title: ${args.page.metadata.title ?? '(none)'}
Word count: ${args.page.content.wordCount}
Headings: ${args.page.content.headings.slice(0, 10).map((h) => `${'#'.repeat(h.level)} ${h.text}`).join(' | ')}
CTAs: ${args.page.extracted.ctaButtons.map((c) => c.text).slice(0, 8).join(' | ')}

${tokenSummary}`;

  const userPrompt = `You are auditing a website page through the "${args.lens.name}" lens of the impeccable design skill. Use the reference material below as your evaluation framework.

${referenceBlock}

---

Page being audited:

${pageContext}

The page screenshot is attached below.

${findingsRequestPrompt(`design / ${args.lens.name}`)}`;

  const userContent: Array<Anthropic.ImageBlockParam | Anthropic.TextBlockParam> = [
    ...screenshotBlocks,
    { type: 'text', text: userPrompt },
  ];

  const resp = await args.anthropic.messages.create({
    model: MODEL,
    max_tokens: 4000,
    system: `You are an expert frontend designer applying the impeccable design skill to a website audit. The skill's full SKILL.md is below for context.\n\n${args.skillMd}`,
    messages: [{ role: 'user', content: userContent }],
  });

  const text = resp.content
    .filter((b): b is Anthropic.TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n');

  return parseFindingsJson(text, 'design', args.page.url);
}

function buildScreenshotBlocks(page: PageData): Anthropic.ImageBlockParam[] {
  const blocks: Anthropic.ImageBlockParam[] = [];
  const desktopPath = page.screenshots.desktop;
  if (desktopPath && existsSync(desktopPath)) {
    const data = readFileSync(desktopPath).toString('base64');
    blocks.push({
      type: 'image',
      source: { type: 'base64', media_type: 'image/png', data },
    });
  }
  return blocks;
}

function scoreFromFindings(findings: AuditFinding[]): number {
  if (findings.length === 0) return 90;
  const deductions = findings.reduce((sum, f) => sum + (f.priority === 'p0' ? 8 : f.priority === 'p1' ? 4 : 1), 0);
  return Math.max(0, Math.min(100, 100 - deductions));
}
