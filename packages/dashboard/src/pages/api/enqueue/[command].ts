import type { APIRoute } from 'astro';
import { inngest, STAGE_RUN_EVENT } from '@upriver/worker';

export const prerender = false;

/**
 * Allowlist of pipeline-stage CLI commands the dashboard may enqueue. Mirrors
 * `ALLOWED_COMMANDS` in `api/run/[command].ts` and `ALLOWED_COMMANDS` in the
 * worker's `run-stage` function. All three lists must move together when the
 * pipeline gains or loses a stage.
 */
const ALLOWED_COMMANDS: ReadonlyArray<string> = [
  'init',
  'scrape',
  'audit',
  'synthesize',
  'design-brief',
  'scaffold',
  'clone',
  'fixes-plan',
  'qa',
];

interface EnqueueBody {
  slug: string;
  args: string[];
  flags: Record<string, string | boolean | number>;
}

type ParseResult = { ok: true; value: EnqueueBody } | { ok: false; error: string };

/**
 * Type-guard: a non-null plain object.
 */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Validate a parsed JSON body against the `EnqueueBody` shape. Slug must be
 * present (the worker needs it to pull the right client directory from the
 * bucket). `args` and `flags` follow the same rules as the legacy `/api/run`
 * endpoint so existing callers can swap endpoints without re-shaping payloads.
 */
function validateBody(raw: unknown): ParseResult {
  if (!isRecord(raw)) {
    return { ok: false, error: 'body must be a JSON object with a slug' };
  }

  const allowedKeys = new Set(['slug', 'args', 'flags']);
  for (const k of Object.keys(raw)) {
    if (!allowedKeys.has(k)) {
      return { ok: false, error: `unknown body key: ${k}` };
    }
  }

  const slugRaw = raw['slug'];
  if (typeof slugRaw !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(slugRaw)) {
    return { ok: false, error: 'slug must be a kebab-case string' };
  }

  const args: string[] = [];
  if ('args' in raw) {
    const a = raw['args'];
    if (!Array.isArray(a)) {
      return { ok: false, error: 'args must be an array of strings' };
    }
    for (const v of a) {
      if (typeof v !== 'string') {
        return { ok: false, error: 'args must be an array of strings' };
      }
      args.push(v);
    }
  }

  const flags: Record<string, string | boolean | number> = {};
  if ('flags' in raw) {
    const f = raw['flags'];
    if (!isRecord(f)) {
      return { ok: false, error: 'flags must be an object' };
    }
    for (const [k, v] of Object.entries(f)) {
      if (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean') {
        flags[k] = v;
      } else {
        return { ok: false, error: `flags.${k} must be string | number | boolean` };
      }
    }
  }

  return { ok: true, value: { slug: slugRaw, args, flags } };
}

/**
 * POST `/api/enqueue/<command>` — sends an `upriver/stage.run` event to
 * Inngest and returns the resulting event id. The dashboard uses the id to
 * subscribe to job status via `/api/jobs/<id>` (Phase 3.3).
 *
 * This is the hosted-mode counterpart to `/api/run/<command>` (which spawns
 * the CLI in-process). Local dev still uses `/api/run` when
 * `UPRIVER_DATA_SOURCE=local`; `/api/enqueue` is the path used when the
 * dashboard is fronting a worker pool.
 */
export const POST: APIRoute = async ({ params, request }) => {
  const expectedToken = process.env['UPRIVER_RUN_TOKEN'];
  if (expectedToken) {
    const provided = request.headers.get('x-upriver-token');
    if (!provided || provided !== expectedToken) {
      return new Response(
        JSON.stringify({ error: 'forbidden — missing or invalid X-Upriver-Token' }),
        { status: 403, headers: { 'content-type': 'application/json' } },
      );
    }
  }

  const command = params.command;
  if (typeof command !== 'string' || !ALLOWED_COMMANDS.includes(command)) {
    return new Response(JSON.stringify({ error: 'unknown command' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  let raw: unknown;
  try {
    const text = await request.text();
    raw = text.length === 0 ? {} : JSON.parse(text);
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON body' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const parsed = validateBody(raw);
  if (!parsed.ok) {
    return new Response(JSON.stringify({ error: parsed.error }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { slug, args, flags } = parsed.value;

  try {
    const sent = await inngest.send({
      name: STAGE_RUN_EVENT,
      data: { slug, command, args, flags },
    });
    const eventId = sent.ids[0];
    if (!eventId) {
      throw new Error('Inngest send returned no event id');
    }
    return new Response(JSON.stringify({ jobId: eventId }), {
      status: 202,
      headers: { 'content-type': 'application/json' },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: `failed to enqueue: ${msg}` }), {
      status: 502,
      headers: { 'content-type': 'application/json' },
    });
  }
};
