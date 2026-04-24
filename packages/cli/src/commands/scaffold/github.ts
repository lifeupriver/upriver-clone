import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { updateClientConfig } from '@upriver/core';
import { resolveScaffoldPaths } from '../../scaffold/template-writer.js';

const ORG = 'lifeupriver';

export default class ScaffoldGithub extends BaseCommand {
  static override description = 'Create GitHub repo and push scaffolded code (dry-run by default)';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    commit: Flags.boolean({ description: 'Execute — without this flag only prints what would happen' }),
    private: Flags.boolean({ description: 'Create the repo as private', default: true }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ScaffoldGithub);
    const { slug } = args;
    const { repoDir } = resolveScaffoldPaths(slug);
    const repoName = slug;
    const fullName = `${ORG}/${repoName}`;
    const remote = `https://github.com/${fullName}.git`;

    if (!existsSync(repoDir)) this.error(`Scaffolded repo not found at ${repoDir}. Run "upriver scaffold ${slug}" first.`);

    if (!flags.commit) {
      this.log('\n[dry-run] upriver scaffold github would:');
      this.log(`  1. Create GitHub repo ${fullName} (private=${flags.private}) via https://api.github.com/orgs/${ORG}/repos`);
      this.log(`  2. cd ${repoDir} && git init && git add . && git commit -m "Initial scaffold"`);
      this.log(`  3. git remote add origin ${remote}`);
      this.log(`  4. git push -u origin main`);
      this.log('\nRun with --commit to execute. Requires GITHUB_TOKEN env var.');
      return;
    }

    const token = this.requireEnv('GITHUB_TOKEN');

    this.log(`\nCreating GitHub repo ${fullName}...`);
    const created = await createRepo(token, ORG, repoName, flags.private);
    if (created.alreadyExists) {
      this.log(`  Repo already exists at ${created.htmlUrl}.`);
    } else {
      this.log(`  Created ${created.htmlUrl}`);
    }

    this.log(`Initializing git in ${repoDir}...`);
    initAndPush(repoDir, remote, token);

    updateClientConfig(slug, { github_repo: fullName });
    this.log(`\nDone. Repo: ${created.htmlUrl}`);
  }
}

interface CreatedRepo {
  htmlUrl: string;
  alreadyExists: boolean;
}

async function createRepo(
  token: string,
  org: string,
  name: string,
  isPrivate: boolean,
): Promise<CreatedRepo> {
  const res = await fetch(`https://api.github.com/orgs/${org}/repos`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name,
      private: isPrivate,
      auto_init: false,
      description: `Upriver-generated site for ${name}`,
    }),
  });

  if (res.status === 201) {
    const data = (await res.json()) as { html_url: string };
    return { htmlUrl: data.html_url, alreadyExists: false };
  }
  if (res.status === 422) {
    return { htmlUrl: `https://github.com/${org}/${name}`, alreadyExists: true };
  }
  const text = await res.text();
  throw new Error(`GitHub create repo failed (${res.status}): ${text}`);
}

function initAndPush(repoDir: string, remote: string, token: string): void {
  const sh = (cmd: string) =>
    execSync(cmd, { cwd: repoDir, stdio: 'inherit', env: { ...process.env } });

  if (!existsSync(`${repoDir}/.git`)) {
    sh('git init -b main');
  }
  sh('git add .');
  try {
    sh('git commit -m "Initial scaffold from upriver"');
  } catch {
    // nothing to commit
  }
  // Configure authenticated remote
  try {
    sh('git remote remove origin');
  } catch {
    // ignore
  }
  const authUrl = remote.replace('https://', `https://x-access-token:${token}@`);
  sh(`git remote add origin ${authUrl}`);
  sh('git push -u origin main');
}
