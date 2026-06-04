# Spec I08: Client Custom Styles, Memory, and Preferences Spec

## What This Spec Is

This spec covers the per-user configuration layer that makes Claude feel right to the client from day one. These settings are separate from everything I've covered so far. I01 handled the shared Project, I02 handled skills, I03 handled routines, I04 handled connectors, I05 handled the browser extension, I06 handled Claude Code, I07 handled account governance. This spec handles the five features that live at the user-account level and shape how Claude responds to that specific user across every conversation: Profile Preferences, Custom Styles, Memory, Chat Search, and Incognito Conversations.

Without this spec, each team member configures these features independently with no guidance, which produces inconsistent Claude behavior across the team and surfaces two real risks: memory drift where Claude accumulates facts the client wouldn't want surfaced later, and style inconsistency where the marketing lead's Claude sounds different from the owner's Claude when drafting content from the same voice guide. With this spec, every team member on the engagement gets a matched Style that reflects the client's Brand Voice Guide, a deliberate Memory posture, and clear rules about when to use Incognito. The effect is that Claude sounds like the client's business no matter who on the team is driving.

One thing to be clear about from the start: these settings are account-wide for each user, not Project-scoped. A Style created for an Audrey's team member applies to every conversation that person has in Claude, including non-Audrey's conversations. Memory is per-account and synthesizes across all non-Project standalone chats. Project chats have their own separate memory space. Keeping these layers straight is the whole point of this spec.

## Quick Reference

| Field | Value |
|---|---|
| Doc number | I08 |
| Priority | Medium-high, build after I07 and alongside I01 |
| Total length target | One custom Style per team member mapped to the client's voice, Memory and Preferences guidance per user |
| Time to produce | 30-45 minutes per team member for initial setup plus 15 minutes of documentation |
| Client time required | 10-15 minutes per user to configure, review what's suggested, confirm |
| Delivery format | Live Styles in each user's account, documented Preferences, Memory posture documented, one-page reference in Project knowledge base |
| File naming | `[client]-user-personalization.md` in the Project knowledge base |
| Prerequisite | I01 (Project knowledge populated with Brand Voice Guide), I07 (plan tier confirmed) |

## When This Document Gets Built

**Triggers:**

- The client's Brand Voice Guide (Doc 01) is populated and in the Project knowledge base
- Team members have accepted their Project invites and can log in
- I07 has confirmed plan tier (this affects Memory availability on Enterprise where it requires owner enablement)

**Blocks:**

- Full client onboarding feels incomplete without this layer. Team members get an "AI assistant" experience rather than "our AI assistant" experience if Styles aren't dialed in.
- Any deliverable where consistent brand voice across team members is required relies on matching Styles.

## Section-by-Section Template

### 1. The Four Personalization Layers and Which Does What

Before I configure anything, I make sure the client's team understands the four layers. I put this diagram on the walkthrough call:

```
Project Instructions (per-Project, shared across the team)
  ├─ Lives in: the Project's custom instructions field
  ├─ Scope: every conversation inside the Project
  ├─ Used for: role, voice rules, guardrails, reference pointers
  └─ Covered in: I01

Profile Preferences (per-user, account-wide)
  ├─ Lives in: Settings > Profile > Personal preferences
  ├─ Scope: every conversation this user has, everywhere
  ├─ Used for: professional background, working style, cross-project behavior
  └─ Covered in: this spec (I08)

Custom Styles (per-user, switchable per conversation)
  ├─ Lives in: Settings > Styles, applied via the style selector
  ├─ Scope: only conversations where the user selects the Style
  ├─ Used for: tone, format, voice, structure of Claude's responses
  └─ Covered in: this spec (I08)

Memory (per-user, per-Project isolated from standalone chats)
  ├─ Lives in: Settings > Capabilities > Memory
  ├─ Scope: Claude synthesizes memories from the user's chat history and surfaces them in new conversations
  ├─ Used for: recurring context about the user's preferences, projects, working style
  └─ Covered in: this spec (I08)
```

The layers stack: Profile Preferences load first, then Project Instructions add Project-specific context on top, then the selected Style adjusts delivery format, then Memory surfaces relevant accumulated context. Getting this stack right is what makes Claude feel consistent across the engagement.

### 2. Profile Preferences

Profile Preferences are the account-wide behavioral instructions each user sets once and then carries across every conversation, including conversations outside the client's Project.

**I don't overreach here.** The client's Project Instructions handle the client-specific voice and guardrails. Profile Preferences should handle cross-project, cross-context behaviors each individual team member wants consistent everywhere.

**What I recommend each team member include:**

- Their professional role and context ("I'm the marketing lead at Audrey's Farmhouse, a boutique hospitality brand in the Hudson Valley")
- Working style ("Be concise. Don't explain basics I already know.")
- Behavioral rules ("Challenge my reasoning if my approach has a flaw. Don't silently pick the easy path.")
- Research discipline ("Always web-search before giving product-specific advice or pricing. Your training data goes stale.")
- Honesty rules ("If you're unsure about something, say so. Don't guess or fabricate.")

**What I don't have team members put in Profile Preferences:**

- Client-specific voice rules (those belong in Project Instructions)
- Client-specific reference pointers to knowledge docs (those belong in Project Instructions)
- Anything so long it crowds out the actual preferences (keep Profile Preferences under 300 words)

**Walkthrough mechanic:** I sit with each team member on a 10-minute call, open Settings > Profile > Personal preferences, and help them draft their own preferences. These are their preferences, not mine, and not the client owner's. I don't copy-paste identical preferences to every team member.

### 3. Custom Styles

This is where I do the most deliberate per-client work. Each team member gets a custom Style built from the client's Brand Voice Guide. The Style makes Claude produce output that matches the voice whether the user is inside the Project or having a quick chat in a standalone conversation.

**Why this matters for multi-user clients:** In a Team plan engagement, the marketing lead, GM, and owner all produce content. If each of them configures their own Style differently, their Claude-assisted output drifts in tone. A matched Style across the team anchors the voice.

**How I build the client Style for each user:**

1. Open Settings > Styles > Create custom style.
2. Select "Use custom instructions (advanced)" so I can paste full voice instructions instead of being limited to a starting template.
3. Paste a compressed version of the Brand Voice Guide (Doc 01). Key elements: banned words, sentence length, paragraph length, first-person vs. third-person preferences, format rules, signature phrases to avoid.
4. Add 2-3 writing examples by uploading or pasting samples of good on-voice content the client has previously produced. Styles use these examples to calibrate tone, vocabulary, and rhythm.
5. Name the Style clearly, e.g., "Audrey's Farmhouse Voice."
6. Save.
7. Preview: paste a test prompt and see how Claude responds with the Style active. Adjust if off.

**The compressed Style vs. full Brand Voice Guide.** The full Brand Voice Guide lives in the Project knowledge base and is hundreds to thousands of words. The Style instructions should be 200-400 words, tight, actionable. It's the distilled rules, not the complete treatise.

**Template structure for the Style instructions:**

```
Write in [first/third person, present/past]. Use "[you/we/they]" for the reader.
Never write "[forbidden pronoun/phrase]" unless [condition].

Sentence case in body copy. Use [uppercase/title case] only for [H2 eyebrows, buttons, nav].
No em dashes anywhere.
[No emoji | Emoji sparingly | Emoji avoided] unless [condition].

Banned words (never use): [list the client's specific banned words].

Paragraphs: 2-4 sentences, left-aligned.
Lead with the problem or the concrete fact. No throat-clearing openers.

Name real tools and specifics by name (not generic "your CRM" or "various platforms").
Acknowledge trade-offs.
[Client-specific signature rules, e.g., "Prices plain USD ($500, $2,000/mo), use 'from $X' when there's a floor, never 'starting at'."]
```

**Switching between Styles.** Users can switch Styles per conversation via the style selector near the chat input. If a team member is writing a client-facing draft inside the Project, they select "Audrey's Farmhouse Voice." If they're doing something personal (a quick research question for their own use), they can switch to Normal or Concise. The Style survives through the conversation but resets if they start a new chat.

**Shared Style for the team.** Each user configures their own Style independently. There's no built-in mechanism to share a Style across accounts on a Team plan. So I either: (a) paste the same Style instructions into each user's account during their setup call, or (b) give the client a copy-paste reference so a new team member can recreate it. The reference doc covers this.

### 4. Memory

Memory is the feature that automatically synthesizes the user's chat history into a persistent context summary that surfaces in new conversations. As of March 2026, Memory is available to all plans including free, and Enterprise admins control whether their users can enable it at the org level.

**Memory has two scopes to understand:**

- **Global Memory:** synthesized from the user's standalone chats (not Project chats). Updates roughly every 24 hours.
- **Per-Project Memory:** each Project has its own separate memory space. Context built up in a Project stays with the Project.

**The client-specific Memory decision I make with each team member:**

**Question 1: Enable Memory?**

- Yes for most team members. The convenience of Claude remembering recurring preferences outweighs the drift risk when the user is doing mostly work-related conversations.
- No for users doing sensitive or mixed-context work where Memory drift could surface unwanted facts. Example: if the Audrey's owner uses her Claude account for both work and personal conversations (financial planning, medical research, family stuff), Memory will synthesize across all of it, and those facts can surface in work contexts. For users with that mix, I recommend keeping Memory off and using Incognito liberally.

**Question 2: Which Project gets what?**

Project Memory is isolated per-Project. So the Audrey's Project has its own memory space, and any other Project the user has has its own. I don't have to configure per-Project Memory explicitly; it happens automatically. But I flag the isolation so the client understands that their marketing lead working in the Audrey's Project doesn't pollute memory in whatever personal Projects she may have.

**Question 3: How often should users audit their Memory?**

Settings > Capabilities > Memory shows the full list of what Claude has stored about the user. I recommend a monthly audit: 5 minutes to scan the list, delete anything that shouldn't be there (e.g., a one-time speculation that got permanently logged), and confirm nothing sensitive has surfaced.

**Question 4: Enterprise org-level considerations.**

For Enterprise clients, the org owner controls whether Memory is available to members at all. I recommend Enterprise clients enable Memory org-wide unless their compliance posture specifically forbids it. If they have ZDR configured, Memory interacts with retention rules and warrants a conversation with the Anthropic account team before enablement.

**In-conversation Memory commands:**

- "Remember that I prefer X" tells Claude to store a specific fact immediately (no waiting for the 24-hour synthesis cycle)
- "Forget what I said about Y" removes a fact in real time

I teach team members these commands on the walkthrough because the Settings UI for memory management is fine but these phrases are faster for quick corrections.

### 5. Chat Search

Chat Search is the RAG-based feature that lets users ask Claude to find context from previous conversations. Available on paid plans (Pro, Max, Team, Enterprise) on web, Desktop, and mobile. Enabled by default once rolled out to an account.

**I almost always leave Chat Search on.** Disabling it only makes sense if the user has compliance reasons to prevent any cross-conversation retrieval, which is rare.

**Scope boundaries team members should understand:**

- Chat Search can reach all chats outside of Projects (standalone chats)
- Within Projects, Chat Search can reach conversations inside that specific Project
- Chat Search does not cross Project boundaries or go from a Project into standalone chats

**How team members use it.** Natural language: "What did we discuss about the Barn venue last week?" or "Find the conversation where I worked out the pricing for summer Saturdays." Claude surfaces the relevant prior chats as tool calls and pulls context forward.

### 6. Incognito Conversations

Incognito Chats are temporary conversations that don't persist to chat history and don't contribute to Memory. Available to all users (free, Pro, Max, Team, Enterprise). Opened via the ghost icon in the chat interface.

**When I tell team members to use Incognito:**

- Brainstorming about a sensitive team issue they don't want in Memory
- Client-of-client conversations involving private personal data (a specific wedding couple's situation, a specific parent's concerns at the preschool, a specific homeowner's financial troubles for the contractor)
- Personal conversations that happen to use the work Claude account (salary research, health questions, family planning)
- Testing prompts or trying out ideas they don't want to commit to the record

**When NOT to use Incognito:**

- Any conversation that should benefit Memory (which is most work)
- Any conversation whose output they want to find later
- Any conversation feeding into routines or automations

**Enterprise and Team caveat.** Incognito chats are still included in standard data exports and follow the organization's retention policies. They're not a privacy shield from the client's own admin tools; they only hide from the user's Memory and chat history. I make this explicit with Enterprise clients so team members don't overestimate what Incognito protects from.

### 7. The User Personalization Reference Document

One reference doc covers all of this for the client's team. Lives in the Project knowledge base as `[client]-user-personalization.md`.

```markdown
# [Client] - User Personalization Reference

## The Four Layers
- Project Instructions: shared, handled at the Project level
- Profile Preferences: your personal, account-wide settings
- Custom Styles: per-conversation response formatting, create one matching our voice
- Memory: automatic context accumulation, review monthly

## Your Custom Style: "[Client] Voice"
[Full text of the Style instructions pasted here, so team members can recreate if needed]

Writing examples used: [list]
Last updated: [date]

## Recommended Profile Preferences Structure
[Template for team members to adapt to themselves]

## Memory Posture
- Memory enabled: yes (default) | no
- Monthly audit: review Settings > Capabilities > Memory on the first of each month
- In-chat commands:
  - "Remember that I prefer X" — stores a fact immediately
  - "Forget what I said about Y" — removes a fact

## Incognito Use Cases
[Client-specific examples of when to use Incognito]

## Chat Search
Enabled by default. Use naturally: "What did we discuss about X last week?"
```

## How to Build This Document

**Step 1: Confirm Brand Voice Guide is ready (5 minutes).** Pull Doc 01 and compress it to the 200-400 word Style instruction format. This is the template every team member will use.

**Step 2: Schedule per-user 15-minute setup calls.** For Team plan clients with 4-6 users, this is 4-6 short calls or can be batched into one longer session where each person joins briefly.

**Step 3: For each user, walk through the four-layer diagram (3 minutes).** Make sure they understand what each layer does before configuring.

**Step 4: Configure Profile Preferences with the user (5-8 minutes).** Their personal working style preferences, not the client's voice. I help them draft; they own it.

**Step 5: Create the Custom Style (5-10 minutes).** Paste the compressed voice instructions, add 2-3 writing examples, name it, save it, test with a sample prompt, adjust.

**Step 6: Review Memory posture (3-5 minutes).** Enable or disable based on the Q1-Q3 decisions. Confirm they know where to audit. Teach the in-chat commands.

**Step 7: Incognito orientation (2-3 minutes).** Show the ghost icon, walk through the client-specific use cases.

**Step 8: Build the reference doc (15 minutes total, once).** Upload to the Project knowledge base.

**Step 9: Update client-tracker.** Note which team members have Styles configured, Memory posture per user, any exceptions.

## Definition of Done

- [ ] Every team member has a custom Style named for the client, matching the Brand Voice Guide
- [ ] Each user's Style has been tested with a sample prompt and adjusted if needed
- [ ] Each user has configured Profile Preferences appropriate to their role
- [ ] Memory posture has been decided and configured for each user (enabled or disabled with reasoning)
- [ ] Each user knows the in-chat Memory commands ("Remember that...", "Forget what...")
- [ ] Chat Search status confirmed (typically left on)
- [ ] Each user has been walked through Incognito with at least one client-specific use case
- [ ] User personalization reference doc exists in the Project knowledge base
- [ ] Client-tracker notes Style status, Memory status, exceptions per user

## Common Failure Modes

**Failure 1: Putting the client's voice rules in Profile Preferences instead of a Custom Style.** Profile Preferences are account-wide, affecting every conversation this user has, including conversations for other clients or personal use. The client voice belongs in a Style that the user switches on when working for the client and off when not. I've seen users end up with their Claude rigidly enforcing one client's voice in unrelated conversations because the rules were set at the wrong layer.

**Failure 2: Copy-pasting identical Profile Preferences across all team members.** Each user's professional context, working style, and personal preferences are theirs. The Style is where the shared client voice lives. Profile Preferences are individual.

**Failure 3: Putting everything in one 1,500-word Style instruction.** Styles work better when compressed. If the instructions run long, Claude's adherence drops. I distill Doc 01 down to the operative rules and use writing examples to carry the rest of the nuance.

**Failure 4: Not setting Memory posture deliberately.** Default-on Memory is fine for most users but not for all. For users with mixed personal/work Claude use, Memory creates cross-context drift. I always ask the three Memory questions rather than assuming default is correct.

**Failure 5: Underselling Incognito.** Team members who don't know Incognito exists won't use it when they should. One minute of orientation with a client-specific example (for Audrey's, "when you're talking through a difficult wedding client situation") makes the feature real.

**Failure 6: Forgetting about Project Memory isolation.** Users sometimes think Memory works like ChatGPT's — one global memory across everything. Explaining that Project chats have separate memory from standalone chats is important; it helps them understand why Claude behaves differently in the Project vs. outside it.

**Failure 7: Treating the Style as set-and-forget.** The Brand Voice Guide evolves. When Doc 01 updates, each user's Style needs updating too. The quarterly audit (I15) catches this, but I flag it on the handoff: "if the voice guide changes, I'll push you updated Style text."

**Failure 8: Enterprise Memory org-level gotcha.** On Enterprise, the owner has to enable Memory org-wide before individual users can turn it on. If the owner hasn't done this and team members try to enable Memory, they'll see the option but it won't work. For Enterprise clients, I verify org-level status first.

## Full Worked Example: Audrey's Farmhouse

**Team:** Owner, GM, marketing lead, operations lead. All four get Styles; only the operations lead skips the full setup because her Claude use is light and she mostly consumes outputs from others.

**Compressed Style instructions for "Audrey's Farmhouse Voice":**

```
Write in first person singular when speaking for the venue owner. Use "you" for the reader.
Never write "we" unless quoting a named spokesperson.

Sentence case in body copy. Uppercase only for H2 eyebrows, buttons, pill badges, nav, table headers.
No em dashes anywhere. No emoji.

Banned words (never use): stunning, magical, special day, transform, elevate, unlock, seamlessly, robust, synergy, game-changer.

Paragraphs: 2-4 sentences, left-aligned.
Lead with the concrete detail or the real constraint, not a throat-clearing opener.

Name real tools and vendors by name (HoneyBook, specific local florists, specific caterers).
Acknowledge trade-offs.
Prices plain USD ($500, $2,000/mo), use "from $X" when there's a floor, never "starting at".

When writing dialogue or quotes from the venue, keep cadence natural and specific.
Match the warmth of a grounded host, not the gloss of a marketing brochure.
```

**Writing examples uploaded:** 2 blog posts from audreysfarmhouse.com that had been hand-polished to voice, 1 email template from Doc 08 that represents peak on-voice.

**Style name in each account:** "Audrey's Farmhouse Voice"

**Profile Preferences (sample for the marketing lead):**

```
I'm the marketing lead at Audrey's Farmhouse, a boutique hospitality brand in the Hudson Valley. I produce blog posts, Instagram captions, email newsletters, and Google Business Profile posts.

Be concise. Don't explain basics I already know about marketing.
Challenge my reasoning if my approach has a flaw. Don't silently agree.
When there's a tradeoff between options, present them with evidence and let me decide.
Always web-search before giving product-specific advice, pricing, or recommendations. Your training data goes stale.
If you're unsure about something, say so. Don't guess or fabricate.
If my request is ambiguous, clarify before proceeding.
```

Each of the other team members has their own Profile Preferences adapted to their role. The owner's mentions governance and business strategy. The GM's mentions operations and inquiry handling. The operations lead's is light because her Claude use is light.

**Memory posture:**

- Owner: Enabled. She uses Claude primarily for work. Monthly audit scheduled.
- GM: Enabled. Same reasoning.
- Marketing lead: Enabled. Strong fit for the recurring content patterns.
- Operations lead: Paused. She uses Claude rarely and prefers each conversation start clean. Can re-enable anytime.

**Memory commands taught to all four:** "Remember that..." and "Forget what I said about..."

**Incognito use cases documented for Audrey's team:**

- Owner: when working through difficult personnel situations with staff
- GM: when triaging a delicate wedding-client complaint she doesn't want surfacing in future inquiry routines
- Marketing lead: when doing personal research that happens to use her work account
- Operations lead: when testing ideas she doesn't want to commit

**Chat Search:** Enabled for all four. No client-specific restrictions.

**Reference doc:** `Audrey's Farmhouse - User Personalization Reference.md` uploaded to the Project knowledge base. Each team member has the doc available when they need to recreate a Style or review their Memory posture.

**Client-tracker update:**

```
User personalization (I08):
- Owner: Style "Audrey's Voice" configured, Profile Preferences set, Memory enabled
- GM: Style configured, Preferences set, Memory enabled
- Marketing lead: Style configured, Preferences set, Memory enabled
- Operations lead: Style configured, Preferences set, Memory paused
Style writing examples on file: 3 (2 blog posts, 1 email template)
Last Style update: 2026-04-22
Next user personalization audit: 2026-07-22 (quarterly per I15)
```

That's I08 complete. Ready to produce I09 when you say continue.
