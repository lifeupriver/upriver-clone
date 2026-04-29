import type {
  AuditFinding,
  AuditPassResult,
  ImpactMetric,
  ImpactMetrics,
} from '@upriver/core';

import type { LoadedPage } from './loader.js';

/**
 * Inputs required to compute the client-facing impact metrics rollup.
 *
 * All fields are derived elsewhere in the synthesize pipeline; this module
 * performs no IO and no LLM calls.
 */
export interface ImpactMetricsInput {
  passes: AuditPassResult[];
  findings: AuditFinding[];
  pages: LoadedPage[];
  scoreByDimension: Record<string, number>;
}

const SEARCH_VISIBILITY_DIMENSIONS = new Set(['seo', 'aeo', 'schema']);
const SEARCH_VISIBILITY_PRIORITIES = new Set(['p0', 'p1']);
const THIN_PAGE_WORD_COUNT_FLOOR = 1;
const THIN_PAGE_WORD_COUNT_CEILING = 300;

/**
 * Heuristic, deterministic rollup of existing audit data into client-facing
 * stats rendered in the report hero. The output is stable for a given input
 * and contains exactly the three known metrics, in a fixed order, even when
 * their values are zero — the hero always renders three cards.
 *
 * @param input - Aggregated audit pipeline output (passes, findings, pages,
 *   per-dimension scores). `passes` and `scoreByDimension` are accepted for
 *   future metric expansion but are not yet read.
 * @returns ImpactMetrics with `generatedAt` (ISO string) and exactly three
 *   metric entries: `criticalIssues`, `thinPages`, `searchVisibilityIssues`.
 */
export function computeImpactMetrics(input: ImpactMetricsInput): ImpactMetrics {
  const { findings, pages } = input;

  const criticalCount = findings.filter((f) => f.priority === 'p0').length;

  const thinPageCount = pages.filter((p) => {
    const wc = p.content?.wordCount ?? 0;
    return wc >= THIN_PAGE_WORD_COUNT_FLOOR && wc < THIN_PAGE_WORD_COUNT_CEILING;
  }).length;

  const searchVisibilityCount = findings.filter(
    (f) =>
      SEARCH_VISIBILITY_DIMENSIONS.has(f.dimension) &&
      SEARCH_VISIBILITY_PRIORITIES.has(f.priority),
  ).length;

  const metrics: ImpactMetric[] = [
    {
      key: 'criticalIssues',
      value: criticalCount,
      display: String(criticalCount),
      label: 'Critical issues blocking growth',
      rationale: 'P0 findings = revenue-impacting problems we would fix in week one.',
    },
    {
      key: 'thinPages',
      value: thinPageCount,
      display: `${thinPageCount} ${thinPageCount === 1 ? 'page' : 'pages'}`,
      label: 'Pages too thin to rank in search',
      rationale: 'Pages under 300 words rarely surface for any meaningful query.',
    },
    {
      key: 'searchVisibilityIssues',
      value: searchVisibilityCount,
      display: String(searchVisibilityCount),
      label: 'Search visibility issues to fix',
      rationale:
        'Combined SEO, answer-engine, and structured-data findings that compound over time.',
    },
  ];

  return {
    generatedAt: new Date().toISOString(),
    metrics,
  };
}
