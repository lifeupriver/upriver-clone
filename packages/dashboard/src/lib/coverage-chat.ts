/**
 * The coverage-driven chatbot's question selection + Anthropic SDK loop. The
 * model is injected (`CreateMessage`) so this unit-tests with the SDK mocked and
 * zero live calls. PRD §4.2 names this the one LLM surface that is NOT
 * `claude-cli.ts` — the dashboard runs on Vercel where the operator's CLI is
 * unavailable, so it uses the Anthropic SDK with the dashboard's API key.
 *
 * The endpoint (`api/profile/[slug].ts`) owns the §7 trust boundary; this module
 * owns the gap → system-prompt → tool-call → write-callback mechanics.
 */
import type { GapField } from './profile-coverage.js';

/** Default model — overridable via env / injection. claude-api skill: default to Opus. */
export const DEFAULT_CHATBOT_MODEL = 'claude-opus-4-8';

/** Minimal structural types for the Anthropic Messages API subset we use. */
export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}
export interface TextBlock {
  type: 'text';
  text: string;
}
export type ContentBlock = ToolUseBlock | TextBlock | { type: string; [k: string]: unknown };

export interface ApiMessage {
  role: 'user' | 'assistant';
  content: string | ContentBlock[];
}
export interface CreateParams {
  model: string;
  max_tokens: number;
  system: string;
  tools: unknown[];
  messages: ApiMessage[];
  tool_choice?: { type: string };
}
export interface CreateResponse {
  stop_reason: string | null;
  content: ContentBlock[];
}
/** The injected model call. The real `client.messages.create` satisfies this structurally. */
export type CreateMessage = (params: CreateParams) => Promise<CreateResponse>;

/** The single tool the bot may call to record a captured answer. */
export const RECORD_ANSWER_TOOL = {
  name: 'record_answer',
  description:
    'Record a confirmed answer for one profile field. Call this only once you have a concrete, ' +
    'specific answer from the client for the given field path. Do not guess — ask first.',
  input_schema: {
    type: 'object' as const,
    properties: {
      path: { type: 'string', description: 'The profile field path being answered.' },
      value: { description: 'The value for the field, shaped per the field (array of items, object, etc.).' },
      evidence: { type: 'string', description: "A short quote of the client's own words backing this value." },
    },
    required: ['path', 'value'],
  },
};

/** Build the system prompt: the gap is embedded so the bot asks only what is missing. */
export function buildSystemPrompt(gap: GapField[], clientName: string): string {
  if (gap.length === 0) {
    return [
      `You are Upriver's intake assistant for ${clientName}. The profile's chatbot-fillable gaps are all closed.`,
      'Thank the client warmly in one sentence and let them know there is nothing more to fill right now. Do NOT call any tool.',
    ].join('\n');
  }
  const lines = gap.map((g, i) => `  ${i + 1}. ${g.path} — ${g.label} (unblocks ${g.unblocksCount} deliverable(s))`);
  return [
    `You are Upriver's intake assistant for ${clientName}. You are filling gaps in their business profile through a short, friendly conversation.`,
    '',
    'Fields still needed, most impactful first:',
    ...lines,
    '',
    'Rules:',
    '- Ask about ONE field at a time, in plain language. No jargon, no field paths shown to the client.',
    '- When the client gives a concrete answer, call `record_answer` with the exact field `path` from the list and a well-shaped `value`.',
    '- After recording, move to the next field. When every field above is filled, thank them and stop (no tool call).',
    '- Never ask for passwords, API keys, pricing, capacity numbers, or anything sensitive — those are handled by the Upriver operator, not here.',
    '- Keep each message to one or two sentences.',
  ].join('\n');
}

export interface ChatTurnResult {
  /** The assistant's text to show the client (its next question or closing message). */
  assistant: string;
  writes: Array<{ path: string; revision: number }>;
  rejected: Array<{ path: string; reason: string }>;
}

/** The write callback the endpoint supplies — it enforces the trust boundary then persists. */
export type WriteField = (
  path: string,
  value: unknown,
  evidence: string | undefined,
) => Promise<{ ok: true; path: string; revision: number } | { ok: false; path: string; reason: string }>;

const MAX_TOOL_ROUNDS = 4;

function textOf(content: ContentBlock[]): string {
  return content
    .filter((b): b is TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join('\n')
    .trim();
}
function toolUses(content: ContentBlock[]): ToolUseBlock[] {
  return content.filter((b): b is ToolUseBlock => b.type === 'tool_use' && b.name === 'record_answer');
}

/**
 * Run one chatbot turn: call the model with the gap-embedded system prompt and
 * the `record_answer` tool, execute any tool calls through `writeField` (the
 * boundary), feed results back, and loop until the model stops calling the tool
 * (bounded). Returns the assistant text plus the writes/rejections.
 */
export async function runChatTurn(
  deps: { create: CreateMessage; writeField: WriteField; model?: string },
  input: { gap: GapField[]; clientName: string; messages: ApiMessage[] },
): Promise<ChatTurnResult> {
  const system = buildSystemPrompt(input.gap, input.clientName);
  const messages: ApiMessage[] = [...input.messages];
  const writes: ChatTurnResult['writes'] = [];
  const rejected: ChatTurnResult['rejected'] = [];

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const resp = await deps.create({
      model: deps.model ?? DEFAULT_CHATBOT_MODEL,
      max_tokens: 1024,
      system,
      tools: [RECORD_ANSWER_TOOL],
      messages,
      tool_choice: { type: 'auto' },
    });

    const calls = toolUses(resp.content);
    if (calls.length === 0) {
      return { assistant: textOf(resp.content), writes, rejected };
    }

    // Preserve the full assistant turn (thinking + tool_use blocks) before the results.
    messages.push({ role: 'assistant', content: resp.content });
    const results: ContentBlock[] = [];
    for (const call of calls) {
      const path = String(call.input['path'] ?? '');
      const evidence = typeof call.input['evidence'] === 'string' ? (call.input['evidence'] as string) : undefined;
      const outcome = await deps.writeField(path, call.input['value'], evidence);
      if (outcome.ok) {
        writes.push({ path: outcome.path, revision: outcome.revision });
      } else {
        rejected.push({ path: outcome.path, reason: outcome.reason });
      }
      results.push({
        type: 'tool_result',
        tool_use_id: call.id,
        content: outcome.ok ? `recorded (${outcome.path}, revision ${outcome.revision})` : `rejected: ${outcome.reason}`,
        ...(outcome.ok ? {} : { is_error: true }),
      } as ContentBlock);
    }
    messages.push({ role: 'user', content: results });
  }

  // Exhausted the tool-round budget — return whatever the last assistant text was.
  const last = messages[messages.length - 1];
  const assistant = last && Array.isArray(last.content) ? textOf(last.content) : '';
  return { assistant, writes, rejected };
}
