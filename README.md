# upriver

Productized tool suite for Upriver Consulting. Audits a small-business website, produces a signed-off deliverable, rebuilds the site in Astro via headless Claude Code, and walks through launch — all in under 4 hours of human time per engagement.

## What Upriver does

Upriver is a CLI that orchestrates the full website rebuild engagement from a single URL through to a deployed site. It composes three things:

1. **Ten audit passes** across SEO, content, design, sales, links, schema, AEO, local, backlinks, and competitors. Each pass emits structured findings (P0/P1/P2) with scores.
2. **Nine installed marketing skills** ([marketingskills](https://github.com/lifeupriver/marketingskills)) that provide the methodology for each kind of work — copywriting, copy-editing, schema, CRO, site architecture, customer research, AI SEO, SEO audit.
3. **Six Upriver operational skills** (`.agents/upriver-skills/`) that encode the Upriver-specific playbook — how to audit, how to interview, how to write the brief, how to judge visual fidelity, what counts as QA-passed.

The CLI is opinionated about _workflow_ (one fixed sequence from discovery to launch). It is deliberately _not_ opinionated about methodology — that lives in skills so it's reusable and upgradeable.

## Prerequisites

- **Node.js 20+** (engines enforced in `package.json`).
- **pnpm 9+** (workspace manager; install with `npm i -g pnpm` if needed).
- **Git** with `gh` CLI available for PR automation (`upriver fixes apply`, `upriver clone`).
- **[Claude Code](https://docs.claude.com/en/docs/claude-code/overview)** on the `PATH` as `claude` (override with `CLAUDE_BIN`). Required for `upriver clone` and `upriver fixes apply`.
- Environment variables (see below).

## Environment variables

Copy `.env.example` to `.env` at the repo root. The CLI auto-loads `.env` from the current working directory.

| Variable | Required for | Notes |
|----------|--------------|-------|
| `FIRECRAWL_API_KEY` | `init`, `discover`, `scrape`, `qa` | [Firecrawl](https://firecrawl.dev) key (`fc-...`). Covers map, scrape, batch, and branding extraction. |
| `ANTHROPIC_API_KEY` | `synthesize`, `design-brief`, `interview-prep`, `process-interview` | Used via `@anthropic-ai/sdk` for synthesize/design-brief LLM passes. New LLM-backed features (`voice-extract`, `audit-media` shot list, future Phase 2/3) use the operator's Claude Max subscription via the headless `claude` CLI instead. Set `UPRIVER_USE_API_KEY=1` to force the API-key path on those features. |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | `discover` (GSC data), `audit` (seo pass) | Path to a Google service-account JSON file with Search Console read access for the client's property. Optional — commands degrade gracefully without it. |
| `UPRIVER_SUPABASE_URL` | All commands (usage logging) | Supabase project URL for internal usage tracking. Optional — missing values skip the log write. |
| `UPRIVER_SUPABASE_SERVICE_KEY` | All commands (usage logging) | Service-role key for the usage-log Supabase. |
| `CLAUDE_BIN` | `clone`, `fixes apply`, `voice-extract`, `audit-media`, `followup`, `custom-tools`, `admin-process` | Override the Claude Code binary path. Defaults to `claude` on `PATH`. |
| `UPRIVER_USE_API_KEY` | (override) | When set, the new Phase 1-3 features keep `ANTHROPIC_API_KEY` in the spawned `claude` env instead of stripping it. Default behaviour is to strip so the operator's Claude Max subscription powers everything. |
| `MONITOR_DEFAULT_CADENCE` | `monitor` Inngest cron | Default cron expression for the F06 weekly schedule. Default `0 13 * * MON`. |
| `MONITOR_SLUGS` | `monitor` Inngest cron | Comma-separated client slugs to fan out to. Used until the `client_admins` Supabase migration lands. |
| `FOLLOWUP_CADENCE` | `followup` Inngest cron | Default cron for the F07 long-cadence schedule. Default `0 14 * * MON`. |
| `FOLLOWUP_SLUGS` | `followup` Inngest cron | Comma-separated client slugs eligible for followup runs. |
| `UPRIVER_CASE_STUDIES_PATH` | `followup` | Optional filesystem path where case study drafts get copied for the operator's content workflow. |
| `OPERATOR_VIDEO_DAY_RATE` | `video-audit` | Override for full-day shoot pricing in the production budget output. |
| `EXPO_TOKEN` | `prototype-app --publish` | Required when wiring the (unimplemented) `--publish` flag for stable Expo Go QR codes. |
| `UPRIVER_GITHUB_PAT` / `UPRIVER_GITHUB_APP_ID` / `UPRIVER_GITHUB_APP_PRIVATE_KEY` | F05 worker | Operator-level GitHub auth used by the worker's webhook handler. |
| `GITHUB_WEBHOOK_SECRET` | F05 worker | Shared secret for verifying GitHub webhook signatures. |
| `ADMIN_OPERATOR_SLACK_WEBHOOK` | F05 worker | Slack webhook for PR-ready and asset-needed notifications. |
| `RESEND_API_KEY` / `RESEND_FROM_DOMAIN` | F06 + F07 worker | Optional. When wired, monitor + followup emails send via Resend. |

## Installation

```bash
pnpm install
pnpm build
```

This installs workspace dependencies and builds all packages (`@upriver/core`, `@upriver/audit-passes`, `@upriver/cli`, `@upriver/scaffold-template`). After the build, run the CLI directly:

```bash
pnpm --filter @upriver/cli exec upriver --help
```

Or link globally:

```bash
cd packages/cli
npm link
upriver --help
```

## The full command sequence

Upriver runs as a linear pipeline. Each command reads from `clients/<slug>/` and writes back into it. Re-running a command is safe; commands that take credits warn before charging.

```bash
# 1. Initialize the client and discover URLs
upriver init https://audreysfarmhouse.com --slug audreys --name "Audrey's Farmhouse"

# 2. Deep scrape (screenshots, raw HTML, design tokens, structured extraction)
upriver scrape audreys

# 3. Run all base audit passes in parallel (12+ heuristic passes incl. media)
upriver audit audreys

# 3a. (Optional) Deep media audit + replacement shot list (F01).
#     Sets up the photography upsell — prints a one-day shoot plan with
#     subject, composition, location, and a $X-$Y estimate per shot.
upriver audit-media audreys

# 4. Compile audit-package.json and write client-facing docs (voice guide, exec summary)
upriver synthesize audreys

# 4b. (Optional) Generate JSON-LD schemas for the rebuilt site (F02).
#     Outputs schema/site.json + per-page schemas + a 3-platform install
#     guide. Sellable as a $500 standalone deliverable.
upriver schema-build audreys

# 5a. (Optional) Derive a deeper brand voice guide from the scraped copy.
#     Outputs voice/voice-rules.json + brand-voice.md + sample-rewrites.md.
#     Sellable as a $750 standalone deliverable; consumed by improve, blog
#     topics, video audit, and the natural-language admin.
upriver voice-extract audreys

# 5. Generate the Claude Design handoff brief
upriver design-brief audreys

# 6. Generate the 90-minute interview guide
upriver interview-prep audreys

# --- Run the client interview here. Save the transcript. ---

# 7. Process the transcript back into the voice guide
upriver process-interview audreys --transcript ./audreys-interview.txt

# 8. Scaffold the Astro 6 hybrid repo (design tokens, nav, content collections, CLAUDE.md)
upriver scaffold audreys

# 9. Optional: provision Supabase and GitHub and Vercel
upriver scaffold github audreys
upriver scaffold supabase audreys
upriver scaffold deploy audreys

# 10. Visual clone pass — one PR per page via headless Claude Code
upriver clone audreys

# 11. Plan the audit-fix PRs
upriver fixes plan audreys

# 12. Apply fixes (one PR per finding; --parallel uses git worktrees)
upriver fixes apply audreys --parallel

# 13. QA against the Vercel preview — compare to original audit
upriver qa audreys --preview-url https://audreys-preview.vercel.app

# 14. Launch checklist (DNS, redirects, GSC, analytics, sitemap)
upriver launch-checklist audreys
```

## Sellable standalone deliverables

Phase 1 added six commands that double as standalone products clients can buy without committing to a full rebuild. Each one produces a finished deliverable in under 10 minutes.

```bash
# F03 — brand voice guide ($750 standalone). Reads scraped copy, produces a
# multi-section voice guide + machine-readable rules consumed by every other
# AI-generation surface in the suite.
upriver voice-extract audreys --depth=standard

# F01 — media audit + replacement shot list. Inventories every image,
# classifies authenticity, generates a one-day shoot plan with USD pricing.
upriver audit-media audreys

# F02 — JSON-LD schema build ($500 standalone). LocalBusiness, FAQ, Service,
# Breadcrumb, Person; vertical-aware @type mapping; 3-platform install guide.
upriver schema-build audreys

# F09 — gap analysis. Missing pages + missing features for the vertical,
# plus a proposed-sitemap.json the rebuild stages consume.
upriver gap-analysis audreys

# F12 — page-by-page video plan with shot lists and a production budget.
upriver video-audit audreys --count=8

# F10 — 25 ranked blog topic ideas + briefs ($750 standalone).
upriver blog-topics audreys --count=25
```

## Phase 2 — retainer + sales artifacts

```bash
# F06 — weekly delta report for retainer clients. One-page HTML email-ready
# report with inline-SVG trend chart, callouts, active P0 issues. Wires
# automatically to the Inngest worker's monitor-weekly cron.
upriver monitor audreys

# F07 — 6-month re-audit. Produces a case study draft and a re-engagement doc
# in the client's voice (consumed from F03's voice-rules.json).
upriver followup audreys

# F04 — Expo React Native prototype. Generates a runnable per-client app
# under clients/<slug>/app-prototype/ pulling brand colors, real content,
# and F01-flagged authentic photography.
upriver prototype-app audreys

# F11 — bespoke backend tool concepts. Generates 3-5 specific, scoped,
# priced proposals tailored to the client's industry and operational signals.
upriver custom-tools audreys --count=5
```

## Phase 3 — natural-language admin (the retainer hook)

Once a site is rebuilt, the operator wires the natural-language admin so
clients submit plain-English change requests via GitHub Issues (or the
optional Vercel form) and headless Claude Code opens a PR. The operator
reviews and merges in GitHub.

```bash
# Set up the per-client admin (writes templates + form scaffolding,
# generates a 6-digit form PIN, prints OPERATOR_GUIDE.md with gh + vercel
# commands to push labels, webhook, and form deployment to production).
upriver admin-deploy audreys --repo=lifeupriver/audreys-site

# Day-to-day:
upriver admin-status audreys           # repo, form, pause flag, last run
upriver admin-pause audreys            # stop processing new events
upriver admin-pause audreys --resume   # back online
upriver admin-rotate-pin audreys       # generate a fresh form PIN

# Manual single-issue test (bypasses GitHub webhook):
upriver admin-process audreys \
  --repo-dir=/tmp/audreys-site \
  --issue-number=42 \
  --issue-title="add fall menu" \
  --issue-body-file=./issue.md
```

The webhook handler that fires `admin-process` from real GitHub events lives
at `packages/admin-template/template/webhook/handler.ts` as a reference
implementation. Copy into `packages/worker/src/functions/admin-webhook.ts`
when wiring the production path.

The output of each command lands under `clients/<slug>/`:

```
clients/audreys/
├── client-config.yaml
├── site-map.json
├── pages/                    # scraped markdown + JSON per page
├── screenshots/{desktop,mobile}/
├── assets/images/
├── rawhtml/
├── design-tokens.json
├── audit/                    # one JSON per dimension + summary.json
├── audit-package.json        # compiled deliverable
├── docs/
│   ├── brand-voice-guide.md
│   └── interview-transcript.md
├── claude-design-brief.md
├── interview-prep.md
├── fixes-plan-scope.md       # (client-signed; optional)
├── fixes-plan.md
├── qa/                       # re-scraped preview pages + qa/audit/*.json
├── qa-report.md
├── launch-checklist.md
├── voice/                    # F03 — voice-rules.json + brand-voice.md + sample-rewrites.md
├── schema/                   # F02 — site.json + pages/*.json + manifest.json
├── schema-install.md         # F02 — three-platform install guide
├── media-shotlist.md/.html   # F01 — replacement shot list
├── proposed-sitemap.json     # F09 — drives finalize redirect rules
├── gap-recommendations.md/.html  # F09 — client deliverable
├── video-audit/              # F12 — plan + shot lists + production budget
├── blog-topics/              # F10 — topics.json + 25 briefs + roadmap
├── monitoring/               # F06 — weekly snapshots + delta reports
├── followups/                # F07 — case study + re-engagement docs
├── custom-tools/             # F11 — proposal + sales talking points
├── app-prototype/            # F04 — runnable Expo project
├── admin/                    # F05 — issue templates, form, operator guide
└── repo/                     # scaffolded Astro 6 hybrid site
```

## How marketing skills work

Upriver ships with nine marketing skills symlinked into `.agents/skills/` from `marketingskills-main/`:

```
.agents/skills/
├── ai-seo          → marketingskills-main/skills/ai-seo
├── copy-editing    → marketingskills-main/skills/copy-editing
├── copywriting     → marketingskills-main/skills/copywriting
├── customer-research
├── form-cro
├── page-cro
├── schema-markup
├── seo-audit
└── site-architecture
```

Each skill is a self-contained methodology. When an Upriver command needs judgment-driven work (clone a page, fix a finding, run the interview), the agent prompt tells Claude Code to read the relevant skill first.

See `docs/marketing-skills-integration.md` for the full skill × command matrix, what each skill contributes, and Upriver-specific extensions layered on top.

**Updating skills:** the skills directory is a plain git clone at `marketingskills-main/`. Pull upstream changes with:

```bash
cd marketingskills-main && git pull origin main
```

If the library is installed as a submodule instead:

```bash
git submodule update --remote .agents/marketingskills
```

Run `./marketingskills-main/validate-skills.sh` after pulling to verify the skill schema, then run `pnpm typecheck` to catch any agent prompt references that drifted.

### Upriver operational skills

In addition to marketing skills, Upriver ships six operational skills at `.agents/upriver-skills/` that encode the engagement playbook:

- `audit-methodology.md` — how to run the audit, what each pass measures, how scoring works.
- `brand-voice-guide-writing.md` — how to write the voice guide from audit data and interview transcripts.
- `client-brief-writing.md` — how to write the Claude Design handoff brief.
- `interview-facilitation.md` — how to run the 90-minute client interview.
- `clone-visual-fidelity.md` — visual fidelity standards for the clone pass.
- `qa-standards.md` — the pass/fail bar for each audit dimension at launch.

These live in a separate directory because they're Upriver-specific — they should not be upstreamed to the marketingskills library. They are safe to edit; the marketing skills are not.

## Adding a new client

```bash
# 1. Start the engagement
upriver init https://newclient.com --slug newclient --name "New Client Co."

# 2. Run the full pipeline (commands #2-14 above in order)
# The CLI warns before any step that takes credits or API quota.

# 3. The human-in-the-loop moments:
#   - Between `upriver interview-prep` and `upriver process-interview`:
#       Run the 90-minute interview. Capture the transcript.
#   - Between `upriver fixes plan` and `upriver fixes apply`:
#       Review the plan with the client. Sign off on fixes-plan-scope.md.
#   - Between `upriver qa` and `upriver launch-checklist`:
#       Validate the QA report meets the bar (see qa-standards skill).
```

Typical wall-clock time per engagement: 2-4 hours of active human work across 1-2 weeks, depending on how quickly the client turns around the interview, photos, and copy signoffs. Most of that time is the interview and reviewing PRs.

## Repository layout

```
upriver-clone/
├── .agents/
│   ├── skills/             # symlinks to marketingskills
│   └── upriver-skills/     # Upriver operational skills
├── clients/                # one directory per client engagement
├── docs/
│   └── marketing-skills-integration.md
├── marketingskills-main/   # cloned marketing skills (do not edit)
├── packages/
│   ├── audit-passes/       # 10 audit dimension implementations
│   ├── cli/                # oclif CLI (commands, agent prompts)
│   ├── core/               # types, Firecrawl client, GSC, config, usage logging
│   └── scaffold-template/  # Astro 6 hybrid template used by `upriver scaffold`
├── pnpm-workspace.yaml
└── tsconfig.base.json
```

## Development

```bash
pnpm install
pnpm build                                # build all packages once
pnpm --filter @upriver/cli run dev        # CLI watch mode
pnpm typecheck                            # typecheck everything
pnpm test                                 # run tests where defined
```

To iterate on a single command without a full rebuild, run `pnpm --filter @upriver/cli run dev` in one terminal and re-invoke the compiled CLI from another. TypeScript sources under `packages/*/src/` compile to `packages/*/dist/`.

## Security and secrets

- Never commit `.env`. The `.gitignore` excludes it.
- Firecrawl and Anthropic API keys are sensitive — rotate if exposed.
- The Supabase service key has full RLS bypass — use only from trusted environments.
- Client folders (`clients/<slug>/`) may contain scraped personally identifying information (contact emails, phone numbers from the target site). Treat them as confidential.

## License

Internal use only — Upriver Consulting.
