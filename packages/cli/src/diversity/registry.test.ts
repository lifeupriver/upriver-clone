import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseSiteRegistry, runnableSites, SITE_REGISTRY_VERSION } from './registry.js';

const VALID = JSON.stringify({
  v: 1,
  defaultBudgetUsd: 15,
  sites: [
    {
      id: 'fixture',
      platform: 'astro-fixture',
      url: 'https://upriver-wb-fixture.vercel.app',
      maxPages: 6,
      clonePages: ['/', '/about'],
      vertical: 'bakery',
      permission: 'owned',
      notes: '',
    },
    {
      id: 'wordpress-slot',
      platform: 'wordpress',
      url: null,
      maxPages: 8,
      clonePages: ['/'],
      vertical: null,
      permission: 'pending',
      notes: 'fill via config edit',
    },
  ],
});

describe('site registry (spec 18 §1)', () => {
  it('parses a valid v1 registry', () => {
    const reg = parseSiteRegistry(VALID);
    assert.equal(reg.v, SITE_REGISTRY_VERSION);
    assert.equal(reg.sites.length, 2);
    assert.equal(reg.defaultBudgetUsd, 15);
  });

  it('runnableSites excludes null-url and pending-permission slots', () => {
    const reg = parseSiteRegistry(VALID);
    const runnable = runnableSites(reg);
    assert.deepEqual(runnable.map((s) => s.id), ['fixture']);
  });

  it('a filled slot still pending permission is NOT runnable (owned/permissioned only)', () => {
    const reg = parseSiteRegistry(VALID);
    reg.sites[1]!.url = 'https://example-wp.test';
    assert.deepEqual(runnableSites(reg).map((s) => s.id), ['fixture']);
  });

  it('per-site budget falls back to defaultBudgetUsd', () => {
    const reg = parseSiteRegistry(VALID);
    const [fixture] = runnableSites(reg);
    assert.equal(fixture!.budgetUsd, 15);
  });

  it('an explicit per-site budget wins over the default', () => {
    const parsed = JSON.parse(VALID) as { sites: Array<Record<string, unknown>> };
    parsed.sites[0]!['budgetUsd'] = 9;
    const reg = parseSiteRegistry(JSON.stringify(parsed));
    assert.equal(runnableSites(reg)[0]!.budgetUsd, 9);
  });

  it('rejects duplicate ids loudly', () => {
    const parsed = JSON.parse(VALID) as { sites: Array<{ id: string }> };
    parsed.sites[1]!.id = 'fixture';
    assert.throws(() => parseSiteRegistry(JSON.stringify(parsed)), /duplicate/i);
  });

  it('rejects a foreign version loudly', () => {
    const parsed = JSON.parse(VALID) as { v: number };
    parsed.v = 99;
    assert.throws(() => parseSiteRegistry(JSON.stringify(parsed)), /version/i);
  });

  it('rejects a malformed url loudly', () => {
    const parsed = JSON.parse(VALID) as { sites: Array<{ url: string | null }> };
    parsed.sites[0]!.url = 'not a url';
    assert.throws(() => parseSiteRegistry(JSON.stringify(parsed)), /url/i);
  });
});
