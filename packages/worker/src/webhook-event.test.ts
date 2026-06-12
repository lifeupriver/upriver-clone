import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  DeliveryReplayCache,
  evaluateIssuesEvent,
  ISSUE_BODY_CAP,
  MAX_EVENT_AGE_MS,
} from './webhook-event.js';

const NOW = Date.parse('2026-06-12T12:00:00Z');

function payload(overrides: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    action: 'opened',
    issue: {
      number: 12,
      title: 'Add fall menu section',
      body: 'Please add the fall menu to the homepage.',
      labels: [{ name: 'change-request' }],
      created_at: new Date(NOW - 30_000).toISOString(),
      updated_at: new Date(NOW - 30_000).toISOString(),
    },
    repository: {
      full_name: 'lifeupriver/littlefriends-site',
      clone_url: 'https://github.com/attacker/evil.git',
    },
    ...overrides,
  };
}

test('accepts a fresh opened issue carrying the change-request label', () => {
  const decision = evaluateIssuesEvent('issues', payload(), NOW);
  assert.equal(decision.accept, true);
  if (decision.accept) {
    assert.equal(decision.data.repoFullName, 'lifeupriver/littlefriends-site');
    assert.equal(decision.data.issueNumber, 12);
    assert.equal(decision.data.issueTitle, 'Add fall menu section');
  }
});

test('accepts the labeled action too', () => {
  const decision = evaluateIssuesEvent('issues', payload({ action: 'labeled' }), NOW);
  assert.equal(decision.accept, true);
});

test('never forwards clone_url or any other repository field', () => {
  const decision = evaluateIssuesEvent('issues', payload(), NOW);
  assert.equal(decision.accept, true);
  if (decision.accept) {
    const keys = Object.keys(decision.data).sort();
    assert.deepEqual(keys, ['issueBody', 'issueNumber', 'issueTitle', 'repoFullName']);
  }
});

test('rejects non-issues events and unknown actions', () => {
  assert.equal(evaluateIssuesEvent('ping', payload(), NOW).accept, false);
  assert.equal(evaluateIssuesEvent('pull_request', payload(), NOW).accept, false);
  assert.equal(evaluateIssuesEvent(undefined, payload(), NOW).accept, false);
  assert.equal(evaluateIssuesEvent('issues', payload({ action: 'closed' }), NOW).accept, false);
  assert.equal(evaluateIssuesEvent('issues', payload({ action: 'edited' }), NOW).accept, false);
});

test('rejects issues without the change-request label', () => {
  const p = payload();
  (p['issue'] as { labels: unknown }).labels = [{ name: 'bug' }];
  assert.equal(evaluateIssuesEvent('issues', p, NOW).accept, false);

  const p2 = payload();
  (p2['issue'] as { labels: unknown }).labels = [];
  assert.equal(evaluateIssuesEvent('issues', p2, NOW).accept, false);
});

test('matches the label case-insensitively', () => {
  const p = payload();
  (p['issue'] as { labels: unknown }).labels = [{ name: 'Change-Request' }];
  assert.equal(evaluateIssuesEvent('issues', p, NOW).accept, true);
});

test('rejects deliveries older than 10 minutes by payload timestamp', () => {
  const old = new Date(NOW - MAX_EVENT_AGE_MS - 1_000).toISOString();
  const p = payload();
  (p['issue'] as Record<string, unknown>)['updated_at'] = old;
  (p['issue'] as Record<string, unknown>)['created_at'] = old;
  const decision = evaluateIssuesEvent('issues', p, NOW);
  assert.equal(decision.accept, false);
  if (!decision.accept) assert.match(decision.reason, /stale/);
});

test('accepts when timestamps are missing or unparseable (LRU still guards exact replays)', () => {
  const p = payload();
  delete (p['issue'] as Record<string, unknown>)['updated_at'];
  delete (p['issue'] as Record<string, unknown>)['created_at'];
  assert.equal(evaluateIssuesEvent('issues', p, NOW).accept, true);

  const p2 = payload();
  (p2['issue'] as Record<string, unknown>)['updated_at'] = 'not-a-date';
  (p2['issue'] as Record<string, unknown>)['created_at'] = 'not-a-date';
  assert.equal(evaluateIssuesEvent('issues', p2, NOW).accept, true);
});

test('rejects malformed repository.full_name', () => {
  for (const bad of [undefined, '', 'no-slash', 'a/b/c', 'owner/repo name', 42]) {
    const p = payload({ repository: { full_name: bad } });
    assert.equal(evaluateIssuesEvent('issues', p, NOW).accept, false, `expected reject for ${String(bad)}`);
  }
});

test('rejects malformed issue numbers', () => {
  for (const bad of [0, -3, 1.5, '12', undefined]) {
    const p = payload();
    (p['issue'] as Record<string, unknown>)['number'] = bad;
    assert.equal(evaluateIssuesEvent('issues', p, NOW).accept, false, `expected reject for ${String(bad)}`);
  }
});

test('caps the issue body at 16k chars and tolerates null bodies', () => {
  const p = payload();
  (p['issue'] as Record<string, unknown>)['body'] = 'x'.repeat(ISSUE_BODY_CAP + 5_000);
  const decision = evaluateIssuesEvent('issues', p, NOW);
  assert.equal(decision.accept, true);
  if (decision.accept) assert.equal(decision.data.issueBody.length, ISSUE_BODY_CAP);

  const p2 = payload();
  (p2['issue'] as Record<string, unknown>)['body'] = null;
  const decision2 = evaluateIssuesEvent('issues', p2, NOW);
  assert.equal(decision2.accept, true);
  if (decision2.accept) assert.equal(decision2.data.issueBody, '');
});

test('rejects garbage payloads without throwing', () => {
  for (const garbage of [null, 'str', 42, [], {}, { action: 'opened' }]) {
    assert.equal(evaluateIssuesEvent('issues', garbage, NOW).accept, false);
  }
});

test('DeliveryReplayCache: flags repeats and evicts beyond capacity (oldest first)', () => {
  const cache = new DeliveryReplayCache(3);
  assert.equal(cache.has('a'), false);
  cache.record('a');
  assert.equal(cache.has('a'), true);
  cache.record('a'); // idempotent
  cache.record('b');
  cache.record('c');
  assert.equal(cache.size, 3);
  // 'd' evicts 'a'.
  cache.record('d');
  assert.equal(cache.size, 3);
  assert.equal(cache.has('a'), false); // forgotten, treated as new
  assert.equal(cache.has('c'), true); // still remembered
  assert.equal(cache.has('d'), true);
});

test('DeliveryReplayCache: checking has() does not record (failed sends stay redeliverable)', () => {
  const cache = new DeliveryReplayCache(3);
  assert.equal(cache.has('x'), false);
  assert.equal(cache.has('x'), false);
  assert.equal(cache.size, 0);
});
