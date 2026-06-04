# Spec I13: My MCP Server Stack Spec

## What This Spec Is

This spec documents my personal MCP (Model Context Protocol) server configuration: every connector and local server I have wired into my Claude environment, why each one is there, how credentials are managed, and what the rotation and audit cadence looks like. MCPs are the single most powerful expansion of Claude's reach because they let Claude actually act on the systems where my work lives, not just talk about them. They're also the single most dangerous expansion because each MCP carries its own access scope and credential lifecycle, and a stale or over-permissioned MCP is a real security risk.

I04 covers MCP setup for clients. This spec covers mine. The two are different in three important ways. First, my stack is bigger because it spans multiple business surfaces (joshuabrownphotography.com, Upriver Consulting, my own personal life via Function Health and Era). Second, my credential discipline has to be tighter because my stack has access to multiple clients' connected accounts in some cases. Third, my MCPs work across multiple Claude surfaces (claude.ai, Claude Desktop, Claude Code, Cowork) with different configuration mechanisms for each, and I need a clear map of which lives where.

The two-tier model: built-in connectors authenticated via OAuth in claude.ai for cloud-side use, and local STDIO MCP servers configured via `claude_desktop_config.json` for Claude Desktop and `~/.claude.json` for Claude Code. Custom Connectors (remote MCP servers I configure via Settings > Connectors) live in a third category. Each tier has its own auth pattern and rotation cadence.

## Quick Reference

| Field | Value |
|---|---|
| Doc number | I13 |
| Priority | High, build after I10 |
| Total length target | Documented MCP stack with credential management plan and rotation schedule |
| Time to produce | 2-3 hours for initial inventory and documentation; 30 minutes per new MCP added going forward |
| Delivery format | Live MCP configurations across claude.ai, Desktop, and Code, plus `my-mcp-stack.md` reference doc |
| File naming | `my-mcp-stack.md` in the Upriver Consulting Project knowledge base; configs live in their respective system locations |
| Prerequisite | I10 (Upriver Consulting Project exists), 1Password installed and operational |

## When This Document Gets Built

**Triggers:**

- I have more than 5 MCP connectors and have lost track of which is configured where
- I'm preparing to add a new connector and want to follow a documented pattern
- I need to do a credential rotation and want to know what to rotate
- I'm onboarding a subcontractor or future partner who needs to understand the stack

**Blocks:**

- Most of my routines from I12 depend on specific MCPs being available
- Client work depends on me being able to reliably operate the connectors that the engagement uses
- Quarterly audit per I15 needs an MCP inventory to audit against

## Section-by-Section Template

### 1. The Three MCP Tiers

**Tier 1: Built-in connectors via claude.ai.** These are Anthropic-managed integrations I authorize via Settings > Connectors. They run in Anthropic's cloud, use OAuth tokens stored in my Anthropic account, and are available across claude.ai web, Claude Desktop, and Claude mobile. Per-conversation toggles control which are active. Examples in my stack: Google Drive, Gmail, Google Calendar, Canva, Cloudinary, Vercel, Supabase, Granola, Cloudflare Developer Platform, Ahrefs, Zoom, Tally, Mux, Era, Function Health.

**Tier 2: Custom Connectors via Settings > Connectors > Add Custom Connector.** Remote MCP servers (anyone can run them) that I add to my Anthropic account. Use Streamable HTTP transport with OAuth. Available on Pro, Max, Team, Enterprise. Currently I don't run any custom connectors but it's an open option for things like a custom PostHog analytics MCP or anything self-hosted that I might want Claude to reach. Configuration lives in my Anthropic account, not on my workstation.

**Tier 3: Local STDIO MCP servers via JSON config.** These run as subprocesses on my MacBook, configured per-application:

- Claude Desktop: `~/Library/Application Support/Claude/claude_desktop_config.json`
- Claude Code: `~/.claude.json` (project-scoped) or via `claude mcp add` commands

These give Claude access to my local filesystem, local databases, local development tools. Examples: filesystem MCP for my Obsidian vault, custom MCPs I might write for specific local tooling.

**Why the tier distinction matters.** A connector authorized in Anthropic cloud (Tier 1) is available everywhere I'm logged in. A local STDIO server (Tier 3) is only available on the workstation where the JSON config lives. Custom Connectors (Tier 2) sit in between: stored in my Anthropic account but pointing at remote servers I or someone else hosts.

### 2. Active Stack Inventory

**Tier 1 connectors active in my Anthropic account:**

- *Google Drive* — Document storage; pulls from my consulting Drive folder, and from each client's Drive when granted. Foundation connector.
- *Gmail* — Inbox triage, draft generation, search across email history. Used by morning brief routine and client follow-up workflows.
- *Google Calendar* — Schedule visibility, event creation. Used by morning brief and Monday planning routines.
- *Canva* — Brand asset access for design work; used when generating deliverables that need visual polish.
- *Cloudinary* — Image asset management for joshuabrownphotography.com and client sites.
- *Vercel* — Deployment status, project listing, deployment logs. Used during app-deploy skill workflows.
- *Supabase* — Database queries against my Supabase projects (read-only token); used for analytics queries against site backends.
- *Granola* — Meeting note retrieval for context loading after sales calls.
- *Cloudflare Developer Platform* — DNS, Workers, Pages context for sites I host on Cloudflare.
- *Ahrefs* — SEO data: keyword positions, backlinks, organic traffic estimates. Used heavily by content engine routines.
- *Zoom for Claude* — Meeting recording retrieval, transcript access. Used for client call summarization.
- *Tally.so* — Form submission data; used for inquiries from my own consulting site.
- *Mux* — Video asset management for embedded videos on joshuabrownphotography.com and client sites.
- *Era* — Personal financial context; bank account, transaction, and spending data. Used by monthly business review routine.
- *Function Health* — Personal health data. Personal-use only; no business application.

**Tier 2 custom connectors:** None active.

**Tier 3 local STDIO servers:** Currently minimal; primarily filesystem access for my Obsidian vault, configured in Claude Desktop. Any custom local MCPs I write for `jbp` CLI integration would land here.

### 3. Per-MCP Documentation Format

Each connector in my stack gets a documentation entry:

```markdown
### [Connector Name]

**Tier:** 1 (built-in) | 2 (custom) | 3 (local STDIO)
**Purpose:** [one-sentence reason it's in the stack]
**Connected to:** [which account/workspace/project]
**Auth method:** OAuth via Anthropic | API token in 1Password | Service account
**Credential location:** [where the credential is stored]
**Last authenticated:** [date]
**Next rotation:** [date]
**Used by routines:** [list from I12]
**Used by skills:** [list from I11]
**Used by clients:** [list of client engagements that use this connector]
**Personal-only or shareable:** Personal-only | Could be shared with team | Shared
**Failure signal:** [what I'd see if this MCP broke]
**Notes:** [anything else worth knowing]
```

### 4. Credential Management with 1Password

I use 1Password as the canonical credential store for everything. The pattern depends on which tier the credential applies to.

**Tier 1 credentials.** Anthropic manages the OAuth tokens; I never see or store them. My only credential responsibility is the underlying account passwords (Google, Cloudinary, Vercel, etc.), which all live in 1Password. When OAuth expires or scopes change, I re-authenticate through Anthropic Settings > Connectors and that's it.

**Tier 2 custom connector credentials.** Service account tokens for any custom connector go in 1Password. I never paste them directly into the connector config; I either let Anthropic handle the OAuth flow or use 1Password CLI (`op run`) to inject the token at configuration time. If I'm not running custom connectors today, this is a future-state pattern.

**Tier 3 local STDIO credentials.** These are the riskiest because the credential ends up in `claude_desktop_config.json` (or `~/.claude.json`), which is plaintext on disk. The mitigation patterns:

- Never commit these files to source control
- Use `op run` wrapper scripts to inject credentials from 1Password at runtime instead of hardcoding
- Set restrictive file permissions on the config files (`chmod 600`)
- Audit quarterly that no credentials have leaked into committed files

**Service account tokens specifically for 1Password MCP.** The `OP_SERVICE_ACCOUNT_TOKEN` referenced in the 1Password MCP configuration is itself stored as an environment variable, not in the JSON config. My shell profile loads it from a local-only file that's never committed.

### 5. Adding a New MCP

The workflow when I want to add a new connector:

**Step 1: Decide the tier (5 minutes).** Built-in available? Use it (Tier 1). Need custom remote? Tier 2. Need local-only access? Tier 3.

**Step 2: Authorize and authenticate (5-10 minutes).** Tier 1: Settings > Connectors > Connect. Tier 2: Add Custom Connector. Tier 3: Edit JSON config, restart Claude Desktop or Claude Code.

**Step 3: Test the connection (5 minutes).** Run a real operation: search Drive, send a calendar event, query a Supabase table. Confirm it works.

**Step 4: Per-conversation toggle posture.** Decide whether the connector should be on by default in the Upriver Consulting Project, off by default, or only manually invoked. Most of mine are off by default and I toggle on per-conversation when I need them, to keep context windows clean.

**Step 5: Document (5 minutes).** Add the spec block to `my-mcp-stack.md`. Include rotation date.

**Step 6: Update routines and skills that should now use this connector.** If the connector enables a new routine or makes an existing one better, that's a follow-on task in I12 and I11.

### 6. Rotation and Audit Cadence

**OAuth tokens (Tier 1).** Most refresh automatically. I re-authenticate manually only when a connector starts failing or when a service forces a re-auth (typically every 6-12 months depending on the service's policy).

**API tokens (Tier 2 custom connectors and Tier 3 local STDIO with API tokens).** Rotated every 90 days as a baseline. Any token I store in 1Password has a rotation date set in the 1Password item. When the date hits, I generate a new token in the source service, update 1Password, restart any local servers using the token. For OAuth-based connectors this is automatic; for API-token connectors this is a calendar item.

**Service account tokens (specifically 1Password MCP, etc.).** Rotated every 180 days because they're more disruptive to rotate (they unlock other credentials). Tracked separately in 1Password.

**Audit cadence (per I15).** Quarterly:

- Walk through every connector in my Anthropic account; remove any that haven't been used in 90 days
- Review every credential's last rotation date
- Confirm no credentials have leaked into committed files (grep for known token patterns in repos)
- Confirm `claude_desktop_config.json` and `~/.claude.json` haven't grown unexpectedly
- Test each active connector with a real query to confirm it still works

### 7. Per-Conversation Toggle Discipline

Even with 15+ Tier 1 connectors authorized, I don't have all of them on at once in every conversation. The toggle bar at the bottom of each Claude conversation shows which are active for that conversation; I select per-task.

**Default-on for every conversation in the Upriver Consulting Project:**

- Google Drive
- Gmail
- Google Calendar

**Toggled on as needed:**

- Ahrefs (when working on SEO)
- Cloudinary (when working with images)
- Vercel + Cloudflare (when deploying or debugging)
- Supabase (when querying client backends)
- Granola + Zoom (when summarizing meetings)
- Era (when doing financial review)

**Default-off, manual toggle only:**

- Function Health (no business application)
- Mux, Tally, Canva (specific use cases only)

The reason for this discipline: each active connector adds context window usage and tool-selection ambiguity. Fewer active connectors per conversation = better tool routing decisions by Claude.

### 8. Cross-Surface Behavior

**claude.ai (web and mobile).** All Tier 1 connectors available. No local Tier 3 servers.

**Claude Desktop.** All Tier 1 connectors available (synced from my Anthropic account). Plus Tier 3 servers configured in `claude_desktop_config.json`.

**Claude Code.** Tier 1 connectors are available via the same OAuth account. Tier 3 servers configured separately in `~/.claude.json` or via `claude mcp add` commands. Project-scoped MCPs can be configured per repository.

**Cowork.** Inherits the active Anthropic account's Tier 1 connectors. Routines that fire on a schedule pick up whatever's authorized in my Anthropic account at the time.

**The risk to manage.** A Tier 1 connector revoked at the Anthropic account level immediately disappears from every surface. A Tier 3 connector edited in `claude_desktop_config.json` only affects Claude Desktop on that machine. When I make a change, I'm explicit about which surface I'm changing.

## How to Build This Document

**Step 1: Inventory what's currently active (30 minutes).** Open Settings > Connectors in claude.ai. List every authorized connector. Open `claude_desktop_config.json`. List every local STDIO server. Confirm last-used dates where possible.

**Step 2: Map each connector to purpose (15 minutes).** For each, write a one-sentence "why is this here?" If I can't articulate it, it's a candidate for removal.

**Step 3: Document credential location for each (15-20 minutes).** Where is each credential stored? If anything is stored only in `claude_desktop_config.json` and not also in 1Password, fix that.

**Step 4: Set rotation dates (10 minutes).** For every API token, calendar a rotation date in 1Password. For OAuth, no action needed except awareness.

**Step 5: Document per-conversation toggle posture (10 minutes).** Which connectors are default-on, which are toggled per conversation, which are default-off.

**Step 6: Build the spec doc (45 minutes).** Populate `my-mcp-stack.md` with all entries.

**Step 7: Upload to the Upriver Consulting Project (2 minutes).**

**Step 8: Add the quarterly audit reminder.**

## Definition of Done

- [ ] Every connector active in my Anthropic account has a documented purpose
- [ ] Every Tier 3 local STDIO server is documented and uses 1Password for credential injection (no plaintext credentials in config)
- [ ] Rotation dates are set in 1Password for every API token
- [ ] `my-mcp-stack.md` reference doc is current and uploaded to the Upriver Consulting Project
- [ ] Per-conversation toggle defaults are set in the Project (default-on connectors stay on)
- [ ] Quarterly audit reminder is on my calendar
- [ ] No connectors authorized that I haven't used in 90 days

## Common Failure Modes

**Failure 1: Plaintext API keys in JSON configs.** A credential lives only in `claude_desktop_config.json`, which sits in my home directory unencrypted. If the file leaks (cloud backup, accidental commit, screen share), the credential is exposed. Fix: every credential goes in 1Password first; the JSON config either references it via environment variable or uses an `op run` wrapper.

**Failure 2: Stale connectors.** I authorize a connector, use it for a project, never use it again, and it sits authorized for years. Each stale connector is a potential exposure point. Quarterly audit removes anything not used in 90 days.

**Failure 3: Over-permissioned scopes.** When authorizing a Tier 1 connector, I sometimes grant broader scopes than needed because it's faster. Example: granting Gmail full-access scope when I only need read access for a specific routine. Fix: review scopes during authorization; pick the narrowest scope that works.

**Failure 4: Forgetting that connectors persist across surfaces.** I authorize Cloudinary in claude.ai for a specific project, then it's available everywhere I'm logged in including from Cowork routines I might not have considered. Default-on/default-off discipline at the Project level mitigates this.

**Failure 5: Shared client credentials.** A client gives me access to their Cloudinary or Vercel via shared credentials. Those credentials shouldn't go in my MCP stack; the client should authorize their own MCP from their account per I04. If I genuinely need access for a one-off task, I use the credentials from a separate session or workstation, never wire them into my permanent stack.

**Failure 6: Custom Connectors with weak auth.** If I add a Tier 2 custom connector pointing at a self-hosted server, that server's auth is my responsibility. I don't add custom connectors casually; each one gets its own security review.

**Failure 7: SSE-transport servers becoming deprecated.** Anthropic's transport standard moved to Streamable HTTP. Older SSE-only MCP servers will eventually stop working. When I add a Tier 2 connector, I confirm it uses Streamable HTTP.

**Failure 8: Too many active connectors degrading tool selection.** With 15+ connectors authorized and all active in a conversation, Claude has to pick the right tool from a long list and sometimes picks wrong. Per-conversation toggle discipline keeps the active set small.

**Failure 9: 1Password service account tokens leaking.** The `OP_SERVICE_ACCOUNT_TOKEN` itself is high-value because it unlocks every other credential. It lives in a local-only environment file with restrictive permissions, never in any committed file, and gets rotated every 180 days.

## Full Worked Example: My Current MCP Stack (April 2026)

**Tier 1 connectors authorized (15):**

```markdown
### Google Drive
- Tier: 1
- Purpose: Document storage and retrieval for Upriver Consulting work
- Connected to: joshua@upriverhv.com Google Workspace
- Auth: OAuth via Anthropic
- Credential location: Google account password in 1Password
- Last authenticated: 2026-02-14
- Next rotation: re-auth on demand only
- Used by routines: morning briefing, weekly client tracker refresh, monthly business review
- Used by skills: blog-post-publisher, vendor-content-writer, venue-content-writer
- Used by clients: yes — Audrey's Farmhouse (separately authorized in their account per I04)
- Personal-only or shareable: my Drive only; clients have their own Drive connectors
- Failure signal: routines that try to read from `~/Drive/Upriver/` would error
- Notes: default-on in every Upriver Consulting Project conversation

### Gmail
- Tier: 1
- Purpose: Inbox triage and morning brief data source
- [...continue same format for remaining 14 connectors]
```

**Tier 2 custom connectors:** None active. Open option for future state if I build a self-hosted analytics MCP or similar.

**Tier 3 local STDIO servers (active in Claude Desktop):**

- *Filesystem MCP* pointing at `~/Obsidian/` (read+write). Configured in `~/Library/Application Support/Claude/claude_desktop_config.json`. No credentials needed; just path access.

**Tier 3 local STDIO servers (configured in Claude Code, project-scoped):**

- Per-project as needed; nothing global.

**Default toggle posture in Upriver Consulting Project:**

- Always on: Google Drive, Gmail, Google Calendar
- Frequently toggled on: Ahrefs, Cloudinary, Vercel, Cloudflare
- Occasionally toggled on: Supabase, Granola, Zoom, Mux, Tally, Canva, Era
- Always off (no business use): Function Health

**Credential audit:**

- All Google account passwords in 1Password (rotation: when forced, OAuth tokens auto-refresh)
- Cloudinary, Vercel, Cloudflare, Mux, Ahrefs, Tally, Era, Granola, Function Health, Zoom — all account credentials in 1Password (OAuth via Anthropic, no exposed API tokens)
- Supabase — read-only token in 1Password, rotated every 90 days (next: 2026-07-22)
- 1Password service account token — environment variable in local-only `~/.config/op/.env`, file permissions 600, rotated every 180 days (next: 2026-10-22)

**Quarterly audit (next: 2026-07-22 per I15):**

- Walk every connector authorization
- Remove any unused in past 90 days
- Confirm rotation dates current
- Grep public repos for accidental credential commits
- Test each active connector with a live query

**Open items:**

- Decide whether to add a custom PostHog MCP (Tier 2) for analytics on Upriver site; deferred until I'm actually using PostHog
- Build first proper local STDIO server for `jbp` CLI integration (Tier 3); part of I14 work
- Evaluate whether Function Health should stay in the stack at all; it's personal not business; might move it to a separate Anthropic account or remove

That's I13 complete. Ready to produce I14 when you say continue.
