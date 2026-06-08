#!/usr/bin/env bash
# E2E (offline): scaffold → github → supabase → deploy, ALL in dry-run.
# Proves the scaffold/deploy orchestration (Astro repo generation + the three
# deploy plans) WITHOUT touching GitHub / Supabase / Vercel and WITHOUT any API
# keys. The three deploy commands default to dry-run; this script never passes
# --commit, so it can never create real infra.
#
# Fixture: copies the scaffold INPUTS (audit-package.json, design-tokens.json,
# client-config.yaml, pages/, asset-manifest.json) from a SOURCE client that has
# already been through the website pipeline's scrape→audit→synthesize stages.
# Default source is `audreys` (a local, gitignored real run). For a committed,
# CI-reproducible fixture, sanitize a minimal audit-package + 2-3 pages and point
# SOURCE at it (see .planning/website-rebuild-e2e-scope.md, Tier A).
#
# Usage: bash scripts/e2e-deploy-dryrun.sh [SOURCE_SLUG]
set -uo pipefail

SOURCE="${1:-audreys}"
SLUG=e2e-deploy
ROOT="clients/$SLUG"
LOG="$ROOT/run.log"
export UPRIVER_DATA_SOURCE=local
UPRIVER="node packages/cli/bin/run.js"

command -v node >/dev/null || { echo "Refusing: node not on PATH."; exit 1; }
[ -f "clients/$SOURCE/audit-package.json" ] || {
  echo "Refusing: source fixture clients/$SOURCE/audit-package.json not found."
  echo "Run the website pipeline for '$SOURCE' first, or pass a SOURCE_SLUG that has scaffold inputs."
  exit 1
}

fail() { echo "FAIL: $*" | tee -a "$LOG"; exit 1; }
log()  { echo "[$(date +%H:%M:%S)] $*" | tee -a "$LOG"; }

# ---- fixture: stage scaffold inputs into a throwaway slug -------------------
rm -rf "$ROOT"; mkdir -p "$ROOT"
log "=== deploy dry-run e2e — fixture from '$SOURCE' ==="
cp "clients/$SOURCE/audit-package.json" "clients/$SOURCE/design-tokens.json" \
   "clients/$SOURCE/client-config.yaml" "$ROOT/" || fail "could not copy inputs"
cp -R "clients/$SOURCE/pages" "$ROOT/pages" || fail "could not copy pages/"
[ -f "clients/$SOURCE/asset-manifest.json" ] && cp "clients/$SOURCE/asset-manifest.json" "$ROOT/"

# ---- scaffold (offline) ----------------------------------------------------
log "--- scaffold: generate Astro repo ---"
$UPRIVER scaffold "$SLUG" >>"$LOG" 2>&1 || fail "scaffold exited non-zero"
[ -d "$ROOT/repo/src/pages" ] || fail "scaffold did not create repo/src/pages"
[ -d "$ROOT/repo/supabase/migrations" ] || fail "scaffold did not create supabase/migrations"
log "scaffold OK — repo/ + supabase/migrations present"

# ---- the three deploy dry-runs (default = dry-run; NO --commit) -------------
assert_dryrun() {  # <cmd> <must-contain-1> <must-contain-2>
  local cmd=$1 m1=$2 m2=$3
  local out; out=$($UPRIVER scaffold "$cmd" "$SLUG" 2>&1)
  echo "$out" >>"$LOG"
  echo "$out" | grep -q "\[dry-run\]" || fail "scaffold $cmd: missing [dry-run] marker (did it run for real?)"
  echo "$out" | grep -qi "$m1" || fail "scaffold $cmd: expected plan to mention '$m1'"
  echo "$out" | grep -qi "$m2" || fail "scaffold $cmd: expected plan to mention '$m2'"
  echo "$out" | grep -qi "Run with --commit" || fail "scaffold $cmd: missing 'Run with --commit' guard"
  log "scaffold $cmd dry-run OK — printed plan, no infra touched"
}
log "--- github / supabase / deploy: dry-run plans ---"
assert_dryrun github   "Create GitHub repo" "git push"
assert_dryrun supabase "api.supabase.com"   "migration"
assert_dryrun deploy   "api.vercel.com"     "preview"

# ---- safety: confirm dry-run wrote no real-infra side effects --------------
log "--- verify: no real-infra side effects ---"
[ -f "$ROOT/.env.local" ]      && fail "dry-run wrote .env.local (should not)"
[ -f "$ROOT/vercel-url.txt" ]  && fail "dry-run wrote vercel-url.txt (should not)"
log "no .env.local / vercel-url.txt written — dry-run stayed dry"

log "=== deploy dry-run e2e COMPLETE — scaffold + 3 deploy plans, zero infra ==="
