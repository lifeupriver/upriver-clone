import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SECRET_SHOPPER_LOG,
  computeResponseTime,
  readSecretShopperLog,
  recordSecretShopper,
  startSecretShopper,
} from './secret-shopper.js';
import { InMemoryDataSource } from '../testing.js';

test('computeResponseTime renders elapsed time', () => {
  assert.equal(computeResponseTime('2026-06-04T10:00:00Z', '2026-06-04T12:15:00Z'), '2h 15m');
  assert.equal(computeResponseTime('2026-06-04T10:00:00Z', '2026-06-04T10:00:30Z'), 'under a minute');
  assert.equal(computeResponseTime('2026-06-04T10:00:00Z', '2026-06-05T12:02:00Z'), '1d 2h 2m');
});

test('start appends a pending entry to the log', async () => {
  const ds = new InMemoryDataSource();

  const e1 = await startSecretShopper(ds, 'lf', { channel: 'web-form', sentAt: '2026-06-04T10:00:00Z' });
  assert.equal(e1.status, 'pending');
  assert.equal(e1.channel, 'web-form');
  assert.ok(e1.id);

  await startSecretShopper(ds, 'lf', { channel: 'email', sentAt: '2026-06-04T11:00:00Z' });
  const log = await readSecretShopperLog(ds, 'lf');
  assert.equal(log.length, 2);
  assert.ok(ds.written().includes(SECRET_SHOPPER_LOG));
});

test('record closes the pending entry and yields a responseTime candidate', async () => {
  const ds = new InMemoryDataSource();
  await startSecretShopper(ds, 'lf', { channel: 'web-form', sentAt: '2026-06-04T10:00:00Z' });

  const { entry, candidate } = await recordSecretShopper(ds, 'lf', {
    response: 'Thanks for reaching out! We have a tour Tuesday.',
    respondedAt: '2026-06-04T13:30:00Z',
  });

  assert.equal(entry.status, 'responded');
  assert.equal(entry.responseTime, '3h 30m');
  assert.equal(candidate.path, 'salesProcess.firstTouch.responseTime');
  assert.equal(candidate.source, 'recon');
  assert.deepEqual(candidate.value, [{ channel: 'web-form', time: '3h 30m' }]);
  assert.match(String(candidate.evidence), /Secret shopper/);

  // Log persisted with the response.
  const log = await readSecretShopperLog(ds, 'lf');
  assert.equal(log[0]?.status, 'responded');
});

test('record throws when there is no pending inquiry', async () => {
  const ds = new InMemoryDataSource();
  await assert.rejects(
    () => recordSecretShopper(ds, 'lf', { response: 'hi', respondedAt: '2026-06-04T13:00:00Z' }),
    /no pending/i,
  );
});
