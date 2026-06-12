import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

import { clientDir, configPath } from './client-config.js';

describe('clientDir / configPath slug validation', () => {
  it('builds paths for valid kebab slugs', () => {
    assert.equal(clientDir('wb-fixture', '/base'), join('/base', 'wb-fixture'));
    assert.equal(
      configPath('littlefriends', '/base'),
      join('/base', 'littlefriends', 'client-config.yaml'),
    );
  });

  it('rejects traversal and non-kebab slugs', () => {
    for (const slug of ['../etc', '..', 'a/b', 'Foo', '_smoke']) {
      assert.throws(() => clientDir(slug), /Invalid client slug/);
      assert.throws(() => configPath(slug), /Invalid client slug/);
    }
  });
});
