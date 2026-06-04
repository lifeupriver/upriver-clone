/** The Continue-gate decision (spec §4), separated from the interactive prompt. */
export type GateDecision = 'auto-approve' | 'refuse-yes' | 'prompt' | 'skip-non-tty';

/**
 * `--yes` auto-approves only a previously-approved doc (re-runs); on a
 * never-approved doc it refuses. Without `--yes`, a TTY prompts and a non-TTY
 * skips (leaves it unapproved).
 */
export function resolveGateDecision(opts: {
  yes: boolean;
  isTty: boolean;
  priorApproved: boolean;
}): GateDecision {
  if (opts.yes) return opts.priorApproved ? 'auto-approve' : 'refuse-yes';
  if (!opts.isTty) return 'skip-non-tty';
  return 'prompt';
}
