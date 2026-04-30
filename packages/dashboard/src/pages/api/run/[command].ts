import { spawn } from 'node:child_process';
import type { APIRoute } from 'astro';
import { flagsToArgs, resolveRepoRoot, resolveUpriverBin } from '@/lib/run-cli';

export const prerender = false;

/**
 * Allowlist of CLI commands the operator GUI may invoke. Anything outside this
 * list returns 400. New commands must be added explicitly so a future routing
 * mistake (or a path-traversal attempt via the dynamic route segment) cannot
 * spawn arbitrary node binaries.
 */
const ALLOWED_COMMANDS: ReadonlyArray<string> = [
  'init',
  'scrape',
  'audit',
  'audit-media',
  'gap-analysis',
  'video-audit',
  'synthesize',
  'voice-extract',
  'blog-topics',
  'schema-build',
  'design-brief',
  'scaffold',
  'clone',
  'fixes-plan',
  'qa',
  'process-interview',
  'interview-link',
  'monitor',
  'followup',
  'prototype-app',
  'custom-tools',
  'admin-deploy',
  'admin-status',
  'admin-pause',
  'admin-rotate-pin',
];

/** Time to wait after SIGTERM before escalating to SIGKILL on client abort. */
const SIGKILL_GRACE_MS = 2_000;

interface RunBody {
  args: string[];
  flags: Record<string, string | boolean | number>;
}

/**
 * Parsing result from the request body validator.
 *
 * Either `{ ok: true, value }` with the validated body, or `{ ok: false, error }`
 * with a human-readable rejection reason. We keep this manual instead of pulling
 * in zod — the dashboard package doesn't otherwise depend on it.
 */
type ParseResult = { ok: true; value: RunBody } | { ok: false; error: string };

/**
 * Type-guard: a non-null plain object.
 *
 * @param v - Arbitrary value.
 * @returns True if `v` is a non-array, non-null object.
 */
function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Validate a parsed JSON body against the `RunBody` shape.
 *
 * Allowed top-level keys are exactly `args`, `flags`, and `slug` (slug is
 * accepted but ignored — the canonical place for slug is inside `flags`).
 * Extras are rejected to make typos visible. Inside `flags`, only string,
 * number, and boolean values are accepted; nested objects are rejected.
 *
 * @param raw - The parsed JSON body (untrusted).
 * @returns A `ParseResult` describing success or the first validation failure.
 */
function validateBody(raw: unknown): ParseResult {
  if (raw === null || raw === undefined) {
    return { ok: true, value: { args: [], flags: {} } };
  }
  if (!isRecord(raw)) {
    return { ok: false, error: 'body must be a JSON object' };
  }

  const allowedKeys = new Set(['args', 'flags', 'slug']);
  for (const k of Object.keys(raw)) {
    if (!allowedKeys.has(k)) {
      return { ok: false, error: `unknown body key: ${k}` };
    }
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

  return { ok: true, value: { args, flags } };
}

/**
 * Encode an SSE `data:` line. Each `\n` inside `text` becomes its own `data:`
 * line per the SSE spec; the event terminator is the trailing blank line.
 *
 * @param text - Plain log line(s) to send.
 * @returns Encoded `Uint8Array` ready for `controller.enqueue`.
 */
function sseDataFrame(text: string, encoder: TextEncoder): Uint8Array {
  const lines = text.split('\n').map((l) => `data: ${l}`).join('\n');
  return encoder.encode(`${lines}\n\n`);
}

/**
 * Encode a named SSE event (`event: <name>\ndata: <payload>\n\n`).
 *
 * @param name - Event name (e.g. `done`, `error`).
 * @param payload - JSON-serializable payload.
 * @returns Encoded `Uint8Array`.
 */
function sseEventFrame(name: string, payload: unknown, encoder: TextEncoder): Uint8Array {
  const data = JSON.stringify(payload);
  return encoder.encode(`event: ${name}\ndata: ${data}\n\n`);
}

/**
 * POST handler for `/api/run/<command>`.
 *
 * Spawns the upriver CLI as a node subprocess and streams stdout/stderr lines
 * back as Server-Sent Events. Emits `event: done` with the exit code, then
 * closes the stream. On client abort, sends SIGTERM (then SIGKILL after 2s).
 */
export const POST: APIRoute = async ({ params, request }) => {
  // Local-only path. Phase 4 retired the UPRIVER_RUN_TOKEN gate — this route
  // is reachable only when UPRIVER_DATA_SOURCE=local (i.e. operator's
  // laptop), and `assertLocalDataSource` inside resolveUpriverBin enforces
  // that. The hosted path is /api/enqueue, gated by the auth middleware.
  const command = params.command;
  if (typeof command !== 'string' || !ALLOWED_COMMANDS.includes(command)) {
    return new Response(JSON.stringify({ error: 'unknown command' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  let raw: unknown;
  try {
    // Allow empty bodies — some commands take no args/flags.
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

  let binPath: string;
  let repoRoot: string;
  try {
    binPath = resolveUpriverBin();
    repoRoot = resolveRepoRoot();
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }

  const { args, flags } = parsed.value;
  // spawn arg array: [binPath, command, ...positional args, ...flags]
  // No shell — node receives argv as a list, so values are inert to shell metachars.
  const spawnArgs = [binPath, command, ...args, ...flagsToArgs(flags)];

  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const child = spawn('node', spawnArgs, {
        cwd: repoRoot,
        env: process.env,
        stdio: ['ignore', 'pipe', 'pipe'],
      });

      // Push a comment frame immediately so the client connection is "open"
      // even if the child takes a moment to produce output. Comments are
      // ignored by EventSource-style consumers.
      controller.enqueue(encoder.encode(`: spawned ${command}\n\n`));

      let closed = false;
      const closeOnce = (): void => {
        if (closed) return;
        closed = true;
        try {
          controller.close();
        } catch {
          // Already closed by the runtime; ignore.
        }
      };

      // Buffer chunks per stream so we can split on newlines cleanly. Partial
      // trailing fragments are held until the next chunk or stream end.
      function makeFlush(getBuf: () => string): () => void {
        return () => {
          const remainder = getBuf();
          if (remainder.length > 0) {
            try {
              controller.enqueue(sseDataFrame(remainder, encoder));
            } catch {
              // Already closed.
            }
          }
        };
      }

      let stdoutBuf = '';
      child.stdout?.on('data', (chunk: Buffer) => {
        stdoutBuf += chunk.toString('utf8');
        const lines = stdoutBuf.split('\n');
        stdoutBuf = lines.pop() ?? '';
        for (const line of lines) {
          try {
            controller.enqueue(sseDataFrame(line, encoder));
          } catch {
            return;
          }
        }
      });
      child.stdout?.on('end', makeFlush(() => stdoutBuf));

      let stderrBuf = '';
      child.stderr?.on('data', (chunk: Buffer) => {
        stderrBuf += chunk.toString('utf8');
        const lines = stderrBuf.split('\n');
        stderrBuf = lines.pop() ?? '';
        for (const line of lines) {
          try {
            controller.enqueue(sseDataFrame(line, encoder));
          } catch {
            return;
          }
        }
      });
      child.stderr?.on('end', makeFlush(() => stderrBuf));

      child.on('error', (err) => {
        try {
          controller.enqueue(sseEventFrame('error', { message: err.message }, encoder));
        } catch {
          // Already closed.
        }
        closeOnce();
      });

      child.on('exit', (code) => {
        try {
          controller.enqueue(sseEventFrame('done', { code: code ?? 0 }, encoder));
        } catch {
          // Already closed.
        }
        closeOnce();
      });

      // Client disconnect: kill the child cleanly, then escalate.
      const onAbort = (): void => {
        if (child.exitCode !== null || child.signalCode !== null) return;
        try {
          child.kill('SIGTERM');
        } catch {
          // Process already gone.
        }
        const t = setTimeout(() => {
          try {
            child.kill('SIGKILL');
          } catch {
            // Already gone.
          }
        }, SIGKILL_GRACE_MS);
        // Don't keep the event loop alive just for the kill timer.
        if (typeof t.unref === 'function') t.unref();
        closeOnce();
      };
      request.signal.addEventListener('abort', onAbort, { once: true });
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      // Disable proxy buffering when behind nginx-style proxies.
      'x-accel-buffering': 'no',
    },
  });
};
