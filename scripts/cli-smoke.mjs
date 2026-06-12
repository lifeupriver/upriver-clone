#!/usr/bin/env node
/**
 * Build Spec 15: subprocess-level CLI smoke matrix.
 *
 * Pass 1 — help matrix: every oclif command's `--help` must exit 0 with
 * non-empty stdout and no stack trace on stderr. This is the test class that
 * catches process-boundary bugs unit tests cannot see (Build Spec 14's
 * bin/run.js exit-code swallowing: 421 unit tests green, contract dead).
 *
 * Pass 2 — curated dry-run table: known invocations with pinned exit codes.
 *   Allowed exit codes: 0 = success, 2 = oclif usage error,
 *   3 = --strict-provisioning gap exit.
 *
 * Runs sequentially by design (~1 min budget for current command count;
 * revisit if command count triples).
 *
 * Run from the repo root AFTER `pnpm build`: node scripts/cli-smoke.mjs
 */
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const BIN = 'packages/cli/bin/run.js';
const COMMANDS_DIR = 'packages/cli/dist/commands';
const TIMEOUT_MS = 30_000;
// Note: Node Experimental/Deprecation warnings on stderr could trip this check.
const STACK_TRACE = /\bat .+\.[cm]?js:\d+/; // raw ExitError/uncaught leak signature

if (!existsSync(COMMANDS_DIR)) {
  console.error(`cli-smoke: ${COMMANDS_DIR} not found — run pnpm build first`);
  process.exit(2);
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else if (p.endsWith('.js') && !p.endsWith('.test.js')) yield p;
  }
}

/** dist/commands/profile/set.js -> ['profile','set']; dashboard/index.js -> ['dashboard'] */
function commandParts(file) {
  const parts = relative(COMMANDS_DIR, file).replace(/\.js$/, '').split('/');
  if (parts.at(-1) === 'index') parts.pop();
  return parts;
}

function invoke(args, env = {}) {
  const r = spawnSync('node', [BIN, ...args], {
    timeout: TIMEOUT_MS,
    encoding: 'utf8',
    maxBuffer: 8 * 1024 * 1024,
    env: { ...process.env, ...env },
  });
  return {
    status: r.status,
    stdout: r.stdout ?? '',
    stderr: r.stderr ?? '',
    timedOut: r.error?.code === 'ETIMEDOUT',
    errorCode: r.error?.code ?? null,
  };
}

const failedLabels = [];

/**
 * @param {boolean} ok
 * @param {string} label
 * @param {string} detail
 * @param {string} stderr  — captured stderr (printed up to 10 lines on failure)
 * @param {string|null} reproduceLine  — full reproduce command (Pass 2 only)
 */
const flag = (ok, label, detail = '', stderr = '', reproduceLine = null) => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) {
    failures++;
    failedLabels.push(label);
    if (stderr.trim().length > 0) {
      const lines = stderr.trimEnd().split('\n').slice(0, 10);
      for (const line of lines) console.log(`    stderr: ${line}`);
    }
    if (reproduceLine) {
      console.log(`    reproduce: ${reproduceLine}`);
    }
  }
};

let failures = 0;

// ---- Pass 1: help matrix ----------------------------------------------------
const commands = [...walk(COMMANDS_DIR)].map(commandParts);
console.log(`# Pass 1: --help across ${commands.length} commands`);
for (const parts of commands) {
  const label = `help: ${parts.join(' ')}`;
  const r = invoke([...parts, '--help']);
  if (r.timedOut) { flag(false, label, 'timed out', r.stderr); continue; }
  const trace = STACK_TRACE.test(r.stderr);
  const ok = r.status === 0 && r.stdout.trim().length > 0 && !trace;
  flag(ok, label,
    `exit=${r.status} stdout=${r.stdout.trim().length}b${trace ? ' STACK-TRACE' : ''}`,
    r.stderr);
}

// ---- Pass 2: curated dry-run table -------------------------------------------
// Each row: [args, allowed exit codes, env]. Extend freely; keep keyless.
// Allowed exit codes: 0 = success, 2 = oclif usage error,
// 3 = --strict-provisioning gap exit.
const LOCAL = { UPRIVER_DATA_SOURCE: 'local' };
const TABLE = [
  [['generate', 'littlefriends', '--all', '--dry-run'], [0], LOCAL],
  // 0 or 3 are both valid states of the littlefriends fixture; 1/2 are bugs.
  [['generate', 'littlefriends', '--all', '--dry-run', '--strict-provisioning'], [0, 3], LOCAL],
  // misuse guard (Spec 14): flag without --dry-run must be a clean oclif error.
  [['generate', 'littlefriends', '--all', '--strict-provisioning'], [2], LOCAL],
  [['run', 'all', 'wb-fixture', '--dry-run'], [0], LOCAL],
  // Spec 19: the pitch plan + cost table must stay keyless and offline.
  [['pitch', 'run', 'https://wildflour.example', '--dry-run'], [0], LOCAL],
  [['generate', 'littlefriends', '--doc', 'doc-pitch-02', '--dry-run'], [0], LOCAL],
  [['doctor'], [0], {}],
];
console.log(`# Pass 2: curated dry-run table (${TABLE.length} rows)`);
for (const [args, allowed, env] of TABLE) {
  // Build env prefix string for reproducible label (e.g. "UPRIVER_DATA_SOURCE=local ")
  const envPrefix = Object.entries(env).map(([k, v]) => `${k}=${v}`).join(' ');
  const envDisplay = envPrefix ? `${envPrefix} ` : '';
  const label = `dry: ${envDisplay}${args.join(' ')}`;
  const r = invoke(args, env);
  if (r.timedOut) {
    flag(false, label, 'timed out', r.stderr);
    continue;
  }
  const trace = STACK_TRACE.test(r.stderr);
  const ok = allowed.includes(r.status) && !trace;
  let detail = `exit=${r.status} (allowed ${allowed.join('/')})${trace ? ' STACK-TRACE' : ''}`;
  if (!ok && r.status === null && !r.timedOut && r.errorCode) {
    detail += ` spawn-error=${r.errorCode}`;
  }
  const reproduceLine = ok
    ? null
    : `${envDisplay}node ${BIN} ${args.join(' ')}`;
  flag(ok, label, detail, r.stderr, reproduceLine);
}

// ---- Summary -----------------------------------------------------------------
if (failures) {
  console.log(`cli-smoke: ${failures} failure(s):`);
  for (const lbl of failedLabels) console.log(`  ${lbl}`);
} else {
  console.log('cli-smoke: all green');
}
process.exit(failures ? 1 : 0);
