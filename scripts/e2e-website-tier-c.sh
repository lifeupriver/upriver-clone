#!/usr/bin/env bash
# Tier C: runtime e2e for the scaffolded client site. Tier A proves the repo
# BUILDS; Tier C proves it RUNS — it boots the scaffolded wb-fixture site and
# asserts the HTTP contract that a prior audit's six P0s slipped past green CI
# (forms POSTing into 404s, fake-success responses, unguarded admin).
# Keyless by construction: Supabase/GitHub env is explicitly scrubbed from the
# server process, so every assertion targets the documented no-keys behavior.
#
# Server choice: `astro dev` (NOT `astro preview`) — the template uses the
# Vercel adapter, under which `astro preview` is a no-op (it writes to
# .vercel/output/ and expects the Vercel runtime; there is no dist/server/
# entry.mjs). Prior art: packages/cli/src/clone/verify.ts. Dev mode runs the
# same middleware + API route code paths over real HTTP.
#
# Scaffold reuse: when Tier A already produced clients/wb-fixture/repo (CI
# runs Tier C right after Tier A) the repo + node_modules are reused;
# otherwise this script scaffolds and installs with the exact commands Tier A
# uses. The build phase always rebuilds so the sitemap artifact check is
# honest for THIS run.
#
# Usage: bash scripts/e2e-website-tier-c.sh [start-phase]
# Phases: scaffold build serve   (the HTTP assertion phases — pages, forms,
#         admin, change-request — always run as a block after serve; resume
#         points are scaffold/build/serve only)
#
# Exit codes — the 40-range continues the per-harness convention upward and is
# deliberately disjoint from Tier A (11-16) and Tier B (21-32):
#   0  pass
#   2  preflight (bad phase arg, missing node/pnpm/curl, node < 22)
#   41 scaffold: `upriver scaffold` or pnpm install failed / repo unusable
#   42 build: astro build failed, or sitemap-index.xml missing from output
#   43 serve: dev server failed to start or never became ready
#   44 pages: / /contact /privacy /terms /robots.txt HTTP assertions
#   45 forms: honeypot 303 contract, or /api/inquiry | /api/newsletter not
#      returning the honest 503 JSON (fake success and 404 both fail here)
#   46 admin: /admin did not 3xx to /admin/login, or login page not 200
#   47 change-request: unauthenticated POST not answered with 401 JSON
set -uo pipefail

# Anchor to repo root regardless of where the caller invoked the script from.
cd "$(dirname "${BASH_SOURCE[0]}")/.."

# Preflight: required tools must be on PATH.
command -v node >/dev/null || { echo "node not found on PATH"; exit 2; }
command -v pnpm >/dev/null || { echo "pnpm not found on PATH"; exit 2; }
command -v curl >/dev/null || { echo "curl not found on PATH"; exit 2; }

# Preflight: the scaffolded repo needs Node >= 22 (native WebSocket).
NODE_MAJOR=$(node -p 'process.versions.node.split(".")[0]')
[ "$NODE_MAJOR" -ge 22 ] || { echo "node >=22 required (have $(node -v)); the scaffolded repo needs native WebSocket"; exit 2; }

SLUG=wb-fixture
ROOT="clients/$SLUG"
REPO="$ROOT/repo"
UPRIVER="node packages/cli/bin/run.js"
export UPRIVER_DATA_SOURCE=local
RUN_DIR="$ROOT/e2e"
LOG="$RUN_DIR/tier-c.log"
SERVER_LOG="$RUN_DIR/tier-c-server.log"

PORT="${TIER_C_PORT:-4977}"
BASE="http://127.0.0.1:$PORT"
READY_TIMEOUT_S="${TIER_C_READY_TIMEOUT:-120}"

PHASES=(scaffold build serve)
START_PHASE="${1:-scaffold}"

idx() { local i; for i in "${!PHASES[@]}"; do [ "${PHASES[$i]}" = "$1" ] && { echo "$i"; return; }; done; echo -1; }

# Validate start-phase BEFORE truncating the log (a bad phase arg must not
# destroy a previous green run's log).
[ "$(idx "$START_PHASE")" -ge 0 ] || { echo "unknown phase: $START_PHASE (use: ${PHASES[*]})"; exit 2; }

mkdir -p "$RUN_DIR"
# Truncate logs on every invocation so stale lines can't satisfy assertions.
: > "$LOG"
: > "$SERVER_LOG"

phase_ge() { [ "$(idx "$1")" -ge "$(idx "$START_PHASE")" ]; }

log() { echo "[tier-c] $*" | tee -a "$LOG"; }
run() {
  log "+ $*"
  "$@" 2>&1 | tee -a "$LOG"
  local rc=${PIPESTATUS[0]}
  log "(exit $rc)"
  return "$rc"
}
fail() { log "FAIL($2): $1"; exit "$2"; }

# ---- Server lifecycle -------------------------------------------------------
SERVER_PID=""
cleanup() {
  if [ -n "$SERVER_PID" ] && kill -0 "$SERVER_PID" 2>/dev/null; then
    log "stopping dev server (pid $SERVER_PID)"
    kill "$SERVER_PID" 2>/dev/null
    # Give it a moment to exit cleanly, then force.
    for _ in 1 2 3 4 5 6 7 8 9 10; do
      kill -0 "$SERVER_PID" 2>/dev/null || break
      node -e 'setTimeout(()=>{},300)'
    done
    kill -9 "$SERVER_PID" 2>/dev/null
    wait "$SERVER_PID" 2>/dev/null
  fi
}
trap cleanup EXIT INT TERM

log "=== Tier C website runtime e2e start (from: $START_PHASE, port: $PORT) ==="

# ---- Phase: scaffold — ensure a scaffolded, installed repo exists -----------
if phase_ge scaffold; then
  log "--- PHASE scaffold (exit 41) ---"
  if [ -f "$REPO/src/pages/index.astro" ] && [ -x "$REPO/node_modules/.bin/astro" ]; then
    log "reusing existing scaffolded repo at $REPO (Tier A or a prior run produced it)"
  else
    log "no usable repo at $REPO — scaffolding fresh (same commands Tier A uses)"
    run $UPRIVER scaffold $SLUG || fail "scaffold command failed" 41
    log "installing dependencies in scaffolded repo"
    # --ignore-workspace: install into the scaffolded repo's own node_modules,
    # not the monorepo root. --frozen-lockfile: template lockfile is committed.
    ( cd "$REPO" && pnpm install --ignore-workspace --frozen-lockfile --silent 2>&1 ) | tee -a "$LOG"
    INSTALL_RC=${PIPESTATUS[0]}
    if [ "$INSTALL_RC" -ne 0 ]; then
      log "pnpm install failed — retrying once (likely network)"
      ( cd "$REPO" && pnpm install --ignore-workspace --frozen-lockfile --silent 2>&1 ) | tee -a "$LOG"
      INSTALL_RC=${PIPESTATUS[0]}
      [ "$INSTALL_RC" -eq 0 ] || fail "pnpm install failed twice — likely registry/network, retry the job" 41
    fi
  fi
  # Runtime surface the HTTP phases depend on must exist in the scaffold.
  for f in src/pages/index.astro src/pages/contact.astro src/pages/privacy.astro src/pages/terms.astro \
           src/pages/api/inquiry.ts src/pages/api/newsletter.ts src/pages/api/change-request.ts \
           src/middleware.ts src/pages/admin/login.astro public/robots.txt; do
    [ -f "$REPO/$f" ] || fail "scaffolded repo is missing $f" 41
  done
  [ -x "$REPO/node_modules/.bin/astro" ] || fail "astro binary missing after install" 41
  log "scaffold phase passed"
fi

# ---- Phase: build — astro build succeeds and emits the sitemap --------------
if phase_ge build; then
  log "--- PHASE build (exit 42) ---"
  ( cd "$REPO" && pnpm build 2>&1 ) | tee -a "$LOG"
  BUILD_RC=${PIPESTATUS[0]}
  [ "$BUILD_RC" -eq 0 ] || fail "scaffolded repo does not build (astro build failed)" 42
  # @astrojs/sitemap writes at build time. With the Vercel adapter the static
  # output lands in .vercel/output/static/ (dist/ holds intermediates); accept
  # the plain-dist locations too so an adapter change doesn't false-fail.
  SITEMAP=""
  for c in "$REPO/.vercel/output/static/sitemap-index.xml" "$REPO/dist/sitemap-index.xml" "$REPO/dist/client/sitemap-index.xml"; do
    [ -f "$c" ] && { SITEMAP="$c"; break; }
  done
  [ -n "$SITEMAP" ] || fail "sitemap-index.xml not found in build output (.vercel/output/static or dist)" 42
  log "sitemap artifact found: $SITEMAP"
  log "build phase passed"
fi

# ---- Phase: serve — boot astro dev keyless on a fixed port ------------------
if phase_ge serve; then
  log "--- PHASE serve (exit 43) ---"
  [ -x "$REPO/node_modules/.bin/astro" ] || fail "astro binary missing — run from the scaffold phase first" 43
  # If something already answers on the port, vite would silently bind the
  # NEXT free port and every assertion would probe the wrong server.
  PRE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 3 "$BASE/" 2>/dev/null)
  [ "$PRE" = "000" ] || fail "port $PORT is already in use (got HTTP $PRE) — set TIER_C_PORT to a free port" 43
  log "starting astro dev on port $PORT with Supabase/GitHub env scrubbed"
  # `exec` makes the astro process replace the subshell, so $! IS the server
  # pid and the EXIT trap can kill it directly. `env -u` scrubs every secret
  # the template (or anything it imports) could read — the contract under
  # test is the documented NO-KEYS behavior, and CI must stay keyless.
  (
    cd "$REPO" && exec env \
      -u PUBLIC_SUPABASE_URL -u PUBLIC_SUPABASE_ANON_KEY -u SUPABASE_SERVICE_ROLE_KEY \
      -u GITHUB_TOKEN -u GITHUB_OWNER -u GITHUB_REPO \
      -u ANTHROPIC_API_KEY -u FIRECRAWL_API_KEY -u RESEND_API_KEY \
      -u UPRIVER_SUPABASE_URL -u UPRIVER_SUPABASE_SERVICE_KEY -u UPRIVER_SUPABASE_PUBLISHABLE_KEY \
      node_modules/.bin/astro dev --port "$PORT" --host 127.0.0.1
  ) >"$SERVER_LOG" 2>&1 &
  SERVER_PID=$!
  log "dev server pid: $SERVER_PID (log: $SERVER_LOG)"

  # Wait for ready: dev compiles on first request, so poll generously.
  READY=0
  WAITED=0
  while [ "$WAITED" -lt "$READY_TIMEOUT_S" ]; do
    kill -0 "$SERVER_PID" 2>/dev/null || fail "dev server process exited early — see $SERVER_LOG" 43
    CODE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 "$BASE/" 2>/dev/null)
    if [ "$CODE" = "200" ]; then READY=1; break; fi
    node -e 'setTimeout(()=>{},1000)'
    WAITED=$((WAITED + 1))
  done
  [ "$READY" -eq 1 ] || fail "dev server did not answer 200 on $BASE/ within ${READY_TIMEOUT_S}s — see $SERVER_LOG" 43
  log "server ready after ~${WAITED}s"
fi

# The HTTP assertion phases below always run together once the server is up.

# Helpers: status + body capture per request (no -L: redirects are asserted).
BODY="$RUN_DIR/tier-c-body.tmp"
http_get()  { curl -sS -o "$BODY" -w '%{http_code}' --max-time 20 "$1"; }
http_post() { curl -sS -o "$BODY" -w '%{http_code}' --max-time 20 -X POST "$@"; }

# ---- Phase: pages — public pages + robots over HTTP --------------------------
log "--- PHASE pages (exit 44) ---"
CODE=$(http_get "$BASE/")
[ "$CODE" = "200" ] || fail "GET / returned $CODE (want 200)" 44
[ -s "$BODY" ] || fail "GET / returned an empty body" 44
grep -qi '<html' "$BODY" || fail "GET / body does not look like HTML" 44
log "GET / -> 200, non-empty HTML"

for p in /contact /privacy /terms; do
  CODE=$(http_get "$BASE$p")
  [ "$CODE" = "200" ] || fail "GET $p returned $CODE (want 200)" 44
  grep -qi '<html' "$BODY" || fail "GET $p body does not look like HTML" 44
  log "GET $p -> 200"
done

CODE=$(http_get "$BASE/robots.txt")
[ "$CODE" = "200" ] || fail "GET /robots.txt returned $CODE (want 200)" 44
grep -q 'Sitemap:' "$BODY" || fail "/robots.txt has no Sitemap: line" 44
log "GET /robots.txt -> 200 with Sitemap: line"
log "pages phase passed"

# ---- Phase: forms — honeypot + honest-503 contract ---------------------------
log "--- PHASE forms (exit 45) ---"
# 1) Honeypot: a filled hidden `website` field short-circuits BEFORE the
#    Supabase check (src/lib/forms.ts), so even keyless the bot gets a
#    success-looking 303 to `?submitted=1` and nothing is stored. `_redirect`
#    supplies the return path a real browser would carry in its Referer.
CODE=$(http_post "$BASE/api/inquiry" -d 'website=spam-bot&email=bot@example.com&message=spam&_redirect=/contact')
[ "$CODE" = "303" ] || fail "honeypot POST /api/inquiry returned $CODE (want 303 success-decoy)" 45
LOC=$(curl -sS -o /dev/null -w '%{redirect_url}' --max-time 20 -X POST "$BASE/api/inquiry" -d 'website=spam-bot&email=bot@example.com&message=spam&_redirect=/contact')
case "$LOC" in
  *submitted=1*) : ;;
  *) fail "honeypot 303 redirect target '$LOC' lacks ?submitted=1" 45 ;;
esac
log "honeypot POST /api/inquiry -> 303 to $LOC (success decoy, nothing stored)"

# 2) Valid-shaped inquiry with NO Supabase env must fail HONESTLY: 503 JSON.
#    404 here = "forms POST to endpoints that don't exist" (the original P0);
#    2xx here = fake success swallowing real submissions. Both must fail.
CODE=$(http_post "$BASE/api/inquiry" -d 'name=Tier C Probe&email=probe@example.com&message=runtime harness probe')
[ "$CODE" = "503" ] || fail "POST /api/inquiry (valid, keyless) returned $CODE (want honest 503)" 45
grep -q '"ok":false' "$BODY" || fail "/api/inquiry 503 body is not the documented JSON shape: $(cat "$BODY")" 45
grep -qi 'not configured' "$BODY" || fail "/api/inquiry 503 body does not state the backend is unconfigured: $(cat "$BODY")" 45
log "POST /api/inquiry (valid, keyless) -> 503 honest-fail JSON"

# 3) Same contract for the newsletter endpoint.
CODE=$(http_post "$BASE/api/newsletter" -d 'email=probe@example.com')
[ "$CODE" = "503" ] || fail "POST /api/newsletter (valid, keyless) returned $CODE (want honest 503)" 45
grep -q '"ok":false' "$BODY" || fail "/api/newsletter 503 body is not the documented JSON shape: $(cat "$BODY")" 45
log "POST /api/newsletter (valid, keyless) -> 503 honest-fail JSON"
log "forms phase passed"

# ---- Phase: admin — auth gate redirects, login renders -----------------------
log "--- PHASE admin (exit 46) ---"
CODE=$(http_get "$BASE/admin")
case "$CODE" in
  30[12378]) : ;;
  *) fail "GET /admin returned $CODE (want 3xx redirect to login)" 46 ;;
esac
LOC=$(curl -sS -o /dev/null -w '%{redirect_url}' --max-time 20 "$BASE/admin")
case "$LOC" in
  */admin/login*) : ;;
  *) fail "GET /admin redirected to '$LOC' (want /admin/login)" 46 ;;
esac
log "GET /admin -> $CODE to $LOC"

CODE=$(http_get "$BASE/admin/login")
[ "$CODE" = "200" ] || fail "GET /admin/login returned $CODE (want 200)" 46
grep -qi 'sign in' "$BODY" || fail "/admin/login body does not render the sign-in form" 46
log "GET /admin/login -> 200"
log "admin phase passed"

# ---- Phase: change-request — unauthenticated POST is a clean 401 JSON --------
log "--- PHASE change-request (exit 47) ---"
CODE=$(http_post "$BASE/api/change-request" -H 'content-type: application/json' -d '{"title":"probe","body":"tier-c probe"}')
[ "$CODE" = "401" ] || fail "POST /api/change-request (unauthenticated) returned $CODE (want 401)" 47
grep -q '"ok":false' "$BODY" || fail "/api/change-request 401 body is not the documented JSON shape: $(cat "$BODY")" 47
grep -q 'Unauthorized' "$BODY" || fail "/api/change-request 401 body lacks the Unauthorized error: $(cat "$BODY")" 47
log "POST /api/change-request (unauthenticated) -> 401 {\"ok\":false,\"error\":\"Unauthorized\"}"
log "change-request phase passed"

rm -f "$BODY"
log "Tier C PASS: scaffolded site boots and honors the keyless HTTP contract."
exit 0
