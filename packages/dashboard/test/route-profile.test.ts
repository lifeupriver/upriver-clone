import { strict as assert } from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

import { createEmptyProfile, type ClientProfile, type ProfileField } from '@upriver/schemas';

import { handleProfilePost, __resetRateLimit } from '../src/pages/api/profile/[slug].js';
import type { ContentBlock, CreateMessage, CreateResponse } from '../src/lib/coverage-chat.js';
import { setupTempClients, type TempClients } from './_setup.js';

const SLUG = 'littlefriends';
const NOW = '2026-06-05T00:00:00.000Z';
const TOKEN = `tok_${'a'.repeat(36)}`; // 40 chars — passes the length gate

function ctx(slug: string | undefined, body?: unknown) {
  return {
    params: { slug },
    request: new Request('http://localhost/api/profile/x', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  };
}

/** A scripted model: a tool_use on the first call, then a closing text turn. */
function createWith(blocks: ContentBlock[]): CreateMessage {
  let n = 0;
  return async (): Promise<CreateResponse> => {
    const r: CreateResponse =
      n === 0 ? { stop_reason: 'tool_use', content: blocks } : { stop_reason: 'end_turn', content: [{ type: 'text', text: 'thanks' }] };
    n += 1;
    return r;
  };
}
const textOnly: CreateMessage = async () => ({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'hi there' }] });
const recordTool = (path: string, value: unknown): ContentBlock => ({
  type: 'tool_use',
  id: 'tu1',
  name: 'record_answer',
  input: { path, value },
});

function envOperator<T>(value: T): ProfileField<T> {
  return { value, source: 'operator', confidence: 'high', verified: false, updatedAt: NOW };
}
function writeProfile(tc: TempClients, slug: string, profile: ClientProfile): void {
  tc.writeFile(slug, 'profile.json', `${JSON.stringify(profile, null, 2)}\n`);
}
function seed(tc: TempClients, slug: string, profile: ClientProfile | null): void {
  tc.seedClient(slug);
  tc.writeFile(slug, 'interview-share.json', JSON.stringify({ token: TOKEN, createdAt: NOW }));
  if (profile) writeProfile(tc, slug, profile);
}
const deps = (create: CreateMessage) => ({ create, now: () => NOW });

describe('POST /api/profile/[slug] — trust boundary (PRD §7)', () => {
  let tc: TempClients;
  beforeEach(() => {
    tc = setupTempClients();
    __resetRateLimit();
  });
  afterEach(() => tc.cleanup());

  it('rejects an absent or invalid token (401)', async () => {
    seed(tc, SLUG, createEmptyProfile(SLUG, NOW));
    const missing = await handleProfilePost(ctx(SLUG, { messages: [] }), deps(textOnly));
    assert.equal(missing.status, 401);
    const wrong = await handleProfilePost(ctx(SLUG, { token: `tok_${'b'.repeat(36)}`, messages: [] }), deps(textOnly));
    assert.equal(wrong.status, 401);
  });

  it('404 when the client has a token but no profile', async () => {
    seed(tc, SLUG, null);
    const res = await handleProfilePost(ctx(SLUG, { token: TOKEN, messages: [] }), deps(textOnly));
    assert.equal(res.status, 404);
  });

  it('accepts a whitelisted write as source:interview, bumps revision, shrinks the gap (end-to-end)', async () => {
    seed(tc, SLUG, createEmptyProfile(SLUG, NOW));
    const create = createWith([recordTool('people.keyTeam', [{ name: 'Jane Doe', role: 'Director' }])]);
    const res = await handleProfilePost(ctx(SLUG, { token: TOKEN, messages: [{ role: 'user', content: 'Jane is our director' }] }), deps(create));
    const body = JSON.parse(await res.text());
    assert.equal(res.status, 200);
    assert.equal(body.ok, true);
    assert.deepEqual(body.writes.map((w: { path: string }) => w.path), ['people.keyTeam']);
    assert.equal(body.revision, 1); // 0 → 1
    assert.ok(!body.gap.includes('people.keyTeam'), 'gap shrinks');
    // Persisted as source:interview, never verified.
    const saved = JSON.parse(tc.readFile(SLUG, 'profile.json') as string) as ClientProfile;
    const env = (saved as unknown as Record<string, Record<string, ProfileField<unknown>>>)['people']['keyTeam'];
    assert.equal(env.source, 'interview');
    assert.equal(env.verified, false);
    // Provenance logged.
    const responses = JSON.parse(tc.readFile(SLUG, 'interview-responses.json') as string);
    assert.equal(responses.chatbotFills.length, 1);
  });

  it('rejects a non-whitelisted path, an HV path, a verified-segment path, and an envelope-shaped value', async () => {
    seed(tc, SLUG, createEmptyProfile(SLUG, NOW));
    const cases: Array<[string, ContentBlock, RegExp]> = [
      ['identity.legalName', recordTool('identity.legalName', 'Acme LLC'), /not a chatbot-fillable field/],
      ['toolsAndAccess.stack', recordTool('toolsAndAccess.stack', ['CRM']), /human-verify-required/],
      ['content.verified', recordTool('content.verified', true), /not client-writable/],
      ['people.keyTeam(envelope)', recordTool('people.keyTeam', { value: [{ name: 'X' }], verified: true, source: 'operator' }), /not an envelope/],
    ];
    for (const [label, block, reason] of cases) {
      const res = await handleProfilePost(ctx(SLUG, { token: TOKEN, messages: [{ role: 'user', content: 'x' }] }), deps(createWith([block])));
      const body = JSON.parse(await res.text());
      assert.equal(res.status, 200);
      assert.equal(body.writes.length, 0, `no write for ${label}`);
      assert.match(body.rejected[0].reason, reason);
    }
    // Profile untouched (still revision 0, no people section written).
    const saved = JSON.parse(tc.readFile(SLUG, 'profile.json') as string) as ClientProfile;
    assert.equal(saved._meta.revision, 0);
  });

  it('rejects a schema-invalid value for a whitelisted field', async () => {
    seed(tc, SLUG, createEmptyProfile(SLUG, NOW));
    // people.keyTeam must be an array of {name,...}; a number is invalid.
    const res = await handleProfilePost(ctx(SLUG, { token: TOKEN, messages: [{ role: 'user', content: 'x' }] }), deps(createWith([recordTool('people.keyTeam', 123)])));
    const body = JSON.parse(await res.text());
    assert.equal(body.writes.length, 0);
    assert.match(body.rejected[0].reason, /schema/);
  });

  it('queues a conflict instead of overwriting a higher-precedence operator value', async () => {
    const profile = createEmptyProfile(SLUG, NOW);
    (profile as unknown as Record<string, Record<string, unknown>>)['people'] = {
      keyTeam: envOperator([{ name: 'Existing Owner' }]),
    };
    seed(tc, SLUG, profile);
    const res = await handleProfilePost(
      ctx(SLUG, { token: TOKEN, messages: [{ role: 'user', content: 'x' }] }),
      deps(createWith([recordTool('people.keyTeam', [{ name: 'Jane Doe' }])])),
    );
    const body = JSON.parse(await res.text());
    assert.equal(body.writes.length, 0);
    assert.match(body.rejected[0].reason, /operator review|higher-precedence/);
    // Operator value preserved; conflict queued.
    const saved = JSON.parse(tc.readFile(SLUG, 'profile.json') as string) as ClientProfile;
    const env = (saved as unknown as Record<string, Record<string, ProfileField<{ name: string }[]>>>)['people']['keyTeam'];
    assert.equal(env.source, 'operator');
    assert.equal(env.value?.[0]?.name, 'Existing Owner');
    const conflicts = JSON.parse(tc.readFile(SLUG, 'profile-conflicts.json') as string);
    assert.equal(conflicts.length, 1);
    assert.equal(conflicts[0].path, 'people.keyTeam');
  });

  it('rate-limits per token', async () => {
    seed(tc, SLUG, createEmptyProfile(SLUG, NOW));
    let last = 200;
    for (let i = 0; i < 22; i++) {
      const res = await handleProfilePost(ctx(SLUG, { token: TOKEN, messages: [{ role: 'user', content: 'hi' }] }), deps(textOnly));
      last = res.status;
    }
    assert.equal(last, 429);
  });
});
