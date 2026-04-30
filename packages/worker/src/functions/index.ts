import { runStage } from './run-stage.js';
import { monitorWeekly } from '../schedules/monitor.js';
import { followupDue } from '../schedules/followup.js';

/**
 * Every Inngest function exposed by the worker. Imported by whichever runtime
 * actually serves them — the dashboard's `/api/inngest` route during Phase 3,
 * a standalone container in later phases.
 *
 * Cron functions:
 *   - monitorWeekly  (F06) — Mondays, fans out monitor events
 *   - followupDue    (F07) — Mondays, fans out followup events for past
 *                            clients past the 180-day mark
 */
export const functions = [runStage, monitorWeekly, followupDue] as const;

export { runStage, monitorWeekly, followupDue };
