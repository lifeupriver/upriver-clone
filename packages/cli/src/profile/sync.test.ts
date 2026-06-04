import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ClientDataSource } from '@upriver/core/data';
import {
  createEmptyProfile,
  type ClientProfile,
  type ProfileField,
  type Source,
} from '@upriver/schemas';
import { readConflicts, readProfile, writeProfile } from '../generate/profile-io.js';
import { readManifest, writeManifest, type Manifest } from '../generate/manifest.js';
import { syncProfile } from './sync.js';

const NOW = '2026-06-04T12:00:00.000Z';
const LATER = '2026-06-05T09:00:00.000Z';

function env<T>(value: T | null, source: Source = 'operator', verified = false): ProfileField<T> {
  return { value, source, confidence: null, verified, updatedAt: NOW };
}
/* eslint-disable @typescript-eslint/no-explicit-any */
function profileWith(fields: Record<string, unknown>): ClientProfile {
  const p = createEmptyProfile('littlefriends', NOW) as any;
  p._meta.revision = 1;
  for (const [path, v] of Object.entries(fields)) {
    const segs = path.split('.');
    let cur: any = p;
    for (let i = 0; i < segs.length - 1; i++) {
      const k = segs[i] as string;
      cur[k] ??= {};
      cur = cur[k];
    }
    cur[segs[segs.length - 1] as string] = v;
  }
  return p as ClientProfile;
}
const valAt = (p: ClientProfile, path: string): unknown => {
  let cur: any = p;
  for (const s of path.split('.')) cur = cur?.[s];
  return cur;
};
/* eslint-enable @typescript-eslint/no-explicit-any */

function makeMemDs(kind: string): ClientDataSource {
  const files = new Map<string, string>();
  const key = (slug: string, path: string): string => `${slug}/${path}`;
  return {
    kind,
    async listClientSlugs() {
      return [];
    },
    async fileExists(slug, path) {
      return files.has(key(slug, path));
    },
    async readClientFile(slug, path) {
      const t = files.get(key(slug, path));
      return t == null ? null : new TextEncoder().encode(t);
    },
    async readClientFileText(slug, path) {
      return files.get(key(slug, path)) ?? null;
    },
    async writeClientFile(slug, path, body) {
      files.set(key(slug, path), typeof body === 'string' ? body : new TextDecoder().decode(body));
    },
    async listClientFiles(slug, dir) {
      const prefix = `${slug}/${dir.replace(/\/+$/, '')}/`;
      const names = new Set<string>();
      for (const k of files.keys()) {
        if (k.startsWith(prefix)) {
          const rest = k.slice(prefix.length);
          if (!rest.includes('/')) names.add(rest);
        }
      }
      return [...names];
    },
    async signClientFileUrl() {
      return null;
    },
  };
}

test('syncProfile pull: merges remote into local, queueing conflicts (never overwriting verified)', async () => {
  const local = makeMemDs('local');
  const remote = makeMemDs('supabase');
  // local has a verified operator value; remote disagrees with a recon value (→ conflict)
  await writeProfile(local, 'littlefriends', profileWith({ 'pricing.deposit': env('local verified', 'operator', true) }));
  // remote also carries a brand-new field (→ applies)
  await writeProfile(
    remote,
    'littlefriends',
    profileWith({ 'pricing.deposit': env('remote guess', 'recon'), 'goals.primaryOutcome': env('grow', 'recon') }),
  );

  const result = await syncProfile('pull', 'littlefriends', { local, remote }, LATER);

  assert.equal(result.direction, 'pull');
  assert.equal(result.mode, 'merged');
  assert.equal(result.applied, 1, 'goals.primaryOutcome applied');
  assert.equal(result.conflicts.length, 1, 'pricing.deposit conflicts');
  assert.equal(result.conflicts[0]?.path, 'pricing.deposit');

  // local kept its verified value, gained the new field, and queued the conflict
  const merged = await readProfile(local, 'littlefriends');
  assert.equal((valAt(merged!, 'pricing.deposit') as ProfileField<string>).value, 'local verified');
  assert.equal((valAt(merged!, 'goals.primaryOutcome') as ProfileField<string>).value, 'grow');
  const queued = await readConflicts(local, 'littlefriends');
  assert.equal(queued.length, 1);
});

test('syncProfile pull: an absent destination profile is created from the source', async () => {
  const local = makeMemDs('local');
  const remote = makeMemDs('supabase');
  await writeProfile(remote, 'littlefriends', profileWith({ 'identity.publicName': env('LF') }));

  const result = await syncProfile('pull', 'littlefriends', { local, remote }, LATER);
  assert.equal(result.mode, 'created');
  const created = await readProfile(local, 'littlefriends');
  assert.equal((valAt(created!, 'identity.publicName') as ProfileField<string>).value, 'LF');
});

test('syncProfile push: pushes local into remote (direction reversed)', async () => {
  const local = makeMemDs('local');
  const remote = makeMemDs('supabase');
  await writeProfile(remote, 'littlefriends', profileWith({ 'identity.publicName': env('LF') }));
  await writeProfile(local, 'littlefriends', profileWith({ 'identity.publicName': env('LF'), 'goals.primaryOutcome': env('grow') }));

  const result = await syncProfile('push', 'littlefriends', { local, remote }, LATER);
  assert.equal(result.direction, 'push');
  assert.equal(result.applied, 1);
  const pushed = await readProfile(remote, 'littlefriends');
  assert.equal((valAt(pushed!, 'goals.primaryOutcome') as ProfileField<string>).value, 'grow');
});

test('syncProfile: manifest is copied source-wins (divergence flagged); generated docs are not synced', async () => {
  const local = makeMemDs('local');
  const remote = makeMemDs('supabase');
  await writeProfile(local, 'littlefriends', profileWith({ 'identity.publicName': env('LF') }));
  await writeProfile(remote, 'littlefriends', profileWith({ 'identity.publicName': env('LF') }));

  const remoteManifest: Manifest = {
    version: 1,
    docs: {
      'doc-01': { id: 'doc-01', path: 'docs/doc-01.md', generatedAt: NOW, specHash: 'a', profileSliceHash: 'b', markers: 0, approved: true },
    },
  };
  await writeManifest(remote, 'littlefriends', remoteManifest);
  await remote.writeClientFile('littlefriends', 'docs/doc-01.md', '# doc');
  await remote.writeClientFile('littlefriends', 'docs/doc-02.md', '# doc');
  // local has none

  const result = await syncProfile('pull', 'littlefriends', { local, remote }, LATER);
  assert.equal(result.manifest, 'diverged-copied');
  assert.equal(result.docCount.source, 2);
  assert.equal(result.docCount.dest, 0);

  // manifest now present locally (source won)
  const localManifest = await readManifest(local, 'littlefriends');
  assert.ok(localManifest.docs['doc-01']);
  // but generated .md doc files were NOT copied (only the manifest is synced)
  const localDocs = await local.listClientFiles('littlefriends', 'docs');
  assert.equal(localDocs.filter((f) => f.endsWith('.md')).length, 0);
});

test('syncProfile pull: throws when the source has no profile', async () => {
  const local = makeMemDs('local');
  const remote = makeMemDs('supabase');
  await assert.rejects(() => syncProfile('pull', 'littlefriends', { local, remote }, LATER), /no profile/i);
});
