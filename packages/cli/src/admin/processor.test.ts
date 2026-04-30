import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import type { VoiceRules } from '@upriver/core';
import { checkVoice } from './processor.js';

function rules(overrides: Partial<VoiceRules> = {}): VoiceRules {
  return {
    voice_id: 'test-v1',
    extracted_at: new Date().toISOString(),
    corpus_word_count: 0,
    source_page_count: 0,
    sentence_length: { mean: 0, p50: 0, p90: 0, shortShare: 0 },
    paragraph_length_mean: 0,
    banned_words: [],
    required_voice_markers: [],
    formality_score: 0.5,
    warmth_score: 0.5,
    audience_variants: [],
    uses_em_dashes: false,
    uses_oxford_comma: true,
    voice_prompt: '',
    ...overrides,
  };
}

describe('voice check', () => {
  it('passes a clean diff', () => {
    const diff = '+We help small businesses tell their story.\n+Plain prose, no banned words.\n';
    const result = checkVoice(diff, rules());
    assert.equal(result.passed, true);
    assert.equal(result.banned_word_hits.length, 0);
    assert.equal(result.em_dash_hits, 0);
  });

  it('flags Upriver banned words on added lines', () => {
    const diff = '+Our service will transform your business and unlock new growth.\n';
    const result = checkVoice(diff, rules());
    assert.equal(result.passed, false);
    const words = result.banned_word_hits.map((h) => h.word).sort();
    assert.deepEqual(words, ['transform', 'unlock']);
  });

  it('ignores banned words on removed lines', () => {
    const diff = '-Our service will transform your business.\n+Our service helps your team move faster.\n';
    const result = checkVoice(diff, rules());
    assert.equal(result.passed, true);
  });

  it('flags em dashes on added lines', () => {
    const diff = '+We work with you, and only with you — never with hangers-on.\n';
    const result = checkVoice(diff, rules());
    assert.equal(result.passed, false);
    assert.equal(result.em_dash_hits, 1);
  });

  it('honors client-specific banned words from voice rules', () => {
    const diff = '+This is a fluffy paragraph.\n';
    const result = checkVoice(diff, rules({ banned_words: ['fluffy'] }));
    assert.equal(result.passed, false);
    assert.ok(result.banned_word_hits.some((h) => h.word === 'fluffy'));
  });

  it('warns when long prose is added without required voice markers', () => {
    const longProse = 'a'.repeat(700);
    const diff = `+${longProse}\n`;
    const result = checkVoice(diff, rules({ required_voice_markers: ['hudson valley'] }));
    assert.ok(result.notes.some((n) => /required voice markers/i.test(n)));
  });
});
