import { test } from 'node:test';
import assert from 'node:assert/strict';

import { assertIdentity } from './identity-assert.js';

const ok = {
  content: '# Brand Voice\n\nLittle Friends Learning Loft is a preschool in Newburgh.',
  publicName: 'Little Friends Learning Loft',
  foreignNames: ["Audrey's Bakery"],
};

test('passes when the artifact names the client and no foreign business', () => {
  assert.doesNotThrow(() => assertIdentity(ok));
});

test('the presence check is case-insensitive', () => {
  assert.doesNotThrow(() =>
    assertIdentity({ ...ok, content: 'LITTLE FRIENDS LEARNING LOFT, a preschool.' }),
  );
});

test('throws when the artifact never names the client', () => {
  assert.throws(
    () => assertIdentity({ ...ok, content: '# Doc\n\nAn excellent preschool program.' }),
    /never names the client.*Little Friends Learning Loft/,
  );
});

test('throws when the artifact names another client (case-insensitive)', () => {
  assert.throws(
    () => assertIdentity({ ...ok, content: `${ok.content}\nUnlike AUDREY'S BAKERY down the road.` }),
    /another client.*Audrey's Bakery/,
  );
});

test('foreign names shorter than 4 chars are skipped (substring false-positive guard)', () => {
  assert.doesNotThrow(() => assertIdentity({ ...ok, foreignNames: ['JCC'] }));
});

test('a foreign name equal to the client name is not contamination', () => {
  assert.doesNotThrow(() => assertIdentity({ ...ok, foreignNames: ['little friends learning loft'] }));
});

test('an empty denylist degrades to the presence check alone', () => {
  assert.doesNotThrow(() => assertIdentity({ ...ok, foreignNames: [] }));
});

test('curly apostrophes in model output match straight apostrophes in the profile name', () => {
  assert.doesNotThrow(() =>
    assertIdentity({ content: 'Audrey’s Bakery makes great bread.', publicName: "Audrey's Bakery", foreignNames: [] }),
  );
  assert.throws(
    () => assertIdentity({ ...ok, content: `${ok.content}\nUnlike Audrey’s Bakery down the road.` }),
    /another client/,
  );
});
