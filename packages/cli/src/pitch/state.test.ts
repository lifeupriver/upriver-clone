import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  createPitchState,
  transition,
  recordStep,
  readPitchState,
  writePitchState,
  PITCH_STATE_VERSION,
  type PitchState,
} from './state.js';

describe('pitch state machine', () => {
  it('creates a v1 draft state', () => {
    const s = createPitchState('wildflourbakery', 'https://wildflourbakery.com');
    assert.equal(s.v, PITCH_STATE_VERSION);
    assert.equal(s.status, 'draft');
    assert.equal(s.slug, 'wildflourbakery');
    assert.ok(s.createdAt);
  });

  it('allows the legal transitions', () => {
    const legal: Array<[PitchState['status'], PitchState['status']]> = [
      ['draft', 'approved'],
      ['draft', 'sent'],
      ['draft', 'fidelity-fail'],
      ['draft', 'over-budget'],
      ['draft', 'revoked'],
      ['fidelity-fail', 'draft'],
      ['over-budget', 'draft'],
      ['approved', 'sent'],
      ['approved', 'revoked'],
      ['sent', 'revoked'],
      ['revoked', 'draft'],
    ];
    for (const [from, to] of legal) {
      const s = { ...createPitchState('x', 'https://x.com'), status: from };
      assert.equal(transition(s, to).status, to, `${from} -> ${to}`);
    }
  });

  it('rejects illegal transitions with a clean error', () => {
    const illegal: Array<[PitchState['status'], PitchState['status']]> = [
      ['sent', 'draft'],
      ['sent', 'approved'],
      ['fidelity-fail', 'sent'],
      ['fidelity-fail', 'approved'],
      ['over-budget', 'sent'],
      ['revoked', 'sent'],
      ['revoked', 'approved'],
    ];
    for (const [from, to] of illegal) {
      const s = { ...createPitchState('x', 'https://x.com'), status: from };
      assert.throws(() => transition(s, to), /transition/i, `${from} -> ${to}`);
    }
  });

  it('transition does not mutate the input and bumps updatedAt', () => {
    const s = createPitchState('x', 'https://x.com');
    const before = s.updatedAt;
    const out = transition(s, 'approved');
    assert.equal(s.status, 'draft');
    assert.notEqual(out, s);
    assert.ok(out.updatedAt >= before);
  });

  it('records steps with outcome and timestamp', () => {
    let s = createPitchState('x', 'https://x.com');
    s = recordStep(s, 'scrape', true);
    s = recordStep(s, 'clone', false, 'no file produced');
    assert.equal(s.steps.scrape?.ok, true);
    assert.equal(s.steps.clone?.ok, false);
    assert.match(s.steps.clone?.note ?? '', /no file/);
  });

  it('round-trips through disk and validates the version', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pitch-state-'));
    try {
      const s = recordStep(createPitchState('x', 'https://x.com'), 'init', true);
      writePitchState(dir, s);
      const back = readPitchState(dir);
      assert.deepEqual(back, s);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('refuses to read an unknown state version', () => {
    const dir = mkdtempSync(join(tmpdir(), 'pitch-state-'));
    try {
      const s = createPitchState('x', 'https://x.com');
      writePitchState(dir, { ...s, v: 99 as never });
      assert.throws(() => readPitchState(dir), /version/i);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });

  it('never serializes a plaintext token (no token-named keys anywhere)', () => {
    let s = createPitchState('x', 'https://x.com');
    s = recordStep(s, 'share', true, 'minted');
    const keys: string[] = [];
    JSON.stringify(s, (k, v) => {
      keys.push(k.toLowerCase());
      return v;
    });
    assert.ok(!keys.some((k) => k.includes('token')), 'state must hold token refs, never tokens');
  });
});
