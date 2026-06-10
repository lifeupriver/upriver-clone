#!/usr/bin/env bash
# Build Spec 16 Tier B: live website-pipeline e2e against the hosted fixture
# site (Wildflour Bakery, noindex-enforced). Proves the full live spine
# init -> discover -> scrape -> audit -> synthesize -> scaffold -> clone ->
# finalize -> capture (clone-qa) -> fidelity -> fixes-plan, unattended, with
# mechanical artifact checkpoints per phase. Every stage is a real subprocess
# of `node packages/cli/bin/run.js`.
#
# THIS HARNESS COSTS REAL MONEY: one Firecrawl map + ~4-page scrape (credits)
# plus ~3 headless clone sessions (the dominant cost). It must NEVER be wired
# into the keyless test.yml — it runs only via the workflow_dispatch-only
# e2e-website-tier-b.yml or by hand.
#
# Usage: bash scripts/e2e-website-tier-b.sh [start-phase]
# Phases: preflight init discover scrape audit synthesize scaffold clone
#         finalize capture fidelity fixes report
#
# Exit codes: 0 pass; 2 preflight/bad-arg; 21 init, 22 discover, 23 scrape,
# 24 audit, 25 synthesize, 26 scaffold(+install/build), 27 clone, 28 finalize,
# 29 capture, 30 fidelity, 31 fixes, 32 report. Deliberately disjoint from
# Tier A's 11-16 so a bare CI exit code identifies both harness and phase.
#
# Env: FIRECRAWL_API_KEY  required (discover/scrape bill Firecrawl credits)
#      CLAUDE_BIN         claude CLI binary            (default: claude)
#      WB_LIVE_URL        scrape target                (default: https://upriver-wb-fixture.vercel.app)
#      WB_FIDELITY_BAR    per-page overall-score gate  (default: 70, spec 16 §5 provisional)
#      WB_CLONE_PAGES     space-separated page paths   (default: "/ /about /weddings")
#
# Resume notes: resuming mid-pipeline requires the earlier phases' artifacts
# to already exist under clients/wb-live (e.g. starting at `scaffold` needs a
# prior synthesize's audit-package.json; `capture` needs a cloned repo).
# Starting after `preflight` skips the key/URL/playwright checks (node/pnpm
# are always checked). `report` only summarizes a completed run — it exits 32
# if clone-qa/summary.json or fixes-plan.md are missing.
set -uo pipefail

# Anchor to repo root regardless of where the caller invoked the script from.
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Always-run preflight: free, local, needed by every phase.
command -v node  >/dev/null || { echo "node not found on PATH";  exit 2; }
command -v pnpm  >/dev/null || { echo "pnpm not found on PATH";  exit 2; }

# The scaffolded repo's build needs Node >= 22 (native WebSocket).
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 22 ] || { echo "node >=22 required (have $(node -v)); the scaffolded repo's build needs native WebSocket"; exit 2; }

SLUG=wb-live
ROOT="clients/$SLUG"
UPRIVER="node packages/cli/bin/run.js"
export UPRIVER_DATA_SOURCE=local
RUN_DIR="$ROOT/e2e"
LOG="$RUN_DIR/run.log"

WB_LIVE_URL="${WB_LIVE_URL:-https://upriver-wb-fixture.vercel.app}"
WB_FIDELITY_BAR="${WB_FIDELITY_BAR:-70}"
WB_CLONE_PAGES="${WB_CLONE_PAGES:-/ /about /weddings}"
CLAUDE_BIN="${CLAUDE_BIN:-claude}"

# Hoisted live-host literals — used in the finalize residue check.
WB_LIVE_HOST="${WB_LIVE_URL#*://}"
WB_LIVE_HOST="${WB_LIVE_HOST%%/*}"
WB_LIVE_HOST_RE="${WB_LIVE_HOST//./\\.}"

PREVIEW_PORT=5323
SUMMARY="$ROOT/clone-qa/summary.json"

PHASES=(preflight init discover scrape audit synthesize scaffold clone finalize capture fidelity fixes report)
START_PHASE="${1:-preflight}"

idx() { local i; for i in "${!PHASES[@]}"; do [ "${PHASES[$i]}" = "$1" ] && { echo "$i"; return; }; done; echo -1; }

# Validate start-phase BEFORE truncating the log (a bad phase arg must not
# destroy a previous green run's log).
[ "$(idx "$START_PHASE")" -ge 0 ] || { echo "unknown phase: $START_PHASE (use: ${PHASES[*]})"; exit 2; }

mkdir -p "$RUN_DIR"
# Truncate log on every invocation so stale counter lines from a previous run
# can never satisfy the grep assertions.
: > "$LOG"

phase_ge() { [ "$(idx "$1")" -ge "$(idx "$START_PHASE")" ]; }

log() { echo "[tier-b] $*" | tee -a "$LOG"; }
run() {
  log "+ $*"
  "$@" 2>&1 | tee -a "$LOG"
  local rc=${PIPESTATUS[0]}
  log "(exit $rc)"
  return "$rc"
}
fail() { log "FAIL($2): $1"; exit "$2"; }

# Wall-clock per phase, surfaced by the report phase.
TIMINGS=()
phase_begin() { PHASE_T0=$SECONDS; log "--- PHASE $1 ---"; }
phase_end()   { TIMINGS+=("phase $1: $((SECONDS - PHASE_T0))s"); }

# JSON predicate assert: $1 = file, $2 = JS predicate over parsed `d`.
# Exits non-zero on missing file, parse failure, or false predicate.
json_assert() {
  node -e 'const d=JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8"));process.exit(eval(process.argv[2])?0:1)' "$1" "$2" 2>/dev/null
}

# Page-path mapping. clone writes "/" -> index.astro, "/about" -> about.astro;
# clone-qa/clone-fidelity screenshot slugs map index -> home.
page_to_astro() { if [ "$1" = "/" ]; then echo index.astro; else echo "${1#/}.astro"; fi; }
page_to_slug()  { if [ "$1" = "/" ]; then echo home; else echo "${1#/}"; fi; }

# The preview server (capture phase) must never outlive the harness, even on
# a mid-phase fail exit.
PREVIEW_PID=""
stop_preview() {
  if [ -n "${PREVIEW_PID:-}" ]; then
    pkill -P "$PREVIEW_PID" 2>/dev/null
    kill "$PREVIEW_PID" 2>/dev/null
    wait "$PREVIEW_PID" 2>/dev/null
    PREVIEW_PID=""
  fi
}
trap stop_preview EXIT

log "=== Tier B website-pipeline e2e start (from: $START_PHASE, target: $WB_LIVE_URL) ==="

# ---- Phase: preflight — keys, tools, and the target must look like ours ----
if phase_ge preflight; then
  phase_begin preflight
  [ -n "${FIRECRAWL_API_KEY:-}" ] \
    || fail "FIRECRAWL_API_KEY is not set (required: discover/scrape bill Firecrawl credits)" 2
  command -v "$CLAUDE_BIN" >/dev/null \
    || fail "claude CLI not found ('$CLAUDE_BIN' not on PATH); npm i -g @anthropic-ai/claude-code or set CLAUDE_BIN" 2
  ( cd packages/cli && node -e "import('playwright').then(()=>process.exit(0),()=>process.exit(1))" ) \
    || fail "playwright not importable from packages/cli — run: pnpm --filter @upriver/cli exec playwright install chromium" 2
  command -v curl >/dev/null || fail "curl not found on PATH (preflight URL check needs it)" 2
  HEADERS=$(curl -fsSIL "$WB_LIVE_URL") \
    || fail "WB_LIVE_URL not reachable: $WB_LIVE_URL" 2
  printf '%s\n' "$HEADERS" | grep -q 'HTTP/.* 200' \
    || fail "WB_LIVE_URL did not return HTTP 200: $WB_LIVE_URL" 2
  # Refuse to scrape anything that is not noindex-serving: the harness must
  # never be pointed at a site we don't own. Header first; meta-tag fallback.
  if ! printf '%s\n' "$HEADERS" | grep -qi 'x-robots-tag:.*noindex'; then
    curl -fsSL "$WB_LIVE_URL" | grep -i 'name="robots"' | grep -qi 'noindex' \
      || fail "target does not look like the noindex fixture site (no x-robots-tag header or robots meta with noindex): $WB_LIVE_URL" 2
  fi
  log "preflight passed"
  phase_end preflight
fi

# ---- Phase: init — fresh client dir from the live URL ----------------------
if phase_ge init; then
  phase_begin init
  # rm -rf takes the whole client dir, including this run's log — stash the
  # log so the preflight lines survive into the run report.
  TMP_LOG=$(mktemp)
  cp "$LOG" "$TMP_LOG"
  rm -rf "$ROOT"
  mkdir -p "$RUN_DIR"
  mv "$TMP_LOG" "$LOG"
  run $UPRIVER init "$WB_LIVE_URL" --slug "$SLUG" --name "Wildflour Bakery" --vertical wedding-venue \
    || fail "init command failed" 21
  [ -f "$ROOT/client-config.yaml" ] || fail "init did not write client-config.yaml" 21
  grep -E '^url:' "$ROOT/client-config.yaml" | grep -qF "$WB_LIVE_URL" \
    || fail "client-config.yaml url: line does not contain $WB_LIVE_URL" 21
  json_assert "$ROOT/site-map.json" 'Array.isArray(d.urls)&&d.urls.length>=1' \
    || fail "site-map.json missing, unparsable, or has no entries in urls[]" 21
  phase_end init
fi

# ---- Phase: discover — content inventory from the live site ----------------
if phase_ge discover; then
  phase_begin discover
  run $UPRIVER discover "$SLUG" || fail "discover command failed" 22
  [ -f "$ROOT/content-inventory.json" ] || fail "discover did not write content-inventory.json" 22
  json_assert "$ROOT/content-inventory.json" 'true' || fail "content-inventory.json is not valid JSON" 22
  phase_end discover
fi

# ---- Phase: scrape — pages, tokens, assets, screenshots, raw HTML ----------
if phase_ge scrape; then
  phase_begin scrape
  run $UPRIVER scrape "$SLUG" || fail "scrape command failed" 23
  [ "$(ls "$ROOT"/pages/*.json 2>/dev/null | wc -l)" -ge 3 ] || fail "need >=3 pages/*.json after scrape" 23
  for f in design-tokens.json asset-manifest.json; do
    json_assert "$ROOT/$f" 'true' || fail "$f missing or not valid JSON" 23
  done
  [ "$(ls "$ROOT"/screenshots/desktop/*.png 2>/dev/null | wc -l)" -ge 3 ] || fail "need >=3 screenshots/desktop/*.png after scrape" 23
  [ "$(ls "$ROOT"/rawhtml/*.html 2>/dev/null | wc -l)" -ge 3 ] || fail "need >=3 rawhtml/*.html after scrape" 23
  phase_end scrape
fi

# ---- Phase: audit — base mode only (LLM passes are not the spine) ----------
if phase_ge audit; then
  phase_begin audit
  run $UPRIVER audit "$SLUG" --mode base || fail "audit command failed" 24
  json_assert "$ROOT/audit/summary.json" 'd.passes_completed>=1' \
    || fail "audit/summary.json missing, unparsable, or passes_completed < 1" 24
  phase_end audit
fi

# ---- Phase: synthesize — audit-package.json is the scaffold contract -------
if phase_ge synthesize; then
  phase_begin synthesize
  run $UPRIVER synthesize "$SLUG" || fail "synthesize command failed" 25
  AP="$ROOT/audit-package.json"
  [ -f "$AP" ] || fail "synthesize did not write audit-package.json" 25
  json_assert "$AP" 'true' || fail "audit-package.json is not valid JSON" 25
  # Each scaffold-contract field asserted individually so a failure names the
  # missing field (scaffold hard-crashes without any one of these).
  json_assert "$AP" 'typeof d.meta?.clientName==="string"' \
    || fail "audit-package.json missing meta.clientName (string) — scaffold contract" 25
  json_assert "$AP" 'd.designSystem!==null&&typeof d.designSystem==="object"' \
    || fail "audit-package.json missing designSystem (object) — scaffold contract" 25
  json_assert "$AP" 'Array.isArray(d.siteStructure?.pages)&&d.siteStructure.pages.length>=3' \
    || fail "audit-package.json siteStructure.pages missing or has <3 pages — scaffold contract" 25
  json_assert "$AP" 'd.contentInventory!=null' \
    || fail "audit-package.json missing contentInventory — scaffold contract" 25
  [ -f "$ROOT/repo/CLAUDE.md" ] || fail "synthesize did not produce repo/CLAUDE.md" 25
  phase_end synthesize
fi

# ---- Phase: scaffold — generate repo/ and prove it builds -------------------
if phase_ge scaffold; then
  phase_begin scaffold
  run $UPRIVER scaffold "$SLUG" || fail "scaffold command failed" 26
  for f in repo/src/pages/index.astro repo/CLAUDE.md repo/.agents/product-marketing-context.md; do
    [ -f "$ROOT/$f" ] || fail "scaffold did not produce $f" 26
  done
  log "installing dependencies in scaffolded repo"
  # Use --ignore-workspace so pnpm installs into the scaffolded repo's own
  # node_modules, not the monorepo root. --frozen-lockfile requires the
  # template's pnpm-lock.yaml to have been committed and copied by scaffold.
  ( cd "$ROOT/repo" && pnpm install --ignore-workspace --frozen-lockfile --silent 2>&1 ) | tee -a "$LOG"
  INSTALL_RC=${PIPESTATUS[0]}
  if [ "$INSTALL_RC" -ne 0 ]; then
    log "pnpm install failed — retrying once (likely network)"
    ( cd "$ROOT/repo" && pnpm install --ignore-workspace --frozen-lockfile --silent 2>&1 ) | tee -a "$LOG"
    INSTALL_RC=${PIPESTATUS[0]}
    [ "$INSTALL_RC" -eq 0 ] || fail "pnpm install failed twice — likely registry/network, retry the job" 26
  fi
  log "install succeeded; building the scaffolded repo (the only honest 'valid Astro' check)"
  ( cd "$ROOT/repo" && pnpm build 2>&1 ) | tee -a "$LOG"
  BUILD_RC=${PIPESTATUS[0]}
  [ "$BUILD_RC" -eq 0 ] || fail "scaffolded repo does not build (astro build failed)" 26
  phase_end scaffold
fi

# ---- Phase: clone — one headless agent session per page --------------------
if phase_ge clone; then
  phase_begin clone
  # mtime snapshot: anything the clone agent (re)writes must end up newer than
  # this marker, or the agent "succeeded" without touching the page file.
  CLONE_MARKER="$RUN_DIR/.pre-clone-marker"
  touch "$CLONE_MARKER"
  # Deliberate word-split: WB_CLONE_PAGES is a space-separated path list.
  for p in $WB_CLONE_PAGES; do
    run $UPRIVER clone "$SLUG" --page "$p" --no-pr --no-worktree --no-verify \
      || fail "clone command failed for page $p" 27
    ASTRO="$(page_to_astro "$p")"
    [ -f "$ROOT/repo/src/pages/$ASTRO" ] \
      || fail "clone for page $p did not produce repo/src/pages/$ASTRO" 27
    [ "$ROOT/repo/src/pages/$ASTRO" -nt "$CLONE_MARKER" ] \
      || fail "clone for page $p did not modify repo/src/pages/$ASTRO (mtime not newer than pre-clone marker)" 27
  done
  phase_end clone
fi

# ---- Phase: finalize — live-host residue is the hard gate -------------------
if phase_ge finalize; then
  phase_begin finalize
  run $UPRIVER finalize "$SLUG" --download-missing || fail "finalize command failed" 28
  # HARD: zero references to the live host may survive in the cloned source.
  grep -rqE "$WB_LIVE_HOST_RE" "$ROOT/repo/src" \
    && fail "live host $WB_LIVE_HOST still referenced in repo/src after finalize" 28
  # SOFT: the clone agent may legitimately emit only relative links, in which
  # case pass-1 has nothing to rewrite — warn and record, don't fail.
  grep -Eq 'Internal links rewritten:.*[1-9]' "$LOG" \
    || log "WARN: finalize rewrote 0 internal links (clone may have emitted only relative links) — recorded for the run report"
  # The CDN-images counter is deliberately NOT asserted here: the fixture's
  # assets are same-host, so the internal-link pass-1 consumes them and the
  # manifest-keyed CDN pass legitimately rewrites 0. Tier A owns that counter
  # (its fixture seeds CDN-host URLs specifically to exercise the pass).
  phase_end finalize
fi

# ---- Phase: capture — build, preview, clone-qa screenshots ------------------
if phase_ge capture; then
  phase_begin capture
  ( cd "$ROOT/repo" && pnpm build 2>&1 ) | tee -a "$LOG"
  [ "${PIPESTATUS[0]}" -eq 0 ] || fail "repo build failed before preview" 29
  log "starting preview server on :$PREVIEW_PORT"
  ( cd "$ROOT/repo" && exec nohup pnpm preview --port "$PREVIEW_PORT" ) >>"$LOG" 2>&1 &
  PREVIEW_PID=$!
  READY=0
  for _ in $(seq 1 30); do
    if curl -fso /dev/null "http://localhost:$PREVIEW_PORT"; then READY=1; break; fi
    sleep 1
  done
  # fail exits the script; the EXIT trap kills the server on every path.
  [ "$READY" -eq 1 ] || fail "preview server not ready on :$PREVIEW_PORT after 30s" 29
  run $UPRIVER clone-qa "$SLUG" --port "$PREVIEW_PORT" || fail "clone-qa command failed" 29
  stop_preview
  for p in $WB_CLONE_PAGES; do
    PNG="$(page_to_slug "$p").png"
    [ -f "$ROOT/clone-qa/desktop/$PNG" ] \
      || fail "clone-qa did not produce desktop/$PNG for page $p" 29
  done
  phase_end capture
fi

# ---- Phase: fidelity — per-page score gate against WB_FIDELITY_BAR ---------
if phase_ge fidelity; then
  phase_begin fidelity
  run $UPRIVER clone-fidelity "$SLUG" --force || fail "clone-fidelity command failed" 30
  json_assert "$SUMMARY" 'true' || fail "clone-qa/summary.json missing or not valid JSON" 30
  for p in $WB_CLONE_PAGES; do
    PAGE_SLUG="$(page_to_slug "$p")"
    if ! node -e '
      const d=JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8"));
      const pg=(d.pages||[]).find(x=>x.pageSlug===process.argv[2]);
      process.exit(pg&&pg.status==="scored"&&pg.overall>=Number(process.argv[3])?0:1);
    ' "$SUMMARY" "$PAGE_SLUG" "$WB_FIDELITY_BAR"; then
      log "fidelity gate failed — full per-page score table:"
      node -e '
        const d=JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8"));
        for(const pg of d.pages||[])console.log(`  ${String(pg.pageSlug).padEnd(24)} pixel=${pg.pixel.score} copy=${pg.copy.score} overall=${pg.overall} status=${pg.status}`);
      ' "$SUMMARY" | tee -a "$LOG"
      fail "page $p (slug $PAGE_SLUG) not scored or overall < $WB_FIDELITY_BAR" 30
    fi
  done
  phase_end fidelity
fi

# ---- Phase: fixes — deterministic plan with Phase sections ------------------
if phase_ge fixes; then
  phase_begin fixes
  # oclif topicSeparator is a space: `fixes plan`, never `fixes:plan`.
  run $UPRIVER fixes plan "$SLUG" || fail "fixes plan command failed" 31
  [ -f "$ROOT/fixes-plan.md" ] || fail "fixes-plan.md not written" 31
  grep -Eq '^#+ .*Phase' "$ROOT/fixes-plan.md" || fail "fixes-plan.md has no Phase section" 31
  phase_end fixes
fi

# ---- Phase: report — non-vacuous summary of a completed run -----------------
if phase_ge report; then
  phase_begin report
  [ -f "$SUMMARY" ] || fail "clone-qa/summary.json missing (run the full harness first)" 32
  [ -f "$ROOT/fixes-plan.md" ] || fail "fixes-plan.md missing (run the full harness first)" 32
  {
    echo "=== TIER B SUMMARY ==="
    node -e '
      const d=JSON.parse(require("node:fs").readFileSync(process.argv[1],"utf8"));
      for(const pg of d.pages||[])console.log(`page ${pg.pageSlug}: pixel=${pg.pixel.score} copy=${pg.copy.score} overall=${pg.overall} status=${pg.status}`);
      console.log(`overall fidelity: ${d.overall} (bar: ${process.argv[2]})`);
    ' "$SUMMARY" "$WB_FIDELITY_BAR"
    grep -E 'Internal links rewritten:|CDN images rewritten:' "$LOG" || echo "(no finalize counter lines in this run.log — resumed run)"
    if [ "${#TIMINGS[@]}" -gt 0 ]; then
      for t in "${TIMINGS[@]}"; do echo "$t"; done
    fi
    echo "phase report: $((SECONDS - PHASE_T0))s"
  } | tee -a "$LOG"
  log "Tier B PASS: live spine green end to end."
fi
exit 0
