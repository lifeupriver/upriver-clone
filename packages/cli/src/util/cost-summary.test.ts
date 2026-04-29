import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { estimateCostForCommand, parseUsageLine, summarizeUsageText } from './cost-summary.js';

describe('cost-summary', () => {
  describe('parseUsageLine', () => {
    it('parses a well-formed line', () => {
      const e = parseUsageLine(
        '2026-01-01T00:00:00Z [firecrawl_scrape] credits=12 slug=audreys cmd=scrape extra=foo',
      );
      assert.deepEqual(e, {
        ts: '2026-01-01T00:00:00Z',
        eventType: 'firecrawl_scrape',
        credits: 12,
        command: 'scrape',
      });
    });
    it('returns null on empty/garbage', () => {
      assert.equal(parseUsageLine(''), null);
      assert.equal(parseUsageLine('   '), null);
      assert.equal(parseUsageLine('not a log line'), null);
      assert.equal(parseUsageLine('2026 [foo] cred=1 slug=x cmd=y'), null);
    });
  });

  describe('summarizeUsageText', () => {
    const text = [
      '2026-01-01T00:00:00Z [firecrawl_scrape] credits=10 slug=a cmd=scrape',
      '2026-01-01T00:01:00Z [firecrawl_scrape] credits=20 slug=a cmd=scrape',
      '2026-01-01T00:02:00Z [claude_api] credits=5 slug=a cmd=audit',
      'malformed line',
      '',
    ].join('\n');

    it('aggregates totals, by event type, and by command', () => {
      const s = summarizeUsageText(text, 0.001);
      assert.equal(s.totalEvents, 3);
      assert.equal(s.totalCredits, 35);
      assert.equal(s.byEventType.get('firecrawl_scrape')?.events, 2);
      assert.equal(s.byEventType.get('firecrawl_scrape')?.credits, 30);
      assert.equal(s.byCommand.get('scrape')?.avgCredits, 15);
      assert.equal(s.byCommand.get('audit')?.events, 1);
      assert.ok(Math.abs(s.estimatedUsd - 0.035) < 1e-9);
    });

    it('estimateCostForCommand returns rounded average and basis', () => {
      const s = summarizeUsageText(text);
      const est = estimateCostForCommand(s, 'scrape');
      assert.deepEqual(est, { credits: 15, basis: 2 });
      assert.equal(estimateCostForCommand(s, 'unknown'), null);
    });
  });
});
