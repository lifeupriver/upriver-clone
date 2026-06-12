import { spawn } from 'node:child_process';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { Args, Flags } from '@oclif/core';
import { clientDir, PIPELINE_STAGES, type PipelineStage } from '@upriver/core';

import { BaseCommand } from '../../base-command.js';
import { addSpend, emptyLedger, type SpendLedger } from '../../pitch/ledger.js';
import {
  estimateRunTable,
  RUN_MAX_SPEND_USD_DEFAULT,
  stageEstimate,
  type RunEstimateCtx,
} from '../../spend/stage-estimates.js';
import { checkStage, EXIT_SPEND_CEILING } from '../../spend/run-spend-plan.js';
import {
  createRunLedger,
  readRunLedgerIfExists,
  recordStageActual,
  recordStageEst,
  writeRunLedger,
  type RunLedger,
} from '../../spend/run-ledger.js';
import { parseUsageLine } from '../../util/cost-summary.js';
import { EXIT_STRICT_FIDELITY } from '../clone-fidelity.js';

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
  'audit-media',
  'gap-analysis',
  'video-audit',
  'synthesize',
  'voice-extract',
  'blog-topics',
  'schema-build',
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
        'Pass-through to `upriver audit --mode`. base = heuristic (default); deep = base + LLM C.3–C.5; tooling = base + Lighthouse/squirrelscan/Playwright; all = base + deep + tooling.',
      options: ['base', 'deep', 'tooling', 'all'],
      default: 'base',
    }),
    'max-spend-usd': Flags.integer({
      description: `Per-run spend ceiling in USD, checked BEFORE each costed stage (spec 17b §2).`,
      default: RUN_MAX_SPEND_USD_DEFAULT,
    }),
    'spend-ceiling': Flags.boolean({
      description: 'Enforce the per-run spend ceiling (--no-spend-ceiling to disable).',
      default: true,
      allowNo: true,
    }),
    'strict-fidelity': Flags.boolean({
      description:
        'Pass --strict-fidelity to clone-fidelity and escalate its exit 62 to a hard run failure.',
      default: false,
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

    const auditMode = (flags['audit-mode'] ?? 'base') as RunEstimateCtx['auditMode'];
    const ctx: RunEstimateCtx = { pages: countPlannedPages(dir), auditMode };
    const ceiling = flags['spend-ceiling'] ? flags['max-spend-usd'] : null;

    // The --dry-run table and the enforcement below use the SAME estimate
    // constants, so the preview and the ceiling can never drift apart.
    const table = estimateRunTable(stages.map((s) => s.id), ctx, ceiling);
    this.log(`\nEstimated spend (${ctx.pages} page(s), audit-mode ${auditMode}):`);
    for (const r of table.rows) {
      this.log(
        `  - ${r.id.padEnd(16)} ~$${r.usd.toFixed(2).padStart(6)}  (${r.firecrawlCredits} credits, ${r.agentSeconds}s agent)`,
      );
    }
    this.log(
      `  total ~$${table.totalUsd.toFixed(2)} vs ceiling ${ceiling === null ? 'DISABLED (--no-spend-ceiling)' : `$${ceiling}`}${table.fitsCeiling ? '' : ' — WOULD ABORT at the first over-ceiling stage'}`,
    );

    if (flags['dry-run']) {
      this.log('\nDRY RUN — no stages executed. Drop --dry-run to run.');
      return;
    }

    const binPath = process.argv[1];
    if (!binPath) {
      this.error('Cannot determine upriver bin path from process.argv[1]. Aborting.');
    }

    // Spend ledger: a --from resume appends to the existing run-ledger so the
    // ceiling covers the whole run, not just the resumed tail.
    let runLedger: RunLedger;
    const prior = flags.from ? readRunLedgerIfExists(dir) : null;
    runLedger = prior ?? createRunLedger(slug, ceiling);

    const startedAt = Date.now();
    let okCount = 0;
    let failedCount = 0;
    let skippedCount = 0;

    for (const stage of stages) {
      const spent: SpendLedger = { firecrawlCredits: 0, agentSeconds: 0, estUsd: runLedger.totalEstUsd };
      const decision = checkStage(spent, stage.id, ctx, ceiling);
      if (decision === 'over-ceiling') {
        // No ledger write here: every recorded stage already wrote one, and a
        // first-stage abort (e.g. the --max-spend-usd 0 deliberate-bug check)
        // must leave the client dir untouched.
        const est = stageEstimate(stage.id, ctx)!;
        this.error(
          `Spend ceiling: stage "${stage.id}" (est ~$${addSpend(emptyLedger(), est).estUsd.toFixed(2)}) ` +
            `on top of ~$${runLedger.totalEstUsd.toFixed(2)} already committed would exceed the $${ceiling} ceiling. ` +
            `Stage NOT started. Raise --max-spend-usd, pass --no-spend-ceiling, or resume later with --from=${stage.id}.`,
          { exit: EXIT_SPEND_CEILING },
        );
      }

      const stageArgs = [...stage.args(slug)];
      if (stage.id === 'audit' && auditMode !== 'base') {
        stageArgs.push('--mode', auditMode);
      }
      if (stage.id === 'clone') {
        // Pass the REMAINING budget down (explicit, no file coupling) so the
        // per-page checks inside clone respect what this run already spent.
        if (ceiling === null) stageArgs.push('--no-spend-ceiling');
        else stageArgs.push('--max-spend-usd', String(Math.max(0, Math.floor(ceiling - runLedger.totalEstUsd))));
      }
      if (stage.id === 'clone-fidelity' && flags['strict-fidelity']) {
        stageArgs.push('--strict-fidelity');
      }
      const cmdParts = stage.name.split(/\s+/);
      const fullArgs = [binPath, ...cmdParts, ...stageArgs];
      this.log(`\n────────  ${stage.id}: upriver ${stage.name} ${stageArgs.join(' ')}  ────────`);

      const stageStart = Date.now();
      const stageStartIso = new Date(stageStart).toISOString();
      const code = await runChild(fullArgs);
      const elapsed = ((Date.now() - stageStart) / 1000).toFixed(1);

      if (decision === 'run') {
        const est = stageEstimate(stage.id, ctx)!;
        runLedger = recordStageEst(runLedger, stage.id, addSpend(emptyLedger(), est));
        const actualCredits = creditsSince(dir, stageStartIso);
        if (actualCredits !== null) {
          runLedger = recordStageActual(runLedger, stage.id, {
            firecrawlCredits: actualCredits.credits,
            usd: actualCredits.usd,
            source: 'usage-log',
          });
        }
        writeRunLedger(dir, runLedger);
      }

      if (code === 0) {
        okCount += 1;
        this.log(`  ✓ ${stage.id} ok (${elapsed}s)`);
      } else if (code === EXIT_SPEND_CEILING) {
        // The child hit its own ceiling (clone's per-page stop). Honest halt:
        // a budget-truncated clone must not flow on into finalize.
        failedCount += 1;
        this.error(
          `Stage "${stage.id}" stopped at the spend ceiling (exit ${code}). ` +
            `Raise --max-spend-usd or resume with --from=${stage.id}.`,
          { exit: EXIT_SPEND_CEILING },
        );
      } else if (stage.id === 'clone-fidelity' && flags['strict-fidelity'] && code === EXIT_STRICT_FIDELITY) {
        // Normally optional, but under --strict-fidelity a below-bar page is
        // the one failure this stage exists to catch — escalate it.
        failedCount += 1;
        this.error(
          `Stage "clone-fidelity" failed the strict fidelity gate (exit ${code}); see clone-qa/summary.json.`,
          { exit: EXIT_STRICT_FIDELITY },
        );
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
    this.log(
      `Spend: ~$${runLedger.totalEstUsd.toFixed(2)} estimated this run (${runLedger.stages.length} costed stage(s); run-ledger.json has the est/actual split).`,
    );
    this.reportFidelityPolicy(dir);
  }

  /** Surface the warn-and-record policy result in the run summary (spec 17b §1). */
  private reportFidelityPolicy(dir: string): void {
    try {
      const raw = readFileSync(join(dir, 'clone-qa', 'summary.json'), 'utf-8');
      const summary = JSON.parse(raw) as {
        policy?: { bar: number; belowBar: Array<{ pageSlug: string; overall: number }>; unscored: string[] };
      };
      const p = summary.policy;
      if (!p) return;
      if (p.belowBar.length === 0 && p.unscored.length === 0) return;
      this.warn(
        `Fidelity policy (bar ${p.bar}): ` +
          [
            ...p.belowBar.map((b) => `${b.pageSlug}=${b.overall}`),
            ...p.unscored.map((s) => `${s}=unscored`),
          ].join(', ') +
          ' — recorded in clone-qa/summary.json; fixes plan routes them.',
      );
    } catch {
      // No summary (clone-fidelity skipped/failed) — nothing to report.
    }
  }
}

/**
 * Pages this run will scrape/clone, for the spend estimate: prefer already-
 * scraped pages/*.json, fall back to site-map.json URLs, then a 5-page
 * default. An estimate input, never a gate.
 */
function countPlannedPages(dir: string): number {
  try {
    const pages = readdirSync(join(dir, 'pages')).filter((f) => f.endsWith('.json'));
    if (pages.length > 0) return pages.length;
  } catch {
    /* fall through */
  }
  try {
    const map = JSON.parse(readFileSync(join(dir, 'site-map.json'), 'utf-8')) as { urls?: unknown[] };
    if (Array.isArray(map.urls) && map.urls.length > 0) return map.urls.length;
  } catch {
    /* fall through */
  }
  return 5;
}

/**
 * Sum usage-log credits recorded at/after `sinceIso` — the stage's actuals
 * (spec 17b §3). null when the log is absent or has nothing in the window,
 * so estimates stand un-overwritten.
 */
function creditsSince(dir: string, sinceIso: string): { credits: number; usd: number } | null {
  const path = join(dir, 'token-and-credit-usage.log');
  if (!existsSync(path)) return null;
  const since = Date.parse(sinceIso);
  let credits = 0;
  let any = false;
  for (const line of readFileSync(path, 'utf-8').split(/\r?\n/)) {
    const e = parseUsageLine(line);
    if (!e) continue;
    const t = Date.parse(e.ts);
    if (!Number.isFinite(t) || t < since) continue;
    credits += e.credits;
    any = true;
  }
  if (!any) return null;
  return { credits, usd: addSpend(emptyLedger(), { firecrawlCredits: credits }).estUsd };
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
