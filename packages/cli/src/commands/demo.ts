import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

import { Args, Flags } from '@oclif/core';
import { clientDir } from '@upriver/core';

import { BaseCommand } from '../base-command.js';

export default class Demo extends BaseCommand {
  static override description =
    'One-shot demo: take a URL and run init → run all → sync push end-to-end. Slug and name auto-derived from the hostname.';

  static override examples = [
    '<%= config.bin %> demo https://audreysfarmhouse.com',
    '<%= config.bin %> demo https://audreysfarmhouse.com --audit-mode all',
    '<%= config.bin %> demo https://audreysfarmhouse.com --slug audreys --name "Audrey\'s Farmhouse"',
    '<%= config.bin %> demo https://audreysfarmhouse.com --skip-sync',
  ];

  static override args = {
    url: Args.string({ description: 'The site URL to demo against', required: true }),
  };

  static override flags = {
    slug: Flags.string({
      description: 'Override auto-derived slug. Defaults to the hostname (sans TLD, kebab-cased).',
    }),
    name: Flags.string({
      description: 'Override auto-derived display name. Defaults to title-cased hostname root.',
    }),
    vertical: Flags.string({
      description: 'Industry vertical for tuned audit heuristics.',
      options: ['wedding-venue', 'preschool', 'restaurant', 'professional-services', 'generic'],
      default: 'generic',
    }),
    'audit-mode': Flags.string({
      description: 'Audit depth: base | deep | tooling | all. Default base for speed.',
      options: ['base', 'deep', 'tooling', 'all'],
      default: 'base',
    }),
    'skip-sync': Flags.boolean({
      description: "Don't push artifacts to Supabase after the pipeline completes.",
      default: false,
    }),
    'skip-compress': Flags.boolean({
      description: "Don't recompress screenshots to AVIF before sync push.",
      default: false,
    }),
    'continue-on-error': Flags.boolean({
      description: 'Keep going through optional-stage failures.',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Demo);
    const { url } = args;

    const { slug, name } = deriveIdentity(url, flags.slug, flags.name);
    const base = process.env['UPRIVER_CLIENTS_DIR'] ?? './clients';
    const dir = clientDir(slug, base);

    const binPath = process.argv[1];
    if (!binPath) this.error('Cannot determine upriver bin path from process.argv[1].');

    this.log(`\n=== upriver demo ===`);
    this.log(`URL:    ${url}`);
    this.log(`Slug:   ${slug}`);
    this.log(`Name:   ${name}`);
    this.log(`Mode:   ${flags['audit-mode']}`);
    this.log(`Compress: ${flags['skip-compress'] ? 'skipped' : 'enabled'}`);
    this.log(`Sync:   ${flags['skip-sync'] ? 'skipped' : 'enabled'}`);
    this.log('');

    const startedAt = Date.now();

    if (existsSync(dir)) {
      this.log(`[1/3] init — clients/${slug}/ exists, skipping init.`);
    } else {
      this.log(`[1/3] init — bootstrapping clients/${slug}/`);
      const initArgs = [
        binPath,
        'init',
        url,
        '--slug',
        slug,
        '--name',
        name,
        '--vertical',
        flags.vertical ?? 'generic',
      ];
      const code = await runChild(initArgs);
      if (code !== 0) this.error(`init failed (exit ${code}). Aborting demo.`);
    }

    this.log(`\n[2/3] run all — orchestrating pipeline (audit-mode=${flags['audit-mode']})`);
    const runArgs = [binPath, 'run', 'all', slug, '--audit-mode', flags['audit-mode'] ?? 'base'];
    if (flags['continue-on-error']) runArgs.push('--continue-on-error');
    const runCode = await runChild(runArgs);
    if (runCode !== 0 && !flags['continue-on-error']) {
      this.error(`run all failed (exit ${runCode}). Re-run with --from=<stage> to resume.`);
    }

    if (!flags['skip-compress']) {
      this.log(`\n[3/4] compress-images — transcoding PNG/JPG to AVIF`);
      const compressCode = await runChild([binPath, 'compress-images', slug, '--replace']);
      if (compressCode !== 0) this.warn(`compress-images exited ${compressCode}. Continuing with originals.`);
    } else {
      this.log(`\n[3/4] compress-images — skipped (--skip-compress)`);
    }

    if (!flags['skip-sync']) {
      this.log(`\n[4/4] sync push — uploading artifacts to Supabase (excluding repo, clone-compare)`);
      const syncCode = await runChild([
        binPath,
        'sync',
        'push',
        slug,
        '--exclude',
        'repo',
        '--exclude',
        'clone-compare',
      ]);
      if (syncCode !== 0) this.warn(`sync push exited ${syncCode}. Artifacts are still local in clients/${slug}/.`);
    } else {
      this.log(`\n[4/4] sync push — skipped (--skip-sync)`);
    }

    const totalElapsed = ((Date.now() - startedAt) / 1000).toFixed(1);
    this.log(`\n=== demo complete in ${totalElapsed}s ===`);
    this.log(`\nLocal artifacts: clients/${slug}/`);
    if (!flags['skip-sync']) {
      const dashboardUrl = process.env['UPRIVER_DASHBOARD_URL'] ?? 'https://upriver-platform.vercel.app';
      this.log(`Dashboard:       ${dashboardUrl}/clients/${slug}`);
      this.log(`Mint share link: ${dashboardUrl}/clients/${slug}/share`);
    }
  }
}

/** Derive (slug, name) from a URL. Slug = hostname root, kebab-cased. */
function deriveIdentity(
  url: string,
  slugOverride?: string,
  nameOverride?: string,
): { slug: string; name: string } {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`Invalid URL: ${url}`);
  }
  const stripped = host.replace(/^www\./, '');
  const root = stripped.split('.')[0] ?? stripped;
  const derivedSlug =
    root
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .replace(/-{2,}/g, '-') || 'demo';
  const slug = slugOverride ?? derivedSlug;
  const name = nameOverride ?? root.charAt(0).toUpperCase() + root.slice(1);
  return { slug, name };
}

function runChild(argv: string[]): Promise<number> {
  return new Promise((resolveP) => {
    const child = spawn(process.execPath, argv, { stdio: 'inherit', env: { ...process.env } });
    child.on('exit', (code) => resolveP(typeof code === 'number' ? code : 1));
    child.on('error', () => resolveP(1));
  });
}
