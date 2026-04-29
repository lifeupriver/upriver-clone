# Codebase Structure

**Analysis Date:** 2026-04-28

## Directory Layout

```
upriver-clone/                               # Root monorepo
├── .agents/                                 # MCP servers and gstack skills
├── .planning/codebase/                      # Generated codebase analysis docs
├── docs/                                    # Public documentation
├── packages/                                # Workspace packages (pnpm)
│   ├── core/                                # Shared types, utilities, integrations
│   ├── cli/                                 # Main CLI orchestrator (oclif)
│   ├── audit-passes/                        # 10 audit dimension modules
│   ├── dashboard/                           # Astro dashboard for audit visualization
│   └── scaffold-template/                   # Astro 6 starter template (copied per client)
├── clients/                                 # Generated per-client data (not in repo)
│   └── {slug}/                              # Client audit data + generated repo
│       ├── pages/                           # Scraped markdown + metadata (JSON)
│       ├── rawhtml/                         # Raw HTML from Firecrawl
│       ├── screenshots/                     # Desktop and mobile screenshots
│       ├── assets/                          # Client-provided fonts and logos
│       ├── audit/                           # Audit pass results (JSON)
│       ├── audit-package.json               # Complete audit deliverable
│       ├── client-config.yaml               # Client configuration
│       └── repo/                            # Generated Astro repo (working tree)
├── marketingskills-main/                    # Marketing skills library (external reference)
├── upriver-design-system/                   # Design system reference documentation
├── scripts/                                 # Build/validation scripts
├── package.json                             # Root workspace config
├── pnpm-workspace.yaml                      # pnpm workspace definition
├── tsconfig.base.json                       # Base TypeScript config
└── README.md                                # Project overview
```

## Directory Purposes

**packages/core/src/**
- Purpose: Shared types, configuration management, third-party SDK clients
- Contains:
  - `types/` — TypeScript interfaces (audit.ts, audit-package.ts, client-config.ts, extraction-schemas.ts, firecrawl.ts)
  - `config/` — Client config I/O (clientDir, configPath, readClientConfig, writeClientConfig, updateClientConfig)
  - `firecrawl/` — Firecrawl SDK wrapper (client.ts, platform-detector.ts)
  - `gsc/` — Google Search Console client
  - `usage/` — Cost tracking and logging
- Key exports: All types used across CLI and audit passes, FirecrawlClient, config helpers

**packages/cli/src/**
- Purpose: Command interface and workflow orchestration
- Contains:
  - `commands/` — 17 oclif command classes (audit.ts, clone.ts, scaffold/index.ts, scrape.ts, finalize.ts, etc.)
  - `base-command.ts` — Base class for all commands (config loading, env validation)
  - `clone/` — Clone-specific utilities (verify.ts, rewrite-links.ts, download-missing.ts)
  - `scaffold/` — Scaffold generation (template-writer.ts, client-assets.ts)
  - `docs/` — Documentation generation (client-docs.ts, design-brief.ts)
  - `synthesize/` — LLM synthesis helpers (loader.ts)
- Key files: See "Key File Locations" below

**packages/audit-passes/src/**
- Purpose: Dimension-specific audit analysis
- Contains:
  - `seo/`, `content/`, `design/`, `sales/`, `links/`, `schema/`, `aeo/`, `local/`, `backlinks/`, `competitors/` — Each exports `run(slug, clientDir): Promise<AuditPassResult>`
  - `shared/` — Common utilities (loader.ts, finding-builder.ts)
- Pattern: Each pass loads pages via `loadPages()`, extracts patterns, builds findings, scores 0-100

**packages/dashboard/src/**
- Purpose: Astro site for audit visualization
- Contains: Pages, components, layouts for displaying audit results and project dashboard
- Not part of main CLI flow; separate visualization layer

**packages/scaffold-template/src/**
- Purpose: Starter Astro 6 repo template
- Contains:
  - `pages/` — Page templates (index.astro, admin/*, api/*, etc.)
  - `components/astro/` — Reusable components (Hero.astro, Carousel.astro, ContactForm.astro, Footer.astro, Nav.astro, CTASection.astro)
  - `layouts/` — Page layouts (Layout.astro, AdminLayout.astro)
  - `lib/` — Utilities (auth.ts, auth-adapter.ts, supabase.ts)
  - `content/` — Content collections configuration
  - `styles/` — Global CSS (generated per-client)
  - `middleware.ts` — Auth middleware
  - `public/` — Static assets (images/logos/, fonts/, etc.)
- Lifecycle: Copied by `scaffold` command, customized with design tokens/content, edited by `clone` agent

**clients/{slug}/** (generated, not in git)
- Purpose: Per-client audit data and generated repo
- `pages/` — Scraped pages (one .json file per page: title, headings, images, links, CTAs, word count)
- `rawhtml/` — Raw HTML from Firecrawl (for agent reference)
- `screenshots/{desktop,mobile}/` — Firecrawl screenshots (input to clone agent)
- `assets/` — Client-provided fonts and logos (copied to repo by scaffold)
- `audit/` — Audit pass results
  - `{dimension}.json` — Individual pass result (score, findings, summary)
  - `summary.json` — Aggregated scores, findings counts, overall grade
- `repo/` — Generated Astro repo
  - `src/pages/` — Cloned pages (edited by Claude Code agent)
  - `src/styles/global.css` — Design tokens applied
  - `src/components/` — Client-specific components (if added by agent)
  - `CHANGELOG.d/` — Per-branch changelog fragments
  - `.git/` — Git repo initialized by clone command
- `audit-package.json` — Complete audit deliverable (meta, findings, implementation plan, brand voice, design system, site structure, content inventory)
- `client-config.yaml` — Client configuration (URL, dev_port, supabase_project_ref, etc.)
- `asset-manifest.json` — Maps CDN images to local paths (generated by Firecrawl scrape, used by finalize)

## Key File Locations

**Entry Points:**
- `packages/cli/bin/run.js` — oclif CLI entry point (spawned by `upriver` command)
- `packages/cli/src/commands/clone.ts` — Clone command orchestrator (main workflow)
- `packages/cli/src/commands/audit.ts` — Audit command (parallel pass runner)
- `packages/cli/src/commands/scaffold/index.ts` — Scaffold command (9-step generation)
- `packages/cli/src/commands/scrape.ts` — Scrape command (Firecrawl orchestrator)

**Configuration:**
- `packages/core/src/config/client-config.ts` — Config file I/O (reads `clients/{slug}/client-config.yaml`)
- `packages/cli/src/scaffold/template-writer.ts` — Resolves scaffold paths, template location
- `packages/scaffold-template/astro.config.ts` — Astro configuration template (db, auth, adapter)

**Core Logic:**
- `packages/audit-passes/src/shared/loader.ts` — Page data loading (LoadPages, LoadRawHtml, LoadDesignTokens, etc.)
- `packages/audit-passes/src/shared/finding-builder.ts` — Finding creation helpers (finding(), scoreFromFindings())
- `packages/core/src/types/audit-package.ts` — Main data structures (SitePage, SiteStructure, AuditPackage, DesignSystem)
- `packages/cli/src/clone/rewrite-links.ts` — Link and image URL rewriting (buildAssetIndex(), rewriteContent())
- `packages/cli/src/clone/verify.ts` — Verification loop (screenshot comparison, Claude iteration)
- `packages/cli/src/clone/download-missing.ts` — CDN image download utilities

**Testing:**
- No test files committed; testing is manual/integration-based via CLI invocation

## Naming Conventions

**Files:**
- Commands: kebab-case (clone.ts, clone-qa.ts, launch-checklist.ts)
- Utilities: camelCase (template-writer.ts, client-assets.ts, finding-builder.ts)
- Audit passes: lowercase (seo/index.ts, content/index.ts, design/index.ts)
- Components: PascalCase (.astro files: Hero.astro, Carousel.astro, Nav.astro)

**Directories:**
- Lowercase plural for groups (pages/, components/, commands/, audit-passes/)
- Singular for packages (core, cli, dashboard)
- Feature-based grouping (clone/, scaffold/, docs/, admin/)

**TypeScript Interfaces:**
- PascalCase (SitePage, AuditPackage, DesignSystem, FirecrawlClient, AuditPassResult)
- Prefix with type-specific suffix (e.g., `...Options`, `...Result`, `...Entry`, `...Schema`)

**Functions:**
- camelCase (loadPages(), rewriteContent(), buildAgentPrompt(), scoreFromFindings())
- Prefixed by action (load*, run*, build*, write*, rewrite*, verify*)

## Where to Add New Code

**New Audit Dimension:**
- Create directory: `packages/audit-passes/src/{dimension}/`
- Export function: `export async function run(slug: string, clientDir: string): Promise<AuditPassResult>`
- Register in: `packages/cli/src/commands/audit.ts` → `ALL_PASSES` array
- Pattern: Import finding builder, load pages, extract patterns, score, return findings

**New CLI Command:**
- Create file: `packages/cli/src/commands/{name}.ts`
- Extend: BaseCommand
- Implement: static description, args, flags, run() method
- Auto-registered by oclif (reads dist/commands/)

**New Reusable Component (for clone agent):**
- Create file: `packages/scaffold-template/src/components/astro/{Name}.astro`
- Pattern: Plain Astro component (no framework)
- Include in: Clone agent prompt documentation if commonly needed
- Clone agent can reference: `src/components/astro/Hero.astro` etc. in agent prompt

**New Utility (shared across packages):**
- Add to: `packages/core/src/` with appropriate subdirectory (types/, config/, utils/, etc.)
- Export from: `packages/core/src/index.ts`
- Import in other packages: `import { function } from '@upriver/core'`

**New Helper for Scaffold:**
- Add to: `packages/cli/src/scaffold/template-writer.ts`
- Pattern: Named export following camelCase function pattern
- Register in: Scaffold command call chain (steps [1/9] through [9/9])

## Special Directories

**packages/scaffold-template/.astro/**
- Purpose: Astro build artifacts directory
- Generated: Yes (by Astro during build/preview)
- Committed: No (in .gitignore)

**packages/scaffold-template/dist/**
- Purpose: Built static site (for `astro build`)
- Generated: Yes
- Committed: No

**clients/{slug}/repo/.git/**
- Purpose: Git history for cloned pages
- Generated: Yes (by clone command)
- Committed: No (local repo only, not in upriver-clone git)

**clients/{slug}/repo/.worktrees/**
- Purpose: Git worktree clones for parallel page cloning
- Generated: Yes (temporarily during clone command)
- Committed: No (cleaned up after each worktree finishes)

**clients/{slug}/repo/CHANGELOG.d/**
- Purpose: Per-branch changelog fragments (avoid merge conflicts)
- Generated: Yes (one file per page cloned)
- Committed: Yes (to client repo, merged to main CHANGELOG on release)

**upriver-design-system/**
- Purpose: Design system documentation and reference
- Generated: No (manually maintained)
- Committed: Yes (reference material)

---

*Structure analysis: 2026-04-28*
