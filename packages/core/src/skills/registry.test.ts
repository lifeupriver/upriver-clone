import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import {
  ALL_SKILLS,
  MARKETING_SKILLS,
  UPRIVER_SKILLS,
  getSkill,
  hasSkill,
} from './registry.js';

describe('skills registry', () => {
  it('getSkill returns the ai-seo entry with the expected path', () => {
    const entry = getSkill('ai-seo');
    assert.equal(entry.name, 'ai-seo');
    assert.equal(entry.path, '.agents/skills/ai-seo');
  });

  it('getSkill throws for an unknown skill name', () => {
    assert.throws(() => getSkill('not-a-real-skill'), /Unknown skill/);
  });

  it('hasSkill returns true for a registered upriver skill', () => {
    assert.equal(hasSkill('audit-methodology'), true);
  });

  it('hasSkill returns false for an unregistered name', () => {
    assert.equal(hasSkill('not-a-real-skill'), false);
  });

  it('ALL_SKILLS is the union of MARKETING_SKILLS and UPRIVER_SKILLS', () => {
    assert.equal(ALL_SKILLS.length, MARKETING_SKILLS.length + UPRIVER_SKILLS.length);
  });

  it('every entry has a non-empty description and when', () => {
    for (const entry of ALL_SKILLS) {
      assert.ok(entry.description.length > 0, `${entry.name} missing description`);
      assert.ok(entry.when.length > 0, `${entry.name} missing when`);
    }
  });

  it('skill names are unique across the registry', () => {
    const names = ALL_SKILLS.map((s) => s.name);
    const unique = new Set(names);
    assert.equal(unique.size, names.length, 'duplicate skill name in registry');
  });

  it('includes the four new H.2 upriver skills', () => {
    for (const name of [
      'improvement-layer',
      'clone-fidelity-scoring',
      'sales-report-narrative',
      'intake-handling',
    ]) {
      assert.equal(hasSkill(name), true, `expected ${name} in registry`);
    }
  });
});
