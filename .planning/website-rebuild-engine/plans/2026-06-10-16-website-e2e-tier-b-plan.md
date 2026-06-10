# Plan — Build Spec 16: Tier B live-spine e2e (2026-06-10)

Executes `specs/16-website-e2e-tier-b-spec.md`. Branch: `build/16-website-e2e-tier-b` (off `origin/main`, PRs #45/#46 both merged). One implementer subagent per task, spec-compliance review + code-quality review per task, final holistic review of the branch.

**Build-environment constraints (verified up front, honesty anchors for the DoD):**
- No `FIRECRAWL_API_KEY`, no `VERCEL_TOKEN` in this container → the live run and the actual Vercel deploy are *documented, gated* steps, not build-time steps. Verifiable here: preflight behavior, phase-arg validation, `bash -n`, local serving of the fixture site, Tier A still green.
- `clients/audreys/` is gitignored and absent here → fidelity bar is provisional (spec §5) with the calibration one-liner recorded.

## Task 1 — `fixture-site/` + deploy script

*Verification first:* write `scripts/checks/fixture-site-check.sh` (tiny, local-only, not CI-wired): serves `fixture-site/` with `python3 -m http.server`, curls all 4 routes expecting 200, greps every page for `noindex` meta + canonical + ≥1 absolute self-link, validates sitemap lists exactly the 4 pinned URLs. Run it; it must FAIL before the site exists.

Then build to spec §1:
- `index.html` (content-heavy: hero, 3 sections, testimonial, CTA), `about.html`, `weddings.html`, `contact.html`; shared `styles.css`; 4–6 small committed SVGs under `images/`; nav relative + ≥1 absolute self-link per page; canonical/og:url pinned to `https://upriver-wb-fixture.vercel.app`.
- Prose: reuse wb-fixture fictional copy or write fresh fictional copy; NO real-client derivation.
- `vercel.json` (cleanUrls + X-Robots-Tag noindex header), `sitemap.xml`, `robots.txt` (Sitemap line only), `README.md` (provenance, sanitization standard pointer, deploy + URL-correction procedure).
- `scripts/deploy-fixture-site.sh`: VERCEL_TOKEN-gated, `npx vercel deploy fixture-site --prod --yes`, prints final URL, exits 2 with instructions when token unset.
- Re-run the check script → green.

## Task 2 — `scripts/e2e-website-tier-b.sh`

*Verification first:* the harness's own preflight IS the test surface runnable here. Acceptance (run in container): (a) `bash -n` clean; (b) no-key invocation exits **2** with a message naming FIRECRAWL_API_KEY; (c) bad phase arg exits 2 *without* truncating an existing run.log; (d) `report` start-phase on an empty client dir exits 32 (non-vacuous resume, Tier A's verify=16 precedent).

Build to spec §2 exactly: phase table, exit codes 21–32, env contract (`WB_LIVE_URL`/`WB_FIDELITY_BAR`/`WB_CLONE_PAGES` defaults), per-page clone loop with `--no-pr --no-worktree --no-verify`, finalize hard residue check + soft counter, trap-guarded preview server in `capture`, fidelity gate with score table on failure, summary block in `report`. Mirror Tier A idioms (log/run/fail helpers, hoisted literals, log-truncation-after-arg-validation).

## Task 3 — gated workflow

Build to spec §3: `workflow_dispatch`-only, inputs (start_phase, fidelity_bar), node 22 + pnpm mirroring test.yml, global claude CLI install, playwright chromium `--with-deps`, secrets fail-fast step, always()-artifact upload, timeout 90, `permissions: contents: read`, concurrency group. Verify: `test.yml` diff is empty; workflow YAML parses (actionlint if available, else node yaml parse).

## Final gate (orchestrator)

1. `bash scripts/checks/fixture-site-check.sh` green; harness acceptance (a)–(d) green.
2. `bash scripts/e2e-website-tier-a.sh` exit 0 on this branch (untouched but prove it).
3. Holistic review subagent over the full branch diff.
4. Spec changelog + DoD ticks (only what was actually verified), commit, push `-u origin build/16-website-e2e-tier-b`, draft PR (notes: stacking n/a — base main; the two key-gated DoD items left for Joshua: run `scripts/deploy-fixture-site.sh`, then dispatch the workflow or run the harness locally; then the report gets filed). STOP — Joshua merges.
