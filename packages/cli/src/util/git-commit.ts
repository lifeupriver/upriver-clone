// Git helpers shared by the agent-driven commands (clone, fixes apply,
// improve). The key contract: a real commit failure must THROW so callers
// can preserve the worktree and report it — a swallowed failure followed by
// `git worktree remove --force` silently destroys the agent's output.

import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Stage and commit everything in `cwd`. Returns 'clean' when there is
 * nothing to commit; throws when staging/committing actually fails
 * (missing identity, hooks, lock contention, …).
 */
export function commitAll(cwd: string, message: string): 'committed' | 'clean' {
  const status = execFileSync('git', ['status', '--porcelain'], { cwd, stdio: 'pipe' })
    .toString('utf8');
  if (status.trim() === '') return 'clean';
  execFileSync('git', ['add', '-A'], { cwd, stdio: 'pipe' });
  execFileSync('git', ['commit', '-m', message], { cwd, stdio: 'pipe' });
  return 'committed';
}

/**
 * Ensure a local committer identity exists in `cwd` so agent commits work
 * even when the repo was initialized elsewhere (e.g. `scaffold github`) on a
 * machine without global git config. No-op when an identity is configured.
 */
export function ensureGitIdentity(cwd: string): void {
  try {
    const email = execFileSync('git', ['config', 'user.email'], { cwd, stdio: 'pipe' })
      .toString('utf8')
      .trim();
    if (email !== '') return;
  } catch {
    // unset — fall through and configure
  }
  const email = process.env['UPRIVER_GIT_EMAIL'] ?? 'upriver@lifeupriver.com';
  const name = process.env['UPRIVER_GIT_NAME'] ?? 'Upriver Bot';
  execFileSync('git', ['config', 'user.email', email], { cwd, stdio: 'pipe' });
  execFileSync('git', ['config', 'user.name', name], { cwd, stdio: 'pipe' });
}

/**
 * Initialize `repoDir` as a git repo with an initial commit when it isn't
 * one yet, and guarantee a committer identity either way.
 */
export function ensureGitInitialized(repoDir: string): void {
  const fresh = !existsSync(join(repoDir, '.git'));
  if (fresh) {
    execFileSync('git', ['init', '-b', 'main'], { cwd: repoDir, stdio: 'pipe' });
  }
  ensureGitIdentity(repoDir);
  if (!fresh) return;
  execFileSync('git', ['add', '-A'], { cwd: repoDir, stdio: 'pipe' });
  try {
    execFileSync('git', ['commit', '-m', 'Initial scaffold from upriver'], {
      cwd: repoDir,
      stdio: 'pipe',
    });
  } catch {
    // empty tree — nothing to commit
  }
}
