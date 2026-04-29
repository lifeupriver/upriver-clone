# Architecture

**Analysis Date:** 2026-04-28

## Pattern Overview

**Overall:** Monolithic CLI-driven pipeline architecture with plugin-based audit passes. The system orchestrates a multi-stage workflow: website scraping → multi-dimensional audit analysis → scaffold generation → AI-assisted visual cloning.

**Key Characteristics:**
- **CLI-first design** using oclif for command orchestration (`@oclif/core`)
- **Workspace monorepo** (pnpm) with 5 packages: `core`, `cli`, `audit-passes`, `dashboard`, `scaffold-template`
- **Pluggable audit system** where each audit dimension (SEO, design, content, sales, etc.) is an independent pass with consistent API
- **AI agent integration** via Claude Code headless agent for visual page cloning
- **Deterministic post-processing** with link rewriting and asset localization

## Layers

**Layer 1 — Core (Shared Types & Utilities):**
- Purpose: Type definitions and cross-package utilities for configuration, audit results, Firecrawl integration
- Location: `packages/core/src/`
- Contains: Type definitions (`types/`), Firecrawl SDK client (`firecrawl/client.ts`), GSC API client, config management, usage logging
- Depends on: @anthropic-ai/sdk (for any future Claude API integration)
- Used by: All other packages
- Key exports: `AuditPackage`, `SitePage`, `DesignSystem`, `FirecrawlClient`, `AuditPassResult`

**Layer 2 — Audit Passes (Analysis):**
- Purpose: Dimension-specific analysis modules that examine scraped pages and produce findings
- Location: `packages/audit-passes/src/`
- Contains: 10 independent audit passes (seo, content, design, sales, links, schema, aeo, local, backlinks, competitors)
- Each pass exports: `run(slug: string, clientDir: string): Promise<AuditPassResult>`
- Pattern: Load page data → extract patterns/issues → score 0-100 → return findings with priorities (p0/p1/p2)
- Depends on: Core types, shared utilities in `shared/` (loader.ts, finding-builder.ts)
- Used by: CLI audit command

**Layer 3 — CLI (Command Orchestration):**
- Purpose: User-facing command interface that chains all workflow stages
- Location: `packages/cli/src/commands/`
- Contains: 17 commands including init, scrape, audit, scaffold, clone, finalize, and supporting utilities
- Entry point: `packages/cli/bin/run.js` (oclif wrapper)
- Depends on: Core, Audit Passes, Firecrawl, Claude Code agent
- Used by: End users (npm/pnpm CLI)

**Layer 4 — Scaffold Template (Generated Repo Template):**
- Purpose: Starter repo template (Astro 6) copied and customized for each client during scaffold phase
- Location: `packages/scaffold-template/src/`
- Contains: Astro pages (`src/pages/`), components (`src/components/astro/`), API routes, admin dashboard, auth middleware
- Not executed by CLI; copied as template and edited in-place by CLI during scaffold and clone
- Components: Hero, Carousel, CTASection, Footer, Nav, ContactForm reusable components
- Admin: Supabase-backed dashboard for inquiries, reviews, requests, analytics, content management
- Used by: Scaffold command (copies & customizes) and Clone command (agent modifies)

**Layer 5 — Dashboard (Audit Visualization):**
- Purpose: Astro site displaying audit results and client project dashboard
- Location: `packages/dashboard/src/`
- Not part of CLI core flow; runs separately for visualization
- Used by: Project management, client review

## Data Flow

**Workflow Entry:** User runs CLI command (e.g., `upriver clone audreys`)

### Stage 1 — Init & Scrape
1. `upriver init <slug>` — creates `clients/<slug>/` directory, initializes config
2. `upriver scrape <slug>` — orchestrates Firecrawl agent
   - Firecrawl crawls live site, extracts DOM structure, extracts structured data (CTAs, team, testimonials, FAQs, pricing, contact, social links)
   - Results stored: `clients/<slug>/pages/*.json` (markdown + metadata), `clients/<slug>/rawhtml/*.html`, `clients/<slug>/screenshots/`
   - Branding profile extracted (logo, colors, fonts) from source site

### Stage 2 — Audit Analysis
3. `upriver audit <slug>` — runs 10 audit passes in parallel
   - Each pass loads page data from `clients/<slug>/pages/`
   - Each pass generates findings (with evidence, affected pages, remediation guidance)
   - Results written to `clients/<slug>/audit/{dimension}.json` + `summary.json`
   - Scoring: individual pass score (0-100) + overall score (average of all passes)

### Stage 3 — Scaffold Generation
4. `upriver scaffold <slug>` — generates client's Astro repo
   - Copies template from `packages/scaffold-template/` → `clients/<slug>/repo/`
   - Applies design tokens (`designSystem.json`) → writes `src/styles/global.css`
   - Copies client fonts/logos to `public/images/`
   - Generates navigation component from `siteStructure` 
   - Seeds content collections: pages, testimonials, FAQs, team members
   - Writes `CLAUDE.md` (client-specific code guidelines) and product marketing context
   - Output: Ready-to-edit Astro repo with no pages yet (just template + admin)

### Stage 4 — Visual Cloning
5. `upriver clone <slug>` — AI-assisted visual port of live site
   - For each page in `siteStructure.pages` (filtered by blocklist, --skip, --page flags):
     a. Create git branch (or worktree for parallel execution)
     b. Build prompt from: screenshot, rawhtml, design tokens, audit findings, local routes, local logos
     c. Spawn Claude Code agent with `--permission-mode acceptEdits`
     d. Agent edits `src/pages/{path}.astro` to match live site 1:1 (no redesign)
     e. Verify loop (optional, single-worktree mode): screenshot built page, ask Claude to compare, iterate
     f. Finalize: rewrite client-domain hrefs to local routes, CDN image URLs to /images/
     g. Commit changes, open draft PR if `--no-pr` not set
     h. Clean up worktree
   - Results: Parallel git branches, one per page, each with full commit history

### Stage 5 — Post-Clone
6. `upriver finalize <slug>` — deterministic link/asset rewriting across repo
   - Re-scans all `src/pages/*.astro` for client-domain links and CDN URLs
   - Rewrite using `asset-manifest.json` and DEFAULT_CDN_HOSTS list
   - Optional: download missing CDN images in parallel

## Key Abstractions

**BaseCommand:**
- Purpose: Common parent for all CLI commands
- Location: `packages/cli/src/base-command.ts`
- Provides: Environment variable access, client config loading, Firecrawl API key validation
- Pattern: All concrete commands extend `BaseCommand`

**AuditPass API:**
- Purpose: Standardized interface for all audit dimensions
- Signature: `async run(slug: string, clientDir: string): Promise<AuditPassResult>`
- Result structure: Dimension name, score (0-100), findings array, summary text
- Each finding has: priority (p0/p1/p2), category, title, description, remediation, evidence, affected pages

**ScaffoldPaths:**
- Purpose: Resolve directory layout across CLI, scaffold template, and client assets
- Location: `packages/cli/src/scaffold/template-writer.ts`
- Provides: `clientDir`, `repoDir`, `templateDir` resolution
- Pattern: Single source of truth for where client data lives

**SitePage & SiteStructure:**
- Purpose: Represent scraped site hierarchy
- Location: `packages/core/src/types/audit-package.ts`
- Contains: Per-page metadata (URL, title, headings, images, CTAs, links), site-wide navigation
- Used by: Scaffold (generates nav), Clone (filters pages, builds prompts)

**AuditPackage:**
- Purpose: Complete audit deliverable bundling all analysis results + audit metadata
- Contains: Site structure, design system, content inventory, findings, implementation plan, brand voice draft
- Loaded by: Scaffold command to drive customization
- Exported as: `clients/<slug>/audit-package.json`

## Entry Points

**CLI Entry:**
- Location: `packages/cli/bin/run.js` (oclif wrapper)
- Points to: `packages/cli/src/commands/*` (17 command classes)
- Invoked by: `upriver <command> [args] [flags]`

**Clone Command Entry:**
- Location: `packages/cli/src/commands/clone.ts`
- Triggers: Multi-page parallel cloning with verification loop
- Calls: `clonePage()` which spawns Claude Code agent via `runClaudeCode()` spawning `claude` CLI

**Audit Command Entry:**
- Location: `packages/cli/src/commands/audit.ts`
- Loads all 10 audit pass functions from `@upriver/audit-passes`
- Runs in parallel via `Promise.allSettled()`
- Writes JSON results to `clients/<slug>/audit/`

**Scaffold Command Entry:**
- Location: `packages/cli/src/commands/scaffold/index.ts`
- 9-step generation pipeline: copy template → apply assets → design tokens → nav → seed content → copy images → write docs → changelog

## Error Handling

**Strategy:** Fail-fast on critical operations (init, scrape), graceful degradation on audit/clone, detailed error reporting.

**Patterns:**
- CLI commands call `this.error(message)` for critical failures (stops execution)
- Audit passes wrapped in `Promise.allSettled()` to isolate failures
- Clone page results include error field for per-page failures (process continues)
- Firecrawl/external API errors caught and re-thrown with context
- Git operations wrapped in try-catch with fallback behaviors (e.g., "nothing to commit")

## Cross-Cutting Concerns

**Logging:** Console-based (this.log, this.warn in CLI)

**Validation:** 
- Config validation via TypeScript interfaces at load time
- Client slug presence checks before operations
- Directory existence validation (clientDir, repoDir, templateDir)

**Authentication:**
- FIRECRAWL_API_KEY required for scrape operations (enforced via BaseCommand.getFirecrawlKey())
- Supabase project ref optional (stored in client-config.yaml)
- Claude Code agent invoked headless (no manual auth needed; inherits user's claude CLI credentials)

**Concurrency:**
- Audit passes run in parallel via `Promise.allSettled()`
- Clone pages run in parallel via worker pool (configurable, default 3)
- Worktrees used for parallel page cloning to avoid git conflicts
- File I/O serialized (no concurrent writes to same file)

**Asset Management:**
- `asset-manifest.json` maps Firecrawl-downloaded CDN images to local /images/ paths
- Fonts and logos copied from `clients/<slug>/assets/` during scaffold
- Font substitutes mapped to Google Fonts by name matching (resolveFontSubstitutes pattern)
- Screenshots organized by page slug in `clients/<slug>/screenshots/{desktop,mobile}/`

---

*Architecture analysis: 2026-04-28*
