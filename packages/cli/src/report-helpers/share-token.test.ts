import { strict as assert } from 'node:assert';
import { mkdirSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { buildShareUrl, loadOrCreateShareInfo } from './share-token.js';

const SLUG = 'acme-co';
const BASE_URL = 'https://reports.upriver.com';

let tempBase: string;
let prevEnv: string | undefined;

describe('share-token', () => {
  beforeEach(() => {
    prevEnv = process.env['UPRIVER_CLIENTS_DIR'];
    tempBase = mkdtempSync(join(tmpdir(), 'upriver-share-test-'));
    process.env['UPRIVER_CLIENTS_DIR'] = tempBase;
    // Pre-create the slug dir so the IO mirrors a real client layout.
    mkdirSync(join(tempBase, SLUG), { recursive: true });
  });

  afterEach(() => {
    if (prevEnv === undefined) {
      delete process.env['UPRIVER_CLIENTS_DIR'];
    } else {
      process.env['UPRIVER_CLIENTS_DIR'] = prevEnv;
    }
    rmSync(tempBase, { recursive: true, force: true });
  });

  it('creates share.json on first call and reuses the token on subsequent calls', () => {
    const first = loadOrCreateShareInfo(SLUG, BASE_URL);
    assert.ok(first.token.length > 0, 'token should be non-empty');
    assert.equal(first.baseUrl, BASE_URL);
    assert.ok(first.createdAt.length > 0);

    const second = loadOrCreateShareInfo(SLUG, 'https://other.example.com');
    assert.equal(second.token, first.token, 'token must be idempotent');
    assert.equal(second.createdAt, first.createdAt);
    assert.equal(second.baseUrl, BASE_URL, 'baseUrl persists from first call');
  });

  it('strips trailing slashes from baseUrl in the share URL', () => {
    const info = loadOrCreateShareInfo(SLUG, `${BASE_URL}/`);
    const url = buildShareUrl(SLUG, info);
    assert.equal(url, `${BASE_URL}/${SLUG}-${info.token}/`);
    assert.ok(!url.includes('//' + SLUG), 'no double slash before slug');
  });

  it('produces a token of at least 16 characters after base64url encoding', () => {
    const info = loadOrCreateShareInfo(SLUG, BASE_URL);
    // 16 random bytes encode to ~22 base64url chars (no padding).
    assert.ok(info.token.length >= 16, `token length was ${info.token.length}`);
    assert.ok(/^[A-Za-z0-9_-]+$/.test(info.token), 'token is base64url');
  });
});
