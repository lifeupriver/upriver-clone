import { useRef, useState } from 'react';

// Subpath import — pulls only the pure stage list, no node-only modules from
// the @upriver/core root (which would break the client bundle).
import { PIPELINE_STAGES, type PipelineStage } from '@upriver/core/pipeline';

/**
 * F.2 / G.7 — Live pipeline view. One row per stage with a Run button that
 * POSTs to `/api/run/<command>` and streams the SSE response into a shared
 * log panel.
 *
 * Stage list is now imported from `@upriver/core` (single source of truth).
 * Stages with `command: null` (init / discover / launch) render as display-
 * only — they can't be invoked from the GUI (init needs a URL, discover and
 * launch aren't on the API allowlist).
 */

type StageDef = Pick<PipelineStage, 'id' | 'label' | 'command' | 'args'>;

const STAGES: StageDef[] = PIPELINE_STAGES.map(({ id, label, command, args }) => ({
  id,
  label,
  command,
  ...(args ? { args } : {}),
}));

interface Props {
  slug: string;
  /** Stage detected on the server at page-load time (for initial highlighting). */
  currentStage: string;
  /**
   * Server-rendered value of `getDataSource()`. `local` keeps the legacy
   * `/api/run/<command>` SSE-spawn path. `supabase` switches to the Phase 3
   * enqueue+poll path: POST `/api/enqueue/<command>` → `{ jobId }` → SSE
   * `/api/jobs/<jobId>` for status transitions.
   */
  dataSource: 'local' | 'supabase';
}

type Phase = 'idle' | 'running' | 'success' | 'error';

interface StreamCallbacks {
  onLine: (line: string) => void;
  onDone: (code: number) => void;
  onError: (msg: string) => void;
  /**
   * Status transitions from the Phase 3 jobs endpoint (`Queued`, `Running`,
   * `Completed`, …). Optional because the legacy `/api/run` SSE never emits
   * status frames — only the enqueue+poll path needs this hook.
   */
  onStatus?: (status: string) => void;
}

export default function PipelineStages({ slug, currentStage, dataSource }: Props): JSX.Element {
  const [phase, setPhase] = useState<Phase>('idle');
  const [activeStage, setActiveStage] = useState<string | null>(null);
  const [log, setLog] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);

  const currentIdx = STAGES.findIndex((s) => s.id === currentStage);

  async function runStage(stage: StageDef): Promise<void> {
    if (!stage.command) return;
    if (phase === 'running') return;

    setPhase('running');
    setActiveStage(stage.id);
    setLog(`[start] upriver ${stage.command} ${slug}${stage.args?.length ? ' ' + stage.args.join(' ') : ''}\n`);

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      if (dataSource === 'supabase') {
        await runViaEnqueue(stage, slug, ac, {
          onLine: (line) => setLog((prev) => `${prev}${line}\n`),
          onDone: (code) => {
            if (code === 0) {
              setPhase('success');
              setLog((prev) => `${prev}\n[done] ${stage.label} completed.\n`);
            } else {
              setPhase('error');
              setLog((prev) => `${prev}\n[error] ${stage.label} ended with status code ${code}.\n`);
            }
          },
          onError: (msg) => {
            setPhase('error');
            setLog((prev) => `${prev}\n[error] ${msg}\n`);
          },
        });
      } else {
        await runViaSpawn(stage, slug, ac, {
          onLine: (line) => setLog((prev) => `${prev}${line}\n`),
          onDone: (code) => {
            if (code === 0) {
              setPhase('success');
              setLog((prev) => `${prev}\n[done] ${stage.label} exited cleanly.\n`);
            } else {
              setPhase('error');
              setLog((prev) => `${prev}\n[error] ${stage.label} exited with code ${code}.\n`);
            }
          },
          onError: (msg) => {
            setPhase('error');
            setLog((prev) => `${prev}\n[error] ${msg}\n`);
          },
        });
      }
    } catch (err) {
      if ((err as Error).name === 'AbortError') {
        setPhase('idle');
        setLog((prev) => `${prev}\n[aborted]\n`);
      } else {
        setPhase('error');
        setLog((prev) => `${prev}\n[error] ${(err as Error).message}\n`);
      }
    } finally {
      abortRef.current = null;
    }
  }

  function abort(): void {
    abortRef.current?.abort();
  }

  return (
    <div className="pipeline-stages">
      <ol className="stage-list">
        {STAGES.map((stage, idx) => {
          const isComplete = idx < currentIdx;
          const isCurrent = idx === currentIdx;
          const isActive = activeStage === stage.id && phase === 'running';
          return (
            <li key={stage.id} className={`stage-row${isActive ? ' active' : ''}`}>
              <span className={`dot ${isComplete ? 'complete' : isCurrent ? 'current' : 'pending'}`} aria-hidden="true" />
              <span className="label">{stage.label}</span>
              <span className="run-cell">
                {stage.command ? (
                  <button
                    type="button"
                    className="run-btn"
                    disabled={phase === 'running' && activeStage !== stage.id}
                    onClick={() => runStage(stage)}
                  >
                    {isActive ? 'Running…' : 'Run'}
                  </button>
                ) : (
                  <span className="muted">—</span>
                )}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="log-panel" aria-live="polite">
        <div className="log-header">
          <span>{activeStage ? `Output: ${activeStage}` : 'Output'}</span>
          {phase === 'running' && (
            <button type="button" className="abort-btn" onClick={abort}>
              Abort
            </button>
          )}
        </div>
        <pre className="log-body">{log || '(no output yet — click a Run button)'}</pre>
      </div>

      <style>{`
        .pipeline-stages { display: flex; flex-direction: column; gap: 1rem; }
        .stage-list { list-style: none; padding: 0; margin: 0; }
        .stage-row { display: grid; grid-template-columns: 1.25rem 1fr auto; gap: 0.625rem; align-items: center; padding: 0.45rem 0; }
        .stage-row.active { background: var(--accent-10, rgba(99, 102, 241, 0.08)); border-radius: 0.25rem; padding-inline: 0.5rem; }
        .dot { width: 12px; height: 12px; border-radius: 50%; }
        .dot.complete { background: var(--success, #16a34a); }
        .dot.current { background: var(--accent-30, #6366f1); }
        .dot.pending { background: transparent; border: 1px solid var(--border, #e5e7eb); }
        .label { font-family: var(--font-heading, system-ui); font-size: var(--fs-xxs, 0.78rem); letter-spacing: 0.06em; text-transform: uppercase; }
        .run-cell { justify-self: end; }
        .run-btn { font-size: 0.78rem; padding: 0.3rem 0.7rem; border: 1px solid var(--border, #e5e7eb); background: var(--bg-primary, #fff); border-radius: 0.25rem; cursor: pointer; }
        .run-btn:hover:not(:disabled) { background: var(--bg-secondary, #f3f4f6); }
        .run-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .muted { color: var(--text-muted, #9ca3af); font-size: 0.78rem; }
        .log-panel { border: 1px solid var(--border, #e5e7eb); border-radius: 0.375rem; overflow: hidden; }
        .log-header { display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.7rem; background: var(--bg-secondary, #f9fafb); border-bottom: 1px solid var(--border, #e5e7eb); font-size: 0.78rem; }
        .abort-btn { font-size: 0.72rem; padding: 0.2rem 0.5rem; border: 1px solid var(--border, #e5e7eb); background: transparent; border-radius: 0.25rem; cursor: pointer; }
        .log-body { font-family: ui-monospace, SF Mono, monospace; font-size: 0.72rem; padding: 0.6rem 0.8rem; margin: 0; max-height: 18rem; overflow: auto; white-space: pre-wrap; word-break: break-word; }
      `}</style>
    </div>
  );
}

/**
 * Legacy path: POST `/api/run/<command>` and stream the SSE log lines straight
 * into the panel. Used when `dataSource === 'local'` (operator laptop).
 */
async function runViaSpawn(
  stage: StageDef,
  slug: string,
  ac: AbortController,
  cb: StreamCallbacks,
): Promise<void> {
  if (!stage.command) return;
  const res = await fetch(`/api/run/${stage.command}`, {
    method: 'POST',
    headers: runHeaders(),
    body: JSON.stringify({ args: [slug, ...(stage.args ?? [])], flags: {} }),
    signal: ac.signal,
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${res.status}`);
  }
  if (!res.body) throw new Error('Empty response body');
  await consumeSSE(res.body, cb);
}

/**
 * Phase 3 path: POST `/api/enqueue/<command>` to receive a `jobId`, then open
 * an SSE connection to `/api/jobs/<jobId>` for status transitions. Used when
 * `dataSource === 'supabase'` (hosted dashboard fronting a worker pool).
 *
 * Status frames are mapped into log lines so the existing log panel renders
 * something useful before Phase 3.5 wires through real per-step output.
 * `done` translates to a numeric code so the existing onDone callback works:
 * `Completed` → 0, anything else → 1.
 */
async function runViaEnqueue(
  stage: StageDef,
  slug: string,
  ac: AbortController,
  cb: StreamCallbacks,
): Promise<void> {
  if (!stage.command) return;
  const enqueueRes = await fetch(`/api/enqueue/${stage.command}`, {
    method: 'POST',
    headers: runHeaders(),
    body: JSON.stringify({ slug, args: stage.args ?? [], flags: {} }),
    signal: ac.signal,
  });
  if (!enqueueRes.ok) {
    const body = (await enqueueRes.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `HTTP ${enqueueRes.status}`);
  }
  const { jobId } = (await enqueueRes.json()) as { jobId?: string };
  if (!jobId) throw new Error('enqueue returned no jobId');
  cb.onLine(`[enqueued] jobId=${jobId}`);

  const statusRes = await fetch(`/api/jobs/${encodeURIComponent(jobId)}`, {
    method: 'GET',
    headers: { accept: 'text/event-stream' },
    signal: ac.signal,
  });
  if (!statusRes.ok) {
    throw new Error(`status stream HTTP ${statusRes.status}`);
  }
  if (!statusRes.body) throw new Error('Empty status stream body');

  await consumeSSE(statusRes.body, {
    onLine: () => {
      // Status SSE has no untyped log lines today; ignore so we don't spam the
      // panel with empty messages from heartbeat comments. Phase 3.5 will add
      // typed `log` events from the worker container that we'll route back to
      // cb.onLine with the per-step output.
    },
    onDone: cb.onDone,
    onError: cb.onError,
    onStatus: (status) => {
      cb.onLine(`[status] ${status}`);
    },
  });
}

/**
 * Consume an SSE response body and dispatch line/done/error callbacks.
 * Mirrors the parser in NewClientForm.tsx — kept inline rather than extracted
 * because the dashboard package has no test runner and adding a shared util
 * without coverage is a larger move than F.2 needs.
 */
/**
 * F.5 — read the optional `<meta name="upriver-run-token">` value from the
 * dashboard page and attach it as `X-Upriver-Token`. When the dashboard
 * server has UPRIVER_RUN_TOKEN unset, the meta tag isn't rendered and we
 * fall back to a plain content-type header (current dev behavior).
 */
function runHeaders(): Record<string, string> {
  const headers: Record<string, string> = { 'content-type': 'application/json' };
  if (typeof document === 'undefined') return headers;
  const tag = document.querySelector('meta[name="upriver-run-token"]');
  const token = tag?.getAttribute('content');
  if (token) headers['x-upriver-token'] = token;
  return headers;
}

async function consumeSSE(body: ReadableStream<Uint8Array>, opts: StreamCallbacks): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    let sepIdx = indexOfBlankLine(buffer);
    while (sepIdx !== -1) {
      const rawEvent = buffer.slice(0, sepIdx);
      buffer = buffer.slice(sepIdx + delimiterLength(buffer, sepIdx));
      handleEvent(rawEvent, opts);
      sepIdx = indexOfBlankLine(buffer);
    }
  }
  if (buffer.trim().length > 0) handleEvent(buffer, opts);
}

function indexOfBlankLine(s: string): number {
  const a = s.indexOf('\n\n');
  const b = s.indexOf('\r\n\r\n');
  if (a === -1) return b;
  if (b === -1) return a;
  return Math.min(a, b);
}

function delimiterLength(s: string, idx: number): number {
  return s.startsWith('\r\n\r\n', idx) ? 4 : 2;
}

function handleEvent(raw: string, opts: StreamCallbacks): void {
  let eventName = 'message';
  const dataLines: string[] = [];
  for (const lineRaw of raw.split('\n')) {
    const line = lineRaw.replace(/\r$/, '');
    if (line.length === 0 || line.startsWith(':')) continue;
    const colon = line.indexOf(':');
    const field = colon === -1 ? line : line.slice(0, colon);
    let value = colon === -1 ? '' : line.slice(colon + 1);
    if (value.startsWith(' ')) value = value.slice(1);
    if (field === 'event') eventName = value;
    else if (field === 'data') dataLines.push(value);
  }
  const data = dataLines.join('\n');
  if (eventName === 'done') {
    try {
      const parsed = JSON.parse(data) as {
        code?: number;
        status?: string;
        output?: { stdoutTail?: string; stderrTail?: string } | null;
      };
      // Two payload shapes share this event name: legacy spawn endpoint uses
      // `{ code }`, jobs endpoint uses `{ status, output }`. Either path
      // collapses to a numeric code so the existing onDone signature stays
      // stable. The jobs path also carries stdout/stderr tails from the
      // worker — surface those as log lines so operators see real CLI output
      // rather than just status transitions.
      const output = parsed.output;
      if (output && typeof output === 'object') {
        if (typeof output.stdoutTail === 'string' && output.stdoutTail.length > 0) {
          opts.onLine('--- stdout (tail) ---');
          for (const line of output.stdoutTail.split('\n')) {
            opts.onLine(line);
          }
        }
        if (typeof output.stderrTail === 'string' && output.stderrTail.length > 0) {
          opts.onLine('--- stderr (tail) ---');
          for (const line of output.stderrTail.split('\n')) {
            opts.onLine(line);
          }
        }
      }
      if (typeof parsed.code === 'number') {
        opts.onDone(parsed.code);
      } else if (typeof parsed.status === 'string') {
        opts.onDone(parsed.status === 'Completed' ? 0 : 1);
      } else {
        opts.onDone(1);
      }
    } catch {
      opts.onDone(1);
    }
  } else if (eventName === 'error') {
    try {
      const parsed = JSON.parse(data) as { message?: string };
      opts.onError(parsed.message ?? 'unknown error');
    } catch {
      opts.onError(data || 'unknown error');
    }
  } else if (eventName === 'status') {
    try {
      const parsed = JSON.parse(data) as { status?: string };
      if (parsed.status && opts.onStatus) opts.onStatus(parsed.status);
    } catch {
      // ignore malformed status frames
    }
  } else {
    opts.onLine(data);
  }
}
