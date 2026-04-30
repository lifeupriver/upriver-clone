import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { generateTopics, generateBrief } from './generator.js';

describe('blog topics generator', () => {
  it('produces the requested number of topics', () => {
    const topics = generateTopics({
      brandName: 'Test',
      vertical: 'preschool',
      city: 'Newburgh',
      state: 'NY',
      count: 25,
      difficulty: 'all',
    });
    assert.equal(topics.length, 25);
  });

  it('caps cluster diversity (no more than 50% from any single cluster)', () => {
    const topics = generateTopics({
      brandName: 'Test',
      vertical: 'preschool',
      city: 'Newburgh',
      state: 'NY',
      count: 25,
      difficulty: 'all',
    });
    const counts = new Map<string, number>();
    for (const t of topics) counts.set(t.cluster, (counts.get(t.cluster) ?? 0) + 1);
    for (const n of counts.values()) {
      assert.ok(n <= 13, `cluster has ${n} of 25`);
    }
  });

  it('mixes intents — at least 5 commercial/transactional', () => {
    const topics = generateTopics({
      brandName: 'Test',
      vertical: 'preschool',
      city: 'Newburgh',
      state: 'NY',
      count: 25,
      difficulty: 'all',
    });
    const conv = topics.filter((t) => t.search_intent === 'commercial' || t.search_intent === 'transactional').length;
    assert.ok(conv >= 5, `only ${conv} commercial/transactional`);
  });

  it('falls back to generic for unknown vertical', () => {
    const topics = generateTopics({
      brandName: 'Test',
      vertical: undefined,
      city: undefined,
      state: undefined,
      count: 5,
      difficulty: 'all',
    });
    assert.ok(topics.length > 0);
  });

  it('generates a brief with outline and SEO requirements', () => {
    const [topic] = generateTopics({
      brandName: 'Test',
      vertical: 'preschool',
      city: 'Newburgh',
      state: 'NY',
      count: 1,
      difficulty: 'all',
    });
    assert.ok(topic);
    const brief = generateBrief(topic!, 'Test', 0.6);
    assert.ok(brief.outline.length >= 4);
    assert.ok(brief.seo_requirements.word_count > 0);
  });
});
