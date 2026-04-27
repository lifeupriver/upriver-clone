#!/usr/bin/env node
// Validation harness for the Upriver pipeline.
// Usage: node scripts/validate.mjs <slug> --url <url> [--with-clone] [--include-scaffold-commits]
//
// Drives the CLI against a real client URL, times each step against the
// success-criteria budgets in claude-code-build-prompt-upriver-clone-v5.md,
// validates artifacts on disk, and (if Supabase is configured) totals
// Firecrawl credits + Claude API spend from usage_events.
//
// Out-of-band checks (Lighthouse, visual fidelity, live PR loop) are listed
// at the end as manual follow-ups — they require external infra that this
// script can't drive on its own.

import { spawn } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const CLI = join(ROOT, 'packages/cli/bin/run.js');

// ── argv ────────────────────────────────────────────────────────────────────
const argv = process.argv.slice(2);
const slug = argv.find((a) => !a.startsWith('--'));
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i !== -1 && argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : def;
};

if (!slug) {
  console.error(
    'usage: node scripts/validate.mjs <slug> --url <url> [--with-clone] [--include-scaffold-commits] [--skip-build]',
  );
  process.exit(2);
}

const url = opt('url');
if (!url) {
  console.error('--url is required (e.g. --url https://audreysfarmhouse.com)');
  process.exit(2);
}

const withClone = flag('with-clone');
const includeScaffoldCommits = flag('include-scaffold-commits');
const skipBuild = flag('skip-build');

const clientDir = join(ROOT, 'clients', slug);

// ── result tracking ─────────────────────────────────────────────────────────
const results = [];
function record(name, ok, ms, note) {
  results.push({ name, ok, ms, note });
  const dur = ms ? ` (${(ms / 1000).toFixed(1)}s)` : '';
  console.log(`  ${ok ? '✓' : '✗'} ${name}${dur}${note ? ` — ${note}` : ''}`);
}

function exec(cmd, args, opts = {}) {
  return new Promise((res) => {
    const child = spawn(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts });
    child.on('exit', (code) => res(code ?? 1));
    child.on('error', () => res(1));
  });
}

async function runStep(step) {
  console.log(`\n→ ${step.name}`);
  const start = performance.now();
  const code = await exec('node', [CLI, ...step.args]);
  const ms = performance.now() - start;
  if (code !== 0) {
    record(step.name, false, ms, `exit ${code}`);
    return false;
  }
  if (step.budgetMs && ms > step.budgetMs) {
    record(step.name, false, ms, `over budget (limit ${(step.budgetMs / 60000).toFixed(0)} min)`);
    return false;
  }
  const v = step.validate ? step.validate() : { ok: true };
  record(step.name, v.ok, ms, v.note);
  return v.ok;
}

const readJSON = (p) => JSON.parse(readFileSync(p, 'utf8'));

// ── steps ───────────────────────────────────────────────────────────────────
const steps = [
  {
    name: 'init',
    args: ['init', slug, '--url', url],
    validate: () =>
      existsSync(join(clientDir, 'client-config.yaml'))
        ? { ok: true, note: 'client-config.yaml' }
        : { ok: false, note: 'no client-config.yaml' },
  },
  {
    name: 'discover  [c1: <2 min, inventory + reviews]',
    args: ['discover', slug],
    budgetMs: 2 * 60_000,
    validate: () => {
      const inv = join(clientDir, 'content-inventory.json');
      if (!existsSync(join(clientDir, 'site-map.json'))) return { ok: false, note: 'no site-map.json' };
      if (!existsSync(inv)) return { ok: false, note: 'no content-inventory.json' };
      const pages = readJSON(inv).pages?.length ?? 0;
      const reviewsDir = join(clientDir, 'reviews');
      const reviewSources = existsSync(reviewsDir) ? readdirSync(reviewsDir).length : 0;
      if (pages < 1) return { ok: false, note: 'empty inventory' };
      if (reviewSources < 1) return { ok: false, note: `${pages} pages, no reviews source` };
      return { ok: true, note: `${pages} pages, ${reviewSources} review source(s)` };
    },
  },
  {
    name: 'scrape    [c2: <15 min, screenshots, design-tokens]',
    args: ['scrape', slug],
    budgetMs: 15 * 60_000,
    validate: () => {
      const tokensPath = join(clientDir, 'design-tokens.json');
      if (!existsSync(tokensPath)) return { ok: false, note: 'no design-tokens.json' };
      const tk = readJSON(tokensPath);
      const hasColors = tk.colors && Object.keys(tk.colors).length > 0;
      const hasTypography = tk.fonts || tk.typography;
      if (!hasColors) return { ok: false, note: 'design-tokens has no colors' };
      if (!hasTypography) return { ok: false, note: 'design-tokens has no fonts' };
      const shotDir = join(clientDir, 'screenshots');
      const shots = existsSync(shotDir)
        ? readdirSync(shotDir).filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
        : [];
      if (shots.length === 0) return { ok: false, note: 'no screenshots downloaded' };
      const pagesDir = join(clientDir, 'pages');
      const pageJson = existsSync(pagesDir) ? readdirSync(pagesDir).filter((f) => f.endsWith('.json')).length : 0;
      return { ok: true, note: `${pageJson} pages, ${shots.length} screenshots, tokens ok` };
    },
  },
  {
    name: 'audit     [c3: <10 min, 10 passes]',
    args: ['audit', slug],
    budgetMs: 10 * 60_000,
    validate: () => {
      const auditDir = join(clientDir, 'audit');
      if (!existsSync(auditDir)) return { ok: false, note: 'no audit/' };
      const passFiles = readdirSync(auditDir).filter((f) => f.endsWith('.json') && f !== 'summary.json');
      if (!existsSync(join(auditDir, 'summary.json'))) return { ok: false, note: 'no summary.json' };
      if (passFiles.length < 10) return { ok: false, note: `${passFiles.length}/10 passes` };
      return { ok: true, note: `${passFiles.length} passes + summary` };
    },
  },
  {
    name: 'synthesize  [c4: package + context + CLAUDE.md]',
    args: ['synthesize', slug],
    validate: () => {
      const checks = {
        'audit-package.json': join(clientDir, 'audit-package.json'),
        'product-marketing-context.md': join(clientDir, 'repo/.agents/product-marketing-context.md'),
        'CLAUDE.md': join(clientDir, 'repo/CLAUDE.md'),
        'brand-voice-guide.md': join(clientDir, 'docs/brand-voice-guide.md'),
      };
      for (const [label, p] of Object.entries(checks)) {
        if (!existsSync(p)) return { ok: false, note: `missing ${label}` };
      }
      const pkg = readJSON(checks['audit-package.json']);
      const required = ['meta', 'brandingProfile', 'designSystem', 'siteStructure', 'contentInventory', 'findings'];
      const missing = required.filter((k) => !(k in pkg));
      if (missing.length) return { ok: false, note: `audit-package.json missing: ${missing.join(',')}` };
      return {
        ok: true,
        note: `${pkg.findings.length} findings, score ${pkg.meta.overallScore}/100`,
      };
    },
  },
  {
    name: 'design-brief  [c5: deck-ready brief]',
    args: ['design-brief', slug],
    validate: () => {
      const p = join(clientDir, 'design-brief.md');
      if (!existsSync(p)) return { ok: false, note: 'no design-brief.md' };
      const size = statSync(p).size;
      if (size < 1500) return { ok: false, note: `brief too short (${size}b)` };
      return { ok: true, note: `${(size / 1024).toFixed(1)}kb` };
    },
  },
  {
    name: 'interview-prep',
    args: ['interview-prep', slug],
    validate: () => {
      const candidates = [
        join(clientDir, 'interview-guide.md'),
        join(clientDir, 'interview', 'guide.md'),
      ];
      const found = candidates.find(existsSync);
      return found ? { ok: true, note: 'guide produced' } : { ok: false, note: 'no interview guide file' };
    },
  },
  {
    name: 'scaffold  [c6: Astro repo materialized]',
    args: ['scaffold', slug],
    validate: () => {
      const repo = join(clientDir, 'repo');
      if (!existsSync(repo)) return { ok: false, note: 'no repo/' };
      const must = ['package.json', 'astro.config.mjs', 'src/content', 'CLAUDE.md', 'CHANGELOG.md'];
      const missing = must.filter((f) => !existsSync(join(repo, f)));
      if (missing.length) return { ok: false, note: `missing in repo: ${missing.join(',')}` };
      return { ok: true, note: 'repo scaffolded' };
    },
  },
  {
    name: 'astro build  [c6: scaffold compiles]',
    args: [], // custom — overridden below
    custom: async () => {
      const repo = join(clientDir, 'repo');
      const start = performance.now();
      const i = await exec('pnpm', ['install', '--prefer-offline'], { cwd: repo });
      if (i !== 0) return { ms: performance.now() - start, ok: false, note: 'pnpm install failed' };
      const b = await exec('pnpm', ['build'], { cwd: repo });
      return { ms: performance.now() - start, ok: b === 0, note: b === 0 ? 'astro build ok' : `astro build exit ${b}` };
    },
  },
  {
    name: 'launch-checklist  [s8 deliverable]',
    args: ['launch-checklist', slug],
    validate: () => {
      const candidates = [
        join(clientDir, 'launch-checklist.md'),
        join(clientDir, 'docs', 'launch-checklist.md'),
      ];
      const found = candidates.find(existsSync);
      return found ? { ok: true, note: 'checklist produced' } : { ok: false, note: 'no launch-checklist.md' };
    },
  },
];

if (includeScaffoldCommits) {
  steps.push(
    { name: 'scaffold github --commit', args: ['scaffold', 'github', slug, '--commit'] },
    { name: 'scaffold supabase --commit', args: ['scaffold', 'supabase', slug, '--commit'] },
    { name: 'scaffold deploy --commit', args: ['scaffold', 'deploy', slug, '--commit'] },
  );
}

if (withClone) {
  steps.push({
    name: 'clone --page /  [c8: copy-edit comments in PR]',
    args: ['clone', slug, '--page', '/'],
    validate: () => ({ ok: true, note: 'inspect the resulting PR for inline copy-edit comments (manual)' }),
  });
}

// ── run ─────────────────────────────────────────────────────────────────────
console.log(`\nValidating "${slug}" against ${url}`);
console.log(`Client artifacts → ${clientDir}\n`);

if (!skipBuild) {
  console.log('→ pnpm build (CLI)');
  const code = await exec('pnpm', ['-r', 'build']);
  if (code !== 0) {
    console.error('build failed; aborting');
    process.exit(1);
  }
}

const totalStart = performance.now();
let allPass = true;

for (const step of steps) {
  if (step.custom) {
    console.log(`\n→ ${step.name}`);
    const start = performance.now();
    const r = await step.custom();
    record(step.name, r.ok, r.ms ?? performance.now() - start, r.note);
    if (!r.ok) allPass = false;
    continue;
  }
  const ok = await runStep(step);
  if (!ok) allPass = false;
}

const totalMs = performance.now() - totalStart;

// ── usage aggregation (criteria 10–12) ──────────────────────────────────────
console.log('\n→ usage_events aggregation  [c10–c12]');
const supaUrl = process.env.UPRIVER_SUPABASE_URL;
const supaKey = process.env.UPRIVER_SUPABASE_SERVICE_KEY;

if (supaUrl && supaKey) {
  try {
    const since = new Date(Date.now() - totalMs - 10_000).toISOString();
    const q =
      `${supaUrl}/rest/v1/usage_events` +
      `?client_slug=eq.${encodeURIComponent(slug)}` +
      `&created_at=gte.${encodeURIComponent(since)}` +
      `&select=event_type,credits_used,input_tokens,output_tokens,cost_usd`;
    const res = await fetch(q, { headers: { apikey: supaKey, Authorization: `Bearer ${supaKey}` } });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const events = await res.json();
    const credits = events.reduce((s, e) => s + (e.credits_used ?? 0), 0);
    const cost = events.reduce((s, e) => s + (e.cost_usd ?? 0), 0);
    record('usage_events logged  [c10]', events.length > 0, 0, `${events.length} events`);
    record('Firecrawl credits < 300  [c11]', credits < 300, 0, `${credits} credits used`);
    record('Claude API cost < $10  [c12]', cost < 10, 0, `$${cost.toFixed(2)} total`);
    if (events.length === 0 || credits >= 300 || cost >= 10) allPass = false;
  } catch (e) {
    record('usage_events query', false, 0, `Supabase query failed: ${e.message}`);
    allPass = false;
  }
} else {
  console.log('  ⊘ skipped (UPRIVER_SUPABASE_URL/UPRIVER_SUPABASE_SERVICE_KEY not set)');
  console.log('     credit/token totals unverified — falls back to local log if scrape/audit wrote one');
}

// criterion 13: total wallclock < 4 hrs
const fourHours = 4 * 60 * 60_000;
record('Total wallclock < 4 hrs  [c13]', totalMs < fourHours, totalMs, `${(totalMs / 60_000).toFixed(1)} min`);
if (totalMs >= fourHours) allPass = false;

// ── summary ─────────────────────────────────────────────────────────────────
const pass = results.filter((r) => r.ok).length;
const fail = results.length - pass;

console.log('\n══════════════════════════════════════════════════════════════');
console.log(`SUMMARY: ${pass} passed, ${fail} failed in ${(totalMs / 60_000).toFixed(1)} min`);
console.log('══════════════════════════════════════════════════════════════');

if (fail) {
  console.log('\nFailures:');
  for (const r of results.filter((x) => !x.ok)) console.log(`  ✗ ${r.name} — ${r.note ?? ''}`);
}

console.log('\nNot covered by this harness — verify manually:');
const manual = [
  ['c1',  'GSC data present in clients/<slug>/gsc/ (only if GOOGLE_SERVICE_ACCOUNT_KEY set)'],
  ['c5',  'Brief usable in Claude Design in <30 min — open it and try'],
  ['c6',  'Lighthouse ≥95 desktop / ≥90 mobile on /  →  pnpm dlx lighthouse <preview-url>'],
  ['c6',  '/admin login works via Better Auth — boot the scaffolded repo and log in'],
  ['c6',  'All admin routes render (inquiries, reviews, requests, …) — click through'],
  ['c6',  'Service store loads catalog with Preferred pricing'],
  ['c6',  'Change-request form creates a real GitHub issue'],
  ['c7',  'Vercel preview visually resembles the original — eyeball comparison'],
  ['c8',  'First clone PR has inline copy-edit comments — gh pr view <PR#> --comments'],
  ['c9',  'Change request → draft PR + Vercel preview within 10 min — submit a real test request'],
];
for (const [crit, label] of manual) console.log(`  • [${crit}] ${label}`);

process.exit(allPass ? 0 : 1);
