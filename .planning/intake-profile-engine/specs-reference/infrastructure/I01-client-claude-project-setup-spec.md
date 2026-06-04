# Spec I01: Client Claude Project Setup Spec

## What This Spec Is

This is the foundation spec for every client engagement I take on. It defines exactly how a new client's Claude Project gets created, configured, loaded with the 18 AI Operating System documents, and handed over so the client can start working inside it on day one. Without this spec, every client engagement starts with me improvising a setup that drifts from engagement to engagement. With it, every client gets the same environment, the same project instructions, the same knowledge structure, and the same starter conversations. That consistency is what makes the Upriver Consulting operating model repeatable.

I treat the client's Claude Project as the living operating system for their business. The 18 AI Operating System docs sit inside it as knowledge. My custom instructions sit inside it as behavior. The client's team uses it for daily work. I use it when I'm inside their engagement. Every new deliverable I produce for them either lives in that Project or is traceable back to something in it. The Project is not a convenience layer. It is the engagement.

## Quick Reference

| Field | Value |
|---|---|
| Doc number | I01 |
| Priority | Critical, build first |
| Total length target | 1,500-2,500 words of actual client-facing configuration (custom instructions, starter prompts, knowledge index) |
| Time to produce | 45-60 minutes of focused work once client has paid and kickoff call is done |
| Client time required | 15 minutes (account setup, accepting invite, first walkthrough) |
| Delivery format | The Project itself, plus a one-page PDF walkthrough for the client |
| File naming | `[ClientShortName]-claude-project-setup.md` in the client's Obsidian folder, saved as my reference |
| Prerequisite | Signed agreement, completed kickoff questionnaire (Doc 14), Anthropic account tier decision from I07 |

## When This Document Gets Built

**Triggers:**

- Client signs the agreement and pays the first invoice
- Kickoff call is complete and I have the completed onboarding questionnaire
- The client has confirmed which Anthropic plan they're on or which one they need (resolved via I07)
- At least 12 of the 18 AI Operating System docs are drafted in the client's Obsidian folder or my working directory, even if a few are still rough. The Project can be populated iteratively, but the first load needs enough weight that the client gets real value on day one.

**Blocks:**

- Any engagement work that requires the client to interact with Claude directly on the engagement's knowledge base
- I02 (Client Skills Deployment) depends on the Project existing
- I03 (Client Routines and Cowork) depends on the Project existing
- I04 (Client MCP Server Configuration) depends on the Project existing
- I08 (Client Custom Styles, Memory, Preferences) depends on the Project existing
- I09 (Client Artifacts and Deliverable Templates) depends on the Project existing

## Section-by-Section Template

The deliverable here is the configured Project itself, not a document. What I document in my own files is the configuration pattern. The Project has the following components:

### 1. Project Name

Format: `[Client Business Name] - Operating System`

Example: `Audrey's Farmhouse - Operating System`

Never use generic names like "Client Project" or the client's first name alone. The name appears in the Project list and needs to be unambiguous when I have 10+ client Projects active. Business name first, engagement descriptor second.

### 2. Project Description (one-line summary shown in Project list)

Format: `[Industry] | Upriver Consulting engagement started [Month Year]`

Example: `Boutique hospitality venue | Upriver Consulting engagement started April 2026`

### 3. Custom Instructions

This is the system prompt that loads on every conversation inside the Project. I keep it tight because Anthropic's own guidance is clear: long instructions get ignored. The custom instructions have four blocks.

**Block A: Role and scope.** Who Claude is in this Project. Four to six sentences. States the client's business, the engagement's purpose, and what Claude is there to do.

**Block B: Voice and style rules.** Pulled directly from the client's Brand Voice Guide (Doc 01). Banned words list, sentence length, paragraph length, first-person vs. third-person preferences. Five to ten specific rules, not paragraphs of context.

**Block C: Behavioral guardrails.** What Claude should never do inside this Project. Examples: don't draft anything that names a competitor without flagging it, don't quote prices without checking the Pricing Pages document, don't publish without explicit client approval, don't generate content for channels the client hasn't approved.

**Block D: Reference pointers.** Short list telling Claude which knowledge docs to check for which kinds of questions. Example: "For voice questions, check `01-brand-voice-guide.md`. For pricing, check `02-business-facts-reference.md`."

Total custom instructions should fit on one screen of text. If it runs past 600 words, I cut it.

### 4. Knowledge Base Load

The 18 AI Operating System documents, loaded in a specific order so the client sees the most impactful documents first in the Project sidebar. Order:

1. `01-brand-voice-guide.md`
2. `02-business-facts-reference.md`
3. `03-sales-process-map.md`
4. `04-content-library.md`
5. `05-competitor-landscape.md`
6. `06-seo-keyword-strategy.md`
7. `07-faq-bank.md`
8. `08-email-templates.md`
9. `09-social-media-playbook.md`
10. `10-website-audit.md`
11. `11-automation-spec-package.md`
12. `12-measurement-kpi-framework.md`
13. `13-master-build-sequence.md`
14. `14-client-onboarding-kit.md`
15. `15-retainer-engagement-playbook.md`
16. `16-sales-collateral.md`
17. `17-handoff-offboarding.md`
18. `18-ai-operating-system-sales-document.md`

**File format.** Markdown (.md) is preferred for text-heavy documents because it tokenizes cleanly. PDFs get used only when the document has visual layout that matters (the sales document, the one-pager). Each file stays under 30MB, which is never a problem for docs but can come up with the Sales PDF if I've embedded photography.

**Knowledge load awareness.** At 13+ files, Claude switches from direct context loading to RAG search. The 18 docs will trigger RAG mode, which is fine and actually desirable: the client's team can ask a question and Claude retrieves just the relevant sections. What this means in practice is that the custom instructions have to explicitly tell Claude which file to search for which kind of question, because RAG is only as good as the pointer you give it.

**Naming convention for knowledge files.** Keep the numeric prefix (01, 02, 03) so the sidebar stays ordered. Use hyphens not underscores. Always end in `.md` for text docs.

### 5. Access Configuration

**Client ownership.** The Project lives in the client's Anthropic account. They own it. I am added as a collaborator with "Can edit" permissions. This requires the client to be on Team or Enterprise plan because Pro plan does not support shared Projects. If the client is on Pro, I either have the client upgrade, or I document the engagement in my own Project (less ideal, see I07 for the decision tree).

**My access level.** "Can edit" is standard because I need to add and update knowledge files, adjust custom instructions as the engagement evolves, and troubleshoot. I never set myself to "Can use" on an active engagement because I lose the ability to update the knowledge base.

**Client team access.** I add the client's core team at the level appropriate to their role. Owner/founder: "Can edit." Marketing lead: "Can edit." Team members who only consume outputs: "Can use."

**Subcontractor access.** My subcontractors (Annmarie, Louis, Zach, Megan) get added on a per-engagement basis when they're actively working on that client. Role: "Can edit" while active, removed at the end of their scope of work. This is part of I07's governance layer.

### 6. Starter Conversations

I pre-populate the Project with four starter conversations the client can see in their chat history on day one. Each has a clear title and is meant to demonstrate how to use the Project. The client doesn't have to use these, but they exist as examples of what "good prompting against this Project" looks like.

**Starter 1: "Brand voice check"** — I paste a piece of the client's existing copy and ask Claude to rewrite it according to the Brand Voice Guide. Shows the client how the voice rules actually change output.

**Starter 2: "Competitor analysis summary"** — Quick question pulling from the Competitor Landscape doc. Shows how knowledge retrieval works.

**Starter 3: "Weekly status draft"** — Asks Claude to draft a weekly status update template the client can reuse. Produces an artifact.

**Starter 4: "Next blog post topic"** — Pulls from the SEO Keyword Strategy doc and the Content Library to suggest the next blog post topic with a draft outline.

### 7. Walkthrough Deliverable

One-page PDF I hand the client titled `[Client] - How to Use Your Claude Project`. Covers:

- How to open the Project
- How to start a new conversation inside it
- How the knowledge base works (they don't have to paste documents, Claude already has them)
- How custom instructions shape every response
- The four starter conversations and what each demonstrates
- Who to contact (me) when something breaks or they want to add knowledge

## How to Build This Document

**Step 1: Confirm the plan tier (5 minutes).** Check the client's Anthropic account. If they're on Pro and the engagement requires team members, raise it immediately. Default recommendation is Team at $30/seat/month unless the engagement is a solo operator. The plan decision is covered fully in I07; this is just the checkpoint.

**Step 2: Create the Project in the client's account (5 minutes).** Either I do this on a shared screen with the client during the kickoff call, or the client creates it and immediately invites me. I prefer the shared-screen approach because I can walk them through the visibility settings live.

**Step 3: Set visibility (2 minutes).** Private by default. Do not share organization-wide. Add specific users by email one at a time at the right role level.

**Step 4: Write custom instructions (15-20 minutes).** Open a template I keep in my Obsidian vault titled `client-project-custom-instructions-template.md`. Fill in the four blocks (role, voice, guardrails, pointers) using the client's specifics. The voice block pulls directly from Doc 01. The guardrails block pulls from the kickoff questionnaire and anything surfaced in Doc 15 (Retainer Engagement Playbook). Paste into the Project's custom instructions field. Save.

**Step 5: Upload knowledge docs in order (10 minutes).** Upload files one at a time in the numeric order above. Watch for the "2% of project capacity used" indicator to cross over into RAG mode, which happens somewhere around doc 7 or 8 depending on doc length. RAG mode is the goal, not a problem.

**Step 6: Create the four starter conversations (15-20 minutes).** Run each one myself, confirm Claude produces quality output, rename each conversation to the titles above so the client sees them clearly in the chat history.

**Step 7: Generate the walkthrough PDF (10 minutes).** I keep a Canva template for this. Swap in the client's name and Project URL, export, drop into the Project knowledge base as the 19th file titled `how-to-use-this-project.pdf` so it's always findable.

**Step 8: Send handoff email (5 minutes).** Short email to the client: Project is live, here's the link, here's the one-page walkthrough, here's a 15-minute loom of me using it, your first homework is to run all four starter conversations and tell me what you thought.

**Step 9: Log in my own tracker (2 minutes).** Client's Project URL, creation date, access levels, plan tier, go into the client-tracker file.

## Definition of Done

- [ ] Client is on Team or Enterprise plan (or has accepted the trade-offs of staying on Pro)
- [ ] Project exists in the client's account with the correct name and description
- [ ] Custom instructions are saved and cover all four blocks (role, voice, guardrails, pointers)
- [ ] All 18 AI Operating System knowledge docs are uploaded in numeric order
- [ ] I have "Can edit" access; client owner has "Can edit"; team members are added at appropriate levels
- [ ] All four starter conversations have been created, tested, and renamed to their standard titles
- [ ] The one-page walkthrough PDF is uploaded to the knowledge base
- [ ] Handoff email has been sent with Project URL and Loom walkthrough
- [ ] The client has confirmed they can access the Project and opened at least one conversation
- [ ] Client-tracker has been updated with Project URL, creation date, access map, plan tier

## Common Failure Modes

**Failure 1: Setting up on Pro plan with multiple team members expected.** Pro does not support shared Projects. If I don't catch the tier mismatch before Step 2, I end up rebuilding everything in a new account. I always verify tier in Step 1, no exceptions.

**Failure 2: Custom instructions that run to 1,500 words.** Claude ignores bloated instructions. If mine run past 600 words, I cut them. If I feel the urge to add more context, that context goes into a knowledge doc, not the instructions.

**Failure 3: Uploading knowledge docs out of order.** The client sees whatever order I uploaded in the sidebar. If I upload doc 11 before doc 01, the sidebar looks chaotic. I always upload in numeric order, even if it means waiting to upload some files until their numbers come up.

**Failure 4: Forgetting to remove subcontractor access at scope end.** Louis needed access during the n8n build. The build ended three weeks ago. If I don't remove his access, the client's Project has an extra set of eyes on it that shouldn't be there. I07 has the governance cadence for this; I01 is where the access got granted, so I'm responsible for triggering the removal.

**Failure 5: Uploading files as PDFs when markdown would be better.** A 4,000-word Brand Voice Guide uploaded as a PDF costs more tokens and retrieves less cleanly than the same guide as .md. I default to .md for everything except documents where visual layout carries meaning (the Sales PDF, the one-pager, the case study template when it's a real PDF deliverable).

**Failure 6: Assuming the client understands how the Project works after one walkthrough.** Most clients have never used Claude Projects. The one-page PDF and the Loom walkthrough are not optional. I've lost weeks of engagement value on past clients who stopped using the Project after week one because nobody showed them how.

**Failure 7: Skipping the starter conversations.** An empty Project feels cold. Four starter conversations give the client something to open on day one, see real output, and get confident about asking their own questions. When I've skipped this step, adoption has dropped.

## Full Worked Example: Audrey's Farmhouse

**Client:** Audrey's Farmhouse, boutique multi-venue hospitality brand in the Hudson Valley.

**Plan tier decision (Step 1):** Audrey's has a core team of four (owner, GM, marketing lead, operations lead). Team plan at $30/seat/month = $120/month for the four of them. Recommended and approved.

**Project name:** `Audrey's Farmhouse - Operating System`

**Project description:** `Boutique hospitality venue | Upriver Consulting engagement started April 2026`

**Custom instructions (Block A - role and scope):**

> You are the marketing and operations AI for Audrey's Farmhouse, a boutique multi-venue hospitality brand in New York's Hudson Valley. The business books weddings, retreats, and boutique stays across multiple on-property venues. You help the Audrey's team draft content, answer prospect questions, structure workflows, and pull from the engagement's operating system documents for every answer. You work under the direction of the owner and the marketing lead. Joshua Brown at Upriver Consulting built this Project and has ongoing access.

**Custom instructions (Block B - voice rules, pulled from Audrey's Brand Voice Guide):**

> Write in first person singular when speaking for the venue owner. Use "you" for the reader. Never write "we" unless quoting a named spokesperson. Sentence case in body copy. No em dashes anywhere. No emoji. Banned words: stunning, magical, special day, transform, elevate, unlock, seamlessly, robust, synergy, game-changer. Name real tools and vendors by name (HoneyBook, specific local florists, specific caterers). Acknowledge trade-offs. 2-4 sentence paragraphs. No throat-clearing openers.

**Custom instructions (Block C - guardrails):**

> Never quote rental fees, package pricing, or peak-date premiums from memory. Always pull them from `02-business-facts-reference.md` and flag if the figure isn't there. Never draft content that names a competing venue. Never publish to social or email; always produce a draft for human review. When a prospect question requires information about dates, availability, or contracts, always route the answer back to HoneyBook or a human.

**Custom instructions (Block D - reference pointers):**

> For voice questions, check `01-brand-voice-guide.md`. For pricing, capacities, and policies, check `02-business-facts-reference.md`. For the booking funnel and inquiry workflow, check `03-sales-process-map.md`. For photography, past events, and content assets, check `04-content-library.md`. For competitor context, check `05-competitor-landscape.md`. For SEO questions, check `06-seo-keyword-strategy.md`. For prospect questions, always check `07-faq-bank.md` first before generating a new answer.

**Knowledge load:** All 18 docs uploaded in order. Total project capacity shown at ~8% after full load, which puts it solidly in RAG mode. Confirmed Claude retrieves correct sections when tested.

**Access:**
- Owner: Can edit
- GM: Can edit
- Marketing lead: Can edit
- Operations lead: Can use (only needs to reference, not modify)
- Joshua (me): Can edit
- Annmarie (while the website build is active): Can edit, with a calendar reminder set to remove her at the confirmed project end date

**Starter conversations:**
1. "Brand voice check" — Paste a draft description of the Barn venue from an old brochure. Ask Claude to rewrite per the voice rules. Output shows the banned words stripped out, paragraphs tightened, and real tools named.
2. "Competitor analysis summary" — Ask Claude to summarize how Audrey's positioning differs from Buttermilk Falls Inn & Spa and Full Moon Resort. Output pulls from Doc 05.
3. "Weekly status draft" — Ask Claude to produce a weekly status template the marketing lead can fill in. Output is an artifact.
4. "Next blog post topic" — Ask Claude to suggest the next three blog topics based on Doc 06 keyword priorities. Output lists three topics with draft outlines.

**Walkthrough PDF:** `Audrey's Farmhouse - How to Use Your Claude Project.pdf`, one page, uploaded to the Project knowledge base.

**Handoff email:** Sent to owner and marketing lead. Includes Project URL, Loom walkthrough URL (12 minutes), and homework: run all four starter conversations this week, report back at next week's check-in.

**Client-tracker entry:**

```
Client: Audrey's Farmhouse
Project URL: [URL]
Created: 2026-04-22
Plan: Team
Seats: 4 (owner, GM, marketing lead, operations lead) + me + Annmarie (temp)
Annmarie access removes: 2026-06-30 (reminder set)
Knowledge docs loaded: 18/18
Custom instructions version: 1.0
Next review: 2026-07-22 (quarterly per I15)
```

That's I01 complete. Ready to produce I02 when you say continue.
