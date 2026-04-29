import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

import { LocalFsClientDataSource } from './local-fs.js';

describe('LocalFsClientDataSource', () => {
  let baseDir: string;
  let ds: LocalFsClientDataSource;

  before(() => {
    baseDir = mkdtempSync(join(tmpdir(), 'upriver-data-'));
    mkdirSync(join(baseDir, 'foo'));
    writeFileSync(join(baseDir, 'foo', 'client-config.yaml'), 'slug: foo\n');
    mkdirSync(join(baseDir, 'foo', 'audit'));
    writeFileSync(join(baseDir, 'foo', 'audit', 'summary.json'), '{"overall":42}');
    writeFileSync(join(baseDir, 'foo', 'audit', 'pass-a.json'), '{}');
    // Slug without config — should be excluded from listClientSlugs.
    mkdirSync(join(baseDir, 'orphan'));
    ds = new LocalFsClientDataSource({ baseDir });
  });

  after(() => {
    rmSync(baseDir, { recursive: true, force: true });
  });

  it('lists slugs that have client-config.yaml', async () => {
    const slugs = await ds.listClientSlugs();
    assert.deepEqual(slugs.sort(), ['foo']);
  });

  it('reads file as text and bytes', async () => {
    const text = await ds.readClientFileText('foo', 'audit/summary.json');
    assert.equal(text, '{"overall":42}');
    const bytes = await ds.readClientFile('foo', 'audit/summary.json');
    assert.ok(bytes instanceof Uint8Array);
    assert.equal(bytes!.byteLength, 14);
  });

  it('returns null for missing files', async () => {
    assert.equal(await ds.readClientFileText('foo', 'missing.json'), null);
    assert.equal(await ds.readClientFile('foo', 'missing.json'), null);
    assert.equal(await ds.fileExists('foo', 'missing.json'), false);
  });

  it('lists files non-recursively in a subdir', async () => {
    const files = await ds.listClientFiles('foo', 'audit');
    assert.deepEqual(files.sort(), ['pass-a.json', 'summary.json']);
  });

  it('writes files and creates parent dirs', async () => {
    await ds.writeClientFile('foo', 'deeply/nested/file.txt', 'hello');
    assert.equal(await ds.readClientFileText('foo', 'deeply/nested/file.txt'), 'hello');
  });

  it('signClientFileUrl returns null on local fs', async () => {
    assert.equal(await ds.signClientFileUrl('foo', 'audit/summary.json', 60), null);
  });

  it('statClientFile reports size + mtime for sync diffing', () => {
    const s = ds.statClientFile('foo', 'audit/summary.json');
    assert.ok(s);
    assert.equal(s!.size, 14);
    assert.ok(s!.mtimeMs > 0);
  });
});
