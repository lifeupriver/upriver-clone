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
 *
 * Run from the repo root AFTER `pnpm build`: node scripts/cli-smoke.mjs
 */
import { readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const BIN = 'packages/cli/bin/run.js';
const COMMANDS_DIR = 'packages/cli/dist/commands';
const TIMEOUT_MS = 30_000;
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
    env: { ...process.env, ...env },
  });
  return { status: r.status, stdout: r.stdout ?? '', stderr: r.stderr ?? '', timedOut: r.error?.code === 'ETIMEDOUT' };
}

let failures = 0;
const flag = (ok, label, detail = '') => {
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok || !detail ? '' : ` — ${detail}`}`);
  if (!ok) failures++;
};

// ---- Pass 1: help matrix ----------------------------------------------------
const commands = [...walk(COMMANDS_DIR)].map(commandParts);
console.log(`# Pass 1: --help across ${commands.length} commands`);
for (const parts of commands) {
  const label = `help: ${parts.join(' ')}`;
  const r = invoke([...parts, '--help']);
  if (r.timedOut) { flag(false, label, 'timed out'); continue; }
  const trace = STACK_TRACE.test(r.stderr);
  flag(r.status === 0 && r.stdout.trim().length > 0 && !trace, label,
    `exit=${r.status} stdout=${r.stdout.trim().length}b${trace ? ' STACK-TRACE' : ''}`);
}

// ---- Pass 2: curated dry-run table -------------------------------------------
// Each row: [args, allowed exit codes, env]. Extend freely; keep keyless.
const LOCAL = { UPRIVER_DATA_SOURCE: 'local' };
const TABLE = [
  [['generate', 'littlefriends', '--all', '--dry-run'], [0], LOCAL],
  // 0 or 3 are both valid states of the littlefriends fixture; 1/2 are bugs.
  [['generate', 'littlefriends', '--all', '--dry-run', '--strict-provisioning'], [0, 3], LOCAL],
  // misuse guard (Spec 14): flag without --dry-run must be a clean oclif error.
  [['generate', 'littlefriends', '--all', '--strict-provisioning'], [2], LOCAL],
  [['run', 'all', 'wb-fixture', '--dry-run'], [0], LOCAL],
  [['doctor'], [0], {}],
];
console.log(`# Pass 2: curated dry-run table (${TABLE.length} rows)`);
for (const [args, allowed, env] of TABLE) {
  const label = `dry: ${args.join(' ')}`;
  const r = invoke(args, env);
  if (r.timedOut) { flag(false, label, 'timed out'); continue; }
  const trace = STACK_TRACE.test(r.stderr);
  flag(allowed.includes(r.status) && !trace, label,
    `exit=${r.status} (allowed ${allowed.join('/')})${trace ? ' STACK-TRACE' : ''}`);
}

console.log(failures ? `cli-smoke: ${failures} failure(s)` : 'cli-smoke: all green');
process.exit(failures ? 1 : 0);
