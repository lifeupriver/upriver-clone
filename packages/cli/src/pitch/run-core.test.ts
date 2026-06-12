import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ClientDataSource } from '@upriver/core/data';
import { buildPitchSteps, checkClobberGuard, seedProspectProfile } from './run-core.js';
import { PITCH_DOCS } from './teasers.js';

const NOW = '2026-06-12T00:00:00.000Z';

function memDs(files: Record<string, string>): { ds: ClientDataSource; files: Record<string, string> } {
  const store = { ...files };
  const ds = {
    fileExists: async (_s: string, p: string) => p in store,
    readClientFileText: async (_s: string, p: string) => store[p] ?? null,
    writeClientFile: async (_s: string, p: string, content: string) => {
      store[p] = content;
    },
  } as unknown as ClientDataSource;
  return { ds, files: store };
}

describe('buildPitchSteps', () => {
  const steps = buildPitchSteps('https://wildflour.example', 'wb');
  const byId = new Map(steps.map((s) => [s.id, s]));

  it('scopes the scrape to the homepage with a 1-page credit cap', () => {
    assert.deepEqual(byId.get('scrape')?.argv, ['scrape', 'wb', '--pages', '/', '--max-pages', '1']);
  });

  it('clones only the homepage, no PR, no verify loop', () => {
    assert.deepEqual(byId.get('clone')?.argv, ['clone', 'wb', '--page', '/', '--no-pr', '--no-verify']);
  });

  it('passes the URL only to init', () => {
    assert.deepEqual(byId.get('init')?.argv?.slice(0, 4), ['init', 'https://wildflour.example', '--slug', 'wb']);
  });

  it('generates all four teasers one by one', () => {
    for (const id of PITCH_DOCS) {
      assert.deepEqual(byId.get(id)?.argv, ['generate', 'wb', '--doc', id, '--yes']);
    }
  });

  it('orders costed steps: init-map, scrape-home before clone-home before teasers', () => {
    const costed = steps.filter((s) => s.costed).map((s) => s.costed);
    assert.deepEqual(costed, ['init-map', 'scrape-home', 'clone-home', 'teasers', 'teasers', 'teasers', 'teasers']);
  });

  it('runs fidelity scoring and the gate before staging and teasers', () => {
    const ids = steps.map((s) => s.id);
    assert.ok(ids.indexOf('fidelity') < ids.indexOf('stage'));
    assert.ok(ids.indexOf('stage') < ids.indexOf(PITCH_DOCS[0]!));
    assert.ok(ids.indexOf('share') > ids.indexOf('stage'));
    assert.equal(ids[ids.length - 1], 'email');
  });
});

describe('checkClobberGuard', () => {
  it('allows a fresh slug', async () => {
    const { ds } = memDs({});
    assert.equal(await checkClobberGuard(ds, 'wb', false), null);
  });

  it('allows re-running an existing prospect', async () => {
    const { ds } = memDs({ 'client-config.yaml': 'slug: wb\nstage: prospect\n' });
    assert.equal(await checkClobberGuard(ds, 'wb', false), null);
  });

  it('refuses a real client dir (stage missing or client) unless forced', async () => {
    for (const cfg of ['slug: wb\nname: X\n', 'slug: wb\nstage: client\n']) {
      const { ds } = memDs({ 'client-config.yaml': cfg });
      const refusal = await checkClobberGuard(ds, 'wb', false);
      assert.match(refusal ?? '', /client/i);
      assert.equal(await checkClobberGuard(ds, 'wb', true), null, 'forced');
    }
  });
});

describe('seedProspectProfile', () => {
  it('creates a minimal recon-sourced profile when none exists', async () => {
    const { ds, files } = memDs({});
    await seedProspectProfile(ds, 'wb', {
      name: 'Wildflour Bakery',
      url: 'https://wildflour.example',
      vertical: 'restaurant',
      now: NOW,
    });
    const profile = JSON.parse(files['profile.json'] ?? '{}');
    assert.equal(profile.identity.publicName.value, 'Wildflour Bakery');
    assert.equal(profile.identity.publicName.source, 'recon');
    assert.equal(profile.identity.publicName.verified, false);
    assert.equal(profile.identity.website.value, 'https://wildflour.example');
    assert.ok(profile.identity.category.value.length > 0);
  });

  it('never touches an existing profile', async () => {
    const existing = JSON.stringify({ _meta: { sentinel: true } });
    const { ds, files } = memDs({ 'profile.json': existing });
    await seedProspectProfile(ds, 'wb', { name: 'X', url: 'https://x.example', now: NOW });
    assert.equal(files['profile.json'], existing);
  });
});
