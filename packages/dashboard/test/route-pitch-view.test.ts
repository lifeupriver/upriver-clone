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

function readViews(): { v: number; firstViewedAt: string } | null {
  const raw = tc.readFile(SLUG, 'pitch/views.json');
  return raw ? (JSON.parse(raw) as { v: number; firstViewedAt: string }) : null;
}

describe('pitch first-view recording (spec 18 §5)', () => {
  it('a 200-served preview records pitch/views.json exactly once', async () => {
    assert.equal(readViews(), null);
    const res = await handlePitchPreview(SLUG, TOKEN);
    assert.equal(res.status, 200);
    const first = readViews();
    assert.ok(first, 'views.json written on first valid view');
    assert.equal(first.v, 1);
    assert.ok(Date.parse(first.firstViewedAt) > 0);
  });

  it('a second view never moves firstViewedAt (write-once)', async () => {
    await handlePitchPreview(SLUG, TOKEN);
    const first = readViews()!;
    await new Promise((r) => setTimeout(r, 5));
    await handlePitchPreview(SLUG, TOKEN);
    await handlePitchTeaser(SLUG, TOKEN, 'doc-pitch-02');
    assert.equal(readViews()!.firstViewedAt, first.firstViewedAt);
  });

  it('a 200-served teaser also counts as the first view', async () => {
    const res = await handlePitchTeaser(SLUG, TOKEN, 'doc-pitch-02');
    assert.equal(res.status, 200);
    assert.ok(readViews());
  });

  it('invalid token, expired token, and unstaged preview record NOTHING', async () => {
    // invalid token → 404
    await handlePitchPreview(SLUG, 'x'.repeat(32));
    assert.equal(readViews(), null);
    // expired → 410
    tc.writeFile(
      SLUG,
      'pitch/share.json',
      JSON.stringify({ v: 1, token: TOKEN, createdAt: PAST, expiresAt: PAST }),
    );
    await handlePitchPreview(SLUG, TOKEN);
    assert.equal(readViews(), null);
    // valid token but nothing staged → 404, still not a prospect view
    tc.writeFile(
      SLUG,
      'pitch/share.json',
      JSON.stringify({ v: 1, token: TOKEN, createdAt: PAST, expiresAt: FUTURE }),
    );
    const { rmSync } = await import('node:fs');
    const { join } = await import('node:path');
    rmSync(join(tc.base, SLUG, 'pitch', 'preview'), { recursive: true, force: true });
    const res = await handlePitchPreview(SLUG, TOKEN);
    assert.equal(res.status, 404);
    assert.equal(readViews(), null);
  });
});
