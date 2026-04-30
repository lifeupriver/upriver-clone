// F06 monitor — snapshot + delta computation. Reused by F07 followup which
// produces a deeper version of the same diff.

import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

import type { AuditPassResult } from '@upriver/core';

export interface MonitorSnapshot {
  slug: string;
  generated_at: string;
  baseline_label: 'qa' | 'previous' | 'original';
  pass_scores: Record<string, number>;
  overall_score: number;
  p0_count: number;
  p1_count: number;
  p2_count: number;
  schema_valid_pages: number;
  schema_total_pages: number;
  broken_link_count: number;
  total_pages: number;
}

export interface MonitorDelta {
  current: MonitorSnapshot;
  previous: MonitorSnapshot | null;
  /** Per-pass score delta. Positive = improvement. */
  pass_score_deltas: Record<string, number>;
  overall_delta: number;
  p0_delta: number;
  status: 'improving' | 'stable' | 'needs-attention';
  /** Top three changes the operator/client should know about. */
  callouts: string[];
}

export function buildSnapshotFromAuditDir(
  slug: string,
  auditDir: string,
  baselineLabel: 'qa' | 'previous' | 'original',
): MonitorSnapshot {
  const passScores: Record<string, number> = {};
  let totalScore = 0;
  let scoreCount = 0;
  let p0 = 0;
  let p1 = 0;
  let p2 = 0;

  if (existsSync(auditDir)) {
    for (const file of readdirSync(auditDir)) {
      if (!file.endsWith('.json') || file === 'summary.json') continue;
      try {
        const result = JSON.parse(readFileSync(join(auditDir, file), 'utf8')) as AuditPassResult;
        // Skip files that aren't AuditPassResults (e.g. media-inventory.json
        // is metadata, not a pass).
        if (typeof result.dimension !== 'string' || typeof result.score !== 'number' || !Array.isArray(result.findings)) {
          continue;
        }
        passScores[result.dimension] = result.score;
        totalScore += result.score;
        scoreCount += 1;
        for (const f of result.findings) {
          if (f.priority === 'p0') p0 += 1;
          else if (f.priority === 'p1') p1 += 1;
          else p2 += 1;
        }
      } catch {
        // skip
      }
    }
  }

  const overall = scoreCount > 0 ? Math.round(totalScore / scoreCount) : 0;
  return {
    slug,
    generated_at: new Date().toISOString(),
    baseline_label: baselineLabel,
    pass_scores: passScores,
    overall_score: overall,
    p0_count: p0,
    p1_count: p1,
    p2_count: p2,
    schema_valid_pages: 0,
    schema_total_pages: 0,
    broken_link_count: 0,
    total_pages: 0,
  };
}

export function computeDelta(current: MonitorSnapshot, previous: MonitorSnapshot | null): MonitorDelta {
  const passScoreDeltas: Record<string, number> = {};
  if (previous) {
    for (const [dim, score] of Object.entries(current.pass_scores)) {
      const prev = previous.pass_scores[dim];
      if (typeof prev === 'number') passScoreDeltas[dim] = score - prev;
    }
  }
  const overallDelta = previous ? current.overall_score - previous.overall_score : 0;
  const p0Delta = previous ? current.p0_count - previous.p0_count : 0;

  let status: MonitorDelta['status'] = 'stable';
  if (overallDelta >= 5 || p0Delta < -1) status = 'improving';
  else if (overallDelta <= -5 || p0Delta >= 2 || current.p0_count >= 5) status = 'needs-attention';

  const callouts = buildCallouts(current, previous, passScoreDeltas);

  return {
    current,
    previous,
    pass_score_deltas: passScoreDeltas,
    overall_delta: overallDelta,
    p0_delta: p0Delta,
    status,
    callouts,
  };
}

function buildCallouts(
  current: MonitorSnapshot,
  previous: MonitorSnapshot | null,
  deltas: Record<string, number>,
): string[] {
  const out: string[] = [];
  if (!previous) {
    out.push(`First run, no prior baseline. Overall score is ${current.overall_score}/100 across ${Object.keys(current.pass_scores).length} dimensions.`);
    if (current.p0_count > 0) out.push(`${current.p0_count} priority-0 finding${current.p0_count === 1 ? '' : 's'} need attention.`);
    return out.slice(0, 3);
  }
  const sorted = [...Object.entries(deltas)].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  for (const [dim, d] of sorted) {
    if (Math.abs(d) < 3) continue;
    if (d > 0) out.push(`${dim} score improved by ${d} points since the last run.`);
    else out.push(`${dim} score dropped by ${Math.abs(d)} points since the last run.`);
    if (out.length >= 3) break;
  }
  if (out.length < 3) {
    if (current.p0_count === 0 && previous.p0_count > 0) out.push('All priority-0 findings have been resolved since the last run.');
    if (current.p0_count > previous.p0_count) out.push(`${current.p0_count - previous.p0_count} new priority-0 finding(s) appeared this week.`);
  }
  return out.slice(0, 3);
}

/** Find the most recent monitor snapshot strictly older than `now`. */
export function findPreviousSnapshot(monitoringDir: string, currentDate: string): MonitorSnapshot | null {
  if (!existsSync(monitoringDir)) return null;
  const files = readdirSync(monitoringDir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f) && !f.startsWith(currentDate))
    .map((f) => ({ name: f, mtime: statSync(join(monitoringDir, f)).mtimeMs }))
    .sort((a, b) => b.mtime - a.mtime);
  const latest = files[0];
  if (!latest) return null;
  try {
    return JSON.parse(readFileSync(join(monitoringDir, latest.name), 'utf8')) as MonitorSnapshot;
  } catch {
    return null;
  }
}

/** Build the rolling history for the trend chart, oldest first. */
export function buildTrend(
  monitoringDir: string,
): Array<{ date: string; overall_score: number }> {
  if (!existsSync(monitoringDir)) return [];
  const files = readdirSync(monitoringDir)
    .filter((f) => /^\d{4}-\d{2}-\d{2}\.json$/.test(f))
    .sort();
  const out: Array<{ date: string; overall_score: number }> = [];
  for (const f of files) {
    try {
      const snap = JSON.parse(readFileSync(join(monitoringDir, f), 'utf8')) as MonitorSnapshot;
      out.push({ date: f.slice(0, 10), overall_score: snap.overall_score });
    } catch {
      // skip
    }
  }
  return out;
}
