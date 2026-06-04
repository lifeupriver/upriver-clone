import { test } from 'node:test';
import assert from 'node:assert/strict';

import { pathResolves, isConcretePath, validateSetPath } from './paths.js';

test('pathResolves: a concrete envelope leaf resolves against clientProfileZ', () => {
  assert.equal(pathResolves('identity.publicName'), true);
  assert.equal(pathResolves('pricing.deposit'), true);
  assert.equal(pathResolves('modules.preschool.ocfs.licenseStatus'), true);
});

test('pathResolves: wildcard HV gate paths resolve (* one segment, trailing **)', () => {
  assert.equal(pathResolves('offerings.core.*.priceRange'), true);
  assert.equal(pathResolves('modules.preschool.ocfs.**'), true);
  assert.equal(pathResolves('pricing.**'), true);
});

test('pathResolves: unknown paths do not resolve', () => {
  assert.equal(pathResolves('identity.bogus'), false);
  assert.equal(pathResolves('nonsense.field'), false);
  assert.equal(pathResolves('pricing.deposit.bogus'), false);
});

test('isConcretePath: a path with no wildcard is concrete; * and ** are not', () => {
  assert.equal(isConcretePath('pricing.deposit'), true);
  assert.equal(isConcretePath('offerings.core.*.priceRange'), false);
  assert.equal(isConcretePath('modules.preschool.ocfs.**'), false);
});

test('validateSetPath: a concrete envelope leaf is valid', () => {
  assert.deepEqual(validateSetPath('pricing.deposit'), { ok: true });
  assert.deepEqual(validateSetPath('goals.budgetConstraints'), { ok: true });
});

test('validateSetPath: a wildcard path is rejected (cannot write to a wildcard)', () => {
  const r = validateSetPath('offerings.core.*.priceRange');
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.reason, /wildcard/i);
});

test('validateSetPath: an unknown path is rejected', () => {
  const r = validateSetPath('pricing.nonsense');
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.reason, /resolve/i);
});

test('validateSetPath: a value inside an envelope is rejected (not a field/leaf)', () => {
  const r = validateSetPath('pricing.deposit.value');
  assert.equal(r.ok, false);
  if (!r.ok) assert.match(r.reason, /field/i);
});

test('validateSetPath: a whole section is rejected (not an envelope leaf)', () => {
  const r = validateSetPath('pricing');
  assert.equal(r.ok, false);
});
