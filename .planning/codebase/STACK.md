# Technology Stack

**Analysis Date:** 2026-04-28

## Languages

**Primary:**
- TypeScript 5.4+ - All source code across core, CLI, audit passes, dashboard, and scaffold template
- JavaScript (Node.js) - Runtime for CLI commands and build scripts

**Secondary:**
- Astro template syntax - For server-side rendering in scaffold template and dashboard
- CSS/SCSS - Styling via Tailwind CSS

## Runtime

**Environment:**
- Node.js 20.0.0+ - Required by root `package.json` engines constraint
- ES2022 target - TypeScript compilation to modern JavaScript

**Package Manager:**
- pnpm 9.0.0+ - Monorepo package manager
- Lockfile: `pnpm-lock.yaml` - Present and maintained

## Frameworks

**Core:**
- TypeScript 5.4.0 - Type-safe development across all packages
- Zod 3.22.0 - Schema validation in `@upriver/core` for audit types and configurations

**Frontend/Web:**
- Astro 5.0.0 - Used in `@upriver/dashboard` and `@upriver/scaffold-template` for server-side rendering with hybrid static/SSR output
- React 18.3.0 - UI component library for interactive islands in Astro (`@astrojs/react` 4.2.0)
- Tailwind CSS 4.0.0 - Utility-first CSS with `@tailwindcss/vite` 4.0.0 plugin integration

**CLI & Commands:**
- oclif 3.0.0 - Command-line framework (`@oclif/core`, `@oclif/plugin-help`, `@oclif/plugin-not-found`)
  - Commands located at `packages/cli/src/commands/`
  - Plugins provide help documentation and error handling for unknown commands

**Testing:**
- No test framework detected - No test dependencies or test files found in package.json manifests

**Build/Dev:**
- TypeScript Compiler (tsc) - Direct invocation for build and watch modes
  - Each package has independent `tsconfig.json` inheriting from `tsconfig.base.json`
- Astro CLI - Dev server and build for web packages via `astro dev`, `astro build`, `astro preview`
- Playwright 1.59.1+ - Browser automation for web scraping and clone verification in CLI

## Key Dependencies

**Critical:**
- `@anthropic-ai/sdk` 0.30.0 - Claude API integration for interview processing, synthesis, and QA commands (`packages/cli/src/commands/interview-prep.ts`, `synthesize.ts`, `process-interview.ts`)
- `googleapis` 137.0.0 + `@google-analytics/data` 4.0.0 - Google Search Console and Analytics data fetching in `packages/core/src/gsc/client.ts`
- `@supabase/supabase-js` 2.45.0 - Database and auth client in scaffold template (`packages/scaffold-template/src/lib/supabase.ts`)
- `yaml` 2.4.0 - YAML configuration parsing across core, CLI, and scaffold-template

**Infrastructure:**
- `better-auth` 1.0.0 - Authentication framework in scaffold template (`packages/scaffold-template/src/lib/auth.ts`)
- `dotenv` 16.0.0 - Environment variable loading in CLI (`packages/cli/`)
- `@astrojs/vercel` 8.0.0 - Vercel SSR adapter for scaffold template and dashboard

## Configuration

**Environment:**
- `.env.example` - Root level defines: `FIRECRAWL_API_KEY`, `GOOGLE_SERVICE_ACCOUNT_KEY`, `UPRIVER_SUPABASE_URL`, `UPRIVER_SUPABASE_SERVICE_KEY`
- `packages/scaffold-template/.env.example` - Client-specific: `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `GITHUB_TOKEN`, `GITHUB_OWNER`, `GITHUB_REPO`, `CLIENT_SLUG`, `PRODUCTION_URL`
- Environment variables managed by each CLI command via `this.requireEnv()` pattern in `packages/cli/src/base-command.ts`

**Build:**
- `tsconfig.base.json` - Root TypeScript configuration with strict mode enabled (`strict: true`, `noUncheckedIndexedAccess: true`, `noImplicitOverride: true`, `exactOptionalPropertyTypes: true`)
  - Target: ES2022
  - Module: NodeNext
  - Output: `dist/` directory per package
- `packages/dashboard/astro.config.mjs` - Astro hybrid config with static output default, SSR for admin routes via `@astrojs/vercel` adapter
- `packages/scaffold-template/astro.config.mjs` - Same Astro/Vercel setup for generated client sites
- Build scripts use `tsc -p tsconfig.json` for compilation, no Vite/bundler for core packages (CLI compiles TypeScript directly)

## Platform Requirements

**Development:**
- Node.js 20+
- pnpm 9+
- Optional: Playwright (for clone verification, lazy-loaded)

**Production:**
- Node.js 20+ (for CLI tool usage)
- Vercel (primary deployment platform for scaffold template sites via `@astrojs/vercel` adapter)
- Modern browsers (ES2022 support)

---

*Stack analysis: 2026-04-28*
