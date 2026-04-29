import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { Args, Flags } from '@oclif/core';
import { clientDir } from '@upriver/core';

import { BaseCommand } from '../../base-command.js';

/**
 * One stage in the pipeline. `args` is appended verbatim to `upriver <name>`.
 * `optional` stages are run when the precondition is met but their failure
 * does not abort the pipeline (e.g. clone-fidelity needs scaffolded pages).
 */
interface Stage {
  id: string;
  name: string;
  args: (slug: string) => string[];
  optional?: boolean;
  describe: string;
}

/**
 * G.7 — Static topological pipeline graph. The order encodes the full
 * dependency chain: every stage assumes outputs from the prior stages exist
 * on disk. Each command is independently idempotent (most respect
 * BaseCommand.skipIfExists), so re-running `run all` after a partial failure
 * picks up where it left off.
 *
 * `init` is intentionally excluded — it takes a URL not a slug, so it must be
 * run by hand before `run all`.
 */
const PIPELINE: Stage[] = [
  { id: 'scrape', name: 'scrape', args: (s) => [s], describe: 'Firecrawl scrape every page' },
  { id: 'discover', name: 'discover', args: (s) => [s], describe: 'Scrape competitors + keyword discovery' },
  { id: 'audit', name: 'audit', args: (s) => [s], describe: 'Run audit passes (base by default; --audit-mode threads through)' },
  { id: 'synthesize', name: 'synthesize', args: (s) => [s], describe: 'Compose audit-package.json' },
  { id: 'scaffold', name: 'scaffold', args: (s) => [s], describe: 'Generate Astro repo from template' },
  { id: 'clone', name: 'clone', args: (s) => [s, '--no-pr'], describe: 'Visual clone every page' },
  { id: 'finalize', name: 'finalize', args: (s) => [s, '--download-missing'], describe: 'Rewrite links + fetch missing CDN assets' },
  { id: 'clone-fidelity', name: 'clone-fidelity', args: (s) => [s], optional: true, describe: 'Score cloned vs live; emit fidelity findings' },
  { id: 'fixes-plan', name: 'fixes plan', args: (s) => [s], describe: 'Generate fixes-plan.md from audit + intake + fidelity' },
  { id: 'improve', name: 'improve', args: (s) => [s, '--dry-run'], optional: true, describe: 'Plan improvement-track matrix (--no-dry-run to apply)' },
];

/**
 * `upriver run all <slug>` — orchestrate every pipeline stage in dependency
 * order. Halts on first non-optional failure. Use --from to resume.
 *
 * Roadmap: Workstream G.7.
 */
export default class RunAll extends BaseCommand {
  static override description =
    'Orchestrate every pipeline stage for a client in dependency order (G.7).';

  static override examples = [
    '<%= config.bin %> run all audreys',
    '<%= config.bin %> run all audreys --from clone',
    '<%= config.bin %> run all audreys --dry-run',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    from: Flags.string({
      description: `Resume from this stage id. Stages: ${PIPELINE.map((s) => s.id).join(', ')}.`,
    }),
    'dry-run': Flags.boolean({
      description: 'Print the planned stages without executing.',
      default: false,
    }),
    'continue-on-error': Flags.boolean({
      description: 'Keep running stages even after a failure (useful for diagnostics).',
      default: false,
    }),
    'audit-mode': Flags.string({
      description:
        'Pass-through to `upriver audit --mode`. base = heuristic only (default), deep = LLM-driven C.3-C.5 only, all = both.',
      options: ['base', 'deep', 'all'],
      default: 'base',
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(RunAll);
    const { slug } = args;

    const base = process.env['UPRIVER_CLIENTS_DIR'] ?? './clients';
    const dir = resolve(clientDir(slug, base));
    if (!existsSync(dir)) {
      this.error(
        `Client directory not found at ${dir}. Run "upriver init <url> --slug ${slug}" before "upriver run-all".`,
      );
    }

    let stages = PIPELINE;
    if (flags.from) {
      const idx = PIPELINE.findIndex((s) => s.id === flags.from);
      if (idx < 0) {
        this.error(
          `--from must be one of: ${PIPELINE.map((s) => s.id).join(', ')}. Got: ${flags.from}`,
        );
      }
      stages = PIPELINE.slice(idx);
    }

    this.log(`\nrun all "${slug}" — ${stages.length} stage(s) (cwd: ${dir})`);
    for (const s of stages) {
      this.log(`  - ${s.id.padEnd(16)} ${s.optional ? '(optional)' : '         '} ${s.describe}`);
    }

    if (flags['dry-run']) {
      this.log('\nDRY RUN — no stages executed. Drop --dry-run to run.');
      return;
    }

    const binPath = process.argv[1];
    if (!binPath) {
      this.error('Cannot determine upriver bin path from process.argv[1]. Aborting.');
    }

    const startedAt = Date.now();
    let okCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    const auditMode = flags['audit-mode'] ?? 'base';
    for (const stage of stages) {
      const stageArgs = [...stage.args(slug)];
      if (stage.id === 'audit' && auditMode !== 'base') {
        stageArgs.push('--mode', auditMode);
      }
      const cmdParts = stage.name.split(/\s+/);
      const fullArgs = [binPath, ...cmdParts, ...stageArgs];
      this.log(`\n────────  ${stage.id}: upriver ${stage.name} ${stageArgs.join(' ')}  ────────`);

      const stageStart = Date.now();
      const code = await runChild(fullArgs);
      const elapsed = ((Date.now() - stageStart) / 1000).toFixed(1);

      if (code === 0) {
        okCount += 1;
        this.log(`  ✓ ${stage.id} ok (${elapsed}s)`);
      } else if (stage.optional) {
        skippedCount += 1;
        this.warn(`  ! ${stage.id} optional stage exited ${code} (${elapsed}s) — continuing.`);
      } else {
        failedCount += 1;
        this.warn(`  ✗ ${stage.id} failed exit=${code} (${elapsed}s)`);
        if (!flags['continue-on-error']) {
          this.error(
            `Stage "${stage.id}" failed. Re-run with --from=${stage.id} after fixing, or pass --continue-on-error to push through.`,
          );
        }
      }
    }

    const totalElapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    this.log(
      `\nrun all complete in ${totalElapsed}s: ${okCount} ok, ${skippedCount} optional-skipped, ${failedCount} failed.`,
    );
  }
}

/**
 * Spawn `node <argv...>` and resolve to its exit code. stdio is inherited so
 * sub-command output streams in real time. Resolves rather than rejects on
 * non-zero exit so the orchestrator can decide what to do.
 */
function runChild(argv: string[]): Promise<number> {
  return new Promise((resolveP) => {
    const child = spawn(process.execPath, argv, { stdio: 'inherit', env: { ...process.env } });
    child.on('exit', (code) => resolveP(typeof code === 'number' ? code : 1));
    child.on('error', () => resolveP(1));
  });
}
