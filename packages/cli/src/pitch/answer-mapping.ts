// The answer→profile bridge (Spec 19 §7): map prospect questionnaire answers
// onto profile candidate fields, applied by `pitch convert`. Goes through
// the same `mergeCandidate` arbiter as recon — source `interview` (precedence
// above recon, below transcript/operator), so a verified or higher-provenance
// value is NEVER overwritten; it queues a conflict instead.

import {
  conflictEntry,
  mergeCandidate,
  nearestEnvelope,
  type Candidate,
  type ClientProfile,
  type ConflictEntry,
} from '@upriver/schemas';
import { structurallyValid } from '../recon/merge-candidates.js';

/**
 * Question id (see interview-guide.ts — ids derive from section titles) →
 * profile dot-path. Only 1:1, free-text→string fields belong here; compound
 * answers (name+role) and sales signals (reaction, frustrations) stay in
 * interview-responses.json for the human.
 */
export const ANSWER_FIELD_MAP: Record<string, string> = {
  'about-you-q2': 'identity.publicName',
  'about-you-q3': 'identity.email',
  'about-you-q4': 'identity.phone',
  'your-goals-q1': 'goals.primaryOutcome',
  'your-goals-q2': 'goals.urgencyTimeline',
};

export interface AnswerOutcome {
  id: string;
  path: string;
  kind: 'filled' | 'skipped' | 'conflicted';
}

export interface ApplyAnswersResult {
  profile: ClientProfile;
  outcomes: AnswerOutcome[];
  conflicts: ConflictEntry[];
}

type Obj = Record<string, unknown>;

function setAtPath(root: Obj, path: string, value: unknown): void {
  const segs = path.split('.');
  let cur: Obj = root;
  for (let i = 0; i < segs.length - 1; i++) {
    const seg = segs[i] as string;
    const next = cur[seg];
    if (next === null || typeof next !== 'object' || Array.isArray(next)) cur[seg] = {};
    cur = cur[seg] as Obj;
  }
  cur[segs[segs.length - 1] as string] = value;
}

/**
 * Apply mapped questionnaire answers to a profile. Pure — `now` injected,
 * input profile untouched. Unmapped ids and blank answers are ignored
 * silently (they are not errors; most questions are for the human).
 */
export function applyProspectAnswers(
  existing: ClientProfile,
  answers: Record<string, string | undefined>,
  now: string,
): ApplyAnswersResult {
  const profile = structuredClone(existing);
  const root = profile as unknown as Obj;
  const outcomes: AnswerOutcome[] = [];
  const conflicts: ConflictEntry[] = [];

  for (const [id, path] of Object.entries(ANSWER_FIELD_MAP)) {
    const raw = answers[id];
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (value === '') continue;
    if (!structurallyValid(path, value, now)) continue;

    const candidate: Candidate<unknown> = {
      value,
      source: 'interview',
      evidence: `prospect questionnaire answer ${id}`,
    };
    const existingEnv = nearestEnvelope(root, path);
    const wasEmpty = existingEnv === undefined || existingEnv.value === null;
    const outcome = mergeCandidate(existingEnv, candidate, now);
    if (outcome.kind === 'conflict') {
      conflicts.push(conflictEntry(path, outcome, now));
      outcomes.push({ id, path, kind: 'conflicted' });
      continue;
    }
    setAtPath(root, path, outcome.field);
    const equal = !wasEmpty && JSON.stringify(existingEnv?.value) === JSON.stringify(value);
    outcomes.push({ id, path, kind: equal ? 'skipped' : 'filled' });
  }

  return { profile, outcomes, conflicts };
}
