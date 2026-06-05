import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  I_SERIES,
  OPERATOR_ACTION_INSTRUCTION,
  isProvisioning,
  provisioningOutputContract,
} from './provisioning.js';

test('I_SERIES is the nine client-facing provisioning artifacts i01–i09', () => {
  assert.equal(I_SERIES.length, 9);
  assert.deepEqual([...I_SERIES], ['i01', 'i02', 'i03', 'i04', 'i05', 'i06', 'i07', 'i08', 'i09']);
  assert.ok(I_SERIES.every((id) => id.startsWith('i')));
});

test('isProvisioning is true for an i-artifact, false for a prose doc', () => {
  assert.equal(isProvisioning('i07'), true);
  assert.equal(isProvisioning('i01'), true);
  assert.equal(isProvisioning('doc-01'), false);
  assert.equal(isProvisioning('doc-13'), false);
});

test('provisioningOutputContract emits the three-part shape + both marker classes', () => {
  const contract = provisioningOutputContract('client-access-governance.md', 'MARKER_INSTRUCTION_TEXT');
  // three parts
  assert.match(contract, /Operator runbook/);
  assert.match(contract, /Operator must do \(cannot be generated\)/);
  assert.match(contract, /section-by-section template/);
  // the suggested filename is threaded in
  assert.match(contract, /client-access-governance\.md/);
  // both marker classes present (the shared NEEDS-CONFIRMATION instruction is injected; the operator one is built in)
  assert.match(contract, /MARKER_INSTRUCTION_TEXT/);
  assert.ok(contract.includes(OPERATOR_ACTION_INSTRUCTION));
});

test('the operator-action instruction names the click-ops it covers', () => {
  assert.match(OPERATOR_ACTION_INSTRUCTION, /\[OPERATOR ACTION:/);
  assert.match(OPERATOR_ACTION_INSTRUCTION, /OAuth/);
  assert.match(OPERATOR_ACTION_INSTRUCTION, /upload/i);
  assert.match(OPERATOR_ACTION_INSTRUCTION, /plan tier|billing/);
});
