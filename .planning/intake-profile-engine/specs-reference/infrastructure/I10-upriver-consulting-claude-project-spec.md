# Spec I10: Upriver Consulting Claude Project Spec

## What This Spec Is

This spec defines my own master Claude Project: the one I work inside when I'm doing Upriver Consulting work, and the one that holds the 47 specs across the three suites (18 AI Operating System + 14 Content Production + 15 Infrastructure). Every client I take on gets their own Project configured per I01. This Project is different. It's the internal system that powers the consulting practice itself. Without it, each client engagement starts with me re-establishing context from my Obsidian vault or improvising. With it, I open one Project and Claude already knows how I build, how I sell, how I onboard, and which spec applies to which situation.

I treat this Project the way a good developer treats their dotfiles: it's the personal environment that makes everything else faster. It's also the thing that most easily drifts if I don't maintain it. Specs get updated as my business evolves, voice rules change as I learn, skills get retired as better ones replace them. The Project has to stay current or it becomes worse than useless because it represents stale intent.

This spec is for my eyes primarily, but it's also the template a future partner or subcontractor would need if Upriver Consulting ever has more than one senior operator. Annmarie, Louis, Zach, and Megan don't have full access to this Project today, but if the firm grows, they'd each get an appropriate role inside it, and this spec defines how that works.

## Quick Reference

| Field | Value |
|---|---|
| Doc number | I10 |
| Priority | Critical for my own operations; build first in Group B |
| Total length target | One configured Project containing all 47 specs as knowledge |
| Time to produce | 2-3 hours initial setup; ongoing maintenance quarterly |
| Delivery format | Live Claude Project in my Anthropic account |
| File naming | This spec itself is `I10-upriver-consulting-claude-project-spec.md` in the `/mnt/project/` folder |
| Prerequisite | All 47 specs (or the current draft set) exist as markdown files |

## When This Document Gets Built

**Triggers:**

- All three spec suites are drafted or substantially drafted
- I need a single source of truth for consulting operations that I can ask questions against without searching through Obsidian manually
- A new client engagement is about to start and I want the Project ready so I'm pulling from consistent context

**Blocks:**

- Every client engagement I run benefits from this Project because the specs are where the operating model lives
- I11 (Personal Skills Architecture) references the master skill library; I12 (My Routines) references recurring workflows that assume a stable Project exists to target

## Section-by-Section Template

### 1. Project Identity

**Project name:** `Upriver Consulting - Operating System`

**Project description:** `My consulting practice — 47 specs across AI Operating System, Content Production, and Claude Infrastructure suites.`

**Owner:** My personal Anthropic account (Max plan, or Team plan if I've added any subcontractors at partner level).

**Plan implications:** I'm on Max plan today, which means this Project is solo. If I move to Team plan to bring on subcontractor access (unlikely near-term but possible as the firm scales), the Project would need to be shared at appropriate roles and I'd need to segment which parts of the knowledge are universal vs. specific to my principal-level work.

### 2. Custom Instructions

The Project's custom instructions are the system prompt for every conversation I have inside this Project. They're tighter and more opinionated than client Project instructions because this is my tool, built for how I specifically work.

**Block A: Role.**

```
You are the operating assistant for Joshua Brown's consulting practice, Upriver Consulting. The practice pairs professional video and photo production with AI-powered marketing systems for small businesses. Joshua is the sole principal. Subcontractors (Annmarie, Louis, Zach, Megan) handle specialized work under his direction.

You work with Joshua on new engagement setup, client work production, business operations, and the ongoing evolution of the three spec suites. You treat the 47 specs as the authoritative source of truth for how the practice operates.
```

**Block B: Voice.**

```
Write in first person singular when drafting for Joshua. Use "you" when addressing the reader of deliverables. Never use "we" unless quoting a named person.

Sentence case in body copy. UPPERCASE only for H2 eyebrows, buttons, pill badges, nav, table headers. No em dashes anywhere. No emoji ever. Apostrophes in JSX use &apos;.

Banned words (never use): stunning, magical, special day, transform, elevate, unlock, seamlessly, robust, synergy, game-changer.

Paragraphs: 2-4 sentences, left-aligned, leading 1.7. Lead with the problem, the specific constraint, or the real fact. No throat-clearing openers.

Name real tools and vendors by name (HoneyBook, Supabase, Vercel, Claude Code, Ahrefs, Cloudinary, Mux). Never "your CRM" or "various platforms." Name Hudson Valley specifically when it helps. Acknowledge trade-offs. Prices plain USD.

Production-ready over scaffold. When Joshua asks for a deliverable, produce the full thing, not an outline of how to produce it.
```

**Block C: Behavioral guardrails.**

```
Never invent case studies, client names, or outcomes that don't exist. If Joshua hasn't done something yet, treat it as aspirational and flag the gap.

Never quote specific numbers (pricing, hours, conversion rates, contract sizes) from memory. Pull from the specs in the knowledge base or explicitly note the number is a placeholder.

Never draft content that names a competitor (other consultants, other photographers, other marketing firms) without flagging it.

Never generate deliverables for real clients without Joshua's direct request. This Project is for Joshua's internal operations, not client work. Client work lives in each client's own Project.

When Joshua asks a question that has an answer in one of the 47 specs, cite the spec number. When the answer isn't in the specs, note that explicitly.

When Joshua is iterating on a spec, treat the current version as the authoritative one until the new version is saved. Don't blend old and new versions.
```

**Block D: Reference pointers.**

```
For questions about AI consulting operations, check the 18 AI Operating System specs (01-18).
For questions about video or photo production workflows, check the 14 Content Production specs (C01-C14).
For questions about Claude itself, Claude environment setup, or tooling configuration, check the 15 Claude Infrastructure specs (I01-I15).

For voice questions: 01-brand-voice-guide-spec.md
For sales process: 03-sales-process-map-spec.md
For pricing: 02-business-facts-reference-spec.md
For industry-specific playbook: industry-playbook.md
For first-90-days of client engagement: first-90-days-playbook.md
For Upriver website content and structure: consulting-website-content.md
For my personal skills library: I11 spec
For my routines and Cowork workflows: I12 spec
For MCP configuration: I13 spec
For Obsidian integration: I14 spec
```

### 3. Knowledge Base Load

The Project knowledge contains all 47 specs plus the supporting reference docs in my `/mnt/project/` directory. This is a lot more than the 18 docs I load into a client Project, which will definitely put this Project well into RAG mode. That's the intended behavior.

**Load order (spec files, numeric within each suite):**

**Group: AI Operating System specs (18 docs)**
- 01-brand-voice-guide-spec.md through 18-ai-operating-system-sales-document.md

**Group: Content Production specs (14 docs)**
- C01 through C14 (whatever the final numbering becomes; the Content suite is scoped separately)

**Group: Claude Infrastructure specs (15 docs)**
- I01 through I15

**Group: Supporting references from `/mnt/project/`**
- client-tracker.md
- 00-master-file-index.md
- industry-playbook.md
- first-90-days-playbook.md
- consulting-brand-voice.md
- consulting-faq.md
- consulting-outreach-email.md
- consulting-project-instructions.md
- consulting-sales-pdf-content.md
- consulting-service-menu.md
- consulting-website-content.md
- service-menu-addendum.md
- scope-boundaries.md
- measurement-infrastructure-guide.md
- tools-and-scaling-guide.md
- competitive-positioning.md
- phase-2-expansion-strategy.md
- deliverable-templates.md
- general-onboarding-questionnaire.md
- onboarding-questionnaire.md
- outreach-templates.md
- sales-funnel-audit-template.md
- seo-audit-template.md
- subcontractor-agreements.md
- website-build-requirements.md
- venue-ai-operating-system.md
- case-study-template.md
- automation-playbook.md
- Upriver_Consulting___Design_System_Reference.pdf

**RAG behavior to expect.** With 80+ files, Claude operates purely in RAG mode for this Project. The custom instructions' Block D reference pointers are critical; they tell Claude exactly which file to search for which question type, which dramatically improves retrieval quality.

**File format discipline.** All specs are markdown (`.md`) because markdown retrieves cleaner than PDF. The only PDF in the knowledge base is the Design System Reference because it has visual layout that carries meaning. If I produce new reference docs, they go in as markdown unless visual structure is essential.

### 4. What This Project Is Not For

I draw a hard line to prevent scope creep.

**Not for:**

- Client-specific deliverables. Those belong in each client's Project (I01).
- Personal content like photo edits, family calendar, personal finance. Those belong in other Projects or standalone chats.
- Experimental work that might pollute the operating system context. Those go in Incognito Chats or separate Projects.
- Documents that don't relate to running the consulting practice. If it's not a spec, not a supporting reference, not a template, it doesn't belong here.

**Is for:**

- Drafting and iterating on specs
- Answering "how do I do X" questions about running the practice
- Producing engagement-agnostic deliverables (proposal templates, cold outreach adaptations, industry-landing-page drafts)
- Running my own consulting routines (I12) that target the Project

### 5. My Styles, Memory, and Preferences as Applied to This Project

**Custom Style:** "Upriver Voice." The same compressed voice instructions from Block B of the custom instructions, saved as a Style I can invoke in any conversation (inside or outside this Project) where I want that voice on tap. Built from 3 writing examples: the consulting-website-content.md excerpt, a polished blog post, and a cold outreach email I've already hand-edited.

**Profile Preferences (account-wide):**

```
I'm Joshua Brown, principal at Upriver Consulting. I pair professional video and photo production with AI-powered marketing systems for small businesses in the Hudson Valley and beyond. I also own joshuabrownphotography.com for wedding and commercial work.

I prefer production-ready output over scaffolds. When I ask for something, produce the full thing, not a plan to produce it.

Be concise. Don't explain basics I already know.
Challenge my reasoning if my approach has a flaw. Don't silently agree.
Always web-search before giving product-specific advice or pricing. Your training data goes stale.
If you're unsure, say so. Don't guess or fabricate.
If my request is ambiguous, clarify before proceeding.

Writing rules: no em dashes, no emoji, named tools not generic "your CRM," specific numbers not adjectives.

I use macOS primary workstation, Obsidian for personal notes, Claude Code for development, Claude in Chrome for browsing automation, Cowork for desktop workflow automation.
```

**Memory posture:** Enabled globally. My Claude account is predominantly work-focused; Memory's accumulation of my working style, preferences, and patterns is a net positive. I audit Memory monthly per the I14 personal workflow.

**Project Memory behavior:** The Upriver Project has its own memory space, isolated from standalone chats. This means the context built up from drafting specs in this Project doesn't leak into unrelated standalone work. That's the intended design.

### 6. Daily-Use Patterns

How I actually use this Project day-to-day:

**Spec authoring and revision.** Open the Project, start a conversation titled "Revising I08 — memory posture updates," iterate. Claude already knows the voice, the structure, the neighboring specs. When the revision is ready, I save the markdown file to my Obsidian vault and re-upload to the Project knowledge base (replacing the old version).

**Client engagement kickoff prep.** When a new engagement starts, I open a conversation in this Project titled "[New Client] — kickoff prep" and ask Claude to synthesize the relevant specs into a kickoff checklist customized for that client's archetype. Output goes into the new client's Project per I01.

**Deliverable production.** When I'm producing a template or deliverable (a proposal, an industry landing page, a sales PDF adaptation), I do it in this Project because the spec context is already loaded.

**"How do I do X?" queries.** When I'm about to do something I don't do often (offboard a client, price a new service, onboard a new subcontractor), I ask Claude in this Project. Block D's reference pointers route the question to the right spec.

**Routine execution.** Several of my Cowork routines from I12 target this Project specifically — morning spec review, weekly client tracker update, monthly spec audit.

### 7. Maintenance Cadence

The Project drifts if I don't maintain it. My cadence:

**Weekly (10 minutes).** Update client-tracker.md if I've added or completed work with a client this week. Re-upload to the Project.

**Monthly (30 minutes).** Review any specs I've edited locally in Obsidian during the month. Re-upload to the Project to replace stale versions. Spot-check that Claude is pulling correct versions by asking a few test questions.

**Quarterly (2-3 hours, per I15).** Full audit. Every spec opened, reviewed, updated if needed, re-uploaded. Reference pointers (Block D) reviewed for accuracy. Memory audited. Styles reviewed.

**On material changes (as-needed).** When I change my pricing, add a new service line, retire a skill, change subcontractor scope, or launch a new product — anything that materially changes the operating model — the relevant specs get updated immediately and re-uploaded. Not waiting for the next quarterly audit.

### 8. If Subcontractors or Partners Gain Access

Currently, this Project is solo. If I ever give subcontractors access, the model is:

**Annmarie, Louis, Zach, Megan: No access to this Project.** They have their own client-engagement Projects I've added them to. The Upriver master is my internal tool; they don't need to see it.

**Future partner case.** If I bring on a co-principal, they get Can Edit access to this Project. They'd need to operate within the voice and instructions, which the Project enforces. The Project becomes shared governance rather than my solo tool.

**Scenario I deliberately avoid:** Giving any team member Can Use access to see the Project without being able to edit it. Either they're a partner who can contribute, or they have their own Project scoped to what they actually work on.

## How to Build This Document

**Step 1: Confirm all 47 specs exist (or an acceptable subset).** The Project is useful even with drafts, but I don't want half the specs missing or placeholder files.

**Step 2: Create the Project in my Anthropic account (5 minutes).** Name, description, private visibility.

**Step 3: Paste custom instructions (15 minutes).** Four blocks from Section 2, adapted to reflect the current state of the practice.

**Step 4: Upload knowledge base files (30-45 minutes).** All 47 specs plus supporting references, in the order specified in Section 3. Watch the capacity indicator; confirm RAG mode is active (it will be).

**Step 5: Configure my personal Style ("Upriver Voice") (15 minutes).** Settings > Styles > Create custom. Paste compressed voice rules, add 3 writing examples, save.

**Step 6: Set Profile Preferences (5 minutes).** Settings > Profile. Paste the preferences from Section 5.

**Step 7: Confirm Memory posture (2 minutes).** Enabled globally. Nothing special to configure; just confirm.

**Step 8: Test the Project with 5 real questions (20 minutes).**
- "How do I onboard a new wedding venue client?"
- "What's my catch-all hourly rate and why is it set where it is?"
- "Draft a cold outreach email for a small accounting firm."
- "Which Claude Infrastructure spec covers MCP setup?"
- "What's my stance on em dashes in client deliverables?"

Confirm answers are accurate, voice-matched, and cite the right specs. Adjust custom instructions or reference pointers if any query produces weak retrieval.

**Step 9: Set up the monthly and quarterly maintenance reminders.**

## Definition of Done

- [ ] Project named and described correctly in my Anthropic account
- [ ] Custom instructions are saved with all four blocks (role, voice, guardrails, pointers)
- [ ] All 47 specs plus supporting references are uploaded as knowledge
- [ ] RAG mode is active (confirmed via the capacity indicator)
- [ ] "Upriver Voice" Style is saved with 3 writing examples
- [ ] Profile Preferences reflect current state
- [ ] Memory is enabled globally
- [ ] 5 test questions have been run and produced accurate, voice-matched answers
- [ ] Weekly, monthly, and quarterly maintenance cadence is on my calendar
- [ ] The scope boundary ("what this Project is not for") is explicit in my own mind and in the reference pointers

## Common Failure Modes

**Failure 1: Uploading specs without re-uploading when they change.** I edit `I08-client-custom-styles-memory-preferences-spec.md` in Obsidian. I forget to re-upload to the Project. Three weeks later I ask Claude about memory posture and get the outdated version. The monthly maintenance catches this, but the real fix is to re-upload immediately whenever I edit a spec in a way that changes guidance.

**Failure 2: Letting the Project custom instructions drift from the specs.** The custom instructions include voice rules that are also in Doc 01 (Brand Voice Guide). If Doc 01 changes and the instructions don't, the Project applies two different voices depending on which layer is being pulled. I treat the custom instructions as derivative of Doc 01 and update them together.

**Failure 3: Using this Project for client-specific work.** I'm in the Upriver Project drafting something for Audrey's Farmhouse because it's what I had open. The Audrey's-specific content gets mixed into Memory or chat history in the wrong place. Rule: client work goes in the client's Project, always. If I'm starting a new piece of client work, I open the right Project first.

**Failure 4: Overloading the knowledge base with every file I've ever written.** The temptation is to dump everything in because RAG will find the relevant bit. In practice, irrelevant files degrade retrieval. The knowledge base stays tight: specs and supporting references, not random exports or old drafts.

**Failure 5: Not testing after changes.** I edit a spec, re-upload, and assume Claude is now using the new version. The test-question step (from Section 2 of the build) is fast and catches cases where retrieval didn't pick up the update.

**Failure 6: Forgetting Block D reference pointers when I add new specs.** If I add a new spec (say I'm writing the Content Production suite and Content Doc C08 is the automation playbook equivalent), Block D of the custom instructions has to be updated to point at it. Otherwise RAG won't route queries to it correctly.

**Failure 7: Subcontractor access by default.** I get asked by a subcontractor for "access to the Project" when what they need is access to a client's Project. I check what they actually need before granting Upriver master access.

## Full Worked Example: My Actual Upriver Consulting Project

This is my setup as it stands today, April 2026.

**Project name:** `Upriver Consulting - Operating System`

**Description:** `Upriver Consulting operating system. 47 specs across AI Operating System, Content Production, and Claude Infrastructure. Joshua Brown, principal.`

**Plan tier:** Max ($200/month). Solo use. If I bring on a co-principal, I'll convert to Team.

**Custom instructions:** Four blocks from Section 2, currently at ~550 words total. Last updated when I wrote this spec.

**Knowledge base contents (current):**

From `/mnt/project/`:
- All 18 AI Operating System spec files (01 through 18, including the -spec versions)
- All supporting reference docs listed in Section 3 (client-tracker, industry-playbook, first-90-days-playbook, etc.)
- The Upriver Design System PDF

From my infrastructure-specs work (in progress):
- I01 through I09 (current as of this spec being written)

Not yet loaded:
- The 14 Content Production specs (C01-C14) — still drafting the suite
- I10 through I15 (I10 being this spec)
- Any future specs

Total files currently: ~50. Well into RAG mode.

**Custom Style "Upriver Voice":** Saved in my account. 3 writing examples uploaded: an excerpt from consulting-website-content.md, a polished article from joshuabrownphotography.com, and a cold outreach email I refined last month.

**Profile Preferences:** Current version loaded per Section 5.

**Memory:** Enabled. Monthly audit scheduled (first of each month).

**Test questions I've validated work:**

- "How do I onboard a new wedding venue client?" → cites 14-client-onboarding-kit.md and first-90-days-playbook.md
- "What's my stance on em dashes?" → cites 01-brand-voice-guide-spec.md and Upriver Voice Style
- "Which spec covers MCP setup?" → cites I04
- "Draft a cold outreach email for a small accounting firm, 2-3 sentence opener plus ask" → produces a voice-matched draft pulling from consulting-outreach-email.md and outreach-templates.md, no em dashes, no banned words, names specific tools

**Maintenance schedule on my calendar:**

- Weekly: Sunday evening, 10 minutes, update client-tracker
- Monthly: first of the month, 30 minutes, review and re-upload edited specs
- Quarterly: first Monday of quarter, 2-3 hours, full audit per I15

**Scope discipline I enforce:**

- Audrey's client work goes in the Audrey's Farmhouse Project, not here
- Personal conversations go in standalone chats or Incognito
- This Project only sees consulting operations work

**Open items:**

- Load the 14 Content Production specs once they're written (scoped separately from this current work)
- Load I10 through I15 as they get finalized
- Re-upload any spec revised during the suite-writing process itself (several have been updated since I first loaded them)

**Subcontractor access:** None. Annmarie, Louis, Zach, and Megan each get access to specific client Projects per I01 when they're active on those engagements. None have Upriver master access.

That's I10 complete. Ready to produce I11 when you say continue.
