import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { ClientDataSource } from '@upriver/core/data';
import { convertProspect } from './convert-core.js';

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

const prospectConfig = 'slug: wb\nname: Wildflour\nurl: https://wildflour.example\ncreated_at: "2026-06-12"\nstage: prospect\n';
const responses = JSON.stringify({
  _meta: { slug: 'wb' },
  answers: {
    'about-you-q3': 'owner@wildflour.example',
    'your-goals-q1': 'More wholesale accounts',
    'your-reaction-q1': 'Looks great',
  },
});

describe('convertProspect', () => {
  it('flips stage to client and seeds profile fields from answers', async () => {
    const { ds, files } = memDs({
      'client-config.yaml': prospectConfig,
      'interview-responses.json': responses,
    });
    const result = await convertProspect(ds, 'wb', { now: NOW });
    assert.equal(result.flipped, true);
    assert.equal(result.outcomes.filter((o) => o.kind === 'filled').length, 2);
    assert.match(files['client-config.yaml'] ?? '', /stage: client/);
    const profile = JSON.parse(files['profile.json'] ?? '{}');
    assert.equal(profile.identity?.email?.value, 'owner@wildflour.example');
    assert.equal(profile.identity?.email?.source, 'interview');
    assert.equal(profile.goals?.primaryOutcome?.value, 'More wholesale accounts');
  });

  it('refuses when there are no answers, unless --no-answers', async () => {
    const { ds } = memDs({ 'client-config.yaml': prospectConfig });
    await assert.rejects(convertProspect(ds, 'wb', { now: NOW }), /no-answers/i);
    const result = await convertProspect(ds, 'wb', { now: NOW, noAnswers: true });
    assert.equal(result.flipped, true);
    assert.equal(result.withoutAnswers, true);
  });

  it('is idempotent: a second convert neither flips nor errors', async () => {
    const { ds, files } = memDs({
      'client-config.yaml': prospectConfig,
      'interview-responses.json': responses,
    });
    await convertProspect(ds, 'wb', { now: NOW });
    const again = await convertProspect(ds, 'wb', { now: NOW });
    assert.equal(again.flipped, false);
    assert.match(files['client-config.yaml'] ?? '', /stage: client/);
  });

  it('errors cleanly when the client dir has no config', async () => {
    const { ds } = memDs({});
    await assert.rejects(convertProspect(ds, 'wb', { now: NOW }), /client-config/);
  });
});
