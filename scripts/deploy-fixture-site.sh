#!/usr/bin/env bash
# Build Spec 16 Task 1: one-shot Vercel deploy of fixture-site/ (the Tier B
# hosted scrape target). One-time; re-run only on content change. Never wired
# into any workflow.
#
# Usage: VERCEL_TOKEN=... bash scripts/deploy-fixture-site.sh
#
# Non-interactive form: `vercel deploy <dir> --yes` would auto-create a project
# named after the directory ("fixture-site"), not the pinned project name. So
# we first `vercel link --yes --project upriver-wb-fixture` from inside the
# directory (creates the project if absent, links it via .vercel/ otherwise),
# then `vercel deploy --prod --yes` against the linked project. Both steps take
# --token, so no `vercel login` state is required.
#
# Exit codes: 0 deployed; 2 VERCEL_TOKEN unset; 1 link/deploy failure.
set -uo pipefail

cd "$(dirname "${BASH_SOURCE[0]}")/.."

SITE_DIR=fixture-site
PROJECT=upriver-wb-fixture
PINNED_URL="https://$PROJECT.vercel.app"

if [ -z "${VERCEL_TOKEN:-}" ]; then
  cat <<EOF
VERCEL_TOKEN is not set — refusing to deploy.

To deploy the fixture site:
  1. Create a token at https://vercel.com/account/tokens
  2. Run: VERCEL_TOKEN=<token> bash scripts/deploy-fixture-site.sh

This deploy is one-time (re-run only when fixture-site/ content changes) and
is intentionally not part of any CI workflow.
EOF
  exit 2
fi

command -v npx >/dev/null || { echo "npx not found on PATH (need Node.js)"; exit 2; }
[ -d "$SITE_DIR" ] || { echo "$SITE_DIR/ does not exist"; exit 1; }

echo "Linking $SITE_DIR/ to Vercel project '$PROJECT' (non-interactive)..."
( cd "$SITE_DIR" && npx vercel link --yes --project "$PROJECT" --token "$VERCEL_TOKEN" ) \
  || { echo "vercel link failed"; exit 1; }

echo "Deploying $SITE_DIR/ to production..."
DEPLOY_URL=$( cd "$SITE_DIR" && npx vercel deploy --prod --yes --token "$VERCEL_TOKEN" ) \
  || { echo "vercel deploy failed"; exit 1; }

cat <<EOF

============================================================
 Deployment URL:        $DEPLOY_URL
 Expected production:   $PINNED_URL
============================================================

Verify the production URL serves the site:
  curl -sI $PINNED_URL/ | grep -i x-robots-tag   # expect: noindex, nofollow

If the production URL differs from $PINNED_URL (project name was
taken), update ALL of the following in ONE commit before the first live run
(see fixture-site/README.md for the full list):
  - canonical/og:url + footer self-links in fixture-site/*.html
  - fixture-site/sitemap.xml <loc> entries + robots.txt Sitemap line
  - PINNED_URL in scripts/checks/fixture-site-check.sh
  - the WB_LIVE_URL default in scripts/e2e-website-tier-b.sh
EOF
exit 0
