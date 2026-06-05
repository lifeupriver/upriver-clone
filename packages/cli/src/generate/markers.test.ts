import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanMarkers, scanOperatorActions } from './markers.js';

test('scanMarkers finds multiple markers in order', () => {
  const text = 'A [NEEDS CONFIRMATION: owner name?] B [NEEDS CONFIRMATION: exact price?] C';
  assert.deepEqual(scanMarkers(text), ['owner name?', 'exact price?']);
});

test('scanMarkers handles a multiline question and collapses whitespace', () => {
  assert.deepEqual(scanMarkers('[NEEDS CONFIRMATION: what is\n the   license number?]'), [
    'what is the license number?',
  ]);
});

test('scanMarkers returns [] when there are none', () => {
  assert.deepEqual(scanMarkers('a clean document with no markers'), []);
});

test('scanMarkers skips an empty question', () => {
  assert.deepEqual(scanMarkers('[NEEDS CONFIRMATION: ]'), []);
});

test('scanOperatorActions finds multiple click-ops in order, collapsing whitespace', () => {
  const text =
    'Create the Project. [OPERATOR ACTION: create the client Project] Then [OPERATOR ACTION: complete the\n  Gmail OAuth consent] done.';
  assert.deepEqual(scanOperatorActions(text), [
    'create the client Project',
    'complete the Gmail OAuth consent',
  ]);
});

test('scanOperatorActions returns [] when there are none, and skips empties', () => {
  assert.deepEqual(scanOperatorActions('a clean runbook with no click-ops'), []);
  assert.deepEqual(scanOperatorActions('[OPERATOR ACTION: ]'), []);
});

test('the two marker classes do not cross-match', () => {
  const text = '[NEEDS CONFIRMATION: which plan tier?] [OPERATOR ACTION: upload the skill ZIP]';
  assert.deepEqual(scanMarkers(text), ['which plan tier?']);
  assert.deepEqual(scanOperatorActions(text), ['upload the skill ZIP']);
});
