import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

import { Args, Flags } from '@oclif/core';
import { clientDir, PIPELINE_STAGES, type PipelineStage } from '@upriver/core';

import { BaseCommand } from '../../base-command.js';

/**
 * Stages the orchestrator actually invokes. We filter the canonical
 * PIPELINE_STAGES list down to the ones with a runnable command and a
 * useful place in the orchestrated pipeline. `init` is excluded because it
 * takes a URL not a slug; `qa` is excluded because clone-fidelity already
 * covers the same surface for the orchestrated path; `launch` is excluded
 * because it requires manual DNS/host decisions.
 *
 * `discover` is included even though its command is `null` in the canonical
 * list — discover-as-orchestrator-stage is invocable via the `discover` CLI
 * command directly, just not via the GUI's allowlist. The orchestrator runs
 * it in-process via spawn, which is unrestricted.
 */
const ORCHESTRATED_IDS: ReadonlySet<string> = new Set([
  'scrape',
  'discover',
  'audit',
  'synthesize',
  'scaffold',
  'clone',
  'finalize',
  'clone-fidelity',
  'fixes-plan',
  'improve',
]);

/**
 * G.7 — Stage shape used inside this command. Wraps the canonical
 * `PipelineStage` with the orchestrator's slash-command name and per-stage
 * argv builder.
 */
interface Stage {
  id: string;
  name: string;
  args: (slug: string) => string[];
  optional?: boolean;
  describe: string;
}

/** Stage id → CLI command name when it differs from the id. */
const COMMAND_NAME_OVERRIDES: Record<string, string> = {
  'fixes-plan': 'fixes plan',
  // 'discover' is invoked as `upriver discover`; the canonical record sets
  // `command: null` because discover isn't on the dashboard API allowlist.
  discover: 'discover',
};

const PIPELINE: Stage[] = PIPELINE_STAGES.filter((s) => ORCHESTRATED_IDS.has(s.id)).map(
  (s: PipelineStage): Stage => {
    const name = COMMAND_NAME_OVERRIDES[s.id] ?? s.command ?? s.id;
    const extraArgs = s.args ?? [];
    return {
      id: s.id,
      name,
      args: (slug) => [slug, ...extraArgs],
      ...(s.optional ? { optional: true } : {}),
      describe: s.describe,
    };
  },
);

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
