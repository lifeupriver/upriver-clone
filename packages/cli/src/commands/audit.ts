import Anthropic from '@anthropic-ai/sdk';
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
import {
  runPreflight,
  runDesignDeep,
  runWebQuality,
  runAuditWebsite,
  runAccessibilityDeep,
  runCoreWebVitalsDeep,
  runAnalyticsTracking,
  runTrustSignals,
  runCrossBrowser,
} from '../deep-audit/index.js';

type PassFn = (slug: string, clientDir: string) => Promise<AuditPassResult>;

const ALL_PASSES: ReadonlyArray<{ name: string; fn: PassFn }> = [
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
];

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
        'Audit mode. base = heuristic passes only (default). deep = + LLM-driven C.3–C.5 passes. all = + tooling-driven passes (Lighthouse / squirrelscan / Playwright / Anthropic accessibility & CWV & trust). For tooling-only without LLM passes, use --deep.',
      options: ['base', 'deep', 'all'],
      default: 'base',
    }),
    'deep-concurrency': Flags.integer({
      description:
        'Max parallel LLM deep passes when --mode includes deep. Default 2 — keeps token usage bounded.',
      default: 2,
      min: 1,
    }),
    out: Flags.string({
      description: 'Output directory (default: clients/<slug>/audit)',
    }),
    deep: Flags.boolean({
      description:
        'Run tooling-driven deep passes (impeccable design, Lighthouse, squirrelscan, accessibility, CWV, analytics, trust signals, cross-browser). Implied by --mode=all. Use this flag alone for tooling-only without LLM passes.',
      default: false,
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

    // Collect successful results
    const passed: AuditPassResult[] = [];
    for (const r of results) {
      if (r.status === 'fulfilled') passed.push(r.value);
    }

    // Two deep-pass tracks coexist:
    //   1. C.3–C.5 LLM passes via DEEP_PASSES + injectable runAgent. Gated by
    //      --mode=deep|all. Concurrency capped via --deep-concurrency.
    //   2. Tooling-driven deep passes (impeccable, lighthouse, squirrelscan,
    //      playwright) gated by the legacy --deep boolean.
    // Both push into the same `passed[]` accumulator so downstream summary /
    // JSON-write steps see them transparently.
    let deepRun = 0;

    // Track 1: C.3–C.5 LLM passes (G.3 — parallelized with concurrency cap;
    // G.4 — prefer the Anthropic SDK runner when an API key is available).
    if (runDeep) {
      const cap = Math.max(1, flags['deep-concurrency'] ?? 2);
      const runAgent: AgentRunner = process.env['ANTHROPIC_API_KEY']
        ? createAnthropicRunner({ slug })
        : claudeCliRunner;
      const runnerLabel = process.env['ANTHROPIC_API_KEY'] ? 'anthropic-sdk' : 'claude-cli';
      this.log(
        `\nRunning ${DEEP_PASSES.length} LLM deep pass${DEEP_PASSES.length === 1 ? '' : 'es'} (concurrency=${cap}, runner=${runnerLabel})...\n`,
      );
      const queue = [...DEEP_PASSES];
      const runOne = async (): Promise<void> => {
        while (queue.length > 0) {
          const spec = queue.shift();
          if (!spec) break;
          const passStart = Date.now();
          try {
            const result = await runDeepPass(spec, { slug, clientDir: dir, runAgent });
            const elapsedPass = ((Date.now() - passStart) / 1000).toFixed(1);
            const grade = gradeScore(result.score);
            const p0 = result.findings.filter((f) => f.priority === 'p0').length;
            const p1 = result.findings.filter((f) => f.priority === 'p1').length;
            const p2 = result.findings.filter((f) => f.priority === 'p2').length;
            this.log(
              `  [${grade}] ${spec.id.padEnd(22)} score=${result.score}/100  p0=${p0} p1=${p1} p2=${p2}  (${elapsedPass}s)  [llm-deep]`,
            );
            passed.push(result);
            deepRun += 1;
          } catch (err) {
            this.warn(`  [ERR] ${spec.id.padEnd(22)} failed: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      };
      const workers = Array.from({ length: Math.min(cap, DEEP_PASSES.length) }, () => runOne());
      await Promise.allSettled(workers);
    }

    // Track 2: tooling-driven deep passes. Triggered by --deep OR by
    // --mode=all (so "all" is genuinely all). --pass filter still gates either
    // path off, since tooling passes don't fit the per-pass filter shape.
    const runTooling = (flags.deep || mode === 'all') && !flags.pass;
    if (runTooling) {
      const preflight = runPreflight();
      this.log(`\n${'─'.repeat(60)}\nPreflight checks for --deep:`);
      for (const w of preflight.warnings) this.log(`  ⚠  ${w}`);
      if (preflight.warnings.length === 0) this.log(`  ✓ all checks passed`);

      this.log(`\nRunning deep passes (this may take several minutes)...\n`);

      const deepStart = Date.now();
      let anthropic: Anthropic | null = null;
      if (preflight.anthropicKey) {
        anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
      }

      const log = (msg: string) => this.log(msg);

      const deepPasses: Array<{ name: string; fn: () => Promise<AuditPassResult>; gate: boolean }> = [
        {
          name: 'design-deep',
          gate: Boolean(anthropic) && preflight.skills.impeccable,
          fn: () => runDesignDeep(slug, dir, { anthropic: anthropic!, log }),
        },
        {
          name: 'web-quality',
          gate: preflight.available.lighthouse && preflight.skills.webQualityAudit,
          fn: () => runWebQuality(slug, dir, { log }),
        },
        {
          name: 'audit-website',
          gate: preflight.available.squirrelscan && preflight.skills.auditWebsite,
          fn: () => runAuditWebsite(slug, dir, { log }),
        },
        {
          name: 'accessibility',
          gate: Boolean(anthropic) && preflight.skills.accessibility,
          fn: () => runAccessibilityDeep(slug, dir, { anthropic: anthropic!, log }),
        },
        {
          name: 'core-web-vitals',
          gate: Boolean(anthropic) && preflight.skills.coreWebVitals,
          fn: () => runCoreWebVitalsDeep(slug, dir, { anthropic: anthropic!, log }),
        },
        {
          name: 'analytics-tracking',
          gate: preflight.available.playwrightBrowsers,
          fn: () => runAnalyticsTracking(slug, dir, { log }),
        },
        {
          name: 'trust-signals',
          gate: Boolean(anthropic),
          fn: () => runTrustSignals(slug, dir, { anthropic: anthropic!, log }),
        },
        {
          name: 'cross-browser',
          gate: preflight.available.playwrightBrowsers,
          fn: () => runCrossBrowser(slug, dir, { log }),
        },
      ];

      for (const p of deepPasses) {
        if (!p.gate) {
          this.log(`  [SKIP] ${p.name.padEnd(20)} (preflight check failed)`);
          continue;
        }
        const passStart = Date.now();
        try {
          this.log(`  [RUN]  ${p.name.padEnd(20)}`);
          const result = await p.fn();
          const elapsedPass = ((Date.now() - passStart) / 1000).toFixed(1);
          const grade = gradeScore(result.score);
          const p0 = result.findings.filter((f) => f.priority === 'p0').length;
          const p1 = result.findings.filter((f) => f.priority === 'p1').length;
          const p2 = result.findings.filter((f) => f.priority === 'p2').length;
          this.log(`  [${grade}] ${p.name.padEnd(20)} score=${result.score}/100  p0=${p0} p1=${p1} p2=${p2}  (${elapsedPass}s)`);
          passed.push(result);
          deepRun++;
        } catch (err) {
          this.warn(`  [ERR]  ${p.name.padEnd(20)} ${String(err).slice(0, 140)}`);
        }
      }

      const deepElapsed = ((Date.now() - deepStart) / 1000).toFixed(1);
      this.log(`\nDeep passes: ${deepRun}/${deepPasses.length} completed in ${deepElapsed}s`);
    }

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

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

    const totalPassesRun = passesToRun.length + deepRun;
    const summary = {
      slug,
      audited_at: new Date().toISOString(),
      deep: runTooling,
      mode,
      overall_score: overallScore,
      overall_grade: gradeScore(overallScore),
      passes_run: totalPassesRun,
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
    this.log(`Completed ${passed.length}/${totalPassesRun} passes in ${elapsed}s`);
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
