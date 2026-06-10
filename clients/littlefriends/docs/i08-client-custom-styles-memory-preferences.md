# User personalization (I08): [NEEDS CONFIRMATION: program name]

This document configures the per-user personalization layer for each team member on this engagement. It covers Profile Preferences, Custom Styles, Memory posture, Chat Search, and Incognito use. These settings live at the individual user-account level, not at the Project level. The Project Instructions (I01) handle shared, team-wide voice and guardrails; this spec handles what each person configures in their own Claude account.

The constraint shaping this entire document: this is an early childhood program serving families with minors. OCFS records, no-photo family designations, and any conversation identifying a specific child are compliance-sensitive. The Memory and Incognito sections are built around that constraint rather than the spec's general default.

---

## The four personalization layers

The layers stack in this order for every conversation:

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
  └─ Covered in: this document (I08)

Custom Styles (per-user, switchable per conversation)
  ├─ Lives in: Settings > Styles, applied via the style selector
  ├─ Scope: only conversations where the user selects the Style
  ├─ Used for: tone, format, voice, structure of Claude's responses
  └─ Covered in: this document (I08)

Memory (per-user, Project memory isolated from standalone chats)
  ├─ Lives in: Settings > Capabilities > Memory
  ├─ Scope: Claude synthesizes memories from the user's chat history
  ├─ Used for: recurring context about the user's preferences and working style
  └─ Covered in: this document (I08)
```

Profile Preferences load first, then Project Instructions add Project-specific context, then the selected Style adjusts delivery format, then Memory surfaces relevant accumulated context. Getting this stack right is what makes Claude feel consistent across the engagement.

---

## Profile preferences

Profile Preferences are account-wide and carry into every conversation, including conversations outside this Project. The program voice belongs in the Custom Style, not here. What belongs here is each person's professional context and working style.

These are starter drafts. Each user reviews and owns their own version on their setup call. I do not copy the same text to every team member.

**Tova (Twos lead teacher)**

```
I'm the lead teacher for the twos classroom at [NEEDS CONFIRMATION: program name],
an early childhood program. I work with 2-year-olds and their families: developmental
milestone tracking, classroom planning, behavior management, and parent communication.

Be concise. I know early childhood development; don't explain basics.
If my request is ambiguous, clarify before proceeding.
Challenge my approach if you see a flaw. Don't take the easy path silently.
Present tradeoffs with evidence and let me decide.
If you're unsure about something, say so. Don't guess or fabricate.
Web-search before giving product-specific advice or pricing.
```

**Carla (Threes lead teacher)**

```
I'm the lead teacher for the threes classroom at [NEEDS CONFIRMATION: program name],
an early childhood program. I work with 3-year-olds: curriculum planning, developmental
observation, family communication, and classroom management.

Be concise. I know early childhood education; don't explain the basics.
If my request is ambiguous, clarify before proceeding.
Challenge my reasoning if you see a flaw. Don't agree silently.
Present tradeoffs clearly and let me decide.
If you're unsure, say so. Don't fabricate.
```

**Dana (Pre-K lead teacher)**

```
I'm the lead teacher for the Pre-K classroom at [NEEDS CONFIRMATION: program name].
I focus on school readiness, academic foundations, and the preschool-to-kindergarten
transition. I write curriculum, communicate with families, and coordinate with the
broader school.

Be direct and concise. I know early childhood education; don't explain basics.
Challenge my approach when you see a flaw. I prefer friction over false agreement.
Present tradeoffs clearly and let me decide.
Web-search before giving resource or product recommendations.
If you're unsure, say so.
```

**Yael (Aftercare)**

```
I run the aftercare program at [NEEDS CONFIRMATION: program name]. My work covers
activity planning, supervising mixed-age groups, communicating with families at
pickup, and coordinating with classroom teachers at the end of the school day.

Be concise.
If my request is ambiguous, ask before proceeding.
If you're unsure about something, say so rather than guessing.
```

**Linda (Bookkeeper, part-time, JCC)**

[NEEDS CONFIRMATION: Linda is listed as part-time and JCC-affiliated. Confirm whether she has a Claude account in this workspace or whether her bookkeeping work runs through a separate JCC Claude environment. If she is in scope, draft Profile Preferences to her role here and confirm whether any of her bookkeeping threads have compliance exposure that would require incognito. If she is out of scope, remove her from the setup queue and note the exception in the client-tracker.]

---

## Custom style: "[NEEDS CONFIRMATION: program name] Voice"

Each in-scope team member gets one Custom Style built from the Brand Voice Guide (Doc 01). The Style makes Claude produce output that matches the program's voice whether the user is inside the Project or working in a standalone conversation.

The Style instructions below are the compressed 200-400 word version of Doc 01. They are the same for all team members; the goal is a consistent voice across all program-facing content regardless of who is driving.

[NEEDS CONFIRMATION: Doc 01 content is required before the Style instructions can be finalized. The compressed Style needs the following from the Brand Voice Guide: (1) first vs. third person and pronoun rules, (2) sentence case or title case specifications, (3) banned words specific to this program, (4) paragraph length and lead rules, (5) format preferences, (6) any signature phrases or tone markers. Complete the template below once Doc 01 is confirmed.]

**Style instructions template (to be completed from Doc 01):**

```
Write in [first/third person]. Use "[you/we/they]" for the reader.
[Rules on "we" vs. named spokesperson or director.]

Sentence case in body copy. [Uppercase/title case] only for [condition].
No em dashes anywhere.
[Emoji rule for this program.]

Banned words (never use): [list from Doc 01].

Paragraphs: 2-4 sentences, left-aligned.
Lead with the concrete detail or the real constraint. No throat-clearing openers.

Name real tools and resources by name, not generic placeholders.
Acknowledge tradeoffs.
[Program-specific formatting rules: how to refer to age groups (twos, threes, Pre-K),
classroom names, regulatory terms (OCFS), tuition and fee figures if applicable.]
```

**Writing examples to upload during Style creation:**

[NEEDS CONFIRMATION: identify 2-3 pieces of previously produced content that represent the program's best on-voice writing. Candidates: a parent newsletter, a welcome letter, a program description, an enrollment communication. These are uploaded during Style creation to calibrate tone and vocabulary. List the specific pieces here once confirmed so any team member who needs to recreate their Style can locate the same examples.]

**Style name in each account:** "[NEEDS CONFIRMATION: program name] Voice"

**Preview test prompt (use after saving the Style to confirm voice):** "Write a 3-sentence update to families about an upcoming curriculum change in the threes classroom."

**Note on switching Styles.** Users can switch Styles per conversation via the style selector near the chat input. When working on program-facing content, they select "[NEEDS CONFIRMATION: program name] Voice." When doing something unrelated to the program, they can switch to Normal or Concise. The Style applies only to the current conversation and resets at the start of a new one.

**Note on sharing Styles.** There is no built-in mechanism to share a Style across accounts on a Team plan. Each user's Style is configured individually. The reference document at the end of this file includes the full Style instructions so any team member who needs to recreate their Style can do so from a single source.

---

## Memory

### How Memory works

Claude Memory synthesizes the user's chat history into a persistent context summary that surfaces in new conversations. Two scopes exist:

- Global Memory: synthesized from the user's standalone chats (not Project chats). Updates approximately every 24 hours.
- Per-Project Memory: each Project has its own separate memory space. Conversations inside this Project build memory that stays inside this Project only.

**The operative control is incognito, not a per-thread toggle.** Claude has no setting to exclude a single conversation from Memory while leaving other conversations in. The mechanism that keeps a thread out of Memory is running it in incognito. Incognito chats do not persist to chat history and do not contribute to Memory. This is the only control available, and it is the control this program's posture relies on.

### This program's Memory posture

The client profile specifies a conservative posture, keyed to OCFS records, no-photo family designations, and child-identifying information.

**Posture: Memory on for general ops; incognito required for child-specific and compliance-sensitive threads.**

Account Memory stays on for all users who do general operational work: curriculum planning, parent communication drafts, scheduling, admin. This allows Claude to accumulate useful recurring preferences and working context. The discipline is that any conversation naming or identifying a specific child, referencing OCFS records, involving a no-photo family's situation, or touching a specific family's sensitive matter runs in incognito, which keeps it out of both Memory and Chat Search.

### Per-user Memory decisions

| User | Memory (account level) | Incognito discipline |
|---|---|---|
| Tova (Twos lead teacher) | On (recommended, confirm on call) | Required for any child-specific thread |
| Carla (Threes lead teacher) | On (recommended, confirm on call) | Required for any child-specific thread |
| Dana (Pre-K lead teacher) | On (recommended, confirm on call) | Required for any child-specific thread |
| Yael (Aftercare) | On (recommended, confirm on call) | Required for any child-specific thread |
| Linda (Bookkeeper) | [NEEDS CONFIRMATION: confirm scope] | [NEEDS CONFIRMATION: confirm once scope is clear] |

[NEEDS CONFIRMATION: "On" for the four teachers is a recommendation, not a settled fact. Lead-teacher work involves developmental milestone tracking and child observation, which is inherently child-specific. Confirm the On vs. Off decision with each user on the setup call. The "On + strict incognito" approach is defensible for general ops tasks; the question to resolve is whether each user's Claude use is primarily general ops or primarily child-specific documentation. If the latter dominates, Memory Off is the more conservative and simpler choice.]

[NEEDS CONFIRMATION: confirm who the program director or account owner is. The five listed staff are Tova, Carla, Dana, Yael, and Linda. No director or owner appears in keyTeam. The account owner's identity matters for plan governance and, on Enterprise, for org-level Memory enablement.]

[NEEDS CONFIRMATION: confirm plan tier from I07. On Enterprise, the org owner must enable Memory org-wide before individual users can turn it on. Verify org-level Memory status before conducting any per-user setup calls.]

### Monthly Memory audit

Each user reviews Settings > Capabilities > Memory on the first of each month. The audit takes 5 minutes: scan the stored facts, delete anything that should not be there (a one-time speculation that got permanently logged, a child's name that slipped into a non-incognito thread), confirm nothing sensitive has surfaced.

### In-chat Memory commands

I teach these to every team member on the setup call:

- "Remember that I prefer X" stores a specific fact immediately, without waiting for the 24-hour synthesis cycle.
- "Forget what I said about Y" removes a fact in real time.

---

## Chat search

Chat Search lets users ask Claude to find context from previous conversations using natural language. Available on paid plans (Pro, Max, Team, Enterprise). Enabled by default once rolled out to an account.

**Posture: leave Chat Search on for all users.**

This is consistent with the program's Memory posture. Incognito threads, which carry child-specific and compliance-sensitive content, do not persist to chat history and therefore do not appear in Chat Search results. Leaving Chat Search on adds no additional exposure.

**Scope boundaries users should understand:**

- Chat Search reaches all standalone chats outside Projects.
- Within Projects, Chat Search reaches conversations inside that specific Project only.
- Chat Search does not cross Project boundaries or go from a Project into standalone chats.

**Example use:** "What did we discuss about the threes curriculum last week?" or "Find the conversation where I drafted the spring enrollment communication." Child-specific threads that ran in incognito will not appear in results, which is the intended behavior for this program's posture.

---

## Incognito conversations

Incognito chats are temporary conversations that do not persist to chat history and do not contribute to Memory. Opened via the ghost icon in the chat interface. Available to all users on all plans.

**For this program, incognito is not optional for certain thread types. It is required.**

**Always run in incognito:**

- Any conversation that names or identifies a specific child.
- Any thread involving OCFS records, licensing documentation, or regulatory filings that reference a child or family.
- Any conversation about a no-photo family's situation, requests, or instructions.
- Any thread about a specific family's complaint, custody concern, or sensitive personal matter.
- Staff HR or personnel matters a team member would not want in Memory or retrievable via Chat Search.
- Personal conversations that happen to run through the work Claude account.

**General ops (Memory is fine, incognito not required):**

- Curriculum planning and lesson prep not tied to a specific named child.
- Draft parent newsletters and program-wide communications.
- Scheduling, logistics, and general admin.
- Research questions about early childhood pedagogy or regulatory frameworks at a policy level.

**Enterprise and Team note:** Incognito chats are still included in standard data exports and follow the organization's retention policies. Incognito keeps a thread out of the user's own Memory and chat history; it does not shield from the organization's admin tools or export functions. I make this explicit with team members so they do not overestimate what incognito protects against.

---

## Reference document for the Project knowledge base

The following is the paste-ready content for upload to the Project knowledge base as `[NEEDS CONFIRMATION: program name]-user-personalization.md`. It gives team members everything they need to recreate their Style, review their Memory posture, and know when incognito is required.

---

**User personalization reference: [NEEDS CONFIRMATION: program name]**

**The four layers**

- Project instructions: shared, handled at the Project level (I01). Do not duplicate here.
- Profile preferences: your personal, account-wide working style settings. These are yours.
- Custom styles: per-conversation response formatting. Activate "[NEEDS CONFIRMATION: program name] Voice" when doing program-related work.
- Memory: automatic context accumulation. See posture below.

**Your custom style: "[NEEDS CONFIRMATION: program name] Voice"**

To recreate this style in your account: Settings > Styles > Create custom style > Use custom instructions (advanced). Paste the instructions below, upload the writing examples listed, name the Style, and save.

[NEEDS CONFIRMATION: paste confirmed Style instructions here once Doc 01 content is available.]

Writing examples used:

- [NEEDS CONFIRMATION: list writing examples once identified]

Last updated: [NEEDS CONFIRMATION: date]

**Profile preferences: starter template**

Adapt this to your role. These are yours. Do not copy someone else's version.

```
I'm [role] at [NEEDS CONFIRMATION: program name], an early childhood program.
I [one sentence on what your work covers day to day].

Be concise. Don't explain basics I already know.
If my request is ambiguous, clarify before proceeding.
Challenge my reasoning if you see a flaw. Don't silently agree.
If you're unsure about something, say so. Don't guess.
Web-search before giving product-specific advice or pricing.
```

**Memory posture**

- Account Memory: on for general ops.
- Incognito: required for any thread involving a specific child, OCFS records, no-photo families, or sensitive family situations.
- Monthly audit: Settings > Capabilities > Memory, first of each month. Scan the list and delete anything that should not be there.

In-chat commands:

- "Remember that I prefer X" stores a fact immediately.
- "Forget what I said about Y" removes a fact immediately.

**Incognito: when it is required**

Always use incognito for:

- Any conversation naming or identifying a specific child.
- OCFS records, licensing filings referencing a child or family.
- No-photo family situations.
- Specific family complaints, custody concerns, or sensitive personal matters.
- Staff HR matters.
- Personal conversations using the work account.

Not required for general curriculum planning (not tied to a named child), program-wide communications, scheduling, and admin.

**Chat search**

Enabled by default. Use naturally: "What did I draft for the Pre-K welcome letter last month?" Child-specific threads run in incognito won't appear in results.

---

## Operator runbook

**Step 1: Confirm Brand Voice Guide is ready (5 minutes).**

Pull Doc 01 and compress it to the 200-400 word Style instruction format using the template in the Custom Style section above. This compressed version goes into each user's Style and is the only content going in. If Doc 01 is incomplete, pause here.

[NEEDS CONFIRMATION: Doc 01 content required. Style instructions cannot be finalized without it.]

**Step 2: Confirm team scope and account ownership.**

Before scheduling calls, resolve: (a) who the account owner is (no director appears in keyTeam and this must be settled before setup), and (b) whether Linda is in scope for this workspace or operates through a separate JCC Claude environment. Remove out-of-scope users from the setup queue.

[NEEDS CONFIRMATION: program director or account owner identity.]
[NEEDS CONFIRMATION: Linda's scope.]

**Step 3: Confirm plan tier and, if Enterprise, verify org-level Memory enablement.**

[NEEDS CONFIRMATION: plan tier from I07.]

[OPERATOR ACTION (conditional, Enterprise only): if the plan is Enterprise, log into the org admin console and confirm Memory is enabled at the org level before scheduling per-user calls. If it is not enabled, the account owner must turn it on first. Individual users who try to enable Memory without this step will see the option but it will not function.]

**Step 4: Schedule per-user 15-minute setup calls.**

For the in-scope team (Tova, Carla, Dana, Yael, and Linda if confirmed in scope), these can be batched into one session or run as individual calls. Individual calls work better for Profile Preferences, which are personal.

**Step 5: For each user, walk through the four-layer diagram (3 minutes per user).**

Share the four-layer diagram from the top of this document. Confirm each user understands what each layer does before configuring anything. This prevents the most common failure: putting voice rules in Profile Preferences instead of the Style.

**Step 6: Configure Profile Preferences with the user (5-8 minutes per user).**

[OPERATOR ACTION: open the user's Claude account (or have them share screen). Go to Settings > Profile > Personal preferences. Load the relevant starter draft from the Profile Preferences section of this document. Walk through it with the user, adjust for their actual working context, and save.]

These are the user's preferences. Do not copy identical text across team members.

**Step 7: Create the Custom Style for the user (5-10 minutes per user).**

[OPERATOR ACTION: in the user's account, go to Settings > Styles > Create custom style. Select "Use custom instructions (advanced)." Paste the confirmed compressed Style instructions from Step 1. Upload or paste the 2-3 writing examples identified in Step 1. Name the Style "[NEEDS CONFIRMATION: program name] Voice." Save. Run the test prompt: "Write a 3-sentence update to families about an upcoming curriculum change in the threes classroom." If the output is off-voice, adjust the instructions and re-test before closing the call.]

**Step 8: Review Memory posture with the user (3-5 minutes per user).**

[OPERATOR ACTION: confirm Memory is on in the user's account at Settings > Capabilities > Memory. If not, enable it. Walk the user through the posture: Memory is for general ops; incognito is required for any thread involving a specific child, OCFS records, no-photo families, or sensitive family situations. Teach both in-chat commands: "Remember that I prefer X" and "Forget what I said about Y." Confirm they understand there is no per-thread toggle and that incognito is the mechanism.]

**Step 9: Incognito orientation (2-3 minutes per user).**

[OPERATOR ACTION: show the ghost icon in the chat interface. Walk through the required use cases from the Incognito section of this document. Emphasize that for this program, incognito is required (not optional) for child-specific and compliance-sensitive threads. Note the Enterprise/Team caveat: incognito hides from the user's Memory and history but does not shield from org-level admin exports.]

**Step 10: Confirm Chat Search status (1 minute per user).**

[OPERATOR ACTION: confirm Chat Search is active in the user's account. No configuration change needed. Note that incognito threads will not appear in Chat Search results, which is correct for this program's posture.]

**Step 11: Build and upload the reference document (15 minutes, once).**

Once Style instructions are confirmed and all user setups are complete, finalize the reference document from the section above: fill in the Style instructions, the writing examples list, and the date, then upload it to the Project knowledge base.

[OPERATOR ACTION: complete the reference document (confirmed Style instructions, writing examples, last-updated date). Upload the completed file to the Project knowledge base as `[NEEDS CONFIRMATION: program name]-user-personalization.md`.]

**Step 12: Update the client-tracker.**

Record: which users have Styles configured, Memory posture per user, any exceptions (Linda's status, any user who declined Memory enablement), writing examples on file, Style last-updated date, next user personalization audit date (quarterly per I15).

---

## Operator must do (cannot be generated)

The following steps require action inside the client's Anthropic account or inside a third-party admin console, or require confirming facts this document cannot supply. None can be completed by generating this file.

- [ ] Identify and confirm who the program director or account owner is. No director appears in keyTeam; this is unresolved before any setup call can proceed.
- [ ] Confirm whether Linda is in scope for this Claude workspace or operates through a separate JCC Claude environment.
- [ ] Confirm plan tier from I07.
- [ ] (Enterprise only) Log into the org admin console and enable Memory at the org level before per-user setup calls begin. Individual users cannot enable Memory until this is done.
- [ ] Confirm and finalize Doc 01 (Brand Voice Guide) content so the compressed Style instructions can be written. Style creation cannot proceed without this.
- [ ] Identify 2-3 on-voice writing examples (parent newsletter, welcome letter, program description, or similar) to upload during Style creation.
- [ ] For each in-scope user: open their Claude account, go to Settings > Profile > Personal preferences, load and adapt the starter draft from this document to their actual role and working context, and save.
- [ ] For each in-scope user: go to Settings > Styles > Create custom style, select "Use custom instructions (advanced)", paste the confirmed Style instructions, upload the writing examples, name the Style "[NEEDS CONFIRMATION: program name] Voice", save, and run the test prompt to verify voice before ending the call.
- [ ] For each in-scope user: confirm Memory is on at Settings > Capabilities > Memory (after verifying org-level enablement if the plan is Enterprise).
- [ ] For each in-scope user: walk through the incognito requirement and confirm they understand that child-specific and compliance-sensitive threads must run in incognito.
- [ ] For each in-scope user: confirm Chat Search is active.
- [ ] Complete, finalize, and upload the reference document to the Project knowledge base as `[NEEDS CONFIRMATION: program name]-user-personalization.md`.
- [ ] Update the client-tracker with Style status per user, Memory posture per user, any exceptions, writing examples on file, last Style update date, and next quarterly audit date.
