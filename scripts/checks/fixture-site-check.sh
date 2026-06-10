#!/usr/bin/env bash
# Build Spec 16 Task 1: local sanity check for the committed fixture site
# (fixture-site/). Serves the directory with python3's http.server and asserts
# the noindex/canonical/sitemap contract every page must carry before deploy.
# Local-only, not CI-wired; no network use beyond localhost.
#
# Usage: bash scripts/checks/fixture-site-check.sh
#
# Asserts, per page (index/about/weddings/contact, plus / serving index):
#   - HTTP 200
#   - exact noindex meta: <meta name="robots" content="noindex, nofollow">
#   - a rel="canonical" link
#   - >=1 absolute self-link to the pinned production URL
# and that sitemap.xml lists exactly the 4 pinned absolute URLs.
#
# Note: nav links in the pages are clean root-relative paths (/about etc.,
# resolved by Vercel cleanUrls in production). This check deliberately curls
# the .html files directly and does NOT depend on cleanUrl resolution locally.
#
# Exit codes: 0 pass; 2 preflight; 1 any named assertion failure.
set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/../.."

SITE_DIR=fixture-site
PORT=8943
BASE="http://127.0.0.1:$PORT"
PINNED_URL='https://upriver-wb-fixture.vercel.app'
NOINDEX_META='<meta name="robots" content="noindex, nofollow">'
PAGES=(index.html about.html weddings.html contact.html)

command -v python3 >/dev/null || { echo "python3 not found on PATH"; exit 2; }
command -v curl    >/dev/null || { echo "curl not found on PATH"; exit 2; }
[ -d "$SITE_DIR" ] || { echo "FAIL(site-dir): $SITE_DIR/ does not exist"; exit 1; }

fail() { echo "FAIL($1): $2"; exit 1; }

# Serve the site in the background; always kill it on exit.
python3 -m http.server "$PORT" --bind 127.0.0.1 --directory "$SITE_DIR" >/dev/null 2>&1 &
SERVER_PID=$!
trap 'kill "$SERVER_PID" 2>/dev/null' EXIT

# Readiness poll (server may take a moment to bind). Connectivity only —
# a missing page must surface as a named page assertion, not "server not ready".
for _ in $(seq 1 50); do
  curl -so /dev/null "$BASE/" && break
  kill -0 "$SERVER_PID" 2>/dev/null || fail "server" "http.server died before binding port $PORT"
  sleep 0.1
done
curl -so /dev/null "$BASE/" || fail "server" "http.server never became ready on port $PORT"

# Root must serve index (http.server's directory-index behavior mirrors
# Vercel's index resolution; only / is asserted, never other clean URLs).
# Grep the root body for the noindex meta so a 200 directory listing (the
# http.server response when index.html is missing) cannot pass vacuously.
ROOT_STATUS=$(curl -so /dev/null -w '%{http_code}' "$BASE/")
[ "$ROOT_STATUS" = "200" ] || fail "root-200" "GET / returned $ROOT_STATUS, expected 200"
ROOT_BODY=$(curl -fs "$BASE/") || fail "root-fetch" "could not fetch / body"
grep -qF "$NOINDEX_META" <<<"$ROOT_BODY" \
  || fail "root-serves-index" "GET / did not serve index.html content (no noindex meta in root body)"

for page in "${PAGES[@]}"; do
  STATUS=$(curl -so /dev/null -w '%{http_code}' "$BASE/$page")
  [ "$STATUS" = "200" ] || fail "page-200" "GET /$page returned $STATUS, expected 200"
  BODY=$(curl -fs "$BASE/$page") || fail "page-fetch" "could not fetch /$page body"
  grep -qF "$NOINDEX_META" <<<"$BODY" \
    || fail "noindex-meta" "/$page is missing the exact noindex meta tag: $NOINDEX_META"
  grep -q 'rel="canonical"' <<<"$BODY" \
    || fail "canonical" "/$page has no rel=\"canonical\" link"
  # Must be an <a> anchor — the canonical/og:url tags in <head> also carry the
  # pinned URL, but finalize's pass-1 needs an actual absolute self-LINK.
  grep -qE "<a [^>]*href=\"$PINNED_URL" <<<"$BODY" \
    || fail "absolute-self-link" "/$page has no absolute <a href> self-link to $PINNED_URL"
  grep -q 'property="og:url"' <<<"$BODY" \
    || fail "og-url" "/$page has no og:url meta"
done

# robots.txt must never grow a Disallow (it would risk blocking Firecrawl's
# own mapper — spec Findings); it carries only the sitemap pointer.
ROBOTS=$(curl -fs "$BASE/robots.txt") || fail "robots-fetch" "could not fetch /robots.txt"
grep -qi '^Disallow' <<<"$ROBOTS" && fail "robots-disallow" "robots.txt contains a Disallow line"
grep -qF "Sitemap: $PINNED_URL/sitemap.xml" <<<"$ROBOTS" \
  || fail "robots-sitemap" "robots.txt is missing the pinned Sitemap line"

# Sitemap must list exactly the 4 pinned absolute URLs (map determinism).
SITEMAP=$(curl -fs "$BASE/sitemap.xml") || fail "sitemap-fetch" "could not fetch /sitemap.xml"
EXPECTED_LOCS=$(printf '%s\n' \
  "$PINNED_URL/" \
  "$PINNED_URL/about" \
  "$PINNED_URL/weddings" \
  "$PINNED_URL/contact" | sort)
ACTUAL_LOCS=$(grep -o '<loc>[^<]*</loc>' <<<"$SITEMAP" | sed -e 's|<loc>||' -e 's|</loc>||' | sort)
[ -n "$ACTUAL_LOCS" ] || fail "sitemap-locs" "sitemap.xml contains no <loc> entries"
[ "$ACTUAL_LOCS" = "$EXPECTED_LOCS" ] || fail "sitemap-locs" \
  "sitemap.xml <loc> set differs from the 4 pinned URLs.
expected:
$EXPECTED_LOCS
actual:
$ACTUAL_LOCS"

echo "fixture-site check PASS: 4 pages 200 + noindex meta + canonical + absolute self-link; sitemap pins the 4 URLs."
exit 0
