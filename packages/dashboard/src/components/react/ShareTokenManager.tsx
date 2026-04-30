import { useState } from 'react';

/**
 * Operator UI for minting and revoking share-link tokens against
 * `/deliverables/<slug>/*`. Lives at `/clients/<slug>/share`.
 *
 * Server hands us `initialTokens` and `origin` so the first paint already
 * shows the current state without a fetch round-trip; mutations talk to
 * `/api/share-tokens` (POST mint, DELETE revoke).
 */

export interface ShareTokenRecord {
  id: string;
  slug: string;
  token: string;
  createdAt: string;
  expiresAt: string | null;
  label: string | null;
}

interface Props {
  slug: string;
  origin: string;
  initialTokens: ShareTokenRecord[];
}

interface MintResponse extends ShareTokenRecord {
  shareUrl: string;
}

const EXPIRY_OPTIONS: Array<{ value: number | null; label: string }> = [
  { value: 7, label: '7 days' },
  { value: 30, label: '30 days' },
  { value: 90, label: '90 days' },
  { value: 365, label: '1 year' },
  { value: null, label: 'No expiry' },
];

function buildShareUrl(origin: string, slug: string, token: string): string {
  return `${origin}/deliverables/${encodeURIComponent(slug)}?t=${encodeURIComponent(token)}`;
}

function formatDate(iso: string | null): string {
  if (!iso) return 'never';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

function isExpired(iso: string | null): boolean {
  if (!iso) return false;
  const t = Date.parse(iso);
  if (Number.isNaN(t)) return false;
  return t <= Date.now();
}

export default function ShareTokenManager({ slug, origin, initialTokens }: Props): JSX.Element {
  const [tokens, setTokens] = useState<ShareTokenRecord[]>(initialTokens);
  const [label, setLabel] = useState('');
  const [expiryDays, setExpiryDays] = useState<number | null>(90);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  async function mint(e: React.FormEvent): Promise<void> {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/share-tokens', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug,
          expiresInDays: expiryDays,
          label: label.trim() || null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const minted = (await res.json()) as MintResponse;
      setTokens((prev) => [
        {
          id: minted.id,
          slug: minted.slug,
          token: minted.token,
          createdAt: minted.createdAt,
          expiresAt: minted.expiresAt,
          label: minted.label,
        },
        ...prev,
      ]);
      setLabel('');
      void copy(minted.shareUrl, minted.id);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function revoke(id: string): Promise<void> {
    if (!confirm('Revoke this share link? Anyone who has it will lose access immediately.')) return;
    try {
      const res = await fetch('/api/share-tokens', {
        method: 'DELETE',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      setTokens((prev) => prev.filter((t) => t.id !== id));
    } catch (err) {
      setError((err as Error).message);
    }
  }

  async function copy(text: string, id: string): Promise<void> {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(text);
      }
      setCopiedId(id);
      setTimeout(() => setCopiedId((cur) => (cur === id ? null : cur)), 1800);
    } catch {
      // Clipboard blocked — silently no-op; user can still select-and-copy.
    }
  }

  return (
    <div className="share-token-manager">
      <section className="card mint-card">
        <form onSubmit={mint}>
          <div className="form-row">
            <div className="field grow">
              <label htmlFor="share-label">Label (optional)</label>
              <input
                id="share-label"
                type="text"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="e.g. alex@client-co.com — launch review"
                maxLength={200}
              />
            </div>
            <div className="field">
              <label htmlFor="share-expiry">Expiry</label>
              <select
                id="share-expiry"
                value={expiryDays === null ? 'never' : String(expiryDays)}
                onChange={(e) => {
                  const v = e.target.value;
                  setExpiryDays(v === 'never' ? null : Number(v));
                }}
              >
                {EXPIRY_OPTIONS.map((opt) => (
                  <option key={opt.label} value={opt.value === null ? 'never' : String(opt.value)}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <button type="submit" className="btn-primary" disabled={busy}>
              {busy ? 'Minting…' : 'Mint share link'}
            </button>
          </div>
          {error && <p className="error" role="alert">{error}</p>}
        </form>
      </section>

      <section className="tokens-section">
        <span className="eyebrow">Active links · {tokens.length}</span>
        {tokens.length === 0 ? (
          <p className="empty">No share links minted yet. The form above creates one in a click.</p>
        ) : (
          <ul className="token-list">
            {tokens.map((t) => {
              const url = buildShareUrl(origin, slug, t.token);
              const expired = isExpired(t.expiresAt);
              return (
                <li key={t.id} className={`token-card${expired ? ' expired' : ''}`}>
                  <div className="token-row">
                    <div className="token-meta">
                      <span className="token-label">{t.label ?? <em>Untitled</em>}</span>
                      <span className="token-dates">
                        Created {formatDate(t.createdAt)} · {expired ? 'Expired' : `Expires ${formatDate(t.expiresAt)}`}
                      </span>
                    </div>
                    <div className="token-actions">
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={() => copy(url, t.id)}
                      >
                        {copiedId === t.id ? 'Copied' : 'Copy link'}
                      </button>
                      <button
                        type="button"
                        className="btn-danger"
                        onClick={() => revoke(t.id)}
                      >
                        Revoke
                      </button>
                    </div>
                  </div>
                  <pre className="token-url" title={url}>{url}</pre>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <style>{`
        .share-token-manager { display: flex; flex-direction: column; gap: 2rem; max-width: 56rem; }

        .mint-card { padding: 1.25rem 1.4rem; }
        .form-row { display: grid; grid-template-columns: 1fr 10rem auto; gap: 1rem; align-items: end; }
        .field { display: flex; flex-direction: column; gap: 0.4rem; }
        .field.grow { min-width: 0; }
        label { font-family: var(--font-heading); font-weight: 500; font-size: var(--fs-xs); letter-spacing: 0.08em; text-transform: uppercase; color: var(--text-muted); }
        input[type="text"], select {
          padding: 0.55rem 0.7rem;
          font-family: var(--font-body);
          font-size: 0.95rem;
          color: var(--text-heading);
          background: var(--bg-primary);
          border: 1px solid var(--border-input);
          border-radius: var(--radius-md);
        }
        input[type="text"]:focus, select:focus {
          outline: none;
          border-color: var(--accent);
          box-shadow: 0 0 0 3px var(--accent-20);
        }
        .btn-primary {
          padding: 0.6rem 1rem;
          font-family: var(--font-heading);
          font-weight: 500;
          font-size: var(--fs-xs);
          letter-spacing: 0.08em;
          text-transform: uppercase;
          color: #fff;
          background: var(--accent);
          border: 0;
          border-radius: var(--radius-md);
          box-shadow: var(--shadow-btn-primary);
          cursor: pointer;
          height: 2.6rem;
          transition: background 150ms var(--ease-out);
        }
        .btn-primary:hover:not(:disabled) { background: var(--accent-hover); }
        .btn-primary:disabled { opacity: 0.55; cursor: not-allowed; }

        .error { margin-top: 0.7rem; color: var(--accent); font-size: var(--fs-sm); }

        .tokens-section { display: flex; flex-direction: column; gap: 0.75rem; }
        .empty { color: var(--text-muted); font-size: var(--fs-sm); }

        .token-list { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.75rem; }
        .token-card {
          background: var(--bg-surface);
          border: 1px solid var(--border);
          border-radius: var(--radius-md);
          padding: 0.85rem 1rem;
          display: flex;
          flex-direction: column;
          gap: 0.6rem;
        }
        .token-card.expired { opacity: 0.55; }

        .token-row { display: flex; justify-content: space-between; gap: 1rem; align-items: center; flex-wrap: wrap; }
        .token-meta { display: flex; flex-direction: column; gap: 0.15rem; min-width: 0; }
        .token-label { font-family: var(--font-heading); font-weight: 500; font-size: 0.95rem; color: var(--text-heading); }
        .token-label em { color: var(--text-muted); font-style: normal; }
        .token-dates { font-size: var(--fs-xs); color: var(--text-muted); }

        .token-actions { display: flex; gap: 0.5rem; }
        .btn-secondary, .btn-danger {
          padding: 0.4rem 0.75rem;
          font-family: var(--font-heading);
          font-weight: 500;
          font-size: var(--fs-xs);
          letter-spacing: 0.06em;
          text-transform: uppercase;
          background: transparent;
          border: 1px solid var(--border-input);
          border-radius: var(--radius-md);
          cursor: pointer;
          color: var(--text-heading);
          transition: border-color 150ms var(--ease-out), color 150ms var(--ease-out);
        }
        .btn-secondary:hover { border-color: var(--accent); color: var(--accent); }
        .btn-danger:hover { border-color: #b94a3a; color: #d05a4a; }

        .token-url {
          margin: 0;
          padding: 0.45rem 0.6rem;
          background: var(--bg-primary);
          border: 1px solid var(--border);
          border-radius: var(--radius-sm);
          font-family: var(--font-mono);
          font-size: 0.78rem;
          color: var(--text-body);
          overflow-x: auto;
          white-space: pre;
        }

        @media (max-width: 36rem) {
          .form-row { grid-template-columns: 1fr; }
          .token-row { flex-direction: column; align-items: flex-start; }
          .token-actions { width: 100%; }
        }
      `}</style>
    </div>
  );
}
