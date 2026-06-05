/**
 * The coverage-driven chatbot's tool-call write endpoint (Build Spec 06 §1b).
 * The ONLY client-writable profile surface, and the place the PRD §7 trust
 * boundary is enforced: a valid magic-link token, the chatbot-fillable whitelist
 * only (never `verified`, never an operator-source or HV/credential/money field),
 * `clientProfileZ` validation, and a per-token rate limit (a shared store on
 * Vercel so the window is coherent across instances — see `lib/rate-limit.ts`).
 * All profile I/O goes through the dashboard's `ClientDataSource` — never a
 * direct Supabase client.
 */
import type { APIRoute } from 'astro';

import Anthropic from '@anthropic-ai/sdk';
import { isHumanVerifyRequired } from '@upriver/schemas';

import {
  DEFAULT_CHATBOT_MODEL,
  runChatTurn,
  type ApiMessage,
  type CreateMessage,
  type CreateResponse,
  type WriteField,
} from '../../../lib/coverage-chat.js';
import { resolveClientDataSource } from '../../../lib/data-source.js';
import { validateInterviewToken } from '../../../lib/interview.js';
import {
  chatbotGap,
  isChatbotFillable,
  mergeInterviewField,
  readProfile,
} from '../../../lib/profile-coverage.js';
import { resolveRateLimiter, resetRateLimiter, type RateLimiter } from '../../../lib/rate-limit.js';

export const prerender = false;

const MAX_MESSAGES = 40;
const MAX_TEXT_LEN = 4000;

/** Test hook: clear the rate-limit window (and drop the cached limiter). */
export function __resetRateLimit(): void {
  resetRateLimiter();
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** An attempt to smuggle envelope metadata (verified/source) through the value. */
function looksLikeEnvelope(value: unknown): boolean {
  return isRecord(value) && ('verified' in value || 'source' in value || 'humanVerifyRequired' in value);
}

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

export interface ProfilePostDeps {
  create: CreateMessage;
  model?: string;
  now?: () => string;
  /** The shared/in-memory rate limiter. Defaults to `resolveRateLimiter()`. */
  rateLimiter?: RateLimiter;
}

/**
 * The testable handler: enforces the trust boundary and runs the chatbot turn.
 * `POST` injects the real Anthropic client; tests inject a mock `create`.
 */
export async function handleProfilePost(
  ctx: { params: { slug?: string }; request: Request },
  deps: ProfilePostDeps,
): Promise<Response> {
  const slug = ctx.params.slug;
  if (!slug) return json(400, { ok: false, error: 'missing slug' });

  let body: unknown;
  try {
    body = await ctx.request.json();
  } catch {
    return json(400, { ok: false, error: 'invalid JSON body' });
  }
  if (!isRecord(body)) return json(400, { ok: false, error: 'body must be an object' });

  const token = typeof body['token'] === 'string' ? (body['token'] as string) : null;
  if (!(await validateInterviewToken(slug, token))) {
    return json(401, { ok: false, error: 'invalid or missing token' });
  }
  const rateLimiter = deps.rateLimiter ?? resolveRateLimiter();
  if (await rateLimiter.hit(token as string, Date.now())) {
    return json(429, { ok: false, error: 'rate limit exceeded; slow down' });
  }

  const ds = resolveClientDataSource();
  const profile = await readProfile(ds, slug);
  if (!profile) return json(404, { ok: false, error: 'no profile for this client' });

  const rawMessages = Array.isArray(body['messages']) ? (body['messages'] as unknown[]) : [];
  const messages: ApiMessage[] = [];
  for (const m of rawMessages.slice(0, MAX_MESSAGES)) {
    if (!isRecord(m)) continue;
    const role = m['role'] === 'assistant' ? 'assistant' : 'user';
    const content = typeof m['content'] === 'string' ? (m['content'] as string).slice(0, MAX_TEXT_LEN) : '';
    if (content) messages.push({ role, content });
  }
  if (messages.length === 0) messages.push({ role: 'user', content: 'Hello' });

  const clientName = typeof body['clientName'] === 'string' ? (body['clientName'] as string).slice(0, 120) : slug;
  const now = (deps.now ?? (() => new Date().toISOString()))();
  const gap = chatbotGap(profile);

  // The trust boundary: only the chatbot-fillable whitelist; never HV / verified /
  // operator-source / envelope-shaped values. The merge hardcodes source:'interview'.
  const writeField: WriteField = async (path, value, evidence) => {
    if (!path) return { ok: false, path: '(none)', reason: 'missing field path' };
    if (/(^|\.)(verified|source|humanVerifyRequired)$/.test(path)) {
      return { ok: false, path, reason: 'that field is not client-writable' };
    }
    // HV/credential/money fields are operator-only — reject before the whitelist
    // so an HV path gets the HV reason (the whitelist already excludes them).
    if (isHumanVerifyRequired(path)) return { ok: false, path, reason: 'human-verify-required — handled by the operator, not here' };
    if (!isChatbotFillable(path)) return { ok: false, path, reason: 'not a chatbot-fillable field' };
    if (looksLikeEnvelope(value)) return { ok: false, path, reason: 'value must be a plain value, not an envelope' };
    return mergeInterviewField(ds, slug, path, value, evidence, now);
  };

  const result = await runChatTurn(
    { create: deps.create, writeField, ...(deps.model ? { model: deps.model } : {}) },
    { gap, clientName, messages },
  );

  const after = await readProfile(ds, slug);
  return json(200, {
    ok: true,
    assistant: result.assistant,
    writes: result.writes,
    rejected: result.rejected,
    revision: after?._meta.revision ?? profile._meta.revision,
    gap: chatbotGap(after ?? profile).map((g) => g.path),
  });
}

export const POST: APIRoute = async (ctx) => {
  const client = new Anthropic();
  const model = process.env['UPRIVER_CHATBOT_MODEL'] || DEFAULT_CHATBOT_MODEL;
  const create: CreateMessage = (params) =>
    client.messages.create(params as never) as unknown as Promise<CreateResponse>;
  return handleProfilePost(ctx, { create, model });
};
