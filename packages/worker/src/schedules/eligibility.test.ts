import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  fetchClientAdminRows,
  isTableMissingResponse,
  mergeEligible,
  parseSlugList,
  resetEligibilityWarnings,
} from './eligibility.js';

// The monitor/followup crons fan out from this module's answers. These tests
// pin: env-list parsing, table∪env merging, the missing-table soft-skip, and
// the PostgREST query shape — all without a network.

const ENV = {
  UPRIVER_SUPABASE_URL: 'https://example.supabase.co',
  UPRIVER_SUPABASE_SERVICE_KEY: 'service-key',
};

function fakeFetch(handler: (url: string) => Response): { impl: typeof fetch; urls: string[] } {
  const urls: string[] = [];
  const impl = (async (url: unknown) => {
    urls.push(String(url));
    return handler(String(url));
  }) as typeof fetch;
  return { impl, urls };
}

test('parseSlugList splits, trims, and drops empties', () => {
  assert.deepEqual(parseSlugList(undefined), []);
  assert.deepEqual(parseSlugList(''), []);
  assert.deepEqual(parseSlugList(' acme , littlefriends,,wb-fixture '), [
    'acme',
    'littlefriends',
    'wb-fixture',
  ]);
});

test('mergeEligible unions env slugs with table rows; table notify_email wins', () => {
  const merged = mergeEligible(
    ['acme', 'env-only'],
    [
      { slug: 'acme', notifyEmail: 'owner@acme.example' },
      { slug: 'db-only', notifyEmail: null },
    ],
  );
  assert.deepEqual(merged, [
    { slug: 'acme', notifyEmail: 'owner@acme.example' },
    { slug: 'db-only', notifyEmail: null },
    { slug: 'env-only', notifyEmail: null },
  ]);
});

test('isTableMissingResponse recognizes PGRST205, 42P01, and bare 404s', () => {
  assert.equal(isTableMissingResponse(404, '{"code":"PGRST205"}'), true);
  assert.equal(isTableMissingResponse(400, 'relation "public.client_admins" does not exist'), true);
  assert.equal(isTableMissingResponse(400, '{"code":"42P01"}'), true);
  assert.equal(isTableMissingResponse(404, ''), true);
  assert.equal(isTableMissingResponse(500, 'internal error'), false);
  assert.equal(isTableMissingResponse(401, 'bad jwt'), false);
});

test('fetchClientAdminRows(monitor) queries the right filters and maps rows', async () => {
  resetEligibilityWarnings();
  const { impl, urls } = fakeFetch(
    () =>
      new Response(
        JSON.stringify([
          { slug: 'acme', notify_email: 'owner@acme.example' },
          { slug: 'noemail', notify_email: null },
          { slug: '', notify_email: 'dropped@bad.example' }, // malformed row dropped
        ]),
        { status: 200 },
      ),
  );
  const rows = await fetchClientAdminRows({ schedule: 'monitor', fetchImpl: impl, env: ENV });
  assert.deepEqual(rows, [
    { slug: 'acme', notifyEmail: 'owner@acme.example' },
    { slug: 'noemail', notifyEmail: null },
  ]);
  const url = new URL(urls[0]!);
  assert.equal(url.pathname, '/rest/v1/client_admins');
  assert.equal(url.searchParams.get('monitor_enabled'), 'is.true');
  assert.equal(url.searchParams.get('admin_paused'), 'is.false');
  assert.equal(url.searchParams.get('select'), 'slug,notify_email');
  assert.equal(url.searchParams.get('engagement_ended_at'), null);
});

test('fetchClientAdminRows(followup) filters on the 180-day engagement cutoff', async () => {
  resetEligibilityWarnings();
  const { impl, urls } = fakeFetch(() => new Response('[]', { status: 200 }));
  const now = new Date('2026-06-12T00:00:00.000Z');
  await fetchClientAdminRows({ schedule: 'followup', fetchImpl: impl, env: ENV, now });
  const url = new URL(urls[0]!);
  assert.equal(url.searchParams.get('followup_enabled'), 'is.true');
  // 180 days before 2026-06-12 = 2025-12-14
  assert.equal(url.searchParams.get('engagement_ended_at'), 'lte.2025-12-14T00:00:00.000Z');
});

test('fetchClientAdminRows returns [] when the table is missing (no throw)', async () => {
  resetEligibilityWarnings();
  const { impl } = fakeFetch(
    () => new Response('{"code":"PGRST205","message":"Could not find the table"}', { status: 404 }),
  );
  const rows = await fetchClientAdminRows({ schedule: 'monitor', fetchImpl: impl, env: ENV });
  assert.deepEqual(rows, []);
});

test('fetchClientAdminRows returns [] when supabase env is unset', async () => {
  resetEligibilityWarnings();
  const { impl, urls } = fakeFetch(() => new Response('[]', { status: 200 }));
  const rows = await fetchClientAdminRows({ schedule: 'monitor', fetchImpl: impl, env: {} });
  assert.deepEqual(rows, []);
  assert.equal(urls.length, 0); // never hit the network
});

test('fetchClientAdminRows throws on non-missing-table errors so the step retries', async () => {
  resetEligibilityWarnings();
  const { impl } = fakeFetch(() => new Response('internal error', { status: 500 }));
  await assert.rejects(
    fetchClientAdminRows({ schedule: 'monitor', fetchImpl: impl, env: ENV }),
    /client_admins query failed \(500\)/,
  );
});
