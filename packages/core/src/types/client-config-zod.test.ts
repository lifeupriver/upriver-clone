import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { ClientConfigZ } from './client-config-zod.js';
import { VERTICALS } from './client-config.js';

const base = {
  slug: 'acme-co',
  name: 'Acme Co',
  url: 'https://acme.example',
  created_at: '2026-01-01',
};

describe('ClientConfigZ — vertical enum stays in sync with the Vertical union', () => {
  it('accepts every value in the VERTICALS tuple', () => {
    for (const vertical of VERTICALS) {
      const parsed = ClientConfigZ.safeParse({ ...base, vertical });
      assert.equal(parsed.success, true, `vertical "${vertical}" should parse`);
    }
  });

  it('includes the five generalization verticals', () => {
    for (const v of ['retail', 'home-services', 'medical', 'fitness', 'nonprofit']) {
      assert.ok((VERTICALS as readonly string[]).includes(v), `missing vertical "${v}"`);
    }
  });

  it('rejects unknown verticals', () => {
    assert.equal(ClientConfigZ.safeParse({ ...base, vertical: 'florist' }).success, false);
  });
});

describe('ClientConfigZ — optional locality fields', () => {
  it('accepts a config without locality fields (backward compatible)', () => {
    const parsed = ClientConfigZ.parse(base);
    assert.equal(parsed.city, undefined);
    assert.equal(parsed.region, undefined);
    assert.equal(parsed.serviceArea, undefined);
    assert.equal(parsed.localBusiness, undefined);
  });

  it('accepts well-formed locality fields', () => {
    const parsed = ClientConfigZ.parse({
      ...base,
      city: 'Austin',
      region: 'Travis County',
      serviceArea: ['Round Rock', 'Pflugerville'],
      localBusiness: true,
    });
    assert.equal(parsed.city, 'Austin');
    assert.equal(parsed.region, 'Travis County');
    assert.deepEqual(parsed.serviceArea, ['Round Rock', 'Pflugerville']);
    assert.equal(parsed.localBusiness, true);
  });

  it('accepts localBusiness: false for online-only businesses', () => {
    const parsed = ClientConfigZ.parse({ ...base, localBusiness: false });
    assert.equal(parsed.localBusiness, false);
  });

  it('rejects malformed locality fields', () => {
    assert.equal(ClientConfigZ.safeParse({ ...base, serviceArea: 'Round Rock' }).success, false);
    assert.equal(ClientConfigZ.safeParse({ ...base, localBusiness: 'yes' }).success, false);
  });
});
