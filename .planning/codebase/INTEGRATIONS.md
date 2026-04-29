# External Integrations

**Analysis Date:** 2026-04-28

## APIs & External Services

**AI/LLM:**
- Claude API (Anthropic) - LLM backbone for audit synthesis and QA
  - SDK: `@anthropic-ai/sdk` 0.30.0
  - Used in: `packages/cli/src/commands/interview-prep.ts`, `synthesize.ts`, `process-interview.ts`
  - Auth: Implicit via Anthropic SDK (API key passed directly)

**Web Scraping & Content Extraction:**
- Firecrawl API - Crawl and scrape website content
  - Base URL: `https://api.firecrawl.dev`
  - Custom client: `packages/core/src/firecrawl/client.ts`
  - Auth: Bearer token via `FIRECRAWL_API_KEY` env var (required for all commands)
  - Methods: `map()` (2 credits), `scrape()` (variable credits per format), `batch()` (variable credits)
  - Usage logging: Integration with Supabase via `packages/core/src/usage/logger.ts`

**Search & Analytics:**
- Google Search Console API (via googleapis)
  - SDK: `googleapis` 137.0.0
  - Implementation: `packages/core/src/gsc/client.ts`
  - Auth: Service account JSON file path via `GOOGLE_SERVICE_ACCOUNT_KEY` env var
  - Scope: `https://www.googleapis.com/auth/webmasters.readonly`
  - Queries: Top queries and pages (90-day window), coverage summary
  - Used in: `discover`, `seo` audit passes

- Google Analytics Data API
  - SDK: `@google-analytics/data` 4.0.0
  - Auth: Via same service account credentials
  - Purpose: Referenced in core package but specific usage not found in explored files

## Data Storage

**Databases:**
- Supabase (PostgreSQL-based)
  - Purpose: Usage event logging for credit tracking
  - Connection: `UPRIVER_SUPABASE_URL` + `UPRIVER_SUPABASE_SERVICE_KEY` env vars
  - Client: `@supabase/supabase-js` 2.45.0
  - Tables: `usage_events` table for tracking API calls and costs
  - Endpoint: `{UPRIVER_SUPABASE_URL}/rest/v1/usage_events` (Supabase PostgREST API)
  - Integration in generated client sites: Per-client Supabase instance for contact forms, user data, and admin functionality

**File Storage:**
- Local filesystem only - Credit logs written to `.upriver/credits.log` via `packages/core/src/firecrawl/client.ts`
- Vercel deployments use ephemeral file storage (not persistent across builds)

**Caching:**
- None detected

## Authentication & Identity

**Auth in Scaffold Template:**
- Better Auth 1.0.0 - Custom authentication framework
  - Implementation: `packages/scaffold-template/src/lib/auth.ts`, `auth-adapter.ts`
  - Secret: `BETTER_AUTH_SECRET` env var (generated with `openssl rand -hex 32`)
  - Base URL: `BETTER_AUTH_URL` env var (e.g., `http://localhost:4321`)

**Supabase Auth in Generated Sites:**
- Public (anon) client - Browser-safe for contact forms and public reads
  - Credentials: `SUPABASE_URL` + `SUPABASE_ANON_KEY`
- Server-only admin client - For privileged SSR routes
  - Credentials: `SUPABASE_SERVICE_ROLE_KEY` or fallback to anon key
  - Uses: Admin routes (e.g., change request form) in `packages/scaffold-template/src/pages/api/`

## Monitoring & Observability

**Error Tracking:**
- None detected

**Logs:**
- Local file logging: Usage/credit logs in `.upriver/credits.log` for local tracking
- Supabase logging: Usage events with cost calculations pushed to Supabase (non-fatal, silent failure)
- Cost tracking: `CLAUDE_COSTS` lookup table in `packages/core/src/usage/logger.ts` with rates for `claude-opus-4-7`, `claude-sonnet-4-6`, `claude-haiku-4-5`

## CI/CD & Deployment

**Hosting:**
- Vercel - Primary deployment platform for scaffold template client sites
  - Adapter: `@astrojs/vercel` 8.0.0
  - Setup via CLI: `packages/cli/src/commands/scaffold/deploy.ts`
  - API endpoint: `https://api.vercel.com` (v10 for projects, v13 for deployments)
  - Creates projects, links GitHub repos, triggers preview deployments
  - Environment variables pushed to Vercel via API

**CI Pipeline:**
- GitHub - Repository hosting and source control
  - Repos created via GitHub API for each scaffold
  - CLI command: `packages/cli/src/commands/scaffold/github.ts`
  - API endpoint: `https://api.github.com/orgs/{ORG}/repos`
  - Org: `lifeupriver` (hardcoded)
  - Auth: `GITHUB_TOKEN` env var (PAT with repo create permissions)

**Local Development:**
- Git (version control) - Initialized locally during scaffold for new client repos
- Playwright - Browser automation for clone verification and QA testing

## Environment Configuration

**Required env vars (root):**
- `FIRECRAWL_API_KEY` - Firecrawl API key (required for all commands)
- `GOOGLE_SERVICE_ACCOUNT_KEY` - Path to Google service account JSON (required for GSC/Analytics audit passes)
- `UPRIVER_SUPABASE_URL` - Optional, skips usage logging if not set
- `UPRIVER_SUPABASE_SERVICE_KEY` - Optional, skips usage logging if not set

**Required env vars (scaffold template):**
- `SUPABASE_URL` - Supabase project URL
- `SUPABASE_ANON_KEY` - Public Supabase key for browser
- `SUPABASE_SERVICE_ROLE_KEY` - Server-only Supabase key
- `BETTER_AUTH_SECRET` - Authentication secret
- `BETTER_AUTH_URL` - Auth service URL
- `GITHUB_TOKEN` - GitHub PAT for change-request form (opens issues in client repo)
- `GITHUB_OWNER` - Repository organization name
- `GITHUB_REPO` - Repository name
- `CLIENT_SLUG` - Client identifier (overwritten per-client during scaffold)
- `PRODUCTION_URL` - Client's production domain

**Secrets location:**
- `.env` files (not committed, listed in `.gitignore`)
- Vercel environment variables dashboard (for deployed sites)
- Supabase project dashboard (for database credentials)

## Webhooks & Callbacks

**Incoming:**
- Change request form in scaffold template - Writes to GitHub issues via GitHub API
  - Endpoint: `packages/scaffold-template/src/pages/api/change-request.ts`
  - Requires: `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`

**Outgoing:**
- None detected - No webhook consumption or outbound event notifications

## External Data Sources Used in Audits

**Competitor Analysis:**
- Hardcoded URL lists for competitor research (e.g., Google Maps, WeddingWire, TheKnot reviews)
- Patterns checked in `packages/audit-passes/src/` via regex matching of page links

**Review Platform References:**
- Google Maps links detection - `packages/audit-passes/src/local/index.ts`
- Wedding industry review sites (WeddingWire, TheKnot) - `packages/audit-passes/src/sales/index.ts`
- Google Reviews links - Multiple audit passes reference Google review detection

---

*Integration audit: 2026-04-28*
