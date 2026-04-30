/**
 * Single source of truth for the upriver pipeline stage list.
 *
 * Imported by:
 *   - `packages/cli/src/commands/run/all.ts` (the CLI orchestrator)
 *   - `packages/dashboard/src/components/react/PipelineStages.tsx` (the GUI run-button island)
 *   - `packages/dashboard/src/lib/pipeline.ts` (server-side stage detection)
 *
 * Pure: no node imports, no IO. Safe to bundle into a client React island.
 *
 * Roadmap: G.7. Created during the post-roadmap drift audit to close the
 * duplication between the CLI orchestrator and the dashboard's static stage
 * list — when a stage was added/renamed before, two places had to change.
 */

/** Stable identifier for a pipeline stage. */
export type PipelineStageId =
  | 'init'
  | 'discover'
  | 'scrape'
  | 'audit'
  | 'audit-media'
  | 'gap-analysis'
  | 'video-audit'
  | 'synthesize'
  | 'voice-extract'
  | 'blog-topics'
  | 'schema-build'
  | 'design-brief'
  | 'scaffold'
  | 'clone'
  | 'finalize'
  | 'clone-fidelity'
  | 'fixes-plan'
  | 'qa'
  | 'improve'
  | 'launch'
  | 'prototype-app'
  | 'custom-tools'
  | 'monitor'
  | 'followup';

/**
 * One stage in the pipeline. The `command` is the slash-allowlist name in
 * `dashboard/src/pages/api/run/[command].ts` — `null` means the stage is not
 * directly invocable from the GUI (init takes a URL not a slug; discover and
 * launch aren't on the API allowlist).
 *
 * `args` (when present) is appended to `<slug>` when invoking the command, so
 * e.g. `clone` runs as `upriver clone <slug> --no-pr`.
 *
 * `optional` stages contribute to the orchestrated pipeline but their failure
 * doesn't abort the run.
 */
export interface PipelineStage {
  id: PipelineStageId;
  label: string;
  command: string | null;
  args?: string[];
  optional?: boolean;
  describe: string;
}

/**
 * The canonical pipeline order. The order encodes the dependency chain: every
 * stage assumes the prior stages' outputs exist on disk. Each command is
 * independently idempotent, so re-running picks up where it left off.
 *
 * Note: `init` is excluded from `run all` argv because it takes a URL not a
 * slug. `qa` is in the list for display but `run all` skips it (covered by
 * `clone-fidelity` and `fixes plan`).
 */
export const PIPELINE_STAGES: readonly PipelineStage[] = [
  { id: 'init', label: 'Init', command: null, describe: 'New client (operator runs by hand — needs a URL)' },
  { id: 'discover', label: 'Discover', command: null, describe: 'Scrape competitors + keyword discovery' },
  { id: 'scrape', label: 'Scrape', command: 'scrape', describe: 'Firecrawl scrape every page' },
  { id: 'audit', label: 'Audit', command: 'audit', describe: 'Run audit passes (--audit-mode threads through on `run all`)' },
  { id: 'audit-media', label: 'Media audit', command: 'audit-media', optional: true, describe: 'F01 — image inventory + replacement shot list (sells the photography upsell)' },
  { id: 'gap-analysis', label: 'Gap analysis', command: 'gap-analysis', optional: true, describe: 'F09 — missing pages/features + proposed-sitemap.json (drives rebuild IA + redirects)' },
  { id: 'video-audit', label: 'Video audit', command: 'video-audit', optional: true, describe: 'F12 — page-by-page video plan with shot lists (sells the videography work)' },
  { id: 'synthesize', label: 'Synthesize', command: 'synthesize', describe: 'Compose audit-package.json' },
  { id: 'voice-extract', label: 'Voice Extract', command: 'voice-extract', optional: true, describe: 'Derive brand voice guide (F03) — feeds improve, blog topics, video audit, admin' },
  { id: 'blog-topics', label: 'Blog Topics', command: 'blog-topics', optional: true, describe: 'F10 — 25 blog topic briefs (sells as $750 standalone; consumed by improve + admin)' },
  { id: 'schema-build', label: 'Schema Build', command: 'schema-build', optional: true, describe: 'Generate JSON-LD schemas + install guide (F02) — sellable as $500 standalone' },
  { id: 'design-brief', label: 'Design Brief', command: 'design-brief', describe: 'Render the operator design brief' },
  { id: 'scaffold', label: 'Scaffold', command: 'scaffold', describe: 'Generate Astro repo from template' },
  { id: 'clone', label: 'Clone', command: 'clone', args: ['--no-pr'], describe: 'Visual clone every page' },
  { id: 'finalize', label: 'Finalize', command: 'finalize', args: ['--download-missing'], describe: 'Rewrite links + fetch missing CDN assets' },
  { id: 'clone-fidelity', label: 'Clone fidelity', command: 'clone-fidelity', optional: true, describe: 'Score cloned vs live; emit fidelity findings' },
  { id: 'fixes-plan', label: 'Fixes plan', command: 'fixes-plan', describe: 'Generate fixes-plan.md from audit + intake + fidelity' },
  { id: 'qa', label: 'QA', command: 'qa', describe: 'Re-audit against the cloned/improved site' },
  { id: 'improve', label: 'Improve', command: 'improve', args: ['--dry-run'], optional: true, describe: 'Plan improvement-track matrix (--no-dry-run to apply)' },
  { id: 'launch', label: 'Launch', command: null, describe: 'Operator-only launch checklist (requires DNS/host decisions)' },
  { id: 'prototype-app', label: 'iOS prototype', command: 'prototype-app', optional: true, describe: 'F04 — Expo React Native prototype as a sales artifact' },
  { id: 'custom-tools', label: 'Custom tools', command: 'custom-tools', optional: true, describe: 'F11 — bespoke backend tool concepts (high-margin upsell)' },
  { id: 'monitor', label: 'Monitor', command: 'monitor', optional: true, describe: 'F06 — weekly delta report for retainer clients (invoked on schedule, not in linear pipeline)' },
  { id: 'followup', label: 'Followup', command: 'followup', optional: true, describe: 'F07 — 6-month re-audit + case study + re-engagement docs' },
];

/** O(1) lookup helper. */
export function findStage(id: PipelineStageId): PipelineStage | undefined {
  return PIPELINE_STAGES.find((s) => s.id === id);
}
