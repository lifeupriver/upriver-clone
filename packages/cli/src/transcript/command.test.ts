import { test } from 'node:test';
import assert from 'node:assert/strict';

import ExtractTranscript from '../commands/profile/extract-transcript.js';

test('the command requires slug + file and exposes the documented flags', () => {
  const args = ExtractTranscript.args as Record<string, { required?: boolean }>;
  assert.equal(args['slug']?.required, true);
  assert.equal(args['file']?.required, true);

  const flags = ExtractTranscript.flags as Record<string, unknown>;
  assert.ok('dry-run' in flags);
  assert.ok('keep-transcript' in flags);
  assert.ok('model' in flags);
  assert.ok('chunk-size' in flags);

  assert.match(ExtractTranscript.description ?? '', /transcript/i);
});
