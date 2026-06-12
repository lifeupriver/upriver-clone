import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { pathIs, safeNext } from '../src/lib/path-guards.js';

describe('pathIs — middleware path-prefix matching', () => {
  it('matches the prefix exactly and as a path segment', () => {
    assert.equal(pathIs('/login', ['/login']), true);
    assert.equal(pathIs('/login/otp', ['/login']), true);
    assert.equal(pathIs('/clients', ['/clients']), true);
    assert.equal(pathIs('/clients/acme/audit', ['/clients']), true);
  });

  it('does NOT match a longer sibling path (no loose startsWith)', () => {
    assert.equal(pathIs('/logind', ['/login']), false);
    assert.equal(pathIs('/login-bypass', ['/login']), false);
    assert.equal(pathIs('/clientsfoo', ['/clients']), false);
    assert.equal(pathIs('/api/runaway', ['/api/run']), false);
    assert.equal(pathIs('/api/jobsx', ['/api/jobs']), false);
  });

  it('normalizes trailing-slash prefixes (the /auth/ public prefix)', () => {
    assert.equal(pathIs('/auth/expired', ['/auth/']), true);
    assert.equal(pathIs('/auth/signout', ['/auth/']), true);
    assert.equal(pathIs('/auth', ['/auth/']), true);
    assert.equal(pathIs('/authx', ['/auth/']), false);
  });

  it('covers the operator API prefixes added for the unauthenticated-routes fix', () => {
    const prefixes = ['/api/enqueue', '/api/share-tokens', '/api/jobs', '/api/run', '/api/portal'];
    assert.equal(pathIs('/api/jobs/evt_123', prefixes), true);
    assert.equal(pathIs('/api/run/scrape', prefixes), true);
    assert.equal(pathIs('/api/portal/acme', prefixes), true);
    assert.equal(pathIs('/api/interview/acme', prefixes), false, 'token-gated routes stay public');
    assert.equal(pathIs('/api/profile/acme', prefixes), false, 'token-gated routes stay public');
  });
});

describe('safeNext — open-redirect guard for ?next=', () => {
  it('accepts plain same-origin paths', () => {
    assert.equal(safeNext('/clients'), true);
    assert.equal(safeNext('/clients/acme?tab=audit'), true);
    assert.equal(safeNext('/'), true);
  });

  it('rejects protocol-relative and backslash-tricked values', () => {
    assert.equal(safeNext('//evil.com'), false);
    assert.equal(safeNext('//evil.com/clients'), false);
    assert.equal(safeNext('/\\evil.com'), false);
    assert.equal(safeNext('/\\/evil.com'), false);
  });

  it('rejects absolute URLs, schemes, and empty/missing values', () => {
    assert.equal(safeNext('https://evil.com'), false);
    assert.equal(safeNext('javascript:alert(1)'), false);
    assert.equal(safeNext(''), false);
    assert.equal(safeNext(null), false);
    assert.equal(safeNext(undefined), false);
  });
});
