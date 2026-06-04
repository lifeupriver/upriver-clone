import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  pathResolves,
  isConcretePath,
  validateSetPath,
  enumerateLeafPaths,
  isValidLeafPath,
  hintForPath,
  validateCandidateValue,
} from './paths.js';

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

// --- leaf enumeration + candidate-value validation (folded from transcript/paths.test.ts,
//     tier-2 integration seam #1) ---

test('enumerateLeafPaths walks the schema to envelope leaves (incl. nested objects + modules)', () => {
  const paths = new Set(enumerateLeafPaths().map((e) => e.path));
  for (const p of [
    'identity.publicName',
    'capacity.metrics',
    'capacity.bookingLeadTime',
    'pricing.deposit',
    'pricing.refundPolicy',
    'governance.regulatedData',
    'salesProcess.close.definition',
    'salesProcess.funnel.revenuePerCustomer',
    'content.photos.rights',
    'voice.attributes',
    'modules.preschool.enrollmentCapacity',
    'modules.preschool.ocfs.licenseStatus',
    'modules.preschool.trainingMatrix',
  ]) {
    assert.ok(paths.has(p), `expected leaf path ${p}`);
  }
});

test('enumerateLeafPaths excludes _meta and non-leaf intermediates', () => {
  const paths = new Set(enumerateLeafPaths().map((e) => e.path));
  for (const p of [
    '_meta',
    '_meta.slug',
    'capacity',
    'salesProcess',
    'salesProcess.close',
    'content.photos',
    'modules',
    'modules.preschool',
  ]) {
    assert.ok(!paths.has(p), `did not expect ${p}`);
  }
});

test('isValidLeafPath accepts real leaves and rejects bogus / intermediate paths', () => {
  assert.ok(isValidLeafPath('capacity.bookingLeadTime'));
  assert.ok(isValidLeafPath('modules.preschool.enrollmentCapacity'));
  assert.ok(!isValidLeafPath('capacity.bogus'));
  assert.ok(!isValidLeafPath('foo.bar'));
  assert.ok(!isValidLeafPath('salesProcess.close')); // intermediate object, not a leaf
  assert.ok(!isValidLeafPath('modules.preschool')); // intermediate
});

test('hintForPath gives a coarse type hint per leaf', () => {
  assert.match(hintForPath('capacity.metrics') ?? '', /array/);
  assert.match(hintForPath('capacity.bookingLeadTime') ?? '', /object/);
  assert.match(hintForPath('pricing.deposit') ?? '', /string/);
  assert.match(hintForPath('governance.itSecurityFunctionExists') ?? '', /boolean/);
});

test('validateCandidateValue accepts values that fit the inner schema', () => {
  assert.equal(
    validateCandidateValue('capacity.bookingLeadTime', { typical: '~8 weeks', minimum: '~2 weeks' }).ok,
    true,
  );
  assert.equal(validateCandidateValue('governance.regulatedData', ['PII', 'Payment data']).ok, true);
  assert.equal(validateCandidateValue('pricing.deposit', "one month's tuition").ok, true);
});

test('validateCandidateValue rejects values that violate the inner schema', () => {
  assert.equal(validateCandidateValue('capacity.metrics', 'not-an-array').ok, false);
  assert.equal(validateCandidateValue('governance.regulatedData', [123]).ok, false);
});

test('validateCandidateValue rejects unknown paths', () => {
  const r = validateCandidateValue('foo.bar', 'x');
  assert.equal(r.ok, false);
});

test('validateCandidateValue is not derailed by an over-long quote (evidence excluded)', () => {
  // A 5000-char value-side string is fine for a string leaf; evidence cap is separate.
  const long = 'a'.repeat(5000);
  assert.equal(validateCandidateValue('pricing.deposit', long).ok, true);
});
