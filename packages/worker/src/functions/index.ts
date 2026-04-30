import { runStage } from './run-stage.js';

/**
 * Every Inngest function exposed by the worker. Imported by whichever runtime
 * actually serves them — the dashboard's `/api/inngest` route during Phase 3,
 * a standalone container in later phases.
 */
export const functions = [runStage] as const;

export { runStage };
