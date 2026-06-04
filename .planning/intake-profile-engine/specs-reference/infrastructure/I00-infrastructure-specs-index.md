# I00: Claude Infrastructure Specs Suite — Index

## What This Is

This is the index for the Claude Infrastructure specs suite: a 15-spec library that defines how Upriver Consulting configures, operates, and maintains Claude environments for clients and for its own practice. It sits alongside two other spec suites that together form the complete Upriver operating system: the 18 AI Operating System specs (how clients' marketing and operations run on AI) and the 14 Content Production specs (how video and photo production gets executed).

The Infrastructure suite answers a narrower question than the other two: how do you actually set up Claude correctly, deploy it to a client, govern access, and keep it running for months and years without drift? Every spec in this suite is operational rather than strategic. None of them tell you what content to produce or how to position the business. They tell you how to make the Claude layer of the stack work properly.

The suite is divided into two groups:

- **Group A: Client-facing Claude setup (I01 through I09).** Nine specs covering every aspect of standing up a new client's Claude environment from scratch. Built in the order a real client onboarding follows.
- **Group B: My internal Claude setup (I10 through I15).** Six specs covering my own environment — the consulting practice's own Claude Project, skills library, routines, MCP stack, Obsidian integration, and the audit layer that maintains everything.

A complete new-client onboarding uses every spec in Group A. A mature consulting practice running at scale depends on every spec in Group B.

## Quick Navigation

| # | Title | Group | Words | Primary Use |
|---|---|---|---|---|
| I01 | Client Claude Project Setup | A | 3,064 | Create the client-owned Project with knowledge, instructions, and initial configuration |
| I02 | Client Skills Deployment | A | 2,960 | Deploy universal, industry, and custom skills to the client's account |
| I03 | Client Routines & Cowork | A | 3,097 | Configure scheduled and recurring Claude workflows for the client |
| I04 | Client MCP Server Configuration | A | 3,204 | Wire up the client's MCP connectors and tool access |
| I05 | Client Claude in Chrome | A | 3,272 | Set up Chrome extension browsing automation with allowlists and shortcuts |
| I06 | Client Claude Code | A | 3,432 | Decision tree and setup for clients with technical users |
| I07 | Client Account, Access, Governance | A | 3,643 | Plan tier, seat management, data retention, compliance, offboarding |
| I08 | Client Custom Styles, Memory, Preferences | A | 3,817 | Personalization layers — Style, Profile, Memory posture |
| I09 | Client Artifacts & Deliverable Templates | A | 3,487 | Interactive apps and structured deliverable templates for the client |
| I10 | Upriver Consulting Claude Project | B | 3,479 | My master Project holding all 47 specs as knowledge |
| I11 | Personal Skills Architecture | B | 3,359 | How I organize, version, and maintain my skill library |
| I12 | My Routines & Cowork Workflows | B | 3,117 | My recurring automations for running the practice |
| I13 | My MCP Server Stack | B | 3,186 | My personal MCP configuration and credential management |
| I14 | Obsidian + Claude Integration | B | 3,249 | Vault structure, access patterns, sync workflow |
| I15 | Claude Infrastructure Audit & Maintenance | B | 3,688 | Quarterly audit cadence that keeps everything current |

**Total suite: approximately 50,054 words across 15 specs.**

## The Group A Walkthrough (Client-Facing)

The client-facing specs are numbered in the order I execute them during a real onboarding. The sequence isn't arbitrary; each spec assumes prerequisites from earlier specs.

**I01 is the foundation.** A client's Project is the container that holds the 18 AI Operating System docs as knowledge, the custom instructions that define how Claude operates for them, and the shared workspace where their team (per Team or Enterprise plan) collaborates. Nothing else in Group A makes sense if I01 isn't done. I verified plan tier behavior for I01: Pro doesn't support shared Projects, so Team plan is the default recommendation for multi-user clients. Audrey's Farmhouse got a Team plan with 5 seats.

**I02 adds the skills.** Once the Project exists, deployable skills give the client's team one-command access to recurring workflows. Five skill buckets (universal, industry, client-specific, internal-only, experimental) and three customization tiers (no config, config-only, full fork). Team plan org-level skill provisioning is a major convenience — skills uploaded at the organization level propagate automatically to every team member.

**I03 adds automation.** With skills deployed, routines schedule them on a cadence. The core decision in I03 is Cowork scheduled tasks (Desktop, machine-awake required, local file access) versus Claude Code routines (cloud, machine-independent, webhook-triggerable, plan-dependent limits). For most clients, Cowork wins because their workflows target local files and their machines are awake during business hours.

**I04 connects Claude to the client's actual tools.** MCP connectors bring Gmail, Calendar, Drive, Ahrefs, Cloudinary, and whatever else the client uses into Claude's reach. The key tension: Anthropic-cloud MCPs must reach publicly-accessible services. For tools without public APIs or native MCP support (like HoneyBook), I04 includes a decision tree for whether to wait for support, build a custom connector, or route around via a proxy tool (Gmail notifications for HoneyBook inquiries, for example).

**I05 handles browser automation.** Claude in Chrome extends Claude's reach to web apps that don't have APIs. Chrome and Edge only (no Brave, Arc, Firefox, Safari). Pro plan is Haiku 4.5 only; Max/Team/Enterprise get full model choice. Hard rules: never banking, never payroll. "Ask before acting" is the default for the first 30 days.

**I06 is the technical-user escalation.** Most clients skip Claude Code entirely. For clients with a technical user, I06 walks through installation (native installer recommended, npm deprecated), CLAUDE.md placement at repo root, and separate provisioning for the Anthropic Console API with explicit spending caps.

**I07 covers the foundation governance layer.** Plan tier decision, seat roster, data retention posture, compliance triggers, offboarding plan. Enterprise compliance features (SCIM, audit logs, ZDR, 500K context) get evaluated against the client's actual requirements. My role in the client's account is Member, not Admin — I don't want ownership of their seat roster.

**I08 is personalization.** Four layers: Project Instructions (shared), Profile Preferences (per-user), Custom Styles (per-user, shareable via copy-paste), Memory (per-user). Memory enabled by default but with a three-question decision per user to opt out. Memory isolation: standalone chats and Project chats keep separate memory spaces.

**I09 is the artifact layer.** Free on every plan; persistent storage and MCP integration require paid plans. The single most common gotcha: persistent storage only works on published artifacts. Customer-facing artifacts get published and embedded; internal artifacts get org-shared; one-off analyses stay private. The 70% rule: artifacts get 70% of the way to a working app; production needs a real build.

## The Group B Walkthrough (Internal)

Group B specs are my internal operating system — the Claude environment that runs Upriver Consulting itself.

**I10 is my master Project.** `Upriver Consulting - Operating System` holds all 47 specs as knowledge. Knowledge base well into RAG mode (80+ files). Block D reference pointers in custom instructions are critical for routing queries to the right spec. This Project is for operating the consulting practice only — not for client work (that goes in each client's Project per I01), not for personal life (separate Projects or standalone chats).

**I11 organizes my skill library.** Five categories (Universal/Industry/Internal Builder/Client Fork/Experimental), folder structure with `clients/`, `_dev/`, `_retired/` subdirs, SKILL.md frontmatter standards, semver versioning, `skill-library-manifest.md` as single source of truth. Currently 13 active skills plus 4 Audrey's-specific forks.

**I12 defines my automation.** Eight active Cowork routines plus one Claude Code routine. Output directory convention in my Obsidian vault under `01-inbox/`, `10-content-pipeline/`, `20-client-work/`, `30-operations/`, `99-archive/`. The meta-routine (Monday 7:15am) watches all other routines for silent failures. Usage roughly 12-18% of Max plan weekly allocation.

**I13 documents my MCP stack.** Three tiers: built-in connectors (OAuth via Anthropic, cloud-side), custom connectors (remote Streamable HTTP), local STDIO (via JSON config). 15 Tier 1 connectors authorized; no Tier 2 active; minimal Tier 3 (Obsidian filesystem). 1Password is the canonical credential store. Per-conversation toggle discipline keeps the active set small.

**I14 integrates Obsidian.** Canonical vault structure with numeric-prefix folders, boundary rules for what goes in Obsidian versus Claude Projects versus client Projects, three access patterns (filesystem MCP, Project knowledge copy, manual paste), scoped write permissions for the filesystem MCP.

**I15 is the audit layer.** Weekly (15 min), monthly (45 min), quarterly (3-4 hrs personal + 30-60 min per client), on material change. Surfaces drift in all other specs before it compounds. Every finding leads to an action or an explicit defer with a date. Every audit produces a dated log file. Client audits produce a client-visible summary email that justifies the retainer.

## How the Three Suites Connect

The Infrastructure suite doesn't stand alone. It connects explicitly to the other two suites.

**Connections to the AI Operating System suite (Docs 01-18):**

- I01 loads all 18 AI Operating System docs into the client's Project as knowledge
- I02 deploys skills that invoke the 18 docs' contents (blog publisher pulls from Doc 01 voice, Doc 02 facts, Doc 06 SEO strategy)
- I03 routines reference specific docs by number in their prompts
- I04 MCPs connect Claude to the tools the 18 docs reference
- I09 artifact templates pull from the 18 docs for data and structure

The AI Operating System suite is the what; the Infrastructure suite is the how. You could in principle deliver the 18 AI Operating System docs as a standalone deliverable with no Infrastructure setup, but the system wouldn't be operationally live — it would be a document collection, not a working environment.

**Connections to the Content Production suite (Docs C01-C14, when drafted):**

- I02 deploys production-workflow skills that codify steps from the Content Production suite
- I03 routines automate recurring production touchpoints (weekly gallery review, monthly video audit)
- I14 Obsidian vault's `10-content-pipeline/` and `20-client-work/[client]/drafts/` folders hold production-in-progress content
- I13's Cloudinary, Mux, and Canva MCPs are the production toolchain backbone

The Content Production suite covers execution; the Infrastructure suite covers how Claude supports that execution.

## Who Uses This Suite

**Joshua (primary).** I author, maintain, and execute every spec. For my own environment (Group B), I'm the sole user. For client environments (Group A), I execute the spec and hand off the configured environment.

**Client team members (indirect).** They use the environment I configure but don't read the specs. I produce Loom walkthroughs and per-client reference docs that surface what they need to know.

**Subcontractors (future).** Annmarie (technical implementation), Louis (automation), Zach (specialty TBD), Megan (admin) — as they take on more of the work, parts of the audit cadence and setup workflow become delegable. I15 Section 8 defines the delegation path.

**Future co-principal (theoretical).** If the firm grows to two senior operators, the co-principal gets read and edit access to the Upriver Consulting Project per I10 Section 8. Subcontractors never do.

## Suite Maintenance

**Spec revisions.** When a spec changes materially, the draft gets edited in Obsidian (`~/Obsidian/40-specs-drafts/infrastructure/`), the polished version gets copied to `/mnt/project/`, and the Upriver Consulting Project knowledge base gets re-uploaded per I10. The quarterly audit per I15 forces a full suite review.

**New specs.** If the practice grows in ways that need new operational coverage, new specs get added. Candidates visible today: Content Production suite C01-C14, which is scoped separately; possibly a Subcontractor Operations spec covering how contractors work inside the system; possibly a Client Offboarding spec expanding what I07 touches.

**Deprecations.** If a spec becomes obsolete (Anthropic deprecates a feature, I retire a service line, a workflow moves entirely out of Claude), the spec gets marked deprecated rather than deleted. Deprecated specs live in the knowledge base with a frontmatter flag so historical queries can still surface them.

## What's Not in the Suite

Deliberate omissions worth noting:

**Client-specific content.** The specs are templates. Actual client content (Audrey's Brand Voice Guide, Audrey's pricing structure, Audrey's SEO strategy) lives in each client's Project per I01, not in this suite.

**Marketing copy.** How Upriver positions the consulting practice externally is in the practice's own AI Operating System docs (Docs 01, 02, 03, etc.) and in `consulting-website-content.md`, not in Infrastructure.

**Team management outside Claude.** HR, 1099 classification, payroll, subcontractor contracts — those live in my business operations layer, not here. `subcontractor-agreements.md` in the supporting reference docs covers the legal framework.

**Client sales and onboarding flow.** The sales process for bringing on a new client is in Doc 03 (Sales Process Map) of the AI Operating System suite. The Infrastructure specs pick up after a client has signed.

**Specific vendor choices.** Infrastructure specs name vendors when the choice is stable (Cloudinary for image assets, Mux for video, Ahrefs for SEO, 1Password for credentials). For vendor decisions that change or get evaluated per-client (CRM, email platform, booking system), the specs stay vendor-neutral and point at the evaluation elsewhere in the system.

## Suite Status as of April 22, 2026

**Drafted:** All 15 Infrastructure specs exist as complete drafts in `/home/claude/infrastructure-specs/` and `/mnt/user-data/outputs/`.

**Loaded into Upriver Consulting Project:** In progress. I10 through I15 are being uploaded as they're finalized.

**Cross-references validated:** Block D reference pointers in I10 mention I11 through I15 by number. Individual specs cross-reference each other (I09 references I07 for plan tier; I11 references I02 for deployment; I12 references I13 for MCPs; I15 references all prior 14). Any cross-reference drift gets caught in the first quarterly audit.

**First quarterly audit scheduled:** 2026-07-06. Will cover pilot audit of all 15 specs plus Audrey's client audit plus Q2 2026 Anthropic product change review.

**Content Production suite (C01-C14):** Not yet drafted. When written, the Content Production suite will parallel this one in structure and will cross-reference Infrastructure specs for any Claude-related setup (skills, routines, artifacts) that production workflows depend on.

**AI Operating System suite (Docs 01-18):** Complete and live in the Upriver Consulting Project as supporting reference docs (`/mnt/project/`). The 15 Infrastructure specs reference the 18 AI Operating System docs extensively; the reverse dependency is lighter (AI Operating System docs don't know about Infrastructure specs).

**Total spec count across three suites: 47 planned, 33 drafted (18 AI Operating System + 15 Infrastructure), 14 pending (Content Production).**

That completes the Claude Infrastructure specs suite, the I00 index, and the full Group A + Group B structure. The suite is ready to be loaded into the Upriver Consulting Project per I10 and tested against real use cases during the pilot quarterly audit in July.
