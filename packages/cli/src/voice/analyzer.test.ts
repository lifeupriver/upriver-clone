import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { analyzeCopy } from './analyzer.js';

describe('analyzeCopy', () => {
  it('counts sentences and computes mean length', () => {
    const corpus = 'This is one sentence. Here is another that has more words. Short.';
    const signals = analyzeCopy(corpus);
    assert.equal(signals.sentenceCount, 3);
    assert.ok(signals.sentenceLength.mean > 0);
  });

  it('flags Upriver banned words when present', () => {
    const corpus = 'We help you transform your business and unlock new growth.';
    const signals = analyzeCopy(corpus);
    const words = signals.bannedHits.map((b) => b.word).sort();
    assert.deepEqual(words, ['transform', 'unlock']);
  });

  it('reports zero banned hits when copy is clean', () => {
    const corpus = 'We build websites for small businesses in the Hudson Valley.';
    const signals = analyzeCopy(corpus);
    assert.equal(signals.bannedHits.length, 0);
  });

  it('detects em dashes', () => {
    const corpus = 'Our team — small but capable — handles every project.';
    const signals = analyzeCopy(corpus);
    assert.equal(signals.emDashCount, 2);
  });

  it('extracts repeated phrases as signature candidates', () => {
    const corpus = [
      'Hudson Valley families trust us. Hudson Valley families trust us. Hudson Valley families trust us.',
      'They come back season after season.',
    ].join('\n\n');
    const signals = analyzeCopy(corpus);
    assert.ok(signals.topPhrases.includes('hudson valley'));
  });

  it('splits Japanese sentences on fullwidth terminators with no trailing space', () => {
    // Three sentences, zero ASCII sentence punctuation, zero inter-sentence spaces.
    const corpus = '今日は晴れです。明日は雨が降るでしょう。散歩に行きましょう！';
    const signals = analyzeCopy(corpus);
    assert.equal(signals.sentenceCount, 3);
    assert.ok(signals.wordCount > 0, 'CJK copy must not count zero words');
    assert.ok(signals.topWords.length > 0, 'CJK copy must produce tokens');
  });

  it('handles Russian (Cyrillic) sentences and tokens', () => {
    const corpus = 'Сегодня хорошая погода. Завтра будет дождь! Пойдём гулять?';
    const signals = analyzeCopy(corpus);
    assert.equal(signals.sentenceCount, 3);
    assert.equal(signals.wordCount, 8);
    const words = signals.topWords.map((w) => w.word);
    assert.ok(words.includes('погода'), `expected Cyrillic token, got: ${words.join(', ')}`);
  });

  it('treats ellipses as sentence-final punctuation', () => {
    const corpus = 'We waited… Then the doors opened.';
    const signals = analyzeCopy(corpus);
    assert.equal(signals.sentenceCount, 2);
  });

  it('keeps abbreviation periods followed by lowercase inside one sentence', () => {
    const corpus = 'The store opens at 4 p.m. sharp on weekdays and closes late.';
    const signals = analyzeCopy(corpus);
    assert.equal(signals.sentenceCount, 1);
  });
});
