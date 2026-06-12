import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { parseInterviewGuide } from '@upriver/core';
import { buildProspectInterviewGuide, PROSPECT_QUESTION_COUNT } from './interview-guide.js';
import { ANSWER_FIELD_MAP } from './answer-mapping.js';

describe('prospect interview guide', () => {
  const md = buildProspectInterviewGuide('Wildflour Bakery');
  const spec = parseInterviewGuide(md);

  it('parses into a short form (6–8 questions, all plain q items)', () => {
    assert.equal(spec.totalItems, PROSPECT_QUESTION_COUNT);
    assert.ok(spec.totalItems >= 6 && spec.totalItems <= 8, `${spec.totalItems} questions`);
    for (const s of spec.sections) {
      for (const item of s.items) assert.equal(item.kind, 'q');
    }
  });

  it('mentions the business by name', () => {
    assert.match(md, /Wildflour Bakery/);
  });

  it('keeps the item ids the answer mapping depends on STABLE', () => {
    const ids = new Set(spec.sections.flatMap((s) => s.items.map((i) => i.id)));
    for (const mappedId of Object.keys(ANSWER_FIELD_MAP)) {
      assert.ok(ids.has(mappedId), `mapped id "${mappedId}" not produced by the guide template`);
    }
  });

  it('includes the hedging-error channel ("did we get anything wrong")', () => {
    assert.match(md, /wrong/i);
  });

  it('never mentions pricing', () => {
    assert.doesNotMatch(md, /\$\s?\d|price|pricing|package|tier/i);
  });
});
