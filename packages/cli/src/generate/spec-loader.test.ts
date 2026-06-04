import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DeliverableId } from '@upriver/schemas';
import { loadDeliverableSpec, specPathFor, loadBrandVoiceRules } from './spec-loader.js';

function specsDirWith01(): string {
  const dir = mkdtempSync(join(tmpdir(), 'upriver-specs-'));
  mkdirSync(join(dir, 'ai-operating-system'), { recursive: true });
  writeFileSync(
    join(dir, 'ai-operating-system', '01-brand-voice-guide-spec.md'),
    '# Brand Voice Guide Spec\nSection template here.',
  );
  return dir;
}

test('loadDeliverableSpec reads the spec at COVERAGE_MAP specPath', () => {
  process.env['UPRIVER_SPECS_DIR'] = specsDirWith01();
  assert.match(loadDeliverableSpec('doc-01'), /Brand Voice Guide Spec/);
});

test('specPathFor throws on an unknown id', () => {
  assert.throws(() => specPathFor('doc-99' as DeliverableId));
});

test('loadDeliverableSpec throws a helpful error when the spec file is missing', () => {
  process.env['UPRIVER_SPECS_DIR'] = mkdtempSync(join(tmpdir(), 'upriver-empty-'));
  assert.throws(() => loadDeliverableSpec('doc-01'), /not found/);
});

test('brand voice rules state the house constraints', () => {
  const rules = loadBrandVoiceRules();
  assert.match(rules, /first-person singular/);
  assert.match(rules, /No em dashes/);
});
