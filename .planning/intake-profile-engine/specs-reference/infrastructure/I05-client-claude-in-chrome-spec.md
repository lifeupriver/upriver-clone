# Spec I05: Client Claude in Chrome Setup Spec

## What This Spec Is

This spec defines how I set up Claude in Chrome for a client so they can use Claude directly inside the browser for tasks that live on the web: navigating vendor sites, filling forms, extracting data from dashboards, drafting replies inside webmail, and reading pages while asking Claude about what's on screen. Claude in Chrome is a beta browser extension that Anthropic ships on all paid plans. It works on Google Chrome and Microsoft Edge only (not Brave, Arc, Firefox, or mobile). It runs alongside Claude Desktop (Cowork) and inside Claude Code as a connector, but for most of my clients, Chrome is the front door to Claude on the web.

Without this spec, some clients install the extension and never use it, others install it and grant it permissions they shouldn't, and a third group never installs it at all because nobody walked them through it. With this spec, every client who'd benefit from browser-side Claude gets a proper setup, a shortlist of workflows matched to their archetype, and a clear safety envelope around what Claude can and can't do on their behalf.

I also cover Claude in Excel briefly at the end because for operations-heavy clients (professional services, any client with real financial modeling), the Excel add-in solves problems the Chrome extension can't. Claude in Excel is a separate add-in installed through Microsoft AppSource, and it shares skills and connectors with the rest of the Claude stack. When a client's work is spreadsheet-centric, Excel matters more than Chrome.

## Quick Reference

| Field | Value |
|---|---|
| Doc number | I05 |
| Priority | Medium-high, build after I04 |
| Total length target | One installed extension per user plus 3-5 workflow shortcuts customized per client |
| Time to produce | 45-60 minutes per client including per-user install walkthrough |
| Client time required | 15-20 minutes per user (install, grant permissions, test a workflow) |
| Delivery format | Installed and configured extension(s), a browser-workflow reference sheet, a short Loom |
| File naming | `[client]-browser-workflows.md` in the Project knowledge base |
| Prerequisite | I01 (Project exists), I04 (MCPs connected if browser workflows depend on them) |

## When This Document Gets Built

**Triggers:**

- Client has identified workflows that live primarily in the browser (vendor portals, CMS logins, web-based dashboards, webmail, scheduling tools)
- Client's team is on Chrome or Edge; no one is exclusively on Safari, Firefox, Brave, or Arc
- Client is on a paid plan (Chrome extension requires Pro, Max, Team, or Enterprise)
- For spreadsheet-heavy clients, Claude in Excel setup is also triggered here

**Blocks:**

- Any deliverable or routine that depends on browser-side action (scheduled workflow that fills a form, a skill that extracts data from a web dashboard)
- Client training materials that show "how you'll actually use Claude day-to-day" are incomplete without the Chrome piece

**Skip conditions:**

- Client uses Safari or a non-supported browser exclusively. I document this and note it for the quarterly audit; when Safari support ships (if it does), I revisit.
- Client's workflow is 100% in desktop apps and has no browser component worth automating. Rare but it happens for some back-office operations clients.

## Section-by-Section Template

### 1. Browser Compatibility Check

Before I schedule any setup work, I confirm the browser environment:

- **Supported:** Google Chrome, Microsoft Edge
- **Not supported:** Brave, Arc, Firefox, Safari, Opera, Vivaldi, any mobile browser

If the client's team uses a non-supported browser as their primary, I either help them transition their Claude work to a secondary Chrome or Edge install, or I skip this spec for that user entirely. I don't ask clients to change their primary browser; I work around their reality.

### 2. Permissions and Safety Envelope

Claude in Chrome can read full page content, click buttons, fill forms, switch tabs, and take actions on the user's behalf. This is powerful and requires a deliberate safety envelope.

**Hard rules I set with every client before anything gets installed:**

- Never grant Chrome extension permission to sites that handle banking, payroll, or direct financial transactions. The client reviews permission lists per-site and declines these explicitly.
- Never let Claude complete purchase transactions or payment entries on their behalf.
- Always require human confirmation for any action that sends an email, publishes content, or submits a form tied to external parties (leads, customers, vendors).
- Use "Ask before acting" mode by default for the first month so the client sees every action Claude proposes and approves or rejects it. After a month of clean use on specific shortcuts, the client can elect to move high-trust workflows to autonomous mode.
- If a site contains unexpected instructions targeting the AI (prompt injection), pause and investigate. Document any suspicious behavior and flag to me.

**Site-level permission management.** Permissions are inherited from Chrome extension settings. I walk each user through chrome://extensions, open the Claude settings, and explicitly set per-site permissions. For each client archetype I have a recommended allowlist so the client isn't starting from zero.

### 3. Recommended Site Allowlists by Archetype

**Wedding venue archetype:**

- HoneyBook (inquiry review and response drafting, no auto-send)
- Google Business Profile (manual post review)
- The Knot and WeddingWire vendor dashboards (review-only, no edits)
- Instagram Business suite (draft review, no publish)
- Cloudinary dashboard (asset review)
- Google Workspace suite (Gmail, Drive, Calendar)

**Contractor / home services:**

- Their CRM (JobNimbus, JobTread, Housecall Pro) for lead review
- Google Business Profile
- Yelp for review monitoring
- Google Ads dashboard for pull-only review
- Google Workspace

**Preschool / childcare:**

- Their enrollment system for pipeline review
- Their parent-communication tool (Brightwheel, Procare) for message review
- Google Workspace

**Restaurant:**

- OpenTable dashboard for reservation pattern review
- Yelp and Google Business Profile
- Their POS admin (read-only)
- Google Workspace

**Professional services:**

- CRM (HubSpot, Salesforce, Pipedrive)
- LinkedIn Sales Navigator (for research, not outbound)
- Google Workspace or Microsoft 365

### 4. Recommended Workflow Shortcuts by Archetype

Claude in Chrome supports recorded workflows (teach Claude a sequence by doing it once, then let Claude repeat it). For each client, I record 3-5 shortcuts that match their highest-value repeated browser tasks.

**Wedding venue archetype (Audrey's Farmhouse pattern):**

1. *Inquiry triage.* Claude opens HoneyBook, reviews the list of new inquiries, opens each one, pulls key details (date, guest count, event type, source), and produces a prioritized summary in a sidebar draft.
2. *GBP post publish.* After the weekly GBP draft routine produces three posts, the marketing lead opens GBP and uses a Chrome shortcut where Claude loads each draft into the post editor and pauses for human review before publishing.
3. *Social asset pull.* Claude opens Cloudinary, searches by tag or folder, and lists matching asset IDs into a sidebar note the marketing lead can paste into a post.
4. *Review response.* Claude opens Google Business Profile reviews tab, reads any new review, drafts a response in the sidebar using the voice guide, and pauses for human publish.

**Contractor / home services:**

1. Lead intake from CRM
2. Photo upload and tagging workflow for completed jobs
3. Review response drafting on Google and Yelp

**Preschool / childcare:**

1. Parent-message triage
2. Waitlist conversion workflow
3. Newsletter asset pull

**Restaurant:**

1. OpenTable pattern review
2. Review response drafting
3. Menu update cross-posting

**Professional services:**

1. CRM pipeline review
2. LinkedIn profile research for prospects
3. Proposal assembly from templates

### 5. Installation and Setup Mechanics

**For each user who needs Chrome Claude:**

1. Visit the Chrome Web Store, search for "Claude." The official extension is published by Anthropic and is named "Claude" in the store.
2. Click "Add to Chrome." Approve the extension permissions screen.
3. Sign in with the user's Claude account credentials.
4. Click the puzzle piece in the toolbar and pin the extension.
5. Open any tab and click the Claude icon to open the side panel. Confirm it loads.
6. Walk through the permissions flow. I ask the user to deny "all sites" as the default and only grant on a per-site basis.
7. Visit the first allowlist site and grant permission when prompted.
8. Run a test prompt: "What's on this page?" Confirm Claude reads the page correctly.
9. Enable "Ask before acting" as the default mode.

**For the Claude Desktop + Chrome combination (Cowork handoff workflow):**

The client can start a task in Claude Desktop and hand part of the work to the browser. Setup:

1. Open Claude Desktop. Click initials in the lower-left corner > Settings.
2. Toggle the Claude in Chrome connector on. Install the extension if not already present.
3. In any Cowork chat, click + > Connectors to enable Claude in Chrome for that conversation.

This is how the client gets the pattern "start in Cowork, hand off to browser for web action, come back to Cowork with results."

**Model tier considerations by plan:**

- Pro plan: Claude in Chrome is limited to Haiku 4.5. Adequate for simple workflows; expect imperfect results on complex multi-step reasoning tasks. Document this expectation with clients upfront.
- Max, Team, Enterprise: Full model choice including Opus 4.7 for demanding workflows.

For any client whose browser workflows involve multi-step reasoning (CRM pipeline analysis, lead enrichment across multiple pages, complex form completion), I recommend Team or Max plan explicitly.

### 6. Recorded Workflows (Shortcuts)

For the 3-5 shortcuts I identified per client:

1. Click the record icon in the Claude extension panel.
2. Perform the steps manually once. Talk Claude through what each step does (the extension captures the sequence and annotations).
3. Stop recording.
4. Name the shortcut clearly.
5. Test by invoking the shortcut on a different day or different instance of the workflow.

Some shortcuts can be scheduled (daily, weekly) via the clock icon in the extension panel. I use this sparingly for client-facing setups because scheduled browser actions require the browser to be open at the scheduled time, which is less reliable than Cowork routines for recurring work.

### 7. Claude in Excel Setup (for Operations-Heavy Clients)

For clients who do real spreadsheet work (financial modeling, operations tracking, pivot-heavy reporting), I also install Claude in Excel. This is a Microsoft Office add-in, not a browser extension.

**When to set this up:**

- Client has a finance or operations lead who spends significant time in Excel
- Monthly reporting or financial modeling is a real workflow
- The KPI dashboards from Doc 12 are Excel-based
- Any professional services or consulting client

**Setup:**

1. Navigate to the Claude for Excel listing on Microsoft AppSource.
2. Click "Get it now." Approve permissions.
3. Open Excel. Find Claude in the Home ribbon or Tools > Add-ins.
4. Activate the add-in and sign in with Claude account credentials.
5. Open the Claude sidebar. Confirm it reads the open workbook.
6. Test prompt: "Explain the calculation in cell [X]." Confirm Claude cites specific cells.

**For Team/Enterprise deployment:** Admin deploys through Microsoft 365 admin center > Integrated apps. I don't do this directly for clients; I walk their IT contact through it. For small clients without dedicated IT, each user installs individually.

**Claude in Excel connects to the same skills and connectors the client has configured elsewhere in Claude.** The `audreys-voice-check` skill is available in Excel too, though less relevant there than in Chrome. Skills that aren't relevant to Excel are filtered out of the in-Excel skill picker automatically.

**Safety for Excel:** Only use Claude in Excel with trusted spreadsheets. Do not use it on vendor files, downloaded templates, or spreadsheets from external sources without first reviewing them for prompt injection risk (malicious instructions hidden in cells or comments). This is a live concern Anthropic documents explicitly.

### 8. The Browser Workflows Reference Sheet

The deliverable I hand the client covers both Chrome and Excel if both are set up.

```markdown
# [Client] - Your Browser and Spreadsheet Workflows

## Claude in Chrome

### Installed for
- [User 1 email]
- [User 2 email]

### Allowed sites
- [Site 1]: [purpose and permission level]
- [Site 2]: [purpose and permission level]
...

### Recorded shortcuts
- *[Shortcut 1 name]*: [what it does, how to invoke]
- *[Shortcut 2 name]*: [what it does, how to invoke]
...

### Hard rules
- Never approve Claude to interact with banking, payment, or payroll sites
- Always use "Ask before acting" mode until a workflow is proven
- Pause and review if a site produces unexpected instructions

### How to revoke
- chrome://extensions > Claude > Details > Site access

## Claude in Excel (if applicable)

### Installed for
- [User 1 email]

### Common prompts
- "Explain what's happening in this workbook"
- "What assumptions drive [specific cell]?"
- "Build a variance analysis comparing [range A] and [range B]"

### Hard rules
- Only use on trusted files
- Always review changes before saving
- Don't use on downloaded or vendor-supplied spreadsheets
```

## How to Build This Document

**Step 1: Identify which users need browser-side Claude (5 minutes).** Not every team member does web-based work that benefits from the extension. I flag the 1-3 users per client who actually spend time in web apps that would benefit.

**Step 2: Confirm browsers (2 minutes).** Chrome or Edge for each identified user. If someone runs Safari or Arc, that's a flag to document.

**Step 3: Build the allowlist and shortcut shortlist (15 minutes).** Pull from the archetype libraries above, adapt based on the client's specific tools (e.g., if the venue uses Perfect Venue instead of HoneyBook, swap that in).

**Step 4: Schedule a per-user install call (20-30 minutes per user).** Shared screen. Walk through Chrome Web Store install, permissions, first allowlist sites, test prompt.

**Step 5: Record the 3-5 shortcuts (30-45 minutes total).** Live on a call with the team member who'll actually use each shortcut. Record together so the shortcut captures their pattern, not mine.

**Step 6: If Excel is in scope, install Claude in Excel (15-20 minutes per user).** AppSource install, activation, test prompt.

**Step 7: Build the reference sheet (15 minutes).** Populate the template above, convert to PDF, upload to Project knowledge base.

**Step 8: Record a Loom walkthrough (7-10 minutes).** Show: how to open the Chrome side panel, how to invoke a shortcut, how the Ask-before-acting mode works, how to revoke a site permission, how to use Claude in Excel if installed.

**Step 9: Update client-tracker.**

## Definition of Done

- [ ] Browser compatibility confirmed for every intended user
- [ ] Chrome extension installed, pinned, signed in for each user who needs it
- [ ] "Ask before acting" mode is the default
- [ ] Per-site permissions granted only for the allowlist, denied for everything else
- [ ] 3-5 shortcuts recorded, named, and tested for each primary user
- [ ] Hard-rule safety boundaries documented and acknowledged by each user
- [ ] For operations-heavy clients: Claude in Excel installed and tested
- [ ] Browser workflows reference sheet exists in Project knowledge base
- [ ] Loom walkthrough recorded and sent
- [ ] Client-tracker entry shows who has what installed, which shortcuts exist, and review date

## Common Failure Modes

**Failure 1: Installing the extension on Safari or Arc.** The extension does not exist for these browsers. I've had calls where the client tried to install it on Safari and blamed themselves for the failure. I always confirm the browser first.

**Failure 2: Granting all-site permissions in the initial setup screen.** The easy path is to click "allow on all sites" during setup. This creates an unnecessarily wide attack surface. I always walk clients through the per-site permission model in Step 1 and make them explicitly choose the restrictive option.

**Failure 3: Not using "Ask before acting" mode.** Autonomous mode is powerful once a workflow is proven stable but dangerous on day one. I set every new client to Ask-before-acting and only move specific shortcuts to autonomous after a month of clean use.

**Failure 4: Scheduling a browser workflow that needs Chrome open.** Scheduled shortcuts in Claude in Chrome require the browser to be running at the scheduled time. For anything time-sensitive, I use Cowork routines (which at least handle machine-wake) or Claude Code routines (cloud-based) instead.

**Failure 5: Setting up Claude in Chrome for a Pro plan client expecting Opus-level reasoning.** Pro is Haiku 4.5 only for the Chrome extension. If the client's workflows require complex reasoning, they need Max or Team. I set expectations upfront and document this limitation in the reference sheet.

**Failure 6: Ignoring prompt injection risk.** A malicious website or spreadsheet can try to inject instructions to Claude (telling it to ignore user instructions, exfiltrate data, etc.). I train every user to pause if Claude starts taking unexpected actions and to report it. The reference sheet includes this as a hard rule.

**Failure 7: Setting up Claude in Excel on untrusted files.** Downloaded templates, vendor spreadsheets, anything from external sources can contain hidden instructions. Same rule as the Chrome extension: trusted sources only until a file is manually reviewed.

## Full Worked Example: Audrey's Farmhouse

**Browser check:** Owner uses Chrome. GM uses Chrome. Marketing lead uses Edge. Operations lead uses Safari as primary but has Chrome available.

**Users needing Chrome Claude:** Owner (review only), GM (inquiry triage workflow), marketing lead (social and GBP workflows).

**Operations lead:** Skipped for Chrome because her Safari use is primary and she only does occasional web-based work. Flagged in the client-tracker for re-visit if Safari support ships.

**Allowlist for Audrey's (shared across all three users):**

- HoneyBook dashboard
- Google Business Profile
- Cloudinary
- Gmail, Drive, Calendar (Google Workspace)
- Instagram Business suite
- The Knot vendor dashboard
- WeddingWire vendor dashboard

**Denied sites (explicitly):** Banking sites (Chase, QuickBooks Online), payroll (Gusto), venue booking confirmations. The client knows to never approve Claude access to these even if prompted.

**Recorded shortcuts (3 for the GM, 2 for the marketing lead):**

GM shortcuts:
1. *Inquiry triage* — opens HoneyBook, reads new inquiries, drafts a prioritized summary in the side panel.
2. *Inquiry first-reply* — on a specific HoneyBook inquiry page, drafts a first-reply email using the inquiry responder skill. Pauses for human review before sending.
3. *Calendar hold* — when a prospect asks for a tour, Claude opens Google Calendar, finds the next three availability slots, drafts a reply with those times.

Marketing lead shortcuts:
1. *GBP post draft-to-publish* — opens GBP, loads the draft from the weekly post routine, pauses for review, publishes after human approval.
2. *Cloudinary asset pull* — searches Cloudinary by tag, returns a list of asset IDs into the side panel for use in posts.

**Mode:** All shortcuts in Ask-before-acting mode for the first 30 days. After 30 days of clean use, the GM elected to move *Calendar hold* to autonomous. All others remain Ask-before-acting.

**Claude in Excel:** Not installed. Audrey's operations team does minimal spreadsheet work; HoneyBook and QuickBooks Online are where their numbers live. Flagged for re-visit if monthly reporting volume increases.

**Reference sheet:** `Audrey's Farmhouse - Your Browser Workflows.pdf`, uploaded to the Project knowledge base.

**Loom:** 8-minute walkthrough covering side panel, each of the five shortcuts, safety rules, and how to revoke permissions.

**Client-tracker update:**

```
Chrome extension installed for: Owner, GM, Marketing lead
Excel add-in installed for: None
Shortcuts recorded: 5 total
Autonomous shortcuts: 1 (GM: Calendar hold, converted 2026-05-22 after 30-day review)
Ask-before-acting shortcuts: 4
Site allowlist: 7 sites
Next review: 2026-07-22 (quarterly per I15)
Open item: re-evaluate Safari support for operations lead
```

That's I05 complete. Ready to produce I06 when you say continue.
