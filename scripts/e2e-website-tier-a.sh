#!/usr/bin/env bash
# Build Spec 15 Tier A: offline website-pipeline e2e against the committed
# wb-fixture. Proves scaffold -> (repo builds) -> finalize -> fixes-plan with
# mechanical assertions. No API keys, no LLM, no Firecrawl; the only network
# use is `pnpm install` inside the scaffolded repo.
#
# Usage: bash scripts/e2e-website-tier-a.sh [start-phase]
# Phases: fixture scaffold finalize fixes verify
#
# Exit codes: 0 pass; 2 preflight; 11 fixture, 12 scaffold, 13 scaffold-build,
# 14 finalize, 15 fixes.
#
# Resume notes: resume points are fixture/scaffold/fixes/verify. Starting at
# `finalize` with a fresh log re-runs finalize on an already-finalized repo —
# the counters would legitimately be 0 and the phase would fail. Resume from
# `scaffold` (which re-runs scaffold then finalize) or `fixes` (which skips
# the rewrite phases and only re-checks fixes-plan.md).
set -uo pipefail

SLUG=wb-fixture
ROOT="clients/$SLUG"
UPRIVER="node packages/cli/bin/run.js"
export UPRIVER_DATA_SOURCE=local
RUN_DIR="$ROOT/e2e"
LOG="$RUN_DIR/run.log"
mkdir -p "$RUN_DIR"
# Truncate log on every invocation so stale counter lines from a previous run
# can never satisfy the grep assertions.
: > "$LOG"

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

log "=== Tier A website-pipeline e2e start (from: $START_PHASE) ==="

# Preflight: the scaffolded repo's build needs Node >= 22 (native WebSocket).
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 22 ] || fail "node >=22 required (have $(node -v)); the scaffolded repo's build needs native WebSocket" 2

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
  log "fixture assertions passed"
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
  grep -rq 'wildflour-assets\.example' "$ROOT/repo/src" || fail "no fixture-CDN urls seeded into repo/src — the CDN rewrite pass would be vacuous" 12
  log "building the scaffolded repo (the only honest 'valid Astro' check)"
  # Use --ignore-workspace so pnpm installs into the scaffolded repo's own
  # node_modules, not the monorepo root. Capture build output to log.
  ( cd "$ROOT/repo" && pnpm install --ignore-workspace 2>&1 && pnpm build 2>&1 ) | tee -a "$LOG"
  BUILD_RC=${PIPESTATUS[0]}
  [ "$BUILD_RC" -eq 0 ] || fail "scaffolded repo does not build (pnpm exit $BUILD_RC)" 13
  log "scaffold assertions passed"
fi

# ---- Phase: finalize — both rewrite passes did work, none remains ----------
if phase_ge finalize; then
  log "--- PHASE finalize ---"
  run $UPRIVER finalize $SLUG || fail "finalize command failed" 14
  # finalize exits 0 even when it rewrites nothing — assert BOTH passes worked.
  # The finalize output pads the counter columns with spaces (e.g. "rewritten:     40")
  # so match .*[1-9] to handle any amount of whitespace before the non-zero digit.
  grep -Eq 'Internal links rewritten:.*[1-9]' "$LOG" \
    || fail "finalize rewrote no internal links (fixture must contain fixture-domain links)" 14
  grep -Eq 'CDN images rewritten:.*[1-9]' "$LOG" \
    || fail "finalize rewrote no CDN images (fixture must contain manifest-matched CDN URLs)" 14
  grep -rqE 'wildflour\.example|wildflour-assets\.example' "$ROOT/repo/src" \
    && fail "fixture-domain or fixture-CDN URLs remain in repo/src after finalize" 14
  log "finalize assertions passed"
fi

# ---- Phase: fixes — deterministic plan with Phase sections ------------------
if phase_ge fixes; then
  log "--- PHASE fixes ---"
  run $UPRIVER fixes plan $SLUG || fail "fixes plan command failed" 15
  [ -f "$ROOT/fixes-plan.md" ] || fail "fixes-plan.md not written" 15
  grep -Eq '^#+ .*Phase' "$ROOT/fixes-plan.md" || fail "fixes-plan.md has no Phase section" 15
  log "fixes assertions passed"
fi

# ---- Phase: verify ----------------------------------------------------------
if phase_ge verify; then
  log "--- PHASE verify ---"
  log "Tier A PASS: scaffold + build + finalize + fixes-plan all green."
fi
exit 0
