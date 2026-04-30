/**
 * Convert a flags object into an alternating CLI argv suitable for
 * subprocess invocation via `execFile` / `spawn`.
 *
 * - `true` becomes `--<key>`.
 * - `false` / `undefined` / `null` are omitted (callers wanting `--no-<key>`
 *   must pre-translate).
 * - Strings and numbers become `--<key>` followed by the stringified value as
 *   a separate argv entry, so values are inert to shell metacharacters.
 *
 * Single source of truth for both the dashboard's `/api/run/<command>` (legacy
 * spawn path) and the worker's `runStage` Inngest function.
 */
export function flagsToArgs(
  flags: Record<string, string | boolean | number | null | undefined>,
): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(flags)) {
    if (value === false || value === undefined || value === null) continue;
    if (value === true) {
      out.push(`--${key}`);
      continue;
    }
    if (typeof value === 'string' || typeof value === 'number') {
      out.push(`--${key}`, String(value));
    }
  }
  return out;
}
