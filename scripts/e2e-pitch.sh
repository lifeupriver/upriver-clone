#!/usr/bin/env bash
# Spec 19: gated LIVE pitch e2e. Runs the full pitch pipeline against the
# OWNED hosted fixture site (never a real prospect), then asserts every
# prospect-facing surface: the artifacts, the token-gated portal (valid/
# missing/tampered/expired/revoked), the questionnaire round trip, the
# approve gate, and the convert bridge.
#
# THIS COSTS REAL MONEY (Firecrawl scrape + 1 clone session + 4 teaser
# sessions ≈ the pitch ledger estimate). Dispatch it via the gated
# e2e-pitch.yml workflow or run locally with keys. Keyless test.yml must
# NEVER absorb any phase of this.
#
# Usage: bash scripts/e2e-pitch.sh [start-phase]
# Phases: run artifacts portal questionnaire approve convert revoke verify
#
# Exit codes — 50-range, disjoint from Tier A (11–16), B (21–32), C (41–47):
#   0  pass
#   2  preflight (missing keys/tools, bad phase, node < 22)
#   51 run: pitch run failed (its own exits: 21 over-budget, 22 fidelity)
#   52 artifacts: an expected pitch artifact is missing/malformed
#   53 portal: token-gate or noindex HTTP assertions failed
#   54 questionnaire: interview form/API round trip failed
#   55 approve: the approve gate did not render/refuse as specced
#   56 convert: stage flip or answer→profile seeding failed
#   57 revoke: takedown did not kill the portal
#   58 verify: final invariants
set -uo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")/.."

command -v node >/dev/null || { echo "node not found"; exit 2; }
command -v pnpm >/dev/null || { echo "pnpm not found"; exit 2; }
command -v curl >/dev/null || { echo "curl not found"; exit 2; }
command -v claude >/dev/null || { echo "claude CLI not found (clone + teasers shell out to it)"; exit 2; }
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 22 ] || { echo "node >=22 required (have $(node -v))"; exit 2; }
[ -n "${FIRECRAWL_API_KEY:-}" ] || { echo "FIRECRAWL_API_KEY required"; exit 2; }
[ -n "${ANTHROPIC_API_KEY:-}" ] || { echo "ANTHROPIC_API_KEY required (with UPRIVER_USE_API_KEY=1)"; exit 2; }

PITCH_LIVE_URL="${PITCH_LIVE_URL:-https://upriver-wb-fixture.vercel.app}"
SLUG=pitch-fixture
ROOT="clients/$SLUG"
UPRIVER="node packages/cli/bin/run.js"
export UPRIVER_DATA_SOURCE=local
export UPRIVER_USE_API_KEY="${UPRIVER_USE_API_KEY:-1}"
PORT="${PITCH_E2E_PORT:-4983}"
BASE="http://127.0.0.1:$PORT"
RUN_DIR="$ROOT/e2e"
LOG="$RUN_DIR/pitch-e2e.log"
SERVER_LOG="$RUN_DIR/pitch-dashboard.log"
SERVER_PID=""

PHASES=(run artifacts portal questionnaire approve convert revoke verify)
START_PHASE="${1:-run}"
idx() { local i; for i in "${!PHASES[@]}"; do [ "${PHASES[$i]}" = "$1" ] && { echo "$i"; return; }; done; echo -1; }
START_IDX=$(idx "$START_PHASE")
[ "$START_IDX" -ge 0 ] || { echo "unknown phase '$START_PHASE' (one of: ${PHASES[*]})"; exit 2; }
phase_ge() { [ "$(idx "$1")" -ge "$START_IDX" ]; }

mkdir -p "$RUN_DIR"
: > "$LOG"
log() { echo "$*" | tee -a "$LOG"; }
cleanup() { [ -n "$SERVER_PID" ] && kill "$SERVER_PID" 2>/dev/null; }
trap cleanup EXIT
fail() { log "FAIL($2): $1"; exit "$2"; }

json_field() { node -e "const d=JSON.parse(require('fs').readFileSync('$1','utf8'));console.log($2)"; }

log "=== pitch e2e (from: $START_PHASE, target: $PITCH_LIVE_URL, slug: $SLUG) ==="

# ── run ─────────────────────────────────────────────────────────────────────
if phase_ge run; then
  rm -rf "$ROOT"
  $UPRIVER pitch run "$PITCH_LIVE_URL" --slug "$SLUG" 2>&1 | tee -a "$LOG"
  code=${PIPESTATUS[0]}
  [ "$code" -eq 0 ] || fail "pitch run exited $code" 51
fi

# ── artifacts ───────────────────────────────────────────────────────────────
if phase_ge artifacts; then
  [ -s "$ROOT/pitch/state.json" ] || fail "pitch/state.json missing" 52
  [ "$(json_field "$ROOT/pitch/state.json" d.status)" = "draft" ] || fail "state not draft" 52
  [ -s "$ROOT/pitch/preview/index.html" ] || fail "staged preview missing" 52
  [ -s "$ROOT/pitch/share.json" ] || fail "share token missing" 52
  [ -s "$ROOT/pitch/email-draft.json" ] || fail "email draft missing" 52
  [ -s "$ROOT/interview-guide.md" ] || fail "interview guide missing" 52
  [ -s "$ROOT/audit-package.json" ] || fail "audit-package.json (Spec 18 harvest artifact) missing" 52
  for n in 01 02 03 04; do
    ls "$ROOT/docs/doc-pitch-$n-"*.md >/dev/null 2>&1 || fail "teaser doc-pitch-$n missing" 52
  done
  grep -q '{{UNSUBSCRIBE_URL}}' "$ROOT/pitch/email-draft.json" || fail "draft lost its unsubscribe placeholder" 52
  ! grep -qE '\$[0-9]' "$ROOT"/docs/doc-pitch-*.md || fail "a teaser mentions pricing" 52
fi

# ── portal (boot the dashboard, assert the token-gate matrix) ───────────────
if phase_ge portal || phase_ge questionnaire; then
  ( cd packages/dashboard && UPRIVER_DATA_SOURCE=local npx astro dev --port "$PORT" >"../../$SERVER_LOG" 2>&1 ) &
  SERVER_PID=$!
  READY=0
  for _ in $(seq 1 60); do
    curl -fso /dev/null "$BASE/api/health" && { READY=1; break; }
    sleep 2
  done
  [ "$READY" -eq 1 ] || fail "dashboard never became ready on $BASE" 53
fi

if phase_ge portal; then
  TOKEN=$(json_field "$ROOT/pitch/share.json" d.token)
  H=$(curl -fsi "$BASE/pitch/$SLUG?t=$TOKEN") || fail "valid token did not 200" 53
  echo "$H" | grep -qi '^x-robots-tag: noindex' || fail "noindex header missing" 53
  echo "$H" | grep -qi 'name="robots"' || fail "noindex meta missing" 53
  [ "$(curl -so /dev/null -w '%{http_code}' "$BASE/pitch/$SLUG")" = "404" ] || fail "missing token not 404" 53
  [ "$(curl -so /dev/null -w '%{http_code}' "$BASE/pitch/$SLUG?t=${TOKEN}xx")" = "404" ] || fail "tampered token not 404" 53
  curl -fs "$BASE/pitch/$SLUG?t=$TOKEN&doc=doc-pitch-02" | grep -qi 'quick' || fail "teaser view failed" 53
  # expiry: rewrite expiresAt to the past, assert 410, restore
  cp "$ROOT/pitch/share.json" "$ROOT/pitch/share.json.bak"
  node -e "const f='$ROOT/pitch/share.json';const d=JSON.parse(require('fs').readFileSync(f,'utf8'));d.expiresAt='2000-01-01T00:00:00.000Z';require('fs').writeFileSync(f,JSON.stringify(d))"
  [ "$(curl -so /dev/null -w '%{http_code}' "$BASE/pitch/$SLUG?t=$TOKEN")" = "410" ] || fail "expired token not 410" 53
  mv "$ROOT/pitch/share.json.bak" "$ROOT/pitch/share.json"
  log "portal: token-gate matrix green"
fi

# ── questionnaire round trip ────────────────────────────────────────────────
if phase_ge questionnaire; then
  ITOKEN=$(json_field "$ROOT/interview-share.json" d.token)
  [ "$(curl -so /dev/null -w '%{http_code}' "$BASE/deliverables/$SLUG/interview?token=$ITOKEN")" = "200" ] || fail "interview form not 200" 54
  curl -fs -X POST "$BASE/api/interview/$SLUG" -H 'content-type: application/json' \
    -d "{\"token\":\"$ITOKEN\",\"answers\":{\"about-you-q3\":\"pitch-e2e@upriver.example\",\"your-goals-q1\":\"more bookings\"}}" \
    >/dev/null || fail "interview POST failed" 54
  grep -q 'pitch-e2e@upriver.example' "$ROOT/interview-responses.json" || fail "answer not persisted" 54
  log "questionnaire: round trip green"
fi

# ── approve gate ────────────────────────────────────────────────────────────
if phase_ge approve; then
  OUT=$($UPRIVER pitch approve "$SLUG" --to pitch-e2e@upriver.example --dry-run 2>&1) || fail "approve --dry-run failed: $OUT" 55
  echo "$OUT" | grep -q 'exactly what will be sent' || fail "approve did not render the email" 55
  echo "$OUT" | grep -q 'nothing sent' || fail "approve dry-run claims a send" 55
  # Optional REAL send to a test inbox (requires RESEND_API_KEY + secret + postal).
  if [ -n "${RESEND_API_KEY:-}" ] && [ -n "${PITCH_TEST_INBOX:-}" ] && [ -n "${UPRIVER_UNSUBSCRIBE_SECRET:-}" ] && [ -n "${UPRIVER_OUTREACH_POSTAL:-}" ]; then
    $UPRIVER pitch approve "$SLUG" --to "$PITCH_TEST_INBOX" --yes 2>&1 | tee -a "$LOG"
    [ "${PIPESTATUS[0]}" -eq 0 ] || fail "real send to test inbox failed" 55
    [ "$(json_field "$ROOT/pitch/state.json" d.status)" = "sent" ] || fail "state not sent after send" 55
  else
    log "approve: real-send leg skipped (RESEND_API_KEY/PITCH_TEST_INBOX/secret/postal not all set)"
  fi
fi

# ── convert bridge ──────────────────────────────────────────────────────────
if phase_ge convert; then
  $UPRIVER pitch convert "$SLUG" 2>&1 | tee -a "$LOG"
  [ "${PIPESTATUS[0]}" -eq 0 ] || fail "pitch convert failed" 56
  grep -q 'stage: client' "$ROOT/client-config.yaml" || fail "stage not flipped" 56
  node -e "const p=JSON.parse(require('fs').readFileSync('$ROOT/profile.json','utf8'));if(p.identity?.email?.value!=='pitch-e2e@upriver.example'||p.identity?.email?.source!=='interview')process.exit(1)" \
    || fail "identity.email not seeded from the questionnaire answer" 56
  log "convert: bridge green"
fi

# ── revoke (takedown) ───────────────────────────────────────────────────────
if phase_ge revoke; then
  TOKEN=$(json_field "$ROOT/pitch/share.json" d.token)
  $UPRIVER pitch revoke "$SLUG" 2>&1 | tee -a "$LOG"
  [ "${PIPESTATUS[0]}" -eq 0 ] || fail "pitch revoke failed" 57
  [ "$(curl -so /dev/null -w '%{http_code}' "$BASE/pitch/$SLUG?t=$TOKEN")" = "404" ] || fail "portal still serves after revoke" 57
  log "revoke: takedown green"
fi

# ── verify ──────────────────────────────────────────────────────────────────
if phase_ge verify; then
  log "=== pitch e2e PASS ==="
fi
exit 0
