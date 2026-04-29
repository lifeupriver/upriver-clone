import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { PIPELINE_STAGES, type PipelineStageId } from '@upriver/core/pipeline';

import { getClientsBase } from './fs-reader.js';

/**
 * Re-export the canonical stage list and id type from @upriver/core/pipeline.
 * The dashboard server uses these for stage detection; the React island
 * (`components/react/PipelineStages.tsx`) imports the same canonical source
 * directly. Single source of truth.
 *
 * `PipelineStage` is kept as an alias of `PipelineStageId` for backwards
 * compatibility with existing astro components that destructure it.
 */
export type PipelineStage = PipelineStageId;

export { PIPELINE_STAGES };

/**
 * Infer the current pipeline stage for a slug from the artifacts on disk.
 * Walks back from the latest possible stage so e.g. an existing audit doesn't
 * mask a fresh `fixes-plan.md`. Returns `'init'` when nothing has run yet.
 *
 * Server-only — uses node:fs.
 */
export function detectStage(slug: string): PipelineStage {
  const base = join(getClientsBase(), slug);
  const has = (path: string) => existsSync(join(base, path));

  if (has('launch-checklist.md')) return 'launch';
  if (has('qa-report.md')) return 'qa';
  if (has('fixes-plan.md')) return 'fixes-plan';
  if (has('repo/package.json')) return 'clone';
  if (has('repo')) return 'scaffold';
  if (has('claude-design-brief.md')) return 'design-brief';
  if (has('audit-package.json')) return 'synthesize';
  if (has('audit/summary.json')) return 'audit';
  if (has('pages')) return 'scrape';
  if (has('site-map.json')) return 'discover';
  return 'init';
}

export function stageIndex(stage: PipelineStage): number {
  return PIPELINE_STAGES.findIndex((s) => s.id === stage);
}

export function isStageComplete(current: PipelineStage, check: PipelineStage): boolean {
  return stageIndex(current) > stageIndex(check);
}

export function isStageActive(current: PipelineStage, check: PipelineStage): boolean {
  return current === check;
}
