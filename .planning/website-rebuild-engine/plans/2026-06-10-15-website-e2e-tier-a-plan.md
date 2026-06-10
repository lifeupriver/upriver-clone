# Build Spec 15: Website e2e Tier A + CLI Smoke Matrix + CI — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the offline regression net from `.planning/website-rebuild-engine/specs/15-website-e2e-tier-a-spec.md`: a committed sanitized fixture, a Tier A website-pipeline harness (scaffold → build → finalize → fixes-plan), a subprocess-level CLI smoke matrix, and the repo's first test CI workflow.

**Architecture:** No production `packages/*` changes. Four additive artifacts: a force-added fixture tree (`clients/wb-fixture/`), two scripts mirroring the `e2e-littlefriends.sh` harness idiom, and one GitHub Actions workflow. Everything keyless and offline (the only network use is `pnpm install` from the registry).

**Tech Stack:** bash (harness), Node ESM script (smoke matrix), GitHub Actions, oclif CLI under test via `node packages/cli/bin/run.js` (space-separated topics — `topicSeparator: " "`, colon form does NOT work).

**Branch:** `build/15-website-e2e-tier-a` (exists; spec committed at `ed94362`).

**PREREQUISITE — PR #45 must be in the base.** The smoke matrix asserts the Build Spec 14 exit-code contract (`--strict-provisioning` → 3, misuse → 2, no stack traces), which lives in PR #45 (`build/14-fidelity-hardening`). Before Task 1: if PR #45 is merged, rebase this branch onto `origin/main`; if not merged yet, `git merge origin/build/14-fidelity-hardening` into this branch and note it in the changelog. Verify with: `git log --oneline | grep -q "P5b review fixes"`.

**Read first:** the spec (source of truth), `.planning/website-rebuild-e2e-scope.md` (Tier A definition), `scripts/e2e-littlefriends.sh` lines 1–60 (the harness idiom to mirror), `scripts/e2e-deploy-dryrun.sh` (its SOURCE contract is reused in CI).

**Grounded command contracts (verified by recon 2026-06-10 — re-verify only if a command errors):**
- `upriver scaffold <slug>` — offline; reads `audit-package.json` (required fields: `meta.clientName`, `designSystem`, `siteStructure.pages`, `contentInventory`), `client-config.yaml`, optional `design-tokens.json` / `pages/*.json` (records without a `url` field are silently dropped) / `typography-capture.json` / `assets/`. Writes `repo/` from `packages/scaffold-template/` incl. `repo/CLAUDE.md`, `repo/.agents/product-marketing-context.md`, `repo/package.json` (`build: astro build`), seeds `repo/src/content/pages/*.md` from `pages/*.json`.
- `upriver finalize <slug>` — offline by default (`--download-missing` is the only network path; do NOT pass it). Hard-requires `client-config.yaml` (`url:` field = the live domain to rewrite) AND `asset-manifest.json`. Rewrites `repo/src/**` in place; logs `Internal links rewritten: N` / `CDN images rewritten: N`; exits 0 even when N=0 — so the harness must assert rewrites occurred, not just that none remain.
- `upriver fixes plan <slug>` — deterministic (no LLM); requires `audit-package.json`; writes `clients/<slug>/fixes-plan.md` with `## Phase N — <name>` headers.
- `upriver run all <slug> --dry-run` — prints the stage list, exit 0 (errors before the dry-run check only if the client dir is missing).
- `upriver doctor` — always exits 0 (diagnostic, not a gate).
- `--help` never executes a command's `run()`, so even `dashboard` (a server) is smoke-safe under `--help`.

**Test commands:**
- Harness: `bash scripts/e2e-website-tier-a.sh` (full) / `bash scripts/e2e-website-tier-a.sh <phase>` (resume)
- Smoke: `node scripts/cli-smoke.mjs`
- Unit suites still green: `pnpm test` under node ≥21 (CI uses 22; locally use the tsc+find workaround if on node 20)

---

## File structure

| File | Responsibility |
|---|---|
| `clients/wb-fixture/audit-package.json` | trimmed+sanitized scaffold/fixes input (force-added) |
| `clients/wb-fixture/client-config.yaml` | fixture identity + `url: https://wildflour.example` |
| `clients/wb-fixture/design-tokens.json` | sanitized tokens |
| `clients/wb-fixture/asset-manifest.json` | CDN→local image mapping (drives finalize CDN rewrites) |
| `clients/wb-fixture/pages/*.json` (2–3) | page records WITH fixture-domain links + fixture-CDN image URLs |
| `scripts/e2e-website-tier-a.sh` | Tier A harness: phases, assertions, exit codes 11–15 |
| `scripts/cli-smoke.mjs` | help matrix + curated dry-run table + stack-trace tripwire |
| `.github/workflows/test.yml` | CI: build → unit suites → smoke → Tier A → deploy dry-run |
| spec file | DoD ticks + changelog (Task 5) |

---

### Task 1: The committed fixture — `clients/wb-fixture/`

**Files:**
- Create: `clients/wb-fixture/{audit-package.json, client-config.yaml, design-tokens.json, asset-manifest.json, pages/*.json}` (force-added)

This task derives the fixture from the local `clients/audreys/` run (real data, gitignored — NEVER commit it), trims it, sanitizes it, and proves it drives a full offline scaffold→finalize→fixes run. There is no unit test; the verification IS running the pipeline commands.

- [ ] **Step 1: Stage the raw copies (work in a scratch dir, not in clients/ yet)**

```bash
mkdir -p /tmp/wb-fixture/pages
cp clients/audreys/audit-package.json clients/audreys/design-tokens.json /tmp/wb-fixture/
cp clients/audreys/client-config.yaml /tmp/wb-fixture/
# pick 3 small pages — home plus two others (inspect sizes first: ls -laS clients/audreys/pages/ | tail)
cp clients/audreys/pages/home.json /tmp/wb-fixture/pages/
# choose 2 more by smallest size; adjust names to what exists:
cp clients/audreys/pages/<small-page-1>.json clients/audreys/pages/<small-page-2>.json /tmp/wb-fixture/pages/
```

- [ ] **Step 2: Trim audit-package.json to the fixture pages**

Write and run a one-off node script (do not commit it):

```bash
node - <<'EOF'
const { readFileSync, writeFileSync, readdirSync } = require('node:fs');
const dir = '/tmp/wb-fixture';
const pageFiles = readdirSync(`${dir}/pages`).map(f => JSON.parse(readFileSync(`${dir}/pages/${f}`, 'utf8')));
const keepUrls = new Set(pageFiles.map(p => new URL(p.url).pathname));
const pkg = JSON.parse(readFileSync(`${dir}/audit-package.json`, 'utf8'));
pkg.siteStructure.pages = pkg.siteStructure.pages.filter(p => keepUrls.has(new URL(p.url, 'https://x.example').pathname));
// keep ~8 findings spanning ≥2 priorities so fixes-plan emits multiple phases
pkg.findings = pkg.findings.slice(0, 8);
writeFileSync(`${dir}/audit-package.json`, JSON.stringify(pkg, null, 2));
console.log('pages kept:', pkg.siteStructure.pages.length, 'findings:', pkg.findings.length);
EOF
```

(If `siteStructure.pages[].url` are path-relative rather than absolute, adapt the filter — inspect the real shape first. The invariant that matters: every `siteStructure.pages` entry has a matching `pages/*.json`, and `meta`, `designSystem`, `contentInventory`, `findings` remain present.)

- [ ] **Step 3: Sanitize — global rewrites across every staged file**

Apply with sed/node over `/tmp/wb-fixture/**` (case-insensitive where relevant):
- `audreysfarmhouse.com` (and any www form) → `wildflour.example`
- business name (`Audrey's Farmhouse` and variants) → `Wildflour Bakery`
- `audreys` slug strings → `wb-fixture`
- phone patterns `\(?\d{3}\)?[ .-]?\d{3}[ .-]?\d{4}` → `(555) 010-0100`
- email addresses → `hello@wildflour.example`
- street addresses / person names in testimonials → fictional values (hand-edit; testimonials live in `audit-package.json` `contentInventory` and in page records)
- real CDN hosts in page image URLs and `asset-manifest.json` → `cdn.wildflour.example` (keep path/filename structure so manifest matching still works)
- `client-config.yaml`: `slug: wb-fixture`, `name: Wildflour Bakery`, `url: https://wildflour.example`
- `audit-package.json` `meta`: `clientName: Wildflour Bakery`, `siteUrl: https://wildflour.example`

- [ ] **Step 4: Guarantee the finalize assertions are exercisable**

Verify (and hand-edit page JSON if needed) that AFTER sanitization:
- ≥1 page record contains an internal link to `https://wildflour.example/<path>` (so finalize has internal links to rewrite)
- ≥1 page record contains an image URL on `cdn.wildflour.example` that has a matching entry in `asset-manifest.json` (so finalize has CDN rewrites to perform)

```bash
grep -rl 'wildflour\.example' /tmp/wb-fixture/pages/ | wc -l   # expect ≥1
grep -c 'cdn\.wildflour\.example' /tmp/wb-fixture/asset-manifest.json  # expect ≥1
```

If `clients/audreys/asset-manifest.json` is large, trim it to the entries referenced by the 3 fixture pages plus a handful.

- [ ] **Step 5: Scrub-verify the staged tree (the sanitization gate)**

```bash
grep -riE 'audrey|farmhouse' /tmp/wb-fixture/ && echo LEAK || echo CLEAN
grep -rE '\(?[0-9]{3}\)?[ .-][0-9]{3}[ .-][0-9]{4}' /tmp/wb-fixture/ | grep -v '555) 010' && echo LEAK || echo CLEAN
grep -riE '@(gmail|yahoo|aol|hotmail)|[a-z0-9._%+-]+@[a-z0-9.-]+\.(com|net|org)' /tmp/wb-fixture/ | grep -v 'wildflour.example' && echo LEAK || echo CLEAN
```

Expected: CLEAN ×3. Fix any LEAK by editing the offending file, re-run.

- [ ] **Step 6: Move into place and prove it drives the pipeline**

```bash
mkdir -p clients/wb-fixture && cp -R /tmp/wb-fixture/* clients/wb-fixture/
UPRIVER_DATA_SOURCE=local node packages/cli/bin/run.js scaffold wb-fixture
test -f clients/wb-fixture/repo/src/pages/index.astro && test -f clients/wb-fixture/repo/CLAUDE.md && echo SCAFFOLD-OK
grep -rl 'wildflour\.example' clients/wb-fixture/repo/src/ | head   # MUST be non-empty (links seeded into content)
UPRIVER_DATA_SOURCE=local node packages/cli/bin/run.js finalize wb-fixture
grep -r 'wildflour\.example' clients/wb-fixture/repo/src/ && echo RESIDUE || echo FINALIZE-OK
UPRIVER_DATA_SOURCE=local node packages/cli/bin/run.js fixes plan wb-fixture
grep -E '^#+ .*Phase' clients/wb-fixture/fixes-plan.md | head -3   # expect ≥1 line
```

Expected: SCAFFOLD-OK, non-empty grep before finalize, FINALIZE-OK, ≥1 Phase header. If scaffold crashes on a missing audit-package field, restore that field from audreys (sanitized) rather than stubbing it. If the pre-finalize grep is EMPTY, the fixture links didn't survive seeding — inspect how `seedPages()` carries page content into `repo/src/content/pages/*.md` and adjust which page-JSON fields hold the links (the links must live in a field scaffold seeds).

- [ ] **Step 7: Clean outputs and force-add ONLY the inputs**

```bash
rm -rf clients/wb-fixture/repo clients/wb-fixture/fixes-plan.md clients/wb-fixture/e2e
git add -f clients/wb-fixture/audit-package.json clients/wb-fixture/client-config.yaml \
  clients/wb-fixture/design-tokens.json clients/wb-fixture/asset-manifest.json clients/wb-fixture/pages/
git status --short   # expect ONLY clients/wb-fixture/ additions
git commit -m "Spec 15 Task 1: wb-fixture — sanitized offline fixture for the website pipeline"
```

---

### Task 2: Tier A harness — `scripts/e2e-website-tier-a.sh`

**Files:**
- Create: `scripts/e2e-website-tier-a.sh`

- [ ] **Step 1: Write the script**

```bash
#!/usr/bin/env bash
# Build Spec 15 Tier A: offline website-pipeline e2e against the committed
# wb-fixture. Proves scaffold -> (repo builds) -> finalize -> fixes-plan with
# mechanical assertions. No API keys, no LLM, no Firecrawl; the only network
# use is `pnpm install` inside the scaffolded repo.
#
# Usage: bash scripts/e2e-website-tier-a.sh [start-phase]
# Phases: fixture scaffold finalize fixes verify
# Exit codes: 0 pass; 11 fixture, 12 scaffold, 13 scaffold-build, 14 finalize, 15 fixes.
set -uo pipefail

SLUG=wb-fixture
ROOT="clients/$SLUG"
UPRIVER="node packages/cli/bin/run.js"
export UPRIVER_DATA_SOURCE=local
RUN_DIR="$ROOT/e2e"
LOG="$RUN_DIR/run.log"
mkdir -p "$RUN_DIR"

PHASES=(fixture scaffold finalize fixes verify)
START_PHASE="${1:-fixture}"

idx() { local i; for i in "${!PHASES[@]}"; do [ "${PHASES[$i]}" = "$1" ] && { echo "$i"; return; }; done; echo -1; }
[ "$(idx "$START_PHASE")" -ge 0 ] || { echo "unknown phase: $START_PHASE (use: ${PHASES[*]})"; exit 2; }
phase_ge() { [ "$(idx "$1")" -ge "$(idx "$START_PHASE")" ]; }

log() { echo "[tier-a] $*" | tee -a "$LOG"; }
run() {
  log "+ $*"
  "$@" 2>&1 | tee -a "$LOG"
  local rc=${PIPESTATUS[0]}
  log "(exit $rc)"
  return "$rc"
}
fail() { log "FAIL($2): $1"; exit "$2"; }

# ---- Phase: fixture — reset outputs, validate committed inputs -------------
if phase_ge fixture; then
  log "--- PHASE fixture ---"
  rm -rf "$ROOT/repo" "$ROOT/fixes-plan.md"
  for f in audit-package.json design-tokens.json asset-manifest.json; do
    [ -f "$ROOT/$f" ] || fail "missing input $f" 11
    node -e "JSON.parse(require('node:fs').readFileSync('$ROOT/$f','utf8'))" || fail "$f is not valid JSON" 11
  done
  [ -f "$ROOT/client-config.yaml" ] || fail "missing client-config.yaml" 11
  grep -q 'url: https://wildflour\.example' "$ROOT/client-config.yaml" || fail "client-config url is not the fixture domain" 11
  [ "$(ls "$ROOT"/pages/*.json 2>/dev/null | wc -l)" -ge 2 ] || fail "need >=2 pages/*.json" 11
fi

# ---- Phase: scaffold — generate repo/ and prove it builds ------------------
if phase_ge scaffold; then
  log "--- PHASE scaffold ---"
  run $UPRIVER scaffold $SLUG || fail "scaffold command failed" 12
  for f in repo/src/pages/index.astro repo/CLAUDE.md repo/.agents/product-marketing-context.md; do
    [ -f "$ROOT/$f" ] || fail "scaffold did not produce $f" 12
  done
  # The fixture must seed rewritable links, or the finalize assertions are vacuous.
  grep -rq 'wildflour\.example' "$ROOT/repo/src" || fail "no fixture-domain links seeded into repo/src — finalize phase would be vacuous" 12
  log "building the scaffolded repo (the only honest 'valid Astro' check)"
  ( cd "$ROOT/repo" && pnpm install --silent && pnpm build ) 2>&1 | tee -a "$LOG"
  [ "${PIPESTATUS[0]}" -eq 0 ] || fail "scaffolded repo does not build" 13
fi

# ---- Phase: finalize — links rewritten, none remain -------------------------
if phase_ge finalize; then
  log "--- PHASE finalize ---"
  run $UPRIVER finalize $SLUG || fail "finalize command failed" 14
  # finalize exits 0 even when it rewrites nothing — assert work happened:
  grep -Eq 'Internal links rewritten: [1-9]|CDN images rewritten: [1-9]' "$LOG" \
    || fail "finalize rewrote nothing (fixture must contain fixture-domain links + manifest-matched CDN URLs)" 14
  grep -rq 'wildflour\.example' "$ROOT/repo/src" && fail "fixture-domain URLs remain in repo/src after finalize" 14
  log "finalize assertions passed"
fi

# ---- Phase: fixes — deterministic plan with Phase sections ------------------
if phase_ge fixes; then
  log "--- PHASE fixes ---"
  run $UPRIVER fixes plan $SLUG || fail "fixes plan command failed" 15
  [ -f "$ROOT/fixes-plan.md" ] || fail "fixes-plan.md not written" 15
  grep -Eq '^#+ .*Phase' "$ROOT/fixes-plan.md" || fail "fixes-plan.md has no Phase section" 15
fi

# ---- Phase: verify ----------------------------------------------------------
if phase_ge verify; then
  log "--- PHASE verify ---"
  log "Tier A PASS: scaffold + build + finalize + fixes-plan all green."
fi
exit 0
```

Note the CDN-residue check is covered by the same `wildflour\.example` grep (the CDN host is `cdn.wildflour.example`, a subdomain of the fixture domain) — one grep asserts both.

- [ ] **Step 2: Syntax check, then run the failing-state check**

```bash
bash -n scripts/e2e-website-tier-a.sh   # silent
bash scripts/e2e-website-tier-a.sh
```

Expected: full PASS (exit 0) — Task 1 Step 6 already proved the pipeline. If any phase fails, the assertion message names it; fix the fixture (not the assertion) unless the assertion itself is wrong against the verified command contracts above.

- [ ] **Step 3: Prove the resume path and an exit code**

```bash
bash scripts/e2e-website-tier-a.sh fixes; echo "rc=$?"     # expect rc=0 (resumes mid-way, repo/ exists from the full run)
rm -rf clients/wb-fixture/repo
bash scripts/e2e-website-tier-a.sh finalize; echo "rc=$?"  # expect rc=14 (finalize without a repo fails with its code)
bash scripts/e2e-website-tier-a.sh                         # full run again -> rc=0, restores outputs
```

- [ ] **Step 4: Commit**

```bash
git add scripts/e2e-website-tier-a.sh
git commit -m "Spec 15 Task 2: Tier A harness — scaffold/build/finalize/fixes with mechanical assertions"
```

---

### Task 3: CLI smoke matrix — `scripts/cli-smoke.mjs`

**Files:**
- Create: `scripts/cli-smoke.mjs`

- [ ] **Step 1: Write the script**

```js
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
```

- [ ] **Step 2: Build, run, expect green**

```bash
pnpm build
node scripts/cli-smoke.mjs; echo "rc=$?"
```

Expected: `~73` Pass-1 lines + 5 Pass-2 lines, all `ok`, rc=0. If any command's `--help` legitimately fails (broken command discovered), that is a FINDING: record it for the changelog and fix it only if surgical; otherwise file it and add the command to a clearly-commented `KNOWN_BROKEN` skip-list in the script with the issue reference.

- [ ] **Step 3: Deliberate-bug check (proves the matrix guards the Spec 14 bug class)**

```bash
# revert the Spec 14 bin/run.js fix locally (NOT committed):
git stash list >/dev/null  # just to be safe about state
git show HEAD:packages/cli/bin/run.js > /tmp/run.js.good
sed -i '' 's/\.then(() => flush())\.catch(handle)//' packages/cli/bin/run.js
node scripts/cli-smoke.mjs; echo "rc=$?"   # expect rc=1: strict-provisioning rows fail (exit 1 + stack trace)
cp /tmp/run.js.good packages/cli/bin/run.js
git diff --stat packages/cli/bin/run.js    # expect: empty (restored)
node scripts/cli-smoke.mjs; echo "rc=$?"   # expect rc=0 again
```

(Adapt the sed to the file's real content — read it first; the goal is removing the `.catch(handle)` so ExitError leaks again. macOS sed needs `-i ''`.)

- [ ] **Step 4: Commit**

```bash
git add scripts/cli-smoke.mjs
git commit -m "Spec 15 Task 3: CLI smoke matrix — help across all commands + pinned dry-run exit codes"
```

---

### Task 4: CI workflow — `.github/workflows/test.yml`

**Files:**
- Create: `.github/workflows/test.yml`

- [ ] **Step 1: Write the workflow**

```yaml
name: test
# Build Spec 15: the repo's first test CI. Keyless by construction — no
# FIRECRAWL/ANTHROPIC/Supabase secrets may ever be added to this workflow;
# a step that needs a key belongs in a different (gated) workflow.
on:
  pull_request:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    timeout-minutes: 20
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22        # node --test globs need >=21
          cache: pnpm
      - name: Install
        run: pnpm install --frozen-lockfile
      - name: Build
        run: pnpm build
      - name: Unit suites (schemas, cli, core)
        run: pnpm test
      - name: CLI smoke matrix
        run: node scripts/cli-smoke.mjs
      - name: Website Tier A e2e
        run: bash scripts/e2e-website-tier-a.sh
      - name: Deploy dry-run e2e
        run: bash scripts/e2e-deploy-dryrun.sh wb-fixture
      - name: Upload Tier A log on failure
        if: failure()
        uses: actions/upload-artifact@v4
        with:
          name: tier-a-run-log
          path: clients/wb-fixture/e2e/run.log
          if-no-files-found: ignore
```

- [ ] **Step 2: Validate locally as far as possible**

```bash
command -v actionlint >/dev/null && actionlint .github/workflows/test.yml || echo "actionlint not installed — rely on the PR run"
# rehearse the exact CI step sequence locally (node>=21 required for pnpm test):
pnpm install --frozen-lockfile && pnpm build && node scripts/cli-smoke.mjs \
  && bash scripts/e2e-website-tier-a.sh && bash scripts/e2e-deploy-dryrun.sh wb-fixture; echo "rc=$?"
```

Expected: rc=0. (`e2e-deploy-dryrun.sh wb-fixture` copies the five fixture inputs to `clients/e2e-deploy/` and runs scaffold + the three deploy dry-runs itself — it does not need `repo/` to pre-exist. If it fails on a wb-fixture input, that is a FINDING; if not surgical to fix, drop that CI step and record why in the changelog, per the spec.)

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/test.yml
git commit -m "Spec 15 Task 4: test CI — unit suites + smoke matrix + Tier A + deploy dry-run, keyless"
```

---

### Task 5: Integration — full pass, DoD, changelog, PR

**Files:**
- Modify: `.planning/website-rebuild-engine/specs/15-website-e2e-tier-a-spec.md` (DoD + changelog)

- [ ] **Step 1: Full local pass of everything, in CI order**

```bash
pnpm install --frozen-lockfile && pnpm build && pnpm test \
  && node scripts/cli-smoke.mjs && bash scripts/e2e-website-tier-a.sh \
  && bash scripts/e2e-deploy-dryrun.sh wb-fixture; echo "ALL rc=$?"
```

(Under node 20 replace `pnpm test` with the per-package tsc+find workaround.) Expected: ALL rc=0.

- [ ] **Step 2: Final sanitization sweep over what is actually committed**

```bash
git ls-files clients/wb-fixture | xargs grep -liE 'audrey|farmhouse' && echo LEAK || echo CLEAN
```

Expected: CLEAN. A LEAK here is a hard stop — fix and re-commit before pushing.

- [ ] **Step 3: Close out the spec**

Tick every DoD checkbox in the spec that the steps above actually verified (the CI-green box stays unticked until the PR run passes — tick it after Step 5 by checking the PR). Append a changelog entry dated with today's date covering: findings the harness surfaced (broken commands, deploy-dryrun fit, scaffold quirks), the deliberate-bug check result, observed CI wall-clock (from the PR run), and any deviations (e.g. KNOWN_BROKEN skip-list entries, dropped CI steps).

```bash
git add .planning/website-rebuild-engine/specs/15-website-e2e-tier-a-spec.md
git commit -m "Build Spec 15: DoD verification + changelog"
```

- [ ] **Step 4: Push and open the PR**

```bash
git push -u origin build/15-website-e2e-tier-a
gh pr create --base main --title "Build Spec 15: website e2e Tier A + CLI smoke matrix + CI" \
  --body "$(cat <<'EOF'
Implements .planning/website-rebuild-engine/specs/15-website-e2e-tier-a-spec.md:

- clients/wb-fixture/ — sanitized, committed fixture (fictional Wildflour Bakery, wildflour.example domain) driving the offline website pipeline
- scripts/e2e-website-tier-a.sh — Tier A harness: scaffold -> repo actually builds -> finalize (rewrites asserted to happen AND complete) -> fixes-plan, distinct exit codes per phase
- scripts/cli-smoke.mjs — subprocess-level --help across all CLI commands + pinned dry-run exit codes + stack-trace tripwire (guards the Build Spec 14 bin/run.js bug class; deliberate-bug check verified)
- .github/workflows/test.yml — the repo's first test CI: unit suites + smoke + Tier A + deploy dry-run, keyless by construction

Tier B (live clone spine) is recorded in the spec with decisions made; it is Build Spec 16's scope.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 5: Confirm the workflow ran green on the PR, then tick the CI DoD box**

```bash
gh pr checks --watch
```

Expected: the `test` workflow passes. If it fails on a CI-environment difference (pnpm version pin, astro build memory, artifact path), fix forward in this branch — each fix is a normal commit. Then tick the remaining DoD box and push.

Stop after the PR is green; do not merge.

---

## Self-review notes (already applied)

- Spec coverage: fixture → Task 1; harness incl. build + finalize-work assertions + exit codes 11–15 → Task 2; smoke matrix incl. tripwire + deliberate-bug DoD → Task 3; CI incl. keyless rule + deploy dry-run fit-check → Task 4; DoD/changelog/PR + final scrub → Task 5. Tier B record needs no task (already in the spec).
- The finalize "rewrites happened" assertion parses the harness log for `rewritten: [1-9]` because finalize exits 0 on zero work (recon-verified) — the fixture-side guarantee for it is Task 1 Step 4.
- Space-separated command invocation everywhere (`fixes plan`, `run all`) — `topicSeparator: " "`; colon forms would fail.
