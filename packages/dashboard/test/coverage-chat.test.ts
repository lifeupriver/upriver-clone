import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';

import { createEmptyProfile, isHumanVerifyRequired, type ClientProfile, type ProfileField } from '@upriver/schemas';

import {
  buildSystemPrompt,
  runChatTurn,
  type ContentBlock,
  type CreateMessage,
  type CreateResponse,
  type WriteField,
} from '../src/lib/coverage-chat.js';
import { CHATBOT_FILLABLE, chatbotGap, isChatbotFillable } from '../src/lib/profile-coverage.js';

const NOW = '2026-06-05T00:00:00.000Z';

function env<T>(value: T): ProfileField<T> {
  return { value, source: 'interview', confidence: 'medium', verified: false, updatedAt: NOW };
}
function profileWith(fields: Record<string, ProfileField<unknown>>): ClientProfile {
  const root = createEmptyProfile('lf', NOW) as unknown as Record<string, Record<string, unknown>>;
  for (const [path, v] of Object.entries(fields)) {
    const [section, leaf] = path.split('.') as [string, string];
    root[section] = { ...(root[section] ?? {}), [leaf]: v };
  }
  return root as unknown as ClientProfile;
}

describe('chatbot whitelist + gap', () => {
  it('whitelist is the chatbot must-ask bucket minus every HV field', () => {
    assert.ok(CHATBOT_FILLABLE.includes('people.keyTeam'));
    assert.ok(CHATBOT_FILLABLE.includes('operationsAutomation.recurringTasks'));
    assert.ok(CHATBOT_FILLABLE.includes('content.productionCapacity'));
    // These ARE in §3.5's chatbot bucket but are HV → excluded (operator-only).
    assert.ok(!CHATBOT_FILLABLE.includes('toolsAndAccess.stack'));
    assert.ok(!CHATBOT_FILLABLE.includes('operationsAutomation.escalationRouting'));
    assert.ok(CHATBOT_FILLABLE.every((p) => !isHumanVerifyRequired(p)));
  });

  it('isChatbotFillable rejects HV, verified, and unknown paths', () => {
    assert.equal(isChatbotFillable('people.keyTeam'), true);
    assert.equal(isChatbotFillable('toolsAndAccess.stack'), false); // HV
    assert.equal(isChatbotFillable('pricing.deposit'), false); // HV money
    assert.equal(isChatbotFillable('identity.legalName'), false); // not a chatbot must-ask
  });

  it('gap excludes already-filled fields', () => {
    const filled = profileWith({ 'people.keyTeam': env([{ name: 'Jane', role: 'Director' }]) });
    const gap = chatbotGap(filled);
    assert.ok(!gap.some((g) => g.path === 'people.keyTeam'));
  });

  it('gap is ordered by how many deliverables each field unblocks (desc)', () => {
    const gap = chatbotGap(createEmptyProfile('lf', NOW));
    assert.ok(gap.length > 0);
    for (let i = 1; i < gap.length; i++) {
      assert.ok((gap[i - 1]?.unblocksCount ?? 0) >= (gap[i]?.unblocksCount ?? 0));
    }
    // Every gap field is chatbot-fillable and non-HV.
    assert.ok(gap.every((g) => isChatbotFillable(g.path)));
  });
});

// A scripted Anthropic client: returns each queued response in order, then a
// closing text turn. Zero live calls.
function scriptedCreate(queue: CreateResponse[]): { create: CreateMessage; calls: () => number } {
  let n = 0;
  const create: CreateMessage = async () => {
    const next = queue[n] ?? { stop_reason: 'end_turn', content: [{ type: 'text', text: 'All set, thank you!' }] };
    n += 1;
    return next;
  };
  return { create, calls: () => n };
}
const toolUse = (id: string, path: string, value: unknown): ContentBlock => ({
  type: 'tool_use',
  id,
  name: 'record_answer',
  input: { path, value },
});

describe('runChatTurn loop (Anthropic SDK mocked)', () => {
  it('gap closed → asks nothing, calls no tool, terminates', async () => {
    const { create, calls } = scriptedCreate([{ stop_reason: 'end_turn', content: [{ type: 'text', text: 'Nothing more to fill.' }] }]);
    const writeField: WriteField = async () => {
      throw new Error('writeField must not be called when the gap is closed');
    };
    const res = await runChatTurn({ create, writeField }, { gap: [], clientName: 'Little Friends', messages: [{ role: 'user', content: 'hi' }] });
    assert.equal(res.writes.length, 0);
    assert.equal(res.rejected.length, 0);
    assert.match(res.assistant, /Nothing more/);
    assert.equal(calls(), 1);
  });

  it('a tool call routes through writeField, records the write, then terminates', async () => {
    const { create } = scriptedCreate([
      { stop_reason: 'tool_use', content: [toolUse('t1', 'people.keyTeam', [{ name: 'Jane' }])] },
      { stop_reason: 'end_turn', content: [{ type: 'text', text: 'Got it — anyone else?' }] },
    ]);
    const seen: string[] = [];
    const writeField: WriteField = async (path) => {
      seen.push(path);
      return { ok: true, path, revision: 3 };
    };
    const res = await runChatTurn(
      { create, writeField },
      { gap: chatbotGap(createEmptyProfile('lf', NOW)), clientName: 'Little Friends', messages: [{ role: 'user', content: 'Jane is our director' }] },
    );
    assert.deepEqual(seen, ['people.keyTeam']);
    assert.deepEqual(res.writes, [{ path: 'people.keyTeam', revision: 3 }]);
    assert.equal(res.rejected.length, 0);
  });

  it('a rejected write is reported and surfaced back to the model as an error result', async () => {
    const { create } = scriptedCreate([
      { stop_reason: 'tool_use', content: [toolUse('t1', 'toolsAndAccess.stack', ['CRM'])] },
      { stop_reason: 'end_turn', content: [{ type: 'text', text: 'No problem.' }] },
    ]);
    const writeField: WriteField = async (path) => ({ ok: false, path, reason: 'human-verify-required' });
    const res = await runChatTurn({ create, writeField }, { gap: [], clientName: 'LF', messages: [{ role: 'user', content: 'x' }] });
    assert.equal(res.writes.length, 0);
    assert.deepEqual(res.rejected, [{ path: 'toolsAndAccess.stack', reason: 'human-verify-required' }]);
  });

  it('system prompt embeds the gap; closing prompt forbids tool calls', () => {
    const gap = chatbotGap(createEmptyProfile('lf', NOW));
    const sys = buildSystemPrompt(gap, 'Little Friends');
    assert.match(sys, /people\.keyTeam/);
    assert.match(buildSystemPrompt([], 'Little Friends'), /Do NOT call any tool/);
  });
});
