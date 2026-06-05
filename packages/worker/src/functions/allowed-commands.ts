/**
 * Allowlist of pipeline CLI commands the worker will spawn. Mirrors the
 * dashboard's `api/enqueue/[command].ts` and `api/run/[command].ts` allowlists —
 * all three move together when the pipeline gains or loses a command.
 *
 * Kept in its own dependency-free module (no Inngest, no `@upriver/core`) so the
 * gate contract can be unit-tested without standing up the worker runtime.
 */
export const ALLOWED_COMMANDS: ReadonlySet<string> = new Set([
  'init',
  'scrape',
  'audit',
  'synthesize',
  'design-brief',
  'scaffold',
  'clone',
  'fixes-plan',
  'qa',
  // M2/M5 deliverable generation (DAG-batch docs 01–12 + provisioning I01–I09).
  'generate',
  // F01/F02/F03/F09/F10/F12 deliverables (Phase 1)
  'voice-extract',
  'audit-media',
  'schema-build',
  'gap-analysis',
  'video-audit',
  'blog-topics',
  // F04/F06/F07/F11 deliverables (Phase 2)
  'prototype-app',
  'monitor',
  'followup',
  'custom-tools',
  // F05 deliverables (Phase 3) — read-only admin sub-commands fine to enqueue
  'admin-status',
  'admin-pause',
  'admin-rotate-pin',
]);
