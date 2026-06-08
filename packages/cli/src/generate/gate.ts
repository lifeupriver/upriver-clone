/** The Continue-gate decision (spec §4), separated from the interactive prompt. */
export type GateDecision =
  | 'auto-approve'
  | 'auto-approve-gate'
  | 'refuse-yes'
  | 'prompt'
  | 'skip-non-tty';

/**
 * `--yes` auto-approves only a previously-approved doc (re-runs); on a
 * never-approved doc it refuses. Without `--yes`, a TTY prompts and a non-TTY
 * skips (leaves it unapproved).
 *
 * `gateAuto` (env `UPRIVER_GATE_AUTO=1`) is the unattended/synthetic-run escape
 * hatch: it auto-approves even a never-approved doc/tier, taking precedence over
 * every other branch. Distinct from `'auto-approve'` so the call site can log
 * loudly that this approval was unattended. Default (unset) is byte-identical to
 * the prior behavior.
 */
export function resolveGateDecision(opts: {
  yes: boolean;
  isTty: boolean;
  priorApproved: boolean;
  gateAuto?: boolean;
}): GateDecision {
  if (opts.gateAuto) return 'auto-approve-gate';
  if (opts.yes) return opts.priorApproved ? 'auto-approve' : 'refuse-yes';
  if (!opts.isTty) return 'skip-non-tty';
  return 'prompt';
}
