import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse as parseYaml } from 'yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Where a track is targeted. Either a well-known synthetic group
 * (`all-pages`, `pillar-page-candidates`, `high-intent-pages`), or a
 * comma-separated list of page slugs (e.g. `'hero,services,about'`).
 */
export type TrackTarget =
  | 'all-pages'
  | 'pillar-page-candidates'
  | 'high-intent-pages'
  | string;

/**
 * One entry in the improvement-layer skill matrix. Each track corresponds to
 * one PR worth of changes applied across a defined set of pages, driven by a
 * single skill in `.agents/skills/<skill>/SKILL.md`.
 */
export interface SkillTrack {
  id: string;
  skill: string;
  targets: TrackTarget;
  description: string;
  output: string;
  references?: string[];
}

/** A parsed and validated `skill-matrix.yaml` document. */
export interface SkillMatrix {
  version: number;
  tracks: SkillTrack[];
}

/**
 * Resolve the path to the bundled `skill-matrix.yaml`. In compiled `dist/`
 * layout the YAML lives next to `src/`, so we walk up to find it. Falls back
 * to a plausible repo-relative location for ts-node / dev runs.
 *
 * @returns Absolute path to the bundled `skill-matrix.yaml`.
 */
function resolveDefaultMatrixPath(): string {
  // Compiled layout: packages/cli/dist/improve/matrix-loader.js
  //   → ../../src/improve/skill-matrix.yaml
  // Source layout : packages/cli/src/improve/matrix-loader.ts
  //   → ./skill-matrix.yaml
  const candidates = [
    resolve(__dirname, '..', '..', 'src', 'improve', 'skill-matrix.yaml'),
    resolve(__dirname, 'skill-matrix.yaml'),
    resolve(process.cwd(), 'packages', 'cli', 'src', 'improve', 'skill-matrix.yaml'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return candidates[0]!;
}

/**
 * Load and validate the skill matrix from a YAML file path.
 *
 * @param path - Optional override path. Defaults to the bundled
 *   `skill-matrix.yaml` shipped with `@upriver/cli`.
 * @returns Parsed and validated `SkillMatrix`.
 * @throws Error if the file is missing, unparseable, or fails validation.
 */
export function loadSkillMatrix(path?: string): SkillMatrix {
  const target = path ?? resolveDefaultMatrixPath();
  if (!existsSync(target)) {
    throw new Error(`Invalid skill-matrix.yaml: file not found at ${target}`);
  }
  let raw: unknown;
  try {
    raw = parseYaml(readFileSync(target, 'utf8'));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`Invalid skill-matrix.yaml: failed to parse YAML at ${target}: ${msg}`);
  }
  return validateMatrix(raw);
}

/**
 * Return whether the named skill is reachable at
 * `<cwd>/.agents/skills/<name>/SKILL.md`. Used to warn when a track
 * references a skill the operator has not symlinked yet.
 *
 * @param skillName - Name segment under `.agents/skills/`.
 * @param cwd - Working directory to resolve from. Defaults to `process.cwd()`.
 * @returns True if the skill's `SKILL.md` exists; false otherwise.
 */
export function skillExists(skillName: string, cwd: string = process.cwd()): boolean {
  if (!skillName || typeof skillName !== 'string') return false;
  const path = resolve(cwd, '.agents', 'skills', skillName, 'SKILL.md');
  return existsSync(path);
}

/**
 * Validate a parsed matrix object. Lightweight, manual checks (no zod for
 * this slice) so the failure messages stay close to the YAML the operator
 * authored.
 *
 * @param raw - Parsed YAML output (typically from `yaml.parse`).
 * @returns The same value, narrowed to `SkillMatrix`.
 * @throws Error('Invalid skill-matrix.yaml: <reason>') on any shape violation.
 */
export function validateMatrix(raw: unknown): SkillMatrix {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
    throw new Error('Invalid skill-matrix.yaml: root must be a mapping with `version` and `tracks`.');
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj['version'] !== 'number') {
    throw new Error('Invalid skill-matrix.yaml: `version` must be a number.');
  }
  if (!Array.isArray(obj['tracks'])) {
    throw new Error('Invalid skill-matrix.yaml: `tracks` must be an array.');
  }

  const tracks: SkillTrack[] = [];
  const seenIds = new Set<string>();
  for (let i = 0; i < obj['tracks'].length; i += 1) {
    const t = obj['tracks'][i];
    if (!t || typeof t !== 'object' || Array.isArray(t)) {
      throw new Error(`Invalid skill-matrix.yaml: tracks[${i}] must be a mapping.`);
    }
    const track = t as Record<string, unknown>;
    const id = track['id'];
    const skill = track['skill'];
    const targets = track['targets'];
    const description = track['description'];
    const output = track['output'];
    const references = track['references'];

    if (typeof id !== 'string' || id.length === 0) {
      throw new Error(`Invalid skill-matrix.yaml: tracks[${i}].id must be a non-empty string.`);
    }
    if (seenIds.has(id)) {
      throw new Error(`Invalid skill-matrix.yaml: duplicate track id "${id}".`);
    }
    seenIds.add(id);
    if (typeof skill !== 'string' || skill.length === 0) {
      throw new Error(`Invalid skill-matrix.yaml: tracks[${i}].skill must be a non-empty string.`);
    }
    if (typeof targets !== 'string' || targets.length === 0) {
      throw new Error(`Invalid skill-matrix.yaml: tracks[${i}].targets must be a non-empty string.`);
    }
    if (typeof description !== 'string' || description.length === 0) {
      throw new Error(
        `Invalid skill-matrix.yaml: tracks[${i}].description must be a non-empty string.`,
      );
    }
    if (typeof output !== 'string' || output.length === 0) {
      throw new Error(`Invalid skill-matrix.yaml: tracks[${i}].output must be a non-empty string.`);
    }
    let refs: string[] | undefined;
    if (references !== undefined) {
      if (!Array.isArray(references) || references.some((r) => typeof r !== 'string')) {
        throw new Error(
          `Invalid skill-matrix.yaml: tracks[${i}].references must be an array of strings.`,
        );
      }
      refs = references as string[];
    }

    const built: SkillTrack = { id, skill, targets, description, output };
    if (refs !== undefined) built.references = refs;
    tracks.push(built);
  }

  return { version: obj['version'], tracks };
}
