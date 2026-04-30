import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { Args, Flags } from '@oclif/core';

import { clientDir, readClientConfig } from '@upriver/core';

import { BaseCommand } from '../base-command.js';
import { readState, writeState } from '../admin/state.js';

export default class AdminDeploy extends BaseCommand {
  static override description =
    'F05 — set up the natural-language admin for a client. Copies issue templates, label manifest, and the optional Vercel form into clients/<slug>/admin/. Optionally invokes `gh` and `vercel` to apply them remotely.';

  static override examples = [
    '<%= config.bin %> admin-deploy littlefriends --repo=lifeupriver/littlefriends-site --client-form=true',
    '<%= config.bin %> admin-deploy audreys --repo=lifeupriver/audreys-site --no-deploy',
  ];

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    repo: Flags.string({
      description: 'GitHub repo for the client site, format owner/repo. Required.',
      required: true,
    }),
    'client-form': Flags.string({
      description: 'Whether to set up the Vercel client form. true=copy template into admin/form/.',
      options: ['true', 'false'],
      default: 'true',
    }),
    'form-domain': Flags.string({
      description: 'Custom subdomain for the form deploy. Documented in admin/OPERATOR_GUIDE.md.',
    }),
    'form-pin': Flags.string({
      description: '6-digit PIN to require on the form. Random PIN generated when omitted.',
    }),
    'no-deploy': Flags.boolean({
      description: 'Build local files only; do not invoke gh/vercel.',
      default: false,
    }),
    force: Flags.boolean({ description: 'Overwrite existing admin files.', default: false }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(AdminDeploy);
    const { slug } = args;
    const dir = clientDir(slug);
    if (!existsSync(dir)) this.error(`Client directory not found: ${dir}`);

    const config = readClientConfig(slug);
    const adminDir = join(dir, 'admin');
    if (existsSync(adminDir) && !flags.force) {
      this.error(`Admin already deployed at ${adminDir}. Pass --force to regenerate.`);
    }
    mkdirSync(adminDir, { recursive: true });

    const templateDir = resolveTemplateDir();
    if (!existsSync(templateDir)) {
      this.error(`Admin template not found at ${templateDir}.`);
    }

    const pin = flags['form-pin'] ?? generatePin();
    const replacements: Record<string, string> = {
      APP_SLUG: slug,
      CLIENT_NAME: config.name ?? slug,
      GITHUB_REPO: flags.repo,
      FORM_PIN: pin,
    };

    // Copy GitHub assets to admin/.github/ (operator commits these to the repo).
    const ghSrc = join(templateDir, 'github');
    const ghDest = join(adminDir, '.github');
    copyTreeWithSubst(ghSrc, ghDest, replacements);

    // Copy Vercel form to admin/form/ if requested.
    if (flags['client-form'] === 'true') {
      const formSrc = join(templateDir, 'form');
      const formDest = join(adminDir, 'form');
      copyTreeWithSubst(formSrc, formDest, replacements);
      // Write per-client .env (PIN hash placeholder). The operator hashes on first deploy.
      const lines = [
        `# Operator: copy to .env.local on the Vercel deployment.`,
        `GITHUB_REPO_TARGET=${flags.repo}`,
        `# Set GITHUB_PAT to a fine-grained PAT with Issues: read+write on this repo.`,
        `GITHUB_PAT=`,
        `# PIN hashing: pnpm dlx bcryptjs-cli hash "${pin}"`,
        `FORM_PIN_HASH=`,
        `NEXT_PUBLIC_CLIENT_NAME=${config.name ?? slug}`,
        `NEXT_PUBLIC_PIN_REQUIRED=${flags['form-pin'] !== undefined ? 'true' : 'false'}`,
        ``,
      ];
      writeFileSync(join(formDest, '.env.local.example'), lines.join('\n'), 'utf8');
    }

    // Operator + client guides.
    writeFileSync(
      join(adminDir, 'OPERATOR_GUIDE.md'),
      renderOperatorGuide(slug, flags.repo, pin, flags['client-form'] === 'true', flags['form-domain']),
      'utf8',
    );
    writeFileSync(
      join(adminDir, 'CLIENT_GUIDE.md'),
      renderClientGuide(config.name ?? slug, flags['client-form'] === 'true'),
      'utf8',
    );

    // Persist state.
    const state = readState(dir, slug);
    state.github_repo = flags.repo;
    state.form_pin_set = flags['client-form'] === 'true';
    state.deployed_at = new Date().toISOString();
    state.paused = false;
    writeState(dir, state);

    this.log('');
    this.log(`Wrote admin scaffolding to ${adminDir}/`);
    this.log(`  GitHub assets to commit: ${join(adminDir, '.github')}/`);
    if (flags['client-form'] === 'true') {
      this.log(`  Vercel form template: ${join(adminDir, 'form')}/`);
      this.log(`  Form PIN: ${pin}  (operator: hash this and set FORM_PIN_HASH on Vercel)`);
    }
    this.log('');

    if (!flags['no-deploy']) {
      this.applyRemote();
    } else {
      this.log('--no-deploy passed; remote setup skipped. Run the gh commands in OPERATOR_GUIDE.md when ready.');
    }
  }

  private applyRemote(): void {
    const ghAvailable = spawnSync('gh', ['--version'], { stdio: 'ignore' }).status === 0;
    if (!ghAvailable) {
      this.warn('`gh` CLI not on PATH; skipping label/template push. See OPERATOR_GUIDE.md for manual steps.');
      return;
    }
    this.log('`gh` CLI detected. Operator should run the commands in OPERATOR_GUIDE.md to push labels and issue templates to the repo. Skipping automatic push to avoid surprising actions on the production repo.');
  }
}

function resolveTemplateDir(): string {
  const here = dirname(fileURLToPath(import.meta.url));
  return join(here, '..', '..', '..', 'admin-template', 'template');
}

function copyTreeWithSubst(srcDir: string, destDir: string, replacements: Record<string, string>): void {
  if (!existsSync(srcDir)) return;
  mkdirSync(destDir, { recursive: true });
  for (const entry of readdirSync(srcDir)) {
    const src = join(srcDir, entry);
    const dest = join(destDir, entry);
    if (statSync(src).isDirectory()) {
      copyTreeWithSubst(src, dest, replacements);
      continue;
    }
    if (/\.(png|jpg|jpeg|webp|ico|woff2?)$/i.test(entry)) {
      copyFileSync(src, dest);
      continue;
    }
    const raw = readFileSync(src, 'utf8');
    const out = raw.replace(/\{\{([A-Z_]+)\}\}/g, (m, key) => replacements[key] ?? m);
    writeFileSync(dest, out, 'utf8');
  }
}

function generatePin(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += String(Math.floor(Math.random() * 10));
  return s;
}

function renderOperatorGuide(
  slug: string,
  repo: string,
  pin: string,
  formEnabled: boolean,
  formDomain: string | undefined,
): string {
  const sections: string[] = [];
  sections.push(`# Admin operator guide: ${slug}`);
  sections.push('');
  sections.push('## What got generated');
  sections.push('');
  sections.push('This directory contains everything you need to wire the natural-language admin for ' + slug + ':');
  sections.push('');
  sections.push('- `.github/ISSUE_TEMPLATE/change-request.yml` — GitHub issue template');
  sections.push('- `.github/labels.json` — labels the bot expects');
  if (formEnabled) sections.push('- `form/` — Next.js single-page client form (deploy to Vercel)');
  sections.push('- `state.json` — local state file the CLI uses');
  sections.push('');
  sections.push('## One-time GitHub setup');
  sections.push('');
  sections.push('From the client site repo:');
  sections.push('');
  sections.push('```bash');
  sections.push('# Copy the issue template into the repo');
  sections.push('mkdir -p .github/ISSUE_TEMPLATE');
  sections.push(`cp $UPRIVER_HOME/clients/${slug}/admin/.github/ISSUE_TEMPLATE/change-request.yml .github/ISSUE_TEMPLATE/`);
  sections.push('');
  sections.push('# Create the labels (one gh label create per entry in labels.json)');
  sections.push(`for row in $(jq -c \\'.[]\\' $UPRIVER_HOME/clients/${slug}/admin/.github/labels.json); do`);
  sections.push('  name=$(echo "$row" | jq -r .name)');
  sections.push('  color=$(echo "$row" | jq -r .color)');
  sections.push('  desc=$(echo "$row" | jq -r .description)');
  sections.push('  gh label create "$name" --color "$color" --description "$desc" --force');
  sections.push('done');
  sections.push('');
  sections.push('# Set up a webhook pointing at your worker');
  sections.push(`gh api repos/${repo}/hooks \\`);
  sections.push(`  -f name=web \\`);
  sections.push(`  -f config[url]=https://YOUR-WORKER-DOMAIN/webhook \\`);
  sections.push(`  -f config[content_type]=json \\`);
  sections.push(`  -f config[secret]="$GITHUB_WEBHOOK_SECRET" \\`);
  sections.push(`  -F events[]=issues -F events[]=issue_comment -F events[]=pull_request`);
  sections.push('');
  sections.push('git add .github && git commit -m "chore: set up Upriver admin (F05)"');
  sections.push('```');
  sections.push('');
  if (formEnabled) {
    sections.push('## One-time Vercel form deploy');
    sections.push('');
    sections.push('```bash');
    sections.push(`cd $UPRIVER_HOME/clients/${slug}/admin/form`);
    sections.push('npm install');
    sections.push('npm run build');
    sections.push('npx vercel --prod');
    sections.push('```');
    sections.push('');
    sections.push('Then on the Vercel project, set environment variables:');
    sections.push('');
    sections.push(`- \`GITHUB_REPO_TARGET=${repo}\``);
    sections.push('- `GITHUB_PAT=<fine-grained PAT, Issues: read+write on the repo>`');
    sections.push('- `FORM_PIN_HASH=<bcrypt hash of the form PIN>`');
    sections.push(`- \`NEXT_PUBLIC_CLIENT_NAME=<display name>\``);
    sections.push('- `NEXT_PUBLIC_PIN_REQUIRED=true`');
    sections.push('');
    sections.push('Hash the PIN locally first:');
    sections.push('');
    sections.push('```bash');
    sections.push(`pnpm dlx bcryptjs-cli hash "${pin}"`);
    sections.push('```');
    sections.push('');
    if (formDomain) sections.push(`Form domain: \`${formDomain}\`.`);
    sections.push('');
  }
  sections.push('## Day-to-day');
  sections.push('');
  sections.push('```bash');
  sections.push(`# Run a change request locally (test without a webhook)`);
  sections.push(`upriver admin-process ${slug} \\`);
  sections.push(`  --repo-dir=PATH-TO-LOCAL-CLONE \\`);
  sections.push(`  --issue-number=42 \\`);
  sections.push(`  --issue-title="..." \\`);
  sections.push(`  --issue-body-file=./issue.md`);
  sections.push('');
  sections.push(`upriver admin-pause ${slug}`);
  sections.push(`upriver admin-status ${slug}`);
  sections.push(`upriver admin-rotate-pin ${slug}`);
  sections.push('```');
  sections.push('');
  sections.push('## What the bot does');
  sections.push('');
  sections.push('When a new issue with the `change-request` label is opened:');
  sections.push('');
  sections.push('1. Webhook handler in your worker fires `runChangeRequest` from `@upriver/cli/admin/processor`.');
  sections.push('2. Processor parses the issue intent (read-only Claude pass) and posts the parsed intent as an issue comment.');
  sections.push('3. Clones the repo to a working dir, opens a branch, runs a write-allowed Claude session that edits files.');
  sections.push('4. Diff goes through a voice-check (banned words, em dashes, required markers).');
  sections.push('5. If voice-check passes, worker commits, pushes, opens a PR with `Closes #<issue>` and the `pending-review` label.');
  sections.push('6. If voice-check fails, `voice-check-failed` label is added; operator reviews before merge.');
  sections.push('7. Asset-required issues get the `awaiting-assets` label; processor resumes when the client adds the missing asset.');
  sections.push('');
  sections.push('## Form PIN');
  sections.push('');
  sections.push(`Current PIN: \`${pin}\`. Hash before storing on Vercel. Rotate via \`upriver admin-rotate-pin ${slug}\` whenever the client asks.`);
  sections.push('');
  return sections.join('\n');
}

function renderClientGuide(clientName: string, formEnabled: boolean): string {
  const lines: string[] = [];
  lines.push(`# How to request changes to the ${clientName} site`);
  lines.push('');
  lines.push('## The short version');
  lines.push('');
  lines.push(
    formEnabled
      ? 'Visit the request form (operator: paste the URL here once you have it). Type what you want changed. We will get to it within a day.'
      : 'Email Upriver with the change you want. We will track it from there.',
  );
  lines.push('');
  lines.push('## What to include');
  lines.push('');
  lines.push('- A sentence about what should change.');
  lines.push('- A note about where on the site, if you know.');
  lines.push('- Photos or files if relevant. Drag and drop into the form, or send links.');
  lines.push('');
  lines.push('## What happens next');
  lines.push('');
  lines.push('Once we get your request, you will see a confirmation. Within a few minutes our system will respond with what we understood. If we got it wrong, just reply with the correction. If we got it right, we make the change and send you a preview link to look at.');
  lines.push('');
  lines.push('## What we will not do automatically');
  lines.push('');
  lines.push('If a change requires us to write something we do not have facts to back up, or to publish a price or a quote we cannot verify, we will pause and ask you. We will never make up facts about your business.');
  lines.push('');
  return lines.join('\n');
}
