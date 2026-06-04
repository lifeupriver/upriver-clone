import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { ClientDataSource } from '@upriver/core/data';
import type { ConflictEntry } from '@upriver/schemas';
import { readConflicts } from '../generate/profile-io.js';
import { writeConflicts } from './io.js';

const NOW = '2026-06-04T12:00:00.000Z';

function makeMemDs(): ClientDataSource {
  const files = new Map<string, string>();
  const key = (slug: string, path: string): string => `${slug}/${path}`;
  return {
    kind: 'memory',
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
    async listClientFiles() {
      return [];
    },
    async signClientFileUrl() {
      return null;
    },
  };
}

const conflict = (path: string): ConflictEntry => ({
  path,
  existing: { value: 'x', source: 'operator', confidence: null, verified: true, updatedAt: NOW },
  candidate: { value: 'y', source: 'recon' },
  queuedAt: NOW,
});

test('writeConflicts overwrites the queue and round-trips through readConflicts', async () => {
  const ds = makeMemDs();
  await writeConflicts(ds, 'lf', [conflict('pricing.deposit'), conflict('capacity.metrics')]);
  let back = await readConflicts(ds, 'lf');
  assert.equal(back.length, 2);
  assert.equal(back[0]?.path, 'pricing.deposit');

  // overwrite (not append) with a trimmed queue
  await writeConflicts(ds, 'lf', [conflict('capacity.metrics')]);
  back = await readConflicts(ds, 'lf');
  assert.equal(back.length, 1);
  assert.equal(back[0]?.path, 'capacity.metrics');
});
