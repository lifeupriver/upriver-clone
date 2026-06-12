#!/usr/bin/env bash
# Build Spec 18 §2: the site-diversity matrix driver. A THIN loop around the
# Tier B harness — one Tier B run per runnable site in config/site-registry.json,
# findings filed PER STAGE (Tier B's per-phase exit codes 21-32 ARE the
# per-stage finding), aggregated into matrix-report.md.
#
# THIS DRIVER COSTS REAL MONEY (one full Tier B run per site, budget
# $defaultBudgetUsd/site threaded into the clone phase as --max-spend-usd).
# It must NEVER be wired into the keyless test.yml — it runs only via the
# workflow_dispatch-only e2e-website-matrix.yml or by hand.
#
# Usage: bash scripts/e2e-website-matrix.sh
#
# Env: FIRECRAWL_API_KEY    required for live runs (Tier B preflight enforces)
#      MATRIX_SITES         csv of registry site ids   (default: all runnable)
#      MATRIX_FIDELITY_BAR  WB_FIDELITY_BAR per site   (default: 70)
#      MATRIX_PLAN_ONLY     1 = print the per-site plan and exit 0 (keyless)
#
# Exit codes (spec 18 §2, fresh 61+ range — disjoint from Tier A 11-16,
# Tier B 21-32, Tier C 41-47, pitch e2e 51-58, CLI 61/62):
#   0  every selected site passed
#   64 registry missing/invalid (or a selected id does not exist / not runnable)
#   65 >=1 site failed (per-site Tier B exit codes are in the report)
#   66 report write failed
#
# The driver CONTINUES past a failing site — one bad platform must not mask
# findings from the others. Skipped pending slots are listed in the report so
# the coverage gap stays visible.
set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

REGISTRY="config/site-registry.json"
REPORT="matrix-report.md"
MATRIX_SITES="${MATRIX_SITES:-}"
MATRIX_FIDELITY_BAR="${MATRIX_FIDELITY_BAR:-70}"
MATRIX_PLAN_ONLY="${MATRIX_PLAN_ONLY:-0}"

[ -f "$REGISTRY" ] || { echo "site registry not found at $REGISTRY"; exit 64; }

# Registry access goes through the SAME loader the CLI uses (validation
# included) — the driver never re-implements registry semantics in shell.
site_rows() {
  node --input-type=module -e '
    const { loadSiteRegistry, runnableSites } = await import("./packages/cli/dist/diversity/registry.js");
    const reg = loadSiteRegistry(process.argv[1]);
    const filter = (process.argv[2] || "").split(",").map((s) => s.trim()).filter(Boolean);
    const runnable = runnableSites(reg);
    if (filter.length > 0) {
      for (const id of filter) {
        if (!runnable.some((s) => s.id === id)) {
          console.error(`site id "${id}" is not in the registry or not runnable (url filled + permission settled?)`);
          process.exit(64);
        }
      }
    }
    const picked = filter.length > 0 ? runnable.filter((s) => filter.includes(s.id)) : runnable;
    for (const s of picked) {
      // tab-separated: id, platform, url, maxPages, budgetUsd, vertical, clonePages (space-joined)
      console.log([s.id, s.platform, s.url, s.maxPages, s.budgetUsd, s.vertical ?? "matrix-site", s.clonePages.join(" ")].join("\t"));
    }
  ' "$REGISTRY" "$MATRIX_SITES"
}

pending_rows() {
  node --input-type=module -e '
    const { loadSiteRegistry } = await import("./packages/cli/dist/diversity/registry.js");
    const reg = loadSiteRegistry(process.argv[1]);
    for (const s of reg.sites.filter((x) => x.url === null || x.permission === "pending")) {
      console.log([s.id, s.platform].join("\t"));
    }
  ' "$REGISTRY"
}

SITES_TSV="$(site_rows)" || exit 64
PENDING_TSV="$(pending_rows)" || exit 64

if [ -z "$SITES_TSV" ]; then
  echo "no runnable sites in $REGISTRY (every slot is pending/unfilled)"
  # An empty matrix is a registry state, not a crash — but selecting nothing
  # to run is only OK in plan mode; a live dispatch with zero sites is a
  # configuration error.
  [ "$MATRIX_PLAN_ONLY" = "1" ] && exit 0
  exit 64
fi

echo "site-diversity matrix plan (bar $MATRIX_FIDELITY_BAR):"
while IFS=$'\t' read -r id platform url maxPages budget vertical clonePages; do
  echo "  - $id [$platform] $url  maxPages=$maxPages budget=\$$budget pages='$clonePages'"
done <<<"$SITES_TSV"
if [ -n "$PENDING_TSV" ]; then
  while IFS=$'\t' read -r id platform; do
    echo "  - $id [$platform] SKIPPED (pending/unfilled slot)"
  done <<<"$PENDING_TSV"
fi

if [ "$MATRIX_PLAN_ONLY" = "1" ]; then
  echo "MATRIX_PLAN_ONLY=1 — no sites run."
  exit 0
fi

# ---- Live runs ---------------------------------------------------------------
PHASE_BY_CODE() {
  case "$1" in
    0) echo "pass" ;;
    2) echo "preflight" ;;
    21) echo "init" ;; 22) echo "discover" ;; 23) echo "scrape" ;; 24) echo "audit" ;;
    25) echo "synthesize" ;; 26) echo "scaffold" ;; 27) echo "clone" ;; 28) echo "finalize" ;;
    29) echo "capture" ;; 30) echo "fidelity" ;; 31) echo "fixes" ;; 32) echo "report" ;;
    *) echo "unknown" ;;
  esac
}

RESULTS=()
ANY_FAILED=0
while IFS=$'\t' read -r id platform url maxPages budget vertical clonePages; do
  echo ""
  echo "════════ matrix site: $id [$platform] $url ════════"
  start=$(date +%s)
  WB_SLUG="matrix-$id" \
  WB_LIVE_URL="$url" \
  WB_SITE_NAME="$id" \
  WB_VERTICAL="$vertical" \
  WB_CLONE_PAGES="$clonePages" \
  WB_SCRAPE_MAX_PAGES="$maxPages" \
  WB_CLONE_MAX_SPEND_USD="$budget" \
  WB_FIDELITY_BAR="$MATRIX_FIDELITY_BAR" \
  WB_MIN_PAGES=1 \
    bash scripts/e2e-website-tier-b.sh
  code=$?
  elapsed=$(( $(date +%s) - start ))
  phase="$(PHASE_BY_CODE "$code")"
  [ "$code" -ne 0 ] && ANY_FAILED=1
  # Per-site overall fidelity, if the run got far enough to score.
  fidelity="$(node -e '
    try {
      const s = require(process.argv[1]);
      console.log(typeof s.overall === "number" ? s.overall : "-");
    } catch { console.log("-"); }
  ' "$PWD/clients/matrix-$id/clone-qa/summary.json" 2>/dev/null || echo '-')"
  RESULTS+=("$id"$'\t'"$platform"$'\t'"$code"$'\t'"$phase"$'\t'"$fidelity"$'\t'"${elapsed}s")
  echo "──────── $id: exit=$code (${phase}) fidelity=$fidelity ${elapsed}s ────────"
done <<<"$SITES_TSV"

# ---- Report -------------------------------------------------------------------
{
  echo "# Site-diversity matrix report"
  echo ""
  echo "Generated: $(date -u +%Y-%m-%dT%H:%M:%SZ)  ·  fidelity bar: $MATRIX_FIDELITY_BAR  ·  budget: per-registry (\$/site)"
  echo ""
  echo "| site | platform | exit | failed phase | overall fidelity | time |"
  echo "| --- | --- | --- | --- | --- | --- |"
  for row in "${RESULTS[@]}"; do
    IFS=$'\t' read -r id platform code phase fidelity elapsed <<<"$row"
    label="$phase"; [ "$code" = "0" ] && label="—"
    echo "| $id | $platform | $code | $label | $fidelity | $elapsed |"
  done
  if [ -n "$PENDING_TSV" ]; then
    echo ""
    echo "Pending slots (not run — fill via config/site-registry.json):"
    while IFS=$'\t' read -r id platform; do
      echo "- $id [$platform]"
    done <<<"$PENDING_TSV"
  fi
  echo ""
  echo "Per-site artifacts: clients/matrix-<id>/e2e/run.log, clone-qa/summary.json (policy block included), audit-package.json."
  echo "Tier B exit codes are per-phase findings: 21 init … 32 report (see scripts/e2e-website-tier-b.sh)."
} > "$REPORT" || { echo "failed to write $REPORT"; exit 66; }

echo ""
echo "wrote $REPORT"
[ "$ANY_FAILED" -eq 1 ] && exit 65
exit 0
