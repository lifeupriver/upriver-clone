import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmptyProfile, type Readiness } from '@upriver/schemas';
import {
  renderReadiness,
  renderGenerationReport,
  renderDocLine,
  renderBatchPlan,
  renderOperatorChecklist,
  renderPromptSizeTable,
  renderTierReport,
  newlyUnblocked,
  titleFor,
} from './report.js';
import type { PromptSize } from './prompt-size.js';
import { aggregateMarkers, aggregateOperatorActions, type BatchPlan, type DocResult, type TierRunResult } from './batch.js';

test('renderPromptSizeTable flags over-ceiling docs FAIL and names them in the summary', () => {
  const sizes: PromptSize[] = [
    { id: 'doc-01', systemChars: 0, userChars: 0, totalChars: 0, estTokens: 14_000, ceiling: 50_000, overCeiling: false },
    { id: 'doc-08', systemChars: 0, userChars: 0, totalChars: 0, estTokens: 58_000, ceiling: 50_000, overCeiling: true },
  ];
  const out = renderPromptSizeTable(sizes);
  assert.match(out, /doc-01/);
  assert.match(out, /14000/);
  assert.match(out, /OK/);
  assert.match(out, /doc-08/);
  assert.match(out, /FAIL/);
  assert.match(out, /over ceiling: doc-08/);
});

test('renderPromptSizeTable reports all-clear when nothing exceeds the ceiling', () => {
  const sizes: PromptSize[] = [
    { id: 'doc-01', systemChars: 0, userChars: 0, totalChars: 0, estTokens: 14_000, ceiling: 50_000, overCeiling: false },
  ];
  const out = renderPromptSizeTable(sizes);
  assert.match(out, /all .* under ceiling/i);
  assert.doesNotMatch(out, /FAIL/);
});

test('renderReadiness lists HV blockers with the no-force hint', () => {
  const r: Readiness = {
    ready: false,
    missingFields: ['capacity.metrics'],
    unverifiedHv: ['pricing.deposit', 'pricing.shareable'],
    missingDocs: [],
  };
  const out = renderReadiness('doc-02', r);
  assert.match(out, /BLOCKED/);
  assert.match(out, /pricing\.deposit/);
  assert.match(out, /capacity\.metrics/);
  assert.match(out, /no --force/);
});

test('renderReadiness reports a ready deliverable', () => {
  const out = renderReadiness('doc-01', { ready: true, missingFields: [], unverifiedHv: [], missingDocs: [] });
  assert.match(out, /READY/);
});

test('renderGenerationReport shows path, word count, numbered markers, and unblocks', () => {
  const out = renderGenerationReport({
    id: 'doc-01',
    docPath: 'docs/doc-01-brand-voice-guide.md',
    content: 'one two three',
    markers: ['who is the owner?'],
    fromCache: false,
    nowUnblocked: ['doc-04'],
  });
  assert.match(out, /docs\/doc-01-brand-voice-guide\.md/);
  assert.match(out, /words: 3/);
  assert.match(out, /1\. who is the owner\?/);
  assert.match(out, /unblocks downstream: doc-04/);
});

test('renderGenerationReport renders the operator-action checklist when present, omits it when absent', () => {
  const withOps = renderGenerationReport({
    id: 'i07',
    docPath: 'docs/i07-account-access-governance.md',
    content: 'one two',
    markers: [],
    operatorActions: ['create the client Project', 'upgrade to Team plan'],
    fromCache: false,
    nowUnblocked: [],
  });
  assert.match(withOps, /\[OPERATOR ACTION\] cannot be generated — you must do \(2\)/);
  assert.match(withOps, /1\. create the client Project/);

  const withoutOps = renderGenerationReport({
    id: 'doc-01',
    docPath: 'docs/doc-01.md',
    content: 'one two',
    markers: ['q?'],
    fromCache: false,
    nowUnblocked: [],
  });
  assert.doesNotMatch(withoutOps, /OPERATOR ACTION/);
});

test('renderOperatorChecklist groups by artifact; empty aggregate renders nothing', () => {
  const docs: DocResult[] = [
    { id: 'i07', title: 'Gov', status: 'produced', markers: [], operatorActions: ['create Project', 'OAuth consent'], words: 1 },
    { id: 'i01', title: 'Proj', status: 'produced', markers: [], operatorActions: [], words: 1 },
  ];
  const lines = renderOperatorChecklist(aggregateOperatorActions(docs), 'Operator must do (this run)');
  assert.match(lines.join('\n'), /Operator must do \(this run\) \(2\), by artifact:/);
  assert.match(lines.join('\n'), /i07 \(2\):/);
  assert.deepEqual(renderOperatorChecklist(aggregateOperatorActions([]), 'x'), []);
});

test('titleFor resolves a deliverable title', () => {
  assert.equal(titleFor('doc-01'), 'Brand Voice Guide');
});

test('newlyUnblocked returns an array and never throws on a sparse profile', () => {
  const out = newlyUnblocked(createEmptyProfile('lf', '2026-06-04T00:00:00.000Z'), [], 'doc-01');
  assert.ok(Array.isArray(out));
});

test('renderDocLine is a terse one-liner with words, markers, and path', () => {
  const line = renderDocLine({
    id: 'doc-01',
    docPath: 'docs/doc-01-brand-voice-guide.md',
    content: 'one two three four',
    markers: ['q1', 'q2'],
    fromCache: true,
  });
  assert.match(line, /reused doc-01 — 4 words, 2 marker\(s\) → docs\/doc-01-brand-voice-guide\.md/);
});

test('renderBatchPlan shows tiers and blocked docs with named field/HV reasons', () => {
  const plan: BatchPlan = {
    scope: ['doc-01', 'doc-02', 'doc-03'],
    approved: [],
    tiers: [{ index: 0, docs: ['doc-01', 'doc-02'] }],
    blocked: [
      {
        id: 'doc-03',
        title: 'Sales Process Map',
        readiness: { ready: false, missingFields: ['salesProcess.leadSources'], unverifiedHv: ['toolsAndAccess.crm'], missingDocs: [] },
        reasons: ['missing-fields', 'unverified-hv'],
        blockingDocs: [],
      },
    ],
  };
  const out = renderBatchPlan(plan);
  assert.match(out, /Tier 0 \(2\): doc-01, doc-02/);
  assert.match(out, /missing fields \(1\): salesProcess\.leadSources/);
  assert.match(out, /unverified HV \(1\): toolsAndAccess\.crm/);
});

test('renderTierReport lists produced docs, consolidated markers, and skips', () => {
  const tr: TierRunResult = {
    index: 0,
    docs: [
      { id: 'doc-01', title: 'Brand Voice Guide', status: 'produced', docPath: 'docs/a.md', markers: ['who owns it?'], words: 1200 },
      { id: 'doc-02', title: 'Business Facts Reference', status: 'skipped', markers: [], words: 0, reason: 'upstream not available this run: doc-01' },
    ],
    produced: ['doc-01'],
    failed: [],
    skipped: ['doc-02'],
    claudeCalls: 1,
  };
  const out = renderTierReport(tr, aggregateMarkers(tr.docs));
  assert.match(out, /\[produced\] doc-01 — 1200 words/);
  assert.match(out, /NEEDS CONFIRMATION\] across tier \(1\)/);
  assert.match(out, /1\. who owns it\?/);
  assert.match(out, /skipped \(upstream not available\): doc-02/);
  assert.doesNotMatch(out, /OPERATOR ACTION/); // 2-arg call: no operator block for prose docs
});

test('renderTierReport appends the operator-action checklist when the aggregate is passed', () => {
  const tr: TierRunResult = {
    index: 0,
    docs: [
      { id: 'i07', title: 'Account Access & Governance', status: 'produced', docPath: 'docs/i07.md', markers: [], operatorActions: ['upgrade to Team plan'], words: 900 },
    ],
    produced: ['i07'],
    failed: [],
    skipped: [],
    claudeCalls: 1,
  };
  const out = renderTierReport(tr, aggregateMarkers(tr.docs), aggregateOperatorActions(tr.docs));
  assert.match(out, /\[OPERATOR ACTION\] across tier \(1\), by artifact:/);
  assert.match(out, /i07 \(1\):/);
  assert.match(out, /1\. upgrade to Team plan/);
});
