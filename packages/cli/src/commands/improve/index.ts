import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { Args, Flags } from '@oclif/core';
import { clientDir } from '@upriver/core';

import { BaseCommand } from '../../base-command.js';
import { runTrack, type TrackResult } from '../../improve/agent-runner.js';
import {
  loadSkillMatrix,
  skillExists,
  type SkillTrack,
} from '../../improve/matrix-loader.js';
import { loadAuditPackage } from '../../scaffold/template-writer.js';
import { readIntake } from '../../util/intake-reader.js';

/**
 * `upriver improve <slug>` — run the improvement-layer skill matrix against a
 * cloned + verified site (Workstream E). With `--dry-run` (default) it prints
 * the planned tracks; with `--no-dry-run` it spawns one Claude Code agent per
 * track and lands edits on `improve/<track-id>` branches.
 */
export default class Improve extends BaseCommand {
  static override description =
    'Run the improvement-layer skill matrix against a cloned + verified site (E.3).';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    matrix: Flags.string({ description: 'Path to a custom skill-matrix.yaml' }),
    'dry-run': Flags.boolean({
      description: 'Print the plan without executing any tracks. Pass --no-dry-run to execute.',
      default: true,
      allowNo: true,
    }),
    track: Flags.string({
      description: 'Run only this track id (repeatable).',
      multiple: true,
    }),
    skip: Flags.string({
      description: 'Skip this track id (repeatable).',
      multiple: true,
    }),
    'no-worktree': Flags.boolean({
      description: 'Run live tracks in the main repo working tree instead of a worktree per track.',
      default: false,
    }),
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Improve);
    const { slug } = args;

    const base = process.env['UPRIVER_CLIENTS_DIR'] ?? './clients';
    const dir = resolve(clientDir(slug, base));
    const auditPkgPath = join(dir, 'audit-package.json');
    const repoDir = join(dir, 'repo');

    if (!existsSync(dir)) {
      this.error(
        `Client directory not found at ${dir}. Run "upriver init <url> --slug ${slug}" first.`,
      );
    }
    if (!existsSync(auditPkgPath)) {
      this.error(
        `audit-package.json missing at ${auditPkgPath}. Run "upriver audit ${slug}" before improve.`,
      );
    }
    if (!existsSync(repoDir)) {
      this.error(
        `Cloned site missing at ${repoDir}. Run "upriver scaffold ${slug}" and "upriver clone ${slug}" before improve.`,
      );
    }

    const matrix = loadSkillMatrix(flags.matrix);
    const pkg = loadAuditPackage(dir);
    const intake = readIntake(slug);

    const onlyIds = new Set((flags.track ?? []).map((s) => s.toLowerCase()));
    const skipIds = new Set((flags.skip ?? []).map((s) => s.toLowerCase()));

    let tracks: SkillTrack[] = matrix.tracks;
    if (onlyIds.size > 0) {
      tracks = tracks.filter((t) => onlyIds.has(t.id.toLowerCase()));
    }
    if (skipIds.size > 0) {
      tracks = tracks.filter((t) => !skipIds.has(t.id.toLowerCase()));
    }

    if (tracks.length === 0) {
      this.warn('No tracks selected after applying --track / --skip filters. Nothing to plan.');
      return;
    }

    this.log(`\nimprove "${slug}" — matrix v${matrix.version}, ${tracks.length} track(s)`);
    this.log(`  Client dir: ${dir}`);
    this.log(`  Repo dir:   ${repoDir}`);

    const ready: SkillTrack[] = [];
    const missing: SkillTrack[] = [];
    for (const track of tracks) {
      const present = skillExists(track.skill);
      if (!present) {
        this.warn(
          `[warn] track ${track.id} references skill "${track.skill}" which is not present at ` +
            `.agents/skills/${track.skill}/SKILL.md — track will be skipped.`,
        );
        missing.push(track);
      } else {
        ready.push(track);
      }
      this.log(`\n  - track: ${track.id}${present ? '' : ' (skipped — missing skill)'}`);
      this.log(`    skill:       ${track.skill}`);
      this.log(`    targets:     ${track.targets}`);
      if (track.references && track.references.length > 0) {
        this.log(`    references:  ${track.references.join(', ')}`);
      }
      this.log(`    description: ${track.description}`);
      this.log(`    output:      ${track.output}`);
    }

    if (flags['dry-run']) {
      this.log('\nDRY RUN — no edits made. Pass --no-dry-run to execute tracks.');
      this.log(
        `\nPlanned tracks: ${ready.length} ready, ${missing.length} skipped (missing skills).`,
      );
      return;
    }

    // Live execution. Sequential in this slice; one PR (and one branch) per
    // track, branched off `improve/<track-id>` from the repoDir's HEAD.
    // TODO(roadmap): parallel via worktrees with concurrency.
    const useWorktree = !flags['no-worktree'];
    const results: TrackResult[] = [];
    this.log(`\nExecuting ${tracks.length} track(s) ${useWorktree ? '(worktree-per-track)' : '(in-tree, sequential)'}\n`);
    for (const track of tracks) {
      const result = await runTrack({
        track,
        slug,
        clientDir: dir,
        repoDir,
        pkg,
        intake,
        useWorktree,
        dryRun: false,
        log: (msg) => this.log(msg),
      });
      results.push(result);
    }

    const ok = results.filter((r) => r.ok).length;
    const skipped = results.filter((r) => r.skipped).length;
    const failed = results.filter((r) => !r.ok && !r.skipped).length;
    this.log(`\nimprove complete: ${ok} ok, ${skipped} skipped, ${failed} failed.`);
    for (const r of results) {
      const tag = r.ok ? 'ok' : r.skipped ? 'skip' : 'fail';
      const detail = r.error ? ` — ${r.error}` : r.skippedReason ? ` — ${r.skippedReason}` : '';
      this.log(`  [${tag}] ${r.trackId} (${r.branch})${detail}`);
    }
  }
}
