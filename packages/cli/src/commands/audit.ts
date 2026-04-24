import { Args, Flags } from '@oclif/core';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { BaseCommand } from '../base-command.js';
import { clientDir } from '@upriver/core';
import {
  runSeo,
  runContent,
  runDesign,
  runSales,
  runLinks,
  runSchema,
  runAeo,
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
  { name: 'local', fn: runLocal },
  { name: 'backlinks', fn: runBacklinks },
  { name: 'competitors', fn: runCompetitors },
] as const;

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

    const passesToRun = flags.pass
      ? ALL_PASSES.filter((p) => p.name === flags.pass)
      : ALL_PASSES;

    this.log(`\nRunning ${passesToRun.length} audit pass${passesToRun.length > 1 ? 'es' : ''} for "${slug}"...\n`);

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
