import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPitchEmailDraft,
  finalizeEmailText,
  UNSUBSCRIBE_PLACEHOLDER,
  POSTAL_PLACEHOLDER,
} from './email.js';

const input = {
  businessName: 'Wildflour Bakery',
  previewUrl: 'https://dash.example/pitch/wildflourbakery?t=abc',
  questionnaireUrl: 'https://dash.example/deliverables/wildflourbakery/interview?token=def',
};

describe('buildPitchEmailDraft', () => {
  const draft = buildPitchEmailDraft(input);

  it('carries both links and names the business', () => {
    assert.ok(draft.text.includes(input.previewUrl));
    assert.ok(draft.text.includes(input.questionnaireUrl));
    assert.match(draft.subject, /Wildflour Bakery/);
  });

  it('is honest about what this is — unprompted demo, site unchanged, preview expires', () => {
    assert.match(draft.text, /preview/i);
    assert.match(draft.text, /nothing on your (actual )?website has been changed|(hasn'?t|has not) been (changed|touched)/i);
    assert.match(draft.text, /expires?/i);
  });

  it('contains the compliance footer placeholders', () => {
    assert.ok(draft.text.includes(UNSUBSCRIBE_PLACEHOLDER));
    assert.ok(draft.text.includes(POSTAL_PLACEHOLDER));
  });

  it('mentions no pricing', () => {
    assert.doesNotMatch(draft.subject + draft.text, /\$\s?\d|pricing|price|package|tier/i);
  });
});

describe('finalizeEmailText', () => {
  it('fills both placeholders', () => {
    const draft = buildPitchEmailDraft(input);
    const text = finalizeEmailText(draft.text, {
      unsubscribeUrl: 'https://dash.example/api/unsubscribe?token=xyz',
      postalAddress: '1 Main St, Kingston NY 12401',
    });
    assert.ok(text.includes('https://dash.example/api/unsubscribe?token=xyz'));
    assert.ok(text.includes('1 Main St, Kingston NY 12401'));
    assert.ok(!text.includes(UNSUBSCRIBE_PLACEHOLDER));
    assert.ok(!text.includes(POSTAL_PLACEHOLDER));
  });
});
