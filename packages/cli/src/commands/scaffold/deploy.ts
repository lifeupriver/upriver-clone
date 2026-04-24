import { existsSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Args, Flags } from '@oclif/core';
import { BaseCommand } from '../../base-command.js';
import { readClientConfig, updateClientConfig } from '@upriver/core';
import { resolveScaffoldPaths } from '../../scaffold/template-writer.js';

const VERCEL_API = 'https://api.vercel.com';

export default class ScaffoldDeploy extends BaseCommand {
  static override description = 'Create Vercel project, link to GitHub, deploy preview (dry-run by default)';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    commit: Flags.boolean({ description: 'Execute — without this flag only prints what would happen' }),
    team: Flags.string({ description: 'Vercel team id (optional)', env: 'VERCEL_TEAM_ID' }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(ScaffoldDeploy);
    const { slug } = args;
    const { clientDir, repoDir } = resolveScaffoldPaths(slug);
    if (!existsSync(repoDir)) this.error(`Scaffolded repo not found at ${repoDir}. Run "upriver scaffold ${slug}" first.`);

    const config = readClientConfig(slug);
    const githubRepo = config.github_repo;

    if (!flags.commit) {
      this.log('\n[dry-run] upriver scaffold deploy would:');
      this.log(`  1. POST ${VERCEL_API}/v10/projects to create "${slug}" with framework=astro`);
      if (githubRepo) {
        this.log(`  2. Link to GitHub repo ${githubRepo} via gitRepository={type: github, repo}`);
      } else {
        this.log(`  2. WARNING: client-config.yaml has no github_repo. Run "upriver scaffold github ${slug} --commit" first.`);
      }
      this.log(`  3. Push env vars from ${join(clientDir, '.env.local')} (if it exists) to the project`);
      this.log(`  4. POST ${VERCEL_API}/v13/deployments to trigger first preview deploy`);
      this.log(`  5. Write preview URL to ${join(clientDir, 'vercel-url.txt')}`);
      this.log('\nRun with --commit to execute. Requires VERCEL_TOKEN env var.');
      return;
    }

    const token = this.requireEnv('VERCEL_TOKEN');
    if (!githubRepo) {
      this.error(`No github_repo in client-config.yaml. Run "upriver scaffold github ${slug} --commit" first.`);
    }

    this.log(`\nCreating Vercel project "${slug}"...`);
    const project = await createProject(token, slug, githubRepo, flags.team);
    this.log(`  project id: ${project.id}`);

    const envFile = join(clientDir, '.env.local');
    if (existsSync(envFile)) {
      this.log(`Pushing env vars from ${envFile}...`);
      await pushEnvVars(token, project.id, envFile, flags.team);
    } else {
      this.warn(`No ${envFile} found — skipping env var push.`);
    }

    this.log('Triggering first deployment...');
    const deployment = await createDeployment(token, slug, githubRepo, flags.team);
    const url = `https://${deployment.url}`;
    writeFileSync(join(clientDir, 'vercel-url.txt'), `${url}\n`, 'utf8');
    updateClientConfig(slug, { vercel_preview_url: url });

    this.log(`\nDone. Preview: ${url}`);
    this.log(`  Wrote ${join(clientDir, 'vercel-url.txt')}`);
  }
}

interface CreatedVercelProject {
  id: string;
  name: string;
}

function teamQuery(team: string | undefined): string {
  return team ? `?teamId=${encodeURIComponent(team)}` : '';
}

async function createProject(
  token: string,
  name: string,
  githubRepo: string,
  team: string | undefined,
): Promise<CreatedVercelProject> {
  const res = await fetch(`${VERCEL_API}/v10/projects${teamQuery(team)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      framework: 'astro',
      gitRepository: { type: 'github', repo: githubRepo },
    }),
  });
  if (!res.ok && res.status !== 409) {
    throw new Error(`Vercel create project failed (${res.status}): ${await res.text()}`);
  }
  if (res.status === 409) {
    // Already exists — fetch by name
    const existing = await fetch(`${VERCEL_API}/v9/projects/${name}${teamQuery(team)}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!existing.ok) throw new Error(`Vercel get project failed (${existing.status}): ${await existing.text()}`);
    return (await existing.json()) as CreatedVercelProject;
  }
  return (await res.json()) as CreatedVercelProject;
}

async function pushEnvVars(
  token: string,
  projectId: string,
  envFile: string,
  team: string | undefined,
): Promise<void> {
  const lines = readFileSync(envFile, 'utf8').split('\n');
  for (const raw of lines) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq < 0) continue;
    const key = line.slice(0, eq).trim();
    const value = line.slice(eq + 1).trim();
    if (!key || !value) continue;
    await fetch(`${VERCEL_API}/v10/projects/${projectId}/env${teamQuery(team)}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        key,
        value,
        type: key.startsWith('PUBLIC_') ? 'plain' : 'encrypted',
        target: ['production', 'preview', 'development'],
      }),
    });
  }
}

interface CreatedDeployment {
  url: string;
}

async function createDeployment(
  token: string,
  name: string,
  githubRepo: string,
  team: string | undefined,
): Promise<CreatedDeployment> {
  const [owner, repo] = githubRepo.split('/');
  if (!owner || !repo) throw new Error(`Invalid github_repo: ${githubRepo}`);

  // Get repo id from GitHub-Vercel link API
  const repoInfo = await fetch(
    `${VERCEL_API}/v9/integrations/git-namespaces/${owner}/git-repository?provider=github&type=github${
      team ? `&teamId=${team}` : ''
    }`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  let repoId: number | undefined;
  if (repoInfo.ok) {
    const data = (await repoInfo.json()) as Array<{ id?: number; name?: string }>;
    repoId = data.find((r) => r.name === repo)?.id;
  }

  const res = await fetch(`${VERCEL_API}/v13/deployments${teamQuery(team)}`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name,
      gitSource: {
        type: 'github',
        ref: 'main',
        ...(repoId ? { repoId } : { org: owner, repo }),
      },
      target: 'preview',
    }),
  });
  if (!res.ok) throw new Error(`Vercel create deployment failed (${res.status}): ${await res.text()}`);
  return (await res.json()) as CreatedDeployment;
}

