import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { hashShareToken } from '../src/lib/share-token.js';

// Tokens are stored as sha256 hex (20260612000000_share_tokens_hash_at_rest).
// The Node-side hash MUST stay byte-identical to Postgres'
// `encode(digest(token, 'sha256'), 'hex')` — rows minted before the migration
// were hashed in place by that SQL, and validateShareToken looks them up by
// the Node-side hash. Changing the algorithm (or adding a salt) silently
// invalidates every existing share link.

describe('hashShareToken — at-rest hash contract', () => {
  it('matches the published sha256 vector (parity with the SQL migration)', () => {
    // NIST FIPS 180-2 test vector for sha256("abc").
    assert.equal(
      hashShareToken('abc'),
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    );
  });

  it('emits 64-char lowercase hex — never matched by the migration re-hash guard', () => {
    const h = hashShareToken(`portaltok1_${'a'.repeat(24)}`);
    // The migration only hashes rows where token !~ '^[0-9a-f]{64}$', so a
    // stored hash must always match that shape (idempotent re-runs).
    assert.match(h, /^[0-9a-f]{64}$/);
  });

  it('is deterministic and collision-distinct across distinct tokens', () => {
    const a = hashShareToken('sometokenvalue-1234567890');
    assert.equal(a, hashShareToken('sometokenvalue-1234567890'));
    assert.notEqual(a, hashShareToken('sometokenvalue-1234567891'));
  });
});
