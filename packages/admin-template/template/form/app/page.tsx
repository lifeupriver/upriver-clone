'use client';

import { useState } from 'react';

export default function ChangeRequestForm() {
  const [pin, setPin] = useState('');
  const [what, setWhat] = useState('');
  const [where, setWhere] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; issueUrl?: string } | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setResult(null);
    try {
      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ pin, what, where }),
      });
      const data = (await res.json()) as { ok: boolean; message: string; issueUrl?: string };
      setResult(data);
      if (data.ok) {
        setWhat('');
        setWhere('');
      }
    } catch (err) {
      setResult({ ok: false, message: 'Something went wrong. Please try again, or email us directly.' });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="container">
      <h1>{process.env['NEXT_PUBLIC_CLIENT_NAME'] ?? 'Change requests'}</h1>
      <p>Tell us what you want changed on the site. We will get back to you within a day.</p>
      <form onSubmit={onSubmit}>
        {process.env['NEXT_PUBLIC_PIN_REQUIRED'] === 'true' ? (
          <label>
            <span>PIN</span>
            <input type="password" value={pin} onChange={(e) => setPin(e.target.value)} required />
          </label>
        ) : null}
        <label>
          <span>What should change?</span>
          <textarea value={what} onChange={(e) => setWhat(e.target.value)} rows={5} required />
        </label>
        <label>
          <span>Where on the site? (optional)</span>
          <input type="text" value={where} onChange={(e) => setWhere(e.target.value)} />
        </label>
        <button type="submit" disabled={submitting}>
          {submitting ? 'Sending...' : 'Send request'}
        </button>
      </form>
      {result ? (
        <div className={result.ok ? 'ok' : 'err'}>
          <p>{result.message}</p>
          {result.issueUrl ? (
            <p>
              <a href={result.issueUrl} target="_blank" rel="noreferrer">
                View this request on GitHub
              </a>
            </p>
          ) : null}
        </div>
      ) : null}
    </main>
  );
}
