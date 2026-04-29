import React, { useEffect, useRef, useState } from 'react';

const SLUG_PATTERN = /^[a-z0-9-]+$/;

interface FormState {
  url: string;
  name: string;
  slug: string;
}

type Phase = 'idle' | 'running' | 'success' | 'error';

/**
 * Inline new-client wizard. Posts `{ args: [url], flags: { slug, name } }` to
 * `/api/run/init`, then streams the response as Server-Sent Events into a
 * `<pre>` log panel. On `event: done` with exit code 0, redirects to
 * `/clients/<slug>`; otherwise surfaces the error.
 *
 * EventSource doesn't support POST, so we use `fetch` and parse the SSE
 * framing manually from a streaming reader.
 */
export default function NewClientForm(): React.ReactElement {
  const [form, setForm] = useState<FormState>({ url: '', name: '', slug: '' });
  const [phase, setPhase] = useState<Phase>('idle');
  const [error, setError] = useState<string | null>(null);
  const [log, setLog] = useState<string>('');
  const abortRef = useRef<AbortController | null>(null);
  const logRef = useRef<HTMLPreElement | null>(null);

  // Auto-scroll the log panel as new lines arrive.
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [log]);

  // Cancel any in-flight stream if the component unmounts.
  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  function update<K extends keyof FormState>(key: K, value: FormState[K]): void {
    setForm((s) => ({ ...s, [key]: value }));
  }

  function validate(): string | null {
    if (form.url.trim().length === 0) return 'Site URL is required.';
    try {
      // eslint-disable-next-line no-new
      new URL(form.url);
    } catch {
      return 'Site URL must be a valid URL (including https://).';
    }
    if (form.name.trim().length === 0) return 'Name is required.';
    if (!SLUG_PATTERN.test(form.slug)) {
      return 'Slug must contain only lowercase letters, digits, and dashes.';
    }
    return null;
  }

  async function onSubmit(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    const v = validate();
    if (v) {
      setError(v);
      setPhase('error');
      return;
    }
    setError(null);
    setLog('');
    setPhase('running');

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const headers: Record<string, string> = { 'content-type': 'application/json' };
      if (typeof document !== 'undefined') {
        const tokenTag = document.querySelector('meta[name="upriver-run-token"]');
        const token = tokenTag?.getAttribute('content');
        if (token) headers['x-upriver-token'] = token;
      }
      const res = await fetch('/api/run/init', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          args: [form.url.trim()],
          flags: { slug: form.slug, name: form.name },
        }),
        signal: ac.signal,
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      if (!res.body) {
        throw new Error('Empty response body from /api/run/init.');
      }

      await consumeSSE(res.body, {
        onLine: (line) => {
          setLog((prev) => `${prev}${line}\n`);
        },
        onDone: (code) => {
          if (code === 0) {
            setPhase('success');
            setLog((prev) => `${prev}\n[done] init exited cleanly. Redirecting...\n`);
            // Small delay so the user sees the success state before navigating.
            setTimeout(() => {
              window.location.href = `/clients/${form.slug}`;
            }, 600);
          } else {
            setPhase('error');
            setError(`init exited with code ${code}. See log for details.`);
          }
        },
        onError: (msg) => {
          setPhase('error');
          setError(msg);
        },
      });
    } catch (err) {
      if ((err as Error).name === 'AbortError') return;
      setPhase('error');
      setError((err as Error).message);
    } finally {
      abortRef.current = null;
    }
  }

  const busy = phase === 'running';

  return (
    <div style={wrap}>
      <form onSubmit={onSubmit} style={formStyle}>
        <label style={fieldStyle}>
          <span style={labelStyle}>Site URL</span>
          <input
            type="url"
            required
            value={form.url}
            onChange={(e) => update('url', e.target.value)}
            placeholder="https://example.com"
            disabled={busy}
            style={inputStyle}
          />
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>Client name</span>
          <input
            type="text"
            required
            value={form.name}
            onChange={(e) => update('name', e.target.value)}
            placeholder="Audrey's Farmhouse"
            disabled={busy}
            style={inputStyle}
          />
        </label>

        <label style={fieldStyle}>
          <span style={labelStyle}>Slug</span>
          <input
            type="text"
            required
            pattern="[a-z0-9-]+"
            value={form.slug}
            onChange={(e) => update('slug', e.target.value)}
            placeholder="audreys"
            disabled={busy}
            style={inputStyle}
          />
          <span style={hintStyle}>Lowercase letters, digits, and dashes only.</span>
        </label>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button type="submit" disabled={busy} style={primaryBtn}>
            {busy ? 'Running init...' : 'Create client'}
          </button>
          {phase === 'success' && (
            <span style={{ color: 'var(--accent, #F1551A)', fontSize: '0.85rem' }}>
              Client created. Redirecting...
            </span>
          )}
          {error && (
            <span role="alert" style={{ color: '#E26A6A', fontSize: '0.85rem' }}>
              {error}
            </span>
          )}
        </div>
      </form>

      {(phase === 'running' || log.length > 0) && (
        <div style={{ marginTop: '1.25rem' }}>
          <span style={logLabelStyle}>Log</span>
          <pre ref={logRef} style={logStyle}>
            {log || 'Waiting for output...'}
          </pre>
        </div>
      )}
    </div>
  );
}

interface ConsumeOpts {
  onLine: (line: string) => void;
  onDone: (code: number) => void;
  onError: (message: string) => void;
}

/**
 * Drain a `ReadableStream` of SSE-encoded bytes, parsing events into callbacks.
 *
 * Recognized events:
 * - default (no `event:` field): `data: <line>` is forwarded via `onLine`.
 *   Multi-line `data:` blocks are joined with newlines.
 * - `event: done` with `data: { "code": <n> }` triggers `onDone`.
 * - `event: error` with `data: { "message": "..." }` triggers `onError`.
 *
 * The parser tolerates carriage returns and ignores comment lines that start
 * with `:`.
 *
 * @param body - The streaming response body.
 * @param opts - Callbacks for line, done, and error events.
 */
async function consumeSSE(body: ReadableStream<Uint8Array>, opts: ConsumeOpts): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buffer = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    // SSE event delimiter is a blank line. Process complete events; keep the
    // partial tail in `buffer`.
    let sepIdx: number;
    while ((sepIdx = indexOfBlankLine(buffer)) !== -1) {
      const rawEvent = buffer.slice(0, sepIdx);
      buffer = buffer.slice(sepIdx + delimiterLength(buffer, sepIdx));
      handleEvent(rawEvent, opts);
    }
  }

  // Flush any trailing event without a terminating blank line.
  if (buffer.trim().length > 0) {
    handleEvent(buffer, opts);
  }
}

/**
 * Find the index of an SSE event delimiter (`\n\n` or `\r\n\r\n`).
 *
 * @param s - Input buffer.
 * @returns Index of the start of the blank line, or -1 if not found.
 */
function indexOfBlankLine(s: string): number {
  const a = s.indexOf('\n\n');
  const b = s.indexOf('\r\n\r\n');
  if (a === -1) return b;
  if (b === -1) return a;
  return Math.min(a, b);
}

/**
 * Length of the blank-line delimiter at `idx` (2 for `\n\n`, 4 for `\r\n\r\n`).
 *
 * @param s - Input buffer.
 * @param idx - Index returned by `indexOfBlankLine`.
 * @returns 2 or 4.
 */
function delimiterLength(s: string, idx: number): number {
  return s.startsWith('\r\n\r\n', idx) ? 4 : 2;
}

/**
 * Parse a single SSE event block (`field: value` lines) and dispatch to the
 * appropriate callback based on the `event:` field.
 *
 * @param raw - The raw event block (without the trailing blank line).
 * @param opts - Callback handlers.
 */
function handleEvent(raw: string, opts: ConsumeOpts): void {
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

  if (dataLines.length === 0 && eventName === 'message') return;
  const data = dataLines.join('\n');

  if (eventName === 'done') {
    try {
      const parsed = JSON.parse(data) as { code?: number };
      opts.onDone(typeof parsed.code === 'number' ? parsed.code : 0);
    } catch {
      opts.onDone(0);
    }
    return;
  }
  if (eventName === 'error') {
    try {
      const parsed = JSON.parse(data) as { message?: string };
      opts.onError(parsed.message ?? 'Unknown error from CLI process.');
    } catch {
      opts.onError(data || 'Unknown error from CLI process.');
    }
    return;
  }
  opts.onLine(data);
}

const wrap: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
};

const formStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '1rem',
  background: 'var(--bg-surface, #271E18)',
  border: '1px solid var(--border, #443828)',
  borderRadius: '0.5rem',
  padding: '1.5rem',
};

const fieldStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.35rem',
};

const labelStyle: React.CSSProperties = {
  fontFamily: "'Degular Display', sans-serif",
  fontSize: '0.75rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--text-muted, #9A8E83)',
};

const inputStyle: React.CSSProperties = {
  background: 'var(--bg-elevated, #1A1412)',
  border: '1px solid var(--border, #443828)',
  borderRadius: '0.4rem',
  color: 'var(--text-strong, #F1EAE4)',
  fontFamily: 'inherit',
  fontSize: '0.95rem',
  padding: '0.55rem 0.75rem',
};

const hintStyle: React.CSSProperties = {
  color: 'var(--text-muted, #9A8E83)',
  fontSize: '0.75rem',
};

const primaryBtn: React.CSSProperties = {
  padding: '0.65rem 1.25rem',
  background: 'var(--accent, #F1551A)',
  color: '#fff',
  border: '1px solid var(--accent, #F1551A)',
  borderRadius: '0.35rem',
  fontFamily: "'Degular Display', sans-serif",
  fontSize: '0.8rem',
  fontWeight: 500,
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  cursor: 'pointer',
};

const logLabelStyle: React.CSSProperties = {
  display: 'inline-block',
  marginBottom: '0.5rem',
  fontFamily: "'Degular Display', sans-serif",
  fontSize: '0.75rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: 'var(--text-muted, #9A8E83)',
};

const logStyle: React.CSSProperties = {
  margin: 0,
  background: 'var(--bg-elevated, #1A1412)',
  border: '1px solid var(--border, #443828)',
  borderRadius: '0.4rem',
  color: 'var(--text-body, #BFB5AA)',
  fontFamily: "'JetBrains Mono', monospace",
  fontSize: '0.8rem',
  lineHeight: 1.5,
  padding: '0.85rem 1rem',
  minHeight: '8rem',
  maxHeight: '24rem',
  overflow: 'auto',
  whiteSpace: 'pre-wrap',
  wordBreak: 'break-word',
};
