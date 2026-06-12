import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { generatePin, hashPin, verifyPinHash } from './pin.js';

describe('generatePin', () => {
  it('always returns exactly six digits, zero-padded', () => {
    for (let i = 0; i < 200; i++) {
      const pin = generatePin();
      assert.match(pin, /^\d{6}$/);
    }
  });

  it('does not return the same pin every time (sanity, not a randomness test)', () => {
    const pins = new Set(Array.from({ length: 50 }, () => generatePin()));
    assert.ok(pins.size > 1);
  });
});

describe('hashPin / verifyPinHash', () => {
  it('round-trips: a hashed pin verifies', () => {
    const pin = '042137';
    const hash = hashPin(pin);
    assert.equal(verifyPinHash(pin, hash), true);
  });

  it('emits the documented scrypt$N$r$p$salt$hash format with no plaintext pin inside', () => {
    const pin = '987654';
    const hash = hashPin(pin);
    assert.match(hash, /^scrypt\$\d+\$\d+\$\d+\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
    assert.equal(hash.includes(pin), false);
  });

  it('uses a fresh salt per call', () => {
    assert.notEqual(hashPin('123456'), hashPin('123456'));
  });

  it('rejects a wrong pin', () => {
    const hash = hashPin('111111');
    assert.equal(verifyPinHash('111112', hash), false);
    assert.equal(verifyPinHash('', hash), false);
  });

  it('returns false (never throws) on malformed stored hashes', () => {
    for (const bad of [
      '',
      'scrypt',
      'scrypt$$$$$',
      'scrypt$abc$8$1$00$00',
      'scrypt$16384$8$1$nothex$alsonothex',
      'scrypt$16384$8$1$$',
      '$2a$10$abcdefghijklmnopqrstuv', // bcrypt-shaped — not ours to verify
      'plaintext123',
    ]) {
      assert.equal(verifyPinHash('123456', bad), false, `expected false for ${JSON.stringify(bad)}`);
    }
  });

  it('rejects absurd cost parameters instead of computing them', () => {
    // N too large — must return false fast, not attempt a 2^30 scrypt.
    const hash = hashPin('123456').split('$');
    hash[1] = String(1 << 21);
    assert.equal(verifyPinHash('123456', hash.join('$')), false);
  });
});
