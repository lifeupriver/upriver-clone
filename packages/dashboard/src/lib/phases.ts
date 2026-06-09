/**
 * Phase model for the operator client view.
 *
 * The pipeline has ~25 fine-grained stages (`@upriver/core/pipeline`). Showing
 * all of them flat is the overwhelm problem the dashboard redesign exists to
 * fix. This module groups them into four human-legible phases —
 * Intake → Audit → Build → Launch — that the client overview spine and the
 * manual stage runner (`components/react/PipelineStages.tsx`) both render from,
 * so there is a single source of truth for "which stage lives in which phase."
 *
 * Pure: only a type import from core. Safe to bundle into the React island.
 */
import type { PipelineStageId } from '@upriver/core/pipeline';

export type PhaseKey = 'intake' | 'audit' | 'build' | 'launch';

export interface PhaseDef {
  key: PhaseKey;
  label: string;
  /** One short line describing what this phase accomplishes. */
  blurb: string;
  /**
   * Website-pipeline stage ids that belong to this phase, in run order. Used to
   * group the manual stage runner. `intake` has no runnable website stages —
   * intake/generation run via separate commands — so its list is empty.
   */
  stageIds: PipelineStageId[];
}

export const PHASES: readonly PhaseDef[] = [
  {
    key: 'intake',
    label: 'Intake',
    blurb: 'Capture what the business is and who it serves.',
    stageIds: [],
  },
  {
    key: 'audit',
    label: 'Audit',
    blurb: 'Crawl the live site and score every dimension.',
    stageIds: [
      'init', 'discover', 'scrape', 'audit', 'audit-media', 'gap-analysis',
      'video-audit', 'synthesize', 'voice-extract', 'blog-topics', 'schema-build',
    ],
  },
  {
    key: 'build',
    label: 'Build',
    blurb: 'Rebuild the site from the brief and verify fidelity.',
    stageIds: [
      'design-brief', 'scaffold', 'clone', 'finalize', 'clone-fidelity',
      'fixes-plan', 'qa', 'improve',
    ],
  },
  {
    key: 'launch',
    label: 'Launch',
    blurb: 'Ship the new site and keep it healthy.',
    stageIds: [
      'launch', 'prototype-app', 'custom-tools', 'monitor', 'followup', 'admin-deploy',
    ],
  },
] as const;

export const PHASE_ORDER: readonly PhaseKey[] = PHASES.map((p) => p.key);

const STAGE_TO_PHASE: Record<string, PhaseKey> = (() => {
  const m: Record<string, PhaseKey> = {};
  for (const phase of PHASES) {
    for (const id of phase.stageIds) m[id] = phase.key;
  }
  return m;
})();

/** Which phase a given pipeline stage belongs to. Unknown ids fall back to audit. */
export function phaseOfStage(id: PipelineStageId): PhaseKey {
  return STAGE_TO_PHASE[id] ?? 'audit';
}

export function phaseIndex(key: PhaseKey): number {
  return PHASE_ORDER.indexOf(key);
}
