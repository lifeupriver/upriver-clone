import { strict as assert } from 'node:assert';
import { afterEach, beforeEach, describe, it } from 'node:test';

import {
  buildResendPayload,
  isEmailAddress,
  sendEmailIfConfigured,
  sendViaResend,
} from './resend.js';

// report send / monitor / followup all deliver through this helper. These
// tests pin the request contract (payload shape, endpoint, auth header) and
// the no-key fallback — the behaviors a refactor is most likely to break.

function fakeFetch(handler: () => Response): {
  impl: typeof fetch;
  calls: Array<{ url: string; method: string; headers: Record<string, string>; body: unknown }>;
} {
  const calls: Array<{ url: string; method: string; headers: Record<string, string>; body: unknown }> = [];
  const impl = (async (url: unknown, init?: RequestInit) => {
    calls.push({
      url: String(url),
      method: init?.method ?? 'GET',
      headers: (init?.headers ?? {}) as Record<string, string>,
      body: JSON.parse(String(init?.body)),
    });
    return handler();
  }) as typeof fetch;
  return { impl, calls };
}

const EMAIL = {
  from: 'reports@upriverhudsonvalley.com',
  to: 'owner@client.example',
  subject: 'Site update: Acme Co.',
  text: '# Site update\n\nAll good.',
};

describe('buildResendPayload', () => {
  it('wraps the single recipient in an array and includes the core fields', () => {
    const payload = buildResendPayload(EMAIL);
    assert.deepEqual(payload, {
      from: EMAIL.from,
      to: [EMAIL.to],
      subject: EMAIL.subject,
      text: EMAIL.text,
    });
  });

  it('includes html only when provided', () => {
    assert.ok(!('html' in buildResendPayload(EMAIL)));
    const withHtml = buildResendPayload({ ...EMAIL, html: '<p>All good.</p>' });
    assert.equal(withHtml['html'], '<p>All good.</p>');
  });
});

describe('sendViaResend', () => {
  it('POSTs the payload to the Resend endpoint with a bearer token', async () => {
    const { impl, calls } = fakeFetch(() => new Response('{"id":"email_123"}', { status: 200 }));
    const result = await sendViaResend({ ...EMAIL, apiKey: 're_test_key', fetchImpl: impl });
    assert.deepEqual(result, { id: 'email_123' });
    assert.equal(calls.length, 1);
    const call = calls[0]!;
    assert.equal(call.url, 'https://api.resend.com/emails');
    assert.equal(call.method, 'POST');
    assert.equal(call.headers['authorization'], 'Bearer re_test_key');
    assert.deepEqual(call.body, buildResendPayload(EMAIL));
  });

  it('throws with the upstream status + body on non-2xx', async () => {
    const { impl } = fakeFetch(() => new Response('domain not verified', { status: 403 }));
    await assert.rejects(
      sendViaResend({ ...EMAIL, apiKey: 're_test_key', fetchImpl: impl }),
      /Resend 403: domain not verified/,
    );
  });

  it('throws when the response has no id', async () => {
    const { impl } = fakeFetch(() => new Response('{}', { status: 200 }));
    await assert.rejects(
      sendViaResend({ ...EMAIL, apiKey: 're_test_key', fetchImpl: impl }),
      /missing `id`/,
    );
  });
});

describe('sendEmailIfConfigured', () => {
  let savedKey: string | undefined;
  beforeEach(() => {
    savedKey = process.env['RESEND_API_KEY'];
    delete process.env['RESEND_API_KEY'];
  });
  afterEach(() => {
    if (savedKey === undefined) delete process.env['RESEND_API_KEY'];
    else process.env['RESEND_API_KEY'] = savedKey;
  });

  it('skips (never touches the network) when no key is configured', async () => {
    const { impl, calls } = fakeFetch(() => new Response('{"id":"x"}', { status: 200 }));
    const outcome = await sendEmailIfConfigured({ ...EMAIL, fetchImpl: impl });
    assert.deepEqual(outcome, { status: 'skipped', reason: 'RESEND_API_KEY not set' });
    assert.equal(calls.length, 0);
  });

  it('sends with an explicit apiKey', async () => {
    const { impl } = fakeFetch(() => new Response('{"id":"email_9"}', { status: 200 }));
    const outcome = await sendEmailIfConfigured({ ...EMAIL, apiKey: 're_k', fetchImpl: impl });
    assert.deepEqual(outcome, { status: 'sent', id: 'email_9' });
  });

  it('falls back to RESEND_API_KEY from the environment', async () => {
    process.env['RESEND_API_KEY'] = 're_env_key';
    const { impl, calls } = fakeFetch(() => new Response('{"id":"email_env"}', { status: 200 }));
    const outcome = await sendEmailIfConfigured({ ...EMAIL, fetchImpl: impl });
    assert.deepEqual(outcome, { status: 'sent', id: 'email_env' });
    assert.equal(calls[0]!.headers['authorization'], 'Bearer re_env_key');
  });

  it('returns failed (does not throw) on delivery errors', async () => {
    const { impl } = fakeFetch(() => new Response('rate limited', { status: 429 }));
    const outcome = await sendEmailIfConfigured({ ...EMAIL, apiKey: 're_k', fetchImpl: impl });
    assert.equal(outcome.status, 'failed');
    assert.match((outcome as { error: string }).error, /Resend 429/);
  });
});

describe('isEmailAddress', () => {
  it('accepts plain addresses and rejects obvious non-addresses', () => {
    assert.equal(isEmailAddress('owner@client.example'), true);
    assert.equal(isEmailAddress('not-an-email'), false);
    assert.equal(isEmailAddress('two words@x.com'), false);
    assert.equal(isEmailAddress('missing@tld'), false);
  });
});
