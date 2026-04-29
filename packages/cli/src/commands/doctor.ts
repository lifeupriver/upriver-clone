import { execFileSync } from 'node:child_process';

import { BaseCommand } from '../base-command.js';

interface CheckResult {
  name: string;
  status: 'ok' | 'warn' | 'missing';
  detail: string;
  unlocks: string;
}

/**
 * `upriver doctor` — single-command preflight. Probes the env vars and
 * external binaries the CLI relies on, then prints which features are fully
 * available, degraded, or unavailable.
 *
 * Pure-output; never modifies anything. Exits 0 even when checks fail —
 * `doctor` is for diagnosis, not gate-keeping.
 */
export default class Doctor extends BaseCommand {
  static override description =
    'Preflight: check API keys, external binaries, and report which Upriver features are available.';

  static override examples = ['<%= config.bin %> doctor'];

  async run(): Promise<void> {
    const checks: CheckResult[] = [
      checkEnv(
        'FIRECRAWL_API_KEY',
        'scrape, discover, audit base passes',
        '`upriver scrape` and `upriver audit` will fail without this. Sign up at firecrawl.dev.',
      ),
      checkEnv(
        'ANTHROPIC_API_KEY',
        'deep audit passes (C.3–C.5), synthesize, interview-prep',
        'Without it, `audit --mode=deep|all` falls back to the `claude` CLI runner; synthesize and interview-prep refuse to run.',
      ),
      checkEnv(
        'GOOGLE_SERVICE_ACCOUNT_KEY',
        'GSC + Analytics audit data',
        'Audit passes that need GSC data degrade to "no data — onboarding gap" findings without it.',
      ),
      checkEnv(
        'UPRIVER_SUPABASE_URL',
        'usage logging + F.6 storage sync + report share-URL hosting',
        'Usage logs still go to <clientDir>/token-and-credit-usage.log; F.6 sync + signed-URL hosting fall back to local-only.',
      ),
      checkEnv(
        'UPRIVER_SUPABASE_SERVICE_KEY',
        'F.6 sync push/pull, signed-URL minting',
        'Paste from Supabase dashboard → Settings → API → service_role. Without it, server-side bucket writes fail.',
      ),
      checkEnv(
        'UPRIVER_SUPABASE_PUBLISHABLE_KEY',
        'browser-side dashboard auth + signed-URL refresh',
        'Without it, client-side Supabase calls (eventual F.5 full auth) fall back to operator-only.',
      ),
      checkEnv(
        'UPRIVER_SUPABASE_BUCKET',
        'override the default storage bucket name',
        'Defaults to `upriver`. Only set if you renamed the bucket.',
      ),
      checkEnv(
        'AHREFS_API_KEY',
        'backlinks audit (stub today)',
        'Integration is currently a stub — setting this only changes wording. No real API calls yet.',
      ),
      checkEnv(
        'UPRIVER_RUN_TOKEN',
        'auth gate on dashboard /api/run/*',
        'Dashboard /api/run/* is open to any same-origin caller until this is set.',
      ),
      checkEnv(
        'UPRIVER_REPORT_HOST',
        '`upriver report send` share URLs',
        'Defaults to https://reports.upriverhudsonvalley.com — set explicitly if your hosted-report URL differs.',
      ),
      checkEnv(
        'RESEND_API_KEY',
        '`upriver report send` real delivery',
        'Without it, send prints the email body for manual forwarding instead of delivering via Resend.',
      ),
      checkEnv(
        'UPRIVER_REPORT_FROM',
        '`upriver report send` sender address override',
        'Defaults to reports@upriverhudsonvalley.com. Must be on a Resend-verified domain.',
      ),
      checkBinary(
        'gh',
        '`upriver improve` opens PRs per track (E.4)',
        '`upriver improve --pr` falls back to a logged warning per track when missing.',
      ),
      checkBinary(
        'zip',
        '`upriver report bundle` (F.6 light)',
        'Bundle command will error out without the system zip binary. macOS/Linux include it; Windows needs Git-Bash or WSL.',
      ),
      checkBinary(
        'claude',
        'visual clone agent + claude-cli runner fallback for deep audits',
        'Without it: `upriver clone` cannot run, and deep audits require ANTHROPIC_API_KEY (no CLI fallback available).',
      ),
      checkBinary('git', 'clone, fixes apply, improve worktrees', 'Hard requirement — every workflow uses git.'),
      checkBinary(
        'pnpm',
        'scaffolded site builds',
        '`upriver clone` runs `pnpm build` inside the cloned repo to verify pages compile.',
      ),
    ];

    this.log('');
    this.log('upriver doctor — preflight\n');

    const ok = checks.filter((c) => c.status === 'ok').length;
    const warn = checks.filter((c) => c.status === 'warn').length;
    const missing = checks.filter((c) => c.status === 'missing').length;

    for (const c of checks) {
      const tag = c.status === 'ok' ? '[ok]   ' : c.status === 'warn' ? '[warn] ' : '[miss] ';
      this.log(`  ${tag} ${c.name.padEnd(28)} ${c.detail}`);
      if (c.status !== 'ok') this.log(`         unlocks: ${c.unlocks}`);
    }

    this.log('');
    this.log(`Summary: ${ok} ok, ${warn} warn, ${missing} missing`);
    if (missing === 0 && warn === 0) {
      this.log('All checks passed — every feature is available.');
    } else if (missing === 0) {
      this.log('Core features are available. Optional features in the warn list are degraded.');
    } else {
      this.log('Some features are unavailable until the missing items are resolved. Doctor exits 0 — this is diagnosis, not enforcement.');
    }
    this.log('');
  }
}

/**
 * Check whether an env var is present. `optional` env vars degrade to `warn`
 * when absent; required ones (FIRECRAWL_API_KEY, ANTHROPIC_API_KEY) report
 * `missing`. Required-vs-optional is decided per-check rather than read from
 * the registry so doctor can describe the per-feature impact precisely.
 */
function checkEnv(name: string, unlocks: string, fallbackNote: string): CheckResult {
  const value = process.env[name];
  if (value && value.length > 0) {
    return { name, status: 'ok', detail: `set (${maskValue(value)})`, unlocks };
  }
  // FIRECRAWL_API_KEY and ANTHROPIC_API_KEY are core; others are optional.
  const isCore = name === 'FIRECRAWL_API_KEY' || name === 'ANTHROPIC_API_KEY';
  return { name, status: isCore ? 'missing' : 'warn', detail: 'unset', unlocks: fallbackNote };
}

function maskValue(v: string): string {
  if (v.length <= 8) return '***';
  return `${v.slice(0, 4)}…${v.slice(-2)}`;
}

/**
 * Check whether a binary is on PATH by invoking `which`. Treats anything
 * non-zero as missing. `git` is the only hard requirement; everything else is
 * a `warn`.
 */
function checkBinary(name: string, unlocks: string, fallbackNote: string): CheckResult {
  try {
    const out = execFileSync('which', [name], { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim();
    return { name, status: 'ok', detail: out, unlocks };
  } catch {
    const isHard = name === 'git';
    return { name, status: isHard ? 'missing' : 'warn', detail: 'not found on PATH', unlocks: fallbackNote };
  }
}
