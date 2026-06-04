# Spec I12: My Routines and Cowork Workflows Spec

## What This Spec Is

This spec defines the scheduled and recurring Claude-powered workflows I run for myself and my consulting practice. Every client engagement I run produces its own set of routines per I03, scheduled inside the client's Claude account. This spec covers mine: the automations that power my own daily and weekly operations, that keep the client tracker current, that surface new opportunities, that produce recurring deliverables I owe myself and my business, and that make the Upriver Consulting operating system run even when I'm not actively sitting at the computer.

Without this spec, my own Cowork usage stays ad-hoc. I start a task, finish it, move on, and the next time I need the same thing I start from scratch. With this spec, I have a documented library of routines that run on a cadence, a clear map of which are scheduled versus on-demand, and a monitoring discipline so broken routines get caught quickly. The whole point is that my Claude environment should work for me the way I help clients build theirs to work for them.

I draw the same Cowork-vs-routine distinction from I03: Cowork scheduled tasks run on my MacBook when it's awake and Desktop is open, and Claude Code routines run on Anthropic's cloud infrastructure regardless of my machine state. For most of my internal work, Cowork is sufficient because my MacBook is awake and connected during business hours anyway. For a few workflows (anything triggered by external events, anything that has to run before I open my laptop in the morning), routines are the right tool.

## Quick Reference

| Field | Value |
|---|---|
| Doc number | I12 |
| Priority | High, build after I10 and I11 |
| Total length target | 6-10 active routines covering daily, weekly, monthly, and on-demand cadences |
| Time to produce | 3-4 hours for initial build-out including testing each routine |
| Delivery format | Live scheduled tasks in my Cowork and routines in my Claude Code setup, documented in `my-routines-library.md` |
| File naming | `my-routines-library.md` in the Upriver Consulting Project knowledge base |
| Prerequisite | I10 (Project exists), I11 (skills library organized), I13 (MCPs configured) |

## When This Document Gets Built

**Triggers:**

- Upriver Consulting Project is live and populated
- My personal MCP stack is stable (Gmail, Calendar, Drive, Ahrefs, Cloudinary, etc.)
- I've identified at least three recurring workflows that take me more than 15 minutes each time I do them manually
- I'm ready to commit to monitoring the routines and updating them as the practice evolves

**Blocks:**

- Any recurring deliverable I've promised myself on a cadence (weekly client check-in prep, monthly business review, quarterly spec audit) depends on these routines existing
- The client engagement flow from I01 through I09 benefits from having my own operations semi-automated so I have capacity to focus on client work

## Section-by-Section Template

### 1. The Routine Type Decision (for Me)

Same decision criteria from I03, applied to my own workflows.

**Cowork scheduled task when:**

- The routine reads or writes local files on my MacBook (which most of mine do)
- My MacBook is awake during business hours (which it is)
- A skipped run is acceptable (a weekly digest that runs Monday 8am but actually runs at 9am because my laptop woke up late is fine)
- The workflow targets my Obsidian vault, my `/mnt/skills/user/` directory, or files in my local filesystem

**Claude Code routine when:**

- The routine must run before I open my laptop (first-thing-in-the-morning summaries)
- An external event triggers it (GitHub webhook, API call from a client's Cal.com, incoming webhook from a form submission)
- The routine doesn't need local file access
- I want deterministic cloud execution

**Default for me:** Cowork first. Most of my own routines touch local files (Obsidian notes, skill library updates, client folders) so Cowork is the natural fit. I only escalate to Claude Code routines for the specific cases where I need them.

### 2. The Routine Library by Cadence

**Daily routines:**

*Morning briefing (Cowork, 7:30am ET, weekdays).* Pulls Gmail unread from the past 24 hours, Google Calendar for the day, any new client tracker entries, and produces a 5-bullet morning brief written to `~/Obsidian/01-inbox/morning-briefs/YYYY-MM-DD.md`. Includes any overnight urgent items flagged by keyword. I read this over coffee.

*Client activity summary (Cowork, 5:30pm ET, weekdays).* Scans client-tracker.md and any client-specific deployment logs for updates I made today. Produces an end-of-day summary so I know what shipped, what's pending, and what to tackle first tomorrow. Written to `~/Obsidian/01-inbox/daily-summaries/YYYY-MM-DD.md`.

**Weekly routines:**

*Monday planning (Cowork, Monday 7:45am ET).* Pulls from client-tracker, this week's calendar, and the spec for each active client to produce a one-page week plan: which client gets what deliverable this week, any subcontractor coordination needed, any deadlines. Written to `~/Obsidian/01-inbox/weekly-plans/YYYY-Www.md`.

*Weekly client tracker refresh (Cowork, Friday 4pm ET).* Walks through each active client's Project knowledge, pulls any recent activity, and updates `client-tracker.md` with current status. Re-uploads updated tracker to the Upriver Consulting Project per I10.

*Content engine weekly (Cowork, Friday 3pm ET).* For joshuabrownphotography.com and upriverhv.com: checks which blog posts were published this week, identifies the next blog post due according to the content calendar, pulls keyword data from Ahrefs, produces a draft outline for the next post. Saves to `~/Obsidian/10-content-pipeline/`.

**Monthly routines:**

*First-of-month business review (Cowork, first day of month 8am ET).* Aggregates last month's numbers: client revenue, subcontractor costs, outstanding invoices via Era, content published across both sites, routines health check from the week meta-routine. Produces a one-page monthly scorecard.

*Monthly spec maintenance (Cowork, first Monday of month 9am ET).* Scans `/mnt/project/` for any spec files modified since the last run. Reminds me to re-upload modified specs to the Upriver Consulting Project. Not automated upload (I want the review step), just a list of what's changed.

*Monthly memory audit prompt (Cowork, first Monday of month 10am ET).* Sends me a prompt to open Settings > Capabilities > Memory and review what Claude has stored about me. Takes 5 minutes; prevents memory drift per I08.

**Quarterly routines (on-demand rather than scheduled):**

*Quarterly spec audit (on-demand, first Monday of quarter).* Per I15. Not fully automated because it requires judgment. What's automated: a routine produces a checklist of every spec with last-modified date and any open items. I work through the checklist manually.

*Quarterly client audit (on-demand, first Monday of quarter).* Per I15. Produces a per-client health report pulling from each client's Project connectors (where I still have access), deployment logs, and any outstanding items.

**Event-triggered routines (these are Claude Code routines, not Cowork):**

*New client intake trigger (Claude Code routine, webhook).* When a new engagement agreement is signed in HoneyBook (my own HoneyBook for consulting intake) and a webhook fires, the routine creates a new folder in my Obsidian vault for the client, creates a starter client-tracker entry, sends me a kickoff-scheduling reminder. Low urgency but nice to have automated.

*Subcontractor weekly ping (Cowork, Sunday 6pm ET).* Generates check-in messages I send to active subcontractors (Annmarie, Louis, whoever's currently engaged) based on their active scopes. I review and send; the routine drafts.

**Meta-routine:**

*Routine health check (Cowork, Monday 7:15am ET).* Reviews the expected output files for every routine above from the prior week. Flags any routine that produced empty output, missed a run, or errored. Emails me a one-paragraph summary. This is the single most important routine because it prevents the rest from rotting silently.

### 3. Output Directory Convention

All routine outputs land in my Obsidian vault under consistent paths:

```
~/Obsidian/
├── 01-inbox/                    # Ephemeral, reviewed then archived or acted on
│   ├── morning-briefs/YYYY-MM-DD.md
│   ├── daily-summaries/YYYY-MM-DD.md
│   ├── weekly-plans/YYYY-Www.md
│   └── monthly-scorecards/YYYY-MM.md
├── 10-content-pipeline/         # Blog draft outlines and content plans
├── 20-client-work/              # Per-client folders
│   ├── audreys-farmhouse/
│   └── [future clients]/
├── 30-operations/               # Business-running stuff
│   ├── monthly-reviews/
│   ├── spec-change-logs/
│   └── subcontractor-checkins/
└── 99-archive/                  # Past outputs after review
```

This structure is stable. Routines write to known locations; I know where to look for any routine's output without thinking about it. Monthly, I archive anything from 01-inbox that's older than 30 days to keep the inbox clean.

### 4. Invocation Prompt Standards

Each routine's prompt follows the same pattern:

**1. Role and scope.** What Claude is doing, what the output is for.
**2. Data sources.** Specific files, connectors, directories to pull from.
**3. Output specification.** Exact format, exact file path, exact length ceiling.
**4. Success criteria.** What "done" looks like.

Keep each prompt under 400 words. Longer prompts produce less predictable runs. If I find myself wanting to add more, I push it to a skill that the routine invokes rather than inflating the prompt.

**Template:**

```
Role: [one sentence]

Pull from:
- [source 1]
- [source 2]
- [source 3]

Produce a [format] with:
- [content element 1]
- [content element 2]
- [content element 3]

Save to: [exact path]
Length ceiling: [word or line count]
Success: [file exists, contains X, Y, Z; footer says "run complete"]
```

### 5. The Routines Library Document

Every routine gets a spec block in `my-routines-library.md`, mirroring the format I use for client routines in I03.

```markdown
### [Routine Name]

**Type:** Cowork scheduled task | Claude Code routine
**Cadence:** [Daily/Weekly/Monthly + specific time, timezone]
**Trigger:** Schedule | API call | GitHub event
**Connectors used:** [list]
**Skills invoked:** [list]

**What it does:**
[Plain-language description]

**Input/data sources:**
[Files, connectors, or directories read]

**Output:**
[Exact file path or destination]

**Invocation prompt:**
[Full prompt, copy-paste ready for the /schedule creation flow]

**Failure handling:**
[Where I'd see a failure; what to do]

**Created:** [date]
**Last modified:** [date]
**Status:** Active | Paused | Deprecated
```

### 6. Monitoring and Failure Handling

Scheduled work dies silently if nobody watches. My monitoring:

**The meta-routine (weekly health check).** Runs Monday 7:15am before any other routine. Confirms last week's routines each produced expected output. Emails me a summary. If anything failed or ran empty, it's the first thing I see on Monday morning.

**Per-routine failure signals.**

- Cowork: skipped runs appear in the Scheduled sidebar with a notification. I glance at it during the weekly routine health check.
- Claude Code routines: the run history at claude.ai/code/routines shows successes and failures. I spot-check monthly.

**What I do when a routine fails:**

- Once: investigate the cause (MacBook was off, connector expired, prompt ambiguity), fix, move on.
- Twice in a row: deeper investigation. The prompt may have drifted or a data source changed.
- Three times: pause the routine, rewrite it from scratch, re-test before re-enabling.

### 7. Usage Cost Awareness

Cowork tasks and Claude Code routines both consume usage allocation more aggressively than chat. On Max plan ($200/month, 20x Pro), I have substantial headroom but it's not unlimited. Rough usage costs:

- Short daily routines (morning brief, daily summary): 2-4% of daily allocation each
- Weekly routines with heavier data lookups: 5-10% each
- Monthly business review: 10-15% for that one day
- Meta-routine: small, maybe 2%

Total routine usage on a normal week lands around 15-25% of my weekly allocation, leaving the rest for client work and exploration. I watch for spikes and throttle if something goes wrong (e.g., a routine that runs in a loop because of a prompt bug).

### 8. Maintenance Cadence

**Weekly.** Meta-routine runs automatically; I glance at its output Monday morning.

**Monthly (15 minutes).** Review the routines library doc. Any routines that haven't produced output in 30+ days, I decide: fix, retire, or re-enable with a different cadence.

**Quarterly (30 minutes, per I15).** Full audit. Each routine reviewed for continued relevance, prompt quality, and output usefulness. Retire anything that hasn't earned its keep.

**On material change (as-needed).** When I change how the consulting practice runs (new service line, retired workflow, moved from one tool to another), routines that depend on that get updated immediately rather than waiting for the quarterly audit.

## How to Build This Document

**Step 1: Identify recurring work (20 minutes).** Walk through a typical week of my consulting practice. What do I do every day? Every week? Every month? What takes more than 15 minutes manually that I'd rather automate?

**Step 2: Categorize each candidate (10 minutes).** Cowork or Claude Code routine? Daily, weekly, monthly, or event-triggered?

**Step 3: Draft prompts for each routine (20-30 minutes per routine).** Use the template from Section 4. Keep under 400 words.

**Step 4: Test each routine manually (15-20 minutes per routine).** Run as a one-shot Cowork task first. Confirm the output matches what I want. Refine.

**Step 5: Schedule (5 minutes per routine).** `/schedule` in Cowork or New Routine in Claude Code. Confirm cadence and time.

**Step 6: Document each in `my-routines-library.md` (5 minutes per routine).**

**Step 7: Build the meta-routine (20 minutes).** The single health-check routine that watches all the others.

**Step 8: Upload the library doc to the Upriver Consulting Project (2 minutes).**

**Step 9: Set up the monthly and quarterly maintenance reminders.**

## Definition of Done

- [ ] At least 6 active routines are running on their defined cadences
- [ ] Each routine has a full spec block in `my-routines-library.md`
- [ ] The routines library doc is uploaded to the Upriver Consulting Project
- [ ] The meta-routine (weekly health check) is running
- [ ] Output directory convention is followed for every routine
- [ ] All routines have been tested end-to-end with at least one successful run
- [ ] Monthly and quarterly maintenance reminders are on my calendar
- [ ] Usage costs have been spot-checked against my Max plan allocation

## Common Failure Modes

**Failure 1: Scheduling routines before MCPs are stable.** A routine that depends on Gmail MCP fails if Gmail auth expires. Any new routine that uses a connector gets tested end-to-end first. I don't schedule a routine before I've confirmed the connector works reliably.

**Failure 2: Over-automating.** Six months in I realize I've automated something I only needed once. The monthly review catches this, but I also resist the urge to automate every mildly-repetitive thing. The bar is "more than three times a month, or likely to be weekly going forward."

**Failure 3: Inconsistent output paths.** I put the morning brief in `~/Obsidian/01-inbox/briefs/` and then later change my mind and use `~/Obsidian/01-inbox/morning-briefs/`. The routine keeps writing to the old path. Obsidian accumulates orphan folders. I enforce the output directory convention from Section 3 and update routine prompts when I change it.

**Failure 4: Cowork scheduled task drift.** Cowork's prompt rewriting (it learns from runs and refines the prompt internally) can drift over time in ways I didn't intend. Quarterly audit catches this; I can also manually reset a scheduled task by recreating it fresh from my documented prompt.

**Failure 5: Not catching a failed meta-routine.** If the meta-routine itself fails, I don't get the health check, which means I don't notice other routines failing either. I check the meta-routine's output Monday morning as part of my routine, so if the output file is missing or empty, I notice immediately.

**Failure 6: Routines that never get read.** A daily morning brief is useless if I don't open it. If a routine's output isn't something I actually consume, it's wasting usage allocation. The monthly review asks: did I read this output? If no, kill the routine.

**Failure 7: Running client work in my own routines.** My routines target my own files and my own tracker. If I start including client-specific data (say, pulling Audrey's actual inquiry volume into my own morning brief), I blur the boundary between my operations and their operations. Client routines live in the client's Claude account per I03, not mine.

**Failure 8: Usage blow-up from a bad prompt.** A prompt that accidentally loops or asks Claude to search exhaustively when it should be focused can eat through usage allocation in a single morning. I set length ceilings explicitly in prompts to bound cost.

## Full Worked Example: My Current Routines Library (April 2026)

This is the operational state as of this spec being written.

**Cowork scheduled tasks active: 8**

1. **Morning briefing** — Cowork, weekdays 7:30am ET. Pulls Gmail (last 24h), Calendar (today), client-tracker updates. Output to `~/Obsidian/01-inbox/morning-briefs/`. Uses Gmail MCP and Calendar MCP.
2. **Daily client activity summary** — Cowork, weekdays 5:30pm ET. Scans client work done today. Output to `~/Obsidian/01-inbox/daily-summaries/`.
3. **Monday planning** — Cowork, Monday 7:45am ET. One-page week plan. Output to `~/Obsidian/01-inbox/weekly-plans/`.
4. **Weekly client tracker refresh** — Cowork, Friday 4pm ET. Updates client-tracker.md and re-uploads to Upriver Consulting Project. Uses Gmail, Calendar, and any connectors for active clients I have access to.
5. **Content engine weekly** — Cowork, Friday 3pm ET. Produces next blog post outline for joshuabrownphotography.com and upriverhv.com. Uses Ahrefs MCP and the WordPress connector.
6. **Monthly business review** — Cowork, first day of month 8am ET. Aggregates revenue, costs, content metrics. Uses Era MCP, Ahrefs MCP. Output to `~/Obsidian/30-operations/monthly-reviews/`.
7. **Monthly spec maintenance reminder** — Cowork, first Monday of month 9am ET. Lists spec files modified since last run. Prompts me to re-upload to Upriver Consulting Project. Output to `~/Obsidian/30-operations/spec-change-logs/`.
8. **Routine health check (meta-routine)** — Cowork, Monday 7:15am ET. Confirms each other routine produced output last week. Emails me summary.

**Claude Code routines active: 1**

1. **New client intake trigger** — Claude Code routine, webhook-triggered from HoneyBook. Creates client folder structure in Obsidian and initial tracker entry when a consulting agreement is signed.

**Cowork tasks that exist but are paused:**

- Monthly memory audit prompt (was too noisy; I run it on-demand instead)
- Subcontractor weekly ping (holding until I have 2+ active subcontractors regularly)

**Routines library doc:** `my-routines-library.md` in the Upriver Consulting Project knowledge base.

**Output directory state:** Obsidian vault organized per the convention in Section 3. Empty subfolders exist even for routines that haven't produced output yet, so the structure is predictable.

**Usage against Max plan:** Currently running at roughly 12-18% of weekly allocation on routines. Well within Max plan headroom.

**Monitoring:** Meta-routine output read every Monday morning as the first thing I do after morning-briefing. If meta-routine shows a failure, I investigate before starting other work.

**Maintenance schedule:**
- Weekly: Meta-routine output read Monday morning (automatic)
- Monthly: 15-minute review on first day of month during business review
- Quarterly: Full audit per I15 on first Monday of quarter
- On change: immediate update when my operations change materially

**Open items:**
- Build the subcontractor weekly ping properly once Louis or Annmarie is on a sustained retainer
- Consider adding a Friday-afternoon "deliverables shipped this week" routine that writes to a personal Loom or text log I can reference for case studies
- Potentially add a "new Anthropic feature ship" routine that monitors Anthropic's blog and news feed weekly; low priority but useful for staying current with product changes that affect the specs

That's I12 complete. Ready to produce I13 when you say continue.
