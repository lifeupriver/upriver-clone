// TODO(roadmap): E.3 implement agent-runner — wire each track to a Claude
// Code subprocess (one PR per track) using the worktree pattern in
// commands/fixes/apply.ts. This shell only prints the planned tracks.
import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { Args, Flags } from '@oclif/core';
import { clientDir } from '@upriver/core';

import { BaseCommand } from '../base-command.js';
import {
  loadSkillMatrix,
  skillExists,
  type SkillTrack,
} from '../improve/matrix-loader.js';

/**
 * `upriver improve <slug>` — run the improvement-layer skill matrix against a
 * cloned + verified site (Workstream E.1). Currently a dry-run shell that
 * prints the planned tracks; live execution lands in E.3.
 */
export default class Improve extends BaseCommand {
  static override description =
    'Run the improvement-layer skill matrix against a cloned + verified site (E.1).';

  static override args = {
    slug: Args.string({ description: 'Client slug', required: true }),
  };

  static override flags = {
    matrix: Flags.string({ description: 'Path to a custom skill-matrix.yaml' }),
    'dry-run': Flags.boolean({
      description: 'Print the plan without executing any tracks (default true until E.3 lands).',
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
  };

  async run(): Promise<void> {
    const { args, flags } = await this.parse(Improve);
    const { slug } = args;

    const base = process.env['UPRIVER_CLIENTS_DIR'] ?? './clients';
    const dir = resolve(clientDir(slug, base));
    const auditPkg = join(dir, 'audit-package.json');
    const repoDir = join(dir, 'repo');

    if (!existsSync(dir)) {
      this.error(
        `Client directory not found at ${dir}. Run "upriver init <url> --slug ${slug}" first.`,
      );
    }
    if (!existsSync(auditPkg)) {
      this.error(
        `audit-package.json missing at ${auditPkg}. Run "upriver audit ${slug}" before improve.`,
      );
    }
    if (!existsSync(repoDir)) {
      this.error(
        `Cloned site missing at ${repoDir}. Run "upriver scaffold ${slug}" and "upriver clone ${slug}" before improve.`,
      );
    }

    const matrix = loadSkillMatrix(flags.matrix);

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
      this.log('\nDRY RUN — no edits made. Pass --no-dry-run once E.3 ships to execute tracks.');
      this.log(
        `\nPlanned tracks: ${ready.length} ready, ${missing.length} skipped (missing skills).`,
      );
      return;
    }

    this.error('Live execution not yet wired (E.3). Re-run with --dry-run.');
  }
}
