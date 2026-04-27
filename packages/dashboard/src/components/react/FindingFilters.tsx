import React, { useState } from 'react';

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

export function FindingFilters({ findings }: Props) {
  const [priority, setPriority] = useState<Priority>('all');
  const [effort,   setEffort]   = useState<Effort>('all');
  const [dimension, setDimension] = useState('all');

  const dimensions = ['all', ...Array.from(new Set(findings.map(f => f.dimension))).sort()];

  const filtered = findings.filter(f => {
    if (priority !== 'all'  && f.priority  !== priority)  return false;
    if (effort   !== 'all'  && f.effort    !== effort)    return false;
    if (dimension !== 'all' && f.dimension !== dimension) return false;
    return true;
  });

  const count = (key: string, type: 'priority' | 'effort' | 'dimension') =>
    findings.filter(f => {
      if (type === 'priority')  return f.priority  === key;
      if (type === 'effort')    return f.effort    === key;
      if (type === 'dimension') return f.dimension === key;
      return true;
    }).length;

  return (
    <div>
      {/* Filter controls */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem' }}>
        {/* Priority */}
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          {(['all', 'p0', 'p1', 'p2'] as Priority[]).map(p => (
            <button
              key={p}
              onClick={() => setPriority(p)}
              style={{
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
                background: priority === p ? 'rgba(241,85,26,0.10)' : 'transparent',
                color: priority === p ? '#F1551A' : '#9A8E83',
                borderColor: priority === p ? 'rgba(241,85,26,0.30)' : '#443828',
              }}
            >
              {p === 'all' ? 'All' : PRIORITY_LABEL[p]}
              {p !== 'all' && (
                <span style={{ marginLeft: '0.3em', opacity: 0.7 }}>
                  {count(p, 'priority')}
                </span>
              )}
            </button>
          ))}
        </div>

        <div style={{ width: 1, background: '#443828', margin: '0 0.25rem' }} />

        {/* Effort */}
        <div style={{ display: 'flex', gap: '0.375rem', alignItems: 'center' }}>
          {(['all', 'light', 'medium', 'heavy'] as Effort[]).map(e => (
            <button
              key={e}
              onClick={() => setEffort(e)}
              style={{
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
                background: effort === e ? 'var(--bg-surface, #271E18)' : 'transparent',
                color: effort === e ? '#F1EAE4' : '#9A8E83',
                borderColor: effort === e ? '#4D4038' : '#443828',
              }}
            >
              {e === 'all' ? 'All Effort' : EFFORT_LABEL[e]}
            </button>
          ))}
        </div>

        <div style={{ width: 1, background: '#443828', margin: '0 0.25rem' }} />

        {/* Dimension */}
        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', alignItems: 'center' }}>
          {dimensions.map(d => (
            <button
              key={d}
              onClick={() => setDimension(d)}
              style={{
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
                background: dimension === d ? 'var(--bg-surface, #271E18)' : 'transparent',
                color: dimension === d ? '#F1EAE4' : '#9A8E83',
                borderColor: dimension === d ? '#4D4038' : '#443828',
              }}
            >
              {d === 'all' ? 'All Dims' : d}
            </button>
          ))}
        </div>
      </div>

      {/* Result count */}
      <p style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: '0.75rem',
        color: '#9A8E83',
        marginBottom: '1rem',
      }}>
        {filtered.length} finding{filtered.length !== 1 ? 's' : ''}
        {filtered.length !== findings.length && ` (of ${findings.length})`}
      </p>

      {/* Findings list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {filtered.map(f => (
          <FindingRow key={f.id} finding={f} />
        ))}
        {filtered.length === 0 && (
          <p style={{ color: '#9A8E83', fontSize: '0.875rem' }}>No findings match the current filters.</p>
        )}
      </div>
    </div>
  );
}

function FindingRow({ finding }: { finding: Finding }) {
  const [open, setOpen] = useState(false);

  const prioStyle: React.CSSProperties = finding.priority === 'p0'
    ? { background: 'rgba(241,85,26,0.10)', color: '#F1551A', borderColor: 'rgba(241,85,26,0.20)' }
    : { background: 'transparent', color: '#9A8E83', borderColor: '#443828' };

  return (
    <div style={{
      background: '#271E18',
      border: '1px solid #443828',
      borderRadius: '0.5rem',
      padding: '1rem 1.25rem',
      transition: 'border-color 200ms ease-out, box-shadow 200ms ease-out',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '0.375rem', flexShrink: 0, marginTop: '0.2rem' }}>
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
            background: 'transparent',
          }}>
            {finding.effort}
          </span>
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <button
            onClick={() => setOpen(v => !v)}
            style={{
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textAlign: 'left',
              width: '100%',
            }}
          >
            <h3 style={{
              fontFamily: "'Degular Display', sans-serif",
              fontWeight: 500,
              fontSize: '1.0625rem',
              color: '#F1EAE4',
              letterSpacing: '-0.01em',
              margin: 0,
              lineHeight: 1.3,
            }}>
              {finding.title}
            </h3>
          </button>

          {!open && (
            <p style={{
              color: '#9A8E83',
              fontSize: '0.875rem',
              marginTop: '0.375rem',
              lineHeight: 1.5,
              overflow: 'hidden',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
            }}>
              {finding.description}
            </p>
          )}

          {open && (
            <div style={{ marginTop: '0.75rem', display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
              <p style={{ color: '#BFB5AA', fontSize: '0.875rem', lineHeight: 1.65 }}>{finding.description}</p>
              {finding.why_it_matters && (
                <p style={{ color: '#9A8E83', fontSize: '0.875rem', fontStyle: 'italic' }}>{finding.why_it_matters}</p>
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

        <button
          onClick={() => setOpen(v => !v)}
          style={{
            background: 'none',
            border: 'none',
            color: '#9A8E83',
            cursor: 'pointer',
            padding: '0.25rem',
            flexShrink: 0,
            fontSize: '1rem',
            lineHeight: 1,
          }}
          aria-label={open ? 'Collapse' : 'Expand'}
        >
          {open ? '−' : '+'}
        </button>
      </div>
    </div>
  );
}
