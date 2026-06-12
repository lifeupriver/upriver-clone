import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { join } from 'node:path';

import { clientDir, configPath } from './client-config.js';
import { ClientConfigZ } from '../types/client-config-zod.js';

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

describe('ClientConfigZ — optional pricing tiers', () => {
  const base = {
    slug: 'acme-co',
    name: 'Acme Co',
    url: 'https://acme.example',
    created_at: '2026-01-01',
  };

  it('accepts a config without pricing (backward compatible)', () => {
    const parsed = ClientConfigZ.parse(base);
    assert.equal(parsed.pricing, undefined);
  });

  it('accepts well-formed pricing tiers', () => {
    const pricing = [
      { name: 'Polish', price: '$2,800', scope: '2-week project', description: 'Fix the criticals.' },
    ];
    const parsed = ClientConfigZ.parse({ ...base, pricing });
    assert.deepEqual(parsed.pricing, pricing);
  });

  it('rejects malformed pricing tiers (missing/empty name or price)', () => {
    assert.equal(
      ClientConfigZ.safeParse({
        ...base,
        pricing: [{ name: '', price: '$1', scope: 'x', description: 'y' }],
      }).success,
      false,
    );
    assert.equal(
      ClientConfigZ.safeParse({
        ...base,
        pricing: [{ name: 'No price', scope: 'x', description: 'y' }],
      }).success,
      false,
    );
  });
});
