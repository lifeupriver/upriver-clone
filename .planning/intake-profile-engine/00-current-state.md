# Intake & Profile Engine — Current State (Phase 0 Recon)

Date: 2026-06-04
Repos read: `upriver-consulting` (website), `upriver-clone` (CLI monorepo)
Status: complete. PRD not yet written; awaiting go.

---

## Website repo: `upriver-consulting`

Next.js 16.2.3, React 19.2.4, Tailwind v4 (`@tailwindcss/postcss`), TypeScript 5, framer-motion ^12.38.0, `@anthropic-ai/sdk` ^0.87.0, playwright-core, Vercel (implicit adapter, no vercel.json). No middleware.ts.

### 1. Route group structure under `src/app/`

- `(general)` — main public site: home, `/audit`, `/contact`, `/demos`, `/faq`, `/how-it-works`, `/learn/[slug]`, `/services/*`, `/team`, `/claude`
- `(venues)` — wedding venue vertical: own home, `/audit`, `/demos`, `/services`
- `admin` — unparenthesized, URL-visible: PIN-gated CRM dashboard (`admin/page.tsx`, `admin/crm`)
- `consulting` — consulting landing page
- `proposal/[id]` — client-facing proposal view + accept flow (`page.tsx`, `ProposalActions.tsx`, `confirmed/page.tsx`)
- `api/*` — flat route handlers: `api/admin/*`, `api/audit/*`, `api/contact`, `api/demo/*`, `api/inquiry`, `api/stripe/*`, `api/signwell/*`

A new `intake/[token]` route group fits cleanly alongside `proposal/[id]`, which is the existing precedent for a tokenized client-facing page.

### 2. `/admin` PIN protection

Cookie-based shared PIN, no middleware:

- `src/app/api/admin/auth/route.ts` — POST validates PIN against `ADMIN_PIN` env (default `"142857"`), sets httpOnly cookie `admin_session` = base64 JSON `{ pin, expires }`, 24h, sameSite lax
- `src/lib/admin-auth.ts:6-16` — `isAuthenticated()` decodes the cookie and compares `data.pin === ADMIN_PIN`; `requireAuth()` returns 401 JSON
- `src/app/admin/crm/PinScreen.tsx` — client form POSTs the PIN

**Verdict for `/intake`:** the pattern is inherently single-operator — one shared secret, the cookie stores the PIN itself, no per-client identity. It cannot distinguish client A's intake link from client B's. `/intake/[token]` should NOT reuse it. But it also does not need Better Auth: a per-client opaque token in the URL path, validated against a stored token (exactly the `validateInterviewToken` pattern that already exists in the upriver-clone dashboard, see CLI §“existing intake surface” below, and the `proposal/[id]` precedent in this repo) is sufficient and matches existing conventions in both repos.

### 3. Better Auth

**Absent.** No `better-auth` (or next-auth/auth0/@auth) in package.json or source.

### 4. Supabase client

**Absent.** No `@supabase` packages. The site's database is Node's built-in SQLite (`node:sqlite` `DatabaseSync` in `src/lib/db.ts`, file `./data/crm.db`). Env vars are raw `process.env` reads scattered per-route (`ADMIN_PIN`, `ANTHROPIC_API_KEY`, `RESEND_*`, `TWILIO_*`, `STRIPE_*`); no zod/t3-env validation layer. `.env` handling is conventional Next.

Implication: wiring `/intake` to a per-client Supabase project is net-new in this repo — add `@supabase/supabase-js`, a server-side client factory, and env vars. There is no existing pattern to follow here; the pattern to copy lives in `upriver-clone` (`packages/core/src/data/supabase.ts`).

### 5. Endpoint convention: route handlers, not server actions

**Zero `"use server"` directives in the codebase.** Every write goes through `app/api/**/route.ts`. Representative examples:

- `src/app/api/contact/route.ts` — POST: validate, honeypot, rate-limit (`src/lib/rate-limit.ts`, in-memory per-IP), write SQLite, send email/SMS, fire n8n webhook
- `src/app/api/audit/generate/route.ts` — `export const runtime = "nodejs"`, Playwright crawl + Anthropic SDK generation, rate-limited 1/IP/24h
- `src/app/api/demo/inquiry/route.ts` — Anthropic SDK streaming via `ReadableStream` (model `claude-sonnet-4-20250514`)

New intake endpoints should be route handlers under `api/intake/*` with `runtime = "nodejs"` where the Anthropic SDK is used. The streaming pattern for the chatbot already exists in the demo routes.

### 6. Design tokens

Confirmed as assumed:

- `src/app/globals.css` — `:root` CSS vars (`--bg-primary: #1A1412`, `--accent: #F1551A`, etc.) mapped into Tailwind v4 via `@theme inline` (`--color-bg-primary`, `--color-accent`, `--font-heading`, `--font-body`, `--font-mono`)
- `src/lib/fonts.ts` — `headingFont` is a localFont (DegularDisplay woff2/woff) exported under the variable name `--font-outfit` (legacy name, actually Degular); `bodyFont` = DM Sans (`--font-dm-sans`); `monoFont` = JetBrains Mono. Applied in root layout.
- Components consume via Tailwind utility aliases (`text-heading`, `bg-accent`, `border-border`, `font-body`) and `font-[family-name:var(--font-heading)]` for headings.

### 7. Forms and validation

No form libraries (no react-hook-form, no zod). Both forms are `"use client"` + `useState` + inline validation + POST to a route handler:

- `src/components/ContactForm.tsx` — plain fields, regex validation, honeypot field `website`, POSTs `/api/contact`, inline success state
- `src/components/AuditTool.tsx` — multi-stage state machine (`intake → generating → preview → unlocking → unlocked`), POSTs `/api/audit/generate` then `/api/audit/unlock`, honeypot `website_trap`

Reusable for the intake chatbot: `Button.tsx`, `SectionReveal.tsx`, the honeypot/rate-limit/validation idioms, and the AuditTool stage-machine architecture (form → API → streamed/rendered response). The chat UI itself is net-new; the streaming consumption pattern exists in the demo tool components.

### 8. framer-motion / SectionReveal

`framer-motion` ^12.38.0 (the `framer-motion` package, not `motion`). `src/components/SectionReveal.tsx`:

```
props: { children, className = "", delay = 0, as = "div" | "section" }
useInView(ref, { once: true, margin: "-40px" })
initial { opacity: 0, y: 24 } → animate { opacity: 1, y: 0 }, 0.5s easeOut + delay
```

Also used in `FaqAccordion`, `CollapsibleCalculator`, `ToolCard`, `StatCounter` (AnimatePresence, useInView counters).

### 9. Constraints on a new route group

- Next 16.2.3 app router, Tailwind v4: no special constraints; `(general)`/`(venues)` groups and the bare `proposal/[id]` route demonstrate both patterns work
- No `middleware.ts` exists — token validation for `/intake/[token]` happens in the page/route handler (as `proposal/[id]` and the dashboard interview page already do), not middleware
- Routes touching Playwright or heavyweight SDK init must declare `runtime = "nodejs"`; no edge runtime is used anywhere
- `next-sitemap` excludes `/admin`, `/api`, `/consulting/*` — add `/intake` to exclusions
- Rate limiting is in-memory (`src/lib/rate-limit.ts`) and resets on deploy; fine for intake-scale traffic

---

## CLI repo: `upriver-clone`

pnpm monorepo (`pnpm-workspace.yaml` → `packages/*`), root package `upriver` (private), Node ≥20, pnpm ≥9, plain `tsc` builds (`tsconfig.base.json`, ES2022, strict). Packages: `core`, `cli`, `audit-passes`, `dashboard` (Astro), `worker` (Inngest), `scaffold-template`, `admin-template`, `app-prototype-template`.

### 1. Command structure: oclif v3

- Bin `upriver`, entry `packages/cli/bin/run.js`, commands auto-discovered from `./dist/commands` (`packages/cli/package.json` oclif block, `topicSeparator: " "`)
- Each command: a file in `packages/cli/src/commands/` exporting a default class extending `BaseCommand` (`packages/cli/src/base-command.ts`) with static `description`/`args`/`flags` and `async run()`
- ~17 existing commands incl. `audit`, `synthesize`, `voice-extract`, `gap-analysis`, `schema-build`, `run/all` (topic via directory)

**Adding `recon`, `generate`, `profile`:** create `packages/cli/src/commands/{recon,generate,profile}.ts` (or topic directories `profile/show.ts` etc. for subcommands), extend `BaseCommand`, `pnpm build`. No registration file to touch.

### 2. Headless Claude Code: yes, mature pattern

`packages/cli/src/util/claude-cli.ts` (verified line-by-line):

- Spawns `claude --print --output-format json --model <m> --permission-mode <mode> --allowed-tools <list> --system-prompt <s>`; user prompt piped on stdin (`claude-cli.ts:165-182, 247`)
- Optional `--json-schema` for structured output validation (`:178-180`)
- Parses the JSON result envelope (`{ result, is_error, usage, total_cost_usd }`), throws on error envelopes
- SHA256 cache key (model+system+user+schema) → `clients/<slug>/.cache/llm/<key>.json`, bypass via `UPRIVER_LLM_NO_CACHE=1` (`:90-160`)
- Strips `ANTHROPIC_API_KEY` from the child env to force the operator's Claude Max subscription; `UPRIVER_USE_API_KEY=1` overrides (`:230-234`)
- Logs every call to Supabase via `logUsageEvent` (`:192-200`)
- Defaults: `permissionMode: 'plan'`, `allowedTools: ['Read','Glob','Grep']` — read-only. **`generate` will need write-capable sessions (acceptEdits + Write/Edit tools), which the options already support but no current caller uses.**
- `claudeCliAvailable()` for graceful fallback; `packages/cli/src/util/cached-llm.ts` is the SDK-based alternative

Called from `synthesize.ts`, brand-voice, design-brief, improve stages — prompt assembly is per-command (caller builds system/user strings).

### 3. `audit-package.json`: the structured-artifact pattern to copy

- Type: `AuditPackage` in `packages/core/src/types/audit-package.ts` (meta, brandingProfile, designSystem, siteStructure, contentInventory, screenshots, findings, brandVoiceDraft, implementationPlan, impactMetrics)
- Writer: `packages/cli/src/commands/synthesize.ts:187` — plain `writeFileSync(JSON.stringify(...))` to `clients/<slug>/audit-package.json`
- Readers: `packages/dashboard/src/lib/report-reader.ts`, `commands/design-brief.ts`, `commands/fixes/plan.ts`, `improve/agent-runner.ts`

Pattern = typed interface in `@upriver/core` + command that writes `clients/<slug>/<artifact>.json` + readers importing the type. The Client Profile maps directly: `packages/core/src/types/client-profile.ts` (or a new schemas package, see §8) + `clients/<slug>/profile.json` + `profile`/`generate`/`recon` commands as writer/readers.

Note: `client-config-zod.ts` and `extraction-zod.ts` show zod schemas already coexist with TS interfaces in core — the profile should follow that dual pattern (zod for runtime validation at source boundaries, inferred TS type as the contract).

### 4. F-series status and `.planning/` contents

`.planning/` contains `roadmap/` (PRODUCT-ROADMAP.md, upriver-cli-feature-roadmap.md, BACKLOG.md, DECISIONS-NEEDED.md, DRIFT-REPORT.md, HANDOFF.md, AUTOPILOT-PROMPT.md, RESUME-PROMPT.md, OPTION-B-MIGRATION.md) and `codebase/` (STRUCTURE, STACK, ARCHITECTURE, CONVENTIONS, INTEGRATIONS, TESTING, CONCERNS). No `intake-profile-engine/` until this doc.

Build status (from `packages/core/src/pipeline/stages.ts` + source existence):

| ID | Feature | Status |
|----|---------|--------|
| F01 audit-media | BUILT |
| F02 schema-build | BUILT |
| F03 voice-extract | BUILT |
| F09 gap-analysis | BUILT |
| F10 blog-topics | BUILT (heuristic; Ahrefs integration roadmapped, not wired) |
| F12 video-audit | BUILT |
| F04 prototype-app, F05 admin-deploy, F06 monitor, F07 followup, F11 custom-tools | SPECCED only |

### 5. Supabase: single project today, not one-per-client

**The repo contradicts the brief's assumption.** Current implementation is ONE Supabase project for all clients: `packages/core/src/data/supabase.ts` (`SupabaseClientDataSource`) reads `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` from env and stores artifacts in one Storage bucket `upriver` under `clients/<slug>/...` prefixes. Usage logging (`logUsageEvent`) also goes to this single project.

Per-client config lives at `clients/<slug>/client-config.yaml`, typed by `packages/core/src/types/client-config.ts` (`ClientConfig`: slug, name, url, platform, vertical, gsc, vercel_preview_url, github_repo, dev_port, and an **optional `supabase_project_ref` field** — the hook for one-project-per-client exists but nothing consumes it yet).

Client dir contents (per STRUCTURE.md + `clients/audreys/`): `pages/`, `rawhtml/`, `screenshots/`, `assets/`, `audit/`, `blog-topics/`, `voice/`, `audit-package.json`, `client-config.yaml`, `asset-manifest.json`, `repo/` (generated Astro working tree), `docs/`. Note: only `audreys` exists; **there is no `clients/littlefriends/` directory yet** (though `interview/parse-guide.ts` references one as the canonical example — it was removed or never committed).

### 6. Worktrees / parallelism: none today

No git worktree usage anywhere. `packages/cli/src/commands/run/all.ts` orchestrates stages **sequentially** via `node:child_process.spawn` of `upriver <stage> <slug>`; stages avoid conflicts by writing uniquely named artifacts. The Inngest worker (`packages/worker/src/functions/run-stage.ts`) handles scheduled/async runs. Worktree-parallel doc generation for `generate` is net-new infrastructure.

### 7. Recon-adjacent tooling

| Tool | Status | Where |
|------|--------|-------|
| Firecrawl | WIRED | `packages/core/src/firecrawl/client.ts` — REST wrapper w/ retry + cost logging; drives scrape pipeline. The `FirecrawlBrandingProfile` type already exists in audit-package.ts |
| Playwright | WIRED | screenshots, clone verification (pixelmatch) |
| Anthropic SDK | WIRED | fallback LLM path (`cached-llm.ts`) when CLI unavailable |
| GSC | WIRED | `packages/core/src/gsc/client.ts` via googleapis |
| Ahrefs | ABSENT in code (roadmap mention only; available as MCP in Cowork, not in the CLI) |
| Cloudinary | ABSENT in this repo |

So `upriver-clone recon` largely composes existing wired capabilities (Firecrawl scrape, screenshots, GSC) plus net-new adapters (socials, GBP, GEO checks, secret shopper).

### 8. Shared schema home

The monorepo supports a clean answer:

- Today shared types live in `packages/core/src/types/` re-exported from `@upriver/core`. But `@upriver/core` drags in Firecrawl/GSC/Supabase integration code — too heavy for the website to import.
- **Recommendation: new `packages/schemas` (`@upriver/schemas`)** — types + zod only, zero runtime deps beyond zod. CLI consumes via `workspace:*`. The website (separate git repo) consumes via one of: published private npm package, `file:`/tarball install, or git dependency. Decision needed from Joshua on distribution (publish vs file dep); the monorepo side is unambiguous.

---

## Existing intake/interview infrastructure the plan did not anticipate

This is the biggest recon finding. `upriver-clone` already has a working intake + client-facing interview layer:

1. **`ClientIntake` artifact** — `packages/core/src/types/intake.ts`: versioned `clients/<slug>/intake.json` (finding decisions, page wants, reference sites, scope tier, timestamps). Writer: `packages/dashboard/src/lib/intake-writer.ts` (`emptyIntake()`, `writeIntake()` via the data-source abstraction). Reader: `packages/cli/src/util/intake-reader.ts` (+ tests). Consumed by `fixes/plan`, `clone`, `report/bundle`, deep-audit passes, `improve/agent-runner`.
2. **Magic-link client interview** — `packages/dashboard/src/pages/deliverables/[slug]/interview.astro`: token-gated (`validateInterviewToken(slug, token)` in `dashboard/src/lib/interview.ts`) client-facing form rendered from a parsed `clients/<slug>/interview-guide.md` (`packages/core/src/interview/parse-guide.ts` → `FormSpec` of questions/checkboxes/overrides), with response persistence and progress summary. Also operator-side `clients/[slug]/intake.astro` and `interview.astro` pages.

Implications:

- The **magic-link token pattern already exists** — `/intake/[token]` on the website should mirror `validateInterviewToken`, not the admin PIN and not Better Auth. This resolves the brief's open auth question.
- The new Client Profile is a **superset/evolution** of this layer, not a greenfield. The PRD must state the relationship: `ClientIntake` (audit-scoped decisions) stays or folds into the profile; `interview-guide.md` → FormSpec is the static-form ancestor of the coverage-driven chatbot. Naming matters — "intake" already means something narrower in this codebase.
- Whether the website chatbot writes to Supabase directly (brief's assumption) or through the same data-source abstraction the dashboard uses is now a real design choice.

---

## Open questions: resolved vs still open

| Question | Resolution |
|----------|------------|
| Command registration pattern | RESOLVED — oclif auto-discovery; add files under `packages/cli/src/commands/` |
| Own CLI vs extend `upriver` | RESOLVED — extend; oclif structure makes new commands trivial, all client state already lives here |
| Shared schema home | RESOLVED (monorepo side) — new `packages/schemas`; OPEN (distribution): publish to npm vs file dep for the website repo |
| `/intake` auth | RESOLVED — neither admin PIN nor Better Auth; per-client opaque token mirroring the existing `validateInterviewToken` + `proposal/[id]` patterns |
| One Supabase project per client | CONTRADICTED by code — single project + bucket prefix today; `supabase_project_ref` field exists but unused. Decide: implement per-client projects as part of this build, or keep single-project and defer |
| 18 doc specs, build-sequence DAG, I01–I15 specs | **NOT FOUND in either repo.** The mounted "Ai Consulting" folder is empty. These are the inputs the coverage map (PRD §3) and `generate` depend on. They must be located and added to the workspace (or `.planning/`) before the PRD's coverage map can be written against reality |

---

## What changes vs confirms the kickoff plan

**Confirms:** extend `upriver` CLI (oclif, trivial to add commands); headless Claude Code pattern is mature, cached, JSON-schema capable; audit-package.json is the exact structured-artifact precedent for profile.json; Firecrawl/Playwright/GSC wired for recon; design tokens/SectionReveal/route handler conventions on the website all as expected; build sequence (schema+generate first, chatbot last) fits — generation infra is the only genuinely new heavy piece (write-mode headless sessions, DAG ordering, worktree parallelism).

**Changes:**
1. `/intake` auth: use the existing magic-link token pattern, not PIN, not Better Auth (no new auth dependency).
2. The plan must account for the existing `ClientIntake`/interview-guide layer — extend or supersede explicitly, don't duplicate.
3. Website has no Supabase and no server actions — intake endpoints are net-new route handlers with a new Supabase client, copying conventions from `upriver-clone`, not from the website.
4. Supabase one-project-per-client is aspiration, not current state — needs an explicit decision.
5. Worktree-parallel generation is net-new (current orchestration is sequential spawn).
6. **Blocker for PRD §3:** the 18 doc specs, dependency DAG, and I01–I15 specs are not accessible in either repo or the mounted consulting folder. The schema-by-inversion method cannot run without them.
