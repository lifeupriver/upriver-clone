import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { loadSkillMatrix, skillExists, validateMatrix } from './matrix-loader.js';

// Tests assume cwd is the monorepo root (this is how `pnpm --filter @upriver/cli run test`
// invokes node --test from packages/cli, so we walk up two segments to find the repo root
// for skill-existence checks). The repo root contains `.agents/skills/copywriting/`.
const REPO_ROOT_FROM_CLI = process.cwd().endsWith('/packages/cli')
  ? `${process.cwd()}/../..`
  : process.cwd();

describe('matrix-loader', () => {
  describe('loadSkillMatrix', () => {
    it('loads the bundled matrix with at least 6 tracks', () => {
      const matrix = loadSkillMatrix();
      assert.equal(typeof matrix.version, 'number');
      assert.ok(matrix.tracks.length >= 6, `expected >=6 tracks, got ${matrix.tracks.length}`);
      for (const t of matrix.tracks) {
        assert.ok(t.id && t.id.length > 0, `track has empty id: ${JSON.stringify(t)}`);
        assert.ok(t.skill && t.skill.length > 0, `track ${t.id} has empty skill`);
        assert.ok(t.targets && t.targets.length > 0, `track ${t.id} has empty targets`);
        assert.ok(t.description && t.description.length > 0, `track ${t.id} has empty description`);
        assert.ok(t.output && t.output.length > 0, `track ${t.id} has empty output`);
      }
    });
  });

  describe('validateMatrix', () => {
    it('throws on empty object', () => {
      assert.throws(() => validateMatrix({}), /Invalid skill-matrix\.yaml/);
    });

    it('accepts an empty tracks list as valid', () => {
      const result = validateMatrix({ version: 1, tracks: [] });
      assert.deepEqual(result, { version: 1, tracks: [] });
    });

    it('throws on duplicate track ids', () => {
      assert.throws(
        () =>
          validateMatrix({
            version: 1,
            tracks: [
              { id: 'a', skill: 's', targets: 't', description: 'd', output: 'o' },
              { id: 'a', skill: 's', targets: 't', description: 'd', output: 'o' },
            ],
          }),
        /duplicate track id/,
      );
    });

    it('throws on missing required fields', () => {
      assert.throws(
        () => validateMatrix({ version: 1, tracks: [{ id: 'x' }] }),
        /tracks\[0\]\.skill/,
      );
    });

    it('accepts optional references array', () => {
      const result = validateMatrix({
        version: 1,
        tracks: [
          {
            id: 'a',
            skill: 's',
            targets: 't',
            description: 'd',
            output: 'o',
            references: ['ref1', 'ref2'],
          },
        ],
      });
      assert.deepEqual(result.tracks[0]?.references, ['ref1', 'ref2']);
    });
  });

  describe('skillExists', () => {
    it('returns false for a clearly missing skill', () => {
      assert.equal(skillExists('definitely-not-a-real-skill-xyz', REPO_ROOT_FROM_CLI), false);
    });

    it('returns true for a present skill (copywriting) reachable from repo root', () => {
      assert.equal(skillExists('copywriting', REPO_ROOT_FROM_CLI), true);
    });
  });
});
