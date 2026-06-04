import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import {
  getDataSource,
  resolveClientDataSource,
  resolveClientDataSourceOrFail,
  resetClientDataSource,
} from '../generate/data-source.js';

// Build Spec 03 flips the data-source default to supabase. These env-driven tests
// snapshot/restore the relevant vars and reset the memoized source on BOTH sides
// of every case so they never leak into each other or into sibling test files.
const KEYS = [
  'UPRIVER_DATA_SOURCE',
  'UPRIVER_SUPABASE_URL',
  'UPRIVER_SUPABASE_SERVICE_KEY',
  'UPRIVER_SUPABASE_PUBLISHABLE_KEY',
];
let saved: Record<string, string | undefined> = {};

beforeEach(() => {
  saved = {};
  for (const k of KEYS) {
    saved[k] = process.env[k];
    delete process.env[k];
  }
  resetClientDataSource();
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
  resetClientDataSource();
});

test('the default data source is supabase (the canonical-store flip)', () => {
  assert.equal(getDataSource(), 'supabase');
});

test('UPRIVER_DATA_SOURCE=local is the escape hatch', () => {
  process.env['UPRIVER_DATA_SOURCE'] = 'local';
  assert.equal(getDataSource(), 'local');
});

test('resolveClientDataSource: supabase default with no creds fails with a clear, actionable message', () => {
  assert.throws(
    () => resolveClientDataSource(),
    (err: Error) => {
      assert.match(err.message, /UPRIVER_SUPABASE_URL/, 'names the URL var');
      assert.match(err.message, /UPRIVER_SUPABASE_SERVICE_KEY/, 'names the key var');
      assert.match(err.message, /UPRIVER_DATA_SOURCE=local/, 'names the escape hatch');
      return true;
    },
  );
});

test('resolveClientDataSource: the local escape hatch resolves a local source without supabase creds', () => {
  process.env['UPRIVER_DATA_SOURCE'] = 'local';
  const ds = resolveClientDataSource();
  assert.equal(ds.kind, 'local');
});

test('resolveClientDataSourceOrFail: routes the missing-config error to the fail callback (clean exit)', () => {
  let captured = '';
  assert.throws(
    () =>
      resolveClientDataSourceOrFail((m) => {
        captured = m;
        throw new Error('EXIT');
      }),
    /EXIT/,
  );
  assert.match(captured, /UPRIVER_SUPABASE_URL/);
  assert.match(captured, /UPRIVER_DATA_SOURCE=local/);
});

test('resolveClientDataSourceOrFail: returns the source when resolvable, never calling fail', () => {
  process.env['UPRIVER_DATA_SOURCE'] = 'local';
  const ds = resolveClientDataSourceOrFail(() => {
    throw new Error('fail should not be called');
  });
  assert.equal(ds.kind, 'local');
});
