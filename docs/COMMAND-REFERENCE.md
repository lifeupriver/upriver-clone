# Upriver CLI — Command Reference

Every command, grouped by function. Descriptions come from the commands themselves (`upriver <command> --help` is always the final authority — it's smoke-tested in CI, so it can't drift silently). Unless noted, commands take a client `<slug>` argument, read from `clients/<slug>/`, and write back into it.

Conventions used below:

- **Dry-run by default** means the command only prints a plan until you pass the apply flag.
- **Agent-driven** means the command spawns headless Claude Code (`claude` on PATH, override with `CLAUDE_BIN`).
- Exit codes follow the repo-wide contract: `0` success, `2` usage/preflight error, `3` strict-provisioning gap; QA gates (`clone-links`, `clone-embeds`) exit non-zero on findings unless `--allow-*` is passed; `61` spend-ceiling abort (`run all`, `clone`); `62` strict fidelity gate (`clone-fidelity --strict-fidelity`); `pitch run` uses `21` (over-budget) and `22` (fidelity-fail).

---

## Engagement setup

### `upriver init <url>`
Initialize a new client engagement and discover all site URLs. Creates `clients/<slug>/`, writes `client-config.yaml` and `site-map.json`, detects the platform, and estimates scrape credits.
Flags: `--slug`, `--name`, `--vertical` (`wedding-venue` | `preschool` | `restaurant` | `professional-services` | `generic`).

### `upriver demo <url>`
One-shot demo: `init → run all → sync push` end to end. Slug and name auto-derived from the hostname.
Flags: `--slug`, `--name`, `--vertical`, `--audit-mode`, `--skip-sync`, `--skip-compress`, `--continue-on-error`.

### `upriver discover <slug>`
Full URL discovery and quick content inventory **without** spending screenshot or branding credits. Maps URLs, fetches GSC data when a service account is configured, detects the platform, collects review sources.
Flags: `--resume`. Writes: `site-map.json`, `content-inventory.json`, `discovery/`.

### `upriver scrape <slug>`
Firecrawl batch-scrape of every discovered URL with structured extraction (CTAs, contact, team, testimonials, FAQs, design tokens, branding profile).
Writes: `pages/*.json`, `rawhtml/*.html`, `design-tokens.json`, `branding-profile.json`. Cached — re-runs don't re-bill.

---

## Audit

### `upriver audit <slug>`
Run audit passes concurrently against scraped data. 15 base passes (`seo content design sales links schema aeo geo typography local backlinks competitors media gaps video`) plus, by mode, 3 LLM deep passes and 9 tooling passes.
Flags: `--pass=<name>` (one pass), `--mode=base|deep|tooling|all` (default `base`), `--deep-concurrency` (default 2), `--out`, `--vertical`.
Writes: `audit/<pass>.json`.

### `upriver audit-media <slug>`
F01 — score every image for authenticity/quality (stock/AI detection) and generate a replacement shot list with a one-day shoot plan and USD pricing. Sells the photography upsell.
Flags: `--sample-size` (1–100, default 30), `--threshold=low|medium|high`, `--no-shotlist`, `--force`.
Writes: `audit/media.json`, `audit/media-inventory.json`, `media-shotlist.md/.html`.

### `upriver gap-analysis <slug>`
F09 — missing pages and features for the vertical, plus a proposed information architecture. `proposed-sitemap.json` drives scaffold/clone/finalize redirect rules.
Flags: `--depth=quick|standard|deep`, `--competitors=<urls>`, `--no-ia`, `--force`.
Writes: `audit/gaps.json`, `gap-recommendations.md/.html`, `proposed-sitemap.json`.

### `upriver video-audit <slug>`
F12 — page-by-page video plan with prioritized shot lists and a production budget.
Flags: `--depth=standard|deep`, `--count` (default 8), `--budget-tier=starter|professional|premium`, `--force`. `OPERATOR_VIDEO_DAY_RATE` overrides day-rate pricing.
Writes: `video-audit/`.

### `upriver synthesize <slug>`
Compile the audit passes into `audit-package.json` — the hub artifact every downstream stage reads — plus client context docs. Uses the Anthropic API, falling back to the `claude` CLI.
Flags: `--force`.

---

## Deliverables & interview

### `upriver voice-extract <slug>`
F03 — derive a brand voice guide from scraped copy. Outputs `voice/voice-rules.json` (consumed by improve, design-brief, blog-topics, video-audit, and the natural-language admin) plus a markdown guide and sample rewrites. $750 standalone.
Flags: `--depth=quick|standard|deep`, `--include-emails=<path>`, `--audience`, `--force`.

### `upriver blog-topics <slug>`
F10 — ranked blog topic ideas with briefs, filtered by keyword difficulty and search intent. $750 standalone.
Flags: `--count` (default 25), `--difficulty=easy|medium|hard|all`, `--intent=…`, `--no-competitor-mining`, `--force`.
Writes: `blog-topics/`.

### `upriver schema-build <slug>`
F02 — generate JSON-LD schemas (LocalBusiness, FAQ, Service, Breadcrumb, Person, …) with vertical-aware `@type` mapping and a three-platform install guide. $500 standalone.
Flags: `--types=<list>`, `--no-pages`, `--force`.
Writes: `schema/`, `schema-install.md`.

### `upriver design-brief <slug>`
Generate the Claude Design handoff brief from `audit-package.json` (profile-first when a profile exists). Writes `claude-design-brief.md`.

### `upriver interview-prep <slug>`
Generate a customized client interview guide from audit findings.

### `upriver interview-link <slug>`
Mint (or reuse) the magic-link URL the client uses to fill out their interview.

### `upriver process-interview <slug>`
Mine public reviews, synthesize the interview transcript, and produce brand/voice/FAQ/asset docs.
Flags: `--transcript=<path>` (txt/md) or `--responses=<path>` (interview form output) — exactly one is required.

---

## Rebuild: scaffold, capture, clone

### `upriver scaffold <slug>`
Generate the Astro hybrid repo at `clients/<slug>/repo/` from the template — design tokens, typography, nav from site structure, seeded content collections, `CLAUDE.md`.
Flags: `--supabase-project-ref`.

### `upriver scaffold github|supabase|deploy <slug>`
Provisioning: create the GitHub repo and push / create the Supabase project, run migrations, write env vars / create the Vercel project and deploy a preview. **All dry-run by default.**

### `upriver major-pages <slug>`
Classify pages into "major" (homepage + nav targets + conventional hubs + real content pages) and "skipped". Consumed by `clone` and `capture-major`.
Flags: `--include`, `--exclude`, `--max` (default 25), `--json`. Writes `major-pages.json`.

### `upriver capture-major <slug>`
Full-page Playwright screenshots (desktop + mobile) of every major page → `design-handoff/` + manifest + a zip for Claude Design.
Flags: `--reuse-live` (default true), `--force`.

### `upriver capture-typography <slug>`
Probe the live homepage's computed font styles (body, h1–h4, links, buttons, nav) and logo dimensions → `typography-capture.json`, consumed by scaffold.
Flags: `--url`.

### `upriver capture-ux <slug>`
Profile interactive UX — carousels, animations, hover/scroll effects, sticky elements, video/iframe widgets — with flipbooks and optional recordings per page.
Flags: `--page`, `--no-video`, `--no-flipbook`, `--desktop-only`, `--hover-limit`, `--carousel-watch-ms`. Writes `ux-profile/`.

### `upriver clone <slug>` *(agent-driven)*
Visually clone the site page by page via headless Claude Code, with a per-page verify loop. Defaults to the major-page set; one PR per page unless `--no-pr`. Includes the hardening trio: per-page prompt-size preflight, one fresh retry on the no-file failure class, and a per-run **spend ceiling** checked before each page is dispatched — on a ceiling stop the remaining pages are recorded as skipped and the command exits **61** even if some pages succeeded (so an unattended `run all` never treats a budget-truncated clone as complete).
Flags: `--page`, `--all-pages`, `--skip`, `--include-junk`, `--concurrency` (default 3), `--no-pr`, `--no-worktree`, `--dry-run` (prints the cost-estimate line), `--no-verify`, `--verify-iterations`, `--design-system=client|upriver`, `--max-spend-usd` (default 25), `--no-spend-ceiling`.

### `upriver finalize <slug>`
Rewrite client-domain links to internal routes and CDN image URLs to local assets; optionally download missing assets first. Offline by default — `--download-missing` is the only network path.
Flags: `--dry-run`, `--verbose`, `--download-missing`, `--concurrency` (default 8).

---

## Clone QA

### `upriver clone-qa <slug>`
Screenshot every cloned route and render a side-by-side HTML report against the live screenshots → `clone-qa/index.html`.
Flags: `--port` (default 4322), `--width`, `--height`, `--full-page`.

### `upriver clone-fidelity <slug>`
Score cloned vs live per page (pixel diff + copy completeness) → `clone-qa/summary.json` + diff PNGs. Every scored page is then checked against a **per-page fidelity bar** (default 70, `CLONE_FIDELITY_BAR`): below-bar and unscored pages are warned about and recorded in the summary's `policy` block by default; `--strict-fidelity` turns that into a hard gate (exit **62**, fail-closed — a missing or unscored summary also fails). The separate pre-existing threshold of 80 still routes pages into `clone-fidelity-findings.json` for `fixes plan`: 80 decides what's worth improving, 70 decides what's acceptable at all.
Flags: `--out`, `--diff-dir`, `--clone-shots-dir`, `--live-shots-dir`, `--force`, `--fidelity-bar` (default 70), `--strict-fidelity`.

### `upriver clone-links <slug>` *(gate)*
Audit the cloned site's internal link graph: broken links, missing pages, orphans. **Exits non-zero on broken links or missing pages.**
Flags: `--no-build`, `--json`, `--allow-orphans`, `--fail-on-orphans`, `--allow-missing`, `--skip-live`. Writes `clone-link-audit.json`.

### `upriver clone-embeds <slug>` *(gate)*
Audit iframes, forms, and third-party widgets (Google Maps, YouTube, Calendly, Mailchimp, HubSpot, newsletters). **Exits non-zero on missing embeds** unless `--allow-missing`.
Flags: `--no-build`, `--json`, `--allow-missing`. Writes `clone-embed-report.json`.

---

## Fixes & improvement

### `upriver fixes plan <slug>`
Generate a structured work plan from approved audit findings — five phases (quick wins, copy/conversion, structural SEO, content build-out, AEO/local/authority) → `fixes-plan.md`.

### `upriver fixes apply <slug>` *(agent-driven)*
Apply approved audit fixes via headless Claude Code — one PR per finding, concurrent via git worktrees.
Flags: `--parallel`, `--concurrency` (default 3), `--finding=<id>`, `--no-pr`, `--dry-run`.

### `upriver improve <slug>` *(agent-driven, dry-run by default)*
Run the improvement-layer skill matrix against the cloned + verified site (copy upgrades, SEO/GEO, schema, CRO). `--no-dry-run` lands edits on `improve/<track>` branches.
Flags: `--matrix`, `--track`, `--skip`, `--no-worktree`, `--pr`/`--no-pr`.

### `upriver improve geo <slug>`
Generate `llms.txt`, `ai.txt`, FAQ + Organization JSON-LD, and per-page TL;DR snippets from `audit-package.json`.

### `upriver qa <slug>`
Re-run the audit passes against a preview URL and produce a QA report vs. the original audit.
Flags: `--preview-url`, `--mode=preview|production`, `--max-pages`, `--skip-scrape`.

### `upriver launch-checklist <slug>`
Generate the DNS migration, redirect, GSC, and analytics launch checklist. Operator-only; not part of `run all`.

---

## Intake & profile engine

Full semantics in [`INTAKE-PROFILE-ENGINE.md`](INTAKE-PROFILE-ENGINE.md). These commands default to the Supabase data source; set `UPRIVER_DATA_SOURCE=local` for offline work.

### `upriver recon <slug>`
Automated profile fill. Runs recon adapters (`website`, `gbp`, `socials`, `geo`, `serp`) and merges `source:"recon"` candidates into the Client Profile — filling gaps, never overwriting higher-precedence data, never marking anything verified.
Flags: `--adapters=<list>`, `--dry-run`, `--fresh`.

### `upriver recon secret-shopper start <slug>` / `record <slug>`
Log a secret-shopper inquiry you sent **manually** (recon never contacts the business itself), then record the reply — response time merges into `salesProcess.firstTouch.responseTime` as a recon candidate.

### `upriver profile show <slug>`
Coverage report: readiness per deliverable (ready/blocked and why), conflict queue, generated-but-unapproved docs, fill stats.
Flags: `--json`, `--deliverable=<doc-id>`.

### `upriver profile import <slug> <file>`
Validate a hand-filled profile JSON and persist it (per-field merge, or `--replace` wholesale). Flags: `--replace`, `--dry-run`.

### `upriver profile set <slug> <section> <field> <value>`
Set a single profile field.

### `upriver profile verify <slug>`
Mark fields human-verified — the act that unlocks generation gates for human-verify-required fields.

### `upriver profile conflicts <slug>`
Display and resolve the conflict queue (conflicting values from different sources awaiting an operator decision).

### `upriver profile extract-transcript <slug> <file>`
Extract facts from an interview transcript and propose profile updates.

### `upriver profile migrate-intake <slug>`
Migrate a legacy intake file to the Client Profile schema.

### `upriver profile push <slug>` / `pull <slug>`
Sync the local profile with Supabase, merging by standard rules — conflicts and verified values are never overwritten.

### `upriver generate <slug>` *(agent-driven)*
Generate AI Operating System documents and provisioning artifacts from the Client Profile via write-capable headless Claude Code sessions, gated on coverage and human-verify-required fields.
Modes: `--doc <id>` (one of doc-01…18, doc-web-prd, design-system, i01…09) · `--all` (DAG-batch docs 01–18 with per-tier Continue gates) · `--all --provisioning` (I01–I09) · `--web` (website tier).
Flags: `--docs=<subset>`, `--from=<id>` (resume), `--dry-run`, `--yes`, `--model`, `--jobs` (parallel tiers — needs local data source), `--full-upstream`, `--strict-provisioning`.
**Exit codes**: `2` — a prompt exceeded the token ceiling (preflight); `3` — `--strict-provisioning` found provisioning gaps.

---

## Reporting

### `upriver report build <slug>`
Self-contained static export of the audit report (index, scorecard, findings, next-steps) → `report-static/`. Boots the local dashboard, fetches each route, rewrites URLs relative, bundles assets.
Flags: `--port` (default 4399), `--rebuild`, `--upload`, `--force`.

### `upriver report pdf <slug>`
Render the audit report as a merged PDF (plus per-route PDFs for debugging).

### `upriver report bundle <slug>`
Zip `report-static/` + audit/intake/fidelity/opportunities files into a single deliverable bundle.

### `upriver report send <slug>`
Render a "View report" email body for the operator to forward. Sends via Resend when `RESEND_API_KEY` is set; otherwise prints.

### `upriver report compare <before> <after>`
Diff two `audit-package.json` files and emit a markdown comparison.

### `upriver monitor <slug>`
F06 — one-page delta report comparing the rebuilt site's current state to a baseline. Runs weekly via the worker cron for retainer clients.
Flags: `--baseline=qa|previous|original`, `--no-email`, `--lite`, `--force`. Writes `monitoring/`.

### `upriver followup <slug>`
F07 — 6-month re-audit producing a case study draft and re-engagement doc (in the client's voice via F03's voice rules) for a former client. Writes `followups/`.

---

## Dashboard & sync

### `upriver dashboard`
Start the local dashboard (Astro SSR). Flags: `--port` (default 4321), `--clients` (default `./clients`).

### `upriver dashboard export <slug>`
Open the client deliverables in the browser for PDF export.

### `upriver sync push <slug>` / `pull <slug>`
Upload/download `clients/<slug>/` to/from the Supabase Storage bucket (feeds the hosted dashboard, supports multi-machine work). Skips `node_modules/`, `.git/`, `.DS_Store`.
Flags: `--exclude=<path>` (repeatable), `--dry-run`. Idempotent.

---

## Natural-language admin (F05)

### `upriver admin-deploy <slug>`
Set up the per-client admin: copies issue templates, label manifest, and the optional Vercel form into `clients/<slug>/admin/`; generates a form PIN; prints the operator guide. Optionally invokes `gh` and `vercel` to apply remotely.
Flags: `--repo=<owner/name>`.

### `upriver admin-status <slug>`
Show the admin status: repo, form, pause flag, last run.

### `upriver admin-pause <slug>`
Pause (or `--resume`) processing — while paused, `admin-process` refuses to run and the webhook handler refuses events.

### `upriver admin-rotate-pin <slug>`
Generate a fresh form PIN; the operator hashes it and updates `FORM_PIN_HASH` on the Vercel deployment.

### `upriver admin-process <slug>` *(agent-driven)*
Manually run the change-request processor against a checked-out repo — the same code path the webhook handler uses; convenient for end-to-end testing.
Flags: `--repo-dir`, `--issue-number`, `--issue-title`, `--issue-body-file`.

---

## Sales artifacts

### `upriver prototype-app <slug>`
F04 — generate an Expo React Native prototype pulling brand colors, real content, and F01-flagged authentic photography. Output runs via `cd clients/<slug>/app-prototype && npm install && npx expo start`.

### `upriver custom-tools <slug>`
F11 — propose 3–5 bespoke backend tools tailored to the client's industry and operational signals, scoped and priced ($5K–$15K per tool). Writes `custom-tools/`.

---

## Pitch engine (prospect outreach)

Full semantics in [`PITCH-ENGINE.md`](PITCH-ENGINE.md). Prospects live in ordinary `clients/<slug>/` dirs with `stage: prospect`; everything stays draft-state until `pitch approve`.

### `upriver pitch run <url>` *(agent-driven)*
Clone the prospect's homepage, generate the four-doc teaser bundle, mint the preview share token (14-day default expiry) and questionnaire link, and draft the outreach email — all to `clients/<slug>/pitch/`, state `draft`. Refuses to touch an existing client dir unless `--force-prospect`. Spend ceiling checked before every costed step.
Flags: `--slug`, `--name`, `--vertical`, `--max-spend-usd` (default 5), `--expires-days` (cap 30), `--base-url`, `--force-prospect`, `--from=<step-id>`, `--dry-run` (keyless/offline: step plan + cost table).
**Exit codes:** `21` over-budget (aborted before the costed step), `22` homepage fidelity below `PITCH_FIDELITY_MIN` (nothing staged).

### `upriver pitch batch <file>`
`pitch run` over a newline-delimited URL list (`#` comments allowed), sequentially. Per-prospect failures are isolated; exits non-zero if any prospect failed, with a per-prospect outcome table. Never sends.
Flags: `--max-spend-usd` (per prospect), `--max-batch-spend-usd` (default 50, checked before each prospect), `--expires-days`, `--base-url`, `--dry-run`.

### `upriver pitch approve <slug>` *(the only send path)*
Render the exact email, portal URL, questionnaire URL, and teaser list; check the suppression list; confirm interactively; send via Resend. Refuses on suppression, expired token, fidelity-fail, non-draft state, or missing sender/postal identity. The footer carries an HMAC-signed one-click unsubscribe link.
Flags: `--to`, `--from`, `--postal`, `--base-url`, `--yes`, `--dry-run`.

### `upriver pitch status [<slug>]`
Funnel view across prospects: state, spend (`est + act` split when `token-and-credit-usage.log` exists), sent-at, VIEWED (first portal open), questionnaire-answered, token expiry.

### `upriver pitch convert <slug>`
Flip `stage: prospect → client` and map questionnaire answers into `identity.*`/profile candidates (source-tagged `interview`; verified data never overwritten). Idempotent; refuses without `interview-responses.json` unless `--no-answers`.

### `upriver pitch revoke <slug>`
Takedown in one command: revoke the share + interview tokens, set state `revoked`, unstage the portal preview.

---

## Operations

### `upriver run all <slug>`
Orchestrate every pipeline stage in dependency order. Optional stages are attempted but don't halt the run; the pipeline stops on the first non-optional failure. A per-run **spend ceiling** (default $25) is checked in code before every costed stage — over-ceiling aborts with exit **61** before spending; the remaining budget is passed down to the clone stage via `--max-spend-usd`. Per-stage estimates and usage-log actuals land in `clients/<slug>/run-ledger.json` (v1); `--dry-run` prints the same cost-estimate table the ceiling enforces.
Flags: `--from=<stage-id>`, `--dry-run`, `--continue-on-error`, `--audit-mode=base|deep|tooling|all`, `--max-spend-usd` (default 25), `--no-spend-ceiling`, `--strict-fidelity` (passes through to clone-fidelity and escalates its exit 62 to a hard run failure).

### `upriver doctor`
Preflight: check API keys and external binaries; report which features are available, degraded, or unavailable. Diagnostic — always exits 0.

### `upriver cost <slug>`
Summarize `token-and-credit-usage.log`; optionally estimate a future command from historical averages.
Flags: `--estimate=<command>`, `--usd-per-credit` (default 0.001).

### `upriver harvest`
Sweep every `clients/*/` dir (prospects, clients, and `matrix-*` runs) into one versioned findings corpus + report — fidelity distribution, spend, pitch funnel counts, and a **calibration section** that recommends `PITCH_FIDELITY_MIN`/`CLONE_FIDELITY_BAR` values once ≥20 scored pages exist (below that it honestly reports "insufficient data"; recommendations are applied by hand, never auto). Reads only standard artifacts (`pitch/state.json`, `clone-qa/summary.json`, `audit-package.json` meta, `run-ledger.json`, `pitch/views.json`); a corrupt file degrades that source, never the sweep. Never reads tokens, emails, or questionnaire answers — the corpus is the sanitized, committable derivative of the gitignored client dirs.
Flags: `--out` (default `.planning/website-rebuild-engine/corpus/`), `--dry-run` (sweep plan only). Writes `<date>-harvest.json` + `<date>-harvest-report.md`.

### `upriver compress-images <slug>`
Recompress PNG/JPG screenshots to AVIF (or WebP). Idempotent.
Flags: `--format=avif|webp`, `--quality`, `--replace`, `--min-bytes`, `--dry-run`.

### `upriver archive <slug>`
Tar+gzip `clients/<slug>/` and upload to Backblaze B2; optionally purge from Supabase Storage. Run after an engagement is delivered. Requires `B2_*` env vars.
Flags: `--include-repo`, `--include-clone-compare`, `--purge-supabase`, `--dry-run`.

### `upriver restore <slug>`
Download the archived tarball from B2, extract to `clients/<slug>/`, and (by default) re-push to Supabase.
Flags: `--object-key`, `--no-resync`.
