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
});
