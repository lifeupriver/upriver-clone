import { test } from 'node:test';
import assert from 'node:assert/strict';

import { assertIngestable, detectFormat, ingestTranscript, stripCues } from './ingest.js';

test('detectFormat recognizes supported extensions and rejects others', () => {
  assert.equal(detectFormat('session.txt'), 'txt');
  assert.equal(detectFormat('NOTES.MD'), 'md');
  assert.equal(detectFormat('/abs/path/recording.vtt'), 'vtt');
  assert.equal(detectFormat('caps.srt'), 'srt');
  assert.throws(() => detectFormat('audio.mp3'), /unsupported transcript format/i);
});

test('stripCues removes WEBVTT header, timestamps, NOTE and cue-settings but keeps speech + speaker labels', () => {
  const vtt = [
    'WEBVTT',
    '',
    'NOTE recorded 2026-06-01',
    '',
    '1',
    '00:00:01.000 --> 00:00:04.000 align:start position:0%',
    'Owner: We opened the Loft six years ago.',
    '',
    '00:00:04.500 --> 00:00:07.000',
    'Joshua: And how many kids can you take?',
    '',
  ].join('\n');
  const out = stripCues(vtt, 'vtt');
  assert.ok(!/WEBVTT/.test(out));
  assert.ok(!/-->/.test(out));
  assert.ok(!/NOTE recorded/.test(out));
  assert.ok(!/align:start/.test(out));
  assert.ok(/Owner: We opened the Loft six years ago\./.test(out));
  assert.ok(/Joshua: And how many kids can you take\?/.test(out));
});

test('stripCues removes SRT numeric indices and timestamps but keeps speech', () => {
  const srt = [
    '1',
    '00:00:01,000 --> 00:00:04,000',
    'Owner: Our license is for sixteen children.',
    '',
    '2',
    '00:00:04,500 --> 00:00:07,000',
    'Owner: We never do drop-in care.',
    '',
  ].join('\n');
  const out = stripCues(srt, 'srt');
  assert.ok(!/-->/.test(out));
  assert.ok(!/^\s*1\s*$/m.test(out));
  assert.ok(/Our license is for sixteen children\./.test(out));
  assert.ok(/We never do drop-in care\./.test(out));
});

test('stripCues leaves plain txt/md untouched', () => {
  const txt = 'Owner: Hello.\n\nJoshua: Hi there.';
  assert.equal(stripCues(txt, 'txt'), txt);
});

test('chunking keeps a short transcript as a single chunk', () => {
  const { chunks } = ingestTranscript('Owner: short.\n\nJoshua: ok.', 'a.txt');
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0]?.index, 0);
});

test('overlapping chunks make a boundary paragraph appear in two chunks', () => {
  // Force a split with a tiny maxChars and craft a unique sentinel near the boundary.
  const paras: string[] = [];
  for (let i = 0; i < 6; i++) paras.push(`Speaker ${i}: ${'x'.repeat(40)}`);
  const SENTINEL = 'Owner: UNIQUE-BOUNDARY-FACT licensed for sixteen children.';
  paras.splice(3, 0, SENTINEL); // place the sentinel mid-stream
  const text = paras.join('\n\n');

  const { chunks } = ingestTranscript(text, 'a.txt', { maxChars: 120, overlapChars: 80 });
  assert.ok(chunks.length >= 2, `expected a split, got ${chunks.length}`);

  const hits = chunks.filter((c) => c.text.includes(SENTINEL)).length;
  assert.ok(hits >= 2, `sentinel should span two overlapping chunks, appeared in ${hits}`);

  // Every chunk respects the cap except a lone oversized paragraph.
  for (const c of chunks) assert.ok(c.text.length <= 120 + SENTINEL.length);
});

test('assertIngestable rejects empty and binary input', () => {
  assert.throws(() => assertIngestable('   \n  '), /empty/i);
  assert.throws(() => assertIngestable('text with a \u0000 null byte'), /binary/i);
  assert.doesNotThrow(() => assertIngestable('Owner: hello.'));
});

test('a single paragraph larger than maxChars is emitted without dropping content', () => {
  const big = 'Owner: ' + 'y'.repeat(500);
  const { chunks } = ingestTranscript(big, 'a.txt', { maxChars: 100, overlapChars: 20 });
  assert.ok(chunks.length >= 1);
  assert.ok(chunks.map((c) => c.text).join('').includes('y'.repeat(500)));
});
