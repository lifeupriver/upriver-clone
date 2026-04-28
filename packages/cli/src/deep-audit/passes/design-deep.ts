import Anthropic from '@anthropic-ai/sdk';
import { existsSync, readFileSync } from 'node:fs';
import type { AuditPassResult, AuditFinding } from '@upriver/core';
import type { PageData } from '@upriver/audit-passes';
import { loadPages, loadDesignTokens, loadRawHtml, runDesign } from '@upriver/audit-passes';
import { loadSkill, loadReference } from '../skill-loader.js';
import { pickSamplePages } from '../sample.js';
import { parseFindingsJson, findingsRequestPrompt } from '../parse-findings.js';

const MODEL = 'claude-opus-4-7';

const REFERENCES = [
  'audit',
  'critique',
  'polish',
  'heuristics-scoring',
  'layout',
  'typeset',
  'typography',
  'cognitive-load',
  'color-and-contrast',
  'colorize',
  'interaction-design',
  'motion-design',
  'animate',
  'responsive-design',
  'adapt',
  'spatial-design',
  'clarify',
  'ux-writing',
  'bolder',
  'quieter',
  'delight',
  'distill',
  'overdrive',
  'harden',
  'onboard',
  'optimize',
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

  const availableRefs = REFERENCES.filter((r) => loadReference(skill, r));
  opts.log(`    impeccable: ${availableRefs.length} references × ${sample.length} pages = ${availableRefs.length * sample.length} calls`);

  const allFindings: AuditFinding[] = [...baseline.findings];

  for (const page of sample) {
    for (const refName of availableRefs) {
      try {
        const findings = await runReference({
          anthropic: opts.anthropic,
          skillMd: skill.skillMd,
          referenceName: refName,
          referenceBody: loadReference(skill, refName)!,
          page,
          tokens,
        });
        allFindings.push(...findings);
        opts.log(`      ${refName.padEnd(22)} ${page.slug.padEnd(24)} +${findings.length}`);
      } catch (err) {
        opts.log(`      ${refName.padEnd(22)} ${page.slug.padEnd(24)} ERR ${String(err).slice(0, 80)}`);
      }
    }
  }

  const score = scoreFromFindings(allFindings);
  return {
    dimension: 'design',
    score,
    summary: `Deterministic + impeccable deep design audit on ${sample.length} sample pages across ${availableRefs.length} references. ${allFindings.length} findings.`,
    findings: allFindings,
    completed_at: new Date().toISOString(),
  };
}

interface RefArgs {
  anthropic: Anthropic;
  skillMd: string;
  referenceName: string;
  referenceBody: string;
  page: PageData;
  tokens: ReturnType<typeof loadDesignTokens>;
}

async function runReference(args: RefArgs): Promise<AuditFinding[]> {
  const screenshotBlocks = buildScreenshotBlocks(args.page);
  const tokenSummary = args.tokens
    ? `Design tokens:\n- color scheme: ${args.tokens.colorScheme ?? 'unknown'}\n- colors: ${Object.values(args.tokens.colors ?? {}).join(', ')}\n- fonts: ${(args.tokens.fonts ?? []).join(', ')}`
    : 'Design tokens: unavailable';

  const htmlExcerpt = loadRawHtml(args.page).slice(0, 12_000);

  const pageContext = `URL: ${args.page.url}
Title: ${args.page.metadata.title ?? '(none)'}
Word count: ${args.page.content.wordCount}
Headings: ${args.page.content.headings.slice(0, 10).map((h) => `${'#'.repeat(h.level)} ${h.text}`).join(' | ')}
CTAs: ${args.page.extracted.ctaButtons.map((c) => c.text).slice(0, 8).join(' | ')}

${tokenSummary}

${htmlExcerpt ? `HTML excerpt (first 12KB):\n\n\`\`\`html\n${htmlExcerpt}\n\`\`\`` : ''}`;

  const userPrompt = `You are auditing a website page through the lens of the impeccable "${args.referenceName}" reference. Use it as your evaluation framework.

### reference/${args.referenceName}.md

${args.referenceBody}

---

Page being audited:

${pageContext}

Desktop and mobile screenshots are attached if available.

${findingsRequestPrompt(`design / ${args.referenceName}`)}`;

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

  const findings = parseFindingsJson(text, 'design', args.page.url);
  for (const f of findings) {
    f.evidence = f.evidence ? `[${args.referenceName}] ${f.evidence}` : `[${args.referenceName}]`;
  }
  return findings;
}

function buildScreenshotBlocks(page: PageData): Anthropic.ImageBlockParam[] {
  const blocks: Anthropic.ImageBlockParam[] = [];
  for (const path of [page.screenshots.desktop, page.screenshots.mobile]) {
    if (path && existsSync(path)) {
      const data = readFileSync(path).toString('base64');
      blocks.push({
        type: 'image',
        source: { type: 'base64', media_type: 'image/png', data },
      });
    }
  }
  return blocks;
}

function scoreFromFindings(findings: AuditFinding[]): number {
  if (findings.length === 0) return 90;
  const deductions = findings.reduce((sum, f) => sum + (f.priority === 'p0' ? 8 : f.priority === 'p1' ? 4 : 1), 0);
  return Math.max(0, Math.min(100, 100 - deductions));
}
