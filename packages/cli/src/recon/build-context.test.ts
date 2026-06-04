import { test } from 'node:test';
import assert from 'node:assert/strict';

import { embedSchemaInPrompt } from './build-context.js';

test('embedSchemaInPrompt appends the schema and a JSON-only instruction', () => {
  const schema = { type: 'object', properties: { candidates: { type: 'array' } } };
  const out = embedSchemaInPrompt('Extract from this page.', schema);

  assert.match(out, /Extract from this page\./); // original prompt kept
  assert.match(out, /JSON Schema/i); // instruction present
  assert.ok(out.includes(JSON.stringify(schema))); // schema embedded verbatim
});

test('embedSchemaInPrompt returns the prompt unchanged when there is no schema', () => {
  assert.equal(embedSchemaInPrompt('What do you know about X?'), 'What do you know about X?');
  assert.equal(embedSchemaInPrompt('free text', undefined), 'free text');
});
