import { strict as assert } from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  handleIntakeGet,
  handleIntakePost,
  handleLockScope,
  type IntakeRouteDeps,
} from '../src/pages/api/intake/_intake-handler.js';
import { readIntake } from '../src/lib/fs-reader.js';
import { sampleDecisions, setupTempClients, type TempClients } from './_setup.js';

const SLUG = 'acme-co';
const TOKEN = `sharetok_${'a'.repeat(24)}`;

/** Minimal Astro API context for the [slug] route. `?t=` rides the URL. */
function ctx(slug: string | undefined, body?: unknown, token?: string) {
  const qs = token ? `?t=${encodeURIComponent(token)}` : '';
  return {
    params: { slug },
    request: new Request(`http://localhost/api/intake/x${qs}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  };
}

/** Deps stub: an operator session (the route's real wiring in local mode). */
const operatorDeps: IntakeRouteDeps = {
  getOperator: async () => ({ id: 'op-1' }),
  validateToken: async () => false,
};

/** Deps stub: anonymous caller; only TOKEN validates, and only for SLUG. */
const anonDeps: IntakeRouteDeps = {
  getOperator: async () => null,
  validateToken: async (slug, token) => slug === SLUG && token === TOKEN,
};

describe('GET /api/intake/[slug]', () => {
  let tc: TempClients;
  beforeEach(() => {
    tc = setupTempClients();
  });
  afterEach(() => tc.cleanup());

  it('404 when the client does not exist', async () => {
    const res = await handleIntakeGet(ctx(SLUG), operatorDeps);
    assert.equal(res.status, 404);
  });

  it('returns {} when the client exists but has no intake', async () => {
    tc.seedClient(SLUG);
    const res = await handleIntakeGet(ctx(SLUG), operatorDeps);
    assert.equal(res.status, 200);
    assert.equal(await res.text(), '{}');
  });

  it('reads a profile-backed intake (storage repoint, same contract)', async () => {
    tc.seedClient(SLUG);
    tc.writeProfile(SLUG, sampleDecisions(), '2026-05-01T12:34:56.000Z');
    const res = await handleIntakeGet(ctx(SLUG), operatorDeps);
    const body = JSON.parse(await res.text());
    assert.equal(body.scopeTier, 'rebuild');
    assert.equal(body.version, 1);
    assert.equal(body.updatedAt, '2026-05-01T12:34:56.000Z');
  });
});

describe('GET/POST /api/intake/[slug] — auth gate (operator OR share token)', () => {
  let tc: TempClients;
  beforeEach(() => {
    tc = setupTempClients();
    tc.seedClient(SLUG);
  });
  afterEach(() => tc.cleanup());

  it('401 on an unauthenticated GET (no session, no token)', async () => {
    const res = await handleIntakeGet(ctx(SLUG), anonDeps);
    assert.equal(res.status, 401);
  });

  it('401 on an unauthenticated POST, and nothing is written', async () => {
    const res = await handleIntakePost(ctx(SLUG, { scopeTier: 'polish' }), anonDeps);
    assert.equal(res.status, 401);
    assert.equal(await readIntake(SLUG), null, 'no intake persisted for an anonymous caller');
  });

  it('401 on a wrong token; it cannot probe slug existence either', async () => {
    const res = await handleIntakeGet(ctx(SLUG, undefined, 'not-the-token'), anonDeps);
    assert.equal(res.status, 401);
    // A bad token against a NON-existent slug returns the same 401, not 404.
    tc.cleanup();
    tc = setupTempClients();
    const probe = await handleIntakeGet(ctx(SLUG, undefined, 'not-the-token'), anonDeps);
    assert.equal(probe.status, 401);
  });

  it('a valid ?t= share token authorizes GET and POST for its slug', async () => {
    const post = await handleIntakePost(ctx(SLUG, { scopeTier: 'polish' }, TOKEN), anonDeps);
    assert.equal(post.status, 200);
    const get = await handleIntakeGet(ctx(SLUG, undefined, TOKEN), anonDeps);
    assert.equal(get.status, 200);
    assert.equal(JSON.parse(await get.text()).scopeTier, 'polish');
  });

  it('a token for slug A does not authorize slug B', async () => {
    tc.seedClient('other-co');
    const res = await handleIntakeGet(ctx('other-co', undefined, TOKEN), anonDeps);
    assert.equal(res.status, 401);
  });

  it('400 on a malformed slug, for GET and POST, before any auth or IO', async () => {
    for (const bad of ['Bad_Slug!', '..', 'UPPER', 'a b', '-leading']) {
      const get = await handleIntakeGet(ctx(bad), operatorDeps);
      assert.equal(get.status, 400, `GET expected 400 for ${JSON.stringify(bad)}`);
      const post = await handleIntakePost(ctx(bad, { scopeTier: 'polish' }), operatorDeps);
      assert.equal(post.status, 400, `POST expected 400 for ${JSON.stringify(bad)}`);
    }
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
    const res = await handleIntakePost(ctx(SLUG, partial), operatorDeps);
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
    const get = await handleIntakeGet(ctx(SLUG), operatorDeps);
    assert.equal(await get.text(), postBody);
  });

  it('a profile-only client (no legacy file) round-trips through POST→GET', async () => {
    tc.writeProfile(SLUG, sampleDecisions(), '2026-05-01T12:34:56.000Z');
    const res = await handleIntakePost(ctx(SLUG, { scopeTier: 'polish' }), operatorDeps);
    const postBody = JSON.parse(await res.text());
    assert.equal(postBody.scopeTier, 'polish');
    const get = JSON.parse(await (await handleIntakeGet(ctx(SLUG), operatorDeps)).text());
    assert.equal(get.scopeTier, 'polish');
  });
});

describe('POST /api/intake/[slug]/lock-scope', () => {
  let tc: TempClients;
  beforeEach(() => {
    tc = setupTempClients();
    tc.seedClient(SLUG);
  });
  afterEach(() => tc.cleanup());

  function lockCtx(slug: string, redirected: { loc?: string; status?: number }) {
    return {
      ...ctx(slug),
      redirect: (loc: string, status?: number) => {
        redirected.loc = loc;
        redirected.status = status;
        return new Response(null, { status: status ?? 302, headers: { location: loc } });
      },
    };
  }

  it('builds fixes-plan-scope.md from the profile-backed intake (reads through the repoint)', async () => {
    tc.writeProfile(SLUG, sampleDecisions(), '2026-05-01T12:34:56.000Z');
    const redirected: { loc?: string; status?: number } = {};

    const res = await handleLockScope(lockCtx(SLUG, redirected), operatorDeps);
    assert.equal(res.status, 303);
    assert.equal(redirected.loc, `/clients/${SLUG}/intake`);
    const scope = tc.readFile(SLUG, 'fixes-plan-scope.md');
    assert.ok(scope);
    assert.match(scope, /## In scope/);
    assert.match(scope, /seo-001/);
  });

  it('401 for a non-operator — a share token does NOT authorize a scope lock', async () => {
    tc.writeProfile(SLUG, sampleDecisions(), '2026-05-01T12:34:56.000Z');
    const redirected: { loc?: string; status?: number } = {};
    const withToken = {
      ...lockCtx(SLUG, redirected),
      request: new Request(`http://localhost/api/intake/x/lock-scope?t=${TOKEN}`, { method: 'POST' }),
    };
    const res = await handleLockScope(withToken, anonDeps);
    assert.equal(res.status, 401);
    assert.equal(tc.readFile(SLUG, 'fixes-plan-scope.md'), null, 'no scope doc written');
  });

  it('400 on a malformed slug', async () => {
    const redirected: { loc?: string; status?: number } = {};
    const res = await handleLockScope(lockCtx('Bad_Slug!', redirected), operatorDeps);
    assert.equal(res.status, 400);
  });
});
