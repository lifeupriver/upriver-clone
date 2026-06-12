// F05 form PIN generation + hashing.
//
// The PIN protects the public client change-request form. Rules:
//
//  - Generated with crypto.randomInt (CSPRNG) — Math.random is predictable
//    and must never mint credentials.
//  - The plaintext PIN is shown ONCE in the operator's terminal at
//    deploy/rotate time. Only the HASH is written into artifacts
//    (.env.local.example, Vercel env). OPERATOR_GUIDE.md — which syncs to the
//    shared bucket — never contains the plaintext PIN.
//  - Hash format is scrypt from node:crypto (memory-hard, dependency-free):
//      scrypt$<N>$<r>$<p>$<saltHex>$<hashHex>
//    The form route in @upriver/admin-template verifies this format natively
//    and falls back to bcrypt compare for hashes minted before this scheme
//    (legacy `$2a$...` values keep working until rotated).

import { randomBytes, randomInt, scryptSync, timingSafeEqual } from 'node:crypto';

/** scrypt cost parameters — interactive-login strength; a 6-digit PIN's main
 * defense is the form's rate limit, the hash just has to not be a giveaway
 * if the env leaks. */
const SCRYPT_N = 16384;
const SCRYPT_R = 8;
const SCRYPT_P = 1;
const KEY_LEN = 32;
const SALT_LEN = 16;

/** 6-digit zero-padded PIN from the CSPRNG. */
export function generatePin(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, '0');
}

/** Hash a PIN into the portable scrypt string format described above. */
export function hashPin(pin: string): string {
  const salt = randomBytes(SALT_LEN);
  const hash = scryptSync(pin, salt, KEY_LEN, { N: SCRYPT_N, r: SCRYPT_R, p: SCRYPT_P });
  return `scrypt$${SCRYPT_N}$${SCRYPT_R}$${SCRYPT_P}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

/**
 * Verify a PIN against a stored `scrypt$...` hash. Returns false (never
 * throws) on malformed input so callers can treat any failure as "wrong PIN".
 * Mirrored in the admin-template form route, which is deployed standalone and
 * cannot import this package — keep the two in sync.
 */
export function verifyPinHash(pin: string, stored: string): boolean {
  try {
    const parts = stored.split('$');
    if (parts.length !== 6 || parts[0] !== 'scrypt') return false;
    const [, nStr, rStr, pStr, saltHex, hashHex] = parts;
    const N = Number(nStr);
    const r = Number(rStr);
    const p = Number(pStr);
    if (!Number.isInteger(N) || !Number.isInteger(r) || !Number.isInteger(p)) return false;
    if (N <= 1 || N > 1 << 20 || r <= 0 || r > 64 || p <= 0 || p > 16) return false;
    if (!saltHex || !hashHex) return false;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    if (salt.length === 0 || expected.length === 0) return false;
    const actual = scryptSync(pin, salt, expected.length, { N, r, p });
    return actual.length === expected.length && timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
