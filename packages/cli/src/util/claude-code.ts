// Shared headless Claude Code spawn helper for agent sessions.
//
// Security invariants live HERE, not at call sites:
//
//  - Agent prompts embed scraped third-party site content and client-authored
//    text. Sessions therefore NEVER get the Bash tool — an injected
//    instruction must not be able to run shell commands. Write-mode sessions
//    get file tools only; read-mode sessions are read-only plan mode.
//  - The child environment is an allowlist. Operator secrets (Supabase
//    service key, Firecrawl, GitHub tokens, …) must not be readable by agent
//    tool calls or leak into agent-visible output.
//  - Every session has a hard timeout so a hung CLI cannot stall an
//    unattended pipeline run.
//
// `util/claude-cli.ts` (the --output-format json envelope path) reuses
// `buildAgentEnv` and `sanitizeAgentTools` so both spawn paths share the
// same boundary.

import { spawn } from 'node:child_process';

export const CLAUDE_BIN = process.env['CLAUDE_BIN'] || 'claude';

/** Tool set for write-capable sessions (clone, fixes, improve, verify). */
export const AGENT_WRITE_TOOLS = ['Read', 'Edit', 'Write', 'Glob', 'Grep'];
/** Tool set for read-only sessions (deep-audit passes, intent parsing). */
export const AGENT_READ_TOOLS = ['Read', 'Glob', 'Grep'];

/** Default hard ceiling per session; override per call or via env. */
const DEFAULT_TIMEOUT_MS = 20 * 60_000;

const ENV_ALLOWLIST: RegExp[] = [
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
  /^XDG_/,
  /^HTTPS?_PROXY$/i,
  /^NO_PROXY$/i,
  /^NODE_EXTRA_CA_CERTS$/,
  // CLAUDE_BIN, CLAUDE_CONFIG_DIR, CLAUDE_CODE_* feature flags.
  /^CLAUDE/,
];

/**
 * Allowlisted environment for spawned `claude` sessions. Everything not
 * matched is dropped — notably FIRECRAWL_API_KEY, UPRIVER_SUPABASE_*,
 * GITHUB/GH tokens, B2 and Resend keys.
 *
 * The ANTHROPIC_* credentials follow the same opt-in rule as the JSON-envelope
 * path: by default they are withheld so the CLI uses the operator's logged-in
 * Claude subscription; `UPRIVER_USE_API_KEY=1` forwards them explicitly
 * (required in containers, where no logged-in session exists).
 */
export function buildAgentEnv(): NodeJS.ProcessEnv {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(process.env)) {
    if (value !== undefined && ENV_ALLOWLIST.some((re) => re.test(key))) {
      env[key] = value;
    }
  }
  if (process.env['UPRIVER_USE_API_KEY']) {
    for (const key of ['ANTHROPIC_API_KEY', 'ANTHROPIC_AUTH_TOKEN', 'ANTHROPIC_BASE_URL']) {
      const value = process.env[key];
      if (value !== undefined) env[key] = value;
    }
  }
  return env;
}

/**
 * Drop Bash (and any other shell-equivalent tool) from a caller-supplied tool
 * list. Central enforcement so no call site can reintroduce a shell into a
 * session whose prompt carries untrusted content.
 */
export function sanitizeAgentTools(tools: string[]): string[] {
  return tools.filter((t) => t.trim().toLowerCase() !== 'bash');
}

export interface RunAgentOptions {
  prompt: string;
  /** Working directory for the session (the repo/worktree being edited). */
  cwd?: string;
  /** 'write' = file tools + acceptEdits; 'read' = read-only plan mode. */
  mode: 'write' | 'read';
  /** Stream agent output to the operator's terminal as it arrives. */
  echoStdout?: boolean;
  /** Hard kill ceiling. Default 20 min; env override UPRIVER_AGENT_TIMEOUT_MS. */
  timeoutMs?: number;
}

export interface RunAgentResult {
  stdout: string;
}

function resolveTimeoutMs(override?: number): number {
  if (override !== undefined && Number.isFinite(override) && override > 0) return override;
  const fromEnv = Number(process.env['UPRIVER_AGENT_TIMEOUT_MS']);
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv;
  return DEFAULT_TIMEOUT_MS;
}

/**
 * Spawn a headless Claude Code session over the prompt on stdin and resolve
 * with its captured stdout. Rejects on non-zero exit, spawn failure, or
 * timeout (SIGTERM, then SIGKILL after a 5s grace).
 */
export function runAgent(opts: RunAgentOptions): Promise<RunAgentResult> {
  const tools = opts.mode === 'write' ? AGENT_WRITE_TOOLS : AGENT_READ_TOOLS;
  const permissionMode = opts.mode === 'write' ? 'acceptEdits' : 'plan';
  const timeoutMs = resolveTimeoutMs(opts.timeoutMs);

  const args = [
    '--print',
    '--permission-mode',
    permissionMode,
    '--allowed-tools',
    sanitizeAgentTools(tools).join(','),
  ];

  return new Promise((resolveP, rejectP) => {
    const child = spawn(CLAUDE_BIN, args, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: buildAgentEnv(),
      ...(opts.cwd !== undefined ? { cwd: opts.cwd } : {}),
    });

    let stdout = '';
    let stderr = '';
    let timedOut = false;

    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => child.kill('SIGKILL'), 5_000).unref();
    }, timeoutMs);
    timer.unref();

    child.stdout.on('data', (d: Buffer) => {
      const s = d.toString('utf8');
      stdout += s;
      if (opts.echoStdout) process.stdout.write(s);
    });
    child.stderr.on('data', (d: Buffer) => {
      const s = d.toString('utf8');
      stderr += s;
      if (opts.echoStdout) process.stderr.write(s);
    });

    // EPIPE on a failed spawn must not crash the parent; rejection arrives
    // via the 'error'/'exit' handlers.
    child.stdin.on('error', () => {});
    child.stdin.write(opts.prompt);
    child.stdin.end();

    child.on('error', (err) => {
      clearTimeout(timer);
      rejectP(err);
    });
    child.on('exit', (code) => {
      clearTimeout(timer);
      if (timedOut) {
        rejectP(new Error(`claude agent timed out after ${Math.round(timeoutMs / 1000)}s`));
        return;
      }
      if (code === 0) {
        resolveP({ stdout });
        return;
      }
      const detail = stderr.trim().split('\n')[0] ?? '';
      rejectP(new Error(`claude exited ${code}${detail ? `: ${detail.slice(0, 300)}` : ''}`));
    });
  });
}
