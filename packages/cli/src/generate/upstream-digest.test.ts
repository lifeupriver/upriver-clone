import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import type { DeliverableId } from '@upriver/schemas';
import { LocalFsClientDataSource } from '@upriver/core/data';

import {
  buildUpstreamDigest,
  countWords,
  extractDigest,
  DIGEST_MAX_CHARS,
  DIGEST_MAX_WORDS,
} from './upstream-digest.js';
import { readManifest, upsertEntry, writeManifest, type ManifestEntry } from './manifest.js';

const NOW = '2026-06-08T00:00:00.000Z';

test('extractDigest keeps headings and list items but drops post-lede prose', () => {
  const md = [
    '# Brand Voice',
    '',
    'This is the lede sentence. This trailing sentence must be dropped.',
    'A second body line is also dropped.',
    '',
    '## Question list',
    '- What are your hours?',
    '- Do you offer tours?',
    '1. First numbered item',
  ].join('\n');

  const d = extractDigest(md);

  assert.match(d, /# Brand Voice/);
  assert.match(d, /## Question list/);
  assert.match(d, /What are your hours\?/);
  assert.match(d, /Do you offer tours\?/);
  assert.match(d, /First numbered item/);
  assert.match(d, /This is the lede sentence\./);
  assert.doesNotMatch(d, /must be dropped/);
  assert.doesNotMatch(d, /also dropped/);
});

test('extractDigest caps a long doc under the word and char limits', () => {
  const items = Array.from(
    { length: 4000 },
    (_, i) => `- item ${i} described with several extra words to add some length here`,
  ).join('\n');
  const md = `# Big list\n\n${items}`;

  const d = extractDigest(md);

  assert.ok(d.length <= DIGEST_MAX_CHARS, `digest ${d.length} chars must be <= ${DIGEST_MAX_CHARS}`);
  assert.ok(countWords(d) <= DIGEST_MAX_WORDS, `digest ${countWords(d)} words must be <= ${DIGEST_MAX_WORDS}`);
  // It should still carry real content, not be empty.
  assert.match(d, /# Big list/);
  assert.match(d, /- item 0 /);
});

test('extractDigest is deterministic for a fixed input', () => {
  const md = '# A\n\nLede one. Trailing.\n\n## B\n- x\n- y\n\nLede two. Trailing.\n';
  assert.equal(extractDigest(md), extractDigest(md));
});

test('countWords counts whitespace-separated tokens', () => {
  assert.equal(countWords('one two three'), 3);
  assert.equal(countWords('  '), 0);
  assert.equal(countWords('single'), 1);
});

function ds(): LocalFsClientDataSource {
  return new LocalFsClientDataSource({ baseDir: mkdtempSync(join(tmpdir(), 'upriver-digest-ds-')) });
}

async function seedDoc(d: LocalFsClientDataSource, id: DeliverableId, path: string, content: string): Promise<void> {
  await d.writeClientFile('lf', path, content);
  const entry: ManifestEntry = {
    id,
    path,
    generatedAt: NOW,
    specHash: 'sh',
    profileSliceHash: 'ph',
    markers: 0,
    approved: true,
  };
  const m = upsertEntry(await readManifest(d, 'lf'), entry);
  await writeManifest(d, 'lf', m);
}

const LONG_DOC = ['# FAQ', '', 'Welcome lede. Extra.', '', '## Questions', '- Q1?', '- Q2?'].join('\n');

test('buildUpstreamDigest resolves title from the coverage map and writes a cache file', async () => {
  const d = ds();
  await seedDoc(d, 'doc-07', 'docs/doc-07-faq-bank.md', LONG_DOC);

  const r = await buildUpstreamDigest('lf', 'doc-07', d);

  assert.equal(r.id, 'doc-07');
  assert.equal(r.title, 'FAQ Bank');
  assert.ok(r.digest.length > 0);
  assert.ok(r.sourceWords > 0);
  assert.match(r.digest, /## Questions/);
  assert.equal(await d.fileExists('lf', 'docs/.digests/doc-07.md'), true);
});

test('buildUpstreamDigest reuses the cache when the upstream hash is unchanged', async () => {
  const d = ds();
  await seedDoc(d, 'doc-07', 'docs/doc-07-faq-bank.md', LONG_DOC);
  await buildUpstreamDigest('lf', 'doc-07', d); // writes cache

  // Overwrite the cache BODY (keep the hash header line) with a sentinel.
  const cached = (await d.readClientFileText('lf', 'docs/.digests/doc-07.md')) ?? '';
  const headerLine = cached.split('\n')[0] ?? '';
  assert.match(headerLine, /hash=/);
  await d.writeClientFile('lf', 'docs/.digests/doc-07.md', `${headerLine}\nSENTINEL CACHED BODY`);

  const r = await buildUpstreamDigest('lf', 'doc-07', d);
  assert.equal(r.digest, 'SENTINEL CACHED BODY', 'unchanged hash must reuse the cached digest');
});

test('buildUpstreamDigest recomputes when the upstream content changes', async () => {
  const d = ds();
  await seedDoc(d, 'doc-07', 'docs/doc-07-faq-bank.md', LONG_DOC);
  await buildUpstreamDigest('lf', 'doc-07', d);
  const cached = (await d.readClientFileText('lf', 'docs/.digests/doc-07.md')) ?? '';
  const headerLine = cached.split('\n')[0] ?? '';
  await d.writeClientFile('lf', 'docs/.digests/doc-07.md', `${headerLine}\nSENTINEL CACHED BODY`);

  // Change the source doc → hash differs → must recompute (not the sentinel).
  await d.writeClientFile('lf', 'docs/doc-07-faq-bank.md', `${LONG_DOC}\n- Q3 newly added?`);
  const r = await buildUpstreamDigest('lf', 'doc-07', d);

  assert.notEqual(r.digest, 'SENTINEL CACHED BODY');
  assert.match(r.digest, /Q3 newly added/);
});
