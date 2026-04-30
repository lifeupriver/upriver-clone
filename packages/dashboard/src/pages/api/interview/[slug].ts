/**
 * Interview-form autosave endpoint.
 *
 * `POST /api/interview/<slug>` with `{ token, answers: { [id]: string } }`.
 * Validates the magic-link token against `interview-share.json`, then
 * patches `interview-responses.json`. Returns the post-write
 * `{ answers, _meta }` so the client can confirm persistence.
 */
import type { APIRoute } from 'astro';

import {
  patchResponses,
  validateInterviewToken,
} from '@/lib/interview';

export const prerender = false;

const MAX_KEYS_PER_REQUEST = 200;
const MAX_VALUE_LEN = 8000;

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

export const POST: APIRoute = async ({ params, request }) => {
  const slug = params.slug;
  if (!slug) {
    return jsonError(400, 'missing slug');
  }

  let parsed: unknown;
  try {
    parsed = await request.json();
  } catch {
    return jsonError(400, 'invalid JSON body');
  }
  if (!isRecord(parsed)) return jsonError(400, 'body must be an object');

  const token = typeof parsed['token'] === 'string' ? parsed['token'] : null;
  if (!(await validateInterviewToken(slug, token))) {
    return jsonError(401, 'invalid or expired token');
  }

  const rawAnswers = parsed['answers'];
  if (!isRecord(rawAnswers)) return jsonError(400, '`answers` must be an object');

  const cleanAnswers: Record<string, string> = {};
  let count = 0;
  for (const [k, v] of Object.entries(rawAnswers)) {
    if (count >= MAX_KEYS_PER_REQUEST) break;
    if (typeof k !== 'string' || k.length === 0 || k.length > 200) continue;
    if (typeof v !== 'string') continue;
    cleanAnswers[k] = v.length > MAX_VALUE_LEN ? v.slice(0, MAX_VALUE_LEN) : v;
    count++;
  }

  const file = await patchResponses(slug, cleanAnswers);
  return new Response(
    JSON.stringify({ ok: true, answeredCount: file._meta?.answeredCount ?? 0, _meta: file._meta }),
    { status: 200, headers: { 'content-type': 'application/json' } },
  );
};

function jsonError(status: number, message: string): Response {
  return new Response(JSON.stringify({ ok: false, error: message }), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}
