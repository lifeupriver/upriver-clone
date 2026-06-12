// First-party "prospect opened it" signal (Spec 18 §5). Dashboard-owned,
// write-once `pitch/views.json` — deliberately NOT pitch/state.json: the CLI
// rewrites state.json whole from its own in-memory state, so a dashboard
// write there would race a concurrent `pitch run/approve` and get clobbered.
// This file has exactly one writer (here) and one transition (absent → set).

import { resolveClientDataSource } from './data-source.js';

export const PITCH_VIEWS_VERSION = 1 as const;
export const PITCH_VIEWS_PATH = 'pitch/views.json';

export interface PitchViews {
  v: typeof PITCH_VIEWS_VERSION;
  firstViewedAt: string;
}

/**
 * Record the first successful prospect view. No-op when already recorded.
 * Callers invoke this ONLY on 200-served responses — an invalid/expired
 * token or unstaged content is not a prospect view. Best-effort: a write
 * failure must never break the prospect-facing response.
 */
export async function recordFirstPitchView(slug: string): Promise<void> {
  try {
    const ds = resolveClientDataSource();
    const existing = await ds.readClientFileText(slug, PITCH_VIEWS_PATH);
    if (existing !== null) return;
    const views: PitchViews = { v: PITCH_VIEWS_VERSION, firstViewedAt: new Date().toISOString() };
    await ds.writeClientFile(slug, PITCH_VIEWS_PATH, `${JSON.stringify(views, null, 2)}\n`);
  } catch {
    // Swallow: the open signal is telemetry, the preview response is the product.
  }
}
