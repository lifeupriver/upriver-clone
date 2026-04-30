import { PIPELINE_STAGES, type PipelineStageId } from '@upriver/core/pipeline';

import { resolveClientDataSource } from './data-source.js';

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
 * Infer the current pipeline stage for a slug from artifacts present in the
 * configured data source. Walks back from the latest possible stage so e.g.
 * an existing audit doesn't mask a fresh `fixes-plan.md`. Returns `'init'`
 * when nothing has run yet.
 */
export async function detectStage(slug: string): Promise<PipelineStage> {
  const ds = resolveClientDataSource();
  // Probe artifacts from latest → earliest. Sequential is fine — most stages
  // bail early in practice.
  if (await ds.fileExists(slug, 'launch-checklist.md')) return 'launch';
  if (await ds.fileExists(slug, 'qa-report.md')) return 'qa';
  if (await ds.fileExists(slug, 'fixes-plan.md')) return 'fixes-plan';
  if (await ds.fileExists(slug, 'repo/package.json')) return 'clone';
  if (await ds.fileExists(slug, 'repo')) return 'scaffold';
  if (await ds.fileExists(slug, 'claude-design-brief.md')) return 'design-brief';
  if (await ds.fileExists(slug, 'voice/voice-rules.json')) return 'voice-extract';
  if (await ds.fileExists(slug, 'audit-package.json')) return 'synthesize';
  if (await ds.fileExists(slug, 'audit/summary.json')) return 'audit';
  if (await ds.fileExists(slug, 'pages')) return 'scrape';
  if (await ds.fileExists(slug, 'site-map.json')) return 'discover';
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
