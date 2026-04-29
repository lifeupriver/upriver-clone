import { strict as assert } from 'node:assert';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it } from 'node:test';

import { PNG } from 'pngjs';

import {
  computeCopyScore,
  computePixelScore,
  tokenize,
} from './fidelity-scorer.js';

/**
 * Produce a 4x4 solid-color PNG buffer (RGBA), optionally toggling one pixel
 * to a different color so the diff has a known differing-pixel count.
 */
function makeSolidPng(
  color: [number, number, number],
  altPixel: { x: number; y: number; color: [number, number, number] } | null,
): Buffer {
  const png = new PNG({ width: 4, height: 4 });
  for (let y = 0; y < 4; y += 1) {
    for (let x = 0; x < 4; x += 1) {
      const idx = (y * 4 + x) * 4;
      const c =
        altPixel && altPixel.x === x && altPixel.y === y ? altPixel.color : color;
      png.data[idx] = c[0];
      png.data[idx + 1] = c[1];
      png.data[idx + 2] = c[2];
      png.data[idx + 3] = 255;
    }
  }
  return PNG.sync.write(png);
}

describe('tokenize', () => {
  it('returns expected tokens (3+ chars, alphanumeric only, lowercased)', () => {
    const set = tokenize("Hello world! Welcome to Audrey's farmhouse.");
    assert.equal(set.has('hello'), true);
    assert.equal(set.has('world'), true);
    assert.equal(set.has('welcome'), true);
    assert.equal(set.has('audrey'), true);
    assert.equal(set.has('farmhouse'), true);
    // 'to' is dropped (length < 3); apostrophe splits "audrey" off "s".
    assert.equal(set.has('to'), false);
    assert.equal(set.has('s'), false);
    assert.equal(set.size, 5);
  });

  it('returns empty set for empty input', () => {
    assert.equal(tokenize('').size, 0);
  });
});

describe('computeCopyScore', () => {
  it('scores 50 when half of live tokens appear in clone', () => {
    const result = computeCopyScore('alpha bravo charlie delta', 'bravo charlie');
    assert.equal(result.liveTokens, 4);
    assert.equal(result.cloneTokens, 2);
    assert.equal(result.sharedTokens, 2);
    assert.equal(result.score, 50);
    assert.equal(result.missingFromClone.includes('alpha'), true);
    assert.equal(result.missingFromClone.includes('delta'), true);
  });

  it('scores 100 when clone covers all live tokens', () => {
    const result = computeCopyScore('alpha bravo', 'alpha bravo charlie');
    assert.equal(result.score, 100);
    assert.equal(result.missingFromClone.length, 0);
  });
});

describe('computePixelScore', () => {
  it('counts a single differing pixel in two 4x4 PNGs', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fidelity-pixel-'));
    const livePath = join(dir, 'live.png');
    const clonePath = join(dir, 'clone.png');
    const diffPath = join(dir, 'diff.png');

    writeFileSync(livePath, makeSolidPng([255, 0, 0], null));
    writeFileSync(
      clonePath,
      makeSolidPng([255, 0, 0], { x: 0, y: 0, color: [0, 0, 255] }),
    );

    const result = await computePixelScore(livePath, clonePath, diffPath);
    assert.equal(result.totalPixels, 16);
    assert.equal(result.differingPixels, 1);
    assert.equal(result.matchedPixels, 15);
    assert.equal(result.score, 94);
    assert.equal(result.diffPath, diffPath);
  });

  it('returns score 0 with null diffPath when one side missing', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'fidelity-pixel-missing-'));
    const livePath = join(dir, 'live.png');
    const clonePath = join(dir, 'no-such-file.png');
    const diffPath = join(dir, 'diff.png');

    writeFileSync(livePath, makeSolidPng([255, 0, 0], null));

    const result = await computePixelScore(livePath, clonePath, diffPath);
    assert.equal(result.score, 0);
    assert.equal(result.diffPath, null);
    assert.equal(result.totalPixels, 0);
  });
});
