import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import type { AuditPackage, ClientIntake, SitePage } from '@upriver/core';

import { withKeyedLock } from '../util/keyed-lock.js';

import { skillExists, type SkillTrack } from './matrix-loader.js';

const CLAUDE_BIN = process.env['CLAUDE_BIN'] || 'claude';

/**
 * A single page target that an improvement-track agent should consider. Mirrors
 * the subset of `SitePage` the per-track prompt actually needs, plus a derived
 * `path` (the URL pathname) so prompts can refer to canonical site routes.
 */
export interface TrackPageTarget {
  slug: string;
  title: string;
  url: string;
  path: string;
}

/**
 * Inputs for `runTrack`. The runner reads files from disk based on `clientDir`
 * (brand voice, design tokens) and `repoDir` (where edits land). `intake` is
 * passed through so per-page wants can be surfaced verbatim to the agent.
 */
export interface RunTrackOptions {
  track: SkillTrack;
  slug: string;
  clientDir: string;
  repoDir: string;
  pkg: AuditPackage;
  intake: ClientIntake | null;
  useWorktree: boolean;
  dryRun: boolean;
  log: (msg: string) => void;
}

/**
 * Result of running a single improvement track. `ok=true` means the track ran
 * (or would have run, in dry-run mode) without error. `skipped=true` is set
 * when the track was a no-op for a structural reason (missing skill, no
 * targets), in which case `ok` is left false.
 */
export interface TrackResult {
  trackId: string;
  branch: string;
  ok: boolean;
  skipped?: boolean;
  skippedReason?: string;
  error?: string;
}

/**
 * Build the markdown-style prompt the per-track agent receives. Pure: does no
 * IO. Sections are kept stable so prompt tweaks land in one place.
 *
 * @param args - Track, audit package, skill body, page list, per-page wants,
 *   optional brand voice markdown, optional design tokens JSON.
 * @returns The full prompt text to feed Claude Code on stdin.
 */
export function buildTrackPrompt(args: {
  track: SkillTrack;
  pkg: AuditPackage;
  skillBody: string;
  pageList: TrackPageTarget[];
  pageWants: Record<string, string>;
  brandVoiceMd: string | null;
  designTokensJson: string | null;
}): string {
  const { track, pkg, skillBody, pageList, pageWants, brandVoiceMd, designTokensJson } = args;

  const pageListBlock =
    pageList.length === 0
      ? '- (no targeted pages — skip if the track requires page edits)'
      : pageList
          .map((p) => `- \`${p.path}\` — ${p.title || '(untitled)'} (source: ${p.url})`)
          .join('\n');

  const validSlugs = new Set(pageList.map((p) => p.slug));
  const wantsEntries = Object.entries(pageWants)
    .filter(([slug, value]) => validSlugs.has(slug) && typeof value === 'string' && value.trim())
    .map(([slug, value]) => {
      const match = pageList.find((p) => p.slug === slug);
      const label = match ? `${match.path} (${slug})` : slug;
      const quoted = value
        .trim()
        .split(/\r?\n/)
        .map((line) => `> ${line}`)
        .join('\n');
      return `### ${label}\n${quoted}`;
    });
  const wantsBlock =
    wantsEntries.length > 0
      ? `## Per-page wants from client intake\n\nThe client wrote these in their intake form for the matching pages. Treat them as a high-signal hint, not a directive — only act when consistent with the skill's methodology.\n\n${wantsEntries.join('\n\n')}\n`
      : '';

  const brandVoiceBlock = brandVoiceMd
    ? `## Brand voice\n\nUse this voice for any copy you touch. It supersedes generic copy heuristics.\n\n${brandVoiceMd.trim()}\n`
    : '';

  const designTokensBlock = designTokensJson
    ? `## Design tokens\n\nWhen restyling, prefer these tokens over inventing new values.\n\n\`\`\`json\n${designTokensJson.trim()}\n\`\`\`\n`
    : '';

  return `You are applying the **${track.skill}** improvement layer to this client's cloned site.

Client: ${pkg.meta.clientName} (${pkg.meta.siteUrl})
Track: \`${track.id}\` — ${track.description}
Expected output: ${track.output}

## Skill: ${track.skill}

${skillBody.trim()}

## Track instructions

- ID: \`${track.id}\`
- Skill: \`${track.skill}\`
- Targets: \`${track.targets}\`
- Description: ${track.description}
- Output expectation: ${track.output}

${brandVoiceBlock}${designTokensBlock}## Page list (target paths)

These are the canonical routes this track should touch. Prefer editing the file at \`src/pages<path>.astro\` (or \`src/pages/index.astro\` for \`/\`).

${pageListBlock}

${wantsBlock}## Constraints

- Do not introduce new top-level routes; restrict edits to the page list above and the components / content collections those pages already use.
- Do not modify \`src/styles/global.css\`. If a token is missing, note it in your final summary instead of editing the stylesheet.
- Do not touch \`src/pages/admin/\`.
- Keep the diff commit-friendly: small, scoped, no drive-by reformatting of unrelated files.
- Reuse existing components in \`src/components/astro/\` before adding new ones.

When done, print a single line in this exact form:

\`improve(${track.id}): <one-sentence summary of what changed>\`
`;
}

/**
 * Resolve the page targets for a track from `pkg.siteStructure.pages` and the
 * track's `targets` selector. Synthetic groups (`all-pages`,
 * `pillar-page-candidates`, `high-intent-pages`) use heuristics; otherwise the
 * selector is treated as a comma-separated list of slugs/paths.
 *
 * Unmatched entries from a comma-list are silently dropped — the caller is
 * responsible for surfacing a warning if it cares.
 *
 * @param pkg - The loaded audit package.
 * @param targets - Track `targets` selector.
 * @returns Targets in `{ slug, title, url, path }` shape, deduped by path.
 */
export function resolveTrackTargets(
  pkg: AuditPackage,
  targets: SkillTrack['targets'],
): TrackPageTarget[] {
  const allPages = pkg.siteStructure.pages.filter((p) => p.statusCode < 400);

  const toTarget = (p: SitePage): TrackPageTarget => {
    let path = '/';
    try {
      path = new URL(p.url).pathname || '/';
    } catch {
      path = p.slug && p.slug !== 'home' ? `/${p.slug.replace(/^\/+/, '')}` : '/';
    }
    return { slug: p.slug, title: p.title, url: p.url, path };
  };

  const dedupe = (items: TrackPageTarget[]): TrackPageTarget[] => {
    const seen = new Set<string>();
    const out: TrackPageTarget[] = [];
    for (const it of items) {
      if (seen.has(it.path)) continue;
      seen.add(it.path);
      out.push(it);
    }
    return out;
  };

  if (targets === 'all-pages') {
    return dedupe(allPages.map(toTarget));
  }

  if (targets === 'pillar-page-candidates') {
    return dedupe(allPages.filter((p) => p.wordCount > 600).map(toTarget));
  }

  if (targets === 'high-intent-pages') {
    const intentPatterns = ['/contact', '/pricing', '/services', '/book'];
    const matches = allPages.filter((p) => {
      const t = toTarget(p);
      return intentPatterns.some((pat) => t.path.includes(pat));
    });
    if (matches.length > 0) return dedupe(matches.map(toTarget));
    const home = allPages.find((p) => {
      const t = toTarget(p);
      return t.path === '/' || t.path === '';
    });
    return home ? [toTarget(home)] : [];
  }

  // Comma-separated list — split, trim, match by slug or path.
  const tokens = targets
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
  if (tokens.length === 0) return [];
  const matched: TrackPageTarget[] = [];
  for (const token of tokens) {
    const normalized = token.startsWith('/') ? token : `/${token}`;
    const hit = allPages.find((p) => {
      const t = toTarget(p);
      return p.slug === token || t.path === token || t.path === normalized;
    });
    if (hit) matched.push(toTarget(hit));
  }
  return dedupe(matched);
}

/**
 * Apply a single improvement track. Reads supporting files (skill body, brand
 * voice, design tokens), composes the prompt via `buildTrackPrompt`, and (when
 * not dry-run) spawns Claude Code in a worktree branched from `repoDir`.
 *
 * @param opts - See `RunTrackOptions`.
 * @returns Track result with `ok`/`skipped`/`error` populated.
 */
export async function runTrack(opts: RunTrackOptions): Promise<TrackResult> {
  const { track, clientDir, repoDir, pkg, intake, useWorktree, dryRun, log } = opts;
  const branch = `improve/${track.id}`;

  if (!skillExists(track.skill)) {
    log(`[skip] ${track.id}: skill "${track.skill}" not present at .agents/skills/`);
    return { trackId: track.id, branch, ok: false, skipped: true, skippedReason: 'skill not found' };
  }

  const skillPath = resolve(process.cwd(), '.agents', 'skills', track.skill, 'SKILL.md');
  let skillBody: string;
  try {
    skillBody = readFileSync(skillPath, 'utf8');
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    log(`[skip] ${track.id}: failed to read SKILL.md (${msg})`);
    return {
      trackId: track.id,
      branch,
      ok: false,
      skipped: true,
      skippedReason: 'skill body unreadable',
    };
  }

  const brandVoicePath = join(clientDir, 'docs', 'brand-voice-guide.md');
  const brandVoiceMd = existsSync(brandVoicePath) ? safeRead(brandVoicePath) : null;
  const designTokensPath = join(clientDir, 'design-tokens.json');
  const designTokensJson = existsSync(designTokensPath) ? safeRead(designTokensPath) : null;

  const pageWants = intake?.pageWants ?? {};
  const pageList = resolveTrackTargets(pkg, track.targets);

  const prompt = buildTrackPrompt({
    track,
    pkg,
    skillBody,
    pageList,
    pageWants,
    brandVoiceMd,
    designTokensJson,
  });

  if (dryRun) {
    log(
      `[dry-run] ${track.id}: skill=${track.skill}, pages=${pageList.length}, output="${track.output}"`,
    );
    return { trackId: track.id, branch, ok: true };
  }

  // Live execution. Branch off the current HEAD; use a worktree if requested
  // so multiple tracks could run concurrently in a follow-up.
  let workCwd = repoDir;
  let createdWorktree = false;
  try {
    if (useWorktree) {
      workCwd = await createWorktree(repoDir, branch);
      createdWorktree = true;
    } else {
      execFileSync('git', ['checkout', '-B', branch], { cwd: repoDir, stdio: 'pipe' });
    }
    log(`-> ${track.id}: launching Claude Code (branch ${branch}, cwd ${workCwd})`);
    await runClaudeCode(prompt, workCwd);

    try {
      execFileSync('git', ['add', '-A'], { cwd: workCwd, stdio: 'pipe' });
      const msg = `improve(${track.id}): apply ${track.skill} skill`.slice(0, 160);
      execFileSync('git', ['commit', '-m', msg], { cwd: workCwd, stdio: 'pipe' });
    } catch {
      // Nothing to commit — agent decided no changes were needed.
    }

    return { trackId: track.id, branch, ok: true };
  } catch (err) {
    return {
      trackId: track.id,
      branch,
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  } finally {
    if (createdWorktree) {
      try {
        execFileSync('git', ['worktree', 'remove', '--force', workCwd], {
          cwd: repoDir,
          stdio: 'pipe',
        });
      } catch {
        // best-effort
      }
    }
  }
}

function safeRead(path: string): string | null {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return null;
  }
}

// TODO(roadmap): dedupe `runClaudeCode` and `createWorktree` against the
// near-identical helpers in `commands/fixes/apply.ts` and `commands/clone.ts`.
// They were copied here verbatim for E.3 to keep the slice small; the dedupe
// belongs in a follow-up cleanup PR alongside a shared `util/git-worktree.ts`
// and `util/claude-code.ts`.
function runClaudeCode(prompt: string, cwd: string): Promise<void> {
  return new Promise((resolveP, rejectP) => {
    const args = [
      '--print',
      '--permission-mode',
      'acceptEdits',
      '--allowed-tools',
      'Read,Edit,Write,Bash,Glob,Grep',
    ];
    const child = spawn(CLAUDE_BIN, args, {
      cwd,
      stdio: ['pipe', 'inherit', 'inherit'],
      env: { ...process.env },
    });

    child.stdin.write(prompt);
    child.stdin.end();

    child.on('error', (err) => rejectP(err));
    child.on('exit', (code) => {
      if (code === 0) resolveP();
      else rejectP(new Error(`claude exited with code ${code}`));
    });
  });
}

async function createWorktree(repoDir: string, branch: string): Promise<string> {
  // Serialize per-repo so concurrent workers don't race on `git worktree add`.
  return withKeyedLock(`worktree:${repoDir}`, async () => {
    const dir = join(repoDir, '..', '.worktrees', branch.replace(/[/]/g, '_'));
    mkdirSync(join(repoDir, '..', '.worktrees'), { recursive: true });
    const addArgs = ['worktree', 'add', '-B', branch, dir, 'HEAD'];
    try {
      execFileSync('git', addArgs, { cwd: repoDir, stdio: 'pipe' });
    } catch {
      try {
        execFileSync('git', ['worktree', 'prune'], { cwd: repoDir, stdio: 'pipe' });
      } catch {
        /* ignore */
      }
      execFileSync('git', addArgs, { cwd: repoDir, stdio: 'pipe' });
    }
    return resolve(dir);
  });
}
