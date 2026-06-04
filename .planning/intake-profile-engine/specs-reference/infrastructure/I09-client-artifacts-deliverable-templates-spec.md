# Spec I09: Client Artifacts and Deliverable Templates Spec

## What This Spec Is

This spec covers the artifacts layer: the small, interactive applications and structured deliverables Claude creates inside a conversation and displays in a side panel. Artifacts are the feature that turns Claude from a text-generating assistant into something that produces working tools the client can use, share, and iterate on. Without artifacts, every recurring deliverable starts from scratch each time. With artifact templates loaded into the Project and a clear operating model for when to use them, the client's team can stand up a weekly dashboard, a monthly report, a customer-facing calculator, or an internal status tracker in minutes.

Without this spec, artifacts get used accidentally: someone asks Claude for a summary and it happens to produce a nice chart, but nobody uses that chart as a template. The potential of artifacts as persistent, shareable tools is missed. With this spec, every client engagement gets a curated set of artifact templates matched to their recurring work, clear guidance on when to use an artifact versus when to build something heavier, and a conversation about persistent storage that sets expectations before a team member tries to use a journal artifact and loses their entries because they didn't publish it first.

Two things matter up front. First, artifacts are free on every Claude plan, including free. But persistent storage (the feature that makes artifacts stateful between sessions) and MCP integration inside artifacts require paid plans (Pro, Max, Team, Enterprise). Second, persistent storage only works on published artifacts. This is the single most common artifact gotcha I see and I build the spec around flagging it early.

## Quick Reference

| Field | Value |
|---|---|
| Doc number | I09 |
| Priority | Medium, build after I01-I04 |
| Total length target | 3-6 artifact templates per client matched to recurring deliverables |
| Time to produce | 30-45 minutes per template (prompting, testing, documenting) |
| Client time required | 15 minutes for the walkthrough plus ongoing invocation as needed |
| Delivery format | Artifact templates saved into the Project, a reference doc with invocation prompts, published links where applicable |
| File naming | `[client]-artifact-library.md` in the Project knowledge base |
| Prerequisite | I01 (Project exists), I07 (plan tier confirmed — persistent storage requires paid plan) |

## When This Document Gets Built

**Triggers:**

- Client Project is live and populated
- Doc 12 (Measurement KPI Framework) has identified recurring reports the client will want to pull on a regular cadence
- Doc 11 (Automation Spec Package) has identified any dashboards or trackers the client would benefit from
- Client has content or workflows that are inherently interactive (calculators, quizzes, multi-step forms, visualizations)

**Blocks:**

- Any recurring deliverable that would benefit from being a reusable artifact rather than a fresh one-off each time
- Doc 12's KPI dashboard often ships as an artifact template
- Customer-facing interactive tools (pricing calculators, availability checkers, FAQ chatbots) are artifacts

## Section-by-Section Template

### 1. What Artifacts Are and What They Are Not

At the start of the client walkthrough, I draw a hard line so expectations land correctly.

**Artifacts are good for:**

- Reports and dashboards that recur weekly, monthly, quarterly (the same structure, different data)
- Interactive tools for internal use (calculators, schedulers, planners)
- Customer-facing microapps (pricing calculators, FAQ chatbots, inquiry forms, availability checkers)
- Structured deliverables the client wants to share (one-pagers, landing pages, decision trees)
- Quick prototypes to test ideas before committing to a real build

**Artifacts are not the right fit for:**

- Production applications that need real databases, authentication, and backend logic (use a real app build via Claude Code per I06)
- Anything with high-volume traffic or complex user flows (storage caps, session management, and the artifact execution model aren't designed for this)
- Anything requiring advanced styling or precise pixel-level design (artifacts are functional, not design-system-polished)
- Content that fits better as a markdown doc or a PDF (don't artifactize a text-heavy report that nobody will interact with)
- Long, text-heavy deliverables that are really documents — those belong in the Project knowledge base as markdown

**The 70% rule.** Artifacts get you about 70% of the way to a working app. The last 30% usually requires a real build. For Audrey's, a customer-facing pricing inquiry tool might ship as an artifact in month 2 and migrate to a real Next.js component on the rebuilt site in month 6. I set this expectation explicitly so clients don't expect artifacts to be forever.

### 2. The Artifact Starter Library by Client Archetype

Every client archetype has a starter library of 3-6 artifact templates I load into the Project. These are not the final deliverables; they're templates the client (or I) invoke when producing the actual thing.

**Wedding venue archetype (Audrey's Farmhouse pattern):**

1. *Weekly marketing status dashboard.* Interactive dashboard showing the week's inquiry volume, source breakdown, top keywords from Ahrefs, content published, and upcoming events. Pulls from Project knowledge. Regenerated each week; data swapped in by Claude during the weekly routine from I03.
2. *Monthly KPI report.* A longer-form report artifact showing month-over-month trends in inquiries, conversions, average booking value, and content performance. Shared internally via org-level sharing (Team plan).
3. *Seasonal pricing calculator (customer-facing).* A published artifact the venue embeds on its website (or links from Instagram) where prospective clients enter event date, guest count, and package interest to see a ballpark rate. Uses shared persistent storage only if the client wants to track which inputs are being submitted.
4. *Vendor preferred-list one-pager.* Generates a styled one-page list of preferred vendors by category that the venue sends to booked couples. Published and embeddable.
5. *Inquiry routing decision tree.* Interactive internal tool for the GM to walk through a prospect inquiry and see next-action recommendations based on event type, date, and guest count.
6. *Content calendar visualizer.* Shows the next 90 days of planned blog posts, Instagram content, and email sends on a visual timeline.

**Contractor / home services:**

- Estimate calculator (customer-facing, embeddable)
- Project timeline visualizer for active jobs
- Before/after photo gallery organizer
- Weekly lead pipeline dashboard
- Monthly review-request tracker

**Preschool / childcare:**

- Tuition calculator (customer-facing)
- Waitlist status tracker (internal)
- Parent newsletter preview/builder
- Monthly enrollment pipeline dashboard

**Restaurant:**

- Menu item profitability calculator (internal)
- Reservation pattern visualizer
- Weekly social content pack builder
- Customer-facing FAQ chatbot

**Professional services:**

- Proposal ROI calculator (customer-facing)
- Pipeline Kanban visualizer (internal)
- Case study template artifact
- Quarterly KPI report artifact

### 3. Persistent Storage: Personal vs. Shared vs. None

Every artifact template decision includes a storage decision. Three options:

**No storage (the default for most templates).** The artifact generates, is used, and doesn't save state. Fine for dashboards where the data is pulled fresh each time from the Project knowledge or connectors. This is most of what I set up for clients.

**Personal storage (per-user private data).** Each user of the artifact has their own private data pool. Good for: a personal journal artifact, a personal task tracker, a private note-taking tool. Example: the GM at Audrey's might have a personal inquiry-followup tracker where she logs which prospects she's following up with; other team members can't see her list.

**Shared storage (all users see the same data).** All users of the artifact read and write to the same data pool. Good for: team leaderboards, shared decision logs, public-facing aggregate trackers. Example: a shared internal kanban for the Audrey's team to track venue maintenance tickets. Everyone sees and edits the same board.

**The publishing requirement.** Persistent storage only works on published artifacts. During development and testing in chat, storage operations silently don't save. This is the most common failure mode I see. Template workflow: build, test logic without storage, publish, then test storage. I document this explicitly in every artifact spec.

**Storage limit.** 20MB per artifact. Adequate for journals, trackers, and most internal tools. Not adequate for anything that ingests substantial media, long transcripts, or large datasets.

### 4. Publishing vs. Sharing vs. Keep-Private

Three distinct distribution modes, all with different implications.

**Keep private (no publish).** The artifact lives inside the conversation and is only accessible by the user who created it or users who have access to that conversation. Fine for one-off internal artifacts, drafts, and tests. No persistent storage possible.

**Publish (Free, Pro, Max plans).** Makes the artifact publicly available at a URL. Anyone with the link can view and interact with it. Required for persistent storage to function. Required for embedding on the client's website. Anyone using the artifact counts against their own Claude subscription for AI-powered features, not the client's. Unpublishing immediately revokes access and permanently deletes all storage data.

**Share (Team, Enterprise plans).** Makes the artifact available within the client's organization only. Viewers must be logged into the client's Team or Enterprise account to access. Good for internal dashboards and team tools that shouldn't be public.

**My default for Audrey's and most clients:**

- Internal dashboards and KPI reports: shared within the Team plan organization
- Customer-facing tools (pricing calculator, FAQ): published publicly, then embedded
- Drafts, tests, one-off analyses: kept private, not published

### 5. MCP Integration Inside Artifacts

Paid-plan artifacts can connect to MCP servers the client has configured in I04. This unlocks artifacts that read from and write to the client's actual tools: Gmail, Calendar, Slack, Ahrefs, Cloudinary, etc.

**When MCP-integrated artifacts matter:**

- A live dashboard that pulls current Ahrefs keyword positions each time it opens
- A scheduler artifact that reads and writes to Google Calendar
- An inquiry triage artifact that reads Gmail in real time

**The authentication model.** Each user who uses the artifact must authenticate the MCP connection independently, even when the artifact is shared. This is intentional: Claude can only access data the specific user is authorized to see in the external service. For shared team artifacts this works cleanly because each team member already has their own MCP connections from I04.

**Enterprise admin note.** Enterprise org admins can enable or disable artifact MCP access at the org level but cannot restrict which specific MCP servers artifacts can use. If the client's compliance posture requires granular MCP control inside artifacts, flag this to the Anthropic account team during the I07 governance conversation.

### 6. The Artifact Template Specification Format

Every artifact template I load into the Project gets documented in the same format.

```markdown
### [Artifact Name]

**Type:** Dashboard | Calculator | Tracker | Visualizer | Tool | Microapp
**Audience:** Internal (team) | Customer-facing | Mixed
**Storage:** None | Personal | Shared
**Distribution:** Private | Published | Org-shared
**MCPs used:** [list of connectors the artifact relies on]

**What it does (one paragraph):**
[Plain-language description]

**Invocation prompt:**
[The exact prompt that generates this artifact, copy-paste ready]

**Data sources:**
[Project knowledge docs referenced, connectors pulled from]

**Published URL (if applicable):**
[URL]

**Embed URL (if applicable):**
[Embed code location]

**Update cadence:**
[One-time | Per-invocation | Scheduled via routine]

**Maintenance:**
[Who updates the template when needs change]

**Created:** [Date]
**Status:** Active | Paused | Deprecated
```

### 7. Invocation Patterns

Artifact templates are different from skills. Skills are invoked by trigger phrases that run a specific workflow. Artifacts are invoked by more open-ended prompts that describe what the artifact should do and reference the Project knowledge.

**For recurring artifact regeneration (like weekly dashboards):**

The user (or a routine from I03) sends a prompt like: "Generate this week's marketing status dashboard using the format from the artifact library. Pull inquiry numbers from the daily digest files in [directory], Ahrefs data from the quarterly pulse doc, and content published from the content library."

**For one-off customized artifacts:**

The user describes the specific deliverable. Example: "Build me a pricing calculator for the Barn venue specifically for summer Saturdays. Use the pricing structure from Doc 02, let the user input guest count from 80 to 200, show the all-in cost."

**For iterating on an existing artifact:**

The user asks for changes. Claude regenerates the whole artifact with the changes applied. The invocation is incremental: "Update the weekly dashboard to also show top-performing Instagram posts from the past week."

### 8. The Artifact Library Reference Doc

Every client gets `[client]-artifact-library.md` in the Project knowledge base, covering:

- Overview of artifacts and the 70% rule
- Each artifact template with its full spec block
- Published URLs for customer-facing artifacts
- Org-shared URLs for internal dashboards
- The storage and publishing rules
- A maintenance cadence (quarterly artifact review per I15)

## How to Build This Document

**Step 1: Identify recurring deliverables (10 minutes).** Review Doc 11 and Doc 12 for this client. Look for any deliverable that recurs on a cadence and has structural consistency (same format, different data). Those are artifact candidates.

**Step 2: Look for customer-facing interactive tools (5 minutes).** Any question prospects ask repeatedly that could be answered by an interactive tool? Pricing, availability, service recommendations, FAQ. Those are customer-facing artifact candidates.

**Step 3: Prioritize the starter library (5 minutes).** 3-6 artifacts for the initial setup. Mix of internal and customer-facing if both apply. Order by value and by how often the artifact will be used.

**Step 4: Build each artifact template (30-45 minutes each).**
- Draft the invocation prompt
- Generate the artifact in conversation inside the Project
- Refine iteratively (color, layout, logic, data sources)
- If using persistent storage: publish, then test storage
- If customer-facing: publish and grab the URL
- If internal: share within the organization (Team plan)
- Document in the artifact library reference doc using the spec format

**Step 5: Build the library reference doc (15 minutes).** Upload to Project knowledge base.

**Step 6: Walk the client through each artifact on a call (20-30 minutes).** Show how to invoke, how to iterate, how to find the published URLs, how to interpret the storage rules. Record a Loom.

**Step 7: Update client-tracker.**

## Definition of Done

- [ ] 3-6 artifact templates have been built and tested for this client
- [ ] Each template has a full spec block in the artifact library reference doc
- [ ] Artifacts requiring persistent storage have been published and storage has been verified working
- [ ] Customer-facing artifacts have published URLs and, where applicable, embed codes for the client's website
- [ ] Internal artifacts are shared at the organization level (Team/Enterprise plans)
- [ ] Artifact library reference doc is in the Project knowledge base
- [ ] Client has received a Loom walkthrough covering invocation, iteration, and storage gotchas
- [ ] Client-tracker shows artifacts deployed, their URLs, storage configuration, and maintenance schedule
- [ ] Client has successfully regenerated at least one artifact on their own on the walkthrough call

## Common Failure Modes

**Failure 1: Testing persistent storage without publishing first.** Storage operations silently fail in development and testing. Team members try to use a journal or tracker, add entries, refresh, and find their data gone. Every artifact with storage gets tested only after publishing. I flag this explicitly at step 1 of every artifact build.

**Failure 2: Unpublishing and losing storage data.** Unpublishing an artifact permanently deletes all associated storage data (personal and shared). If a client decides to take down a published pricing calculator that has three months of submission history, that history is gone. I tell clients to export data before unpublishing any artifact with storage.

**Failure 3: Treating every recurring deliverable as an artifact.** Some recurring deliverables are better as markdown documents in the Project knowledge, some as PDFs, some as slide decks. Artifacts are for things that are interactive or visually structured. A text-heavy monthly report that gets emailed as a PDF isn't an artifact candidate.

**Failure 4: Artifactizing production software.** The weekly dashboard as an artifact is fine. The client's main booking system as an artifact is not. Artifacts aren't designed for real production use cases with high traffic, complex state, or compliance requirements. I explicitly redirect "can we build X as an artifact?" conversations when X is really a proper app.

**Failure 5: Forgetting the artifact update problem.** Unlike a static markdown doc, an artifact doesn't update when the underlying voice guide or data structure changes. If Doc 01 changes, artifacts that embed voice need manual regeneration. The quarterly audit in I15 catches drift; I note it in the artifact library doc.

**Failure 6: Incremental edits produce full rewrites.** Claude regenerates the whole artifact for any change, even a small one. This can introduce unintended bugs or changes in code that was working. I set expectations: once an artifact is mostly done, exporting the code to a real codebase is often the right move for ongoing iteration.

**Failure 7: Sharing artifacts publicly that should have stayed internal.** A weekly KPI dashboard with proprietary numbers should be org-shared, not publicly published. I ask clients to approve the distribution mode for every artifact before I publish anything.

**Failure 8: MCP authentication confusion in shared artifacts.** Even when an artifact is shared within a Team organization, each user has to authenticate their own MCP connections. Team members sometimes think "it's shared, so it should just work for me." It doesn't: they each click through their own OAuth. I explain this on the walkthrough.

## Full Worked Example: Audrey's Farmhouse

**Recurring deliverables identified (from Doc 11 and Doc 12):**

- Weekly marketing status (discussed in weekly check-ins)
- Monthly KPI report (internal)
- Quarterly SEO pulse (generated by routine from I03)
- Customer inquiry triage workflow (internal, the GM's daily work)
- Pricing questions from prospects (very common, currently handled via HoneyBook inquiry email back-and-forth)

**Starter library (5 artifacts):**

1. **Weekly Marketing Status Dashboard** — internal, org-shared, no storage, regenerated each Monday by the routine from I03.
2. **Monthly KPI Report** — internal, org-shared, no storage, generated on first Monday of the month.
3. **Seasonal Pricing Calculator** — customer-facing, published with public URL, embedded on audreysfarmhouse.com footer. No storage (no need to save what prospects have submitted; the goal is to route serious ones to HoneyBook). Pulls pricing structure from Doc 02 via Project knowledge.
4. **Vendor Preferred-List One-Pager** — customer-facing, published, sent to booked couples with their welcome packet. Pulls vendor list from Doc 04.
5. **Inquiry Routing Decision Tree** — internal, org-shared, no storage. The GM uses this when she gets a complex inquiry and wants to think through next steps systematically.

**Documented in `audreys-artifact-library.md`:**

Example entry for the pricing calculator:

```markdown
### Seasonal Pricing Calculator

**Type:** Calculator
**Audience:** Customer-facing
**Storage:** None
**Distribution:** Published (public URL)
**MCPs used:** None

**What it does:**
Interactive calculator where prospective clients enter event date, guest count (80-200), and package interest (Classic / Premium / Weekend Package). Returns ballpark all-in pricing range and an invitation to inquire through HoneyBook for an exact quote.

**Invocation prompt (for regeneration if Doc 02 changes):**
"Generate the seasonal pricing calculator artifact following the spec in audreys-artifact-library.md. Pull current rate structures from 02-business-facts-reference.md. Include peak date handling (Memorial Day through Labor Day) and the Saturday premium. End state is a published artifact with public URL."

**Data sources:**
02-business-facts-reference.md (pricing structure, peak dates, package definitions)

**Published URL:**
[URL]

**Embed code:**
Installed in site footer; allowed domain is audreysfarmhouse.com

**Update cadence:**
Per-invocation when Doc 02 changes (which is quarterly or less)

**Maintenance:**
Marketing lead flags when pricing changes in Doc 02; I regenerate and re-publish the artifact. Unpublishing is not an option without losing the embed, so updates are done via new version on the same published artifact when possible, or I create a new one and swap the embed URL on the site.

**Created:** 2026-04-22
**Status:** Active
```

**Persistent storage decision:** None of Audrey's initial artifacts use persistent storage. The pricing calculator doesn't track submissions. The dashboards pull fresh data each time from the Project knowledge and routines. If Audrey's later wants a guest-facing journal-style tool (say, a wedding planning checklist couples can save to), that would be the first artifact with personal storage, and it would be published.

**Distribution map:**

- 2 org-shared (weekly dashboard, monthly KPI, quarterly SEO report — internal)
- 2 publicly published (pricing calculator, vendor one-pager — customer-facing)
- 1 org-shared with no storage (inquiry routing decision tree — internal tool for the GM)

**Loom walkthrough:** 12 minutes covering how each artifact is invoked, the publish-before-storage rule, how customer-facing URLs get embedded on the site, how internal artifacts are accessed by team members, and the quarterly maintenance expectation.

**Client-tracker update:**

```
Artifacts deployed: 5
Internal (org-shared): 3 (weekly dashboard, monthly KPI, inquiry routing)
Customer-facing (published): 2 (pricing calculator, vendor list)
Storage configured: none (initial library)
Embed codes live on site: 2 (pricing calculator, vendor list — in footer and resources page)
Next artifact review: 2026-07-22 (quarterly per I15)
Open items: evaluate whether a guest-facing planning checklist artifact with personal storage makes sense in month 3
```

That's I09 complete, and that wraps Group A (client-facing specs). Ready to produce I10 when you say continue.
