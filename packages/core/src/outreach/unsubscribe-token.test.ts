import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mintUnsubscribeToken, verifyUnsubscribeToken } from './unsubscribe-token.js';

const SECRET = 'test-secret-please-rotate';

describe('unsubscribe token', () => {
  it('round-trips slug and email', () => {
    const token = mintUnsubscribeToken('wildflourbakery', 'owner@wildflour.example', SECRET);
    const out = verifyUnsubscribeToken(token, SECRET);
    assert.deepEqual(out, { slug: 'wildflourbakery', email: 'owner@wildflour.example' });
  });

  it('does not expose slug or email in the token text', () => {
    const token = mintUnsubscribeToken('wildflourbakery', 'owner@wildflour.example', SECRET);
    assert.ok(!token.includes('wildflour'));
    assert.ok(!token.includes('@'));
  });

  it('rejects tampered tokens and wrong secrets', () => {
    const token = mintUnsubscribeToken('wb', 'a@b.example', SECRET);
    assert.equal(verifyUnsubscribeToken(token.slice(0, -2) + 'xx', SECRET), null);
    assert.equal(verifyUnsubscribeToken(token, 'other-secret'), null);
    assert.equal(verifyUnsubscribeToken('garbage', SECRET), null);
    assert.equal(verifyUnsubscribeToken('', SECRET), null);
  });

  it('handles emails with separators safely', () => {
    const email = 'weird|user+tag@b.example';
    const token = mintUnsubscribeToken('wb', email, SECRET);
    assert.deepEqual(verifyUnsubscribeToken(token, SECRET), { slug: 'wb', email });
  });
});
