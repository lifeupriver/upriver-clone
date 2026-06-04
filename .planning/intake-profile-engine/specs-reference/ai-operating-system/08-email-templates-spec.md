# Document Production Spec 08: Email and Communication Templates

## What This Spec Is

This is the production specification for Document 8 of the 12-document AI Operating System. It tells anyone building this document — Joshua, Claude in a fresh project, a subcontractor, or a future hire — exactly what goes in, what each section looks like, what to ask the client to fill it out, and how to know when it's done.

The Email and Communication Templates document is where the Brand Voice Guide, Business Facts Reference, FAQ Bank, and Sales Process Map all converge into actual, send-ready language. Every email an automation fires, every reply an AI auto-responder generates, every follow-up a team member sends should come from or be inspired by the templates in this document. Without this document, automated communications drift in voice, contradict facts, miss the right next-step CTA, and feel templated in the bad sense — generic, transactional, and easy to ignore.

The job of this document is to produce templates that don't sound like templates. Each one needs to feel like a thoughtful person wrote it, while being structured enough that an AI can fill in the personalization variables and an automation can fire it on the right trigger.

---

## Quick Reference

| Attribute | Value |
|---|---|
| **Document number** | 08 of 12 |
| **Priority** | High |
| **Total length target** | 3,000-6,000 words (heavy template content; longer than typical spec output) |
| **Total time to produce** | 4-6 hours |
| **Joshua's time** | 3-4 hours |
| **Claude's time** | 1 hour |
| **Client's time** | 30-45 minutes (review of voice, factual accuracy, and approval) |
| **Delivery format** | Markdown file, loaded into client's Claude Project as knowledge; individual templates also exported into automation tools as needed |
| **File naming convention** | `[client-slug]-08-email-templates.md` |
| **Foundation for** | Document 10 (Automation Spec Package) — every automation references templates from here |

---

## When This Document Gets Built

**Phase 2-3 of engagement, Week 2-3.** Built after the Brand Voice Guide (01), Business Facts Reference (02), Sales Process Map (03), and FAQ Bank (07) are all in place. These are hard prerequisites — templates pull voice from 01, facts from 02, process triggers from 03, and answer language from 07.

**Triggers:** All four prerequisite documents delivered. Sales Funnel Audit completed (so the templates address known weak points, not just standard touch points).

**Blocks:** Automation Spec Package (Document 10) — every automation references templates from this document.

---

## Section-by-Section Template

The finished document follows this exact structure. Every section is required.

### Header Block

```markdown
# [Business Name] Email and Communication Templates

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** [Month Year]
**Version:** 1.0
**Last template review:** [Month Year]
**Next scheduled refresh:** [Month Year — quarterly default]

**For:** Inquiry response automation, follow-up sequences, post-sale communication, lifecycle nurture, AI auto-responders, and any team member sending email or SMS in the business's voice.

**Companion documents:**
- Document 01: Brand Voice Guide (the voice every template adheres to)
- Document 02: Business Facts Reference (the facts referenced in templates)
- Document 03: Sales Process Map (the process stages each template fires at)
- Document 07: FAQ Bank (the answer language reused in templates)
- Document 10: Automation Spec Package (where templates get operationalized in n8n/HoneyBook/email platforms)

**Critical principle:** Templates should feel like a person wrote them. Variables fill in personalization; the surrounding language should never read as fill-in-the-blank. If a template still sounds robotic with the variables filled in, rewrite it.
```

**Word count:** 100-150 words.

---

### Section 1: Template Standards and Conventions

**Purpose:** The rules every template in this document follows, so that whoever extends or edits the library later stays consistent.

**Word count target:** 200-400 words.

**Required structure:**

```markdown
## 1. Template Standards and Conventions

### Variables and personalization

All templates use the following variable convention:

- `{{first_name}}` — First name of the recipient
- `{{date_of_event}}` — The date the customer is interested in (wedding date, project date, enrollment date)
- `{{specific_detail}}` — A detail from the inquiry the responder should reference back
- `{{calendar_link}}` — Cal.com or scheduling tool link
- `{{coordinator_name}}` — Whoever is signing the email
- [List all variables used in this template library]

### Voice rules every template follows

[Pulled from the Brand Voice Guide. Pasted here for reference — not just linked — because anyone editing templates should see the voice rules without leaving the document.]

- [Voice attribute 1 with one-line application reminder]
- [Voice attribute 2 with one-line application reminder]
- [Tone calibration notes]
- [Banned phrases reminder]

### Subject line conventions

- **Length target:** Under 50 characters preferred; under 65 hard limit
- **Capitalization style:** [Sentence case / Title case — match brand guide]
- **Personalization in subject line:** [When to use first name in subject, when not to]
- **Avoid:** [Spam-trigger words — "free," "act now," excessive punctuation; emoji policy]

### Email structure conventions

- **Greeting:** [Hi {{first_name}} — preferred / Hello {{first_name}} — alternative; never "Hey" or "Dear"]
- **First line:** Should accomplish something — restate the inquiry, share key info, ask the question. Avoid "I hope this finds you well" and equivalents.
- **Length target:** [3-7 sentences for short responses; 5-8 short paragraphs for longer]
- **Paragraph length:** 2-4 sentences per paragraph — never wall-of-text
- **CTA:** [Every template has exactly one primary CTA]
- **Sign-off:** [— {{coordinator_name}} / Best, {{coordinator_name}} — match brand]
- **Signature block:** [Standardized; include in templates or appended automatically]

### When to use email vs. SMS vs. DM
- **Email:** Default for substantive communication, anything with attachments, anything customer needs for reference
- **SMS:** Time-sensitive (day-of reminders, urgent updates) — only with explicit opt-in
- **DM:** Customer-initiated only; respond on the platform they used

### What to NEVER include in any template
- [Banned phrases from Brand Voice Guide]
- [Banned tactics — false urgency, fake scarcity, manipulative subject lines]
- [Promises the business can't keep]
```

---

### Section 2: First-Touch Templates (Inquiry Response)

**Purpose:** The first email a prospect receives after submitting an inquiry. Highest-leverage email in the entire library because it's the make-or-break moment for response speed and first impression.

**Word count target:** 400-700 words including templates.

**Required structure:**

```markdown
## 2. First-Touch Templates (Inquiry Response)

### Template 2A: Standard inquiry response (qualified date available)

**When this fires:** Inquiry comes in via website form, The Knot, or other inbound channel. The requested date is available. Customer matches qualified-lead criteria.

**Goal:** Acknowledge within minutes, share availability, share pricing, propose tour, set the tone.

**Subject line:**
[Specific subject line. Often "Re: your inquiry about {{date_of_event}}" or "Hi {{first_name}} — your {{date_of_event}} date" or similar.]

**Body:**

```
Hi {{first_name}},

[Direct acknowledgment of the inquiry with one specific detail referenced back]. Your date — {{date_of_event}} — is currently open on our calendar.

[Pricing block — specific to the date type/season; pulled from Business Facts Reference]

[What's included summary — 2-3 bullet points or short paragraph]

[Next step CTA — calendar link to schedule tour]

[One-sentence personal close — varies by the inquiry detail]

— {{coordinator_name}}
[Signature]
```

**Notes for AI generators using this template:**
- The "specific detail referenced back" is what prevents the email from feeling templated. Pull from the inquiry form's free-text field.
- Pricing must be exact and pulled from Business Facts Reference Section 4.
- The CTA must be a single clear next step (calendar link), not multiple options.
- Length should be 6-10 short paragraphs maximum.

### Template 2B: Inquiry response (date available, customer asked specific question)

**When this fires:** Same as 2A but the inquiry includes a specific question (price, capacity, vendor policy, etc.).

**Body:**

```
Hi {{first_name}},

Quick answer first: [Direct answer to their specific question, pulled from FAQ Bank].

[Then the standard availability + pricing block from Template 2A]

[Then the CTA]

— {{coordinator_name}}
```

**Notes:**
- Lead with the answer they asked for. Don't bury it under the standard response.
- Then add standard inquiry response elements after.

### Template 2C: Inquiry response (date NOT available)

**When this fires:** Inquiry comes in for a date that's already booked or in the blackout period.

**Body:**

```
Hi {{first_name}},

Unfortunately {{date_of_event}} is already booked. I checked the surrounding weekends and these are open: [Two or three nearby alternatives, formatted as a short list].

[If they're date-flexible:] If any of those work, the rest is the same as what you'd be getting on your original date. Want me to send pricing and tour availability for one of them?

[If they're not date-flexible:] I know your date matters and another won't work for everyone. If you want, I can let you know if anything opens up. We do see occasional cancellations.

— {{coordinator_name}}
```

**Notes:**
- Be direct about the no. Don't soften with "unfortunately" pile-ons.
- Always offer alternatives. Don't end on the no.

### Template 2D: Inquiry response (disqualified — wrong fit)

**When this fires:** Inquiry comes in but criteria don't match (too small, too large, wrong scope, asking for things the business doesn't offer).

**Body:**

```
Hi {{first_name}},

Thanks for reaching out about {{date_of_event}}. I want to be upfront with you: based on what you've shared about [the specific mismatch — guest count too small / scope too large / requirement we don't meet], we're probably not the right fit.

[Brief honest reason — one sentence.]

[If a referral is possible:] What you're describing sounds more like [Type of venue/business]. A few I'd recommend looking at: [List 2-3].

[If no referral:] I appreciate you considering us. Wishing you the best as you keep looking.

— {{coordinator_name}}
```

**Notes:**
- Polite but firm. Don't string the customer along on a bad fit.
- Offering referrals when possible builds reputation and goodwill.
- Never disqualify on tone alone — make sure criteria are real (capacity, scope, etc.).
```

---

### Section 3: Follow-Up Sequence Templates

**Purpose:** Templates for the follow-up sequence at each stage where prospects go cold. Pulls from the gaps surfaced in Document 03 (Sales Process Map).

**Word count target:** 500-900 words including templates.

**Required structure:**

```markdown
## 3. Follow-Up Sequence Templates

### Sequence A: After first response with no reply

**Trigger:** First response sent, no reply from prospect within 7 days.

**Template 3A.1: Day 7 follow-up**

```
Subject: Still thinking?

Hi {{first_name}},

Just wanted to check in. Did the info I sent help? Happy to answer specific questions, hold the date for a few extra days, or send more details about [specific thing relevant to inquiry].

— {{coordinator_name}}
```

**Template 3A.2: Day 14 follow-up**

```
Subject: One more touch on {{date_of_event}}

Hi {{first_name}},

Last note from me on this. The {{date_of_event}} date is still open as of today. If it's still on your shortlist, even a quick reply lets me hold it. If you've gone in a different direction, no worries — just let me know and I'll close out our file.

— {{coordinator_name}}
```

**Template 3A.3: Day 30 long-tail (optional)**

```
Subject: Still here if you change your mind

Hi {{first_name}},

I'm not going to keep emailing — promise. Just wanted to leave the door open. If anything changes about the date or your plans, hit reply and I'll see what we can do. Best of luck either way.

— {{coordinator_name}}
```

**Notes for the sequence:**
- Each touch gets shorter, not longer. Don't keep adding info; reduce friction to reply.
- The third touch acknowledges that this is the last one. Counter-intuitively, this often re-engages.
- Tone stays warm, never accusatory or guilt-inducing.

### Sequence B: After tour with no booking

**Trigger:** Tour completed, no contract signed within 3 days.

**Template 3B.1: Day 3 post-tour**

```
Subject: Following up from Saturday

Hi {{first_name}},

It was great meeting you both Saturday. Hope you got a good feel for the space. The {{date_of_event}} date is still on hold for you through {{date_seven_days_after_tour}}.

If you have questions you didn't think to ask in person, or want to talk through anything before signing, just reply. If you're ready to move forward, the contract is one click — let me know and I'll send it over.

— {{coordinator_name}}
```

**Template 3B.2: Day 10 post-tour**

```
Subject: Releasing your hold on {{date_of_event}}

Hi {{first_name}},

Quick note — I'm going to release the soft hold on {{date_of_event}} tomorrow so the date opens back up. If you want to extend it or move forward, just hit reply by end of day tomorrow.

If timing didn't work or you went a different direction, totally understand. Always happy to revisit if anything changes.

— {{coordinator_name}}
```

### Sequence C: After verbal yes with no signed contract

**Trigger:** Verbal commitment made, contract sent, no signature within 5 days.

**Template 3C.1: Day 5 contract follow-up**

```
Subject: Anything I can help with on the contract?

Hi {{first_name}},

Wanted to check in on the contract for {{date_of_event}}. Sometimes there's a question or detail people want to walk through before signing — happy to hop on a call or just answer in writing if there's anything outstanding.

— {{coordinator_name}}
```

**Template 3C.2: Day 10 contract follow-up**

```
Subject: Should I hold or release {{date_of_event}}?

Hi {{first_name}},

Just need to know whether to keep the date held or release it. I know life gets in the way of contract signing — totally understandable. But I want to make sure I'm not holding the date if your plans have shifted.

— {{coordinator_name}}
```

### Sequence D: Lost-deal closeout

**Trigger:** Deal officially declined or lost.

**Template 3D.1: Closeout acknowledgment**

```
Subject: Closing the file — wishing you well

Hi {{first_name}},

Thanks for letting me know. Closing out our file on {{date_of_event}}. If anything ever changes — different date, vow renewal, friend looking — please keep us in mind.

Wishing you a beautiful wedding wherever you end up.

— {{coordinator_name}}
```

**Notes:**
- Even lost deals deserve a clean exit. The customer might refer someone, or come back later.
- No guilt, no upselling, no trying to win them back at this stage.
```

---

### Section 4: Conversion Event Templates (Tour/Meeting/Estimate Confirmation and Reminders)

**Purpose:** The communications around the booking, scheduling, and showing up of the conversion event from Document 03.

**Word count target:** 400-700 words including templates.

**Required structure:**

```markdown
## 4. Conversion Event Templates

### Template 4A: Tour confirmation

**When this fires:** Customer schedules a tour via Cal.com or manually.

**Subject:**
[E.g., "You're confirmed for {{date_of_tour}}"]

**Body:**

```
Hi {{first_name}},

You're set for {{day_of_tour}}, {{date_of_tour}} at {{time_of_tour}}. Looking forward to meeting you.

Address: [Full address with link]
Parking: [Specific instructions]
Tour length: [Time]
Dress: [Casual / weather-appropriate / etc.]
Who you'll meet: {{coordinator_name}}

[One personal sentence about the tour or the date — pulled from inquiry detail]

If you need to reschedule, just hit reply.

— {{coordinator_name}}
```

### Template 4B: Tour reminder (48 hours before)

```
Subject: See you {{day_of_tour}}

Hi {{first_name}},

Quick reminder — you're confirmed for {{day_of_tour}} at {{time_of_tour}}. Address and parking notes are below in case you need them.

[Address block]

Looking forward to it.

— {{coordinator_name}}
```

### Template 4C: Tour reminder (day-of)

```
Subject: Today at {{time_of_tour}}

Hi {{first_name}},

Just a heads-up — see you at {{time_of_tour}} today. Drive safe, and let me know if anything changes.

— {{coordinator_name}}
```

### Template 4D: Tour reschedule offer

**When this fires:** Customer no-shows or cancels with limited notice.

```
Subject: Rescheduling your tour

Hi {{first_name}},

Looks like today didn't work out. No problem — these things happen. Want to reschedule? Here are a few openings I have over the next two weeks:

[List 3-4 specific options]

Or grab any time that works here: {{calendar_link}}

— {{coordinator_name}}
```

### Template 4E: Post-tour same-day thank you

**When this fires:** Sent same evening as tour. Manual or automated.

```
Subject: Great meeting you today

Hi {{first_name}},

Really enjoyed showing you the property. As promised, here's the pricing PDF I put together for {{date_of_event}}: [Attached or linked]

The {{date_of_event}} date is on soft hold through {{date_seven_days_out}}. No pressure — just let me know which way you're leaning when you're ready.

If anything comes up before then, hit reply.

— {{coordinator_name}}
```

**Notes:**
- This template is high-stakes. Couples are deciding within 48-72 hours of the tour. The same-day touch reinforces emotional connection while it's fresh.
- The pricing PDF should be the customized one prepared during the tour.
```

---

### Section 5: Closing and Onboarding Templates

**Purpose:** Templates for the moment a prospect becomes a customer, plus the onboarding sequence that follows.

**Word count target:** 300-500 words including templates.

**Required structure:**

```markdown
## 5. Closing and Onboarding Templates

### Template 5A: Contract signed + deposit received

**When this fires:** Both contract is signed and deposit is paid.

```
Subject: You're booked for {{date_of_event}}

Hi {{first_name}},

It's official — {{date_of_event}} is yours. Couldn't be more excited to host you.

Here's what happens next:

1. [First milestone — e.g., "Welcome packet attached. Read it when you have a quiet 30 minutes."]
2. [Second milestone — e.g., "We'll schedule your menu tasting around four months out. I'll reach out to coordinate."]
3. [Third milestone — e.g., "Final walkthrough at 30 days out with {{day_of_coordinator_name}}."]

In the meantime, [next-action item — e.g., "feel free to start sharing the date with friends and family."]

Anything that comes up between now and then, you have my email. I'll be here.

— {{coordinator_name}}
```

### Template 5B: Welcome packet email (sometimes combined with 5A, sometimes separate)

```
Subject: Your {{Business Name}} welcome packet

Hi {{first_name}},

Attached is the welcome packet — your full planning timeline, what to expect at each milestone, and a few practical things you'll need (insurance, vendor contacts, etc.).

A few highlights to read first:
- The planning timeline (page 2) — gives you the rough cadence between now and {{date_of_event}}
- The vendor section (page 5) — covers what's required and what's optional
- The contacts page (page 8) — who to reach for what

Read at your own pace. We'll cover the key items together at each milestone meeting.

— {{coordinator_name}}
```

### Template 5C: Milestone scheduling (menu tasting, walkthrough, etc.)

```
Subject: Time to schedule your {{milestone_name}}

Hi {{first_name}},

We're [X] months out from {{date_of_event}} which means it's time for your {{milestone_name}}. Here's how it usually goes:

[2-3 sentences on what the meeting covers]

Available times in the next two weeks:
[3-4 specific options]

Or grab any time that works here: {{calendar_link}}

— {{coordinator_name}}
```
```

---

### Section 6: Pre-Event and Day-Of Templates

**Purpose:** Communications in the final weeks and on the day of the event.

**Word count target:** 300-500 words including templates.

**Required structure:**

```markdown
## 6. Pre-Event and Day-Of Templates

### Template 6A: 30-day countdown / final logistics

```
Subject: 30 days out — here's what's coming up

Hi {{first_name}},

You're 30 days from {{date_of_event}}. Here's what to expect from us in the next four weeks:

- Final headcount due by [date — typically 14 days out]
- Final balance due by [date — same as headcount]
- Final walkthrough: scheduled for [date and time]
- Vendor contact list: please send to {{day_of_coordinator}} by [date]
- Insurance certificate: due by [date — typically 30 days out]

Nothing else from us between now and the walkthrough unless you have questions. You probably have a million things going on. We're handling our side.

— {{coordinator_name}}
```

### Template 6B: Final headcount + balance due reminder

```
Subject: Final headcount and balance — due {{due_date}}

Hi {{first_name}},

Quick reminder — final headcount and balance are due by end of day {{due_date}}.

To submit:
- Headcount: just reply with the final number (and any dietary updates if they've changed)
- Balance: invoice is in HoneyBook ready to pay

Let me know if anything changed about your guest count or dietary needs and we'll adjust the catering.

— {{coordinator_name}}
```

### Template 6C: Day-before email (the morning before)

```
Subject: See you tomorrow

Hi {{first_name}},

Tomorrow's the day. Quick note from me — the team is set, the property is ready, the weather looks [actual forecast]. {{day_of_coordinator}} will be your point of contact starting tonight at the rehearsal dinner.

If anything comes up between now and then, my cell is [number]. Otherwise I'll see you tomorrow.

Have a great wedding.

— {{coordinator_name}}
```

### Template 6D: Day-of arrival message (SMS, with opt-in)

```
Hi {{first_name}} — {{day_of_coordinator}} here. We're set up and ready when you are. Take your time getting here, and text this number if you need anything.
```
```

---

### Section 7: Post-Event Templates

**Purpose:** The follow-up sequence after the customer's event or service is delivered.

**Word count target:** 300-500 words including templates.

**Required structure:**

```markdown
## 7. Post-Event Templates

### Template 7A: Day-after thank you

**When this fires:** Morning after the wedding/event.

```
Subject: Thank you for choosing us

Hi {{first_name}},

What a beautiful wedding. We're already starting cleanup, but I wanted to send a quick note before the day got away from me.

A few things:
- Anything left behind will be set aside — let us know what to do with it
- Your photos and any video the team captured will start coming in over the next few weeks from your photographer/videographer
- We'll send a separate note in a couple of weeks once you've had time to settle

Wishing you both an amazing first chapter.

— {{coordinator_name}}
```

### Template 7B: 2-week follow-up + review request

```
Subject: How was it?

Hi {{first_name}},

Hope the post-wedding glow has lasted. By now you're probably [back from honeymoon / settling in / dealing with the thank-you cards].

Two asks if you have a minute:

1. We'd love a Google review if your experience was as good as we hope. Here's the link: [Direct review link]

2. If anything wasn't perfect, please tell me directly. The only way we get better is hearing what didn't work. No need to be diplomatic.

Either way — thank you for trusting us with your day.

— {{coordinator_name}}
```

### Template 7C: 1-year anniversary touch

```
Subject: One year ago today

Hi {{first_name}},

A year ago today you got married at [Business Name]. Hope year one has been everything you wanted.

If you ever want to come back for an anniversary dinner, an overnight in the cottage, or just to walk the grounds, you have a standing welcome. Just hit reply.

— {{coordinator_name}}
```

### Template 7D: Referral request (separate from review request)

**When this fires:** 60-90 days post-event, only if customer has not already referred someone.

```
Subject: A small ask

Hi {{first_name}},

I don't usually do this, so I'll keep it short. The best leads we get are from past couples telling their friends about us. If you know anyone who's planning a wedding and might be a good fit for what we do, I'd love an introduction — or you can just send them our way.

No pressure, no awkward follow-up if it's not the right time. Just appreciate you keeping us in mind if it ever is.

— {{coordinator_name}}
```
```

---

### Section 8: Lifecycle and Long-Tail Templates

**Purpose:** Templates for staying in front of past customers, lost leads, and the broader audience.

**Word count target:** 200-400 words including templates.

**Required structure:**

```markdown
## 8. Lifecycle and Long-Tail Templates

### Template 8A: Quarterly newsletter (skeleton)

**When this fires:** Quarterly, on first Tuesday of [Month].

```
Subject: [Theme of the quarter — e.g., "What October looked like at Audrey's"]

Hi {{first_name}},

[2-3 sentence intro tying to the season or theme]

[Section 1: A specific story or feature — e.g., a recent wedding, a behind-the-scenes look at the kitchen, a new partnership]

[Section 2: Practical news — calendar updates, new offerings, capacity status]

[Section 3: A relevant link — best blog post of the quarter, photo gallery, etc.]

[Sign-off — personal one sentence]

— {{coordinator_name}}
[Unsubscribe link]
```

### Template 8B: Lost-deal reactivation (6 months out)

**When this fires:** 6 months after a lead was officially lost or went cold.

```
Subject: Just checking in

Hi {{first_name}},

Wasn't sure if to send this. We last connected back in {{month_of_first_inquiry}} about {{date_they_were_looking_at}} — wanted to see how things landed. Did you find your venue? If you did, no need to reply — I just hate not knowing how a story ends.

If you didn't end up booking somewhere or your plans shifted, we're still here.

— {{coordinator_name}}
```

### Template 8C: Capacity announcement (under-booked period)

**When this fires:** Targeted to past leads or warm audience when an under-booked period needs filling.

```
Subject: A few [Friday / Sunday / weekday] dates we'd love to fill

Hi {{first_name}},

Quick one — we have a few [Friday / Sunday / weekday] dates open in [month/season] that we'd love to fill. These dates run [X]% off our standard Saturday rate and the rest of the experience is identical.

Specific open dates:
- [Date 1]
- [Date 2]
- [Date 3]

If you know anyone (or it's relevant to you), reply or send them our way.

— {{coordinator_name}}
```
```

---

### Section 9: AI Auto-Responder Specification

**Purpose:** The specific instructions for any AI-powered auto-responder built using these templates as source material. This section bridges to Document 10 (Automation Spec Package).

**Word count target:** 300-500 words.

**Required structure:**

```markdown
## 9. AI Auto-Responder Specification

### What the AI auto-responder is

A first-touch response system that fires within 60 seconds of an inquiry arriving. The AI generates a personalized inquiry response based on:

1. The inquiry form data (date, guest count, contact info, free-text note)
2. The Business Facts Reference (pricing for the requested date type, availability)
3. The first-touch templates from Section 2 of this document
4. The Brand Voice Guide

### What the auto-responder MUST do

- Respond within 60 seconds of inquiry submission
- Personalize using the recipient's first name
- Reference at least one specific detail from the inquiry's free-text field
- State availability for the requested date (or alternatives if unavailable)
- Share pricing exact to the date type/season
- Propose a clear next step (calendar link)
- Sign off with the booking coordinator's name (not "the team" or anonymous)

### What the auto-responder MUST NOT do

- Generate any factual claim not supported by the Business Facts Reference
- Use any banned phrase from the Brand Voice Guide
- Promise things outside what the templates allow (custom pricing, bespoke add-ons, etc.)
- Send if the inquiry contains red flags (spam pattern, abusive language) — escalate to human review
- Send if the date requested is more than 18 months out — instead, response should explain calendar opens 18 months ahead and offer to follow up

### Variables the auto-responder pulls from the inquiry form

- `{{first_name}}` — Required
- `{{date_of_event}}` — Required
- `{{guest_count_estimate}}` — Optional, used for capacity check
- `{{free_text_note}}` — Optional, used for personalization detail
- `{{contact_email}}` — Required for sending

### Variables the auto-responder pulls from the Business Facts Reference

- Pricing for the requested date type and season
- Availability status for the requested date
- Booking coordinator name (current sender)
- Calendar link for tour scheduling

### Escalation triggers (when to skip auto-response and route to human)

- Date is unavailable AND prospect is high-value (e.g., budget signals premium, planner-referred)
- Inquiry contains specific complex questions outside FAQ Bank coverage
- Inquiry contains language indicating special circumstance (vow renewal, memorial, partner deceased, accessibility needs not addressed in FAQ)
- Spam pattern detected
- Inquiry from VIP source (named planner, repeat customer, press inquiry)

### Quality assurance loop

- Every auto-response sent in the first 30 days is also forwarded to the booking coordinator for review
- Coordinator flags any response that wouldn't have been sent by a human
- Patterns get fed back into prompt updates
- After 30 days, only escalated cases get human review

### How the auto-responder handles the FAQ Bank

When the inquiry contains a specific question covered in the FAQ Bank, the auto-responder leads with that answer (per Template 2B), then continues with standard inquiry response elements. The FAQ Bank's "do-not-say" guidance is also enforced.
```

---

## How to Build This Document

The full process, in order. Total time: 4-6 hours.

### Step 1: Pre-Build Prep (15 minutes, Joshua)

Confirm prerequisite documents are delivered:
- Brand Voice Guide (01)
- Business Facts Reference (02)
- Sales Process Map (03) — including secret shopper findings
- FAQ Bank (07)

Pull the client's existing email templates (whatever they have currently) so they can be referenced and improved on, not displaced without reason.

### Step 2: Inventory Existing Templates and Patterns (30 minutes, Joshua)

Document what the client currently uses:
- Auto-responses (HoneyBook, website form, etc.)
- Manually-sent inquiry responses (pull 5-10 examples from sent mail)
- Follow-up emails (if any)
- Tour confirmations and reminders
- Post-sale onboarding emails
- Newsletter (if any)

Note what's working, what's templated in the bad way, and what's missing.

### Step 3: Map Templates to the Sales Process Map (30 minutes, Joshua)

Open Document 03 (Sales Process Map). For each stage and each follow-up trigger identified there, list the template that should fire. This produces the template inventory the document needs to cover.

For Audrey's example, the inventory includes:
- 4 first-touch variants (qualified, has specific question, date unavailable, disqualified)
- 3-touch sequence after first-response no-reply
- 2-touch sequence after tour no-booking
- 2-touch sequence after verbal-yes no-contract
- Tour confirmation, 48-hour reminder, day-of reminder
- Post-tour thank you
- Contract-signed celebration
- Welcome packet
- Milestone scheduling
- 30-day countdown, final headcount reminder, day-before, day-of
- Day-after, 2-week review request, 1-year anniversary, referral request
- Quarterly newsletter skeleton
- Lost-deal reactivation
- AI auto-responder spec

### Step 4: Draft Generation (60-90 minutes, Claude)

In the consulting Claude Project, run this prompt:

```
Generate Email and Communication Templates for [Business Name] using Document Production Spec 08 as the structure. Industry: [industry].

Source materials:

[Paste: Brand Voice Guide — full document]

[Paste: Business Facts Reference — at minimum Sections 1, 2, 4, and 6]

[Paste: Sales Process Map — at minimum Sections 2, 5, 6]

[Paste: FAQ Bank — full document]

[Paste: Inventory of existing templates the client currently uses, with notes on what's working]

[Paste: Template inventory mapped from Sales Process Map (from Step 3)]

Build all 9 sections following the spec. For every template:
- Apply the Brand Voice Guide voice attributes consistently
- Use exact pricing and facts from the Business Facts Reference
- Reuse FAQ Bank answer language where applicable
- Address gaps the Sales Process Map identified (especially first-touch speed and follow-up cadence gaps)

Where the spec template includes placeholder copy in [brackets], replace with actual language tailored to this business. Do not deliver templates that still contain placeholders other than the {{variable}} markers.

After writing each template, do a brand voice pass: would this email still feel like the business if all variables were filled in? If it sounds generic, rewrite.
```

### Step 5: Joshua Voice Pass (60-90 minutes)

This is the highest-effort review step. For every template:

1. Fill in the variables with realistic example values
2. Read the email out loud
3. Check: does it sound like a real person from this business wrote it?
4. Check: does the CTA feel natural or shoehorned?
5. Check: does the length match what the situation calls for?
6. Cross-check facts against the Business Facts Reference
7. Cross-check banned phrases against the Brand Voice Guide
8. Edit directly

Templates that pass the voice test get marked approved. Templates that fail get rewritten.

### Step 6: Client Voice Confirmation (30-45 minutes client time)

Send to client with this email:

```
Subject: Email and Communication Templates — your voice, automated

Attached: the Email and Communication Templates for [Business Name].

This document contains every template that will fire from any automation, AI auto-responder, or team member sending email in your name. The voice has to be right because once these are in production, they go to thousands of people.

What I need from you:

1. Read 5 templates out loud — pick: 2A (standard inquiry response), 3A.2 (Day 14 follow-up), 5A (contract signed), 7B (post-event review request), 8B (lost-deal reactivation).

2. Anything that doesn't sound like you, mark it. I'll rewrite.

3. For Section 9 (AI Auto-Responder Spec), make sure the "must not do" list is complete. Add anything that would horrify you to see go out automatically.

Once approved, these become the source of truth for the automations Zach builds.
```

### Step 7: Final Edits and Delivery (30 minutes)

- Apply client voice edits
- Run through the templates one more time to confirm consistency
- Save with naming convention `[client-slug]-08-email-templates-v1.0.md`
- Upload to client's Claude Project as knowledge
- Export individual templates into the formats needed for automation tools (HoneyBook canned responses, n8n workflow JSON, etc.) — this is operational handoff to Document 10

---

## Definition of Done

This document is finished when all of the following are true:

- [ ] All 9 sections are complete
- [ ] Section 1 standards are explicit (variable conventions, voice rules, length targets, structural conventions)
- [ ] First-touch section has at least 4 variants (standard, with specific question, unavailable date, disqualified)
- [ ] Follow-up sequences cover at least 3 stages (first-response no-reply, post-tour no-booking, verbal-yes no-contract)
- [ ] Conversion event templates cover confirmation, 48-hour reminder, day-of reminder, post-event same-day
- [ ] Closing and onboarding templates cover the contract-signed moment, welcome packet, and milestone scheduling
- [ ] Pre-event and day-of templates include 30-day countdown, final headcount reminder, day-before, day-of
- [ ] Post-event templates include day-after, 2-week review request, 1-year anniversary, referral request
- [ ] Lifecycle templates include newsletter skeleton, lost-deal reactivation, and capacity announcement
- [ ] AI auto-responder spec includes both must-do and must-not-do, escalation triggers, variable mapping, QA loop
- [ ] Every template uses the {{variable}} convention consistently
- [ ] Every template references facts that are verified against the Business Facts Reference
- [ ] Every template passes the voice test (filled in with example values, sounds like a real person)
- [ ] Cross-reference pass against Brand Voice Guide complete (no banned phrases)
- [ ] Cross-reference pass against FAQ Bank complete (templates use FAQ Bank answer language where overlapping)
- [ ] Client has reviewed and confirmed voice on at least 5 templates
- [ ] File saved with correct naming convention and uploaded to Claude Project
- [ ] Templates exported into automation tool formats (HoneyBook, n8n) as needed for handoff to Document 10

---

## Common Failure Modes

**Failure 1: Templates sound templated.** When variables are filled in, the email still reads as fill-in-the-blank. Customers can sense it instantly. Fix: every template must pass the read-aloud test. If it doesn't sound like a real person, rewrite.

**Failure 2: Voice drift across templates.** Inquiry response sounds warm; tour reminder sounds corporate; post-event email sounds different again. Fix: full library review for voice consistency, ideally in one sitting.

**Failure 3: CTAs are weak or multiple.** "Reply if you have questions or want to schedule a tour or just want more info" buries the next step. Fix: every template has exactly one primary CTA, stated clearly.

**Failure 4: Pricing or capacity facts in templates conflict with Business Facts Reference.** A pricing change happens, the Business Facts Reference is updated, but the templates still quote old numbers. Fix: pricing should come from variables wherever possible, and any hardcoded numbers get flagged for the quarterly fact-check cycle.

**Failure 5: Lost-deal and lifecycle templates get skipped.** Templates for active prospects get built; templates for past customers and lost leads get deferred. Then the long-tail revenue opportunity (per Document 03 Section 9) never materializes. Fix: Sections 7 and 8 are required, not optional.

**Failure 6: Auto-responder spec is too permissive.** "Generate a personalized response" without constraints leads to AI inventing facts, making promises, or going off-voice. Fix: Section 9's "must not do" list and escalation triggers must be specific and complete.

**Failure 7: No QA loop for the auto-responder.** AI sends 200 responses in the first month, all unreviewed. A drift goes unnoticed until a customer complaint surfaces. Fix: Section 9 must specify a 30-day human-review-all phase before the auto-responder runs unsupervised.

---

## Worked Example: Audrey's Farmhouse Email and Communication Templates

The following is a complete sample of what a finished Email and Communication Templates document looks like. Use this as the quality bar.

---

# Audrey's Farmhouse Email and Communication Templates

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** April 2026
**Version:** 1.0
**Last template review:** April 2026
**Next scheduled refresh:** July 2026 (quarterly)

**For:** Inquiry response automation, follow-up sequences, post-sale communication, lifecycle nurture, AI auto-responders, and any team member sending email or SMS in Audrey's voice.

**Companion documents:** Documents 01, 02, 03, 07, 10.

**Critical principle:** Templates should feel like a person wrote them.

---

## 1. Template Standards and Conventions

### Variables and personalization

- `{{first_name}}` — First name of the recipient (couple's primary contact)
- `{{partner_first_name}}` — Partner's first name when known
- `{{date_of_event}}` — Wedding date (formatted as "Saturday, October 17, 2026")
- `{{day_of_week}}` — Day of week of event for templates that need it
- `{{season_pricing_tier}}` — Peak / shoulder / off-season for pricing accuracy
- `{{guest_count_estimate}}` — Their stated estimate
- `{{specific_detail}}` — Reference back to something from their inquiry note
- `{{calendar_link}}` — Cal.com link for tour scheduling
- `{{coordinator_name}}` — Booking coordinator's name (currently [Name])
- `{{day_of_coordinator}}` — Megan
- `{{contract_link}}` — HoneyBook contract link

### Voice rules every template follows

From the Brand Voice Guide:
- First-person singular; never "we" when "I" is more accurate
- Direct over diplomatic; warm but not effusive
- Real numbers over adjectives
- No em dashes (project-wide rule)
- Banned phrases: stunning, magical, special day, transform, elevate, unlock, seamlessly, robust, synergy, game-changer, dream wedding
- 2-4 sentence paragraphs; no walls of text
- Sentence-case, not Title-case in body

### Subject line conventions

- Length: under 50 characters
- Sentence case
- First name allowed in subject; date often included
- No emoji
- No fake urgency ("Last chance!" "Don't miss out!")

### Email structure conventions

- Greeting: "Hi {{first_name}}," (always — no "Hey," "Hello," "Dear")
- First line: Either restates the inquiry detail, gives the answer, or makes the offer. No "I hope this finds you well."
- Length: 4-8 short paragraphs for substantive emails; 2-4 paragraphs for short ones
- One primary CTA per email
- Sign-off: "— {{coordinator_name}}" (em dash NOT used; this is a standard hyphen)
- Signature block: handled by HoneyBook; not duplicated in templates

### When to use email vs. SMS vs. DM

- Email: Default for everything substantive
- SMS: Day-of communications only, with explicit opt-in confirmed at booking
- DM: Customer-initiated only; reply on the platform they used (Instagram), then move to email for follow-up

### What to NEVER include

- Banned phrases listed above
- False urgency or fake scarcity
- Promises beyond what's in Business Facts Reference (no bespoke pricing, no exception promises)
- Sales-y closes ("Don't let this opportunity pass you by")

---

## 2. First-Touch Templates (Inquiry Response)

### Template 2A: Standard inquiry response — qualified, date available

**When this fires:** Inquiry comes in via website form, The Knot, or Instagram DM (handled separately). Date is open. Guest count and basics fit qualified-lead criteria.

**Subject:** `Hi {{first_name}} — your {{date_of_event}} date`

**Body:**

```
Hi {{first_name}},

Thanks for reaching out about {{date_of_event}}. {{specific_detail_callback}}.

Your date is open. Here's what a {{day_of_week}} in {{season_pricing_tier}} season looks like at Audrey's:

- Venue (Friday afternoon through Sunday morning): ${{venue_price}}
- In-house catering: $145-$185 per person depending on menu
- Bar packages: $42 (beer and wine) or $58 (full bar) per person
- On-site lodging beyond the farmhouse: $295-$395 per room per night

What's included with the venue: full property access Friday through Sunday, the farmhouse for you and immediate family for both nights, day-of coordination from Megan, use of the kitchen for your rehearsal dinner.

The fastest way to know if this could be your venue is to walk it. Tours run Saturday mornings and afternoons, plus weekday afternoons. Grab a time here: {{calendar_link}}

If a tour isn't realistic in the next few weeks, hit reply and we can do a video walkthrough instead.

— {{coordinator_name}}
```

**Notes for AI generators:**
- `{{specific_detail_callback}}` should reference something from the inquiry's free-text field. Examples: "Sounds like you're planning a 120-person wedding with family flying in from the West Coast — that's exactly the kind of weekend Audrey's was built for." If the free-text field is empty, this line gets skipped entirely (don't fake it).
- All pricing comes from Business Facts Reference Section 4.

### Template 2B: Inquiry response — qualified, has specific question

**When this fires:** Same as 2A but the inquiry includes a specific question (most often: pricing, capacity, lodging, vendor policy, catering).

**Subject:** Same as 2A

**Body:**

```
Hi {{first_name}},

Quick answer to your question about {{question_topic}}: {{faq_bank_answer}}

Beyond that, your date — {{date_of_event}} — is currently open. Here's what a {{day_of_week}} in {{season_pricing_tier}} season looks like:

[Standard pricing block from Template 2A]

[Standard CTA from Template 2A]

— {{coordinator_name}}
```

### Template 2C: Inquiry response — date unavailable

**Subject:** `{{date_of_event}} update`

**Body:**

```
Hi {{first_name}},

Unfortunately {{date_of_event}} is already booked. I checked the surrounding dates — these are open:

- {{alternative_date_1}}
- {{alternative_date_2}}
- {{alternative_date_3}}

If any of those work, the rest of the experience is the same. Want me to send pricing and tour availability for one of them?

If your date is firm, I'll keep an eye on the calendar and reach out if anything opens up. We do see occasional cancellations, especially 6-12 months out.

— {{coordinator_name}}
```

### Template 2D: Inquiry response — disqualified

**Subject:** `On your {{date_of_event}} inquiry`

**Body:**

```
Hi {{first_name}},

Thanks for reaching out about {{date_of_event}}. Want to be upfront with you: based on what you've shared about {{specific_mismatch}}, we're probably not the right fit.

{{honest_one_sentence_reason}}

What you're describing sounds more like a {{better_fit_category}}. A few I'd recommend looking at: {{referral_list}}

Wishing you the best as you keep looking.

— {{coordinator_name}}
```

**Common disqualified scenarios and the language for each:**

- **Guest count over 200:** "We cap at 180 seated reception, so you'd be over our capacity by a meaningful amount. {{Roundhouse / Stonecroft}} both handle 200+ comfortably."
- **Guest count under 30:** "For an event this size, our weekday microwedding format ($4,500) might actually be a better fit than a full Saturday weekend. Want details?"
- **Wants outside catering:** "We're an in-house catering venue — no outside caterers. If outside catering is non-negotiable, {{The Hill at Highlands / Stonecroft}} are both BYO."
- **Date inside 60 days, peak season:** "Our calendar that close in for peak season is fully booked. Off-season (Dec-Mar) has more flexibility if your dates are open."

---

## 3. Follow-Up Sequence Templates

### Sequence A: First response with no reply

**Template 3A.1: Day 7**

Subject: `Still thinking about {{date_of_event}}?`

```
Hi {{first_name}},

Just checking in. Did the info I sent help? Happy to answer specific questions, hold {{date_of_event}} for a few extra days while you decide, or send more details about anything that's still unclear.

— {{coordinator_name}}
```

**Template 3A.2: Day 14**

Subject: `One more check on {{date_of_event}}`

```
Hi {{first_name}},

Last note from me on this. The {{date_of_event}} date is still open as of today. If it's still on your shortlist, even a quick reply lets me hold it. If you've gone in a different direction, no worries — just let me know and I'll close out our file.

— {{coordinator_name}}
```

**Template 3A.3: Day 30**

Subject: `Door's still open`

```
Hi {{first_name}},

Won't keep emailing — promise. Just leaving the door open. If anything changes about your date or your plans, hit reply and I'll see what we can do.

— {{coordinator_name}}
```

### Sequence B: After tour with no booking

**Template 3B.1: Day 3 post-tour**

Subject: `Following up from {{day_of_tour}}`

```
Hi {{first_name}},

Great meeting you on {{day_of_tour}}. Hope you got a good feel for the property.

The {{date_of_event}} date is on soft hold for you through {{hold_release_date}}. If you have questions you didn't think to ask in person, or want to talk through anything before signing, just reply. If you're ready to move forward, the contract is one click — let me know and I'll send it.

— {{coordinator_name}}
```

**Template 3B.2: Day 10 post-tour**

Subject: `Releasing your hold on {{date_of_event}}`

```
Hi {{first_name}},

Quick note — I'm going to release the soft hold on {{date_of_event}} tomorrow so the date opens back up. If you want to extend it or move forward, just hit reply by end of day tomorrow.

If timing didn't work or you went a different direction, totally understand. Always happy to revisit if anything changes.

— {{coordinator_name}}
```

### Sequence C: After verbal yes with no signed contract

**Template 3C.1: Day 5**

Subject: `Anything I can help with on the contract?`

```
Hi {{first_name}},

Wanted to check in on the contract for {{date_of_event}}. Sometimes there's a question or detail people want to walk through before signing — happy to hop on a call or just answer in writing if there's anything outstanding.

— {{coordinator_name}}
```

**Template 3C.2: Day 10**

Subject: `Should I hold or release {{date_of_event}}?`

```
Hi {{first_name}},

Need to know whether to keep the date held or release it back to the calendar. I know life gets in the way of contract signing — totally understandable. But I want to make sure I'm not holding the date if your plans have shifted.

— {{coordinator_name}}
```

### Sequence D: Lost-deal closeout

**Template 3D.1**

Subject: `Closing the file — wishing you well`

```
Hi {{first_name}},

Thanks for letting me know. Closing out our file on {{date_of_event}}. If anything ever changes — different date, vow renewal, friend looking — please keep us in mind.

Wishing you a beautiful wedding wherever you end up.

— {{coordinator_name}}
```

---

## 4. Conversion Event Templates

### Template 4A: Tour confirmation

Subject: `You're confirmed for {{day_of_tour}}`

```
Hi {{first_name}},

You're set for {{day_of_tour}}, {{date_of_tour}} at {{time_of_tour}}. Looking forward to meeting you.

Address: 2188 Brunswyck Road, Wallkill NY (Google Maps will get you here)
Parking: Park anywhere on the gravel circle in front of the farmhouse
Tour length: about 75-90 minutes
Dress: comfortable, weather-appropriate (we'll be outside for part of it)
Who you'll meet: me — {{coordinator_name}}

{{personal_callback_one_sentence}}

If you need to reschedule, just hit reply.

— {{coordinator_name}}
```

### Template 4B: 48-hour tour reminder

Subject: `See you {{day_of_tour}}`

```
Hi {{first_name}},

Quick reminder — you're confirmed for {{day_of_tour}} at {{time_of_tour}}. Address and parking notes are below in case you need them.

2188 Brunswyck Road, Wallkill NY
Park on the gravel circle in front of the farmhouse

Looking forward to it.

— {{coordinator_name}}
```

### Template 4C: Day-of tour reminder

Subject: `Today at {{time_of_tour}}`

```
Hi {{first_name}},

Just a heads-up — see you at {{time_of_tour}} today. Drive safe, and let me know if anything changes.

— {{coordinator_name}}
```

### Template 4D: Tour reschedule

Subject: `Rescheduling your tour`

```
Hi {{first_name}},

Looks like today didn't work out. No problem — these things happen. Want to reschedule? Here are a few openings I have over the next two weeks:

- {{option_1}}
- {{option_2}}
- {{option_3}}

Or grab any time that works here: {{calendar_link}}

— {{coordinator_name}}
```

### Template 4E: Post-tour same-day thank you

Subject: `Great meeting you today`

```
Hi {{first_name}},

Really enjoyed showing you the property today. As promised, here's the pricing PDF I put together for {{date_of_event}}: {{pricing_pdf_link}}

The {{date_of_event}} date is on soft hold through {{hold_release_date}}. No pressure — just let me know which way you're leaning when you're ready.

If anything comes up before then, hit reply.

— {{coordinator_name}}
```

---

## 5. Closing and Onboarding Templates

### Template 5A: Contract signed + deposit received

Subject: `You're booked for {{date_of_event}}`

```
Hi {{first_name}},

It's official — {{date_of_event}} is yours. Couldn't be more excited to host you.

Here's what happens next:

1. Welcome packet attached. Read it when you have a quiet 30 minutes.
2. Around 4 months out, we'll schedule your menu tasting with our chef.
3. Around 30 days out, you'll do your final walkthrough with Megan, your day-of coordinator.

In the meantime, feel free to start sharing the date with friends and family. Save-the-dates are usually sent 8-10 months out.

Anything that comes up between now and then, you have my email. I'll be here.

— {{coordinator_name}}
```

### Template 5B: Welcome packet email

Subject: `Your Audrey's Farmhouse welcome packet`

```
Hi {{first_name}},

Attached is your welcome packet — full planning timeline, what to expect at each milestone, and the practical things you'll need (insurance, vendor contacts, payment schedule).

A few highlights to read first:

- Page 2: planning timeline. Gives you the rough cadence between now and {{date_of_event}}.
- Page 5: vendor section. Covers what's required, what's optional, and which vendors we work well with.
- Page 8: contacts page. Who to reach for what.

Read at your own pace. We'll cover the key items together at each milestone meeting.

— {{coordinator_name}}
```

### Template 5C: Menu tasting scheduling

Subject: `Time to schedule your menu tasting`

```
Hi {{first_name}},

We're about 4 months out from {{date_of_event}} which means it's time for your menu tasting with the chef. Here's how it usually goes: about 90 minutes at the farmhouse, you'll try 3-4 entrées plus appetizers, and we'll finalize your menu and any dietary accommodations.

Available times in the next two weeks:
- {{option_1}}
- {{option_2}}
- {{option_3}}

Or grab any time that works: {{calendar_link}}

— {{coordinator_name}}
```

### Template 5D: Final walkthrough scheduling

Subject: `Final walkthrough — let's pick a time`

```
Hi {{first_name}},

You're 30 days out from {{date_of_event}}. Time to schedule your final walkthrough with Megan.

This is the meeting where Megan goes through the timeline of your wedding day, vendor logistics, anything that's changed since you booked, and any last-minute questions. About 90 minutes on-site.

Available times:
- {{option_1}}
- {{option_2}}
- {{option_3}}

— {{coordinator_name}}
```

---

## 6. Pre-Event and Day-Of Templates

### Template 6A: 30-day countdown

Subject: `30 days out — here's what's coming`

```
Hi {{first_name}},

You're 30 days from {{date_of_event}}. Here's what to expect from us in the next four weeks:

- Final headcount due by {{headcount_due_date}}
- Final balance due by {{balance_due_date}}
- Final walkthrough scheduled for {{walkthrough_date}}
- Vendor contact list: please send to Megan by {{vendor_list_due_date}}
- Insurance certificate: due by {{insurance_due_date}}

Nothing else from us between now and the walkthrough unless you have questions. You probably have a million things going on. We're handling our side.

— {{coordinator_name}}
```

### Template 6B: Final headcount and balance reminder

Subject: `Final headcount and balance — due {{due_date}}`

```
Hi {{first_name}},

Quick reminder — final headcount and balance are due by end of day {{due_date}}.

To submit:
- Headcount: just reply with the final number (and any dietary updates if they've changed)
- Balance: invoice is in HoneyBook ready to pay

Let me know if anything changed about your guest count or dietary needs and we'll adjust the catering.

— {{coordinator_name}}
```

### Template 6C: Day-before email

Subject: `See you tomorrow`

```
Hi {{first_name}},

Tomorrow's the day. Quick note from me — the team is set, the property is ready, the weather looks {{weather_forecast}}. Megan will be your point of contact starting tonight at the rehearsal dinner.

If anything comes up between now and then, my cell is {{coordinator_phone}}. Otherwise I'll see you tomorrow.

Have a great wedding.

— {{coordinator_name}}
```

### Template 6D: Day-of arrival SMS (with opt-in)

```
Hi {{first_name}} — Megan here. We're set up and ready when you are. Take your time getting here, and text this number if you need anything.
```

---

## 7. Post-Event Templates

### Template 7A: Day-after thank you

Subject: `Thank you for choosing Audrey's`

```
Hi {{first_name}},

What a beautiful wedding. We're already starting cleanup, but I wanted to send a quick note before the day got away from me.

A few things:
- Anything left behind will be set aside — let us know what to do with it
- Your photos from {{photographer_name}} will start coming in over the next few weeks
- We'll send a separate note in a couple weeks once you've had time to settle

Wishing you both an amazing first chapter.

— {{coordinator_name}}
```

### Template 7B: 2-week follow-up + review request

Subject: `How was it?`

```
Hi {{first_name}},

Hope the post-wedding glow has lasted. By now you're probably back from honeymoon or at least catching your breath.

Two asks if you have a minute:

1. We'd love a Google review if your experience was as good as we hope. Here's the link: {{google_review_link}}

2. If anything wasn't perfect, please tell me directly. The only way we get better is hearing what didn't work. No need to be diplomatic.

Either way — thank you for trusting us with your day.

— {{coordinator_name}}
```

### Template 7C: 1-year anniversary

Subject: `One year ago today`

```
Hi {{first_name}},

A year ago today you got married at Audrey's. Hope year one has been everything you wanted.

If you ever want to come back for an anniversary dinner, an overnight in the cottage, or just to walk the grounds, you have a standing welcome. Just hit reply.

— {{coordinator_name}}
```

### Template 7D: Referral request

Subject: `A small ask`

```
Hi {{first_name}},

I don't usually do this, so I'll keep it short. The best leads we get are from past couples telling their friends about us. If you know anyone who's planning a wedding and might be a good fit for what we do, I'd love an introduction — or you can just send them our way.

No pressure, no awkward follow-up if it's not the right time. Just appreciate you keeping us in mind if it ever is.

— {{coordinator_name}}
```

---

## 8. Lifecycle and Long-Tail Templates

### Template 8A: Quarterly newsletter skeleton

Subject: `What {{season}} looked like at Audrey's`

```
Hi {{first_name}},

{{seasonal_intro_2_to_3_sentences}}

{{feature_section_one_recent_wedding_or_behind_scenes}}

{{practical_news_calendar_capacity_offerings}}

{{relevant_link_blog_post_or_gallery}}

{{personal_one_sentence_close}}

— {{coordinator_name}}
[Unsubscribe link]
```

### Template 8B: Lost-deal reactivation (6 months out)

Subject: `Just checking in`

```
Hi {{first_name}},

Wasn't sure whether to send this. We last connected back in {{month_of_first_inquiry}} about {{date_they_were_looking_at}} — wanted to see how things landed. Did you find your venue? If you did, no need to reply — I just hate not knowing how a story ends.

If you didn't end up booking somewhere or your plans shifted, we're still here.

— {{coordinator_name}}
```

### Template 8C: Capacity announcement

Subject: `A few {{day_type}} dates we'd love to fill`

```
Hi {{first_name}},

Quick one — we have a few {{day_type}} dates open in {{month_or_season}} that we'd love to fill. These run about 25% off our standard Saturday rate, and the rest of the experience is identical.

Specific open dates:
- {{date_1}}
- {{date_2}}
- {{date_3}}

If you know anyone (or it's relevant to you), reply or send them our way.

— {{coordinator_name}}
```

---

## 9. AI Auto-Responder Specification

### What the auto-responder is

A first-touch response system that fires within 60 seconds of an inquiry arriving via the Audrey's website form, The Knot inbox, or HoneyBook inquiry intake. The AI generates a personalized inquiry response based on:

1. The inquiry form data (date, guest count, contact info, free-text note)
2. The Business Facts Reference (pricing for the requested date type, availability)
3. The first-touch templates from Section 2 of this document
4. The Brand Voice Guide

### What the auto-responder MUST do

- Respond within 60 seconds of inquiry submission
- Address the recipient by first name from the form
- Reference at least one specific detail from the inquiry's free-text field (or omit the callback line entirely if the field is empty — never fake personalization)
- State availability for the requested date by checking against the HoneyBook calendar
- Quote pricing exact to the date type and season per Business Facts Reference Section 4
- Propose the Cal.com tour scheduling link as the next step
- Sign off with the booking coordinator's name

### What the auto-responder MUST NOT do

- Generate any factual claim not supported by the Business Facts Reference
- Use any banned phrase from the Brand Voice Guide (stunning, magical, transform, elevate, unlock, seamlessly, robust, synergy, game-changer, dream wedding)
- Use em dashes anywhere
- Promise custom pricing, bespoke menu items, or exception to vendor policies
- Claim availability for a date that isn't actually open in the calendar
- Send if the inquiry contains red flags (spam, abusive language, repeated submissions from same email within 60 seconds)
- Send if the date requested is more than 18 months out — instead, send Template 2C variant explaining the calendar opens 18 months ahead
- Send to inquiries from VIP sources (named planner, repeat customer, press) — escalate to coordinator

### Variables pulled from the inquiry form

Required:
- `first_name`
- `email`
- `date_of_event`

Optional:
- `partner_first_name`
- `guest_count_estimate`
- `free_text_note` (used for the personalization callback)
- `phone_number`
- `referral_source`

### Variables pulled from Business Facts Reference

- `venue_price` for the requested date type and season
- `season_pricing_tier` derived from the date
- `calendar_link` (Cal.com URL)
- `coordinator_name` (currently the booking coordinator's name; updates if staff changes)
- `availability_status` checked against HoneyBook calendar in real time

### Escalation triggers (skip auto-response, route to human)

- Date is unavailable AND prospect has signaled premium budget
- Inquiry from a named planner on the preferred-planner list
- Inquiry from a past customer (email matches HoneyBook customer database)
- Inquiry contains accessibility needs not addressed in the FAQ Bank
- Inquiry contains language indicating special circumstance (memorial, vow renewal, accessibility, partner deceased)
- Inquiry from a press or media outlet
- Spam pattern detected (form submitted >3x in 60 seconds, suspicious email domain)

### Quality assurance loop

- First 30 days post-launch: every auto-response BCCed to the booking coordinator for review
- Coordinator flags any response that wouldn't have been sent by a human (drift, factual error, off-voice, missed personalization)
- Flags get fed back into the prompt weekly
- After 30 days of clean operation: coordinator reviews only escalated cases and a 10% sample
- Quarterly: full sample audit of 50 auto-responses for voice and accuracy drift

### How the auto-responder handles FAQ Bank questions

When the inquiry's free-text field contains a question covered in the FAQ Bank:
1. Detect the FAQ category
2. Pull the FAQ Bank's pre-approved answer
3. Lead the response with that answer (per Template 2B)
4. Continue with standard inquiry response elements (availability, pricing, CTA)
5. Apply the FAQ Bank's "do-not-say" guidance for that question

---

## End of Worked Example

The example above is a complete reference Email and Communication Templates document. Use this as the quality bar for any new client. The strongest indicator of a thorough job: every template, when read aloud with example variables filled in, sounds like a real person from the business wrote it — not a system.
