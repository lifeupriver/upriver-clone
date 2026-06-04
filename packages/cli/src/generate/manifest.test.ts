import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { LocalFsClientDataSource } from '@upriver/core/data';
import type { DeliverableId } from '@upriver/schemas';
import {
  readManifest,
  writeManifest,
  upsertEntry,
  setApproved,
  generatedIds,
  hashContent,
  type Manifest,
  type ManifestEntry,
} from './manifest.js';

function ds(): LocalFsClientDataSource {
  return new LocalFsClientDataSource({ baseDir: mkdtempSync(join(tmpdir(), 'upriver-mf-')) });
}
const entry = (id: DeliverableId, approved = false): ManifestEntry => ({
  id,
  path: `docs/${id}.md`,
  generatedAt: 't',
  specHash: 's',
  profileSliceHash: 'p',
  markers: 0,
  approved,
});

test('manifest round-trips through the data source', async () => {
  const d = ds();
  const empty = await readManifest(d, 's');
  assert.deepEqual(empty.docs, {});
  await writeManifest(d, 's', upsertEntry(empty, entry('doc-01', true)));
  const back = await readManifest(d, 's');
  assert.equal(back.docs['doc-01']?.id, 'doc-01');
  assert.equal(back.docs['doc-01']?.approved, true);
});

test('generatedIds returns only approved entries', () => {
  let m: Manifest = { version: 1, docs: {} };
  m = upsertEntry(m, entry('doc-01', true));
  m = upsertEntry(m, entry('doc-02', false));
  assert.deepEqual(generatedIds(m), ['doc-01']);
});

test('setApproved flips approval immutably', () => {
  const m = upsertEntry({ version: 1, docs: {} }, entry('doc-01', false));
  const m2 = setApproved(m, 'doc-01', true);
  assert.equal(m.docs['doc-01']?.approved, false);
  assert.equal(m2.docs['doc-01']?.approved, true);
});

test('hashContent is stable, distinct, and short', () => {
  assert.equal(hashContent('x'), hashContent('x'));
  assert.notEqual(hashContent('x'), hashContent('y'));
  assert.equal(hashContent('x').length, 16);
});
