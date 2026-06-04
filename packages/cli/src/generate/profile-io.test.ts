import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalFsClientDataSource } from '@upriver/core/data';
import { createEmptyProfile, type ConflictEntry } from '@upriver/schemas';
import { readProfile, writeProfile, bumpMeta, appendConflicts, readConflicts } from './profile-io.js';

const NOW = '2026-06-04T12:00:00.000Z';
function ds(): LocalFsClientDataSource {
  return new LocalFsClientDataSource({ baseDir: mkdtempSync(join(tmpdir(), 'upriver-pio-')) });
}

test('writeProfile + readProfile round-trips and validates', async () => {
  const d = ds();
  await writeProfile(d, 'littlefriends', createEmptyProfile('littlefriends', NOW));
  const back = await readProfile(d, 'littlefriends');
  assert.equal(back?._meta.slug, 'littlefriends');
  assert.equal(back?._meta.revision, 0);
});

test('readProfile returns null when absent', async () => {
  assert.equal(await readProfile(ds(), 'nope'), null);
});

test('readProfile throws on invalid profile JSON', async () => {
  const d = ds();
  await d.writeClientFile('bad', 'profile.json', '{ "_meta": { "version": 2 } }');
  await assert.rejects(() => readProfile(d, 'bad'));
});

test('bumpMeta increments revision and sets updatedAt, leaving the original intact', () => {
  const p = createEmptyProfile('x', '2026-01-01T00:00:00.000Z');
  const b = bumpMeta(p, NOW);
  assert.equal(b._meta.revision, 1);
  assert.equal(b._meta.updatedAt, NOW);
  assert.equal(p._meta.revision, 0);
});

test('appendConflicts accumulates across calls', async () => {
  const d = ds();
  const c: ConflictEntry = {
    path: 'pricing.deposit',
    existing: { value: 'a', source: 'operator', confidence: 'high', verified: true, updatedAt: NOW },
    candidate: { value: 'b', source: 'recon' },
    queuedAt: NOW,
  };
  await appendConflicts(d, 's', [c]);
  await appendConflicts(d, 's', [{ ...c, path: 'pricing.shareable' }]);
  const all = await readConflicts(d, 's');
  assert.equal(all.length, 2);
  assert.equal(all[0]?.path, 'pricing.deposit');
  assert.equal(all[1]?.path, 'pricing.shareable');
});
