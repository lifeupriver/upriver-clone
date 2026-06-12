# Upriver — Operator User Guide

Workflow-oriented guide for using the `upriver` CLI and dashboard end-to-end on a real client engagement.

For setup, env vars, and developer-side concerns see [`README.md`](../README.md). For per-command flags and exit codes see [`COMMAND-REFERENCE.md`](COMMAND-REFERENCE.md). For the intake & profile engine (`recon` / `profile` / `generate`) see [`INTAKE-PROFILE-ENGINE.md`](INTAKE-PROFILE-ENGINE.md).

---

## TL;DR — your first client in five commands

You have a URL. The client is `Audrey's Coffee` at `https://audreyscoffee.com`. Run:

```bash
upriver init https://audreyscoffee.com   # creates clients/audreys/
upriver run all audreys                  # full pipeline (≈30–90 min wall time)
upriver report build audreys             # self-contained static report export
upriver sync push audreys                # publishes artifacts to the hosted dashboard
upriver report send audreys              # renders the "View report" email to forward
```

Or compress the first four into one: `upriver demo https://audreyscoffee.com` runs init → run all → sync push end to end (slug and name auto-derived from the hostname; `--skip-sync`, `--continue-on-error`, and `--audit-mode` available).

Everything else in this guide is the reasoned long-form of those five lines.

---

## Concepts (read once, refer back rarely)

| Term | Meaning |
|---|---|
| **slug** | Short kebab-case id for a client (`audreys`, `barneys-bbq`). Derived from the URL on `init`. Used as the directory name and as the URL segment in the dashboard. |
| **client directory** | `clients/<slug>/` on disk. Holds every artifact the pipeline produces — config, scraped pages, audit findings, the brief, the cloned site source, the profile, generated docs. |
| **pipeline** | A fixed sequence of CLI commands that take a slug from "URL only" to "site rebuilt and QA-passed". The canonical stage list lives in `packages/core/src/pipeline/stages.ts` and is shared by `run all` and the dashboard's Run buttons. Each command is independently re-runnable. |
| **vertical** | `wedding-venue`, `preschool`, `restaurant`, `professional-services`, or `generic`. Set on `init --vertical`; tunes audit heuristics, schema types, and copy. |
| **profile** | The Client Profile (`profile.json`) — the Zod-typed fact base of the intake & profile engine. Filled by `recon`, transcript extraction, and operator edits; gates `generate`. |
| **dashboard** | The Astro web UI in `packages/dashboard`. Local mode reads `clients/` from your laptop disk; hosted mode reads from a Supabase Storage bucket. |
| **data source** | Either `local` (operator's laptop) or `supabase` (hosted). Set via `UPRIVER_DATA_SOURCE`. The dashboard defaults to `local`; the profile/generate engine defaults to `supabase`. |
| **share link** | A URL like `https://upriver-platform.vercel.app/deliverables/audreys?t=<token>` that lets a client read *their* deliverables without an operator login. Tokens live in Postgres (`share_tokens` table); operators mint and revoke them in the dashboard. |
| **operator** | You. A Supabase Auth user whose `app_metadata.role === 'operator'`. The single seed email is set out-of-band; nothing in the codebase mints operator status. |

---

## The pipeline at a glance

```
init  →  scrape  →  audit (+media/gaps/video)  →  synthesize  →  design-brief
                                                                      ↓
launch ← qa ← improve ← fixes ← clone-fidelity ← finalize ← clone ← scaffold
```

Each stage reads the previous stages' files in `clients/<slug>/` and writes its own. You can stop at any stage and resume hours or days later. Re-running a stage is safe — most are idempotent and skip work that's already complete.

A complete pipeline takes 30–90 minutes wall time depending on site size and which deep-audit passes are enabled. Active human time per engagement is typically 2–4 hours across 1–2 weeks — most of it the interview and PR review.

---

## End-to-end walkthrough

### 0. Setup (one-time)

```bash
git clone https://github.com/lifeupriver/upriver-clone
cd upriver-clone
pnpm install
pnpm build
cp .env.example .env
# fill in FIRECRAWL_API_KEY, ANTHROPIC_API_KEY, etc.
cd packages/cli && npm link && cd ../..   # so `upriver` is on PATH
upriver doctor                            # verifies env + binaries
```

`doctor` is diagnostic, not gatekeeping — it always exits 0 and tells you which features are available, degraded, or unavailable with your current keys.

### 1. Initialize the client

```bash
upriver init https://audreyscoffee.com --vertical=restaurant
```

This creates `clients/audreys/`, writes `client-config.yaml` (name, URL, derived slug, platform detection), maps the site into `site-map.json`, and estimates the credits a full scrape will cost. Override the derived slug/name with `--slug` / `--name`.

### 2. Scrape every page

```bash
upriver scrape audreys
```

Firecrawl batch-scrapes every discovered URL with structured extraction — CTAs, contact info, team, testimonials, FAQs, design tokens, branding profile. Output: `pages/*.json`, `rawhtml/*.html`, `design-tokens.json`, `branding-profile.json`. This is the most credit-expensive step; responses are cached so re-runs don't re-bill.

`upriver discover audreys` is the credit-efficient sibling — URL discovery + content inventory + GSC data (if a service account is configured) without screenshots or branding extraction.

### 3. Run the audit passes

```bash
upriver audit audreys
```

Default: 15 base passes — seo, content, design, sales, links, schema, aeo, geo, typography, local, backlinks, competitors, media, gaps, video. Add `--mode=deep` for 3 LLM-driven passes (content strategy, conversion psychology, competitor deep-dive), `--mode=tooling` for 9 tool-driven passes (Lighthouse, squirrelscan, Playwright, accessibility/CWV/trust), or `--mode=all` for everything. Run a single pass with `--pass=seo`.

Output: `audit/<pass>.json` per pass. Each finding carries a priority (`p0` blocking, `p1` important, `p2` nice-to-have), a score impact, and a structured location reference.

Three optional deep-dive audits double as sellable deliverables:

```bash
upriver audit-media audreys     # F01 — image authenticity + one-day replacement shot list with pricing
upriver gap-analysis audreys    # F09 — missing pages/features + proposed-sitemap.json (drives rebuild IA)
upriver video-audit audreys     # F12 — page-by-page video plan + production budget
```

### 4. Synthesize the audit package

```bash
upriver synthesize audreys
```

Composes the per-pass JSONs into one `audit-package.json` — executive summary, brand voice draft, impact metrics, site structure, design system. **This file is the hub**: report rendering, scaffold, clone, fixes, and the dashboard all read from it.

Two more optional standalone deliverables fit here:

```bash
upriver voice-extract audreys   # F03 — brand voice guide + machine-readable voice-rules.json ($750 standalone)
upriver schema-build audreys    # F02 — JSON-LD schemas + 3-platform install guide ($500 standalone)
upriver blog-topics audreys     # F10 — 25 ranked blog topics + briefs ($750 standalone)
```

### 5. Render the design brief

```bash
upriver design-brief audreys
```

The Claude Design handoff brief (`claude-design-brief.md`) combining audit findings + brand voice + profile facts (profile-first when a profile exists). This anchors the rebuild planning.

### 6. The interview (human-in-the-loop)

```bash
upriver interview-prep audreys                  # customized 90-minute interview guide
upriver interview-link audreys                  # magic-link URL for the client's intake form
# --- run the interview; save the transcript ---
upriver process-interview audreys --transcript ./audreys-interview.txt   # mine reviews + transcript → brand/voice/FAQ/asset docs
#   (or --responses for the /deliverables/<slug>/interview form output)
upriver profile extract-transcript audreys ./audreys-interview.txt   # propose profile updates from the transcript
```

### 7. Scaffold the new site

```bash
upriver scaffold audreys
```

Generates the Astro hybrid repo at `clients/audreys/repo/` from `packages/scaffold-template/` — design tokens, typography capture, nav from the site structure, content collections seeded with scraped pages/testimonials/FAQs/team, plus a `CLAUDE.md` and product-marketing context for downstream agents.

Optional provisioning (each is **dry-run by default**; pass the prompt-confirmed flags to apply):

```bash
upriver scaffold github audreys      # create GitHub repo + push
upriver scaffold supabase audreys    # create Supabase project + migrations + env
upriver scaffold deploy audreys      # create Vercel project + preview deploy
```

### 8. Narrow the clone scope, capture the original

```bash
upriver major-pages audreys          # classify pages into major vs skipped (--include/--exclude/--max)
upriver capture-major audreys        # full-page desktop+mobile screenshots → design-handoff/ + zip
upriver capture-typography audreys   # computed font styles from the live homepage → typography-capture.json
upriver capture-ux audreys           # carousels/animations/hover/sticky profiling (+flipbooks, videos)
```

`clone` and `capture-major` default to the major-page set, which keeps token spend proportional to what matters.

### 9. Clone every page

```bash
upriver clone audreys --no-pr
```

For each major page, a headless Claude Code session recreates the page in Astro/Tailwind against the original screenshot + extracted DOM, with a per-page verify loop. Useful flags: `--page=<path>` (one page), `--all-pages`, `--concurrency=3`, `--design-system=client|upriver` (reproduce the live brand exactly vs. apply house tokens), `--dry-run`. Drop `--no-pr` once you have a target repo — then it's one PR per page.

### 10. Finalize

```bash
upriver finalize audreys --download-missing
```

Rewrites client-domain links to internal Astro routes and CDN image URLs to local assets, downloading anything missing first. After this, `pnpm dev` inside `clients/audreys/repo/` serves a fully navigable copy.

### 11. Clone QA (recommended before showing anyone)

```bash
upriver clone-qa audreys         # side-by-side screenshots: cloned vs live → clone-qa/index.html
upriver clone-fidelity audreys   # per-page pixel + copy-completeness scores → clone-qa/summary.json
upriver clone-links audreys      # link graph audit; exits non-zero on broken/missing pages
upriver clone-embeds audreys     # maps/forms/video/widget embeds; exits non-zero on missing embeds
```

The last two are CI-friendly gates: wire them into any automation and a regression fails the run.

### 12. Plan and apply the fixes

```bash
upriver fixes plan audreys
# --- review with the client; sign off ---
upriver fixes apply audreys --parallel
```

`fixes plan` clusters audit findings into five phases (quick wins, copy/conversion, structural SEO, content build-out, AEO/local/authority) in `fixes-plan.md`. `fixes apply` walks the plan with headless Claude Code — one PR per finding, concurrent via git worktrees with `--parallel`. `--finding=<id>` applies one, `--dry-run` previews.

### 13. QA against the original audit

```bash
upriver qa audreys --preview-url https://audreys-preview.vercel.app
```

Re-runs the audit passes against the rebuilt site and produces a scorecard delta vs. the original — the artifact that demonstrates the lift to the client.

### 14. Improvement layer (optional second pass)

```bash
upriver improve audreys              # dry-run by default: prints the track plan
upriver improve audreys --no-dry-run # apply: edits land on improve/<track> branches + PRs
upriver improve geo audreys          # llms.txt, ai.txt, FAQ/Organization JSON-LD, per-page TL;DRs
```

### 15. Launch

```bash
upriver launch-checklist audreys
```

Operator-only checklist: DNS migration, redirects from old URLs, GSC, analytics, sitemaps — the items that need human judgment and credentials. Not part of `run all`.

---

## Running it all in one shot

```bash
upriver run all audreys
```

Walks every stage in dependency order with sensible flags (`clone --no-pr`, `finalize --download-missing`, `improve --dry-run`). Skips `init` (needs a URL) and `launch` (operator-only). Optional stages (media/gap/video audits, voice, blog topics, schema, fidelity, improve) are attempted but don't halt the pipeline.

Flags:
- `--audit-mode=base|deep|tooling|all` — pass-through to `audit --mode`.
- `--from=<stage-id>` — resume at a stage (run with `--dry-run` to see the stage ids).
- `--continue-on-error` — keep going after a failure (diagnostics).
- `--dry-run` — print the planned stages plus the cost-estimate table without executing.
- `--max-spend-usd` (default 25) / `--no-spend-ceiling` — the per-run spend ceiling, checked in code **before** every costed stage. An over-ceiling run aborts with exit 61 before spending a cent; the remaining budget is handed down to the clone stage. Per-stage estimates and usage-log actuals are recorded in `clients/<slug>/run-ledger.json`.
- `--strict-fidelity` — turn the clone-fidelity stage's warn-and-record default into a hard gate: any page below the per-page bar (default 70) fails the run with exit 62. Without the flag, below-bar pages still land but are listed loudly in the run summary and recorded in `clone-qa/summary.json` for `fixes plan`.

---

## The intake & profile engine (recon → profile → generate)

The website pipeline above works from scraped evidence. The intake & profile engine works from **verified facts**: a structured Client Profile that gates generation of the 18-document AI Operating System deliverable set. Full doc: [`INTAKE-PROFILE-ENGINE.md`](INTAKE-PROFILE-ENGINE.md). The short version:

```bash
upriver recon audreys                       # auto-fill the profile from website/GBP/socials/geo/SERP adapters
upriver profile show audreys                # coverage report: what's filled, what's blocking which deliverable
upriver profile set audreys company name "Audrey's Coffee"   # manual field edits
upriver profile conflicts audreys           # resolve conflicting values from different sources
upriver profile verify audreys              # mark fields human-verified (unlocks generation gates)
upriver generate audreys --all              # DAG-batch generate docs 01–18 with per-tier Continue gates
upriver generate audreys --all --provisioning --strict-provisioning   # I01–I09 artifacts; exit 3 on gaps
upriver generate audreys --web              # post-fork website tier (doc-web-prd, design-system)
```

Things to know:

- **Recon never lies upward.** Recon-sourced values fill gaps only — they never overwrite higher-precedence data and are never marked verified. Verification is always a human act (`profile verify`).
- **Secret shopper** (`upriver recon secret-shopper start/record`) logs an inquiry *you* send manually and records the business's reply to measure first-touch response time. Recon never contacts the business itself.
- **Exit codes matter here**: `generate` exits **2** when a prompt exceeds the token ceiling (preflight) and **3** when `--strict-provisioning` finds provisioning gaps — script accordingly.
- `profile push` / `profile pull` sync the profile with Supabase using merge rules that never clobber verified values or open conflicts.

---

## Prospecting with the pitch engine

Before there's a client, there's a prospect. The pitch engine clones **just their homepage**, builds a four-doc teaser bundle (before/after, top-3 quick wins, brand-voice sample, vertical snapshot — no pricing anywhere), and stages it behind a token-gated, noindexed preview link that dies in 14 days or on revoke. Full doc: [`PITCH-ENGINE.md`](PITCH-ENGINE.md). The short version:

```bash
upriver pitch run https://prospect.example --dry-run    # step plan + cost table, keyless
upriver pitch run https://prospect.example              # draft bundle → clients/<slug>/pitch/ (≈$5 ceiling)
upriver pitch approve <slug>                            # THE ONLY SEND PATH: shows the exact email + links, then Resend
upriver pitch status                                    # funnel: status, spend, sent, viewed, answered
upriver pitch convert <slug>                            # prospect → client; questionnaire answers seed the profile
upriver pitch revoke <slug>                             # 10-second takedown on request
```

Things to know:

- **Nothing sends without you.** `run` and `batch` only produce drafts; `approve` renders exactly what the prospect will receive and checks the suppression list before sending. Unsubscribe and the CAN-SPAM postal footer are built into the send path (`UPRIVER_PITCH_FROM`, `UPRIVER_OUTREACH_POSTAL`, `UPRIVER_UNSUBSCRIBE_SECRET`).
- **Budget is enforced in code** — per prospect (default $5) and per batch (default $50), checked before each costed step; an over-budget run aborts cleanly with partial artifacts preserved.
- **A bad clone never ships.** A homepage scoring below the fidelity bar is never staged to the portal — the run stops at `fidelity-fail` with the worktree preserved.
- **Converting is the bridge to everything above**: `pitch convert` flips the directory to `stage: client` and the normal engagement pipeline takes over with the questionnaire answers already mapped into the profile.

---

## Working with the dashboard

### Local dashboard (everyday operator use)

```bash
upriver dashboard            # or: pnpm --filter @upriver/dashboard run dev
# → http://localhost:4321
```

Reads `clients/` from disk. Click a client to see config, the audit report, the brief, brand voice, profile coverage, the cloned-site preview, the fixes plan, the QA scorecard. The Pipeline panel lets you click **Run** on any stage — equivalent to running the CLI command yourself.

`upriver dashboard export audreys` opens the client deliverables in a browser for PDF export.

### Hosted dashboard (sales surface + remote access)

Production: <https://upriver-platform.vercel.app>

Reads from the Supabase Storage bucket. Slugs only show up after `upriver sync push <slug>`. Sign in with the operator email (magic link, no password).

> **Pipeline runs from the hosted dashboard require Phase 3 worker provisioning** (Inngest Cloud + a deployed worker). Until that's set up, the hosted dashboard is read-only — viewing artifacts and managing share links works, but clicking Run will fail. See `docs/DEPLOYMENT-GUIDE.md`.

---

## Distributing deliverables to a client

### Option A: send a share link (recommended)

1. From the hosted dashboard, open the client overview, click **Share Links**.
2. Set an optional label and pick an expiry (default 90 days).
3. Click **Mint share link** — the URL is auto-copied.

The recipient can read every page under `/deliverables/<slug>/*` without signing in, and nothing else. Revoke at any time from the same page — effective immediately.

### Option B: send a static bundle (no hosted dependency)

```bash
upriver report build audreys     # self-contained static export → clients/audreys/report-static/
upriver report pdf audreys       # merged PDF (plus per-route PDFs)
upriver report bundle audreys    # zip report-static + audit/intake/fidelity/opportunities files
```

Email the zip or PDF directly. No tokens, no expiry — once sent, you can't revoke it.

### Option C: emailed link

```bash
upriver report send audreys
```

Renders a branded "View report" email body for you to forward. Sends via Resend when `RESEND_API_KEY` is set; otherwise prints the body for manual sending.

`upriver report compare <before.json> <after.json>` diffs two audit packages into a markdown comparison — useful for before/after proof.

---

## Retainer and post-engagement work

```bash
upriver monitor audreys      # F06 — weekly one-page delta report vs baseline (runs on the worker cron for retainer clients)
upriver followup audreys     # F07 — 6-month re-audit → case study draft + re-engagement doc in the client's voice
upriver prototype-app audreys   # F04 — runnable Expo React Native prototype as a sales artifact
upriver custom-tools audreys    # F11 — 3-5 priced bespoke backend tool proposals ($5K–$15K upsells)
```

### Natural-language admin (the retainer hook)

Once a site is live, wire the per-client admin so the client submits plain-English change requests via GitHub Issues (or the optional Vercel form) and headless Claude Code opens a PR for you to review and merge:

```bash
upriver admin-deploy audreys --repo=lifeupriver/audreys-site   # templates, labels, form, PIN, operator guide
upriver admin-status audreys            # repo, form, pause flag, last run
upriver admin-pause audreys             # stop processing (--resume to restart)
upriver admin-rotate-pin audreys        # fresh form PIN
upriver admin-process audreys --repo-dir=/tmp/audreys-site --issue-number=42 ...   # manual single-issue test
```

The production webhook path lives in the worker; `admin-process` runs the same code path locally for testing.

---

## Working across machines

```bash
# desktop:
upriver sync push audreys
# laptop:
upriver sync pull audreys
```

`push` uploads `clients/audreys/` to the Supabase bucket, skipping `node_modules/`, `.git/`, `.DS_Store`. `--exclude=<path>` adds skips (e.g. `--exclude=repo`); `--dry-run` previews. `pull` is the inverse. Both are idempotent. These same commands feed the hosted dashboard.

### Archival (after delivery)

```bash
upriver archive audreys --purge-supabase    # tar.gz → Backblaze B2; optionally free the Supabase tier
upriver restore audreys                     # pull the tarball back and (by default) re-sync to Supabase
upriver compress-images audreys             # recompress screenshots to AVIF/WebP first to shrink the archive
```

Requires the `B2_*` env vars (see README).

---

## Common operations

### Re-run a stage with different flags

Just re-run it. Most stages are idempotent or version their outputs. To force a fresh run, delete the stage's output (e.g. `rm clients/audreys/audit-package.json`) or pass the stage's `--force` flag where it has one.

### Resume after a failure

```bash
upriver run all audreys --from=clone
```

### Estimate and track spend

```bash
upriver cost audreys                       # summarize token-and-credit-usage.log
upriver cost audreys --estimate=scrape     # project a future command from historical averages
upriver run all audreys --dry-run          # per-stage cost-estimate table vs the spend ceiling
cat clients/audreys/run-ledger.json        # per-stage estimates + reconciled actuals from the last run
upriver harvest --dry-run                  # corpus sweep plan across all clients/prospects/matrix runs
```

Spend ceilings (`run all`, `clone`, `pitch run/batch`) enforce against **estimates before the step is taken** — that's the safety property. Actuals from the usage log are reconciled afterwards into `run-ledger.json` and the `pitch status` display; they never weaken the pre-spend check.

### See what a run would do without running

`--dry-run` exists on `run all`, `clone`, `fixes apply`, `improve`, `finalize`, `generate`, `sync push/pull`, `archive`, `compress-images`, `pitch run/batch/approve`, `harvest`, and the `scaffold github/supabase/deploy` provisioning commands (those are dry-run *by default*).

### Abort a long-running stage

Ctrl-C in the terminal — partial work is preserved on disk for resume. The dashboard's Run button has an Abort that sends SIGTERM (then SIGKILL) to the spawned subprocess.

---

## Troubleshooting

### `upriver doctor` flags `claude` not on PATH

Install Claude Code (<https://docs.claude.com/en/docs/claude-code/overview>) or set `CLAUDE_BIN`. Required for `clone`, `fixes apply`, `improve`, `generate`, and other agent-driven commands.

### `firecrawl: 429 Too Many Requests`

You've hit the Firecrawl plan's rate limit. Wait or upgrade. Scrape responses are cached, so re-running won't re-bill the same URLs.

### A command exits 2 or 3 and you don't know why

That's the exit-code contract, not a crash: **2** = usage/preflight error (bad flags, or a `generate` prompt over the token ceiling), **3** = `generate --strict-provisioning` found provisioning gaps. Read the last lines of output — each failure names the exact check that failed. Stack traces are never expected; if you see one, that's a bug worth filing.

### Clone fidelity is poor for a specific page

Re-run just that page: `upriver clone audreys --page=/specific-path --no-pr`, then `upriver clone-fidelity audreys` to re-score. Inspect `clone-qa/index.html` for the side-by-side and `clone-qa/diff/` for pixel diffs — usually the fix is a component the cloner couldn't pattern-match, or an embed flagged by `clone-embeds`.

### Magic-link email never arrives (hosted dashboard)

Check the Supabase Auth logs for `mail.send` events. If you've hit the built-in mailer's rate limit, wire Resend SMTP into Supabase Auth → SMTP Settings.

### `/clients` 302s to `/login` after signing in

Your auth user exists but `app_metadata.role` isn't `operator`:

```sql
update auth.users
  set raw_app_meta_data = jsonb_set(coalesce(raw_app_meta_data, '{}'::jsonb), '{role}', '"operator"'::jsonb)
  where email = '<operator email>';
```

Then sign out and back in so the JWT picks up the role.

### Dashboard says "Storage backend not yet available"

The route requires the local filesystem but `UPRIVER_DATA_SOURCE=supabase` is set. Flip the env var locally, or push the slug's data to the bucket via `upriver sync push`.

### Hosted dashboard's Run button hangs / errors

Phase 3 worker provisioning isn't complete — the dashboard is emitting Inngest events no worker consumes. See `docs/DEPLOYMENT-GUIDE.md`.

### `generate` refuses to produce a document

Run `upriver profile show <slug> --deliverable=<doc-id>`: the coverage report names the missing or unverified fields blocking that deliverable. Fill them (`profile set`, `recon`, transcript extraction), resolve `profile conflicts`, and `profile verify` the human-verify-required ones.

---

## Glossary

- **Audit pass** — one of 15 base evaluators that score one dimension of a site and emit findings.
- **Deep / tooling pass** — heavier passes added via `--mode`: 3 LLM-driven (deep) and 9 external-tool-driven (tooling: Lighthouse, squirrelscan, Playwright, accessibility/CWV/trust).
- **Finding** — a structured `{ priority, score impact, location, recommendation, rationale }` record. Aggregated into `audit-package.json`.
- **Pipeline stage** — one CLI command in the canonical sequence (`packages/core/src/pipeline/stages.ts` — single source of truth for `run all` and the dashboard).
- **Major pages** — the homepage + nav targets + conventional hubs + real content pages, per `major-pages.json`. Default scope for clone and capture.
- **Client Profile** — the Zod-typed fact base (`@upriver/schemas`) behind `recon`/`profile`/`generate`. Fields carry source provenance and a verified flag.
- **Coverage / gates** — per-deliverable readiness: a doc generates only when its required fields are filled, human-verify-required fields are verified, and upstream docs are approved.
- **Bucket** — Supabase Storage bucket (default `upriver`); holds per-slug artifacts in hosted mode. Private; reads use signed URLs.
- **Service-role key** — `UPRIVER_SUPABASE_SERVICE_KEY`. Bypasses RLS. Server-side only.
- **Publishable key** — `UPRIVER_SUPABASE_PUBLISHABLE_KEY`. Subject to RLS; safe in client code.
- **PKCE flow** — the code-exchange flow Supabase Auth uses for magic links.
- **Prospect** — a `clients/<slug>/` dir with `stage: prospect`, created by `pitch run`. Same data model as a client; `pitch convert` flips the stage.
- **Spend ceiling** — a per-run USD cap checked in code *before* each costed step (`run all`/`clone` default $25, exit 61; `pitch run` default $5, exit 21). Estimates enforce; actuals reconcile afterwards.
- **Fidelity bar** — the per-page acceptability threshold (default 70) checked by `clone-fidelity`; warn-and-record by default, hard gate (exit 62) under `--strict-fidelity`. Distinct from the 80-point findings threshold that routes pages into `fixes plan`.
- **Harvest corpus** — the sanitized, committable findings corpus `upriver harvest` builds from every client/prospect/matrix dir; its calibration section recommends fidelity-bar values once ≥20 scored pages exist.
