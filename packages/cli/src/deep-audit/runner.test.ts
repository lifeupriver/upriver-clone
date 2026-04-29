import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { parseAgentResponse, runDeepPass, type DeepPassSpec } from './runner.js';

const fakeSpec: DeepPassSpec<{ note: string }> = {
  id: 'fake',
  dimension: 'content',
  loadContext: () => ({ note: 'hello' }),
  buildPrompt: (ctx) => `prompt for ${ctx.note}`,
};

describe('deep-audit runner', () => {
  describe('parseAgentResponse', () => {
    it('extracts findings from a fenced JSON block', () => {
      const raw = [
        'Here is the deep audit:',
        '```json',
        '{',
        '  "summary": "Two gaps in the cluster.",',
        '  "findings": [',
        '    { "title": "Add pricing pillar", "priority": "p0", "effort": "heavy", "recommendation": "Build /pricing.", "description": "No commercial pillar exists." },',
        '    { "title": "Spin up FAQ cluster", "priority": "p1", "effort": "medium", "recommendation": "Write 12 FAQ articles." }',
        '  ]',
        '}',
        '```',
      ].join('\n');
      const r = parseAgentResponse(raw, 'content');
      assert.equal(r.summary, 'Two gaps in the cluster.');
      assert.equal(r.findings.length, 2);
      assert.equal(r.findings[0]?.priority, 'p0');
      assert.equal(r.findings[0]?.effort, 'heavy');
      assert.equal(r.findings[0]?.dimension, 'content');
      assert.match(r.findings[0]?.id ?? '', /^content-deep-001$/);
      assert.ok(r.findings[0]?.estimatedImpact);
    });

    it('falls back to a balanced JSON scan when no fence is present', () => {
      const raw = 'Some prose then {"summary":"ok","findings":[{"title":"X"}]} trailing';
      const r = parseAgentResponse(raw, 'content');
      assert.equal(r.summary, 'ok');
      assert.equal(r.findings.length, 1);
    });

    it('normalizes loose priority/effort values', () => {
      const raw = '```json\n{"findings":[{"title":"Y","priority":"high","effort":"quick"}]}\n```';
      const r = parseAgentResponse(raw, 'content');
      assert.equal(r.findings[0]?.priority, 'p0');
      assert.equal(r.findings[0]?.effort, 'light');
    });

    it('returns an empty list and clear summary on bad JSON', () => {
      const r = parseAgentResponse('not even json', 'content');
      assert.equal(r.findings.length, 0);
      assert.match(r.summary, /no parseable JSON/);
    });

    it('drops findings with no title', () => {
      const raw = '```json\n{"findings":[{"description":"no title here"},{"title":"OK"}]}\n```';
      const r = parseAgentResponse(raw, 'content');
      assert.equal(r.findings.length, 1);
      assert.equal(r.findings[0]?.title, 'OK');
    });
  });

  describe('runDeepPass', () => {
    it('returns AuditPassResult shape with stub agent', async () => {
      const result = await runDeepPass(fakeSpec, {
        slug: 's',
        clientDir: '/tmp/nope',
        runAgent: async (prompt) => {
          assert.match(prompt, /prompt for hello/);
          return '```json\n{"summary":"x","findings":[{"title":"do thing","priority":"p1","effort":"light"}]}\n```';
        },
      });
      assert.equal(result.dimension, 'content');
      assert.equal(result.findings.length, 1);
      assert.ok(result.score >= 0 && result.score <= 100);
      assert.equal(result.summary, 'x');
    });

    it('degrades gracefully when the agent throws', async () => {
      const result = await runDeepPass(fakeSpec, {
        slug: 's',
        clientDir: '/tmp/nope',
        runAgent: async () => {
          throw new Error('agent down');
        },
      });
      assert.equal(result.findings.length, 0);
      assert.match(result.summary, /agent down/);
    });
  });
});
