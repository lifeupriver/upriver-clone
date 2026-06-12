import { strict as assert } from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { handlePitchPreview, handlePitchTeaser } from '../src/pages/pitch/[slug].js';
import { setupTempClients, type TempClients } from './_setup.js';

const SLUG = 'wb-prospect';
const TOKEN = 'tok_'.padEnd(32, 'a');
const FUTURE = new Date(Date.now() + 7 * 86400_000).toISOString();
const PAST = new Date(Date.now() - 86400_000).toISOString();

let tc: TempClients;
beforeEach(() => {
  tc = setupTempClients();
  tc.seedClient(SLUG);
  tc.writeFile(
    SLUG,
    'pitch/share.json',
    JSON.stringify({ v: 1, token: TOKEN, createdAt: PAST, expiresAt: FUTURE }),
  );
  tc.writeFile(SLUG, 'pitch/preview/index.html', '<html><head></head><body>PREVIEW</body></html>');
  tc.writeFile(SLUG, 'docs/doc-pitch-02-top-3-quick-wins.md', '# Three quick wins\n\n- win');
});
afterEach(() => tc.cleanup());

describe('pitch preview route', () => {
  it('serves the staged preview with noindex header AND meta for a valid token', async () => {
    const res = await handlePitchPreview(SLUG, TOKEN);
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
    const body = await res.text();
    assert.match(body, /PREVIEW/);
    assert.match(body, /<meta name="robots" content="noindex, nofollow">/);
  });

  it('404s without a token and with a wrong token (no oracle about existence)', async () => {
    for (const t of [null, '', 'x'.repeat(32)]) {
      const res = await handlePitchPreview(SLUG, t);
      assert.equal(res.status, 404, String(t));
      assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
    }
  });

  it('410s an expired token', async () => {
    tc.writeFile(
      SLUG,
      'pitch/share.json',
      JSON.stringify({ v: 1, token: TOKEN, createdAt: PAST, expiresAt: PAST }),
    );
    const res = await handlePitchPreview(SLUG, TOKEN);
    assert.equal(res.status, 410);
  });

  it('404s a revoked token even before expiry', async () => {
    tc.writeFile(
      SLUG,
      'pitch/share.json',
      JSON.stringify({ v: 1, token: TOKEN, createdAt: PAST, expiresAt: FUTURE, revoked: true }),
    );
    const res = await handlePitchPreview(SLUG, TOKEN);
    assert.equal(res.status, 404);
  });

  it('404s when the preview is not staged', async () => {
    tc.seedClient('other');
    tc.writeFile(
      'other',
      'pitch/share.json',
      JSON.stringify({ v: 1, token: TOKEN, createdAt: PAST, expiresAt: FUTURE }),
    );
    const res = await handlePitchPreview('other', TOKEN);
    assert.equal(res.status, 404);
  });
});

describe('pitch teaser route', () => {
  it('renders a generated teaser under the same gate', async () => {
    const res = await handlePitchTeaser(SLUG, TOKEN, 'doc-pitch-02');
    assert.equal(res.status, 200);
    assert.equal(res.headers.get('x-robots-tag'), 'noindex, nofollow');
    assert.match(await res.text(), /Three quick wins/);
  });

  it('rejects unknown doc ids and missing docs', async () => {
    assert.equal((await handlePitchTeaser(SLUG, TOKEN, 'doc-01')).status, 404);
    assert.equal((await handlePitchTeaser(SLUG, TOKEN, 'doc-pitch-03')).status, 404);
  });

  it('enforces the token on teasers too', async () => {
    assert.equal((await handlePitchTeaser(SLUG, null, 'doc-pitch-02')).status, 404);
  });
});
