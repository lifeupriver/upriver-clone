import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clientProfileZ } from './client-profile.js';
import fixture from './fixtures/littlefriends.profile.json' with { type: 'json' };

test('littlefriends fixture parses against clientProfileZ', () => {
  const result = clientProfileZ.safeParse(fixture);
  if (!result.success) {
    assert.fail('fixture failed to parse:\n' + JSON.stringify(result.error.issues, null, 2));
  }
});

test('fixture has the preschool module present', () => {
  const profile = clientProfileZ.parse(fixture);
  assert.ok(profile.modules?.preschool, 'preschool module present');
  assert.ok(profile.modules?.preschool?.enrollmentCapacity?.value, 'enrollment capacity filled');
});

test('fixture _meta is well-formed', () => {
  const profile = clientProfileZ.parse(fixture);
  assert.equal(profile._meta.slug, 'littlefriends');
  assert.equal(profile._meta.version, 1);
  assert.equal(profile._meta.revision, 1);
});

test('HV pricing fields are present but unverified (the expected initial state)', () => {
  const profile = clientProfileZ.parse(fixture);
  assert.equal(profile.pricing?.deposit?.verified, false);
  assert.equal(profile.pricing?.shareable?.verified, false);
});
