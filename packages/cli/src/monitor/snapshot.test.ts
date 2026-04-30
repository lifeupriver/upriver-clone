import { strict as assert } from 'node:assert';
import { describe, it } from 'node:test';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

import { buildSnapshotFromAuditDir, computeDelta } from './snapshot.js';

function tmpAuditDir(): string {
  const dir = mkdtempSync(join(tmpdir(), 'monitor-test-'));
  mkdirSync(dir, { recursive: true });
  return dir;
}

function writePass(dir: string, dimension: string, score: number, p0: number, p1: number): void {
  const findings = [
    ...Array.from({ length: p0 }, (_, i) => ({
      id: `${dimension}-p0-${i}`,
      dimension,
      priority: 'p0',
      effort: 'medium',
      title: 't',
      description: 'd',
      why_it_matters: 'w',
      recommendation: 'r',
    })),
    ...Array.from({ length: p1 }, (_, i) => ({
      id: `${dimension}-p1-${i}`,
      dimension,
      priority: 'p1',
      effort: 'light',
      title: 't',
      description: 'd',
      why_it_matters: 'w',
      recommendation: 'r',
    })),
  ];
  writeFileSync(join(dir, `${dimension}.json`), JSON.stringify({ dimension, score, summary: '', findings, completed_at: new Date().toISOString() }));
}

describe('monitor snapshot + delta', () => {
  it('builds a snapshot from an audit directory', () => {
    const dir = tmpAuditDir();
    writePass(dir, 'seo', 80, 1, 2);
    writePass(dir, 'content', 60, 0, 3);
    const snap = buildSnapshotFromAuditDir('test', dir, 'qa');
    assert.equal(snap.pass_scores['seo'], 80);
    assert.equal(snap.pass_scores['content'], 60);
    assert.equal(snap.overall_score, 70);
    assert.equal(snap.p0_count, 1);
    assert.equal(snap.p1_count, 5);
  });

  it('marks status as improving when overall score climbs >=5', () => {
    const dir1 = tmpAuditDir();
    writePass(dir1, 'seo', 60, 0, 0);
    const prev = buildSnapshotFromAuditDir('test', dir1, 'qa');
    const dir2 = tmpAuditDir();
    writePass(dir2, 'seo', 70, 0, 0);
    const cur = buildSnapshotFromAuditDir('test', dir2, 'qa');
    const delta = computeDelta(cur, prev);
    assert.equal(delta.status, 'improving');
    assert.equal(delta.overall_delta, 10);
  });

  it('marks status as needs-attention when overall drops >=5', () => {
    const dir1 = tmpAuditDir();
    writePass(dir1, 'seo', 80, 0, 0);
    const prev = buildSnapshotFromAuditDir('test', dir1, 'qa');
    const dir2 = tmpAuditDir();
    writePass(dir2, 'seo', 70, 0, 0);
    const cur = buildSnapshotFromAuditDir('test', dir2, 'qa');
    const delta = computeDelta(cur, prev);
    assert.equal(delta.status, 'needs-attention');
  });

  it('produces a first-run callout when there is no previous snapshot', () => {
    const dir = tmpAuditDir();
    writePass(dir, 'seo', 75, 2, 0);
    const cur = buildSnapshotFromAuditDir('test', dir, 'qa');
    const delta = computeDelta(cur, null);
    assert.ok(delta.callouts.length >= 1);
    assert.match(delta.callouts.join(' '), /First run/);
  });
});
