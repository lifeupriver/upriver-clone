#!/usr/bin/env node
/**
 * Dashboard deploy preflight — the "is it safe to deploy" gate (Build Spec 12 §A).
 *
 * Confirms the env contract is satisfied and the canonical Supabase store is
 * actually reachable, then prints a green/red checklist and exits non-zero on
 * ANY miss. Run it before promoting a hosted deploy:
 *
 *   node scripts/dashboard-preflight.mjs
 *
 * It reads process.env; if packages/dashboard/.env exists, unset keys are filled
 * from it first (so the operator can just fill in .env). On Vercel, the project's
 * env vars are already in process.env — no .env needed.
 *
 * Checks (when UPRIVER_DATA_SOURCE=supabase):
 *   1. every REQUIRED var is set,
 *   2. the storage bucket can be read AND written (list + upload + remove a probe),
 *   3. the rate_limit_hit RPC exists (the shared limiter is non-functional without
 *      it — see README-deploy.md §Supabase for the migration).
 *
 * Var names are the ones the CODE reads (PUBLISHABLE_KEY / SERVICE_KEY), matching
 * packages/dashboard/.env.example.
 */
import { createRequire } from 'node:module';
import { existsSync, readFileSync } from 'node:fs';

const DASHBOARD_PKG = new URL('../packages/dashboard/package.json', import.meta.url);
const DASHBOARD_ENV = new URL('../packages/dashboard/.env', import.meta.url);

// ── tiny .env loader (no dependency) ─────────────────────────────────────────
// Fills process.env for any key not already set. Vercel/CI set env directly, so
// this only matters for local runs.
function loadEnvFile(url) {
  if (!existsSync(url)) return;
  const text = readFileSync(url, 'utf8');
  for (const rawLine of text.split('\n')) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const eq = line.indexOf('=');
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (key && value !== '' && process.env[key] === undefined) {
      process.env[key] = value;
    }
  }
}

// ── checklist plumbing ───────────────────────────────────────────────────────
const results = [];
function pass(label, detail) {
  results.push({ ok: true, label, detail });
}
function fail(label, detail) {
  results.push({ ok: false, label, detail });
}

function serviceKey() {
  return (
    process.env['UPRIVER_SUPABASE_SERVICE_KEY'] ??
    process.env['UPRIVER_SUPABASE_SERVICE_ROLE_KEY']
  );
}

async function main() {
  loadEnvFile(DASHBOARD_ENV);

  const dataSource = process.env['UPRIVER_DATA_SOURCE'];
  if (dataSource !== 'supabase') {
    fail(
      'UPRIVER_DATA_SOURCE=supabase',
      `is "${dataSource ?? '(unset)'}". Preflight gates the HOSTED deploy; set it to "supabase".`,
    );
    return report();
  }
  pass('UPRIVER_DATA_SOURCE=supabase');

  // 1. Required vars. SERVICE_KEY accepts the SERVICE_ROLE_KEY alias (share-token.ts).
  const required = [
    ['UPRIVER_SUPABASE_URL', process.env['UPRIVER_SUPABASE_URL']],
    ['UPRIVER_SUPABASE_PUBLISHABLE_KEY', process.env['UPRIVER_SUPABASE_PUBLISHABLE_KEY']],
    ['UPRIVER_SUPABASE_SERVICE_KEY (or _SERVICE_ROLE_KEY)', serviceKey()],
    ['ANTHROPIC_API_KEY', process.env['ANTHROPIC_API_KEY']],
  ];
  for (const [name, value] of required) {
    if (value && String(value).trim() !== '') pass(`${name} is set`);
    else fail(`${name} is set`, 'missing or empty');
  }

  const bucket = process.env['UPRIVER_SUPABASE_BUCKET'] ?? 'upriver';
  pass(`UPRIVER_SUPABASE_BUCKET resolves`, `using "${bucket}"${process.env['UPRIVER_SUPABASE_BUCKET'] ? '' : ' (default)'}`);

  // Can't probe connectivity without URL + service key — stop here (already red).
  const url = process.env['UPRIVER_SUPABASE_URL'];
  const key = serviceKey();
  if (!url || !key) {
    fail('Supabase connectivity', 'skipped — URL and/or service key missing (see above)');
    return report();
  }

  // 2 + 3. Live probes against Supabase.
  let createClient;
  try {
    const require = createRequire(DASHBOARD_PKG);
    ({ createClient } = require('@supabase/supabase-js'));
  } catch (err) {
    fail('load @supabase/supabase-js', describe(err) + ' — run `pnpm install` first');
    return report();
  }
  const supa = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });

  // 2a. Bucket read.
  try {
    const { error } = await supa.storage.from(bucket).list('', { limit: 1 });
    if (error) throw error;
    pass(`storage bucket "${bucket}" readable`);
  } catch (err) {
    fail(`storage bucket "${bucket}" readable`, describe(err));
  }

  // 2b. Bucket write (upload a probe, then remove it).
  const probePath = `__preflight__/probe-${Date.now()}.txt`;
  try {
    const { error: upErr } = await supa.storage
      .from(bucket)
      .upload(probePath, new Blob([`preflight ${new Date().toISOString()}`]), { upsert: true });
    if (upErr) throw upErr;
    await supa.storage.from(bucket).remove([probePath]);
    pass(`storage bucket "${bucket}" writable`, 'wrote + removed a probe object');
  } catch (err) {
    fail(`storage bucket "${bucket}" writable`, describe(err));
  }

  // 3. rate_limit_hit RPC exists (the shared rate limiter depends on it).
  try {
    const { data, error } = await supa.rpc('rate_limit_hit', {
      p_bucket: `__preflight__:${Date.now()}`,
      p_window_start: new Date().toISOString(),
      p_ttl_seconds: 1,
    });
    if (error) throw error;
    if (typeof data !== 'number' && Number.isNaN(Number(data))) {
      throw new Error(`returned a non-numeric value: ${JSON.stringify(data)}`);
    }
    pass('rate_limit_hit RPC present', 'shared cross-instance limiter is live');
  } catch (err) {
    fail(
      'rate_limit_hit RPC present',
      describe(err) + ' — apply supabase/migrations/20260605000000_rate_limit_counters.sql',
    );
  }

  return report();
}

function describe(err) {
  if (!err) return 'unknown error';
  if (err instanceof Error) return err.message;
  if (typeof err === 'object' && 'message' in err) return String(err.message);
  return String(err);
}

function report() {
  const GREEN = '\x1b[32m';
  const RED = '\x1b[31m';
  const DIM = '\x1b[2m';
  const RESET = '\x1b[0m';
  const useColor = process.stdout.isTTY;
  const g = (s) => (useColor ? GREEN + s + RESET : s);
  const r = (s) => (useColor ? RED + s + RESET : s);
  const dim = (s) => (useColor ? DIM + s + RESET : s);

  process.stdout.write('\nDashboard deploy preflight\n──────────────────────────\n');
  let failures = 0;
  for (const { ok, label, detail } of results) {
    if (ok) {
      process.stdout.write(`  ${g('✓')} ${label}${detail ? '  ' + dim(detail) : ''}\n`);
    } else {
      failures += 1;
      process.stdout.write(`  ${r('✗')} ${label}${detail ? '  ' + r(detail) : ''}\n`);
    }
  }
  process.stdout.write('──────────────────────────\n');
  if (failures === 0) {
    process.stdout.write(`${g('PASS')} — ${results.length} checks green. Safe to deploy.\n`);
    process.exitCode = 0;
  } else {
    process.stdout.write(
      `${r('FAIL')} — ${failures} of ${results.length} checks red. NOT safe to deploy; fix the above.\n`,
    );
    process.exitCode = 1;
  }
}

main().catch((err) => {
  process.stderr.write(`preflight crashed: ${describe(err)}\n`);
  process.exitCode = 1;
});
