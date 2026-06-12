/**
 * Redact known secret values from text before it leaves the worker.
 *
 * Stage stdout/stderr tails are persisted into Inngest step state (visible in
 * the Inngest Cloud UI and to anything with run-history read access), and CLI
 * tools love to echo their environment on crash. So: any env var whose NAME
 * looks credential-bearing (KEY / TOKEN / SECRET / PASSWORD) has its VALUE
 * replaced with `[redacted]` wherever it appears in the text. Values of 8
 * chars or fewer are skipped — too likely to collide with legitimate output
 * (a `PORT`-like var would otherwise scrub every occurrence of its number).
 *
 * Kept dependency-free (no Inngest, no `@upriver/core`) so it can be
 * unit-tested without standing up the worker runtime — same contract as
 * `allowed-commands.ts`.
 */

const SECRET_NAME_RE = /KEY|TOKEN|SECRET|PASSWORD/i;

/**
 * Replace every occurrence of every secret-looking env value in `s` with
 * `[redacted]`. `env` defaults to `process.env`; tests inject a fixture.
 */
export function scrubSecrets(
  s: string,
  env: Record<string, string | undefined> = process.env,
): string {
  if (s.length === 0) return s;
  let out = s;
  for (const [name, value] of Object.entries(env)) {
    if (!value || value.length <= 8) continue;
    if (!SECRET_NAME_RE.test(name)) continue;
    // split/join rather than a RegExp so secret values never need escaping.
    if (out.includes(value)) out = out.split(value).join('[redacted]');
  }
  return out;
}
