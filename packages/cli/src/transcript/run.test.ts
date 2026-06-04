import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProfile, type ClientProfile, type ProfileField } from '@upriver/schemas';
import type { ClientDataSource } from '@upriver/core/data';

import { runExtraction } from './run.js';
import type { ChunkCaller } from './extract.js';

const NOW = '2026-06-04T12:00:00.000Z';

class MemoryDataSource implements ClientDataSource {
  readonly kind = 'memory';
  files = new Map<string, string>();
  private key(slug: string, path: string): string {
    return `${slug}/${path}`;
  }
  async listClientSlugs(): Promise<string[]> {
    return [];
  }
  async fileExists(slug: string, path: string): Promise<boolean> {
    return this.files.has(this.key(slug, path));
  }
  async readClientFile(): Promise<Uint8Array | null> {
    return null;
  }
  async readClientFileText(slug: string, path: string): Promise<string | null> {
    return this.files.get(this.key(slug, path)) ?? null;
  }
  async writeClientFile(slug: string, path: string, body: Uint8Array | string): Promise<void> {
    this.files.set(this.key(slug, path), typeof body === 'string' ? body : Buffer.from(body).toString('utf8'));
  }
  async listClientFiles(): Promise<string[]> {
    return [];
  }
  async signClientFileUrl(): Promise<string | null> {
    return null;
  }
}

const RAW = [
  'Owner: Families typically wait about eight weeks for a spot.',
  'Owner: We also take card payments now.',
  'Owner: We run a summer reading club with the town library.',
].join('\n\n');

const op = (value: unknown): ProfileField<unknown> => ({ value, source: 'operator', confidence: 'low', verified: false, updatedAt: NOW });

function existingProfile(): ClientProfile {
  const p = createEmptyProfile('littlefriends', NOW) as unknown as Record<string, unknown>;
  p['governance'] = { regulatedData: op(['PII']) };
  p['modules'] = { preschool: {} };
  return p as unknown as ClientProfile;
}

const call: ChunkCaller = async () =>
  JSON.stringify({
    candidates: [
      { path: 'capacity.bookingLeadTime', value: { typical: 'about eight weeks' }, quote: 'Families typically wait about eight weeks for a spot.', confidence: 'medium' },
      { path: 'governance.regulatedData', value: ['Card payment data'], quote: 'We also take card payments now.', confidence: 'low' },
    ],
    unmapped: [{ topic: 'summer reading club', quote: 'We run a summer reading club with the town library.' }],
  });

function baseInput(ds: ClientDataSource, overrides: Partial<Parameters<typeof runExtraction>[0]> = {}) {
  return {
    slug: 'littlefriends',
    file: 'littlefriends-session.txt',
    rawText: RAW,
    existing: existingProfile(),
    ds,
    now: NOW,
    model: 'sonnet',
    call,
    dryRun: false,
    keepTranscript: false,
    ...overrides,
  };
}

test('runExtraction applies an empty HV field and queues the operator contradiction', async () => {
  const ds = new MemoryDataSource();
  const r = await runExtraction(baseInput(ds));
  assert.ok(r.merge.applied.includes('capacity.bookingLeadTime'));
  assert.equal(r.merge.conflicts.length, 1);
  assert.equal(r.merge.conflicts[0]?.path, 'governance.regulatedData');
  assert.equal(r.provenance.summary.unmapped, 1);
});

test('runExtraction writes profile, conflicts and the provenance artifact (not dry-run)', async () => {
  const ds = new MemoryDataSource();
  await runExtraction(baseInput(ds));
  assert.ok(ds.files.has('littlefriends/profile.json'));
  assert.ok(ds.files.has('littlefriends/profile-conflicts.json'));
  assert.ok(ds.files.has('littlefriends/transcripts/littlefriends-session-extraction.json'));
  // raw transcript NOT copied by default
  assert.ok(!ds.files.has('littlefriends/transcripts/littlefriends-session.txt'));
});

test('--dry-run writes absolutely nothing', async () => {
  const ds = new MemoryDataSource();
  const r = await runExtraction(baseInput(ds, { dryRun: true }));
  assert.equal(ds.files.size, 0);
  // still computes the full report/provenance for display
  assert.ok(r.merge.applied.includes('capacity.bookingLeadTime'));
});

test('--keep-transcript copies the raw transcript into the client dir', async () => {
  const ds = new MemoryDataSource();
  await runExtraction(baseInput(ds, { keepTranscript: true }));
  assert.equal(ds.files.get('littlefriends/transcripts/littlefriends-session.txt'), RAW);
});

test('the persisted profile bumps revision and keeps capacity.bookingLeadTime unverified', async () => {
  const ds = new MemoryDataSource();
  await runExtraction(baseInput(ds));
  const written = JSON.parse(ds.files.get('littlefriends/profile.json') as string) as ClientProfile;
  assert.equal(written._meta.revision, existingProfile()._meta.revision + 1);
  const env = (written as unknown as { capacity: { bookingLeadTime: ProfileField<unknown> } }).capacity.bookingLeadTime;
  assert.equal(env.verified, false);
  assert.equal(env.source, 'transcript');
});
