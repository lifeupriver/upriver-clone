// Harvest report + calibration recommendation (Spec 18 §3–§4). The
// calibration section RECOMMENDS — no code path ever rewrites
// PITCH_FIDELITY_MIN / CLONE_FIDELITY_BAR; a human applies the change and
// notes it in the owning spec's changelog.

import { CLONE_FIDELITY_BAR, PITCH_FIDELITY_MIN } from '../clone/hardening.js';
import type { CorpusStats, HarvestCorpus } from './corpus.js';

/** Minimum scored pages before a bar recommendation is statistically honest. */
export const CALIBRATION_MIN_SCORED_PAGES = 20;

export interface BarRecommendation {
  suggestedBar: number | null;
  recommendation: string;
}

export function recommendBars(stats: CorpusStats): BarRecommendation {
  if (stats.scoredPages < CALIBRATION_MIN_SCORED_PAGES || !stats.fidelityDist) {
    return {
      suggestedBar: null,
      recommendation:
        `insufficient data (${stats.scoredPages} scored page(s); need ${CALIBRATION_MIN_SCORED_PAGES}) — ` +
        `bars stay at ${PITCH_FIDELITY_MIN}/${CLONE_FIDELITY_BAR} (PITCH_FIDELITY_MIN/CLONE_FIDELITY_BAR).`,
    };
  }
  const suggested = Math.round(stats.fidelityDist.p25 / 5) * 5;
  return {
    suggestedBar: suggested,
    recommendation:
      `distribution over ${stats.scoredPages} scored pages: ` +
      `min ${stats.fidelityDist.min}, p25 ${stats.fidelityDist.p25}, median ${stats.fidelityDist.median}, ` +
      `p75 ${stats.fidelityDist.p75}, max ${stats.fidelityDist.max}. ` +
      `Suggested bar: ${suggested} (p25 rounded to 5). This is a recommendation — change ` +
      `PITCH_FIDELITY_MIN / CLONE_FIDELITY_BAR by hand and note it in the owning spec's changelog.`,
  };
}

export function renderHarvestReport(corpus: HarvestCorpus): string {
  const lines: string[] = [];
  lines.push('# Harvest report');
  lines.push('');
  lines.push(`Generated: ${corpus.generatedAt} · corpus v${corpus.v} · ${corpus.sources.length} source(s)`);
  lines.push('');
  lines.push('| slug | kind | platform | pitch status | viewed | fidelity overall | below-bar | spend |');
  lines.push('| --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const s of corpus.sources) {
    const belowBar = s.fidelity?.policy
      ? String(s.fidelity.policy.belowBar.length + s.fidelity.policy.unscored.length)
      : '—';
    const spend = s.spend
      ? `$${s.spend.estUsd.toFixed(2)}${s.spend.actualUsd !== undefined ? ` (act $${s.spend.actualUsd.toFixed(2)})` : ''}`
      : s.pitch
        ? `$${s.pitch.estUsd.toFixed(2)}`
        : '—';
    lines.push(
      `| ${s.slug} | ${s.kind} | ${s.platform ?? '—'} | ${s.pitch?.status ?? '—'} | ${s.pitch?.viewedAt?.slice(0, 10) ?? '—'} | ${s.fidelity?.overall ?? '—'} | ${belowBar} | ${spend} |`,
    );
  }
  lines.push('');
  lines.push('## Fidelity distribution');
  lines.push('');
  if (corpus.stats.fidelityDist) {
    const d = corpus.stats.fidelityDist;
    lines.push(
      `${corpus.stats.scoredPages} scored pages: min ${d.min} · p25 ${d.p25} · median ${d.median} · p75 ${d.p75} · max ${d.max}`,
    );
    lines.push(
      `Below-bar counts: <70 → ${corpus.stats.belowBarCounts['70']}, <75 → ${corpus.stats.belowBarCounts['75']}, <80 → ${corpus.stats.belowBarCounts['80']}`,
    );
  } else {
    lines.push('No scored pages yet.');
  }
  lines.push('');
  lines.push('## Calibration');
  lines.push('');
  lines.push(recommendBars(corpus.stats).recommendation);
  lines.push('');
  return lines.join('\n');
}
