import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  LOCK_TTL_MS,
  buildSyncLock,
  buildSyncManifest,
  diffForPush,
  isSyncMetaPath,
  lockBlocks,
  parseSyncLock,
  parseSyncManifest,
  removeBucketObjects,
  sha256Hex,
} from './sync-state.js';

// run-stage's pull/push coherency rests on this module: what gets uploaded,
// what gets deleted, and when a concurrent pull is refused. These tests pin
// that contract with no fs or storage in the loop.

// ---- hashing ---------------------------------------------------------------

test('sha256Hex is stable and content-addressed', () => {
  const a = sha256Hex('hello');
  assert.equal(a, sha256Hex(new TextEncoder().encode('hello')));
  assert.equal(a.length, 64);
  assert.notEqual(a, sha256Hex('hello!'));
});

// ---- push diffing ----------------------------------------------------------

test('diffForPush uploads new and changed files, skips unchanged', () => {
  const pulled = { 'audit/summary.json': 'aaa', 'client-config.yaml': 'bbb' };
  const local = {
    'audit/summary.json': 'aaa', // untouched
    'client-config.yaml': 'ccc', // edited by the CLI
    'monitoring/2026-06-12.json': 'ddd', // brand new
  };
  const plan = diffForPush(pulled, local);
  assert.deepEqual(plan.upload, ['client-config.yaml', 'monitoring/2026-06-12.json']);
  assert.deepEqual(plan.unchanged, ['audit/summary.json']);
  assert.deepEqual(plan.remove, []);
});

test('diffForPush deletes bucket files that disappeared locally', () => {
  const pulled = { 'a.json': '1', 'old/stale.html': '2' };
  const local = { 'a.json': '1' };
  const plan = diffForPush(pulled, local);
  assert.deepEqual(plan.remove, ['old/stale.html']);
});

test('diffForPush without a pull baseline uploads everything and deletes nothing', () => {
  const local = { 'a.json': '1', 'b.json': '2' };
  const plan = diffForPush(null, local);
  assert.deepEqual(plan.upload, ['a.json', 'b.json']);
  assert.deepEqual(plan.remove, []);
  assert.deepEqual(plan.unchanged, []);
});

test('diffForPush never deletes .sync/ metadata even if present in the baseline', () => {
  const pulled = { '.sync/manifest.json': 'x', 'real.json': 'y' };
  const plan = diffForPush(pulled, {});
  assert.deepEqual(plan.remove, ['real.json']);
});

test('isSyncMetaPath matches the .sync subtree only', () => {
  assert.equal(isSyncMetaPath('.sync/manifest.json'), true);
  assert.equal(isSyncMetaPath('.sync/lock.json'), true);
  assert.equal(isSyncMetaPath('.sync'), true);
  assert.equal(isSyncMetaPath('audit/summary.json'), false);
  assert.equal(isSyncMetaPath('.syncthing/x'), false);
});

// ---- lock expiry -----------------------------------------------------------

test('lockBlocks: no lock or our own lock never blocks', () => {
  assert.equal(lockBlocks(null, 'run-a'), false);
  const ours = buildSyncLock('run-a');
  assert.equal(lockBlocks(ours, 'run-a'), false);
});

test('lockBlocks: fresh lock from another run blocks', () => {
  const now = Date.parse('2026-06-12T12:00:00Z');
  const lock = { runId: 'run-b', startedAt: '2026-06-12T11:50:00Z' };
  assert.equal(lockBlocks(lock, 'run-a', now), true);
});

test('lockBlocks: lock past the 45-minute TTL no longer blocks', () => {
  const startedAt = '2026-06-12T11:00:00Z';
  const justUnder = Date.parse(startedAt) + LOCK_TTL_MS - 1;
  const justOver = Date.parse(startedAt) + LOCK_TTL_MS;
  const lock = { runId: 'run-b', startedAt };
  assert.equal(lockBlocks(lock, 'run-a', justUnder), true);
  assert.equal(lockBlocks(lock, 'run-a', justOver), false);
});

test('lockBlocks: corrupt startedAt is treated as stale, not a permanent wedge', () => {
  const lock = { runId: 'run-b', startedAt: 'not-a-date' };
  assert.equal(lockBlocks(lock, 'run-a'), false);
});

// ---- manifest / lock (de)serialization --------------------------------------

test('manifest round-trips through build → JSON → parse', () => {
  const manifest = buildSyncManifest({
    stage: 'scrape',
    runId: 'run-1',
    status: 'complete',
    files: { 'a.json': 'aaa' },
    now: new Date('2026-06-12T00:00:00Z'),
  });
  const parsed = parseSyncManifest(JSON.stringify(manifest));
  assert.deepEqual(parsed, manifest);
  assert.equal(parsed?.timestamp, '2026-06-12T00:00:00.000Z');
});

test('parseSyncManifest rejects garbage, missing fields, and unknown status', () => {
  assert.equal(parseSyncManifest(null), null);
  assert.equal(parseSyncManifest(''), null);
  assert.equal(parseSyncManifest('not json'), null);
  assert.equal(parseSyncManifest('{}'), null);
  assert.equal(
    parseSyncManifest(
      JSON.stringify({ version: 1, stage: 's', runId: 'r', timestamp: 't', status: 'partial', files: {} }),
    ),
    null,
  );
});

test('parseSyncLock rejects garbage and accepts well-formed locks', () => {
  assert.equal(parseSyncLock(null), null);
  assert.equal(parseSyncLock('nope'), null);
  assert.equal(parseSyncLock('{"runId":""}'), null);
  assert.deepEqual(parseSyncLock('{"runId":"r1","startedAt":"2026-06-12T00:00:00Z"}'), {
    runId: 'r1',
    startedAt: '2026-06-12T00:00:00Z',
  });
});

// ---- storage delete helper ---------------------------------------------------

test('removeBucketObjects issues chunked DELETEs with the supabase auth headers', async () => {
  const calls: Array<{ url: string; method: string; headers: Record<string, string>; body: unknown }> = [];
  const fakeFetch = (async (url: unknown, init?: RequestInit) => {
    calls.push({
      url: String(url),
      method: init?.method ?? 'GET',
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: JSON.parse(String(init?.body)),
    });
    return new Response('[]', { status: 200 });
  }) as typeof fetch;

  const keys = Array.from({ length: 150 }, (_, i) => `clients/acme/file-${i}.json`);
  await removeBucketObjects({
    supabaseUrl: 'https://example.supabase.co/',
    serviceKey: 'service-key-123',
    bucket: 'upriver',
    keys,
    fetchImpl: fakeFetch,
  });

  assert.equal(calls.length, 2); // 100 + 50
  const first = calls[0]!;
  assert.equal(first.url, 'https://example.supabase.co/storage/v1/object/upriver');
  assert.equal(first.method, 'DELETE');
  assert.equal(first.headers['authorization'], 'Bearer service-key-123');
  assert.equal(first.headers['apikey'], 'service-key-123');
  assert.deepEqual((first.body as { prefixes: string[] }).prefixes.length, 100);
  assert.deepEqual((calls[1]!.body as { prefixes: string[] }).prefixes.length, 50);
});

test('removeBucketObjects throws with status detail on non-2xx and skips empty input', async () => {
  let called = 0;
  const failingFetch = (async () => {
    called += 1;
    return new Response('denied', { status: 403 });
  }) as typeof fetch;

  await assert.rejects(
    removeBucketObjects({
      supabaseUrl: 'https://example.supabase.co',
      serviceKey: 'k',
      bucket: 'upriver',
      keys: ['clients/acme/a.json'],
      fetchImpl: failingFetch,
    }),
    /storage delete failed \(403\): denied/,
  );

  await removeBucketObjects({
    supabaseUrl: 'https://example.supabase.co',
    serviceKey: 'k',
    bucket: 'upriver',
    keys: [],
    fetchImpl: failingFetch,
  });
  assert.equal(called, 1); // empty keys never hit the network
});
