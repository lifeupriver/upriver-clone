import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { extractSubject, renderEmailTemplate } from './email-template.js';

const ctx = {
  clientName: 'Acme Co.',
  clientFirstName: 'Jane',
  siteUrl: 'https://acme.example.com',
  shareUrl: 'https://reports.upriver.com/acme-co-abc123/',
  shareToken: 'abc123',
  auditDate: '2026-04-28',
  overallScore: 72,
  criticalCount: 3,
  topRecommendation: 'Fix the broken homepage hero CTA.',
};

describe('renderEmailTemplate', () => {
  it('substitutes every placeholder so no {{ remains in output', () => {
    const out = renderEmailTemplate(ctx);
    assert.ok(!out.includes('{{'), `unresolved placeholder in: ${out}`);
    assert.ok(!out.includes('}}'));
  });

  it('embeds all context values verbatim', () => {
    const out = renderEmailTemplate(ctx);
    assert.ok(out.includes(ctx.clientName));
    assert.ok(out.includes(ctx.clientFirstName));
    assert.ok(out.includes(ctx.siteUrl));
    assert.ok(out.includes(ctx.shareUrl));
    assert.ok(out.includes(ctx.shareToken));
    assert.ok(out.includes(ctx.auditDate));
    assert.ok(out.includes(String(ctx.overallScore)));
    assert.ok(out.includes(String(ctx.criticalCount)));
    assert.ok(out.includes(ctx.topRecommendation));
  });

  it('starts with a Subject: line that extractSubject can parse', () => {
    const out = renderEmailTemplate(ctx);
    assert.ok(out.startsWith('Subject: '));
    const subject = extractSubject(out);
    assert.ok(subject.length > 0);
    assert.ok(subject.includes(ctx.clientName));
  });

  it('extractSubject returns empty string when no Subject header', () => {
    assert.equal(extractSubject('No header here\nbody'), '');
  });
});
