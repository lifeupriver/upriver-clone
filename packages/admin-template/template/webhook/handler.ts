// F05 GitHub webhook handler — Inngest function scaffolding.
//
// This file lives in @upriver/admin-template/ as a reference implementation.
// To activate it, copy into packages/worker/src/functions/admin-webhook.ts and
// wire it up in packages/worker/src/index.ts. It uses the same Inngest client
// the rest of the worker uses.
//
// Three event types come from GitHub:
//   - issues (action=opened, labeled with change-request)
//   - issue_comment (action=created, on an existing change-request issue)
//   - pull_request (action=closed)
//
// The handler clones the client repo, calls @upriver/cli's runChangeRequest,
// then commits / pushes / opens-PR via Octokit when the voice-check passes.

/* eslint-disable */
// @ts-nocheck — this file references modules that are not in the admin-template
// package's own tsconfig path; it is a copy-into-worker template, not built
// here.

import { Inngest } from 'inngest';
import { Octokit } from '@octokit/rest';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

import { runChangeRequest, loadVoiceRulesFromClient } from '@upriver/cli/admin/processor';

const inngest = new Inngest({ id: 'upriver-platform' });

interface IssueOpenedPayload {
  action: 'opened';
  issue: { number: number; title: string; body: string; html_url: string; labels: Array<{ name: string }> };
  repository: { full_name: string; clone_url: string };
}

export const onChangeRequestOpened = inngest.createFunction(
  { id: 'admin-change-request-opened', name: 'Process new change-request issue' },
  { event: 'github/issues.opened' },
  async ({ event, step }) => {
    const payload = event.data as IssueOpenedPayload;
    if (!payload.issue.labels.some((l) => l.name === 'change-request')) {
      return { skipped: 'no change-request label' };
    }

    const slug = inferSlugFromRepo(payload.repository.full_name);
    const octokit = new Octokit({ auth: process.env.UPRIVER_GITHUB_PAT });

    // Step 1: clone the repo to a temp dir.
    const repoDir = await step.run('clone-repo', async () => {
      const dir = mkdtempSync(join(tmpdir(), 'upriver-change-'));
      const result = spawnSync('git', ['clone', '--depth', '20', payload.repository.clone_url, dir], {
        stdio: 'inherit',
      });
      if (result.status !== 0) throw new Error('git clone failed');
      return dir;
    });

    // Step 2: post parsed-intent comment + apply in-progress label.
    const voiceRules = await step.run('load-voice', async () => loadVoiceRulesFromClient(`./clients/${slug}`));

    // Step 3: run the change processor.
    const result = await step.run('run-change', async () =>
      runChangeRequest({
        slug,
        repoDir,
        issueNumber: payload.issue.number,
        issueTitle: payload.issue.title,
        issueBody: payload.issue.body,
        voiceRules,
      }),
    );

    const [owner, repo] = payload.repository.full_name.split('/');

    // Step 4: post intent comment.
    await step.run('post-intent-comment', async () =>
      octokit.issues.createComment({
        owner,
        repo,
        issue_number: payload.issue.number,
        body: renderIntentComment(result.intent, result.blocked, result.block_reason),
      }),
    );

    if (result.blocked) {
      const label = result.block_reason ?? 'voice-check-failed';
      await step.run('apply-blocked-label', async () =>
        octokit.issues.addLabels({ owner, repo, issue_number: payload.issue.number, labels: [label] }),
      );
      await step.run('remove-in-progress', async () =>
        octokit.issues
          .removeLabel({ owner, repo, issue_number: payload.issue.number, name: 'in-progress' })
          .catch(() => undefined),
      );
      return { blocked: true, reason: result.block_reason };
    }

    // Step 5: commit, push, open PR.
    const branch = result.branch;
    spawnSync('git', ['-C', repoDir, 'checkout', '-b', branch], { stdio: 'inherit' });
    spawnSync('git', ['-C', repoDir, 'add', '-A'], { stdio: 'inherit' });
    spawnSync(
      'git',
      [
        '-C',
        repoDir,
        '-c',
        'user.email=admin@upriverplatform.com',
        '-c',
        'user.name=Upriver bot',
        'commit',
        '-m',
        `feat: address #${payload.issue.number}\n\n${result.summary}`,
      ],
      { stdio: 'inherit' },
    );
    spawnSync('git', ['-C', repoDir, 'push', '-u', 'origin', branch], { stdio: 'inherit' });

    const pr = await step.run('open-pr', async () =>
      octokit.pulls.create({
        owner,
        repo,
        head: branch,
        base: 'main',
        title: `Address #${payload.issue.number}: ${payload.issue.title}`,
        body: `Closes #${payload.issue.number}\n\n${result.summary}\n\n_Voice-check passed automatically._`,
      }),
    );

    await step.run('apply-pending-review', async () =>
      octokit.issues.addLabels({
        owner,
        repo,
        issue_number: payload.issue.number,
        labels: ['pending-review'],
      }),
    );

    return { pr_url: pr.data.html_url };
  },
);

function inferSlugFromRepo(fullName: string): string {
  const repo = fullName.split('/')[1] ?? fullName;
  return repo.replace(/-site$/, '');
}

function renderIntentComment(intent: any, blocked: boolean, blockReason: string | null): string {
  const lines: string[] = [];
  lines.push('Working on this now. Here is what I understand:');
  lines.push('');
  lines.push(`- Type: ${intent.type}`);
  if (intent.target_files.length > 0) lines.push(`- Target files: ${intent.target_files.join(', ')}`);
  lines.push(`- Estimated complexity: ${intent.estimated_complexity}`);
  if (intent.asset_requirements.length > 0) {
    lines.push(`- Assets needed: ${intent.asset_requirements.join(', ')}`);
  }
  lines.push('');
  if (blocked && blockReason === 'awaiting-assets') {
    lines.push('I need the listed assets before I can finish. Drop them as comments on this issue and I will resume automatically.');
  } else if (blocked) {
    lines.push('I produced a draft but flagged it for operator review before merge.');
  } else {
    lines.push('I will open a PR within five minutes.');
  }
  return lines.join('\n');
}
