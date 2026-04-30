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
| `CLAUDE_BIN` | `clone`, `fixes apply` | Override the Claude Code binary path. Defaults to `claude` on `PATH`. |

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
