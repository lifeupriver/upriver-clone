# Upriver — Operator User Guide

Workflow-oriented guide for using the `upriver` CLI and dashboard end-to-end on a real client engagement.

For setup, env vars, and developer-side concerns see [`README.md`](../README.md). For the architecture migration history see `.planning/roadmap/`.

---

## TL;DR — your first client in five commands

You have a URL. The client is `Audrey's Coffee` at `https://audreyscoffee.com`. Run:

```bash
upriver init https://audreyscoffee.com   # creates clients/audreys/
upriver run all audreys                  # full pipeline (≈30–60 min wall time)
upriver report build audreys             # generates report HTML + PDF
upriver sync push audreys                # publishes artifacts to the hosted dashboard
upriver report send audreys --to client@audreyscoffee.com   # emails the share link
```

Everything else in this guide is the reasoned long-form of those five lines.

---

## Concepts (read once, refer back rarely)

| Term | Meaning |
|---|---|
| **slug** | Short kebab-case id for a client (`audreys`, `barneys-bbq`). Derived from the URL on `init`. Used as the directory name and as the URL segment in the dashboard. |
| **client directory** | `clients/<slug>/` on disk. Holds every artifact the pipeline produces — config, scraped pages, audit findings, the brief, the cloned site source, etc. |
| **pipeline** | A fixed sequence of CLI commands that take a slug from "URL only" to "site rebuilt and QA-passed". Each command is independently re-runnable; outputs are written to disk and the next stage reads them. |
| **dashboard** | The Astro web UI in `packages/dashboard`. Local mode reads `clients/` from your laptop disk; hosted mode reads from a Supabase Storage bucket. |
| **data source** | Either `local` (default — operator's laptop) or `supabase` (hosted on Vercel + Supabase Storage). Set via `UPRIVER_DATA_SOURCE`. The dashboard checks this on every request. |
| **share link** | A URL like `https://upriver-platform.vercel.app/deliverables/audreys?t=<token>` that lets a client read *their* deliverables without an operator login. Tokens live in Postgres (`share_tokens` table); operators mint and revoke them in the dashboard. |
| **operator** | You. A Supabase Auth user whose `app_metadata.role === 'operator'`. The single seed email (`joshua@joshuabrownphotography.com`) is set out-of-band; nothing in the codebase mints operator status. |

---

## The pipeline at a glance

```
init    →  scrape   →  audit     →  synthesize  →  design-brief
                                                          ↓
launch  ←  qa  ←  improve  ←  fixes-plan  ←  clone-fidelity  ←  finalize  ←  clone  ←  scaffold
```

Each stage reads the previous stages' files in `clients/<slug>/` and writes its own. You can stop at any stage and resume hours or days later. Re-running a stage is safe — most are idempotent and skip work that's already complete.

A complete pipeline takes 30–90 minutes wall time depending on site size and which deep-audit passes are enabled.

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
pnpm --filter @upriver/cli link --global   # so `upriver` is on PATH
upriver doctor                              # verifies env + binaries
```

### 1. Initialize the client

```bash
upriver init https://audreyscoffee.com
```

This:
- Creates `clients/audreys/` on disk.
- Writes `client-config.yaml` with name, URL, derived slug, branding extracted from a one-page Firecrawl scrape.
- Maps the site (which pages exist) and writes `discovery/site-map.json`.
- Pulls 90 days of GSC data if a service account is configured.

Override the auto-derived slug with `--slug=<custom-slug>` if you don't like what `init` chose.

### 2. Scrape every page

```bash
upriver scrape audreys
```

Firecrawl batch-scrapes every URL discovered in step 1. Output: `clients/audreys/pages/<slug>.html` + `.md` + `.json` per page. This is the most expensive step token-wise; cache lives in `clients/audreys/.cache/`.

### 3. Run the audit passes

```bash
upriver audit audreys
```

Default: 10 base passes (SEO, content, design, sales, links, schema, AEO, local, backlinks, competitors). Add `--mode=deep` or `--mode=all` to layer on the deep-audit and tooling passes (Lighthouse, squirrelscan, content strategy, conversion psychology, etc.).

Output: `clients/audreys/audit/<pass>.json` per pass + `audit-summary.json`.

Each finding carries a priority (`p0` blocking, `p1` important, `p2` nice-to-have), a score impact, and a structured location reference (URL + selector + line range).

### 4. Synthesize the audit package

```bash
upriver synthesize audreys
```

Composes the per-pass JSONs into one `audit-package.json` with the executive summary, brand voice draft, and impact metrics. The branded report rendering and email templates all read from this file.

### 5. Render the design brief

```bash
upriver design-brief audreys
```

Operator-facing strategy doc combining audit findings + brand voice + intake (if present) into `design-brief.md`. This is the artifact the rebuild planning is anchored to.

### 6. Scaffold the new site

```bash
upriver scaffold audreys
```

Generates a fresh Astro project in `clients/audreys/site/` from `packages/scaffold-template/`. Page list seeded from the discovered URL set. Tailwind + design tokens wired in.

### 7. Clone every page

```bash
upriver clone audreys --no-pr
```

For each page in the discovered set, opens a headless Claude Code session that's prompted to recreate the page in Astro/Tailwind matching the original screenshot + extracted DOM as faithfully as possible. Per-page verify loop runs Lighthouse + a pixel diff.

`--no-pr` skips opening a GitHub PR per page (faster; useful while iterating). Drop the flag once you have a target repo.

### 8. Finalize

```bash
upriver finalize audreys --download-missing
```

Rewrites cross-page links to internal Astro routes, downloads any CDN assets the cloner pointed at, and prunes dead references. After this, `pnpm dev` in `clients/audreys/site/` should serve a fully-navigable copy.

### 9. Score clone fidelity (optional, recommended)

```bash
upriver clone-fidelity audreys
```

Per-page score across pixel diff + copy diff + (eventually) layout structure diff. Output: `clients/audreys/clone-fidelity.json`. Use to spot pages where the cloner drifted.

### 10. Build a fixes plan

```bash
upriver fixes-plan audreys
```

Reads audit findings + intake + fidelity report; emits `fixes-plan.md` — a prioritized punch-list of code-level changes for the cloned site. P0/P1 items cluster by file so the apply step can batch them.

### 11. Apply the fixes

```bash
upriver fixes apply audreys
```

Headless Claude Code session walks the plan, edits the cloned site, and (if not `--no-pr`) opens a PR per cluster.

### 12. QA

```bash
upriver qa audreys
```

Re-runs the audit passes against the rebuilt site. Compare to the original audit's scores to demonstrate the lift to the client.

### 13. Improvement layer (optional)

```bash
upriver improve audreys
```

A second pass — copy upgrades, SEO/GEO additions, schema markup, CRO patterns. Default `--dry-run` plans only; drop the flag to apply.

### 14. Launch

```bash
upriver launch-checklist audreys
```

Operator-only checklist: DNS records, SSL, redirects from old URLs, analytics tags, sitemaps, robots.txt — items that need human judgment and access credentials.

---

## Running it all in one shot

```bash
upriver run all audreys
```

Walks every stage above sequentially with sensible flags. Skips `init` (needs a URL) and `launch-checklist` (operator-only). Stops on any stage that errors; you can resume by re-running individual commands.

Useful flags on `run all`:
- `--audit-mode=base|deep|all` — pass-through to `audit`.
- `--from=<stage>` — resume at a specific stage. Skips earlier ones even if they haven't run.
- `--to=<stage>` — stop after a specific stage.
- `--dry-run` — print the planned commands without executing.

---

## Working with the dashboard

### Local dashboard (everyday operator use)

```bash
pnpm --filter @upriver/dashboard run dev
# → http://localhost:4321
```

Reads `clients/` from disk. Click a client to see config, the audit report, the brief, brand voice, the cloned-site preview, the fixes plan, the QA scorecard. The Pipeline panel on each client page lets you click **Run** to invoke any stage as a subprocess — equivalent to running the CLI command yourself.

### Hosted dashboard (sales surface + remote access)

Production: <https://upriver-platform.vercel.app>

Reads from the Supabase Storage bucket `upriver`. Slugs only show up if you've pushed them via `upriver sync push <slug>`.

Sign in with the operator email (magic link, no password). The sidebar shows your email and a Sign out link.

> **Pipeline runs from the hosted dashboard require Phase 3 worker provisioning** (Inngest Cloud + Fly.io worker). Until that's set up, the hosted dashboard is read-only — viewing artifacts and managing share links works, but clicking Run will fail. See `packages/worker/DEPLOY.md`.

---

## Distributing deliverables to a client

### Option A: send a share link (recommended)

1. From the hosted dashboard, open the client overview, click **Share Links** in the quick-nav.
2. Set an optional label (e.g. "alex@client-co.com — launch review") and pick an expiry (default 90 days).
3. Click **Mint share link** — the URL is auto-copied to your clipboard.
4. Paste into an email or DM.

The recipient can read every page under `/deliverables/<slug>/*` (audit report, design brief, scorecard, next-steps, etc.) without signing in. They cannot reach the operator dashboard or any other client's files.

Revoke at any time from the same page — anyone holding the link loses access immediately.

### Option B: send a PDF bundle (no hosted dependency)

```bash
upriver report build audreys     # generates clients/audreys/report-build/
upriver report bundle audreys    # zips the report-build dir
# → clients/audreys/audreys-report.zip
```

Email the zip directly. No tokens, no expiry — once sent, you can't revoke it.

### Option C: emailed link (programmatic)

```bash
upriver report send audreys --to client@audreyscoffee.com
```

Renders the audit report, mints a share token via the legacy local `share-token.json` flow (operator laptop), and sends through Resend. Useful when you want a polished branded email.

---

## Working across machines

If you start an engagement on your desktop and want to continue on your laptop:

```bash
# desktop:
upriver sync push audreys

# laptop:
upriver sync pull audreys
```

`push` walks `clients/audreys/` and uploads to `bucket:upriver/clients/audreys/`. Skips `node_modules/`, `.git/`, `.DS_Store` by default. `--exclude=<glob>` adds more skips. `--dry-run` shows what would be uploaded.

`pull` is the inverse. Idempotent: re-running either way is safe.

These commands also drive the hosted dashboard — push a slug, refresh `https://upriver-platform.vercel.app/clients`, the slug appears.

---

## Stage reference

One paragraph per command. Use as a quick lookup; the in-depth flags are in `upriver <command> --help`.

| Command | What it produces | When to skip |
|---|---|---|
| `init <url>` | `client-config.yaml`, `discovery/site-map.json`, branding | Never (always step 1) |
| `discover <slug>` | Augments `discovery/` with competitor + keyword data | Run only if you want the deeper market context |
| `scrape <slug>` | `pages/<slug>.{html,md,json}` for every URL | Skip only if pages already exist (cache is content-aware) |
| `audit <slug>` | `audit/<pass>.json` + `audit-summary.json` | Skip only on iteration; the audit drives every downstream stage |
| `synthesize <slug>` | `audit-package.json` | Skip if audit hasn't changed |
| `design-brief <slug>` | `design-brief.md` | Skip if rebuild scope is locked |
| `interview-prep <slug>` | Discussion guide | Optional — only if you're running a kickoff call |
| `process-interview <slug>` | Structured intake from a transcript | Optional — only after an interview |
| `scaffold <slug>` | Fresh Astro project at `site/` | Re-run wipes the scaffold; only run on first build |
| `clone <slug>` | Per-page Astro components matching the original | Re-run on specific pages with `--pages=` |
| `finalize <slug>` | Internal-link rewrites + missing CDN downloads | Run after every full clone pass |
| `clone-fidelity <slug>` | `clone-fidelity.json` per-page scores | Optional but recommended for client signoff |
| `fixes-plan <slug>` | `fixes-plan.md` punch list | Re-run when audit or fidelity changes |
| `fixes apply <slug>` | Edits the cloned site + (optionally) opens PRs | Re-run with `--from=<heading>` to apply a subset |
| `qa <slug>` | Post-rebuild audit + scorecard delta | Run before declaring "done" |
| `improve <slug>` | Improvement plan / applied changes | Optional second pass |
| `launch-checklist <slug>` | Operator runbook | Operator-only; not part of `run all` |

Reporting / distribution:
- `report build` — render the deliverables to HTML.
- `report pdf` — wkhtmltopdf-style PDF of the report.
- `report bundle` — zip the report-build dir.
- `report send` — email a share link via Resend.
- `report compare <before> <after>` — side-by-side audit-summary diff.

Operations:
- `sync push <slug>` / `sync pull <slug>` — bucket I/O.
- `cost` / `cost <slug>` — token cost estimate / per-client breakdown.
- `doctor` — environment health check.
- `dashboard export` — produce a static export of the dashboard for offline review.

---

## Common operations

### Re-run a stage with different flags

Just re-run it. Most stages are idempotent or version their outputs. If you want to force a fresh run from scratch, delete the stage's output file (e.g. `rm clients/audreys/audit-package.json`) before re-running.

### Resume after a failure

```bash
upriver run all audreys --from=clone
```

Picks up at the named stage. Useful when an upstream stage crashed mid-way through `run all` and you've fixed the underlying issue.

### Abort a long-running stage

Ctrl-C in the terminal. The CLI handles SIGINT cleanly; partial work is preserved on disk for resume. The dashboard's Run button has an Abort that sends SIGTERM (then SIGKILL after 2s) to the spawned subprocess.

### Run a single audit pass

```bash
upriver audit audreys --pass=seo
```

Comma-separated for multiple. `--mode=deep` or `--mode=all` extends the default pass list.

### See what a `run all` would do without running

```bash
upriver run all audreys --dry-run
```

Prints the resolved sequence with their flags. Same flag works on most subcommands.

### Estimate cost before committing tokens

```bash
upriver cost audreys
```

Reads `usage_log` rows and projects cost for any unfinished stages.

---

## Troubleshooting

### Magic-link email never arrives

Check the Supabase Auth logs (`supabase MCP` → `get_logs auth` or the dashboard) for `mail.send` events. If you've recently hit the rate limit on Supabase's built-in mailer, switch to Resend SMTP — instructions in the original session handoff or just wire your `RESEND_API_KEY` into Supabase's Auth → SMTP Settings.

### `/clients` 302s to `/login` after signing in

Your auth.users row exists but `app_metadata.role` isn't `operator`. Mint the role:

```sql
update auth.users
  set raw_app_meta_data = jsonb_set(coalesce(raw_app_meta_data, '{}'::jsonb), '{role}', '"operator"'::jsonb)
  where email = 'joshua@joshuabrownphotography.com';
```

Then sign out (`/auth/signout`) and sign back in so the JWT picks up the new role.

### Dashboard says "Storage backend not yet available"

The route requires the local filesystem but `UPRIVER_DATA_SOURCE=supabase` is set. Either flip the env var (locally) or push the slug's data to the bucket via `upriver sync push`.

### Hosted dashboard's Run button hangs / errors

Phase 3 worker provisioning isn't complete. The dashboard is sending events to Inngest but no worker is consuming them. See `packages/worker/DEPLOY.md`.

### `upriver doctor` flags `claude` not on PATH

Install Claude Code (<https://docs.claude.com/en/docs/claude-code/overview>) or set `CLAUDE_BIN` to the binary path. Required for `clone` and `fixes apply`.

### `firecrawl: 429 Too Many Requests`

You've burned through the Firecrawl plan's rate limit. Wait or upgrade. The CLI caches scrape responses, so re-running won't re-bill on the same URLs.

### Clone fidelity is poor for a specific page

Re-run just that page: `upriver clone audreys --pages=/specific-path --no-pr`. Drop the `--no-cache` flag if you want it to ignore the prior attempt. Inspect the per-page Lighthouse run in `clients/audreys/site/lighthouse/<page>.json` — usually the fix is a missing component the cloner couldn't pattern-match.

---

## Glossary

- **Audit pass** — one of ~10 evaluators that score one dimension of a site (SEO, content, etc.) and emit findings.
- **Deep-audit pass** — heavier-weight LLM-driven evaluator added via `--mode=deep` or `--mode=all`. Token-expensive; gated behind a flag.
- **Tooling pass** — runs an external CLI (Lighthouse, squirrelscan) and converts the output into the same finding shape.
- **Finding** — a structured `{ priority, score, location, recommendation, rationale }` record. Aggregated into the report.
- **Pipeline stage** — one CLI command in the canonical sequence. The list lives in `packages/core/src/pipeline/stages.ts` (single source of truth for both the CLI orchestrator and the dashboard's Run buttons).
- **Bucket** — Supabase Storage bucket `upriver`, holds every per-slug artifact when in hosted mode. Private; reads use signed URLs.
- **Service-role key** — `UPRIVER_SUPABASE_SERVICE_KEY`. Bypasses RLS. Server-side only — never exposed to the browser.
- **Anon / publishable key** — `UPRIVER_SUPABASE_PUBLISHABLE_KEY`. Subject to RLS. Safe to use in client code.
- **PKCE flow** — the OAuth-style code-exchange flow Supabase Auth uses for magic links. Browser stores a code verifier, the link contains a code, server exchanges code+verifier for a session.
