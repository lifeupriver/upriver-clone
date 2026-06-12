import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';

import { verifyGithubSignature } from './webhook-verify.js';

// The /webhook route trusts this verdict completely: an `ok: true` here means
// "GitHub signed this payload with our shared secret". These tests pin the
// fail-closed contract.

const SECRET = 'test-webhook-secret';
const BODY = Buffer.from(JSON.stringify({ action: 'opened', issue: { number: 7 } }));

function sign(secret: string, body: Buffer): string {
  return `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
}

test('accepts a payload signed with the configured secret', () => {
  const headers = { 'x-hub-signature-256': sign(SECRET, BODY) };
  const result = verifyGithubSignature(SECRET, headers, BODY);
  assert.deepEqual(result, { ok: true, reason: 'ok' });
});

test('accepts uppercase hex digests (case-insensitive compare)', () => {
  const headers = { 'x-hub-signature-256': sign(SECRET, BODY).toUpperCase().replace('SHA256', 'sha256') };
  assert.equal(verifyGithubSignature(SECRET, headers, BODY).ok, true);
});

test('rejects when the secret env is unset or empty (fail closed)', () => {
  const headers = { 'x-hub-signature-256': sign(SECRET, BODY) };
  assert.deepEqual(verifyGithubSignature(undefined, headers, BODY), {
    ok: false,
    reason: 'secret-unset',
  });
  assert.deepEqual(verifyGithubSignature('', headers, BODY), {
    ok: false,
    reason: 'secret-unset',
  });
});

test('rejects a signature made with a different secret', () => {
  const headers = { 'x-hub-signature-256': sign('some-other-secret', BODY) };
  assert.deepEqual(verifyGithubSignature(SECRET, headers, BODY), {
    ok: false,
    reason: 'signature-mismatch',
  });
});

test('rejects when the body was tampered with after signing', () => {
  const headers = { 'x-hub-signature-256': sign(SECRET, BODY) };
  const tampered = Buffer.from(BODY.toString('utf8').replace('"number":7', '"number":8'));
  assert.equal(verifyGithubSignature(SECRET, headers, tampered).ok, false);
});

test('rejects when the signature header is missing', () => {
  assert.deepEqual(verifyGithubSignature(SECRET, {}, BODY), {
    ok: false,
    reason: 'missing-header',
  });
});

test('rejects short / truncated digests before any comparison (timing-safe length path)', () => {
  // 8 hex chars instead of 64 — must be caught by shape validation, never
  // reach timingSafeEqual (which throws on unequal lengths).
  const headers = { 'x-hub-signature-256': 'sha256=deadbeef' };
  assert.deepEqual(verifyGithubSignature(SECRET, headers, BODY), {
    ok: false,
    reason: 'malformed-header',
  });
});

test('rejects malformed headers: wrong algo prefix, non-hex, no prefix', () => {
  for (const bad of [
    `sha1=${'a'.repeat(40)}`,
    `sha256=${'z'.repeat(64)}`,
    'a'.repeat(64),
    'sha256=',
  ]) {
    const result = verifyGithubSignature(SECRET, { 'x-hub-signature-256': bad }, BODY);
    assert.equal(result.ok, false, `expected reject for ${bad}`);
    assert.equal(result.reason, 'malformed-header');
  }
});

test('rejects repeated signature headers (array value)', () => {
  const good = sign(SECRET, BODY);
  const result = verifyGithubSignature(SECRET, { 'x-hub-signature-256': [good, good] }, BODY);
  assert.deepEqual(result, { ok: false, reason: 'malformed-header' });
});

test('finds the header case-insensitively in caller-built maps', () => {
  const headers = { 'X-Hub-Signature-256': sign(SECRET, BODY) };
  assert.equal(verifyGithubSignature(SECRET, headers, BODY).ok, true);
});
