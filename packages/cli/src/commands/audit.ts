import { Args, Flags } from '@oclif/core';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { BaseCommand } from '../base-command.js';
import { clientDir } from '@upriver/core';
import { createAnthropicRunner } from '../deep-audit/anthropic-runner.js';
import { competitorDeepPass } from '../deep-audit/passes/competitor-deep/run.js';
import { contentStrategyPass } from '../deep-audit/passes/content-strategy/run.js';
import { conversionPsychologyPass } from '../deep-audit/passes/conversion-psychology/run.js';
import { claudeCliRunner, runDeepPass, type AgentRunner, type DeepPassSpec } from '../deep-audit/runner.js';
import {
  runSeo,
  runContent,
  runDesign,
  runSales,
  runLinks,
  runSchema,
  runAeo,
  runGeo,
  runTypography,
  runLocal,
  runBacklinks,
  runCompetitors,
} from '@upriver/audit-passes';
import type { AuditPassResult } from '@upriver/core';

const ALL_PASSES = [
  { name: 'seo', fn: runSeo },
  { name: 'content', fn: runContent },
  { name: 'design', fn: runDesign },
  { name: 'sales', fn: runSales },
  { name: 'links', fn: runLinks },
  { name: 'schema', fn: runSchema },
  { name: 'aeo', fn: runAeo },
  { name: 'geo', fn: runGeo },
  { name: 'typography', fn: runTypography },
  { name: 'local', fn: runLocal },
  { name: 'backlinks', fn: runBacklinks },
  { name: 'competitors', fn: runCompetitors },
] as const;

/**
 * Deep audit passes (C.3–C.5). Each is an LLM-agent-driven pass that takes
 * scraped content + intake + brand voice and produces AuditFindings via the
 * shared deep-audit/runner. Only invoked when --mode=deep|all. Currently
 * scaffolded with content-strategy; conversion-psychology and competitor-deep
 * land under separate roadmap items.
 */
const DEEP_PASSES: ReadonlyArray<DeepPassSpec<unknown>> = [
  contentStrategyPass as DeepPassSpec<unknown>,
  conversionPsychologyPass as DeepPassSpec<unknown>,
  competitorDeepPass as DeepPassSpec<unknown>,
];

function gradeScore(score: number): string {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}

export default class Audit extends BaseCommand {
  static override description = 'Run all 10 audit passes concurrently against scraped data';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    pass: Flags.string({
      description: 'Run only a specific pass (e.g. seo, content, design)',
      options: ALL_PASSES.map((p) => p.name),
      multiple: false,
    }),
    mode: Flags.string({
      description:
        'Audit mode. base = fast heuristic passes (default). deep = agent-driven C.3–C.5 passes only. all = both.',
      options: ['base', 'deep', 'all'],
      default: 'base',
    }),
    'deep-concurrency': Flags.integer({
      description:
        'Max parallel deep passes when --mode includes deep. Default 2 — keeps token usage bounded.',
      default: 2,
      min: 1,
    }),
    out: Flags.string({
      description: 'Output directory (default: clients/<slug>/audit)',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Audit);
    const slug = args.slug;
    const dir = clientDir(slug);

    if (!existsSync(dir)) {
      this.error(`Client directory not found: ${dir}. Run "upriver init ${slug}" first.`);
    }

    const pagesDir = join(dir, 'pages');
    if (!existsSync(pagesDir)) {
      this.error(`No scraped pages found at ${pagesDir}. Run "upriver scrape ${slug}" first.`);
    }

    const outDir = flags.out ?? join(dir, 'audit');
    mkdirSync(outDir, { recursive: true });

    const mode = (flags.mode ?? 'base') as 'base' | 'deep' | 'all';
    const runBase = mode === 'base' || mode === 'all';
    const runDeep = mode === 'deep' || mode === 'all';
    const passesToRun = !runBase
      ? []
      : flags.pass
        ? ALL_PASSES.filter((p) => p.name === flags.pass)
        : ALL_PASSES;

    this.log(
      `\nRunning ${passesToRun.length} base pass${passesToRun.length === 1 ? '' : 'es'} for "${slug}" (mode=${mode}${runDeep ? `, +${DEEP_PASSES.length} deep` : ''})...\n`,
    );

    // Run all passes in parallel
    const startTime = Date.now();
    const results = await Promise.allSettled(
      passesToRun.map(async ({ name, fn }) => {
        const passStart = Date.now();
        try {
          const result = await (fn as (slug: string, clientDir: string) => Promise<AuditPassResult>)(slug, dir);
          const elapsed = ((Date.now() - passStart) / 1000).toFixed(1);
          const grade = gradeScore(result.score);
          const p0 = result.findings.filter((f) => f.priority === 'p0').length;
          const p1 = result.findings.filter((f) => f.priority === 'p1').length;
          const p2 = result.findings.filter((f) => f.priority === 'p2').length;
          this.log(
            `  [${grade}] ${name.padEnd(12)} score=${result.score}/100  p0=${p0} p1=${p1} p2=${p2}  (${elapsed}s)`,
          );
          return result;
        } catch (err) {
          this.warn(`  [ERR] ${name.padEnd(12)} failed: ${String(err)}`);
          throw err;
        }
      }),
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

    // Collect successful results
    const passed: AuditPassResult[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') passed.push(r.value);
    }

    // Deep passes (C.3–C.5). G.3 — parallelized with a concurrency cap so
    // token usage stays bounded but multiple LLM-driven passes overlap.
    if (runDeep) {
      const cap = Math.max(1, flags['deep-concurrency'] ?? 2);
      // G.4 — prefer the Anthropic SDK runner (with prompt caching) when an
      // API key is available; fall back to the claude CLI runner otherwise.
      const runAgent: AgentRunner = process.env['ANTHROPIC_API_KEY']
        ? createAnthropicRunner({ slug })
        : claudeCliRunner;
      const runnerLabel = process.env['ANTHROPIC_API_KEY'] ? 'anthropic-sdk' : 'claude-cli';
      this.log(
        `\nRunning ${DEEP_PASSES.length} deep pass${DEEP_PASSES.length === 1 ? '' : 'es'} (concurrency=${cap}, runner=${runnerLabel})...\n`,
      );
      const queue = [...DEEP_PASSES];
      const runOne = async (): Promise<void> => {
        while (queue.length > 0) {
          const spec = queue.shift();
          if (!spec) break;
          const passStart = Date.now();
          try {
            const result = await runDeepPass(spec, { slug, clientDir: dir, runAgent });
            const elapsed = ((Date.now() - passStart) / 1000).toFixed(1);
            const grade = gradeScore(result.score);
            const p0 = result.findings.filter((f) => f.priority === 'p0').length;
            const p1 = result.findings.filter((f) => f.priority === 'p1').length;
            const p2 = result.findings.filter((f) => f.priority === 'p2').length;
            this.log(
              `  [${grade}] ${spec.id.padEnd(22)} score=${result.score}/100  p0=${p0} p1=${p1} p2=${p2}  (${elapsed}s)  [deep]`,
            );
            passed.push(result);
          } catch (err) {
            this.warn(`  [ERR] ${spec.id.padEnd(22)} failed: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      };
      const workers = Array.from({ length: Math.min(cap, DEEP_PASSES.length) }, () => runOne());
      await Promise.allSettled(workers);
    }

    // Write individual pass JSON files
    for (const result of passed) {
      const outPath = join(outDir, `${result.dimension}.json`);
      writeFileSync(outPath, JSON.stringify(result, null, 2), 'utf8');
    }

    // Write summary report
    const overallScore = passed.length > 0
      ? Math.round(passed.reduce((s, r) => s + r.score, 0) / passed.length)
      : 0;

    const allFindings = passed.flatMap((r) => r.findings);
    const totalP0 = allFindings.filter((f) => f.priority === 'p0').length;
    const totalP1 = allFindings.filter((f) => f.priority === 'p1').length;
    const totalP2 = allFindings.filter((f) => f.priority === 'p2').length;

    const summary = {
      slug,
      audited_at: new Date().toISOString(),
      overall_score: overallScore,
      overall_grade: gradeScore(overallScore),
      passes_run: passesToRun.length,
      passes_completed: passed.length,
      total_findings: allFindings.length,
      findings_by_priority: { p0: totalP0, p1: totalP1, p2: totalP2 },
      scores: Object.fromEntries(passed.map((r) => [r.dimension, r.score])),
      summaries: Object.fromEntries(passed.map((r) => [r.dimension, r.summary])),
    };

    writeFileSync(join(outDir, 'summary.json'), JSON.stringify(summary, null, 2), 'utf8');

    this.log(`\n${'─'.repeat(60)}`);
    this.log(`Overall score: ${overallScore}/100  (${gradeScore(overallScore)})`);
    this.log(`Findings: ${totalP0} critical (P0)  ${totalP1} important (P1)  ${totalP2} minor (P2)`);
    this.log(`Completed ${passed.length}/${passesToRun.length} passes in ${elapsed}s`);
    this.log(`Output: ${outDir}/`);

    if (totalP0 > 0) {
      this.log(`\n⚠  ${totalP0} critical findings require immediate attention:`);
      const criticals = allFindings
        .filter((f) => f.priority === 'p0')
        .slice(0, 5);
      for (const f of criticals) {
        this.log(`   • [${f.dimension}] ${f.title}`);
      }
      if (totalP0 > 5) this.log(`   … and ${totalP0 - 5} more — see audit/summary.json`);
    }
  }
}
