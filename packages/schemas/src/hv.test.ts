import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  matchHvPath,
  isHumanVerifyRequired,
  assertGeneratable,
  unverifiedHvFields,
} from './hv.js';

test('matchHvPath: trailing ** matches the node and anything below', () => {
  assert.equal(matchHvPath('pricing.**', 'pricing'), true);
  assert.equal(matchHvPath('pricing.**', 'pricing.deposit'), true);
  assert.equal(matchHvPath('pricing.**', 'pricing.shareable.0.price'), true);
  assert.equal(matchHvPath('pricing.**', 'capacity.metrics'), false);
});

test('matchHvPath: single-segment wildcard matches exactly one segment', () => {
  assert.equal(matchHvPath('offerings.core.*.priceRange', 'offerings.core.0.priceRange'), true);
  assert.equal(matchHvPath('offerings.core.*.priceRange', 'offerings.core.0.name'), false);
});

test('matchHvPath: a fully-consumed literal glob matches itself and below', () => {
  assert.equal(matchHvPath('people.billingContact', 'people.billingContact'), true);
  assert.equal(matchHvPath('people.billingContact', 'people.billingContact.email'), true);
  assert.equal(matchHvPath('people.billingContact', 'people'), false);
  assert.equal(matchHvPath('people.billingContact', 'people.routing'), false);
});

test('isHumanVerifyRequired reflects the registry', () => {
  assert.equal(isHumanVerifyRequired('pricing.deposit'), true);
  assert.equal(isHumanVerifyRequired('capacity.bookingLeadTime'), true);
  assert.equal(isHumanVerifyRequired('governance.dataRetention'), true);
  assert.equal(isHumanVerifyRequired('offerings.core.0.priceRange'), true);
  assert.equal(isHumanVerifyRequired('modules.preschool.ocfs.licenseStatus'), true);
  assert.equal(isHumanVerifyRequired('identity.legalName'), false);
  assert.equal(isHumanVerifyRequired('offerings.core.0.name'), false);
});

const profile = {
  _meta: { version: 1, slug: 's', createdAt: 'x', updatedAt: 'x', revision: 0 },
  pricing: {
    deposit: { value: '$500', source: 'operator', confidence: 'high', verified: false, updatedAt: 'x' },
    refundPolicy: { value: 'none', source: 'operator', confidence: 'high', verified: true, updatedAt: 'x' },
  },
  identity: {
    legalName: { value: 'LF', source: 'recon', confidence: 'low', verified: false, updatedAt: 'x' },
  },
} as Record<string, unknown>;

test('assertGeneratable blocks unverified HV paths only', () => {
  assert.deepEqual(
    assertGeneratable(profile, ['pricing.deposit', 'pricing.refundPolicy', 'identity.legalName']),
    { ok: false, blockedBy: ['pricing.deposit'] },
  );
  assert.deepEqual(assertGeneratable(profile, ['pricing.refundPolicy', 'identity.legalName']), {
    ok: true,
  });
});

test('unverifiedHvFields(profile) scans envelopes for unverified HV fields', () => {
  assert.deepEqual(unverifiedHvFields(profile), ['pricing.deposit']);
});

test('unverifiedHvFields with explicit paths filters that set', () => {
  assert.deepEqual(unverifiedHvFields(profile, ['pricing.deposit', 'identity.legalName']), [
    'pricing.deposit',
  ]);
});
