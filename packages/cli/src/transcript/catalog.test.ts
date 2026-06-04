import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildPathCatalog, PRIORITY_MARK } from './catalog.js';

test('catalog lists core leaf paths with hints', () => {
  const cat = buildPathCatalog();
  assert.match(cat, /capacity\.metrics/);
  assert.match(cat, /governance\.regulatedData/);
  assert.match(cat, /pricing\.deposit/);
  // a hint travels with at least one path
  assert.match(cat, /capacity\.metrics.*array/);
});

test('catalog flags MUST_ASK / transcript-priority paths', () => {
  const cat = buildPathCatalog();
  const line = cat.split('\n').find((l) => l.includes('capacity.metrics'));
  assert.ok(line?.includes(PRIORITY_MARK), 'capacity.metrics should be priority-flagged');
  const voice = cat.split('\n').find((l) => l.includes('voice.attributes'));
  assert.ok(voice?.includes(PRIORITY_MARK), 'voice.attributes should be priority-flagged');
});

test('catalog includes only active modules and stays compact (<8k)', () => {
  const core = buildPathCatalog();
  assert.ok(!core.includes('modules.preschool'), 'no modules without activeModules');

  const withPreschool = buildPathCatalog({ activeModules: ['preschool'] });
  assert.match(withPreschool, /modules\.preschool\.enrollmentCapacity/);
  assert.ok(!withPreschool.includes('modules.venue'), 'unrelated modules excluded');
  assert.ok(withPreschool.length < 8000, `catalog too large: ${withPreschool.length}`);
});
