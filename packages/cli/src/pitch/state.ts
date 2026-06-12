// Pitch run state (Spec 19 §1 step 12). One `state.json` per prospect at
// `clients/<slug>/pitch/state.json`, schema-versioned so future harvest
// sweeps (Spec 18) need no per-run adapters. The state NEVER holds a token —
// plaintext share/interview tokens exist exactly once, at mint; this file
// stores only what `pitch status` needs to render the funnel.

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { SpendLedger } from './ledger.js';
import { emptyLedger } from './ledger.js';

export const PITCH_STATE_VERSION = 1 as const;

export type PitchStatus =
  | 'draft'
  | 'fidelity-fail'
  | 'over-budget'
  | 'approved'
  | 'sent'
  | 'revoked';

export interface PitchStepRecord {
  at: string;
  ok: boolean;
  note?: string;
}

export interface PitchState {
  v: typeof PITCH_STATE_VERSION;
  slug: string;
  url: string;
  status: PitchStatus;
  createdAt: string;
  updatedAt: string;
  steps: Record<string, PitchStepRecord>;
  ledger: SpendLedger;
  /** Share metadata only — expiry for `pitch status`, never the secret. */
  share?: { expiresAt?: string; label?: string };
  sentAt?: string;
}

// Legal transitions. fidelity-fail/over-budget/revoked return to draft via a
// re-run; sent is terminal except takedown (revoked).
const TRANSITIONS: Record<PitchStatus, readonly PitchStatus[]> = {
  draft: ['approved', 'sent', 'fidelity-fail', 'over-budget', 'revoked'],
  'fidelity-fail': ['draft', 'revoked'],
  'over-budget': ['draft', 'revoked'],
  approved: ['sent', 'revoked', 'draft'],
  sent: ['revoked'],
  revoked: ['draft'],
};

export function createPitchState(slug: string, url: string): PitchState {
  const now = new Date().toISOString();
  return {
    v: PITCH_STATE_VERSION,
    slug,
    url,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    steps: {},
    ledger: emptyLedger(),
  };
}

export function transition(state: PitchState, to: PitchStatus): PitchState {
  if (!TRANSITIONS[state.status]?.includes(to)) {
    throw new Error(`Illegal pitch state transition: ${state.status} -> ${to} (${state.slug})`);
  }
  return { ...state, status: to, updatedAt: new Date().toISOString() };
}

export function recordStep(
  state: PitchState,
  step: string,
  ok: boolean,
  note?: string,
): PitchState {
  const rec: PitchStepRecord = { at: new Date().toISOString(), ok, ...(note ? { note } : {}) };
  return {
    ...state,
    steps: { ...state.steps, [step]: rec },
    updatedAt: rec.at,
  };
}

export function pitchStatePath(clientDir: string): string {
  return join(clientDir, 'pitch', 'state.json');
}

export function writePitchState(clientDir: string, state: PitchState): void {
  mkdirSync(join(clientDir, 'pitch'), { recursive: true });
  writeFileSync(pitchStatePath(clientDir), `${JSON.stringify(state, null, 2)}\n`);
}

export function readPitchState(clientDir: string): PitchState {
  const raw = JSON.parse(readFileSync(pitchStatePath(clientDir), 'utf8')) as PitchState;
  if (raw.v !== PITCH_STATE_VERSION) {
    throw new Error(
      `Unsupported pitch state version ${JSON.stringify(raw.v)} (expected ${PITCH_STATE_VERSION})`,
    );
  }
  return raw;
}
