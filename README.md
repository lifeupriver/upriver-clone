# upriver

Productized tool suite for Upriver Consulting. Point it at a small-business website and it audits the site across 15+ dimensions, produces signed-off client deliverables, rebuilds the site in Astro via headless Claude Code, generates a full "AI Operating System" document set from a structured client profile, and walks the engagement through launch and retainer — all in a few hours of human time per client.

> **New here?** Read this page top to bottom, then go to [`docs/USER-GUIDE.md`](docs/USER-GUIDE.md) to run your first engagement. The full documentation index is at [`docs/README.md`](docs/README.md).

## What this repo contains

Upriver is two engines sharing one CLI, one client data model, and one dashboard:

1. **The website rebuild engine** — `init → scrape → audit → synthesize → scaffold → clone → finalize → fixes → qa → launch`. Ten-plus audit passes emit structured P0/P1/P2 findings; headless Claude Code agents clone the site page-by-page into an Astro repo and then apply audit fixes as reviewable PRs.
2. **The intake & profile engine** — `recon → profile → generate`. A Zod-typed Client Profile (`@upriver/schemas`) is filled from automated reconnaissance, interview transcripts, and operator edits, then drives gated generation of the 18-document AI Operating System deliverable set plus provisioning artifacts.

Around the engines:

- **An operator dashboard** (`packages/dashboard`) — Astro + React web UI. Local mode reads `clients/` from disk; hosted mode (Vercel + Supabase) serves the same views plus client-facing share links.
- **A background worker** (`packages/worker`) — Inngest functions that run pipeline stages off the dashboard and drive the weekly monitor / 6-month followup crons.
- **Skills** — nine marketing skills (cloned from [marketingskills](https://github.com/lifeupriver/marketingskills)) plus Upriver's own operational skills in `.agents/upriver-skills/` that encode the engagement playbook. The CLI is opinionated about *workflow*; methodology lives in skills so it stays reusable and upgradeable.
- **A test harness and CI** — committed offline fixture (`clients/wb-fixture/`), a Tier A end-to-end harness for the website pipeline, a subprocess-level CLI smoke matrix, and keyless GitHub Actions CI. See [`docs/TESTING.md`](docs/TESTING.md).

## Repository layout

```
upriver-clone/
├── .agents/
│   ├── skills/                  # symlinks to marketingskills (do not edit)
│   └── upriver-skills/          # Upriver operational skills (safe to edit)
├── .github/workflows/           # test CI, Supabase auto-migrations, worker image build
├── .planning/                   # build specs, roadmap, handoff docs (history & direction)
├── clients/                     # one directory per client engagement
│   ├── littlefriends/           # Little Friends corpus (intake-engine acceptance run)
│   └── wb-fixture/              # sanitized offline fixture ("Wildflour Bakery") for e2e tests
├── docs/                        # user-facing documentation (start at docs/README.md)
├── marketingskills-main/        # cloned marketing skills library (do not edit)
├── packages/
│   ├── core/                    # shared types, Firecrawl/GSC clients, pipeline stage list, data-source abstraction
│   ├── audit-passes/            # audit dimension implementations (seo, content, design, …)
│   ├── cli/                     # the oclif CLI — commands, agent prompts, generation engine
│   ├── schemas/                 # Zod Client Profile contract (intake & profile engine)
│   ├── dashboard/               # Astro + React operator dashboard + client deliverable portal
│   ├── worker/                  # Inngest functions: stage runner, monitor/followup crons
│   ├── scaffold-template/       # Astro hybrid template copied per client by `upriver scaffold`
│   ├── admin-template/          # F05 natural-language admin templates (issue forms, webhook)
│   └── app-prototype-template/  # F04 Expo React Native prototype template
├── scripts/                     # e2e harnesses, CLI smoke matrix, validation utilities
├── supabase/migrations/         # share tokens, dashboard events, rate limiting
└── upriver-design-system/       # Upriver brand + UI kit (voice, palette, typography)
```

## Prerequisites

- **Node.js 20+** for the workspace (the scaffolded client repo's build needs **Node 22+** — native WebSocket).
- **pnpm 9+** (`npm i -g pnpm`).
- **Git** with the `gh` CLI available for PR automation (`upriver clone`, `upriver fixes apply`, `upriver admin-deploy`).
- **[Claude Code](https://docs.claude.com/en/docs/claude-code/overview)** on the `PATH` as `claude` (override with `CLAUDE_BIN`). Required for `clone`, `fixes apply`, `improve`, `generate`, and the other agent-driven commands.
- API keys per the table below — `upriver doctor` reports which features are available with what you have set.

## Installation

```bash
pnpm install
pnpm build
cp .env.example .env   # then fill in keys
```

Run the CLI directly:

```bash
pnpm --filter @upriver/cli exec upriver --help
```

Or link globally:

```bash
cd packages/cli && npm link
upriver --help
upriver doctor          # verify env + binaries before your first run
```

## Quick start — one client, end to end

```bash
# The whole pipeline in one shot (init → run all → sync push):
upriver demo https://audreysfarmhouse.com

# Or step by step:
upriver init https://audreysfarmhouse.com --slug audreys --name "Audrey's Farmhouse"
upriver run all audreys                 # every stage in dependency order
upriver report build audreys            # self-contained static audit report
upriver sync push audreys               # publish artifacts to the hosted dashboard
```

`upriver run all` walks the canonical stage list (defined once in `packages/core/src/pipeline/stages.ts`, shared by the CLI and the dashboard's Run buttons): scrape → audit → media/gap/video audits → synthesize → voice-extract → blog-topics → schema-build → design-brief → scaffold → clone → finalize → clone-fidelity → fixes plan → qa → improve. `--from <stage>` resumes mid-pipeline, `--dry-run` prints the plan, `--audit-mode base|deep|tooling|all` controls audit depth.

The long-form walkthrough — including the human-in-the-loop moments (interview, fixes signoff, QA review) — is in [`docs/USER-GUIDE.md`](docs/USER-GUIDE.md).

## The CLI at a glance

Roughly 60 commands in functional groups. The full per-command reference (flags, inputs, outputs, exit codes) is [`docs/COMMAND-REFERENCE.md`](docs/COMMAND-REFERENCE.md).

| Group | Commands | What it covers |
|---|---|---|
| Engagement setup | `init`, `demo`, `discover`, `scrape` | Client directory, URL discovery, Firecrawl scrape + extraction |
| Audit | `audit`, `audit-media`, `gap-analysis`, `video-audit`, `synthesize` | 15 base passes + 3 LLM deep passes + 9 tooling passes; compiled `audit-package.json` |
| Deliverables | `voice-extract`, `blog-topics`, `schema-build`, `design-brief`, `interview-prep`, `process-interview`, `interview-link` | Sellable standalone artifacts + interview workflow |
| Rebuild | `scaffold` (+ `github`/`supabase`/`deploy`), `major-pages`, `capture-major`, `capture-typography`, `capture-ux`, `clone`, `finalize` | Astro scaffold, page classification, visual capture, headless clone |
| Clone QA | `clone-qa`, `clone-fidelity`, `clone-links`, `clone-embeds` | Side-by-side screenshots, fidelity scoring, link graph and embed audits (non-zero exit on failures) |
| Fixes & improvement | `fixes plan`, `fixes apply`, `improve`, `improve geo`, `qa`, `launch-checklist` | Phased fix plan, agent-applied PRs, improvement-layer matrix, post-rebuild QA |
| Intake & profile engine | `recon`, `recon secret-shopper start/record`, `profile show/import/set/verify/conflicts/extract-transcript/migrate-intake/push/pull`, `generate` | Client Profile fill, verification gates, AI Operating System doc generation. See [`docs/INTAKE-PROFILE-ENGINE.md`](docs/INTAKE-PROFILE-ENGINE.md) |
| Reporting | `report build/pdf/bundle/send/compare`, `monitor`, `followup` | Static report export, PDF, deliverable bundle, weekly delta report, 6-month re-audit |
| Dashboard & sync | `dashboard`, `dashboard export`, `sync push/pull` | Local dashboard server, browser PDF export, Supabase bucket sync |
| Natural-language admin | `admin-deploy`, `admin-status`, `admin-pause`, `admin-rotate-pin`, `admin-process` | F05 — clients file plain-English change requests; Claude Code opens PRs |
| Sales artifacts | `prototype-app`, `custom-tools` | F04 Expo prototype, F11 bespoke tool proposals |
| Operations | `run all`, `doctor`, `cost`, `compress-images`, `archive`, `restore` | Orchestrator, preflight, credit accounting, image compression, Backblaze B2 archival |

### Exit-code contract

Unattended runs (CI, `run all`, the worker) rely on pinned exit codes rather than log scraping:

- **0** — success. **2** — usage/preflight error (oclif misuse; `generate` prompt-size ceiling). **3** — `generate --strict-provisioning` found provisioning gaps.
- `clone-links` and `clone-embeds` exit non-zero on broken links / missing embeds unless `--allow-*` flags are passed.
- The Tier A e2e harness uses 2 = preflight and 11–16 for distinct phase failures.

`scripts/cli-smoke.mjs` pins this contract in CI — every command's `--help` must exit 0 with no stack trace, and a curated dry-run table asserts the codes above.

## Environment variables

Copy `.env.example` to `.env` at the repo root; the CLI auto-loads it from the working directory. `upriver doctor` shows what's configured.

| Variable | Required for | Notes |
|----------|--------------|-------|
| `FIRECRAWL_API_KEY` | `init`, `discover`, `scrape`, `qa` | [Firecrawl](https://firecrawl.dev) key (`fc-...`): map, scrape, batch, branding extraction. |
| `ANTHROPIC_API_KEY` | `synthesize`, `design-brief`, deep audit passes | Used via `@anthropic-ai/sdk`. Agent-driven commands (`clone`, `fixes apply`, `generate`, `voice-extract`, …) use the operator's Claude subscription via the headless `claude` CLI instead; set `UPRIVER_USE_API_KEY=1` to force the API-key path. |
| `GOOGLE_SERVICE_ACCOUNT_KEY` | `discover`, `audit` (seo pass) | Path to a service-account JSON with Search Console read access. Optional — degrades gracefully. |
| `UPRIVER_DATA_SOURCE` | profile/generate paths, dashboard | `local` or `supabase`. The intake/profile engine defaults to `supabase` (canonical store); set `local` for offline work, fixtures, and e2e runs. The dashboard defaults to `local`. |
| `UPRIVER_SUPABASE_URL` / `UPRIVER_SUPABASE_SERVICE_KEY` | Supabase data source, sync, usage logging | Project URL + service-role key (full RLS bypass — trusted environments only). |
| `UPRIVER_SUPABASE_PUBLISHABLE_KEY` | dashboard | Anon/publishable key, RLS-scoped, safe in client code. |
| `UPRIVER_SUPABASE_BUCKET` | sync, hosted dashboard | Storage bucket name. Default `upriver`. |
| `UPRIVER_CLIENTS_DIR` | all local-mode commands | Root of client dirs. Default `./clients`. |
| `CLAUDE_BIN` | agent-driven commands | Override the Claude Code binary path. Default `claude` on `PATH`. |
| `UPRIVER_DEEP_MODEL` | deep audit passes | Model override. Default `claude-sonnet-4-6`. |
| `UPRIVER_RUN_TOKEN` | hosted dashboard | Shared secret guarding `/api/run` when deployed publicly. |
| `RESEND_API_KEY` / `UPRIVER_REPORT_FROM` / `UPRIVER_REPORT_HOST` | `report send`, monitor/followup email | Optional; `report send` falls back to printing the email body. |
| `B2_KEY_ID` / `B2_APPLICATION_KEY` / `B2_BUCKET` / `B2_ENDPOINT` / `B2_REGION` | `archive`, `restore` | Backblaze B2 (S3-compatible) cold storage for delivered engagements. |
| `UPRIVER_GIT_EMAIL` / `UPRIVER_GIT_NAME` | `clone`, `fixes apply` | Committer identity for agent commits. Falls back to a bot identity. |
| `MONITOR_DEFAULT_CADENCE` / `MONITOR_SLUGS` | worker monitor cron | F06 weekly schedule. Default `0 13 * * MON`. |
| `FOLLOWUP_CADENCE` / `FOLLOWUP_SLUGS` | worker followup cron | F07 long-cadence schedule. Default `0 14 * * MON`. |
| `UPRIVER_GITHUB_PAT` (or `UPRIVER_GITHUB_APP_ID` + `UPRIVER_GITHUB_APP_PRIVATE_KEY`) | F05 worker webhook | Operator-level GitHub auth. |
| `GITHUB_WEBHOOK_SECRET` | F05 worker webhook | Verifies GitHub webhook signatures. |
| `ADMIN_OPERATOR_SLACK_WEBHOOK` | F05 worker | Slack notifications for PR-ready / asset-needed. |
| `UPRIVER_USE_API_KEY` | (override) | Keep `ANTHROPIC_API_KEY` in spawned `claude` envs instead of stripping it. |
| `UPRIVER_GATE_AUTO` | `generate`, e2e | Auto-accept Continue gates for synthetic/unattended runs. |
| `UPRIVER_LLM_NO_CACHE` | `generate` | Force fresh LLM sessions on resumed runs. |
| `UPRIVER_CASE_STUDIES_PATH` | `followup` | Optional copy destination for case-study drafts. |
| `OPERATOR_VIDEO_DAY_RATE` | `video-audit` | Override full-day shoot pricing. |
| `EXPO_TOKEN` | `prototype-app --publish` | Reserved for the (unimplemented) publish flag. |

## What lands on disk

Every command reads from and writes back into `clients/<slug>/`. Re-running a command is safe; commands that spend credits warn first. The most important artifacts:

```
clients/audreys/
├── client-config.yaml          # slug, name, URL, vertical, platform
├── site-map.json               # discovered URLs
├── pages/ rawhtml/ screenshots/ assets/    # scraped raw material
├── design-tokens.json typography-capture.json branding-profile.json
├── audit/                      # one JSON per pass + summary
├── audit-package.json          # compiled deliverable (the hub everything reads)
├── profile.json                # Client Profile (intake & profile engine)
├── major-pages.json proposed-sitemap.json
├── claude-design-brief.md fixes-plan.md launch-checklist.md
├── voice/ schema/ blog-topics/ video-audit/ media-shotlist.md   # standalone deliverables
├── docs/ deliverables/ manifest.json       # generated AI OS documents (generate)
├── clone-qa/ clone-link-audit.json clone-embed-report.json      # clone QA artifacts
├── report-static/ monitoring/ followups/ custom-tools/ app-prototype/ admin/
├── token-and-credit-usage.log  # parsed by `upriver cost`
└── repo/                       # the scaffolded + cloned Astro site
```

## Testing and CI

```bash
pnpm typecheck                          # typecheck everything
pnpm test                               # unit suites (schemas, cli, core, dashboard)
node scripts/cli-smoke.mjs              # subprocess smoke matrix: --help + pinned dry-run exit codes
bash scripts/e2e-website-tier-a.sh      # offline website-pipeline e2e against clients/wb-fixture
bash scripts/e2e-deploy-dryrun.sh       # scaffold→github→supabase→deploy, all dry-run
bash scripts/e2e-littlefriends.sh       # intake-engine acceptance run (needs `claude` + UPRIVER_GATE_AUTO=1)
```

CI (`.github/workflows/test.yml`) runs build + unit + smoke + Tier A + deploy dry-run on every PR — **keyless by construction** (no Firecrawl/Anthropic/Supabase secrets). `automigrations.yml` pushes Supabase migrations on merge to main; `worker-image.yml` builds the worker container to GHCR. Details: [`docs/TESTING.md`](docs/TESTING.md).

## Skills

Nine marketing skills are symlinked into `.agents/skills/` from the `marketingskills-main/` clone: ai-seo, copy-editing, copywriting, customer-research, form-cro, page-cro, schema-markup, seo-audit, site-architecture. When an Upriver command needs judgment-driven work, the agent prompt tells Claude Code to read the relevant skill first. The skill × command matrix is in [`docs/marketing-skills-integration.md`](docs/marketing-skills-integration.md).

Update the library with `cd marketingskills-main && git pull origin main`, then `./marketingskills-main/validate-skills.sh` and `pnpm typecheck`.

Upriver's own operational skills live in `.agents/upriver-skills/` — the engagement playbook (audit methodology, interview facilitation, brief writing, clone fidelity standards, QA bar, improvement layer, intake handling, sales-report narrative, and more). These are Upriver-specific, safe to edit, and never upstreamed.

## Documentation

| Doc | Read it when |
|---|---|
| [`docs/USER-GUIDE.md`](docs/USER-GUIDE.md) | You're running a client engagement end to end |
| [`docs/COMMAND-REFERENCE.md`](docs/COMMAND-REFERENCE.md) | You need flags/outputs/exit codes for a specific command |
| [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) | You're changing code and need the system map |
| [`docs/INTAKE-PROFILE-ENGINE.md`](docs/INTAKE-PROFILE-ENGINE.md) | You're working with profiles, recon, or `generate` |
| [`docs/TESTING.md`](docs/TESTING.md) | You're adding tests or debugging CI |
| [`docs/DEPLOYMENT-GUIDE.md`](docs/DEPLOYMENT-GUIDE.md) | You're standing up the hosted dashboard/worker |
| [`docs/OPS.md`](docs/OPS.md) | You're operating the hosted surfaces (auth, secrets, recovery) |
| [`docs/TEAM-WORKFLOW.md`](docs/TEAM-WORKFLOW.md), [`docs/CLIENT-ONBOARDING.md`](docs/CLIENT-ONBOARDING.md), [`docs/SALES-PLAYBOOK.md`](docs/SALES-PLAYBOOK.md) | Team process, onboarding, and sales material |

Build history and direction live in `.planning/` — specs 1–15 are shipped (see `.planning/roadmap/` for the drift report and the current handoff prompt covering specs 16–19: Tier B live e2e, clone hardening, site-diversity matrix, and the sales tool).

## Security and secrets

- Never commit `.env` (gitignored). Rotate Firecrawl/Anthropic keys if exposed.
- The Supabase service key bypasses RLS — trusted environments only. The publishable key is the only one safe in browser code.
- `clients/<slug>/` may contain scraped personally identifying information. Treat as confidential. The committed `wb-fixture` is fully fictional/sanitized; `littlefriends` is the synthetic acceptance corpus.
- Test CI is keyless on purpose; never add secrets to `test.yml`.

## License

Internal use only — Upriver Consulting.
