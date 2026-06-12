import { spawn } from 'node:child_process';
import { Args, Flags } from '@oclif/core';
import { parse as parseYaml, stringify as stringifyYaml } from 'yaml';

import { clientDir, type ClientConfig } from '@upriver/core';

import { BaseCommand } from '../../base-command.js';
import { resolveClientDataSourceOrFail } from '../../generate/data-source.js';
import { resolveScaffoldPaths } from '../../scaffold/template-writer.js';
import { domainToSlug } from '../../util/domain-slug.js';
import { fidelityGate } from '../../clone/hardening.js';
import { buildInterviewUrl, loadOrCreateInterviewShare } from '../../interview/share.js';
import { buildPitchEmailDraft } from '../../pitch/email.js';
import {
  addSpend,
  estimateStepUsd,
  estimateTable,
  PITCH_MAX_SPEND_USD_DEFAULT,
  wouldExceed,
} from '../../pitch/ledger.js';
import { buildPitchSteps, checkClobberGuard, seedProspectProfile, type PitchStepDef } from '../../pitch/run-core.js';
import { buildProspectInterviewGuide } from '../../pitch/interview-guide.js';
import {
  buildPitchPortalUrl,
  mintPitchShare,
  PITCH_SHARE_DEFAULT_DAYS,
  PITCH_SHARE_PATH,
} from '../../pitch/share.js';
import {
  createPitchState,
  readPitchState,
  recordStep,
  transition,
  writePitchState,
  type PitchState,
} from '../../pitch/state.js';
import type { FidelitySummary } from '../../clone-qa/fidelity-scorer.js';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

/** Distinct exit codes so unattended callers can tell the clean aborts apart. */
const EXIT_OVER_BUDGET = 21;
const EXIT_FIDELITY = 22;

export default class PitchRun extends BaseCommand {
  static override description =
    'Run the full pitch pipeline against a prospect URL: homepage-only clone, teaser docs, questionnaire link, expiring preview token, and a DRAFT outreach email. Nothing is ever sent from this command (see: pitch approve). Spend is ceiling-checked in code before every costed step.';

  static override examples = [
    '<%= config.bin %> pitch run https://wildflourbakery.com --dry-run',
    '<%= config.bin %> pitch run https://wildflourbakery.com --vertical restaurant',
    '<%= config.bin %> pitch run https://wildflourbakery.com --from clone   # resume',
  ];

  static override args = {
    url: Args.string({ description: "The prospect's website URL", required: true }),
  };

  static override flags = {
    slug: Flags.string({ description: 'Override the derived client slug.' }),
    name: Flags.string({ description: 'Business display name (defaults to the slug).' }),
    vertical: Flags.string({
      description: 'Business vertical for vertical-aware teaser framing.',
    }),
    'max-spend-usd': Flags.integer({
      description: 'Per-prospect spend ceiling, enforced BEFORE each costed step.',
      default: PITCH_MAX_SPEND_USD_DEFAULT,
    }),
    'expires-days': Flags.integer({
      description: 'Preview share expiry in days (capped at 30).',
      default: PITCH_SHARE_DEFAULT_DAYS,
    }),
    'base-url': Flags.string({
      description:
        'Public dashboard origin for the preview/questionnaire links. Defaults to UPRIVER_DASHBOARD_BASE_URL or http://localhost:4400.',
    }),
    'force-prospect': Flags.boolean({
      description: 'Override the never-clobber-a-client guard. Be certain.',
      default: false,
    }),
    from: Flags.string({ description: 'Resume from a step id (see --dry-run for the list).' }),
    'dry-run': Flags.boolean({
      description: 'Print the step plan and the cost-estimate table; run nothing (keyless, offline).',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(PitchRun);
    const url = args.url;

    let slug: string;
    try {
      slug = flags.slug ?? domainToSlug(url);
    } catch (err) {
      this.error((err as Error).message, { exit: 2 });
    }

    const ceiling = flags['max-spend-usd'];
    let steps = buildPitchSteps(url, slug);
    if (flags.from) {
      const idx = steps.findIndex((s) => s.id === flags.from);
      if (idx < 0) {
        this.error(`--from must be one of: ${steps.map((s) => s.id).join(', ')}`, { exit: 2 });
      }
      steps = steps.slice(idx);
    }

    if (flags['dry-run']) {
      this.log(`\npitch run ${url} → clients/${slug}/ (stage: prospect)\n`);
      this.log('Steps:');
      for (const s of steps) {
        this.log(`  - ${s.id.padEnd(14)} ${s.costed ? `[costed: ${s.costed}]`.padEnd(22) : ''.padEnd(22)} ${s.describe}`);
      }
      const est = estimateTable(ceiling);
      this.log('\nCost estimate (full pipeline):');
      for (const row of est.steps) {
        this.log(
          `  ${row.step.padEnd(12)} ~${row.firecrawlCredits} credits, ~${row.agentSeconds}s agent  ≈ $${row.usd.toFixed(2)}`,
        );
      }
      this.log(`  total ≈ $${est.totalUsd.toFixed(2)} vs ceiling $${est.ceilingUsd.toFixed(2)} — ${est.fitsCeiling ? 'OK' : 'OVER'}`);
      this.log('\nArtifacts: pitch/preview/index.html, docs/doc-pitch-0[1-4]-*.md, interview-guide.md, pitch/share.json, pitch/email-draft.json, pitch/state.json');
      this.log('Nothing was executed (--dry-run).');
      return;
    }

    const ds = resolveClientDataSourceOrFail((m) => this.error(m));
    const guard = await checkClobberGuard(ds, slug, flags['force-prospect']);
    if (guard) this.error(guard, { exit: 2 });

    const dir = clientDir(slug);
    let state: PitchState;
    try {
      state = readPitchState(dir);
      if (state.status === 'fidelity-fail' || state.status === 'over-budget' || state.status === 'revoked') {
        state = transition(state, 'draft');
      }
    } catch {
      state = createPitchState(slug, url);
    }

    const binPath = process.argv[1];
    if (!binPath) this.error('Cannot determine the upriver bin path.', { exit: 2 });
    const baseUrl =
      flags['base-url'] ?? process.env['UPRIVER_DASHBOARD_BASE_URL'] ?? 'http://localhost:4400';

    for (const step of steps) {
      if (step.costed && wouldExceed(state.ledger, step.costed, ceiling)) {
        state = transition(recordStep(state, step.id, false, 'over budget — step not taken'), 'over-budget');
        writePitchState(dir, state);
        this.error(
          `spend ceiling: taking "${step.id}" (est. next: ${step.costed}) would exceed $${ceiling} — aborting BEFORE the spend. Re-run with a higher --max-spend-usd to continue.`,
          { exit: EXIT_OVER_BUDGET },
        );
      }

      this.log(`\n──────── pitch ${slug}: ${step.id} — ${step.describe}`);
      try {
        await this.execStep(step, { slug, url, binPath, baseUrl, ds, dir, flags });
      } catch (err) {
        state = recordStep(state, step.id, false, (err as Error).message);
        writePitchState(dir, state);
        this.error(`step "${step.id}" failed: ${(err as Error).message}`, { exit: 1 });
      }

      state = recordStep(state, step.id, true);
      // Estimates stand in for actuals on the ledger (honest approximation —
      // recorded as such in the spec changelog).
      if (step.costed) {
        state = { ...state, ledger: addSpend(state.ledger, { estUsd: estimateStepUsd(step.costed) }) };
      }

      // The fidelity gate runs between scoring and anything prospect-facing.
      if (step.id === 'fidelity') {
        const gate = this.runFidelityGate(dir);
        if (!gate.pass) {
          state = transition(recordStep(state, 'fidelity-gate', false, gate.reason), 'fidelity-fail');
          writePitchState(dir, state);
          this.error(
            `fidelity gate: ${gate.reason} — nothing staged; inspect the clone (worktree preserved on failure) and re-run with --from clone.`,
            { exit: EXIT_FIDELITY },
          );
        }
        state = recordStep(state, 'fidelity-gate', true, `score ${gate.score}`);
      }
      writePitchState(dir, state);
    }

    writePitchState(dir, state);
    this.log(`\n✓ pitch bundle drafted for ${slug} (est. spend ≈ $${state.ledger.estUsd.toFixed(2)})`);
    this.log(`  Review the teasers in clients/${slug}/docs/ and the email in clients/${slug}/pitch/email-draft.json`);
    this.log(`  Send it (after review): upriver pitch approve ${slug}`);
  }

  private runFidelityGate(dir: string): ReturnType<typeof fidelityGate> {
    const path = join(dir, 'clone-qa', 'summary.json');
    let summary: FidelitySummary | null = null;
    if (existsSync(path)) {
      try {
        summary = JSON.parse(readFileSync(path, 'utf8')) as FidelitySummary;
      } catch {
        summary = null;
      }
    }
    return fidelityGate(summary, 'home');
  }

  private async execStep(
    step: PitchStepDef,
    ctx: {
      slug: string;
      url: string;
      binPath: string;
      baseUrl: string;
      ds: ReturnType<typeof resolveClientDataSourceOrFail>;
      dir: string;
      flags: { name?: string | undefined; vertical?: string | undefined; 'expires-days': number };
    },
  ): Promise<void> {
    const { slug, url, binPath, baseUrl, ds, dir, flags } = ctx;

    if (step.kind === 'cli') {
      let argv = step.argv ?? [];
      if (step.id === 'init') {
        // Idempotent resume: skip init when the dir already exists.
        if ((await ds.readClientFileText(slug, 'client-config.yaml')) !== null) {
          this.log('  client dir exists — skipping init');
          return;
        }
        if (flags.name) argv = [...argv, '--name', flags.name];
        if (flags.vertical) argv = [...argv, '--vertical', flags.vertical];
      }
      const code = await runChild([binPath, ...argv]);
      if (code !== 0) throw new Error(`upriver ${argv.join(' ')} exited ${code}`);
      if (step.id === 'init') await this.markProspect(ds, slug);
      return;
    }

    if (step.kind === 'pnpm') {
      const { repoDir } = resolveScaffoldPaths(slug);
      const code = await runChildCmd('pnpm', step.argv ?? [], repoDir);
      if (code !== 0) throw new Error(`pnpm ${step.argv?.join(' ')} exited ${code} in ${repoDir}`);
      return;
    }

    // internal steps
    if (step.id === 'profile-seed') {
      const name = flags.name ?? (await this.configName(ds, slug)) ?? slug;
      const created = await seedProspectProfile(ds, slug, {
        name,
        url,
        ...(flags.vertical ? { vertical: flags.vertical } : {}),
      });
      this.log(created ? '  minimal recon-sourced profile seeded' : '  profile exists — left untouched');
      return;
    }
    if (step.id === 'stage') {
      const { stagePreview } = await import('../../pitch/stage-preview.js');
      const { repoDir } = resolveScaffoldPaths(slug);
      const out = stagePreview(dir, repoDir);
      this.log(`  staged self-contained preview → ${out}`);
      return;
    }
    if (step.id === 'questionnaire') {
      const name = flags.name ?? (await this.configName(ds, slug)) ?? slug;
      await ds.writeClientFile(slug, 'interview-guide.md', buildProspectInterviewGuide(name));
      const share = loadOrCreateInterviewShare(slug, baseUrl);
      this.log(`  questionnaire link: ${buildInterviewUrl(slug, share)}`);
      return;
    }
    if (step.id === 'share') {
      const share = mintPitchShare({ expiresDays: flags['expires-days'] });
      await ds.writeClientFile(slug, PITCH_SHARE_PATH, `${JSON.stringify(share, null, 2)}\n`);
      this.log(`  preview link (token shown once): ${buildPitchPortalUrl(baseUrl, slug, share.token)}`);
      this.log(`  expires: ${share.expiresAt}`);
      return;
    }
    if (step.id === 'email') {
      const name = flags.name ?? (await this.configName(ds, slug)) ?? slug;
      const shareRaw = await ds.readClientFileText(slug, PITCH_SHARE_PATH);
      const share = shareRaw ? (JSON.parse(shareRaw) as { token: string }) : null;
      if (!share) throw new Error('no pitch share token — the share step must run first');
      const interviewShare = loadOrCreateInterviewShare(slug, baseUrl);
      const draft = buildPitchEmailDraft({
        businessName: name,
        previewUrl: buildPitchPortalUrl(baseUrl, slug, share.token),
        questionnaireUrl: buildInterviewUrl(slug, interviewShare),
      });
      await ds.writeClientFile(slug, 'pitch/email-draft.json', `${JSON.stringify(draft, null, 2)}\n`);
      this.log('  email drafted (NOT sent) → pitch/email-draft.json');
      return;
    }
    throw new Error(`unknown internal step "${step.id}"`);
  }

  private async configName(ds: ReturnType<typeof resolveClientDataSourceOrFail>, slug: string): Promise<string | null> {
    const raw = await ds.readClientFileText(slug, 'client-config.yaml');
    if (!raw) return null;
    try {
      return (parseYaml(raw) as ClientConfig).name ?? null;
    } catch {
      return null;
    }
  }

  private async markProspect(ds: ReturnType<typeof resolveClientDataSourceOrFail>, slug: string): Promise<void> {
    const raw = await ds.readClientFileText(slug, 'client-config.yaml');
    if (!raw) return;
    const config = parseYaml(raw) as ClientConfig;
    if (config.stage === 'prospect') return;
    await ds.writeClientFile(slug, 'client-config.yaml', stringifyYaml({ ...config, stage: 'prospect' }));
    this.log('  client-config.yaml marked stage: prospect');
  }
}

function runChild(argv: string[]): Promise<number> {
  return runChildCmd(process.execPath, argv);
}

function runChildCmd(cmd: string, argv: string[], cwd?: string): Promise<number> {
  return new Promise((resolveP) => {
    const child = spawn(cmd, argv, {
      stdio: 'inherit',
      env: { ...process.env, UPRIVER_GATE_AUTO: '1' },
      ...(cwd ? { cwd } : {}),
    });
    child.on('exit', (code) => resolveP(typeof code === 'number' ? code : 1));
    child.on('error', () => resolveP(1));
  });
}
