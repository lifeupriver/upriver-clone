import { strict as assert } from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { handlePortalPost, PORTAL_LABEL, type PortalPostDeps } from '../src/pages/api/portal/_portal-handler.js';
import { validateInterviewToken } from '../src/lib/interview.js';
import type { ShareTokenRecord, MintShareTokenOptions } from '../src/lib/share-token.js';
import { setupTempClients, type TempClients } from './_setup.js';

const SLUG = 'littlefriends';
const NOW = '2026-06-09T00:00:00.000Z';
const TOKEN1 = `portaltok1_${'a'.repeat(24)}`; // > 16 chars — passes validateInterviewToken
const TOKEN2 = `portaltok2_${'b'.repeat(24)}`;

function ctx(slug: string | undefined, headers: Record<string, string> = {}) {
  return {
    params: { slug },
    request: new Request('http://localhost/api/portal/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json', ...headers },
      body: '{}',
    }),
    cookies: {} as unknown,
  };
}

function rec(token: string, opts: MintShareTokenOptions, id: string): ShareTokenRecord {
  return {
    id,
    slug: opts.slug,
    token,
    createdAt: NOW,
    expiresAt: null,
    label: opts.label ?? null,
  };
}

/** A deps builder: an operator (or not), a scripted mint sequence, and spies. */
function makeDeps(
  over: Partial<PortalPostDeps> & { operator?: boolean; tokens?: string[]; existing?: ShareTokenRecord[] } = {},
): { deps: PortalPostDeps; revoked: string[]; minted: ShareTokenRecord[] } {
  const revoked: string[] = [];
  const minted: ShareTokenRecord[] = [];
  let store: ShareTokenRecord[] = over.existing ? [...over.existing] : [];
  const seq = over.tokens ?? [TOKEN1, TOKEN2];
  let n = 0;
  const deps: PortalPostDeps = {
    getOperator: async () => (over.operator === false ? null : { id: 'op-1' }),
    listTokens: async () => [...store],
    revoke: async (id: string) => {
      revoked.push(id);
      store = store.filter((t) => t.id !== id);
    },
    mint: async (opts: MintShareTokenOptions) => {
      const r = rec(seq[n] ?? `tok_${n}`, opts, `id-${n}`);
      n += 1;
      minted.push(r);
      store.push(r);
      return r;
    },
    now: () => NOW,
    ...over,
  };
  return { deps, revoked, minted };
}

describe('POST /api/portal/[slug] — operator portal-link mint (Build Spec 12 §C)', () => {
  let tc: TempClients;
  beforeEach(() => {
    tc = setupTempClients();
    tc.seedClient(SLUG);
  });
  afterEach(() => tc.cleanup());

  it('rejects a non-operator session with 401 and mints nothing', async () => {
    const { deps, minted } = makeDeps({ operator: false });
    const res = await handlePortalPost(ctx(SLUG), deps);
    assert.equal(res.status, 401);
    assert.equal(minted.length, 0, 'no token minted for a non-operator');
  });

  it('404 when the client does not exist', async () => {
    const { deps } = makeDeps();
    const res = await handlePortalPost(ctx('no-such-client'), deps);
    assert.equal(res.status, 404);
  });

  it('mints a portal link and round-trips the token through the data source', async () => {
    const { deps, minted } = makeDeps();
    const res = await handlePortalPost(ctx(SLUG), deps);
    assert.equal(res.status, 200);
    const body = JSON.parse(await res.text());
    assert.equal(body.ok, true);

    // Minted via the share-token mechanism, labelled as a portal token.
    assert.equal(minted.length, 1);
    assert.equal(minted[0].label, PORTAL_LABEL);

    // Round-trip: the token is persisted to interview-share.json THROUGH the
    // data source, and validateInterviewToken reads it back as valid.
    const share = JSON.parse(tc.readFile(SLUG, 'interview-share.json') as string);
    assert.equal(share.token, TOKEN1);
    assert.equal(await validateInterviewToken(SLUG, TOKEN1), true);
  });

  it('returns the correct client URL shape (intake-chat, both gate params)', async () => {
    const { deps } = makeDeps();
    const res = await handlePortalPost(ctx(SLUG), deps);
    const body = JSON.parse(await res.text());
    assert.equal(
      body.url,
      `http://localhost/deliverables/${SLUG}/intake-chat?t=${TOKEN1}&token=${TOKEN1}`,
    );
  });

  it('regeneration rotates the token and invalidates the old link', async () => {
    // First mint.
    const { deps, revoked } = makeDeps();
    await handlePortalPost(ctx(SLUG), deps);
    assert.equal(await validateInterviewToken(SLUG, TOKEN1), true);
    assert.equal(revoked.length, 0, 'first mint revokes nothing');

    // Regenerate — same deps (store now holds the first portal token).
    const res2 = await handlePortalPost(ctx(SLUG), deps);
    const body2 = JSON.parse(await res2.text());
    assert.equal(body2.token, TOKEN2, 'a fresh token is issued');

    // Old Postgres token revoked (kills the ?t= middleware gate)…
    assert.deepEqual(revoked, ['id-0']);
    // …and interview-share.json now holds only the new token (kills the
    // ?token= page gate for the old link).
    assert.equal(await validateInterviewToken(SLUG, TOKEN1), false, 'old link dies');
    assert.equal(await validateInterviewToken(SLUG, TOKEN2), true, 'new link works');
  });

  it('only rotates portal-labelled tokens, never other share links for the slug', async () => {
    const other: ShareTokenRecord = {
      id: 'other-1',
      slug: SLUG,
      token: 'someDeliverableShareTokenXXXXXXXX',
      createdAt: NOW,
      expiresAt: null,
      label: 'audit-report review',
    };
    const { deps, revoked } = makeDeps({ existing: [other] });
    await handlePortalPost(ctx(SLUG), deps);
    assert.equal(revoked.length, 0, 'a non-portal share link is left untouched');
  });

  it('400 on a malformed slug', async () => {
    const { deps } = makeDeps();
    const res = await handlePortalPost(ctx('Bad_Slug!'), deps);
    assert.equal(res.status, 400);
  });
});
