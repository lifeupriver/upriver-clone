// F06 monitor — one-page email-ready delta report rendering.

import type { MonitorDelta } from './snapshot.js';

interface RenderInputs {
  clientName: string;
  operatorName: string;
  delta: MonitorDelta;
  trend: Array<{ date: string; overall_score: number }>;
  activeP0: Array<{ dimension: string; title: string; status_note: string }>;
  reportPublicUrl?: string;
}

const STATUS_COPY: Record<MonitorDelta['status'], { badge: string; lead: string }> = {
  improving: { badge: 'Improving', lead: 'Numbers are moving in the right direction this week.' },
  stable: { badge: 'Stable', lead: 'Things look steady week over week.' },
  'needs-attention': { badge: 'Needs attention', lead: 'A few items moved the wrong way and are worth a look.' },
};

const STATUS_COLOR: Record<MonitorDelta['status'], string> = {
  improving: '#1f7a4d',
  stable: '#475569',
  'needs-attention': '#a14a1a',
};

/** Inline-SVG sparkline for the trend. Renders in every email client. */
export function renderTrendSvg(points: Array<{ date: string; overall_score: number }>): string {
  if (points.length === 0) {
    return '<svg width="320" height="60" xmlns="http://www.w3.org/2000/svg"><text x="10" y="35" font-family="system-ui,sans-serif" font-size="12" fill="#64748b">No history yet — this is the first run.</text></svg>';
  }
  const w = 320;
  const h = 60;
  const padding = 4;
  const maxScore = Math.max(100, ...points.map((p) => p.overall_score));
  const minScore = Math.min(0, ...points.map((p) => p.overall_score));
  const xStep = points.length > 1 ? (w - padding * 2) / (points.length - 1) : 0;
  const path = points
    .map((p, i) => {
      const x = padding + i * xStep;
      const y = h - padding - ((p.overall_score - minScore) / Math.max(1, maxScore - minScore)) * (h - padding * 2);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
  const last = points[points.length - 1];
  return `<svg width="${w}" height="${h}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${points.length}-week score trend">
  <path d="${path}" fill="none" stroke="#1f7a4d" stroke-width="2"/>
  <text x="${w - padding}" y="${h - padding - 6}" text-anchor="end" font-family="system-ui,sans-serif" font-size="11" fill="#475569">${last?.overall_score ?? ''}</text>
</svg>`;
}

export function renderEmailHtml(inputs: RenderInputs): string {
  const { clientName, operatorName, delta, trend, activeP0, reportPublicUrl } = inputs;
  const status = STATUS_COPY[delta.status];
  const color = STATUS_COLOR[delta.status];
  const escape = (s: string): string =>
    s.replace(/[&<>"]/g, (c) => (c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : '&quot;'));

  const calloutsHtml = delta.callouts.map((c) => `<li>${escape(c)}</li>`).join('');
  const issuesHtml =
    activeP0.length === 0
      ? '<p style="color:#475569">No priority-0 issues outstanding.</p>'
      : `<ul>${activeP0
          .slice(0, 3)
          .map((i) => `<li><strong>${escape(i.title)}</strong> (${escape(i.dimension)}). ${escape(i.status_note)}</li>`)
          .join('')}</ul>`;
  const trendSvg = renderTrendSvg(trend);
  const reportLink = reportPublicUrl
    ? `<p style="margin-top:24px"><a href="${escape(reportPublicUrl)}" style="color:#1f7a4d">View the full report</a>.</p>`
    : '';

  return `<!doctype html>
<html><head><meta charset="utf-8"><title>Upriver site update — ${escape(clientName)}</title></head>
<body style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;max-width:560px;margin:32px auto;padding:0 16px;line-height:1.5">
  <header style="border-bottom:1px solid #e2e8f0;padding-bottom:12px">
    <p style="margin:0;color:#64748b;font-size:13px">${escape(clientName)} — week of ${new Date(delta.current.generated_at).toISOString().slice(0, 10)}</p>
    <h1 style="margin:6px 0 0;font-size:22px">Site update</h1>
    <p style="margin:8px 0 0"><span style="background:${color};color:white;padding:3px 10px;border-radius:14px;font-size:12px;font-weight:600">${status.badge.toUpperCase()}</span></p>
  </header>
  <p style="margin:16px 0 0">${escape(status.lead)}</p>
  <div style="margin:16px 0">${trendSvg}</div>
  <h2 style="font-size:16px;margin:24px 0 6px">What changed this week</h2>
  <ul>${calloutsHtml}</ul>
  <h2 style="font-size:16px;margin:24px 0 6px">Active issues</h2>
  ${issuesHtml}
  <p style="margin-top:32px;color:#475569;font-size:14px">Reply to this email if you want to talk through anything.</p>
  <p style="margin-top:6px;color:#475569;font-size:14px">- ${escape(operatorName)}</p>
  ${reportLink}
</body></html>`;
}

export function renderReportMarkdown(inputs: RenderInputs): string {
  const { clientName, operatorName, delta, activeP0 } = inputs;
  const status = STATUS_COPY[delta.status];
  const lines: string[] = [];
  lines.push(`# Site update: ${clientName}`);
  lines.push('');
  lines.push(`Week of ${new Date(delta.current.generated_at).toISOString().slice(0, 10)}  |  Status: **${status.badge}**`);
  lines.push('');
  lines.push(status.lead);
  lines.push('');
  lines.push('## What changed this week');
  lines.push('');
  for (const c of delta.callouts) lines.push(`- ${c}`);
  lines.push('');
  lines.push('## Active issues');
  lines.push('');
  if (activeP0.length === 0) {
    lines.push('No priority-0 issues outstanding.');
  } else {
    for (const i of activeP0.slice(0, 3)) {
      lines.push(`- **${i.title}** (${i.dimension}). ${i.status_note}`);
    }
  }
  lines.push('');
  lines.push(`Reply to this email if you want to talk through anything.`);
  lines.push('');
  lines.push(`- ${operatorName}`);
  return lines.join('\n');
}
