# Document Production Spec 07: FAQ and Common Questions Bank

## What This Spec Is

This is the production specification for Document 7 of the 12-document AI Operating System. It tells anyone building this document — Joshua, Claude in a fresh project, a subcontractor, or a future hire — exactly what goes in, what each section looks like, what to ask the client to fill it out, and how to know when it's done.

The FAQ and Common Questions Bank is the pre-approved answer layer of the AI Operating System. Every question customers actually ask, answered once, in brand voice, referencing verified facts, with pre-approved deflection language for questions the business doesn't answer publicly. Every chatbot, auto-responder, inquiry reply, and AI-generated conversation pulls from this document for the answer, then adapts it to the specific customer and context.

Without this document, AI tools either refuse to answer customer questions (damaging the experience) or invent answers (damaging trust). With it, the answers are accurate, on-brand, and consistent across every channel — whether the customer is emailing the booking coordinator, chatting on the website, or DMing on Instagram.

This document sits directly on top of the Business Facts Reference (02) and Brand Voice Guide (01). The facts come from Document 02; the phrasing comes from Document 01; this document combines them into customer-facing answers.

---

## Quick Reference

| Attribute | Value |
|---|---|
| **Document number** | 07 of 12 |
| **Priority** | High |
| **Total length target** | 2,500-5,000 words (longer than most other docs — 30-50 questions with full answers) |
| **Total time to produce** | 3-4 hours |
| **Joshua's time** | 2 hours |
| **Claude's time** | 1-1.5 hours |
| **Client's time** | 45-60 minutes (question list confirmation + answer review) |
| **Delivery format** | Markdown file, loaded into client's Claude Project as knowledge |
| **File naming convention** | `[client-slug]-07-faq-bank.md` |
| **Foundation for** | Documents 8 (Email Templates), 10 (Automation Spec Package — all chatbot/auto-responder logic), the Website FAQ page, and every AI-generated customer-facing answer |

---

## When This Document Gets Built

**Phase 2 of engagement, Week 2-3.** Built after the Brand Voice Guide (01), Business Facts Reference (02), and Sales Process Map (03) are complete. Those three documents are inputs — the voice, the facts, and the common questions surfaced during the sales process.

**Triggers:** Documents 01, 02, 03 are in v1.0 final. Secret shopper test has been run (revealed many of the questions). Review mining is complete (reviews contain the questions customers WISH had been asked).

**Blocks:** Any chatbot deployment, any AI auto-responder, Document 10 (Automation Spec Package) — every AI-generated response references this document.

---

## Section-by-Section Template

The finished document follows this exact structure. Every section is required.

### Header Block

```markdown
# [Business Name] FAQ and Common Questions Bank

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** [Month Year]
**Version:** 1.0
**Last review:** [Month Year]
**Next scheduled review:** [Month Year — quarterly default]

**For:** Chatbot answers, inquiry auto-responder content, website FAQ page, customer service email templates, and any AI-generated customer-facing response.

**Companion documents:**
- Document 01: Brand Voice Guide (voice for all answers)
- Document 02: Business Facts Reference (facts behind all answers)
- Document 08: Email Templates (email-specific application of these answers)
- Document 10: Automation Spec Package (where these answers get wired into automated systems)

**Critical principle:** Every question here has a single authoritative answer. When the chatbot, the auto-responder, the coordinator, and the owner all answer the same customer question differently, trust erodes. This document establishes the single answer for each common question, then all downstream systems reference it. Variations in phrasing are fine and encouraged; variations in substance are not.
```

**Word count:** 100-150 words.

---

### Section 1: Categorized Question Inventory

**Purpose:** A complete list of every question this document answers, organized by category, so anyone using the document can find the answer they need quickly.

**Word count target:** 200-400 words. Reference-heavy; not prose.

**Required structure:**

```markdown
## 1. Categorized Question Inventory

Total questions covered: [#]

**Category A: [Name — e.g., "Pricing and cost" or "Availability and booking" or "What's included"]**
- [Q1.1: Question text]
- [Q1.2: Question text]
- [Q1.3: Question text]
- [etc.]

**Category B: [Name]**
- [Q2.1: Question text]
- [Q2.2: Question text]
- [etc.]

[Continue for all categories — typically 5-10 categories total]

### How to use this document

- **Chatbot:** Match the customer's question to the closest Q in this document, return the A adapted slightly for context
- **Auto-responder:** The answer_template field in each Q is the default; adapt tone to match the specific inquiry
- **Email templates:** Pull answers from here as pre-written blocks; customize greeting and close per template
- **Human reps:** Reference when customer asks something and you're not sure what the "official" answer is
```

**Industry-typical categories:**
- **Wedding venue:** Pricing, capacity, booking process, what's included, vendor policies, lodging, catering, logistics (day-of), accessibility, weather/backup plans
- **Contractor:** Pricing/estimates, project process, timeline, warranty, change orders, permits, what we do/don't do, communication, payment terms
- **Preschool:** Tuition, hours/schedule, curriculum/philosophy, enrollment, sick/illness policy, meals, security, staff qualifications, parent involvement
- **Restaurant:** Hours, reservations, menu, dietary accommodations, private events, dress code, parking, gift cards
- **Professional services:** Pricing/engagement structure, timeline, deliverables, communication cadence, confidentiality, team, process, past clients

---

### Section 2-N: The Answers

**Purpose:** The actual questions and answers, organized by category. This is the body of the document.

**Word count target:** 80-200 words per answer × 30-50 questions = 2,400-10,000 words. Most sit in the 2,500-5,000 range.

**Required structure for each answer:**

```markdown
## [N]. [Category Name]

### Q[N.X]: [Question text — use customer phrasing, not internal phrasing]

**Answer (pre-approved):**

[The actual answer. Written in brand voice. References verified facts. Typically 2-5 sentences or a short bulleted list for scannable info.]

**Facts referenced:**
- [Which specific facts from Business Facts Reference this answer uses — Section/subsection]
- [Any other fact sources]

**Voice notes:**
- [Any voice-specific notes for this answer — e.g., "Lean warm for this question; customers asking this are often nervous" or "Keep concise; customer is comparing options"]

**When to deflect to a human:**
- [Conditions under which the automated answer isn't enough and the AI should route to a human — usually high-stakes, emotionally charged, or factually uncertain situations]

**Follow-up prompt (optional):**
[A question the AI can ask next to keep the conversation moving — e.g., "Would you like me to check availability for a specific date?"]

**Don't say:**
- [Things the AI should avoid in this answer — phrases that sound wrong, false precision, overpromises]

---
```

**Critical formatting detail:** Every answer gets all 5 sub-sections (Answer, Facts referenced, Voice notes, When to deflect, Don't say). "Follow-up prompt" is optional but recommended. The structured format is what makes this document AI-operable.

---

### Section N+1: Deflection Templates

**Purpose:** Pre-approved language for questions the business doesn't answer publicly — custom pricing, sensitive topics, or questions that require human context.

**Word count target:** 300-500 words.

**Required structure:**

```markdown
## [N+1]. Deflection Templates

### When to deflect (not answer)

Some questions are better answered by a human. This section provides pre-approved deflection language so the AI can acknowledge the question, signal that it's understood, and route appropriately.

### Deflection template library

**Template: Custom pricing request**
- When it applies: Customer asks for a total cost estimate that depends on variables the AI can't reliably quote (guest count, scope, custom requests)
- Deflection language: [Pre-approved phrasing — e.g., "Pricing for a wedding like yours depends on your guest count, date, and a few other variables. The fastest way to get a real number is a 10-minute call with [Name]. Want me to set that up?"]
- Route to: [Who handles this from here]

**Template: Sensitive or emotional question**
- When it applies: Customer's question touches on something that a scripted response would mishandle — death in the family, sudden cancellation, allergy severity, etc.
- Deflection language: [Pre-approved — e.g., "This is something I'd rather have [Name] follow up on directly. Is [email] the best place to reach you?"]
- Route to: [Who handles this]

**Template: Out-of-scope request**
- When it applies: Customer is asking for something the business genuinely doesn't do
- Deflection language: [Pre-approved — acknowledges the question, clarifies the scope limit, and offers a useful alternative if available]
- Route to: [Often no routing — just a clean decline]

**Template: Information not available**
- When it applies: Customer asks something not covered in this FAQ or in the Business Facts Reference
- Deflection language: [Pre-approved — e.g., "That's a good question and I don't have a definitive answer. Let me have [Name] follow up with you directly — what's the best way to reach you?"]
- Route to: [Who handles this]

[Add 2-4 more deflection templates specific to this business.]

### The deflection principle

An AI that says "I don't know" honestly is better than an AI that invents. Every deflection template preserves trust by acknowledging the question clearly, not faking an answer, and offering a useful next step.
```

---

### Section N+2: Conversation Flow Patterns

**Purpose:** How answers connect to each other when a conversation unfolds over multiple turns. This is the bridge between the FAQ Bank and the Automation Spec Package (Document 10).

**Word count target:** 200-400 words.

**Required structure:**

```markdown
## [N+2]. Conversation Flow Patterns

### The typical customer conversation

A new customer typically asks 3-6 questions before making a decision. The AI should recognize patterns and move the conversation forward, not just answer each question in isolation.

### Common conversation flows

**Flow A: [Flow name — e.g., "Initial inquiry, serious buyer"]**
1. Customer asks: [Typical first question]
2. AI answers with: [Q reference]
3. AI follows up with: [Suggested next question or next step]
4. If customer engages: [Next Q reference]
5. Goal of this flow: [Get to tour scheduling / get to estimate call / etc.]

**Flow B: [Flow name — e.g., "Pricing-first comparison shopper"]**
1. Customer asks: [Typical first question — often "what does it cost"]
2. AI answers with: [Q reference]
3. AI adds context: [Why pricing varies, what's included]
4. AI offers: [Next step — tour, consultation, custom quote]
5. Goal: [Get to the next step]

**Flow C: [Flow name — e.g., "Specific constraint-driven inquiry"]**
1. Customer asks: [Question with a constraint — e.g., "Can you accommodate X?"]
2. AI answers: [Q reference]
3. If yes: [Continue toward commercial conversation]
4. If no: [Clean decline + referral if possible]

### Escalation triggers

When the AI should stop answering FAQs and route to a human:
- [Trigger 1 — e.g., "Customer has asked 4+ questions without moving toward a next step"]
- [Trigger 2 — e.g., "Customer mentions frustration, comparison with other options, or time pressure"]
- [Trigger 3 — e.g., "Customer asks a question that isn't covered in this FAQ"]
- [Trigger 4 — e.g., "Customer mentions specific deliverability concerns like deadline or event date under X weeks out"]
```

---

### Section Final: Maintenance and Versioning

**Purpose:** How this document stays current as the business evolves.

**Word count target:** 150-250 words.

**Required structure:**

```markdown
## [Final]. Maintenance and Versioning

### Quarterly review checklist

- [ ] Re-read every answer. Flag any that have become outdated.
- [ ] Pull the last 90 days of customer inquiries. Identify questions that come up frequently that aren't yet in this document.
- [ ] Check answers that reference the Business Facts Reference for facts that have changed.
- [ ] Review deflection templates — are any routing issues showing up in practice?
- [ ] Confirm conversation flow patterns match current sales process.

### Update immediately when:
- Pricing changes (update every affected answer)
- Team member changes (update every answer that references a specific person)
- Policy changes (update every affected answer)
- A customer question comes up 3+ times that isn't here (add it)

### Version history

| Version | Date | Summary of changes | Reviewer |
|---|---|---|---|
| 1.0 | [Date] | Initial publication | Joshua + [Owner] |
```

---

## How to Build This Document

The full process, in order. Total time: 3-4 hours.

### Step 1: Harvest Questions (60-90 minutes, Joshua)

This is the most important step. Collect actual customer questions from as many sources as possible:

1. **Onboarding questionnaire** (client lists their top customer questions)
2. **Review mining** — read 30+ customer reviews and extract the questions that got answered well (or poorly) in the review
3. **Secret shopper test** — what did you ask when you posed as a customer? What should you have been told?
4. **Inbox mining** — if client has granted access, pull the last 30 inquiry conversations and extract the questions asked
5. **Sales process interview** — during the discovery call, ask: "What are the 5 questions every customer asks?" Then: "What are the 5 questions customers should ask but don't?"
6. **Website existing FAQ** (if one exists) — pull the questions; rewrite the answers later in brand voice
7. **Competitor FAQ pages** — read their FAQs and identify which questions are universal to the category
8. **Google "People Also Ask"** — search the business's primary keyword and pull the questions Google is surfacing
9. **Social media DMs** — if access is granted, review the last 60 days for recurring questions

Target: A raw list of 50-80 candidate questions.

### Step 2: Dedupe and Categorize (30 minutes)

From the raw list of 50-80, remove duplicates (many will be the same question phrased differently) and organize into categories. Target: 30-50 unique questions organized into 5-10 categories.

**Critical:** Pick the customer phrasing for each question, not the internal phrasing. Customers ask "how much does this cost?" not "what is our pricing structure?" The question text matters for chatbot matching.

### Step 3: Draft Generation (60-90 minutes, Claude)

In the consulting Claude Project, run this prompt:

```
Generate an FAQ and Common Questions Bank for [Business Name] using Document Production Spec 07 as the structure. Industry: [industry].

Source materials:

[Paste: the categorized 30-50 question list from Step 2]

[Paste: Document 01 — Brand Voice Guide]

[Paste: Document 02 — Business Facts Reference (full document)]

[Paste: Document 03 — Sales Process Map (relevant sections on sales conversations)]

[Paste: any existing FAQ content from the website]

For each question, produce the full structured answer block (Answer, Facts referenced, Voice notes, When to deflect, Don't say, optional Follow-up prompt). Answers should be 80-200 words each.

Critical: every fact in every answer must be traceable to a specific section of the Business Facts Reference. If a fact isn't in Document 02, either flag it for the client to confirm or don't include it.

Brand voice rules from Document 01 apply to every answer — first-person present tense, no em dashes, none of the banned words, real numbers over adjectives.

Section [N+1] (Deflection Templates) needs at least 4 templates covering custom pricing, sensitive questions, out-of-scope requests, and information not available.

Section [N+2] (Conversation Flow Patterns) needs at least 3 typical flows with clear escalation triggers.
```

### Step 4: Joshua Review (45-60 minutes)

Read every answer. For each:

- Is the answer factually accurate per Document 02?
- Is the brand voice right per Document 01?
- Are banned words avoided? Any em dashes? Any generic marketing language?
- Is the answer the right length (not too short, not too padded)?
- Does the "Don't say" list capture the actual failure modes?
- Do the voice notes add useful guidance?

Edit directly. Keep answers sharp.

### Step 5: Client Review (45-60 minutes client time)

Send to client with this email:

```
Subject: FAQ Bank — every question your customers ask, with pre-approved answers

Attached: the FAQ and Common Questions Bank for [Business Name].

This document is the single source of truth for every customer question that gets answered by your chatbot, auto-responder, email templates, or any AI-generated reply. It's longer than most of the other documents because it covers 30-50 questions in full.

Three asks:

1. Read every Q. Tell me if any questions are missing that you hear often — I'll add them.
2. Read every A. Tell me if any answer is wrong on facts or wrong in voice.
3. Read the deflection templates (Section [N+1]). Confirm the "route to" column matches who actually handles these today.

Once you sign off, this document becomes the basis for every automated system we build. When we deploy the chatbot, this is what it reads from. When we build the auto-responder, this is what it pulls.
```

### Step 6: Final Edits and Delivery (30 minutes)

- Apply client edits (usually 5-10 answer adjustments)
- Verify cross-reference to Documents 01 and 02 is clean
- Save with naming convention `[client-slug]-07-faq-bank-v1.0.md`
- Upload to client's Claude Project as knowledge

### Step 7: Wire Into Operational Systems (variable, depends on scope)

This step technically belongs to Document 10 (Automation Spec Package) but is the moment the FAQ Bank becomes operational:

- Chatbot system prompt references this document
- Auto-responder templates pull answers from here
- Customer service email templates cite specific Q numbers
- Website FAQ page is populated from this document

---

## Definition of Done

This document is finished when all of the following are true:

- [ ] Total of 30-50 questions covered across 5-10 categories
- [ ] Every answer includes all 5 required sub-sections (Answer, Facts referenced, Voice notes, When to deflect, Don't say)
- [ ] Every answer references specific facts from Document 02 (traceability)
- [ ] Every answer is written in brand voice per Document 01 (no banned words, voice attributes present)
- [ ] Deflection Templates section includes at least 4 scenarios with pre-approved language
- [ ] Conversation Flow Patterns section includes at least 3 typical flows with escalation triggers
- [ ] Maintenance and Versioning section is complete
- [ ] Cross-reference pass against Brand Voice Guide and Business Facts Reference complete
- [ ] Client has reviewed every question and answer
- [ ] File saved with correct naming convention and uploaded to Claude Project

---

## Common Failure Modes

**Failure 1: Questions are internal phrasings, not customer phrasings.** The question list reads like "What is our vendor policy?" instead of "Can I bring my own caterer?" The chatbot then can't match real customer questions. Fix: always use the customer's actual language in the question text.

**Failure 2: Answers are too long.** A 400-word answer gets ignored or skimmed. Customers want specific, concise info. Fix: target 80-200 words per answer; use short bullet lists for scannable info.

**Failure 3: Answers are too corporate.** The voice drifts into marketing-speak because the writer forgot to apply the Brand Voice Guide. Fix: every answer should pass a voice spot-check against Document 01's voice attributes.

**Failure 4: "Don't say" lists are empty.** This sub-section reveals the failure modes, so the AI avoids them. Empty means the writer didn't think hard enough. Fix: every answer must have at least 1-2 "Don't say" items, even if they're small.

**Failure 5: Deflection language feels like a dismissal.** "For pricing, please contact our sales team" feels like a brush-off. Good deflections acknowledge the question, explain the reason for the deflection, and offer a clear, helpful next step. Fix: write deflection templates that preserve warmth and move the conversation forward.

**Failure 6: No conversation flow patterns documented.** Without flow guidance, the AI answers each question in isolation and never moves toward a conversion. Fix: Section [N+2] is required; it's what makes the FAQ Bank operationally useful.

**Failure 7: Document gets out of sync with Business Facts Reference.** Prices change in Document 02 but not here. The chatbot then quotes old prices. Fix: every quarterly review includes a cross-reference pass to verify fact alignment.

---

## Worked Example: Audrey's Farmhouse FAQ and Common Questions Bank

The following is a complete sample showing the format. The example includes 15 representative questions across the categories; a full production version would include 30-50.

---

# Audrey's Farmhouse FAQ and Common Questions Bank

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** April 2026
**Version:** 1.0
**Last review:** April 2026
**Next scheduled review:** July 2026

**For:** Chatbot answers, inquiry auto-responder content, website FAQ page, customer service email templates.

**Companion documents:**
- Document 01: Brand Voice Guide
- Document 02: Business Facts Reference
- Document 08: Email Templates
- Document 10: Automation Spec Package

**Critical principle:** Every question here has a single authoritative answer. Variations in phrasing are fine; variations in substance are not.

---

## 1. Categorized Question Inventory

Total questions covered: 34 (representative 15 shown below)

**Category A: Pricing and cost**
- Q1.1: How much does a wedding at Audrey's cost?
- Q1.2: What's included in the venue fee?
- Q1.3: Is catering included?
- Q1.4: How much is the bar?
- Q1.5: Do you offer discounts for smaller weddings?

**Category B: Availability and booking**
- Q2.1: What dates do you have available?
- Q2.2: How far in advance should we book?
- Q2.3: What's the deposit to hold our date?

**Category C: What's included / the weekend format**
- Q3.1: What does the weekend format actually mean?
- Q3.2: Is the rehearsal dinner included?

**Category D: Catering and food**
- Q4.1: Can we bring our own caterer?
- Q4.2: Can you accommodate dietary restrictions?

**Category E: Lodging**
- Q5.1: How many rooms do you have on site?
- Q5.2: Can all our guests stay on site?

**Category F: Day-of logistics**
- Q6.1: Is there a day-of coordinator?

---

## 2. Pricing and Cost

### Q1.1: How much does a wedding at Audrey's cost?

**Answer (pre-approved):**

Our Saturday venue rate in peak season (late May, June, September, October) is $14,500. Friday or Sunday in peak is $11,500. Shoulder season Saturdays (April, early May, early November) are $11,000. Catering is in-house at $145-$185 per person, and bar packages start at $42 per person for beer and wine. Lodging beyond the farmhouse is $295-$395 per room per night.

Those are the per-component numbers. The best way to get an actual all-in total for your specific wedding is a 10-minute call where we can factor in your guest count, date, and lodging needs. Want me to check what dates are available?

**Facts referenced:**
- Doc 02, Section 4 (Pricing): venue rates by day and season
- Doc 02, Section 4: catering and bar pricing
- Doc 02, Section 5: lodging pricing

**Voice notes:**
- Customers asking this are often comparing multiple venues. Lead with real numbers (differentiator vs. opaque competitors), then offer the path to an accurate all-in total.
- Keep warm but matter-of-fact. Transparency is a positioning advantage.

**When to deflect to a human:**
- If customer asks for a specific all-in number for a specific guest count and date, offer to set up the 10-minute call rather than guessing
- If customer mentions a very specific budget range that's below floor, route to the booking coordinator

**Follow-up prompt:**
"Want me to check what dates are available in your timeframe?" OR "What date were you thinking?"

**Don't say:**
- "Starting at $14,500" — use "Our Saturday venue rate is $14,500"; "starting at" implies hidden fees
- Any of the banned words: "stunning," "magical," "transform," etc.
- "Pricing varies significantly" — vague and generic; give real numbers

---

### Q1.2: What's included in the venue fee?

**Answer (pre-approved):**

The Saturday weekend package includes venue access from Friday afternoon through Sunday morning. That's the full property — the farmhouse, the barn, the ceremony lawn, the kitchen, the grounds. You get use of the kitchen for your rehearsal dinner (whether that's catered by us or self-catered), the farmhouse for you and your immediate family to stay in Friday and Saturday nights, and a day-of coordinator (Megan) who runs your wedding day.

It does not include catering, bar, additional guest lodging beyond the farmhouse, florals, photography, music, or officiant. Catering is in-house and priced separately per person. Bar is in-house too.

**Facts referenced:**
- Doc 02, Section 3 (What We Sell): Saturday Wedding Weekend package
- Doc 02, Section 2 (People): Megan's role

**Voice notes:**
- This question often comes right after pricing. Customers want to understand whether the $14,500 is "all in" or the start of more fees.
- Be explicit about both what's included and what's separate — clarity prevents downstream frustration.

**When to deflect:**
- Never — this is a foundational FAQ that should always be answered directly

**Follow-up prompt:**
"Want me to walk through what a typical all-in wedding here looks like by component?"

**Don't say:**
- "Everything is included" (false)
- "The venue fee covers your entire wedding" (false)
- Any implication that catering is in the venue fee

---

### Q1.5: Do you offer discounts for smaller weddings?

**Answer (pre-approved):**

Yes. We have a 10% discount on venue rental for weddings with 50 guests or fewer (doesn't apply to the weekday microwedding format, which is already priced for smaller events). Our weekday microwedding package is $4,500 — a 12-hour day access including the ceremony space, farmhouse for you and immediate family overnight, capped at 30 guests.

We don't price-match other venues, and we don't discount for cash payment.

**Facts referenced:**
- Doc 02, Section 4 (Pricing): discount structure
- Doc 02, Section 4: pricing exceptions

**Voice notes:**
- Customers asking this are often budget-sensitive; answer directly without making them feel judged for asking
- Offer the weekday microwedding as a proactive alternative — it addresses the underlying need

**When to deflect:**
- If customer asks for custom discounting beyond the published structure, route to the booking coordinator

**Follow-up prompt:**
"Want me to share more about the weekday microwedding format?"

**Don't say:**
- "We don't discount" (we do, for small weddings — be accurate)
- "Just ask and we'll see what we can do" (creates false expectation)

---

## 3. Availability and Booking

### Q2.1: What dates do you have available?

**Answer (pre-approved):**

I can check availability for you. What dates were you considering? Our calendar opens 18 months out, so if you're looking further out than that, I can note your interest and follow up once the calendar opens.

Peak Saturdays (late September and October especially) are usually 70-80% booked a year out. Shoulder season and weekdays have much more flexibility.

**Facts referenced:**
- Doc 02, Section 5 (Capacity/Scope): booking lead time
- Doc 03, Section 8 (Seasonality): peak booking patterns

**Voice notes:**
- Conversational; invites the next step (share their dates)
- Be honest about how booked peak Saturdays get — gives the customer useful information about timing

**When to deflect:**
- Once customer shares specific dates, check the actual calendar rather than guessing

**Follow-up prompt:**
The answer itself is the prompt — asking for dates.

**Don't say:**
- "We have lots of availability" (false at peak)
- "Let me connect you with our team" (unnecessary friction — we can check dates directly)

---

### Q2.2: How far in advance should we book?

**Answer (pre-approved):**

Most of our couples book 12-18 months out. Peak Saturdays (late September and October) go fastest; those are often 70-80% booked a year in advance. Shoulder season (April, early May, early November) and Fridays/Sundays have much more flexibility — often bookable 6-9 months out.

The soonest we'll take a date is 60 days out for off-season and 90 days out for peak or shoulder, assuming availability. Planning a wedding under 90 days isn't impossible but it's tight.

**Facts referenced:**
- Doc 02, Section 5 (Capacity): typical and minimum booking lead times
- Doc 03, Section 8 (Seasonality): peak Saturday booking patterns

**Voice notes:**
- Informational; customers asking this are in early research mode

**When to deflect:**
- Never — standard informational question

**Follow-up prompt:**
"Do you have a date in mind, or are you still figuring out timing?"

**Don't say:**
- Any implication that "soon" is fine if it isn't
- Generic "book as early as possible" advice

---

## 4. What's Included / The Weekend Format

### Q3.1: What does the weekend format actually mean?

**Answer (pre-approved):**

You get the property from Friday afternoon through Sunday morning. Most couples use it this way:
- **Friday afternoon/evening:** Setup with vendors, rehearsal, rehearsal dinner at the farmhouse or in the kitchen
- **Saturday:** Wedding day — ceremony on the lawn or in the barn, reception in the barn
- **Sunday morning:** Brunch, farewell

The farmhouse sleeps seven rooms worth of immediate family Friday and Saturday nights. If you want more guests staying on-site, the cottage and carriage house add another 16 rooms.

It's less about a specific schedule and more about having the property without having to leave after the reception ends.

**Facts referenced:**
- Doc 02, Section 3: Saturday Wedding Weekend details
- Doc 02, Section 5: lodging breakdown
- Doc 02, Section 6: setup/teardown timing

**Voice notes:**
- This is a differentiating answer — take the time to paint the full picture
- Customers often haven't conceived of "wedding" as "weekend"; help them see it

**When to deflect:**
- Never — this is an identity-level question

**Follow-up prompt:**
"Want me to share a couple of real-weekend example schedules?"

**Don't say:**
- "Magical weekend experience" or any romance-overload language
- Minimize the value — this is a real differentiator; say it clearly

---

## 5. Catering and Food

### Q4.1: Can we bring our own caterer?

**Answer (pre-approved):**

No. All catering is in-house through our kitchen. This is by design — we have a full commercial kitchen and a chef on staff, and keeping catering in-house is the only way we can guarantee the food quality our couples expect.

Most Hudson Valley wedding venues are BYO caterer from a preferred list. We're one of the few with in-house catering, and it consistently comes up as the #1 thing couples praise in reviews. If outside catering is a requirement for you, we're not the right venue. If in-house catering is a relief (fewer vendors to coordinate, one point of contact, confirmed quality), this is exactly what you want.

**Facts referenced:**
- Doc 02, Section 3: core offerings (in-house catering only)
- Doc 02, Section 6: vendor policies (catering)
- Doc 02, Section 7: differentiators (in-house kitchen)

**Voice notes:**
- Be direct about "no" without being dismissive
- Reframe the "no" into the positive (fewer vendors, quality guarantee)
- This is a hard-no question; don't soften it into ambiguity

**When to deflect:**
- If customer pushes back and says they have a family friend caterer who really wants to do their wedding, route to the booking coordinator for a judgment call (rare exceptions exist for very specific circumstances like cultural catering needs)

**Follow-up prompt:**
"Want me to share our catering menu or talk through how menu tastings work?"

**Don't say:**
- "We can discuss it" (we generally can't — this is a policy, not a negotiation)
- "We have a great kitchen" (weak marketing-speak; let the "#1 praised feature" do the selling)

---

### Q4.2: Can you accommodate dietary restrictions?

**Answer (pre-approved):**

Yes — vegan, vegetarian, gluten-free, and common allergies (nuts, dairy, shellfish) are standard accommodations. We handle them for every wedding.

Kosher and halal we can do in a limited way — the kitchen isn't certified, but we can source certified items and prepare them carefully. For a fully kosher wedding requiring a certified kosher kitchen, we're not the right venue. For a wedding with some kosher-observing guests or kosher-style preferences, we can make it work.

Allergies with life-threatening severity (e.g., severe peanut allergies in the family) we treat with the seriousness they deserve — the chef reviews the menu personally, cross-contamination protocols are followed, and we confirm with the affected guest's family before the wedding.

Any restrictions need to be flagged 30 days before the wedding so the menu can be finalized.

**Facts referenced:**
- Doc 02, Section 6 (Operations/Accessibility): dietary accommodations
- Doc 02, Section 6: allergy protocols

**Voice notes:**
- Customers asking this often have a family member with a restriction — take the question seriously
- Be honest about the kosher limitation; don't overpromise

**When to deflect:**
- For any question involving severe or life-threatening allergies, route to the chef via the booking coordinator after acknowledging the question

**Follow-up prompt:**
"Would it help to know how we handle the menu tasting for your specific situation?"

**Don't say:**
- "We accommodate all dietary needs" (false; be specific about kosher/halal limitations)
- Generic reassurance without acknowledging the real protocols

---

## 6. Lodging

### Q5.1: How many rooms do you have on site?

**Answer (pre-approved):**

23 rooms across three buildings:
- **Farmhouse:** 7 rooms (included in the venue fee for you and immediate family)
- **Cottage:** 8 rooms ($295/night)
- **Carriage house:** 8 rooms ($395/night)

Total capacity with double occupancy is 46 guests on-site.

This is unusual for the Hudson Valley — most boutique venues have 0-12 on-site rooms. Having 23 means a significant portion of your wedding party and family can stay on property for the whole weekend.

**Facts referenced:**
- Doc 02, Section 5: lodging breakdown
- Doc 02, Section 7: differentiator (23 rooms)

**Voice notes:**
- Use the real number and the real comparison to position the differentiator
- Don't oversell — 23 rooms for a 180-guest wedding still means most guests stay off-site; be honest about that trade-off

**When to deflect:**
- Never — standard informational question

**Follow-up prompt:**
"Want me to share how couples typically handle the remaining guests who aren't on-site?"

**Don't say:**
- "Plenty of room" (vague)
- "Your guests will love the accommodations" (marketing-speak)

---

## 7. Day-of Logistics

### Q6.1: Is there a day-of coordinator?

**Answer (pre-approved):**

Yes. Megan runs your wedding day end to end — vendor coordination, timeline management, solving problems before they become your problems. She's on staff here (not a separately hired coordinator), and she's part of the venue rental — not an add-on.

You'll meet Megan 3 months before the wedding for your planning walkthrough, and again 30 days out for the final walkthrough. On the wedding weekend she's on-site Friday and Saturday.

For context: at most Hudson Valley venues, you have to hire an outside day-of coordinator for $1,500-$3,500. Megan is included.

**Facts referenced:**
- Doc 02, Section 2: Megan's role
- Doc 02, Section 3: weekend package includes day-of coordination
- Doc 02, Section 7: differentiator (day-of coordinator included)

**Voice notes:**
- Megan is named in 50% of reviews — lean into the named personal identity, not a generic "day-of coordinator" frame
- Price anchoring ($1,500-$3,500 at other venues) is useful context for couples still comparing

**When to deflect:**
- If customer asks detailed questions about Megan's specific services vs. a full planner, route to the booking coordinator to avoid scope misunderstanding

**Follow-up prompt:**
"Have you worked with a wedding planner before, or is Megan going to be your primary planning contact?"

**Don't say:**
- "We have an excellent day-of coordinator" (generic; use Megan's name)
- "Megan handles everything" (oversells scope — she's day-of, not full planning)

---

## 8. Deflection Templates

### When to deflect (not answer)

Some questions are better answered by a human. These deflections preserve trust by acknowledging the question clearly and offering a useful next step.

### Deflection template library

**Template: Custom pricing total request**
- When it applies: Customer asks for a total all-in cost for a specific wedding vision that depends on multiple variables
- Deflection language: "To get an accurate all-in number, I need to factor in your guest count, date, catering preferences, and lodging needs. The fastest way is a 10-minute call where we can do the math together. Would [Booking Coordinator] be welcome to reach out?"
- Route to: Booking coordinator

**Template: Sensitive question (cancellation, family situation, special circumstances)**
- When it applies: Customer's question involves a sudden change, a sensitive family situation, or a request that needs empathetic handling
- Deflection language: "This is something I'd rather have [Name] respond to directly rather than giving you an automated reply. Is [email] still the best way to reach you? She'll follow up within the day."
- Route to: Booking coordinator (or owner for severe situations)

**Template: Out-of-scope request**
- When it applies: Customer is asking for something we genuinely don't do (destination weddings, corporate events, non-wedding events)
- Deflection language: "We focus exclusively on weddings here at Audrey's, so we're not the right fit for [X]. If [adjacent thing], [Nearby venue/contact] might be a great option. Let me know if there's something else I can help with."
- Route to: No routing typically; clean decline

**Template: Information I don't have**
- When it applies: Customer asks something that isn't covered in this FAQ or the Business Facts Reference
- Deflection language: "That's a good question and I don't have a reliable answer off the top of my head — let me have [Name] follow up directly so you get the right information. What's the best way to reach you?"
- Route to: Booking coordinator

### The deflection principle

An AI that says "I don't know, let me get you to someone who does" preserves trust. An AI that invents an answer erodes it. Deflections are not failures; they're the right response to the wrong question.

---

## 9. Conversation Flow Patterns

### The typical customer conversation

Most couples ask 4-6 questions before making a commitment to schedule a tour. The AI's job across those 4-6 turns is to answer accurately AND move the conversation toward the next step (tour scheduling).

### Common conversation flows

**Flow A: Initial inquiry, serious buyer**
1. Customer: "What's your availability for [date]?"
2. AI answer: Q2.1 + checks actual calendar
3. AI follows up with: "Want me to share pricing for that date?" (yes usually)
4. AI answer: Q1.1 + Q1.2
5. AI follows up with: "Want to schedule a tour?" → lands on conversion

**Flow B: Pricing-first comparison shopper**
1. Customer: "How much does a wedding here cost?"
2. AI answer: Q1.1
3. Customer reaction: "That's more than I expected" OR "That seems reasonable"
4. If expensive reaction: AI follow up with Q1.5 (microwedding option) OR Q3.1 (what's included, reframing value)
5. If reasonable reaction: AI follow up with Q2.1 (check availability) → lands on tour

**Flow C: Weekend format education**
1. Customer: "What's included in the weekend thing?"
2. AI answer: Q3.1
3. AI follow up: "Want me to share a real example weekend schedule?"
4. Customer engagement → AI shares a real wedding weekend flow example (from content library)
5. AI follow up: "Want to see the property in person?"

### Escalation triggers

Route to a human when:
- Customer has asked 4+ questions without moving toward a tour or concrete next step
- Customer mentions frustration with any venue or process ("I've been trying to plan this for months and nobody gives real answers")
- Customer mentions a deadline under 90 days or specific urgency
- Customer asks a question not covered in this FAQ
- Customer uses emotional language that warrants a human touch (loss, family conflict, sudden schedule change)
- Customer's budget is meaningfully below our floor (under $8,000 for the wedding itself) — politely refer out
- Customer mentions outside catering as a requirement

---

## 10. Maintenance and Versioning

### Quarterly review checklist

- [ ] Re-read every answer. Flag outdated.
- [ ] Pull last 90 days of inquiries. Identify new frequent questions.
- [ ] Verify answers referencing Document 02 are still accurate.
- [ ] Review deflection templates — are they routing correctly?
- [ ] Confirm conversation flow patterns match current sales process.

### Update immediately when:
- Pricing changes
- Megan, the booking coordinator, chef, or owner changes
- Vendor policies change
- Capacity changes
- A customer question comes up 3+ times that isn't here

### Version history

| Version | Date | Summary of changes | Reviewer |
|---|---|---|---|
| 1.0 | April 2026 | Initial publication | Joshua + [Owner] |

---

## End of Worked Example

The example above shows 15 representative questions with full structured answers. A full production version would include 30-50 questions. The strongest indicator of a thorough job: every answer has all 5 sub-sections filled in, every answer passes the brand voice test, and every fact references back to Document 02.
