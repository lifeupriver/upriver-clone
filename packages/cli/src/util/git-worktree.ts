import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

import { withKeyedLock } from './keyed-lock.js';

/**
 * Minimal git-worktree seam for the parallel `generate --jobs` path. One
 * worktree per doc gives each concurrent headless session a private
 * `clients/<slug>/` tree (its own `docs/manifest.json`), so a DAG tier can
 * generate in parallel without a lock on the shared manifest — the produced
 * docs are uniquely named, so the post-tier merge back into the main tree is
 * conflict-free (see `runTierParallel` in `generate/batch.ts`).
 *
 * Mirrors the `createWorktree` idiom already used by `clone.ts`,
 * `fixes/apply.ts`, and `improve/agent-runner.ts` (the long-standing TODO to
 * extract a shared util — this is a first, generate-scoped step). `batch.ts`
 * never imports this directly: the command layer wires a {@link WorktreeProvider}
 * into the batch orchestrator so unit tests can mock git entirely (no real
 * worktrees in CI).
 */
export interface WorktreeHandle {
  /** Absolute path to the worktree root (a checkout of the repo at HEAD). */
  path: string;
  /** Remove the worktree and its scratch parent. Best-effort; never throws. */
  remove(): Promise<void>;
}

export interface WorktreeProvider {
  /** Create an isolated worktree, tagged by `key` for debuggability. */
  create(key: string): Promise<WorktreeHandle>;
}

/** Replace anything that isn't a safe path segment so `key` can name a dir. */
function sanitize(key: string): string {
  return key.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Resolve the git repository root containing `cwd`, or `null` if `cwd` is not
 * inside a git repo (in which case the caller falls back to the sequential
 * path). Pure-ish: shells out to `git rev-parse` read-only.
 */
export function resolveGitRepoRoot(cwd: string = process.cwd()): string | null {
  try {
    const out = execFileSync('git', ['rev-parse', '--show-toplevel'], {
      cwd,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
      .toString()
      .trim();
    return out.length > 0 ? out : null;
  } catch {
    return null;
  }
}

/**
 * Real git-backed worktree provider. Each `create` adds a detached worktree at
 * HEAD under a fresh temp dir (so the repo tree is never polluted) and returns
 * a handle whose `remove` deregisters + deletes it. `git worktree add` is
 * serialized per-repo via `withKeyedLock` — concurrent `add`s on one repo race
 * on the worktree admin files; different repos still run in parallel.
 */
export function gitWorktreeProvider(repoDir: string): WorktreeProvider {
  return {
    create: (key) =>
      withKeyedLock(`worktree:${repoDir}`, async () => {
        const parent = mkdtempSync(join(tmpdir(), 'upriver-generate-wt-'));
        const dir = join(parent, sanitize(key));
        const addArgs = ['worktree', 'add', '--detach', dir, 'HEAD'];
        try {
          execFileSync('git', addArgs, { cwd: repoDir, stdio: 'pipe' });
        } catch {
          // Best-effort prune of stale entries from a crashed run, then retry.
          try {
            execFileSync('git', ['worktree', 'prune'], { cwd: repoDir, stdio: 'pipe' });
          } catch {
            /* ignore */
          }
          execFileSync('git', addArgs, { cwd: repoDir, stdio: 'pipe' });
        }
        const path = resolve(dir);
        return {
          path,
          remove: async () => {
            try {
              execFileSync('git', ['worktree', 'remove', '--force', path], {
                cwd: repoDir,
                stdio: 'pipe',
              });
            } catch {
              // best-effort; the rm below still reclaims the disk
            }
            try {
              rmSync(parent, { recursive: true, force: true });
            } catch {
              /* best-effort */
            }
          },
        };
      }),
  };
}
