import { useState } from 'react';

// Posts change requests to the client repo as GitHub issues labeled
// `client-request`. The repo's workflow (.github/workflows/client-request.yml)
// then triggers claude-code-action to pick the issue up.
export default function ChangeRequestForm() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'ok' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus('sending');
    setMessage('');

    try {
      const res = await fetch('/api/change-request', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ title, body }),
      });
      const data = (await res.json()) as { ok: boolean; url?: string; error?: string };
      if (!res.ok || !data.ok) {
        setStatus('error');
        setMessage(data.error ?? `Request failed (${res.status})`);
        return;
      }
      setStatus('ok');
      setMessage(`Issue created${data.url ? `: ${data.url}` : ''}`);
      setTitle('');
      setBody('');
    } catch (err) {
      setStatus('error');
      setMessage(err instanceof Error ? err.message : String(err));
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4 rounded-card border border-ink-200 bg-white p-5">
      <div>
        <label htmlFor="cr-title" className="block text-sm font-medium text-ink-900">
          Title
        </label>
        <input
          id="cr-title"
          type="text"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="mt-1 block w-full rounded-button border border-ink-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <div>
        <label htmlFor="cr-body" className="block text-sm font-medium text-ink-900">
          What needs to change?
        </label>
        <textarea
          id="cr-body"
          required
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
          className="mt-1 block w-full rounded-button border border-ink-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
        />
      </div>
      <button
        type="submit"
        disabled={status === 'sending'}
        className="rounded-button bg-brand-600 px-5 py-2 font-medium text-white hover:bg-brand-700 disabled:opacity-50"
      >
        {status === 'sending' ? 'Submitting…' : 'Submit request'}
      </button>
      {message && (
        <p
          className={
            status === 'error'
              ? 'text-sm text-red-600'
              : status === 'ok'
                ? 'text-sm text-green-700'
                : 'text-sm text-ink-500'
          }
        >
          {message}
        </p>
      )}
    </form>
  );
}
