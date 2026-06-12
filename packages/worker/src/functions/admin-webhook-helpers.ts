/**
 * Pure helpers for the F05 admin-webhook Inngest function. No Inngest, no
 * network, no fs — unit-testable in isolation, same contract as
 * `allowed-commands.ts` / `scrub-secrets.ts`.
 */

import { REPO_FULL_NAME_RE } from '../webhook-event.js';

/** Kebab-case slug, the same shape `@upriver/core` accepts for path segments. */
const SAFE_SLUG_RE = /^[a-z0-9][a-z0-9-]*$/;

export function isSafeSlug(slug: unknown): slug is string {
  return typeof slug === 'string' && SAFE_SLUG_RE.test(slug);
}

export function isValidRepoFullName(name: unknown): name is string {
  return typeof name === 'string' && REPO_FULL_NAME_RE.test(name);
}

/**
 * Branch the bot pushes to. Derived ONLY from the issue number (an integer the
 * event schema already validated) — never from client-authored text.
 */
export function deriveBranchName(issueNumber: number): string {
  if (!Number.isInteger(issueNumber) || issueNumber <= 0 || issueNumber > 1_000_000_000) {
    throw new Error(`invalid issue number for branch name: ${String(issueNumber)}`);
  }
  return `admin/issue-${issueNumber}`;
}

/**
 * Authenticated clone URL. Repo identity comes from the `client_admins` row,
 * never from the webhook payload. Throws rather than building a URL from
 * anything that does not look like `owner/repo`.
 */
export function buildCloneUrl(repoFullName: string, pat: string): string {
  if (!isValidRepoFullName(repoFullName)) {
    throw new Error('refusing to build clone URL: repo_full_name is not owner/repo shaped');
  }
  if (!pat) throw new Error('refusing to build clone URL: empty GitHub token');
  return `https://x-access-token:${pat}@github.com/${repoFullName}.git`;
}

/** Issue titles are client-authored: drop control chars, collapse whitespace, cap. */
export function sanitizeIssueTitle(title: string): string {
  const cleaned = title
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u001f\u007f]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const capped = cleaned.slice(0, 200);
  return capped.length > 0 ? capped : 'Change request';
}

export function buildPrTitle(issueNumber: number, issueTitle: string): string {
  return `[admin] #${issueNumber}: ${sanitizeIssueTitle(issueTitle)}`.slice(0, 240);
}

/**
 * Draft-PR body. Links the source issue (`Closes #N` so a human merge closes
 * it) and states plainly that the change is machine-generated and must be
 * reviewed by a person. The bot NEVER merges.
 */
export function buildPrBody(input: { issueNumber: number; summary: string; voiceNotes: string[] }): string {
  const lines: string[] = [];
  lines.push(`Closes #${input.issueNumber}`);
  lines.push('');
  if (input.summary.trim().length > 0) {
    lines.push(input.summary.trim().slice(0, 2000));
    lines.push('');
  }
  for (const note of input.voiceNotes.slice(0, 5)) {
    lines.push(`- Voice note: ${note.slice(0, 300)}`);
  }
  if (input.voiceNotes.length > 0) lines.push('');
  lines.push('---');
  lines.push(
    'This draft PR was generated automatically by the Upriver admin from a client change request. ' +
      'It requires human review before merge. The bot never merges.',
  );
  return lines.join('\n');
}

/** Comment posted on the issue when the run is blocked instead of PR-ed. */
export function buildBlockedComment(input: { reason: string; detail?: string }): string {
  const lines: string[] = [];
  lines.push('The automated change run did not produce a pull request.');
  lines.push('');
  lines.push(`Reason: ${input.reason}`);
  if (input.detail && input.detail.trim().length > 0) {
    lines.push('');
    lines.push(input.detail.trim().slice(0, 1500));
  }
  lines.push('');
  lines.push('An operator will review this request and follow up.');
  return lines.join('\n');
}

/**
 * Environment for the `admin-process` CLI subprocess. Strict allowlist —
 * the subprocess gets only what the headless agent path needs:
 *
 *  - PATH/HOME and friends so node + the claude CLI resolve;
 *  - CLAUDE_* (CLAUDE_BIN, CLAUDE_CONFIG_DIR, feature flags);
 *  - UPRIVER_USE_API_KEY plus the ANTHROPIC_* credentials it gates (the CLI's
 *    own `buildAgentEnv` re-scrubs the agent session below this);
 *  - UPRIVER_CLIENTS_DIR / UPRIVER_DATA_SOURCE=local pointing at the temp
 *    workdir so voice rules + LLM cache resolve locally and no Supabase path
 *    is ever attempted.
 *
 * Deliberately absent: UPRIVER_GITHUB_PAT, GITHUB_WEBHOOK_SECRET,
 * UPRIVER_SUPABASE_*, INNGEST_*, FIRECRAWL_* — the process that talks to the
 * model must not hold tokens that can push code or read the bucket.
 */
const SUBPROCESS_ENV_ALLOWLIST: readonly RegExp[] = [
  /^PATH$/,
  /^HOME$/,
  /^USER$/,
  /^LOGNAME$/,
  /^SHELL$/,
  /^TERM$/,
  /^TMPDIR$/,
  /^TMP$/,
  /^TEMP$/,
  /^LANG$/,
  /^LC_/,
  /^TZ$/,
  /^NODE_EXTRA_CA_CERTS$/,
  /^CLAUDE/,
  /^UPRIVER_USE_API_KEY$/,
];

const ANTHROPIC_KEYS = ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL'] as const;

export function buildAdminProcessEnv(
  source: Record<string, string | undefined>,
  opts: { clientsDir: string },
): Record<string, string> {
  const env: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (value !== undefined && SUBPROCESS_ENV_ALLOWLIST.some((re) => re.test(key))) {
      env[key] = value;
    }
  }
  // Mirror the CLI's own rule: ANTHROPIC creds flow only when the operator
  // explicitly opted into API-key mode (always true in the container).
  if (source['UPRIVER_USE_API_KEY']) {
    for (const key of ANTHROPIC_KEYS) {
      const value = source[key];
      if (value !== undefined) env[key] = value;
    }
  }
  env['UPRIVER_CLIENTS_DIR'] = opts.clientsDir;
  env['UPRIVER_DATA_SOURCE'] = 'local';
  return env;
}

export interface AdminProcessOutcome {
  /** True ONLY when the processor explicitly reported a passing voice check
   * and no block. Anything ambiguous is treated as blocked (fail closed). */
  canAutoPr: boolean;
  voicePassed: boolean | null;
  blocked: boolean;
  blockReason: string | null;
  summary: string;
}

/**
 * Parse the stdout of `upriver admin-process`. The command prints stable
 * `Voice check: PASS|FAIL`, `Blocked: <reason>.` and `Summary: <text>` lines
 * (packages/cli/src/commands/admin-process.ts). FAIL CLOSED: when the markers
 * are missing or ambiguous the outcome is "blocked" — the worker then files a
 * needs-operator comment instead of auto-opening a PR.
 */
export function parseAdminProcessOutput(stdout: string): AdminProcessOutcome {
  const voiceMatch = /^Voice check:\s*(PASS|FAIL)\s*$/m.exec(stdout);
  const voicePassed = voiceMatch ? voiceMatch[1] === 'PASS' : null;

  const blockedMatch = /^Blocked:\s*(.+?)\.?\s*$/m.exec(stdout);
  const blocked = blockedMatch !== null;
  const blockReason = blockedMatch?.[1]?.trim() ?? null;

  const summaryMatch = /^Summary:\s*(.*)$/m.exec(stdout);
  const summary = summaryMatch?.[1]?.trim() ?? '';

  const canAutoPr = voicePassed === true && !blocked;
  return {
    canAutoPr,
    voicePassed,
    blocked: blocked || voicePassed !== true,
    blockReason: blockReason ?? (voicePassed === false ? 'voice-check-failed' : voicePassed === null ? 'agent-output-unreadable' : null),
    summary,
  };
}

/**
 * Strip explicit secret values (the PAT, the authenticated clone URL) from a
 * string before it can reach Inngest step state or a GitHub comment. The
 * generic `scrubSecrets` only matches secret-NAMED env vars (KEY/TOKEN/...),
 * and `UPRIVER_GITHUB_PAT` does not match that family — so the PAT is
 * redacted explicitly here.
 */
export function redactValues(text: string, secrets: ReadonlyArray<string | undefined>): string {
  let out = text;
  for (const secret of secrets) {
    if (!secret || secret.length < 6) continue;
    if (out.includes(secret)) out = out.split(secret).join('[redacted]');
  }
  return out;
}

/** One-line operator notification for Slack. */
export function buildSlackSummary(input: {
  repoFullName: string;
  issueNumber: number;
  prUrl?: string | undefined;
  blockedReason?: string | undefined;
  skipped?: string | undefined;
}): string {
  const where = `${input.repoFullName}#${input.issueNumber}`;
  if (input.prUrl) return `[admin] ${where}: draft PR ready for review — ${input.prUrl}`;
  if (input.blockedReason) return `[admin] ${where}: blocked (${input.blockedReason}) — needs operator`;
  if (input.skipped) return `[admin] ${where}: skipped (${input.skipped})`;
  return `[admin] ${where}: processed`;
}
