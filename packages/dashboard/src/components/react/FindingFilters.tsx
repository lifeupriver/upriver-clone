import React, { useEffect, useMemo, useState } from 'react';

interface Finding {
  id: string;
  dimension: string;
  priority: 'p0' | 'p1' | 'p2';
  effort: 'light' | 'medium' | 'heavy';
  title: string;
  description: string;
  why_it_matters: string;
  recommendation: string;
  evidence?: string;
  page?: string;
}

interface Props {
  findings: Finding[];
}

type Priority = 'all' | 'p0' | 'p1' | 'p2';
type Effort   = 'all' | 'light' | 'medium' | 'heavy';

const PRIORITY_LABEL: Record<string, string> = { p0: 'P0', p1: 'P1', p2: 'P2' };
const EFFORT_LABEL: Record<string, string>   = { light: 'Light', medium: 'Medium', heavy: 'Heavy' };

/**
 * Read the dimension preselect from `#findings?dim=…` (the audit page emits a
 * custom URL fragment so a single anchor click scrolls + filters in one shot).
 */
function readDimFromHash(): string | null {
  if (typeof window === 'undefined') return null;
  const m = window.location.hash.match(/^#findings\?dim=(.+)$/);
  return m ? decodeURIComponent(m[1]) : null;
}

export function FindingFilters({ findings }: Props) {
  const [priority, setPriority] = useState<Priority>('all');
  const [effort,   setEffort]   = useState<Effort>('all');
  const [dimension, setDimension] = useState<string>('all');
  const [allOpen, setAllOpen] = useState(false);
  // Bumping `openSeed` forces every `FindingRow` to re-mount with `allOpen` as
  // its initial collapsed state. This keeps the per-row toggle independent of
  // the global control without juggling a Map of ids in parent state.
  const [openSeed, setOpenSeed] = useState(0);

  const dimensions = useMemo(
    () => ['all', ...Array.from(new Set(findings.map((f) => f.dimension))).sort()],
    [findings],
  );

  // First paint: honor `?dim=` on the URL hash.
  useEffect(() => {
    const dim = readDimFromHash();
    if (dim && dimensions.includes(dim)) setDimension(dim);

    function onSetDim(e: Event) {
      const detail = (e as CustomEvent<{ dim: string }>).detail;
      if (detail?.dim && dimensions.includes(detail.dim)) {
        setDimension(detail.dim);
      }
    }
    window.addEventListener('upriver:set-dim', onSetDim as EventListener);
    return () => window.removeEventListener('upriver:set-dim', onSetDim as EventListener);
  }, [dimensions]);

  const filtered = findings.filter((f) => {
    if (priority !== 'all'  && f.priority  !== priority)  return false;
    if (effort   !== 'all'  && f.effort    !== effort)    return false;
    if (dimension !== 'all' && f.dimension !== dimension) return false;
    return true;
  });

  const count = (key: string, type: 'priority' | 'effort' | 'dimension') =>
    findings.filter((f) => {
      if (type === 'priority')  return f.priority  === key;
      if (type === 'effort')    return f.effort    === key;
      if (type === 'dimension') return f.dimension === key;
      return true;
    }).length;

  function toggleAll(open: boolean) {
    setAllOpen(open);
    setOpenSeed((s) => s + 1);
  }

  return (
    <div>
      {/* Filter controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {/* Priority */}
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          {(['all', 'p0', 'p1', 'p2'] as Priority[]).map((p) => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              style={pillButtonStyle(priority === p, p === 'all' ? 'neutral' : 'accent')}
            >
              {p === 'all' ? 'All' : PRIORITY_LABEL[p]}
              {p !== 'all' && (
                <span style={{ marginLeft: '0.3em', opacity: 0.7 }}>{count(p, 'priority')}</span>
              )}
            </button>
          ))}
        </div>

        <div style={{ width: 1, background: '#443828', margin: '0 0.25rem' }} />

        {/* Effort */}
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          {(['all', 'light', 'medium', 'heavy'] as Effort[]).map((e) => (
            <button
              key={e}
              onClick={() => setEffort(e)}
              style={pillButtonStyle(effort === e, 'neutral')}
            >
              {e === 'all' ? 'All Effort' : EFFORT_LABEL[e]}
            </button>
          ))}
        </div>

        <div style={{ width: 1, background: '#443828', margin: '0 0.25rem' }} />

        {/* Dimension */}
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {dimensions.map((d) => (
            <button
              key={d}
              onClick={() => setDimension(d)}
              style={pillButtonStyle(dimension === d, 'neutral')}
            >
              {d === 'all' ? 'All Dims' : d}
            </button>
          ))}
        </div>
      </div>

      {/* Result count + expand/collapse */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem' }}>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: '0.75rem',
          color: '#9A8E83',
          margin: 0,
        }}>
          {filtered.length} finding{filtered.length !== 1 ? 's' : ''}
          {filtered.length !== findings.length && ` (of ${findings.length})`}
        </p>
        <div style={{ display: 'flex', gap: '0.375rem' }}>
          <button onClick={() => toggleAll(true)} style={linkButtonStyle}>
            Expand all
          </button>
          <span style={{ color: '#443828' }}>·</span>
          <button onClick={() => toggleAll(false)} style={linkButtonStyle}>
            Collapse all
          </button>
        </div>
      </div>

      {/* Findings list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {filtered.map((f) => (
          <FindingRow key={`${openSeed}-${f.id}`} finding={f} initialOpen={allOpen} />
        ))}
        {filtered.length === 0 && (
          <p style={{ color: '#9A8E83', fontSize: '0.875rem' }}>No findings match the current filters.</p>
        )}
      </div>
    </div>
  );
}

function pillButtonStyle(active: boolean, kind: 'accent' | 'neutral'): React.CSSProperties {
  const accent = kind === 'accent' && active;
  return {
    padding: '0.25em 0.7em',
    borderRadius: '999px',
    border: '1px solid',
    cursor: 'pointer',
    fontFamily: "'Degular Display', sans-serif",
    fontWeight: 500,
    fontSize: '0.75rem',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    transition: 'all 150ms ease-out',
    background: accent
      ? 'rgba(241,85,26,0.10)'
      : active
      ? 'var(--bg-surface, #271E18)'
      : 'transparent',
    color: accent ? '#F1551A' : active ? '#F1EAE4' : '#9A8E83',
    borderColor: accent
      ? 'rgba(241,85,26,0.30)'
      : active
      ? '#4D4038'
      : '#443828',
  };
}

const linkButtonStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  padding: 0,
  cursor: 'pointer',
  fontFamily: "'Degular Display', sans-serif",
  fontWeight: 500,
  fontSize: '0.75rem',
  letterSpacing: '0.06em',
  textTransform: 'uppercase',
  color: '#F1551A',
};

function FindingRow({ finding, initialOpen }: { finding: Finding; initialOpen: boolean }) {
  const [open, setOpen] = useState(initialOpen);

  const prioStyle: React.CSSProperties =
    finding.priority === 'p0'
      ? { background: 'rgba(241,85,26,0.10)', color: '#F1551A', borderColor: 'rgba(241,85,26,0.20)' }
      : { background: 'transparent', color: '#9A8E83', borderColor: '#443828' };

  return (
    <div style={{
      background: '#271E18',
      border: '1px solid #443828',
      borderRadius: '0.5rem',
      padding: '0.625rem 1rem',
      transition: 'border-color 200ms ease-out, box-shadow 200ms ease-out',
    }}>
      <button
        onClick={() => setOpen((v) => !v)}
        style={{
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: 'pointer',
          textAlign: 'left',
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          gap: '0.625rem',
        }}
        aria-expanded={open}
      >
        <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0 }}>
          <span style={{
            padding: '0.15em 0.55em',
            borderRadius: '999px',
            border: '1px solid',
            fontFamily: "'Degular Display', sans-serif",
            fontWeight: 500,
            fontSize: '0.7rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            ...prioStyle,
          }}>
            {finding.priority.toUpperCase()}
          </span>
          <span style={{
            padding: '0.15em 0.55em',
            borderRadius: '999px',
            border: '1px solid #443828',
            fontFamily: "'Degular Display', sans-serif",
            fontWeight: 500,
            fontSize: '0.7rem',
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
            color: '#9A8E83',
          }}>
            {finding.effort}
          </span>
          <span style={{
            padding: '0.15em 0.55em',
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: '0.7rem',
            color: '#9A8E83',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}>
            {finding.dimension}
          </span>
        </div>

        <h3 style={{
          fontFamily: "'Degular Display', sans-serif",
          fontWeight: 500,
          fontSize: '0.95rem',
          color: '#F1EAE4',
          letterSpacing: '-0.005em',
          margin: 0,
          lineHeight: 1.3,
          flex: 1,
        }}>
          {finding.title}
        </h3>

        <span style={{
          color: '#9A8E83',
          fontSize: '1rem',
          lineHeight: 1,
          flexShrink: 0,
          padding: '0.25rem',
        }} aria-hidden="true">
          {open ? '−' : '+'}
        </span>
      </button>

      {open && (
        <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.625rem', paddingLeft: '0.125rem' }}>
          {finding.description && (
            <p style={{ color: '#BFB5AA', fontSize: '0.875rem', lineHeight: 1.65, margin: 0 }}>
              {finding.description}
            </p>
          )}
          {finding.why_it_matters && (
            <p style={{ color: '#9A8E83', fontSize: '0.875rem', fontStyle: 'italic', margin: 0 }}>
              {finding.why_it_matters}
            </p>
          )}
          {finding.recommendation && (
            <div style={{
              borderLeft: '4px solid #F1551A',
              borderRadius: '0 0.5rem 0.5rem 0',
              background: '#1A1412',
              padding: '0.625rem 1rem',
              fontSize: '0.875rem',
              color: '#BFB5AA',
              lineHeight: 1.6,
            }}>
              <strong style={{ color: '#F1EAE4', fontFamily: "'Degular Display', sans-serif", fontSize: '0.7rem', letterSpacing: '0.06em', textTransform: 'uppercase', display: 'block', marginBottom: '0.3rem' }}>
                Recommendation
              </strong>
              {finding.recommendation}
            </div>
          )}
          {(finding.evidence || finding.page) && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem', paddingTop: '0.5rem', borderTop: '1px solid #443828' }}>
              {finding.page && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: '#9A8E83' }}>Page: {finding.page}</span>}
              {finding.evidence && <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.75rem', color: '#9A8E83' }}>{finding.evidence}</span>}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
