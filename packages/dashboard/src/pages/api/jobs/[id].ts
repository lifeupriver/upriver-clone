import type { APIRoute } from 'astro';

export const prerender = false;

/**
 * Poll cadence for the Inngest run-status REST API. 1 Hz keeps the load light
 * (event-driven streaming would be tighter, but Inngest's REST API is the
 * least vendor-locked surface and the pipeline stages run in tens of seconds
 * to several minutes — sub-second resolution buys nothing).
 */
const POLL_INTERVAL_MS = 1_000;

/**
 * Wall-clock cap on a single SSE connection. The longest pipeline stage today
 * (`clone`) caps around 10 minutes; a generous margin avoids prematurely
 * closing a slow run while still bounding orphan connections if a client tab
 * is left open after a job finishes.
 */
const MAX_STREAM_MS = 30 * 60 * 1_000;

/** Terminal Inngest run statuses — once observed, the SSE stream closes. */
const TERMINAL_STATUSES = new Set(['Completed', 'Failed', 'Cancelled']);

interface InngestRun {
  run_id: string;
  status: string;
  output?: unknown;
  ended_at?: string | null;
}

interface InngestRunsResponse {
  data: InngestRun[];
}

/**
 * Resolve the Inngest REST API base URL. Defaults to Inngest Cloud; override
 * with `INNGEST_BASE_URL=http://localhost:8288` to point at a local dev
 * server instance.
 */
function resolveInngestBaseUrl(): string {
  return process.env['INNGEST_BASE_URL'] ?? 'https://api.inngest.com';
}

/**
 * Build the Authorization header for the Inngest REST API. The signing key is
 * the same one the serve handler validates with — Inngest treats it as a
 * bearer token for read access. Dev server runs unauthenticated, so we omit
 * the header when no key is configured.
 */
function buildAuthHeader(): Record<string, string> {
  const key = process.env['INNGEST_SIGNING_KEY'];
  return key ? { authorization: `Bearer ${key}` } : {};
}

function sseFrame(event: string, payload: unknown, encoder: TextEncoder): Uint8Array {
  return encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`);
}

function sseComment(text: string, encoder: TextEncoder): Uint8Array {
  return encoder.encode(`: ${text}\n\n`);
}

/**
 * GET `/api/jobs/<id>` — Server-Sent Events stream of Inngest run status for
 * the given event id (`id` is the value returned by `/api/enqueue` as
 * `jobId`).
 *
 * Events emitted:
 *   - `status` — `{ runId, status, endedAt? }` whenever the status changes.
 *   - `done`   — `{ runId, status, output? }` once a terminal status is
 *                observed; the stream then closes.
 *   - `error`  — `{ message }` on REST API failure (terminates the stream).
 *
 * Heartbeat comments (`: ping`) every 15 seconds keep proxies from killing
 * idle connections.
 */
export const GET: APIRoute = async ({ params, request }) => {
  const id = params.id;
  if (typeof id !== 'string' || id.length === 0) {
    return new Response(JSON.stringify({ error: 'invalid job id' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const baseUrl = resolveInngestBaseUrl();
  const authHeader = buildAuthHeader();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const close = (): void => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearInterval(poller);
        try {
          controller.close();
        } catch {
          // Already closed by the runtime.
        }
      };

      const safeEnqueue = (chunk: Uint8Array): void => {
        if (closed) return;
        try {
          controller.enqueue(chunk);
        } catch {
          close();
        }
      };

      controller.enqueue(sseComment(`subscribed to ${id}`, encoder));

      const heartbeat = setInterval(() => {
        safeEnqueue(sseComment('ping', encoder));
      }, 15_000);

      let lastStatus: string | null = null;
      let lastRunId: string | null = null;

      const poll = async (): Promise<void> => {
        try {
          const res = await fetch(`${baseUrl}/v1/events/${encodeURIComponent(id)}/runs`, {
            headers: { ...authHeader, accept: 'application/json' },
          });
          if (!res.ok) {
            // 404 right after enqueue is normal — Inngest takes a moment to
            // materialize the run. Swallow until either it appears or the
            // overall stream timeout fires.
            if (res.status === 404) return;
            const text = await res.text();
            safeEnqueue(sseFrame('error', { message: `inngest ${res.status}: ${text}` }, encoder));
            close();
            return;
          }
          const body = (await res.json()) as InngestRunsResponse;
          const run = body.data?.[0];
          if (!run) return;

          if (run.status !== lastStatus || run.run_id !== lastRunId) {
            lastStatus = run.status;
            lastRunId = run.run_id;
            safeEnqueue(
              sseFrame(
                'status',
                { runId: run.run_id, status: run.status, endedAt: run.ended_at ?? null },
                encoder,
              ),
            );
          }

          if (TERMINAL_STATUSES.has(run.status)) {
            safeEnqueue(
              sseFrame(
                'done',
                { runId: run.run_id, status: run.status, output: run.output ?? null },
                encoder,
              ),
            );
            close();
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          safeEnqueue(sseFrame('error', { message: msg }, encoder));
          close();
        }
      };

      const poller = setInterval(() => {
        void poll();
      }, POLL_INTERVAL_MS);
      // Kick once immediately so a fast-completing job doesn't wait for the
      // first interval tick.
      void poll();

      const timeout = setTimeout(() => {
        safeEnqueue(sseFrame('error', { message: 'stream timeout' }, encoder));
        close();
      }, MAX_STREAM_MS);
      if (typeof timeout.unref === 'function') timeout.unref();

      request.signal.addEventListener(
        'abort',
        () => {
          clearTimeout(timeout);
          close();
        },
        { once: true },
      );
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no',
    },
  });
};
