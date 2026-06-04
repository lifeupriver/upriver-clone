import { test } from 'node:test';
import assert from 'node:assert/strict';
import { scanMarkers } from './markers.js';

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
