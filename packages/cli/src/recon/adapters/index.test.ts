import { test } from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_ADAPTER_IDS, RECON_ADAPTERS, selectAdapters } from './index.js';

test('the default run excludes secret-shopper', () => {
  assert.ok(!DEFAULT_ADAPTER_IDS.includes('secret-shopper'));
  assert.deepEqual(DEFAULT_ADAPTER_IDS, ['website', 'gbp', 'socials', 'geo', 'serp']);
  assert.equal(RECON_ADAPTERS.length, 5);
});

test('selectAdapters resolves ids in requested order', () => {
  const { adapters, unknown } = selectAdapters(['gbp', 'website']);
  assert.deepEqual(adapters.map((a) => a.id), ['gbp', 'website']);
  assert.deepEqual(unknown, []);
});

test('selectAdapters reports unknown ids (including secret-shopper)', () => {
  const { adapters, unknown } = selectAdapters(['website', 'bogus', 'secret-shopper']);
  assert.deepEqual(adapters.map((a) => a.id), ['website']);
  assert.deepEqual(unknown, ['bogus', 'secret-shopper']);
});
