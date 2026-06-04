import { strict as assert } from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { GET, POST } from '../src/pages/api/intake/[slug].js';
import { POST as LOCK_SCOPE } from '../src/pages/api/intake/[slug]/lock-scope.js';
import { readIntake } from '../src/lib/fs-reader.js';
import { sampleDecisions, setupTempClients, type TempClients } from './_setup.js';

const SLUG = 'acme-co';

/** Minimal Astro API context for the [slug] route. */
function ctx(slug: string | undefined, body?: unknown) {
  return {
    params: { slug },
    request: new Request('http://localhost/api/intake/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  } as unknown as Parameters<typeof POST>[0];
}

describe('GET /api/intake/[slug]', () => {
  let tc: TempClients;
  beforeEach(() => {
    tc = setupTempClients();
  });
  afterEach(() => tc.cleanup());

  it('404 when the client does not exist', async () => {
    const res = await GET(ctx(SLUG));
    assert.equal(res.status, 404);
  });

  it('returns {} when the client exists but has no intake', async () => {
    tc.seedClient(SLUG);
    const res = await GET(ctx(SLUG));
    assert.equal(res.status, 200);
    assert.equal(await res.text(), '{}');
  });

  it('reads a profile-backed intake (storage repoint, same contract)', async () => {
    tc.seedClient(SLUG);
    tc.writeProfile(SLUG, sampleDecisions(), '2026-05-01T12:34:56.000Z');
    const res = await GET(ctx(SLUG));
    const body = JSON.parse(await res.text());
    assert.equal(body.scopeTier, 'rebuild');
    assert.equal(body.version, 1);
    assert.equal(body.updatedAt, '2026-05-01T12:34:56.000Z');
  });
});

describe('POST /api/intake/[slug] — contract + byte-identity', () => {
  let tc: TempClients;
  beforeEach(() => {
    tc = setupTempClients();
    tc.seedClient(SLUG);
  });
  afterEach(() => tc.cleanup());

  it('persists, and POST body ≡ reconstruct-from-profile ≡ legacy mirror (three-way byte-identical)', async () => {
    const partial = {
      findingDecisions: { 'seo-001': 'fix', 'seo-002': 'skip' },
      pageWants: { home: 'Warmer hero.' },
      referenceSites: ['https://example.com'],
      scopeTier: 'rebuild',
    };
    const res = await POST(ctx(SLUG, partial));
    assert.equal(res.status, 200);
    const postBody = await res.text();

    // Oracle 1: reconstruct-from-profile is byte-identical to the POST response.
    const reconstructed = JSON.stringify(await readIntake(SLUG));
    assert.equal(reconstructed, postBody);

    // Oracle 2: the legacy mirror parses to the same document.
    const legacy = tc.readFile(SLUG, 'intake.json');
    assert.ok(legacy);
    assert.equal(JSON.stringify(JSON.parse(legacy)), postBody);

    // Oracle 3: a follow-up GET returns the same bytes.
    const get = await GET(ctx(SLUG));
    assert.equal(await get.text(), postBody);
  });

  it('a profile-only client (no legacy file) round-trips through POST→GET', async () => {
    tc.writeProfile(SLUG, sampleDecisions(), '2026-05-01T12:34:56.000Z');
    const res = await POST(ctx(SLUG, { scopeTier: 'polish' }));
    const postBody = JSON.parse(await res.text());
    assert.equal(postBody.scopeTier, 'polish');
    const get = JSON.parse(await (await GET(ctx(SLUG))).text());
    assert.equal(get.scopeTier, 'polish');
  });
});

describe('POST /api/intake/[slug]/lock-scope reads through the repoint', () => {
  let tc: TempClients;
  beforeEach(() => {
    tc = setupTempClients();
    tc.seedClient(SLUG);
  });
  afterEach(() => tc.cleanup());

  it('builds fixes-plan-scope.md from the profile-backed intake', async () => {
    tc.writeProfile(SLUG, sampleDecisions(), '2026-05-01T12:34:56.000Z');
    const redirected: { loc?: string; status?: number } = {};
    const lockCtx = {
      params: { slug: SLUG },
      redirect: (loc: string, status?: number) => {
        redirected.loc = loc;
        redirected.status = status;
        return new Response(null, { status: status ?? 302, headers: { location: loc } });
      },
    } as unknown as Parameters<typeof LOCK_SCOPE>[0];

    const res = await LOCK_SCOPE(lockCtx);
    assert.equal(res.status, 303);
    assert.equal(redirected.loc, `/clients/${SLUG}/intake`);
    const scope = tc.readFile(SLUG, 'fixes-plan-scope.md');
    assert.ok(scope);
    assert.match(scope, /## In scope/);
    assert.match(scope, /seo-001/);
  });
});
