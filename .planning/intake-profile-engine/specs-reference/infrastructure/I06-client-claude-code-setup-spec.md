# Spec I06: Client Claude Code Setup Spec

## What This Spec Is

This spec defines when and how I set up Claude Code directly for a client versus keeping it as a Joshua-only tool. For most clients, Claude Code is not something they touch. They benefit from it indirectly because I use Claude Code to build their website, run audits, and deploy automations, but they never open a terminal themselves. For a specific subset of clients, giving them or their technical team member hands-on Claude Code access unlocks workflows the client-facing Claude interfaces can't reach.

This spec also covers the adjacent question of Claude API access via the Console. The API is a separate product with separate billing and is the right answer when a client needs Claude in an automation pipeline that isn't a routine, a custom application, or an internal tool built by the client's developer. Both Claude Code and API access carry more operational overhead than the client-facing surfaces in I01 through I05, which is why I'm deliberate about who gets them.

Without this spec, Claude Code access tends to be an afterthought: either no client gets it (and I miss cases where it would have been the right tool), or I set it up for every client and they never use it (which wastes setup time and leaves idle accounts). With this spec, Claude Code goes to the specific clients where it earns its seat at the table.

## Quick Reference

| Field | Value |
|---|---|
| Doc number | I06 |
| Priority | Low to medium; many clients won't need this at all |
| Total length target | Install walkthrough for 0-2 technical users per engagement; API provisioning decision for clients with automation pipelines |
| Time to produce | 30-45 minutes per technical user for Claude Code; 20-30 minutes for API key provisioning |
| Client time required | 15-20 minutes with each technical user for the install call |
| Delivery format | Working Claude Code install on the technical user's machine, a repo-level CLAUDE.md file, and if applicable, a provisioned API key with spending caps |
| File naming | `[client]-claude-code-setup.md` for setup notes; `CLAUDE.md` at the root of whichever repo the client works in |
| Prerequisite | I01 complete; decision on whether the client actually has a technical user who'd benefit |

## When This Document Gets Built

**Triggers:**

- Client has a technical collaborator on the team (developer, operations engineer, tech-savvy admin) who could run audits or execute workflows via terminal
- Client has committed to rebuilding their own website or running site updates themselves instead of routing every change through me
- Client needs programmatic Claude access for an automation that doesn't fit Cowork routines or cloud routines (e.g., custom event-driven pipelines, agentic workflows inside their own software, server-side batch jobs)
- The client is comfortable with a moderate learning curve and has budget for the increased usage Claude Code consumes

**Do not trigger (skip this spec entirely) when:**

- The client has no technical collaborator and no plans to hire one. Most of my clients are in this bucket. I stay on my Claude Code install for their work and don't provision one for them.
- The client's needs are covered by Projects, Skills, Cowork routines, and the Chrome extension. If I01 through I05 cover the work, there's no reason to add Claude Code.
- The client is on Pro plan and wants to use Claude Code for serious coding work. Pro plan limits get hit quickly under heavy Claude Code use. If they need Claude Code, recommend Max (or Team for multi-user access).

**Blocks:**

- Any engagement where the client has explicitly asked to run their own audits using my audit skills (I02 deployed `expert-audit` or `frontend-audit` via Claude Code)
- Any workflow that depends on API-level programmatic access that's not covered elsewhere

## Section-by-Section Template

### 1. The "Does This Client Need Claude Code?" Decision

For every engagement, I walk through this decision tree early so I'm not provisioning something that won't get used.

**Question 1: Does the client have a developer, ops engineer, or technical lead on their team?**

- No → Claude Code stays Joshua-only. Stop here.
- Yes → Continue.

**Question 2: Does that technical person have workflows they could run better from the terminal than from Claude.ai or Cowork?**

- No → Evaluate whether the client interfaces already in place (I01-I05) cover the work. Usually yes. Stop here.
- Yes → Continue.

**Question 3: Is the client on a plan that supports Claude Code use (Pro/Max/Team/Enterprise)?**

- No → Upgrade to Team or Max first, then proceed.
- Yes → Continue.

**Question 4: Is the technical user on macOS 13+ or a supported Linux distribution, or on Windows with WSL?**

- No → Flag the OS compatibility issue, delay until resolved.
- Yes → Proceed to install.

**Question 5: Does the client need Claude in a custom application or agentic pipeline that isn't covered by Cowork or Claude Code?**

- No → Claude Code alone is sufficient.
- Yes → Also provision API access via Console (Section 5 below).

### 2. Who Gets Access, and at What Level

Claude Code authenticates against the user's Claude account. There is no centralized "Claude Code account" layered on top. This matters because:

- On Pro plan, only that one user can use Claude Code with their subscription.
- On Max plan, one user with higher limits.
- On Team plan, each seat authenticates independently with their own Claude Code install.
- On Enterprise, same as Team but with admin controls.

For a client where only one technical user needs Claude Code, Pro or Max usually works for that user (Max if they'll use it heavily). For a client with multiple technical users who all need Claude Code, Team plan is required.

**My recommendation:** For technical users who'll use Claude Code for more than an hour a day, push Max. Pro plan quotas get consumed fast in agentic work, and hitting the 5-hour rolling window mid-task is disruptive.

### 3. Install Walkthrough

I do this on a shared screen with the technical user. Takes 20-30 minutes if nothing goes wrong.

**macOS (Apple Silicon or Intel, macOS 13+):**

1. Open Terminal.
2. Run the native installer:
   ```
   curl -fsSL https://claude.ai/install.sh | bash
   ```
3. When the install completes, open a new Terminal window (so the PATH refreshes) and run `claude --version` to confirm installation.
4. Run `claude` to authenticate. It opens a browser window. Sign in with the Anthropic account that matches the client's plan.
5. After auth, the terminal shows the Claude Code prompt. Run `/help` to confirm it works.
6. Run `claude doctor` to catch any environment issues.

**Windows (Windows 10 1809+ or Windows 11):**

1. Install WSL2 if not already installed. Open PowerShell as Admin, run `wsl --install`. Restart.
2. Open the WSL Ubuntu terminal.
3. Run the native installer inside WSL:
   ```
   curl -fsSL https://claude.ai/install.sh | bash
   ```
4. Same auth and verification steps as above.

**Why native installer, not npm:** The native installer is Anthropic's current default path. It bundles its own runtime, auto-updates in the background, and avoids the Node version and permission issues that the npm path creates. Unless the client's team has a specific reason to manage Claude Code through npm (CI/CD version pinning is the main one), I use the native installer.

**If the client's team standardizes on npm:** Use `npm install -g @anthropic-ai/claude-code` with Node 18+. Never use sudo; fix permissions via nvm or by changing the npm global directory. The npm method still works but is deprecated.

### 4. Repo-Level Configuration with CLAUDE.md

Claude Code reads a `CLAUDE.md` file at the root of whatever directory it's launched in. This file gives Claude Code persistent context about the project: the tech stack, conventions, available commands, and known pitfalls. It's the highest-leverage setup step after install.

For every repo a client's technical user will use Claude Code in, I create a CLAUDE.md with:

**Block 1: What this project is.** One paragraph. Tech stack, purpose, hosting.

**Block 2: Commands.** The commands that run in this project, each on its own line with a one-line description. Example:

```
- `npm run dev` — start the local dev server on port 3000
- `npm run build` — production build
- `npm run test` — run Vitest test suite
- `npm run lint` — ESLint + Prettier check
- `npm run typecheck` — TypeScript strict mode check
```

**Block 3: Architecture.** 5-10 bullet points. The framework, the database, the auth, the deployment target. Not a treatise, just enough for Claude Code to make sane decisions.

**Block 4: Conventions.** How this project writes code. Things like "server components by default," "no `any` types," "import paths use `@/` alias," "files over 400 lines should be split."

**Block 5: What to avoid.** Specific don'ts. "Don't suggest switching frameworks." "Don't install new dependencies without asking." "Don't modify the migrations folder; ask first."

I commit CLAUDE.md to the repo so the whole team (including me, when I work in the same repo) gets the same behavior.

### 5. API Access via Console (Separate Product)

If the client needs Claude inside their own software, automation pipeline, or custom tooling, that's the API layer, not Claude Code. This is provisioned separately through the Anthropic Console at console.anthropic.com.

**When to provision a Console account and API key:**

- The client is building a customer-facing feature that uses Claude (e.g., an intake form that uses Claude to produce recommendations)
- The client has an automation pipeline that runs outside Claude's own products (n8n, Zapier, custom server-side scripts, event-driven cloud functions) and that automation needs to call Claude
- The client needs Claude in a batch processing workload (nightly document classification, for example)
- Claude Code subscription quotas are insufficient and the client needs guaranteed, pay-as-you-go capacity

**Critical billing distinction.** The Anthropic Console is a separate billing product from Claude.ai subscriptions. A client's Pro or Team plan does not include any API credits. The API is pay-per-token; the client funds their Console balance directly. Pricing as of April 2026 is approximately $1/$5 per million tokens for Haiku 4.5, $3/$15 for Sonnet 4.6, and $5/$25 for Opus 4.6 (input/output). Opus 4.7 pricing should be verified at the time of provisioning.

**Who pays?** Two patterns:

1. **Client funds their own Console account.** Standard for anything production-facing. The client adds a payment method to their own Console, I help them configure the first key, the client owns the billing.
2. **I fund my Console and pass through.** Rare, used only for very short engagements or prototypes. Means I have their usage on my bill, which creates a reconciliation step. Avoid unless the engagement is scoped for exactly this.

**Provisioning workflow:**

1. Client creates a Console account at console.anthropic.com. This is a separate account from their Claude.ai subscription.
2. Client adds a payment method under Billing.
3. Client (with me on the screen) navigates to API Keys, clicks Create Key, names it by purpose (e.g., "production-inquiry-responder" or "development-testing").
4. Set a spending limit on the key. This is critical and often skipped. A leaked key with no spending cap has produced thousands of dollars of fraudulent usage for teams I know of. I recommend a monthly cap of 3-5x their expected usage as a safety margin.
5. Copy the key. The Console shows it only once. Immediately store in a password manager (1Password) or the client's secrets manager (AWS Secrets Manager, GCP Secret Manager, Vercel env vars, etc.).
6. Configure the client's application or automation to use the key via environment variable (`ANTHROPIC_API_KEY`). Never put it in source code or commit to a repo.

**Rate limits and tier progression.** New Console accounts start at Tier 1 with modest rate limits. As the account accumulates spend, tiers increase automatically. If the client hits rate limits in production, we can request a tier bump through the Console.

**Key rotation.** For any production workload, API keys rotate quarterly (per the audit cadence in I15). The process: create a new key, update the secrets store, verify the new key works, revoke the old key. I coordinate this with the client's technical user.

### 6. MCP Servers Inside Claude Code

Claude Code supports MCP servers too, configured via `.mcp.json` at the project root or `claude mcp add` from the CLI. When a client uses Claude Code against their own codebase, I often configure the same MCPs they have in their Claude.ai environment (from I04) so the Claude Code context matches the Claude.ai context.

Common Claude Code MCPs I set up for clients:

- **GitHub MCP** (via `claude mcp add github ...`) for working with their repo directly from Claude Code
- **Supabase MCP** for clients with a Supabase database (Audrey's, the Upriver site, several engagement backends)
- **Vercel MCP** for deployment verification
- **Their Ahrefs, Cloudinary, etc. MCPs** mirrored from their Claude.ai setup where relevant

### 7. Skills in Claude Code

Skills deployed in the client's Claude.ai account don't automatically transfer to their Claude Code install. Claude Code has its own skills directory at `~/.claude/skills/` for user-level skills and `.claude/skills/` inside a project for project-level skills.

For technical users, I typically deploy:

- The client-specific audit skills from I02 (if the technical user will run audits themselves)
- Any custom skills built for their domain that make sense in a terminal context
- Commonly: `expert-audit`, `frontend-audit`, `backend-audit` as project-level skills in the repo, so the client's team can run `/expert-audit` or `/frontend-audit` against their own code

Installation: clone or copy the skill folder into `~/.claude/skills/[skill-name]/` for personal scope, or `.claude/skills/[skill-name]/` inside the repo for project scope.

### 8. The Claude Code Reference Document

For clients with Claude Code, I produce a reference doc in the Project knowledge base covering:

- Who has Claude Code installed (name, machine, install date)
- The CLAUDE.md locations (which repos)
- MCP servers configured
- Skills installed (user scope and project scope)
- Which API keys exist, what they're for, spending limits, next rotation date
- Common commands the client's technical user should know (`/status`, `/model`, `claude doctor`, `claude mcp list`)
- The link to Anthropic's docs for when they want to go deeper

## How to Build This Document

**Step 1: Walk the decision tree (5-10 minutes).** Usually on the kickoff call or shortly after. Many engagements end at Question 1 with "no technical user," in which case I document "not applicable, I11 covers my own Claude Code setup" and move on.

**Step 2: Confirm plan and OS (2 minutes).** Match the technical user's situation against requirements.

**Step 3: Install call (20-30 minutes shared screen).** Install, auth, verify, run `claude doctor`.

**Step 4: Create CLAUDE.md (20-30 minutes).** Author the five-block file for the primary repo the user will work in. Commit to the repo.

**Step 5: Configure MCPs in Claude Code (10-15 minutes).** Mirror relevant MCPs from their Claude.ai setup.

**Step 6: Install skills as needed (10 minutes per skill).** User-scope vs. project-scope placement.

**Step 7: If applicable, provision API access (20-30 minutes).** Create Console account, add payment, create first key with spending cap, store in secrets manager, configure in application or automation.

**Step 8: Produce the reference doc (15 minutes).** Upload to the client's Project knowledge base.

**Step 9: Update client-tracker.**

## Definition of Done

- [ ] The decision tree has been walked and the outcome documented (either "skipped, not applicable" or a specific user and setup plan)
- [ ] If applicable: Claude Code is installed, authenticated, and `claude doctor` passes clean on the technical user's machine
- [ ] CLAUDE.md exists at the root of any repo the technical user will use Claude Code in
- [ ] Relevant MCPs are configured in Claude Code for the user
- [ ] Skills are installed at appropriate scope (user or project)
- [ ] If applicable: Console account created, payment method added, at least one API key created with a spending cap
- [ ] API key is stored in a secrets manager, never in source
- [ ] Claude Code reference doc uploaded to the Project knowledge base
- [ ] Client-tracker reflects Claude Code users, their machines, plan coverage, API keys (names and spending caps only, never values), and next rotation date
- [ ] Technical user has run at least one real command (`/status`, `/help`, or a real task) on the install call

## Common Failure Modes

**Failure 1: Provisioning Claude Code for a client with no technical user "in case they need it."** The install sits idle, the CLAUDE.md goes stale, and nobody benefits. I skip unless there's a specific person who will use it.

**Failure 2: Installing on Pro plan for heavy Claude Code use.** Pro plan quotas get consumed quickly under sustained Claude Code work, and hitting limits mid-task is disruptive. For anyone doing real development work, Max is the floor.

**Failure 3: Using `sudo npm install -g` to install via npm.** Creates permission problems that outlive the engagement. If npm is required, fix the permissions with nvm or by changing the npm global directory. Native installer avoids this entirely.

**Failure 4: Skipping the CLAUDE.md step.** Claude Code without a CLAUDE.md produces generic output for the client's specific codebase. Ten minutes of CLAUDE.md authoring saves hours of correction later.

**Failure 5: Creating an API key with no spending cap.** A leaked or misconfigured key can generate thousands of dollars of charges in hours. Every key gets a spending cap at creation time, no exceptions.

**Failure 6: Assuming a Claude.ai subscription covers API usage.** It does not. Console is a separate billing product. If I don't make this explicit to the client before they start building against the API, the first bill is a surprise. I always show them the pricing page and a projected monthly cost before provisioning the key.

**Failure 7: Committing API keys to repos.** Even to private repos. I configure keys via environment variables or secrets managers from day one and check `.gitignore` covers `.env` files before any commit.

**Failure 8: Mirroring every Claude.ai MCP into Claude Code reflexively.** Not every MCP makes sense in Claude Code. Gmail, Calendar, and Canva belong in Claude.ai; GitHub, Supabase, and Vercel belong in Claude Code. I match MCPs to where the technical user will actually use them.

## Full Worked Example: Audrey's Farmhouse

**Decision tree outcome:** Skipped for the current engagement phase.

**Reasoning:**
- Question 1: Does Audrey's have a developer on their team? No. All four team members (owner, GM, marketing, operations) are non-technical.
- Question 2: Are there terminal-based workflows they'd run? No. Their needs are covered by Projects (I01), Skills (I02), Cowork routines (I03), MCPs (I04), and Chrome (I05).
- Conclusion: Claude Code stays Joshua-only for their engagement. I use Claude Code heavily against their site rebuild (documented in my own I11 Personal Skills Architecture), but they never open a terminal.

**API access decision:** Also skipped for now. Their automations run in Cowork and don't need programmatic API calls. If the lead gen pipeline (currently in design with Louis) ends up using Claude API directly for email opener generation, we'll revisit and provision an API key for their n8n workflow. That's noted in the client-tracker as a future trigger.

**Client-tracker entry:**

```
Claude Code: Not provisioned (no technical user)
API access: Not provisioned (no current pipeline requirement)
Revisit triggers:
  - If Audrey's hires a developer or ops engineer
  - If the lead gen n8n workflow requires direct API calls
  - If Audrey's wants to run audits themselves instead of routing through me
Next review: 2026-07-22 (quarterly per I15)
```

**Alternative worked example (hypothetical different client):** A professional services firm with a part-time developer who maintains their marketing site and internal tools.

- Question 1: Yes, has a developer.
- Question 2: Yes, she runs her own deployments and would benefit from Claude Code in her Next.js repo.
- Question 3: Firm is on Team plan.
- Question 4: Developer is on macOS 14.

**Proceed with install:**

- Native installer run on her MacBook.
- CLAUDE.md committed to the firm's Next.js repo with their stack, conventions, and "don't switch frameworks" guardrails.
- MCPs configured: GitHub, Supabase, Vercel (all mirrored from her Claude.ai connectors).
- Skills installed at project scope: `frontend-audit`, `backend-audit` in the repo so anyone with Claude Code who clones the repo inherits them.
- API key not needed (her Claude Code use is for her own development, not for production automation).

**Reference doc uploaded.** Client-tracker shows her as the sole Claude Code user for that engagement, with install date and next quarterly review.

That's I06 complete. Ready to produce I07 when you say continue.
