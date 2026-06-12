import { execFile } from 'node:child_process';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { promisify } from 'node:util';

import { createSupabaseClientDataSourceFromEnv } from '@upriver/core/data';

import { inngest } from '../client.js';
import { ADMIN_CHANGE_EVENT, adminChangePayloadSchema } from '../webhook-event.js';
import {
  buildAdminProcessEnv,
  buildBlockedComment,
  buildCloneUrl,
  buildPrBody,
  buildPrTitle,
  buildSlackSummary,
  deriveBranchName,
  isSafeSlug,
  isValidRepoFullName,
  parseAdminProcessOutput,
  redactValues,
} from './admin-webhook-helpers.js';
import { scrubSecrets } from './scrub-secrets.js';

/**
 * F05 admin webhook — "client files a plain-English change request, the agent
 * opens a DRAFT PR for the operator to review".
 *
 * Triggered by `admin/change.requested`, which only `serve.ts`'s `/webhook`
 * route emits — and only after HMAC signature verification, event/label
 * filtering, and replay guarding. This function adds the second wall:
 *
 *  - The payload NEVER chooses the repo. `repoFullName` is used purely as a
 *    lookup key into `client_admins`; the clone URL is rebuilt from the DB
 *    row (`webhook_active = true`, `admin_paused = false` required).
 *  - The Claude-driven processor runs as the `upriver admin-process`
 *    subprocess with a strict allowlisted env: no GitHub PAT, no Supabase
 *    keys, no Inngest keys. Prompt-injected instructions in the issue body
 *    cannot exfiltrate tokens the process does not hold.
 *  - The result is ALWAYS a draft PR labeled `pending-review` (or a
 *    `needs-operator` comment when blocked). Nothing is ever merged.
 */

const execFileAsync = promisify(execFile);

/** Same fixed container location as run-stage; UPRIVER_CLI_BIN overrides in tests. */
function resolveCliBin(): string {
  return process.env['UPRIVER_CLI_BIN'] ?? '/app/packages/cli/bin/run.js';
}

const GIT_TIMEOUT_MS = 2 * 60_000;
/** Claude session + intent parse; generous but bounded (run-stage uses 30m for full stages). */
const AGENT_TIMEOUT_MS = 15 * 60_000;
const GITHUB_API = 'https://api.github.com';

interface ResolvedClient {
  ok: true;
  slug: string;
  repoFullName: string;
}

interface SkippedClient {
  ok: false;
  reason: string;
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set on the worker — required for the F05 admin webhook`);
  return value;
}

/** Minimal env for git subprocesses: no tokens beyond the URL-embedded one, no prompts. */
function gitEnv(): Record<string, string> {
  const env: Record<string, string> = { GIT_TERMINAL_PROMPT: '0' };
  for (const key of ['PATH', 'HOME']) {
    const value = process.env[key];
    if (value !== undefined) env[key] = value;
  }
  return env;
}

async function git(args: string[], pat: string): Promise<string> {
  try {
    const { stdout } = await execFileAsync('git', args, {
      env: gitEnv(),
      timeout: GIT_TIMEOUT_MS,
      killSignal: 'SIGKILL',
      maxBuffer: 8 * 1024 * 1024,
    });
    return stdout;
  } catch (err) {
    // git errors echo remote URLs; the PAT is embedded in ours. Redact before
    // the message can reach Inngest step state.
    const e = err as Error & { stderr?: unknown };
    const stderr = typeof e.stderr === 'string' ? e.stderr : '';
    const detail = redactValues(`${String(e.message ?? err)}\n${stderr}`.slice(0, 1200), [pat]);
    throw new Error(`git ${args[0] ?? ''} failed: ${scrubSecrets(detail)}`);
  }
}

async function githubRequest(
  pat: string,
  method: 'GET' | 'POST',
  path: string,
  body?: unknown,
): Promise<{ status: number; json: unknown }> {
  const res = await fetch(`${GITHUB_API}${path}`, {
    method,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${pat}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'upriver-worker-admin',
      ...(body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(20_000),
  });
  let json: unknown = null;
  try {
    json = await res.json();
  } catch {
    // some endpoints return empty bodies
  }
  return { status: res.status, json };
}

/**
 * Allowlist lookup: the ONLY way a webhook event turns into work. Requires an
 * exact `repo_full_name` match with `webhook_active = true` and
 * `admin_paused = false`. Queried via PostgREST with the service key (table
 * is RLS-locked to service role).
 */
async function resolveClient(repoFullName: string): Promise<ResolvedClient | SkippedClient> {
  const url = requireEnv('UPRIVER_SUPABASE_URL');
  const key = requireEnv('UPRIVER_SUPABASE_SERVICE_KEY');

  const query =
    `${url}/rest/v1/client_admins` +
    `?select=slug,repo_full_name,webhook_active,admin_paused` +
    `&repo_full_name=eq.${encodeURIComponent(repoFullName)}` +
    `&webhook_active=is.true&admin_paused=is.false&limit=1`;

  const res = await fetch(query, {
    headers: { apikey: key, Authorization: `Bearer ${key}` },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) {
    throw new Error(`client_admins lookup failed: HTTP ${res.status}`);
  }
  const rows = (await res.json()) as Array<{ slug?: unknown; repo_full_name?: unknown }>;
  const row = rows[0];
  if (!row) return { ok: false, reason: 'repo not allowlisted or admin paused' };

  // Defense in depth: both values become path/URL segments downstream.
  if (!isSafeSlug(row.slug)) return { ok: false, reason: 'client_admins row has unsafe slug' };
  if (!isValidRepoFullName(row.repo_full_name)) {
    return { ok: false, reason: 'client_admins row has malformed repo_full_name' };
  }
  return { ok: true, slug: row.slug, repoFullName: row.repo_full_name };
}

export const adminWebhook = inngest.createFunction(
  {
    id: 'admin-webhook',
    name: 'F05 admin — process client change request into a draft PR',
    concurrency: [
      { limit: 2 },
      // One run per repo at a time: serializes the duplicate opened+labeled
      // deliveries GitHub sends for template-applied labels, so the second
      // run sees the first run's PR and skips.
      { key: 'event.data.repoFullName', limit: 1 },
    ],
    retries: 1,
  },
  { event: ADMIN_CHANGE_EVENT },
  async ({ event, step }) => {
    const payload = await step.run('validate', () => adminChangePayloadSchema.parse(event.data));
    const pat = requireEnv('UPRIVER_GITHUB_PAT');
    const branch = deriveBranchName(payload.issueNumber);

    // ---- a. resolve-client -------------------------------------------------
    const client = await step.run('resolve-client', async () => {
      const resolved = await resolveClient(payload.repoFullName);
      if (!resolved.ok) return resolved;

      // Dedupe: GitHub fires both `opened` and `labeled` for issues created
      // with a labeled template. If the bot branch already has a PR (any
      // state), this delivery is a duplicate or a re-run — skip it.
      const owner = resolved.repoFullName.split('/')[0] ?? '';
      const existing = await githubRequest(
        pat,
        'GET',
        `/repos/${resolved.repoFullName}/pulls?head=${encodeURIComponent(`${owner}:${branch}`)}&state=all&per_page=1`,
      );
      if (existing.status === 200 && Array.isArray(existing.json) && existing.json.length > 0) {
        return { ok: false as const, reason: `PR already exists for ${branch}` };
      }
      return resolved;
    });

    if (!client.ok) {
      console.log(
        `[admin-webhook] skipping ${payload.repoFullName}#${payload.issueNumber} (delivery ${payload.deliveryId}): ${client.reason}`,
      );
      return { skipped: client.reason };
    }

    // ---- b. clone-repo -----------------------------------------------------
    // Clone URL is rebuilt from the DB row — the event's repoFullName only
    // selected the row; row values are what we trust.
    const workDir = await step.run('clone-repo', async () => {
      const base = await mkdtemp(join(tmpdir(), 'upriver-admin-'));
      const cloneUrl = buildCloneUrl(client.repoFullName, pat);
      await git(['clone', '--depth', '1', cloneUrl, join(base, 'repo')], pat);
      return base;
    });
    const repoDir = join(workDir, 'repo');

    try {
      // ---- c. run-agent ----------------------------------------------------
      const agent = await step.run('run-agent', async () => {
        // Stage a minimal clients tree for the CLI: `admin-process` requires
        // `<cwd>/clients/<slug>/` to exist and reads voice rules from
        // `clients/<slug>/voice/voice-rules.json` (null → house rules only).
        const clientsDir = join(workDir, 'clients');
        await mkdir(join(clientsDir, client.slug), { recursive: true });
        try {
          const ds = createSupabaseClientDataSourceFromEnv();
          const rules = await ds.readClientFileText(client.slug, 'voice/voice-rules.json');
          if (rules) {
            const dest = join(clientsDir, client.slug, 'voice', 'voice-rules.json');
            await mkdir(dirname(dest), { recursive: true });
            await writeFile(dest, rules, 'utf8');
          }
        } catch (err) {
          // Voice rules are an enhancement, not a gate — the processor's
          // house rules (banned words, em dashes) still apply without them.
          console.warn(
            `[admin-webhook] voice rules pull failed for ${client.slug}: ${err instanceof Error ? err.message : String(err)}`,
          );
        }

        // File-based input contract of `upriver admin-process` — body goes via
        // file so hostile content can't interact with argv parsing.
        const bodyFile = join(workDir, 'issue-body.md');
        await writeFile(bodyFile, payload.issueBody, 'utf8');

        const argv = [
          resolveCliBin(),
          'admin-process',
          client.slug,
          `--repo-dir=${repoDir}`,
          `--issue-number=${payload.issueNumber}`,
          `--issue-title=${payload.issueTitle}`,
          `--issue-body-file=${bodyFile}`,
        ];
        const tail = (s: string): string => (s.length > 4_000 ? s.slice(-4_000) : s);
        let stdout = '';
        let stderr = '';
        try {
          const result = await execFileAsync('node', argv, {
            cwd: workDir, // `clientDir(slug)` resolves `./clients/<slug>` against cwd
            env: buildAdminProcessEnv(process.env, { clientsDir }),
            timeout: AGENT_TIMEOUT_MS,
            killSignal: 'SIGKILL',
            maxBuffer: 8 * 1024 * 1024,
          });
          stdout = result.stdout;
          stderr = result.stderr;
        } catch (err) {
          const e = err as Error & { stdout?: unknown; stderr?: unknown };
          const errOut = typeof e.stderr === 'string' ? e.stderr : '';
          throw new Error(
            scrubSecrets(
              redactValues(`admin-process failed: ${String(e.message ?? err).split('\n', 1)[0] ?? ''}\n${tail(errOut)}`, [pat]),
            ),
          );
        }

        const outcome = parseAdminProcessOutput(stdout);
        const status = await git(['-C', repoDir, 'status', '--porcelain'], pat);
        return {
          outcome,
          hasDiff: status.trim().length > 0,
          stdoutTail: scrubSecrets(redactValues(tail(stdout), [pat])),
          stderrTail: scrubSecrets(redactValues(tail(stderr), [pat])),
        };
      });

      let prUrl: string | undefined;
      let blockedReason: string | undefined;

      if (agent.outcome.canAutoPr && agent.hasDiff) {
        // ---- d. commit-and-pr (happy path) — DRAFT PR, never merged --------
        const pr = await step.run('commit-and-pr', async () => {
          await git(['-C', repoDir, 'checkout', '-b', branch], pat);
          await git(['-C', repoDir, 'add', '-A'], pat);
          await git(
            [
              '-C',
              repoDir,
              '-c',
              'user.email=admin-bot@upriverhudsonvalley.com',
              '-c',
              'user.name=Upriver Admin Bot',
              'commit',
              '-m',
              `admin: address #${payload.issueNumber}\n\n${agent.outcome.summary || 'Automated change request.'}`,
            ],
            pat,
          );
          await git(['-C', repoDir, 'push', 'origin', branch], pat);

          const repoInfo = await githubRequest(pat, 'GET', `/repos/${client.repoFullName}`);
          const base =
            (repoInfo.json as { default_branch?: string } | null)?.default_branch ?? 'main';

          const created = await githubRequest(pat, 'POST', `/repos/${client.repoFullName}/pulls`, {
            title: buildPrTitle(payload.issueNumber, payload.issueTitle),
            head: branch,
            base,
            draft: true,
            body: buildPrBody({
              issueNumber: payload.issueNumber,
              summary: agent.outcome.summary,
              voiceNotes: [],
            }),
          });
          if (created.status !== 201) {
            throw new Error(`PR create failed: HTTP ${created.status} ${JSON.stringify(created.json).slice(0, 300)}`);
          }
          const prData = created.json as { number: number; html_url: string };

          // Labels via the issues endpoint (a PR is an issue); GitHub creates
          // missing labels on the fly, so this cannot 404 on label absence.
          await githubRequest(pat, 'POST', `/repos/${client.repoFullName}/issues/${prData.number}/labels`, {
            labels: ['pending-review'],
          });
          return { prUrl: prData.html_url, prNumber: prData.number };
        });
        prUrl = pr.prUrl;
      } else {
        // ---- d'. blocked / voice-failed / empty diff -----------------------
        blockedReason = agent.outcome.blockReason ?? (agent.hasDiff ? 'blocked' : 'no-changes-produced');
        const reason = blockedReason;
        await step.run('comment-blocked', async () => {
          const comment = await githubRequest(
            pat,
            'POST',
            `/repos/${client.repoFullName}/issues/${payload.issueNumber}/comments`,
            {
              body: buildBlockedComment({
                reason,
                ...(agent.outcome.summary ? { detail: agent.outcome.summary } : {}),
              }),
            },
          );
          await githubRequest(pat, 'POST', `/repos/${client.repoFullName}/issues/${payload.issueNumber}/labels`, {
            labels: ['needs-operator'],
          });
          return { commented: comment.status === 201 };
        });
      }

      // ---- e. notify (non-fatal) -------------------------------------------
      await step.run('notify', async () => {
        const hook = process.env['ADMIN_OPERATOR_SLACK_WEBHOOK'];
        if (!hook) return { notified: false };
        try {
          await fetch(hook, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: buildSlackSummary({
                repoFullName: client.repoFullName,
                issueNumber: payload.issueNumber,
                prUrl,
                blockedReason,
              }),
            }),
            signal: AbortSignal.timeout(5_000),
          });
          return { notified: true };
        } catch (err) {
          console.warn(`[admin-webhook] slack notify failed: ${err instanceof Error ? err.message : String(err)}`);
          return { notified: false };
        }
      });

      return {
        status: prUrl ? 'pr-opened' : 'blocked',
        ...(prUrl !== undefined ? { prUrl } : {}),
        ...(blockedReason !== undefined ? { blockedReason } : {}),
        voicePassed: agent.outcome.voicePassed,
        hasDiff: agent.hasDiff,
        stdoutTail: agent.stdoutTail,
      };
    } finally {
      // ---- f. cleanup (finally-equivalent, mirrors run-stage) ---------------
      await step.run('cleanup', async () => {
        try {
          await rm(workDir, { recursive: true, force: true });
          return { cleaned: true };
        } catch {
          return { cleaned: false };
        }
      });
    }
  },
);
