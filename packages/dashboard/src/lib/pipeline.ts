import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { getClientsBase } from './fs-reader.js';

export type PipelineStage =
  | 'init'
  | 'discover'
  | 'scrape'
  | 'audit'
  | 'synthesize'
  | 'design-brief'
  | 'scaffold'
  | 'clone'
  | 'fixes'
  | 'qa'
  | 'launch';

export const PIPELINE_STAGES: { stage: PipelineStage; label: string }[] = [
  { stage: 'init',          label: 'Init' },
  { stage: 'discover',      label: 'Discover' },
  { stage: 'scrape',        label: 'Scrape' },
  { stage: 'audit',         label: 'Audit' },
  { stage: 'synthesize',    label: 'Synthesize' },
  { stage: 'design-brief',  label: 'Design Brief' },
  { stage: 'scaffold',      label: 'Scaffold' },
  { stage: 'clone',         label: 'Clone' },
  { stage: 'fixes',         label: 'Fixes' },
  { stage: 'qa',            label: 'QA' },
  { stage: 'launch',        label: 'Launch' },
];

export function detectStage(slug: string): PipelineStage {
  const base = join(getClientsBase(), slug);
  const has = (path: string) => existsSync(join(base, path));

  if (has('launch-checklist.md')) return 'launch';
  if (has('qa-report.md')) return 'qa';
  if (has('fixes-plan.md')) return 'fixes';
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
  return PIPELINE_STAGES.findIndex(s => s.stage === stage);
}

export function isStageComplete(current: PipelineStage, check: PipelineStage): boolean {
  return stageIndex(current) > stageIndex(check);
}

export function isStageActive(current: PipelineStage, check: PipelineStage): boolean {
  return current === check;
}
