// Harvest corpus builder (Spec 18 §3). Pure: every source arrives as raw
// file strings, parsed LENIENTLY inside — one corrupt artifact degrades that
// source, never the sweep. The input shape deliberately has NO field for
// pitch/share.json or any other token-bearing file: the corpus is the
// sanitized, committable derivative of gitignored client dirs.

import type { FidelityPolicyBlock } from '../clone-qa/fidelity-scorer.js';

export const HARVEST_CORPUS_VERSION = 1 as const;

/** Raw inputs for one client/prospect/matrix dir. Strings, not paths. */
export interface HarvestSource {
  slug: string;
  /** From the site registry, when the sweep can match a matrix slug. */
  platform?: string;
  configYaml?: string;
  pitchStateJson?: string;
  fidelitySummaryJson?: string;
  auditPackageMetaJson?: string;
  runLedgerJson?: string;
  viewsJson?: string;
}

export interface CorpusPage {
  pageSlug: string;
  pixel: number;
  copy: number;
  overall: number;
  status: string;
}

export interface CorpusSource {
  slug: string;
  kind: 'prospect' | 'client' | 'matrix';
  platform?: string;
  pitch?: { status: string; estUsd: number; sentAt?: string; viewedAt?: string };
  fidelity?: { overall: number; pages: CorpusPage[]; policy?: FidelityPolicyBlock };
  spend?: { estUsd: number; actualUsd?: number; source: string };
  pages?: number;
}

export interface CorpusStats {
  scoredPages: number;
  fidelityDist: { min: number; p25: number; median: number; p75: number; max: number } | null;
  belowBarCounts: { '70': number; '75': number; '80': number };
}

export interface HarvestCorpus {
  v: typeof HARVEST_CORPUS_VERSION;
  generatedAt: string;
  sources: CorpusSource[];
  stats: CorpusStats;
}

function tryParse<T>(raw: string | undefined): T | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = (sorted.length - 1) * q;
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  const frac = idx - lo;
  return Math.round(sorted[lo]! * (1 - frac) + sorted[hi]! * frac);
}

export function buildCorpus(sources: HarvestSource[]): HarvestCorpus {
  const out: CorpusSource[] = [];
  const allScored: number[] = [];

  for (const src of sources) {
    const pitchState = tryParse<{
      v?: number;
      status?: string;
      ledger?: { estUsd?: number };
      sentAt?: string;
    }>(src.pitchStateJson);
    const summary = tryParse<{
      overall?: number;
      pages?: Array<{ pageSlug?: string; pixel?: { score?: number }; copy?: { score?: number }; overall?: number; status?: string }>;
      policy?: FidelityPolicyBlock;
    }>(src.fidelitySummaryJson);
    const runLedger = tryParse<{
      v?: number;
      totalEstUsd?: number;
      stages?: Array<{ actual?: { usd?: number } }>;
    }>(src.runLedgerJson);
    const views = tryParse<{ v?: number; firstViewedAt?: string }>(src.viewsJson);
    const meta = tryParse<{ totalPages?: number }>(src.auditPackageMetaJson);

    const kind: CorpusSource['kind'] = src.slug.startsWith('matrix-')
      ? 'matrix'
      : pitchState && pitchState.v === 1
        ? 'prospect'
        : 'client';

    const entry: CorpusSource = { slug: src.slug, kind };
    if (src.platform) entry.platform = src.platform;

    if (pitchState && pitchState.v === 1 && typeof pitchState.status === 'string') {
      entry.pitch = {
        status: pitchState.status,
        estUsd: pitchState.ledger?.estUsd ?? 0,
        ...(pitchState.sentAt ? { sentAt: pitchState.sentAt } : {}),
        ...(views?.firstViewedAt ? { viewedAt: views.firstViewedAt } : {}),
      };
    }

    if (summary && Array.isArray(summary.pages)) {
      const pages: CorpusPage[] = summary.pages.map((p) => ({
        pageSlug: p.pageSlug ?? '?',
        pixel: p.pixel?.score ?? 0,
        copy: p.copy?.score ?? 0,
        overall: p.overall ?? 0,
        status: p.status ?? 'error',
      }));
      entry.fidelity = {
        overall: summary.overall ?? 0,
        pages,
        ...(summary.policy ? { policy: summary.policy } : {}),
      };
      for (const p of pages) if (p.status === 'scored') allScored.push(p.overall);
    }

    if (runLedger && runLedger.v === 1) {
      const actualUsd = (runLedger.stages ?? []).reduce(
        (s, st) => s + (st.actual?.usd ?? 0),
        0,
      );
      entry.spend = {
        estUsd: runLedger.totalEstUsd ?? 0,
        ...(actualUsd > 0 ? { actualUsd } : {}),
        source: actualUsd > 0 ? 'run-ledger+usage-log' : 'run-ledger',
      };
    }

    if (typeof meta?.totalPages === 'number') entry.pages = meta.totalPages;

    out.push(entry);
  }

  const sorted = [...allScored].sort((a, b) => a - b);
  const stats: CorpusStats = {
    scoredPages: sorted.length,
    fidelityDist:
      sorted.length === 0
        ? null
        : {
            min: sorted[0]!,
            p25: quantile(sorted, 0.25),
            median: quantile(sorted, 0.5),
            p75: quantile(sorted, 0.75),
            max: sorted[sorted.length - 1]!,
          },
    belowBarCounts: {
      '70': sorted.filter((s) => s < 70).length,
      '75': sorted.filter((s) => s < 75).length,
      '80': sorted.filter((s) => s < 80).length,
    },
  };

  return { v: HARVEST_CORPUS_VERSION, generatedAt: new Date().toISOString(), sources: out, stats };
}
