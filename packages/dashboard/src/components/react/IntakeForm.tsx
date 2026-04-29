import React, { useEffect, useState } from 'react';
import type { ClientIntake, FindingDecision, ScopeTier } from '@upriver/core';

interface FindingLite {
  id: string;
  title: string;
  priority: 'p0' | 'p1' | 'p2';
}

interface PageLite {
  slug: string;
  title: string;
  url: string;
}

interface Props {
  slug: string;
  clientName: string;
  findings: FindingLite[];
  pages: PageLite[];
  initial?: Partial<ClientIntake>;
}

const TIER_LABEL: Record<ScopeTier, string> = {
  'polish': 'Polish',
  'rebuild': 'Rebuild',
  'rebuild-plus-content': 'Rebuild + content',
};

const TIER_DESC: Record<ScopeTier, string> = {
  'polish': 'Fix the critical findings only. Existing site stays in place.',
  'rebuild': 'Replatform to Astro and apply every recommended fix as we go.',
  'rebuild-plus-content': 'Everything in Rebuild plus a copy and SEO improvement layer.',
};

const PRIORITY_LABEL: Record<'p0' | 'p1' | 'p2', string> = {
  p0: 'Critical',
  p1: 'Important',
  p2: 'Polish',
};

const PRIORITY_RANK: Record<'p0' | 'p1' | 'p2', number> = { p0: 0, p1: 1, p2: 2 };

const MAX_FINDINGS = 12;
const MAX_PAGES = 6;
const MAX_PAGE_WANTS_LEN = 4000;

/**
 * Build the in-memory intake state from optional `initial` props, defaulting
 * any missing fields to a fresh skeleton. Kept pure so it can be reused on
 * mount-fetch when the server returns an empty `{}`.
 *
 * @param initial - Partial intake from props or a server fetch.
 * @returns A complete `ClientIntake` suitable for local state.
 */
function hydrate(initial?: Partial<ClientIntake>): ClientIntake {
  return {
    version: 1,
    findingDecisions: initial?.findingDecisions ?? {},
    pageWants: initial?.pageWants ?? {},
    referenceSites: initial?.referenceSites ?? [],
    scopeTier: initial?.scopeTier ?? null,
    submittedAt: initial?.submittedAt ?? null,
    updatedAt: initial?.updatedAt ?? new Date().toISOString(),
  };
}

/**
 * Embedded client intake form for the report's next-steps page.
 *
 * Captures scope tier, per-finding decisions, per-page wants, and reference
 * sites; POSTs to `/api/intake/<slug>`. Fetches the latest persisted intake
 * on mount so a returning client sees their prior selections.
 *
 * @param props - Slug, client name, top findings, top pages, optional initial intake.
 */
export default function IntakeForm({ slug, clientName, findings, pages, initial }: Props) {
  const [state, setState] = useState<ClientIntake>(() => hydrate(initial));
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; msg: string } | null>(null);

  // On mount, refresh from server in case the user previously submitted.
  useEffect(() => {
    let cancelled = false;
    fetch(`/api/intake/${slug}`)
      .then(r => (r.ok ? r.json() : null))
      .then(data => {
        if (cancelled || !data || typeof data !== 'object') return;
        // Server returns {} when no intake yet; only hydrate if we got real fields.
        if ('version' in data) {
          setState(hydrate(data as Partial<ClientIntake>));
        }
      })
      .catch(() => {
        // Non-fatal; keep local state.
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  const sortedFindings = [...findings]
    .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])
    .slice(0, MAX_FINDINGS);
  const visiblePages = pages.slice(0, MAX_PAGES);

  function setDecision(id: string, decision: FindingDecision) {
    setState(s => ({ ...s, findingDecisions: { ...s.findingDecisions, [id]: decision } }));
  }

  function setPageWant(pageSlug: string, value: string) {
    const v = value.length > MAX_PAGE_WANTS_LEN ? value.slice(0, MAX_PAGE_WANTS_LEN) : value;
    setState(s => ({ ...s, pageWants: { ...s.pageWants, [pageSlug]: v } }));
  }

  function setReferenceSite(idx: number, value: string) {
    setState(s => {
      const next = [...s.referenceSites];
      next[idx] = value;
      return { ...s, referenceSites: next };
    });
  }

  function addReferenceSite() {
    setState(s =>
      s.referenceSites.length >= 20 ? s : { ...s, referenceSites: [...s.referenceSites, ''] },
    );
  }

  function removeReferenceSite(idx: number) {
    setState(s => ({ ...s, referenceSites: s.referenceSites.filter((_, i) => i !== idx) }));
  }

  function setScopeTier(tier: ScopeTier) {
    setState(s => ({ ...s, scopeTier: tier }));
  }

  async function submit() {
    setBusy(true);
    setToast(null);
    try {
      // Drop empty reference URLs before send; let the server re-validate.
      const payload = {
        findingDecisions: state.findingDecisions,
        pageWants: state.pageWants,
        referenceSites: state.referenceSites.filter(s => s.trim().length > 0),
        scopeTier: state.scopeTier,
      };
      const res = await fetch(`/api/intake/${slug}`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? `HTTP ${res.status}`);
      }
      const persisted = (await res.json()) as ClientIntake;
      setState(hydrate(persisted));
      setToast({ kind: 'success', msg: 'Saved. Thanks — we will be in touch.' });
    } catch (err) {
      setToast({ kind: 'error', msg: `Could not save: ${(err as Error).message}` });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h2 style={section.h2}>Tell us what to fix for {clientName}</h2>
        <p style={section.lede}>
          Walk through the findings, mark which ones matter, and tell us what you want each page to
          do better. Takes about 5 minutes.
        </p>
      </div>

      {/* Section A: Scope tier */}
      <fieldset style={section.fieldset}>
        <legend style={section.legend}>1. Scope tier</legend>
        <div style={{ display: 'grid', gap: '0.75rem', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))' }}>
          {(Object.keys(TIER_LABEL) as ScopeTier[]).map(tier => {
            const selected = state.scopeTier === tier;
            return (
              <label
                key={tier}
                style={{
                  ...card.base,
                  ...(selected ? card.selected : {}),
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="scopeTier"
                  value={tier}
                  checked={selected}
                  onChange={() => setScopeTier(tier)}
                  style={{ marginRight: '0.5rem' }}
                />
                <span style={{ fontWeight: 500, fontSize: '0.95rem' }}>{TIER_LABEL[tier]}</span>
                <p style={{ marginTop: '0.4rem', color: 'var(--text-muted, #9A8E83)', fontSize: '0.8rem', lineHeight: 1.5 }}>
                  {TIER_DESC[tier]}
                </p>
              </label>
            );
          })}
        </div>
      </fieldset>

      {/* Section B: Finding decisions */}
      <fieldset style={section.fieldset}>
        <legend style={section.legend}>2. Findings — fix, skip, or discuss?</legend>
        {sortedFindings.length === 0 ? (
          <p style={{ color: 'var(--text-muted, #9A8E83)', fontSize: '0.85rem' }}>
            No findings to triage.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
            {sortedFindings.map(f => {
              const current = state.findingDecisions[f.id] ?? 'discuss';
              return (
                <div
                  key={f.id}
                  style={{
                    display: 'flex',
                    gap: '0.75rem',
                    alignItems: 'center',
                    padding: '0.75rem 1rem',
                    background: 'var(--bg-surface, #271E18)',
                    border: '1px solid var(--border, #443828)',
                    borderRadius: '0.5rem',
                  }}
                >
                  <span style={priorityPill(f.priority)}>{PRIORITY_LABEL[f.priority]}</span>
                  <span
                    style={{
                      flex: 1,
                      minWidth: 0,
                      fontSize: '0.9rem',
                      color: 'var(--text-body, #BFB5AA)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                    title={f.title}
                  >
                    {f.title}
                  </span>
                  <div style={{ display: 'flex', gap: '0.25rem' }}>
                    {(['fix', 'skip', 'discuss'] as FindingDecision[]).map(d => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => setDecision(f.id, d)}
                        style={decisionBtn(current === d, d)}
                      >
                        {d === 'fix' ? 'Fix it' : d === 'skip' ? 'Skip it' : 'Discuss'}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
            {findings.length > MAX_FINDINGS && (
              <p style={{ color: 'var(--text-muted, #9A8E83)', fontSize: '0.75rem', marginTop: '0.25rem' }}>
                Showing top {MAX_FINDINGS} findings. {/* TODO(roadmap): expose paging once we know what clients want. */}
              </p>
            )}
          </div>
        )}
      </fieldset>

      {/* Section C: Page wants */}
      <fieldset style={section.fieldset}>
        <legend style={section.legend}>3. Pages — what would you want different?</legend>
        {visiblePages.length === 0 ? (
          <p style={{ color: 'var(--text-muted, #9A8E83)', fontSize: '0.85rem' }}>
            No pages crawled yet.
          </p>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {visiblePages.map(p => (
              <label key={p.slug} style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-body, #BFB5AA)' }}>
                  <strong>{p.title || p.slug}</strong>
                  <span style={{ color: 'var(--text-muted, #9A8E83)', marginLeft: '0.5rem', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem' }}>
                    {p.url}
                  </span>
                </span>
                <textarea
                  value={state.pageWants[p.slug] ?? ''}
                  onChange={e => setPageWant(p.slug, e.target.value)}
                  maxLength={MAX_PAGE_WANTS_LEN}
                  rows={3}
                  placeholder="What do you want this page to do better?"
                  style={textarea.base}
                />
              </label>
            ))}
          </div>
        )}
      </fieldset>

      {/* Section D: Reference sites */}
      <fieldset style={section.fieldset}>
        <legend style={section.legend}>4. Reference sites you admire</legend>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          {state.referenceSites.length === 0 && (
            <p style={{ color: 'var(--text-muted, #9A8E83)', fontSize: '0.85rem' }}>
              Add a few URLs you'd like us to draw inspiration from.
            </p>
          )}
          {state.referenceSites.map((url, i) => (
            <div key={i} style={{ display: 'flex', gap: '0.5rem' }}>
              <input
                type="url"
                value={url}
                onChange={e => setReferenceSite(i, e.target.value)}
                onBlur={e => {
                  const v = e.target.value.trim();
                  if (v.length === 0) return;
                  try {
                    // eslint-disable-next-line no-new
                    new URL(v);
                  } catch {
                    setToast({ kind: 'error', msg: `Not a valid URL: ${v}` });
                  }
                }}
                placeholder="https://example.com"
                style={{ ...textarea.base, flex: 1 }}
              />
              <button
                type="button"
                onClick={() => removeReferenceSite(i)}
                style={{ ...btn.ghost, padding: '0.4rem 0.75rem' }}
              >
                Remove
              </button>
            </div>
          ))}
          <div>
            <button
              type="button"
              onClick={addReferenceSite}
              disabled={state.referenceSites.length >= 20}
              style={btn.ghost}
            >
              + Add another
            </button>
          </div>
        </div>
      </fieldset>

      {/* Submit */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
        <button type="button" onClick={submit} disabled={busy} style={btn.primary}>
          {busy ? 'Saving…' : state.submittedAt ? 'Update intake' : 'Submit intake'}
        </button>
        {state.submittedAt && (
          <span style={{ color: 'var(--text-muted, #9A8E83)', fontSize: '0.8rem' }}>
            Last submitted {new Date(state.submittedAt).toLocaleString()}
          </span>
        )}
        {toast && (
          <span
            style={{
              fontSize: '0.85rem',
              color: toast.kind === 'success' ? 'var(--accent, #F1551A)' : '#E26A6A',
            }}
            role="status"
          >
            {toast.msg}
          </span>
        )}
      </div>
    </div>
  );
}

const section = {
  h2: {
    margin: 0,
    fontSize: '1.4rem',
    color: 'var(--text-strong, #F1EAE4)',
  } as React.CSSProperties,
  lede: {
    marginTop: '0.5rem',
    color: 'var(--text-muted, #9A8E83)',
    fontSize: '0.9rem',
    lineHeight: 1.55,
    maxWidth: '60ch',
  } as React.CSSProperties,
  fieldset: {
    border: '1px solid var(--border, #443828)',
    borderRadius: '0.5rem',
    padding: '1.25rem 1.5rem',
    background: 'var(--bg-elevated, #1A1412)',
    margin: 0,
  } as React.CSSProperties,
  legend: {
    padding: '0 0.5rem',
    fontFamily: "'Degular Display', sans-serif",
    fontSize: '0.8rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: 'var(--text-muted, #9A8E83)',
  } as React.CSSProperties,
};

const card = {
  base: {
    display: 'block',
    padding: '1rem',
    border: '1px solid var(--border, #443828)',
    borderRadius: '0.5rem',
    background: 'var(--bg-surface, #271E18)',
    transition: 'border-color 150ms ease-out, background 150ms ease-out',
  } as React.CSSProperties,
  selected: {
    borderColor: 'var(--accent, #F1551A)',
    background: 'rgba(241,85,26,0.08)',
  } as React.CSSProperties,
};

function priorityPill(p: 'p0' | 'p1' | 'p2'): React.CSSProperties {
  const base: React.CSSProperties = {
    flexShrink: 0,
    padding: '0.15em 0.55em',
    borderRadius: '999px',
    border: '1px solid',
    fontFamily: "'Degular Display', sans-serif",
    fontWeight: 500,
    fontSize: '0.7rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
  };
  if (p === 'p0') {
    return {
      ...base,
      background: 'rgba(241,85,26,0.10)',
      color: 'var(--accent, #F1551A)',
      borderColor: 'rgba(241,85,26,0.30)',
    };
  }
  return {
    ...base,
    background: 'transparent',
    color: 'var(--text-muted, #9A8E83)',
    borderColor: 'var(--border, #443828)',
  };
}

function decisionBtn(active: boolean, kind: FindingDecision): React.CSSProperties {
  const accentActive = kind === 'fix';
  return {
    padding: '0.3em 0.75em',
    borderRadius: '999px',
    border: '1px solid',
    cursor: 'pointer',
    fontFamily: "'Degular Display', sans-serif",
    fontWeight: 500,
    fontSize: '0.75rem',
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    background: active
      ? accentActive
        ? 'rgba(241,85,26,0.12)'
        : 'var(--bg-elevated, #1A1412)'
      : 'transparent',
    color: active
      ? accentActive
        ? 'var(--accent, #F1551A)'
        : 'var(--text-strong, #F1EAE4)'
      : 'var(--text-muted, #9A8E83)',
    borderColor: active
      ? accentActive
        ? 'rgba(241,85,26,0.40)'
        : 'var(--text-body, #BFB5AA)'
      : 'var(--border, #443828)',
    transition: 'all 150ms ease-out',
  };
}

const textarea = {
  base: {
    width: '100%',
    background: 'var(--bg-surface, #271E18)',
    border: '1px solid var(--border, #443828)',
    borderRadius: '0.4rem',
    color: 'var(--text-strong, #F1EAE4)',
    fontFamily: 'inherit',
    fontSize: '0.9rem',
    padding: '0.5rem 0.75rem',
    lineHeight: 1.5,
    resize: 'vertical',
  } as React.CSSProperties,
};

const btn = {
  primary: {
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
    transition: 'background 150ms ease-out',
  } as React.CSSProperties,
  ghost: {
    padding: '0.4rem 0.85rem',
    background: 'transparent',
    color: 'var(--text-muted, #9A8E83)',
    border: '1px solid var(--border, #443828)',
    borderRadius: '0.35rem',
    fontFamily: "'Degular Display', sans-serif",
    fontSize: '0.75rem',
    fontWeight: 500,
    letterSpacing: '0.04em',
    textTransform: 'uppercase',
    cursor: 'pointer',
  } as React.CSSProperties,
};
