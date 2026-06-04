# Spec I03: Client Routines and Cowork Setup Spec

## What This Spec Is

This spec defines the scheduled automations I set up inside a client's Claude environment so that recurring work happens on a cadence without anyone having to remember to trigger it. The two products I'm working with are Cowork scheduled tasks (Desktop app, runs when the computer is awake) and Claude Code routines (cloud-hosted, runs regardless of machine state). Both are live features on paid Claude plans as of April 2026, and both are how I convert the theoretical automations described in Doc 11 (Automation Spec Package) into actual running pipelines.

Without this spec, routines either don't get set up at all or get set up inconsistently: one client has a weekly report automation, another client doesn't, a third has one that broke two months ago and nobody noticed. With this spec, every client gets a starter routine library matched to their archetype, a clear map of which automations run in Cowork (cheap, Desktop-bound) versus which need to run as cloud routines (reliable, cost more usage), and a monitoring cadence so broken runs get caught fast.

I draw a hard line between Cowork scheduled tasks and Claude Code routines because they behave differently and fit different use cases. Cowork is the default for most client work because it's simpler, the UI is more accessible to non-technical users, and it has direct access to the client's local files. Routines come in when reliability matters more than local file access — anything that has to run whether or not the client's laptop is awake.

## Quick Reference

| Field | Value |
|---|---|
| Doc number | I03 |
| Priority | High, build after I02 |
| Total length target | 4-8 routines per client in the starter library plus documentation for each |
| Time to produce | 2-3 hours per client for initial setup including testing |
| Client time required | 30 minutes to watch the setup, accept permissions, confirm outputs |
| Delivery format | Live scheduled tasks in the client's Cowork, a routines library doc in the Project knowledge base, and a monitoring dashboard |
| File naming | `[client]-routines-library.md` in the client's Project knowledge base |
| Prerequisite | I01 (Project exists), I02 (Skills deployed), I04 (MCPs connected for whichever services the routines touch) |

## When This Document Gets Built

**Triggers:**

- Client Project is live and stocked with knowledge
- Starter skill set is deployed
- MCP servers needed for each planned routine are connected (Gmail, Google Calendar, WordPress, etc.)
- Doc 11 (Automation Spec Package) for this client has identified at least three recurring workflows that make sense to automate
- Client has downloaded and installed Claude Desktop on at least one machine (required for Cowork)

**Blocks:**

- Any deliverable that depends on "this will run every week/month" requires the routine to actually be running
- Doc 12 (Measurement KPI Framework) often relies on a weekly data-pull routine to populate dashboards
- Doc 15 (Retainer Engagement Playbook) check-in cadences assume certain routines are surfacing the data being reviewed

## Section-by-Section Template

### 1. The Routine Type Decision

For every automation I'm considering, I answer one question first: Cowork scheduled task or Claude Code routine?

**Use Cowork scheduled tasks when:**

- The automation reads or writes local files on the client's machine
- The client has a machine that stays on during business hours (desktop computer, always-on laptop)
- The work is acceptable to skip occasionally (if the computer is off when it's scheduled, it runs next time the computer wakes)
- The automation is non-critical enough that a skipped run doesn't break anything
- The client or their team will watch the outputs regularly

**Use Claude Code routines when:**

- The automation must run reliably regardless of any machine being on (weekly report that goes out Monday 8am whether or not anyone's laptop is awake)
- The automation is triggered by something external (API call, GitHub event, webhook from a service)
- The client has a developer-adjacent team member who can engage with Claude Code setup (see I06)
- The client is on Pro (5 routines/day limit), Max (15/day), Team (25/day), or Enterprise (25/day) — and the automation fits within that limit

**Default:** Cowork first. Most client automations do not require cloud-level reliability, and Cowork's UI is approachable for non-technical client teams. I only move an automation to routines when there's a specific reason.

### 2. The Starter Routine Library by Client Archetype

Every client archetype has a starter routine library I pull from. These are the first routines I set up on day one (or week two, once the Project has enough context).

**Wedding venue archetype (Audrey's Farmhouse pattern):**

- *Daily inquiry digest (Cowork, weekdays 8am).* Pulls HoneyBook inquiries received overnight via email notifications, summarizes each with source, event type, date, guest count, and suggested response priority. Outputs a markdown file to `~/Claude/audreys/daily-inquiries/[date].md`.
- *Weekly Google Business Profile post draft (Cowork, Monday 9am).* Pulls from the Content Library (Doc 04) and generates three GBP post drafts for the owner to review and post manually.
- *Monthly content brief (Cowork, first Monday of the month).* Produces the monthly content brief (same output as the `monthly-content-brief` skill but scheduled instead of invoked) and emails it to the marketing lead.
- *Quarterly SEO pulse (Cowork, first Monday of the quarter).* Pulls Ahrefs data via the Ahrefs MCP, compares to last quarter, and produces a quarterly SEO summary in the Project.
- *Vendor outreach Monday (Cowork, Monday 10am, optional).* Reviews the Content Library for missing vendor profiles and drafts one vendor outreach email for the GM to send.

**Contractor / home services archetype:**

- Daily lead summary from Google Ads, Facebook Ads, and web form submissions
- Weekly review-request draft to customers who completed work in the past 7 days
- Monthly seasonal-promotion content pack
- Quarterly before/after photo library audit

**Preschool / childcare archetype:**

- Weekly enrollment pipeline summary
- Monthly parent newsletter draft
- Quarterly tour-inquiry conversion review

**Restaurant archetype:**

- Weekly social media post draft batch (one per day of the coming week)
- Monthly menu update social post
- Weekly OpenTable booking pattern review

**Professional services archetype:**

- Weekly pipeline review from CRM
- Monthly case study candidate shortlist
- Quarterly thought-leadership content brief

I don't deploy every routine in the archetype library on day one. I pick 4-6 that map to the highest-value recurring work identified in the client's Doc 11.

### 3. The Standard Routine Specification Format

Every routine I create is documented in the same format so the client and I have a shared mental model of what's running.

```markdown
### [Routine Name]

**Type:** Cowork scheduled task | Claude Code routine
**Cadence:** [Daily/Weekly/Monthly + specific time]
**Trigger source:** [Schedule | API call | GitHub event]
**Owner:** [Client team member responsible for reviewing output]
**Connectors used:** [Gmail, Google Calendar, WordPress, Ahrefs, etc.]
**Skills used:** [any deployed skills invoked by the routine]

**What it does (one paragraph):**
[Plain-language description]

**Expected output:**
[File written to X location, email sent to Y, artifact created in Z]

**Success criteria:**
[How we know it worked: e.g., "Output file exists, contains 3-5 items, no error block in the summary"]

**Failure handling:**
[What happens if it fails: where the error notification goes, who acts on it]

**Usage cost:**
[Rough estimate: "counts as one Cowork session per run, typically 5-10% of daily usage" or "1 routine run of 25 daily allowance"]

**Created:** [Date]
**Last modified:** [Date]
**Status:** Active | Paused | Deprecated
```

### 4. Setup Mechanics

**Cowork scheduled task setup:**

1. Open Claude Desktop, confirm latest version installed.
2. Open Cowork, start a new task with the prompt I've drafted for this routine.
3. Run it once manually to confirm it produces the expected output.
4. Type `/schedule` in the task. Walk through the prompts: cadence, time of day, timezone.
5. Confirm.
6. Claude rewrites the prompt internally based on the first successful run so subsequent runs are more reliable. I let it do this.
7. Test: change the client's laptop time forward by 5 minutes, verify the task runs. Then revert.
8. Add entry to the routines library doc.

**Claude Code routine setup:**

1. Confirm the client has Claude Code on the web enabled (requires Pro/Max/Team/Enterprise).
2. Navigate to claude.ai/code/routines.
3. Click "New routine," configure: prompt, repository (if applicable), environment, connectors, trigger (schedule / API / GitHub).
4. Run once to confirm.
5. Confirm the per-plan routine limit hasn't been exceeded (Pro: 5/day, Max: 15/day, Team/Enterprise: 25/day).
6. Add entry to the routines library doc.

**Permissions pass:** Every routine has access to specific connectors. I walk through the connector list with the client before any routine runs live against real data, so they see exactly what Claude can read and write. This is a trust moment, not a formality.

### 5. The Monitoring and Failure Handling Layer

Scheduled work fails silently if nobody watches it. My standard monitoring setup:

**Output location consistency.** Every routine writes its output to a predictable, named location. If the location is empty when expected, something failed.

**Failure notifications.** For Cowork: the skipped-run notification appears in the Scheduled section of the sidebar, and the client sees it next time they open the app. For routines: check the routine's run history at claude.ai/code/routines. I set up a weekly manual check as part of the client's retainer review.

**A health-check routine.** One of the routines I always deploy is a meta-routine that runs weekly and checks: did every other routine produce output this week? If not, which ones failed? The output goes to me and the client's primary owner so we catch drift.

**Retirement.** When a routine is no longer useful (the workflow changed, the client moved to a different tool, the data source went away), I pause it first, watch for a month to confirm nobody misses it, then delete. Dead routines consume attention.

### 6. Handoff to the Client

After setup, I give the client:

- A one-page PDF titled `[Client] - Your Scheduled Automations` listing each routine, its cadence, its owner, and where the output goes.
- A short Loom (5-8 minutes) showing them how to open Cowork's Scheduled section, how to view a routine's run history, how to pause or resume a routine, and how to flag one as broken.
- The routines library markdown doc uploaded to the Project knowledge base.

## How to Build This Document

**Step 1: Review Doc 11 for this client (10 minutes).** Identify the recurring workflows the client or I have flagged as automation candidates. Mark each with "Cowork-appropriate" or "needs cloud routine" using the decision criteria above.

**Step 2: Select the starter set (5 minutes).** 4-6 routines for day one. Avoid the temptation to automate everything week one. Start with the routines that save the most recurring time or surface the most important recurring information.

**Step 3: Draft each routine's prompt (20-30 minutes per routine).** The prompt is the core of the routine. I write it as if I were writing the task manually, being specific about data sources, output format, and success criteria. I keep prompts under 400 words because longer prompts produce less predictable runs.

**Step 4: Test each routine manually (10-15 minutes per routine).** Run the prompt as a regular Cowork task first. Confirm output quality. Refine if needed. Only after a clean manual run do I schedule it.

**Step 5: Schedule (5 minutes per routine).** Use `/schedule` in Cowork or the New Routine flow in Claude Code. Confirm cadence, time, timezone.

**Step 6: Document each routine (5 minutes per routine).** Add the standard spec block to `[client]-routines-library.md`.

**Step 7: Set up the health-check meta-routine (15 minutes).** Weekly routine that checks all other routines produced output in the past week.

**Step 8: Build the handoff deliverables (20 minutes).** One-page PDF plus Loom walkthrough.

**Step 9: Schedule the first monthly review (2 minutes).** 30 days after setup, I review every routine's output history with the client. This catches problems early and gives the client a chance to request changes.

## Definition of Done

- [ ] Client has Claude Desktop installed and current for Cowork-scheduled routines
- [ ] Client has Claude Code on the web enabled for any cloud routines
- [ ] Starter routine set (4-6 routines) is running, each tested with at least one successful manual invocation
- [ ] Each routine has a full spec block in the routines library doc
- [ ] Routines library doc is uploaded to the Project knowledge base
- [ ] The health-check meta-routine is running weekly
- [ ] Client has received the one-page PDF and Loom walkthrough
- [ ] Client has acknowledged they understand which connectors each routine uses
- [ ] Client-tracker entry shows routines deployed, cadence, and next review date
- [ ] 30-day review is on my calendar

## Common Failure Modes

**Failure 1: Scheduling a routine that depends on a skill that isn't deployed.** If my `monthly-content-brief` skill isn't installed in the client's account, the scheduled task that invokes it silently underperforms. I always verify the skill is live before scheduling a routine that calls it.

**Failure 2: Treating Cowork as always-on.** Cowork only runs when the client's computer is awake and the Desktop app is open. If the client's laptop is closed all weekend and a Monday 8am routine is scheduled, it runs whenever the laptop next opens on Monday morning, which might be 10am or later. For anything that must run at a specific time regardless of machine state, I use Claude Code routines instead.

**Failure 3: Hitting the routine daily limit without realizing it.** Pro has 5 routines per day. If I deploy 5 cloud routines and the client also uses Claude Code for development work that triggers additional routines, we hit the limit. I track daily routine count against the plan limit in the routines library doc and flag when we're approaching the ceiling.

**Failure 4: Over-automating on day one.** Eight routines on day one means nobody reads the output, and within a month the client considers the whole system noise. Four to six is the ceiling for initial deployment. I add more as the client gets comfortable and asks for specific additions.

**Failure 5: No output location convention.** If one routine writes to `~/Downloads/` and another writes to `~/Documents/Claude/` and a third only sends email, the client can never find anything. I define one output directory per client and every file-producing routine writes into it with a consistent naming pattern.

**Failure 6: No health-check and no monthly review.** Without these, a broken routine can go undetected for weeks. I've had clients ask me two months in where their weekly report has been, only to find it stopped running when a connector auth expired. The meta-routine plus the 30-day review are non-negotiable.

**Failure 7: Scheduling routines before connectors are tested.** A routine that depends on Gmail MCP fails if Gmail auth isn't working. I always test each connector end-to-end before scheduling any routine that uses it. This is the I04 prerequisite, but I verify it again at routine-setup time.

## Full Worked Example: Audrey's Farmhouse

**Starter set decision:** 5 routines, all Cowork-based because the client's GM has an always-on iMac in the office that Claude Desktop stays open on during business hours.

**Routine 1: Daily inquiry digest**

```markdown
### Daily Inquiry Digest

**Type:** Cowork scheduled task
**Cadence:** Daily, weekdays, 8:00am ET
**Trigger source:** Schedule
**Owner:** Audrey's GM
**Connectors used:** Gmail (HoneyBook inquiry notifications)
**Skills used:** audreys-inquiry-responder (for draft suggestions)

**What it does:**
Pulls HoneyBook inquiry notification emails from the past 24 hours. Extracts event type, date, guest count, and source. Flags inquiries that match peak dates from the Business Facts Reference (Doc 02) as high-priority. Produces a markdown digest with a draft first-reply for each inquiry using the inquiry responder skill.

**Expected output:**
File written to `~/Claude/audreys/daily-inquiries/YYYY-MM-DD.md` with one section per inquiry.

**Success criteria:**
File exists, contains at least 0 inquiries (empty days are fine), no error block in the summary footer.

**Failure handling:**
Skipped run surfaces in Cowork sidebar; weekly health-check meta-routine flags missing files. GM is the contact for any failure notifications.

**Usage cost:**
One Cowork session per run; typically 3-5% of daily Pro allocation.

**Created:** 2026-04-22
**Status:** Active
```

**Routine 2: Weekly GBP post drafts**

```markdown
### Weekly Google Business Profile Post Drafts

**Type:** Cowork scheduled task
**Cadence:** Weekly, Monday, 9:00am ET
**Trigger source:** Schedule
**Owner:** Audrey's marketing lead
**Connectors used:** None (pulls from Project knowledge)
**Skills used:** audreys-voice-check

**What it does:**
Pulls the Content Library (Doc 04) and SEO Keyword Strategy (Doc 06). Generates three Google Business Profile post drafts for the week: one event-type spotlight, one location-specific moment, one seasonal note. Runs each through the voice check skill before writing out. Produces a markdown file for the marketing lead to review and post manually to GBP.

**Expected output:**
File written to `~/Claude/audreys/weekly-gbp/YYYY-Www.md`. Three post drafts, each under 400 characters, with suggested photo pick from the Content Library.

**Success criteria:**
Three drafts, all under character limit, voice check passed, photo suggestion present.

**Failure handling:**
Weekly health-check meta-routine flags missing output.

**Usage cost:**
One Cowork session per week; minimal.

**Created:** 2026-04-22
**Status:** Active
```

**Routine 3: Monthly content brief** — runs first Monday 10am, uses the monthly content brief skill, output emailed to marketing lead via Gmail MCP.

**Routine 4: Quarterly SEO pulse** — runs first Monday of the quarter at 11am, uses Ahrefs MCP to pull domain rating, keyword movements, top gainer and loser pages. Produces a markdown summary in the Project knowledge base.

**Routine 5: Weekly health-check (meta-routine)** — runs every Monday 7:45am, reads the expected output files for routines 1-4 from the prior week, confirms each was produced, emails a one-paragraph health summary to me and the GM.

**Routines library doc:** Saved as `audreys-routines-library.md` in the Project knowledge base.

**Handoff deliverables:**
- `Audrey's Farmhouse - Your Scheduled Automations.pdf` (one page, five routines listed with cadence and owner)
- 7-minute Loom walkthrough covering how to view the Scheduled section, how to pause a routine, and how to flag a broken one
- Added to the Project knowledge base

**Daily routine count vs. plan limit:** Audrey's is on Team plan (25 routine runs/day equivalent if they move to cloud routines later). Current Cowork usage is 5 scheduled tasks, well within reasonable daily usage. No cloud routines deployed yet.

**Client-tracker update:**

```
Routines deployed: 5
Cadence breakdown: 1 daily, 3 weekly, 1 quarterly
Output directory: ~/Claude/audreys/
Health-check: Active, Monday 7:45am
30-day review: 2026-05-22
```

That's I03 complete. Ready to produce I04 when you say continue.
