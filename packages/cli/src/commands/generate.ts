import { join } from 'node:path';
import { createInterface } from 'node:readline/promises';

import { Args, Flags } from '@oclif/core';
import type { DeliverableId } from '@upriver/schemas';

import { BaseCommand } from '../base-command.js';
import {
  ALL_DOCS,
  aggregateMarkers,
  aggregateOperatorActions,
  commitCommand,
  planBatch,
  runTier,
  runTierParallel,
  seedClientTree,
  tierIndexOf,
  type DocResult,
  type ParallelTierDeps,
  type Tier,
} from '../generate/batch.js';
import { resolveClientDataSourceOrFail } from '../generate/data-source.js';
import { runGenerate, type GenerateDeps } from '../generate/engine.js';
import { resolveGateDecision } from '../generate/gate.js';
import { generatedIds, readManifest, setApproved, writeManifest } from '../generate/manifest.js';
import { readProfile } from '../generate/profile-io.js';
import { I_SERIES } from '../generate/provisioning.js';
import { renderBatchPlan, renderOperatorChecklist, renderTierReport, tierUnblocks } from '../generate/report.js';
import { claudeCliCall } from '../util/claude-cli.js';
import { gitWorktreeProvider, resolveGitRepoRoot } from '../util/git-worktree.js';
import { LocalFsClientDataSource, type ClientDataSource } from '@upriver/core/data';

/** The `--all` flag subset `runAll` consumes (the parsed flags object is a superset). */
interface AllFlags {
  docs: string | undefined;
  from: string | undefined;
  provisioning: boolean;
  'dry-run': boolean;
  yes: boolean;
  model: string;
  jobs: number;
}

export default class Generate extends BaseCommand {
  static override description =
    'Generate AI Operating System documents and provisioning artifacts from a client profile via write-capable headless Claude Code sessions, gated on coverage and human-verify-required fields. `--doc <id>` for one deliverable (doc-01…12 or i01…09); `--all` for DAG-batch generation over docs 01–12 (M2); `--all --provisioning` for the I01–I09 provisioning artifacts (M5), each with per-tier Continue gates.';

  static override examples = [
    '<%= config.bin %> generate littlefriends --doc doc-01',
    '<%= config.bin %> generate littlefriends --all --dry-run   # print the tier plan, no claude calls',
    '<%= config.bin %> generate littlefriends --all             # generate tier by tier, gating each',
    '<%= config.bin %> generate littlefriends --all --docs doc-01,doc-02,doc-05',
    '<%= config.bin %> generate littlefriends --all --from doc-04   # resume a partially-approved run',
    '<%= config.bin %> generate littlefriends --all --provisioning --dry-run   # I01–I09 tier plan (I07 first)',
    '<%= config.bin %> generate littlefriends --doc i07         # a single provisioning artifact',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    doc: Flags.string({
      description: 'Single deliverable id to generate (doc-01 … doc-12, or i01 … i09). Mutually exclusive with --all.',
      exclusive: ['all'],
    }),
    all: Flags.boolean({
      description: 'DAG-batch generation over docs 01–12 (or the --docs subset), gated per tier.',
      default: false,
    }),
    provisioning: Flags.boolean({
      description: 'Scope --all to the I01–I09 provisioning artifacts (M5) instead of docs 01–12. Consumes the generated, approved docs.',
      default: false,
      dependsOn: ['all'],
    }),
    docs: Flags.string({
      description: 'Comma-separated subset for --all (e.g. doc-01,doc-02 or, with --provisioning, i07,i01). Defaults to the full scope.',
      dependsOn: ['all'],
    }),
    from: Flags.string({
      description: 'Resume an --all run at the tier containing this doc id.',
      dependsOn: ['all'],
    }),
    'dry-run': Flags.boolean({
      description: 'Report readiness and assembled prompt sizes (and, with --all, the tier plan) without calling claude.',
      default: false,
    }),
    yes: Flags.boolean({
      description: 'Auto-approve at the Continue gate. Only honored for previously-approved docs/tiers.',
      default: false,
    }),
    model: Flags.string({
      description: 'Model alias for the headless session.',
      default: 'sonnet',
    }),
    jobs: Flags.integer({
      description:
        'Generate each DAG tier across up to N parallel git worktrees (local data source only). Default 1 = the proven sequential path. Docs in a tier write uniquely-named files, so worktrees merge without conflict before the per-tier gate.',
      default: 1,
      dependsOn: ['all'],
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Generate);
    const ds = resolveClientDataSourceOrFail((m) => this.error(m));

    if (flags.all) {
      await this.runAll(args.slug, flags, ds);
      return;
    }

    if (!flags.doc) this.error('Specify --doc <id> for a single document, or --all for batch generation.');

    const outcome = await runGenerate(
      { slug: args.slug, id: flags.doc as DeliverableId, dryRun: flags['dry-run'], yes: flags.yes, model: flags.model },
      this.makeDeps(ds, () => this.askApprove(flags.doc as string)),
    );
    if (outcome.exitCode !== 0) this.exit(outcome.exitCode);
  }

  /** `--all`: plan the DAG, then (unless --dry-run) generate tier by tier with a per-tier gate. */
  private async runAll(slug: string, flags: AllFlags, ds: ClientDataSource): Promise<void> {
    const profile = await readProfile(ds, slug);
    if (!profile) this.error(`No profile for "${slug}". Run: upriver profile import ${slug} <file>`);

    const manifest = await readManifest(ds, slug);
    const scopeSet = flags.provisioning ? I_SERIES : ALL_DOCS;
    const scope = flags.docs ? this.parseDocs(flags.docs, scopeSet) : [...scopeSet];

    const plan = planBatch(profile, manifest, scope);
    this.log(renderBatchPlan(plan));
    if (flags.provisioning) this.hintProvisioningDocs(slug, plan);

    const deps = this.makeDeps(ds, async () => false);

    if (flags['dry-run']) {
      for (const tier of plan.tiers) {
        for (const id of tier.docs) {
          this.log('');
          await runGenerate({ slug, id, dryRun: true, yes: false, model: flags.model }, deps);
        }
      }
      return;
    }

    const priorApproved = new Set<DeliverableId>(generatedIds(manifest));
    const startTier = this.resolveStartTier(plan, flags.from);
    const failed = new Set<DeliverableId>();
    const base = { slug, dryRun: false, yes: flags.yes, model: flags.model };
    const runDocs: DocResult[] = [];

    const jobs = Math.max(1, flags.jobs);
    const parallel = jobs > 1 ? this.buildParallelDeps(ds, slug, jobs) : null;
    if (parallel) this.log(`Parallel generation: up to ${parallel.jobs} worktree(s) per tier.`);

    for (let i = startTier; i < plan.tiers.length; i++) {
      const tier = plan.tiers[i] as Tier;
      const tr = parallel
        ? await runTierParallel(tier, base, deps, failed, parallel)
        : await runTier(tier, base, deps, failed);
      runDocs.push(...tr.docs);
      for (const d of tr.failed) failed.add(d);
      for (const d of tr.skipped) failed.add(d);

      this.log('');
      this.log(renderTierReport(tr, aggregateMarkers(tr.docs), aggregateOperatorActions(tr.docs)));

      if (tr.produced.length === 0) {
        this.log(`  Tier ${tier.index}: nothing produced to approve; continuing.`);
        continue;
      }

      const allPrior = tier.docs.every((id) => priorApproved.has(id));
      const decision = resolveGateDecision({
        yes: flags.yes,
        isTty: Boolean(process.stdin.isTTY),
        priorApproved: allPrior,
        gateAuto: process.env.UPRIVER_GATE_AUTO === '1',
      });
      let approve = false;
      switch (decision) {
        case 'auto-approve':
          approve = true;
          this.log(`Auto-approved tier ${tier.index} (--yes; every doc was previously approved).`);
          break;
        case 'auto-approve-gate':
          approve = true;
          this.log('[gate] AUTO-APPROVED (UPRIVER_GATE_AUTO) — unattended/synthetic runs only.');
          break;
        case 'refuse-yes':
          this.log(`Refusing --yes on tier ${tier.index}: it has a never-approved doc. Review the docs and approve interactively.`);
          break;
        case 'skip-non-tty':
          this.log(`Not a TTY; generated tier ${tier.index} and left it unapproved. Re-run in a terminal to approve at the gate.`);
          break;
        case 'prompt':
          approve = await this.askApproveTier(tier);
          break;
      }

      if (!approve) {
        this.log(
          `Stopped before approving tier ${tier.index}. Review the docs, then resume: upriver generate ${slug} --all --from ${tier.docs[0]}`,
        );
        return;
      }

      let m = await readManifest(ds, slug);
      for (const id of tr.produced) m = setApproved(m, id, true);
      await writeManifest(ds, slug, m);

      const paths = tr.docs.filter((d) => tr.produced.includes(d.id) && d.docPath).map((d) => d.docPath as string);
      const unblocks = tierUnblocks(plan, tier);
      if (unblocks.length > 0) this.log(`  approving tier ${tier.index} unblocks: ${unblocks.join(', ')}`);
      this.log('  snapshot this approved tier in git (local data source):');
      this.log(`    ${commitCommand(slug, tier, paths)}`);
    }

    const checklist = renderOperatorChecklist(
      aggregateOperatorActions(runDocs),
      'Operator must do (this run, cannot be generated)',
    );
    if (checklist.length > 0) {
      this.log('');
      for (const line of checklist) this.log(line);
    }
    this.log('All tiers processed.');
  }

  /** When provisioning blocks on docs that aren't generated/approved yet, point the operator at `--all` first. */
  private hintProvisioningDocs(slug: string, plan: ReturnType<typeof planBatch>): void {
    const needsDocs = plan.blocked.some((b) =>
      b.blockingDocs.some((d) => d.kind === 'unapproved-out-of-scope' && d.id.startsWith('doc-')),
    );
    if (needsDocs) {
      this.log('');
      this.log(`  hint: provisioning consumes generated docs. Generate and approve them first: upriver generate ${slug} --all`);
    }
  }

  private parseDocs(raw: string, scopeSet: readonly DeliverableId[]): DeliverableId[] {
    const ids = raw.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean) as DeliverableId[];
    if (ids.length === 0) this.error('--docs was empty. Pass a comma-separated list like doc-01,doc-02.');
    const bad = ids.filter((id) => !scopeSet.includes(id));
    if (bad.length > 0) {
      this.error(`--docs includes ids outside the active scope: ${bad.join(', ')}. Valid: ${scopeSet.join(', ')}.`);
    }
    return ids;
  }

  private resolveStartTier(plan: ReturnType<typeof planBatch>, from: string | undefined): number {
    if (!from) return 0;
    const id = from.trim().toLowerCase() as DeliverableId;
    const idx = tierIndexOf(plan, id);
    if (idx < 0) {
      this.error(`--from ${from} is not in an eligible tier (it is blocked or out of scope). See the plan above.`);
    }
    return idx;
  }

  /**
   * Wire the `--jobs` parallel seam: one git worktree per doc, each backed by a
   * `LocalFsClientDataSource` rooted at the worktree's `clients/`, seeded from
   * the operator's tree. Worktrees only make sense for the local data source
   * (the git-tracked `clients/` tree); for supabase or outside a repo, fall back
   * to the proven sequential path with a warning rather than failing.
   */
  private buildParallelDeps(ds: ClientDataSource, slug: string, jobs: number): ParallelTierDeps | null {
    if (ds.kind !== 'local') {
      this.warn(`--jobs ${jobs}: parallel tiers use git worktrees, which need the local data source (UPRIVER_DATA_SOURCE=local). Running sequentially.`);
      return null;
    }
    const repoRoot = resolveGitRepoRoot();
    if (!repoRoot) {
      this.warn(`--jobs ${jobs}: not inside a git repository, so worktrees are unavailable. Running sequentially.`);
      return null;
    }
    const provider = gitWorktreeProvider(repoRoot);
    return {
      jobs,
      acquire: async (key) => {
        const handle = await provider.create(key);
        const worktreeDs = new LocalFsClientDataSource({ baseDir: join(handle.path, 'clients') });
        return {
          ds: worktreeDs,
          seed: () => seedClientTree(ds, worktreeDs, slug),
          release: () => handle.remove(),
        };
      },
    };
  }

  private makeDeps(ds: ClientDataSource, promptApprove: () => Promise<boolean>): GenerateDeps {
    return {
      ds,
      call: claudeCliCall,
      log: (msg) => this.log(msg),
      isTty: Boolean(process.stdin.isTTY),
      promptApprove,
      now: () => new Date().toISOString(),
    };
  }

  private async askApprove(id: string): Promise<boolean> {
    return this.confirm(`Approve ${id}? [y/N] `);
  }

  private async askApproveTier(tier: Tier): Promise<boolean> {
    return this.confirm(`Approve tier ${tier.index} (${tier.docs.join(', ')})? [y/N] `);
  }

  private async confirm(prompt: string): Promise<boolean> {
    const rl = createInterface({ input: process.stdin, output: process.stdout });
    try {
      const answer = (await rl.question(prompt)).trim().toLowerCase();
      return answer === 'y' || answer === 'yes';
    } finally {
      rl.close();
    }
  }
}
