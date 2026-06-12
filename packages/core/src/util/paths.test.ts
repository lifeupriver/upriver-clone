import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { assertSafeSlug } from './paths.js';

describe('assertSafeSlug', () => {
  it('returns valid kebab-case slugs unchanged', () => {
    for (const slug of ['foo', 'wb-fixture', 'littlefriends', 'a1', '0day', 'x-y-z-9']) {
      assert.equal(assertSafeSlug(slug), slug);
    }
  });

  it('rejects traversal and separator characters', () => {
    for (const slug of ['..', '../etc', 'a/../b', 'a/b', 'a\\b', '.', './a']) {
      assert.throws(() => assertSafeSlug(slug), /Invalid client slug/);
    }
  });

  it('rejects uppercase, underscores, leading hyphen, and empty', () => {
    for (const slug of ['Foo', 'a_b', '-leading', '', ' foo', 'foo ', '_smoke']) {
      assert.throws(() => assertSafeSlug(slug), /Invalid client slug/);
    }
  });
});
