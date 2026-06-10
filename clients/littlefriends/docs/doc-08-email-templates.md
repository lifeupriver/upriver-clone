# Little Friends Learning Loft Email and Communication Templates

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** June 2026
**Version:** 1.0
**Last template review:** June 2026
**Next scheduled refresh:** September 2026 (quarterly)

**For:** Inquiry response automation, tour follow-up sequences, enrollment closing, new family onboarding, and any team member sending email or SMS in Rebecca's voice.

**Companion documents:**
- Document 01: Brand Voice Guide (the voice every template adheres to)
- Document 02: Business Facts Reference (the facts referenced in templates)
- Document 03: Sales Process Map (the process stages each template fires at)
- Document 07: FAQ Bank (the answer language reused in templates)
- Document 10: Automation Spec Package (where templates get operationalized in n8n, Sign-Up Genius, and email platforms)

**Critical principle:** Templates should feel like a person wrote them. The person is Rebecca. Variables fill in personalization; the surrounding language should never read as fill-in-the-blank. If a template sounds like it came from a software company's preschool portal, rewrite it.

---

## 1. Template Standards and Conventions

### Variables and personalization

All templates use the following variable convention:

- `{{first_name}}`: Parent's first name (primary contact on the inquiry or enrollment)
- `{{child_name}}`: Child's first name
- `{{child_age}}`: Child's current age or stated age at intended program start
- `{{program_of_interest}}`: Twos, Threes, Pre-K, or Aftercare
- `{{teacher_name}}`: First name of the lead teacher for the enrolled program (Tova for Twos, Carla for Threes, Dana for Pre-K). Used after "Miss" in templates; do not include "Miss" in this variable value.
- `{{school_year}}`: The program year under discussion (e.g., 2026-2027)
- `{{next_school_year}}`: The following year, used in re-enrollment templates
- `{{next_program}}`: The classroom the child would move into the following year
- `{{next_teacher}}`: The lead teacher for that next classroom
- `{{sign_up_genius_link}}`: Current Sign-Up Genius link for tour scheduling
- `{{application_link}}`: Link to the enrollment application
- `{{school_address}}`: [NEEDS CONFIRMATION: full address of Little Friends Learning Loft including suite or floor if applicable]
- `{{tour_date}}`: Date of the scheduled tour (formatted as "Tuesday, September 16")
- `{{tour_time}}`: Time of the scheduled tour
- `{{day_of_week}}`: Day of week of the tour
- `{{specific_detail}}`: A detail from the inquiry the responder should reference; sourced from the free-text field
- `{{month_of_inquiry}}`: Month of the original inquiry, used in reactivation templates
- `{{re_enrollment_deadline}}`: Date by which current families must confirm enrollment for the following year
- `{{decision_deadline}}`: Date by which a waitlisted family must respond to a spot offer
- `{{milestone_name}}`: Name of a specific pre-school-year meeting or visit (transition visit, parent orientation, etc.)
- `{{google_review_link}}`: [NEEDS CONFIRMATION: direct Google review link for Little Friends Learning Loft]

### Voice rules every template follows

From the Brand Voice Guide:

- **Warm over warm-and-pushy.** A parent should feel calmer after reading something from Rebecca, not sold to. These templates are not pitching. They are helping a family figure out if this is the right place for their child.
- **Honest over reassuring-but-vague.** If a classroom is full, say so. If waitlist timing is uncertain, name that uncertainty. Plain and kind.
- **Calm over urgent.** No false scarcity. No countdown pressure. The school is currently at 90% enrollment, but the honest response to that is "room for a few more" in the relevant classroom, not a flash sale.
- **First-person singular throughout.** "I" not "we." Rebecca is a person, not a committee.
- **Montessori vocabulary, used plainly.** When describing what children do in the classroom: "work," "the environment," "the materials," "the morning." When writing for families new to Montessori, lead with plain language and layer in method terms second.
- **No narrating the child's emotional future.** The school describes what the classroom is. The parent brings the emotional projection. Never write "your child will love it" or any equivalent.

Banned phrases (any appearance is a rewrite trigger): nurturing environment, where children thrive, loving and caring teachers, our little learners, second family, enriching experience, whole child, lifelong learners, growing minds, curious learners, emerging readers, play-based learning (unless carefully qualified), safe space, structured yet flexible, your most important decision, your child will blossom.

Generic marketing language to avoid in every template: stunning, transform, elevate, unlock, seamlessly, robust, synergy, game-changer, leverage, curated, best-in-class, premier, world-class, passionate, dedicated (without specifics).

Sentence openers to avoid: "I hope this finds you well," "Thank you so much for reaching out," "That's a great question," "I'm so excited to hear from you," any variant of "In today's fast-paced world."

### Subject line conventions

- Length: under 50 characters preferred; under 65 is the hard limit
- Capitalization: sentence case throughout (only proper nouns capitalized)
- No emoji
- No fake urgency, no all-caps, no more than one punctuation mark at the end
- First name in subject: appropriate for direct personal follow-ups; not for mass school communications

### Email structure conventions

- **Greeting:** "Hi {{first_name}}," every time. Not "Hello," not "Hey," not "Dear {{first_name}},"
- **First line:** Does something immediate. Acknowledges the inquiry, answers the question, or states the key news. No throat-clearing.
- **Length for inquiry responses and substantive emails:** 4-7 short paragraphs
- **Length for follow-ups, nudges, and short touches:** 1-3 sentences to one short paragraph
- **Paragraph length:** 2-4 sentences. No walls of text.
- **CTA:** One primary next step per email, stated clearly. Do not offer three paths and ask the family to choose.
- **Sign-off:** "- Rebecca" (hyphen, not em dash) for most templates. "Warmly, Rebecca" for closing touches and emotional moments such as first-week check-ins and end-of-year notes.
- **Signature block:** [NEEDS CONFIRMATION: standard signature content, including Rebecca's direct phone, address, and school name]

### When to use email vs. SMS vs. Instagram DM

- **Email:** Default for everything substantive. Tour confirmations, post-tour follow-ups, enrollment steps, pre-school-year logistics, and any communication a family needs to reference later.
- **SMS:** Time-sensitive only (day-of tour reminder, first-day morning note), and only with explicit opt-in confirmed at enrollment.
- **Instagram DM:** Reply on the platform when the inquiry arrives there. Move to email for all follow-up; do not sustain an enrollment conversation in DMs.
- **Brightwheel:** For enrolled families communicating about their child's day-to-day. Entirely separate from admissions. Response SLA for Brightwheel messages is same day during care hours.

### What to NEVER include in any template

- Tuition amounts or estimates of any kind. Tuition is intentionally not published and is shared during the enrollment conversation. The only publicly shareable dollar amount is the $75 registration fee.
- Specific classroom availability beyond what the Business Facts Reference confirms (Twos has room for a few more as of June 2026; Threes and Pre-K require confirmation before stating availability in any template).
- Any suggestion that the school accepts infants or children under age 2. This is a NYS OCFS licensing limit, not a preference, and there are no exceptions.
- False urgency or manufactured scarcity ("only 2 spots left," "act now before it's too late").
- Narration of the child's emotional future ("he will blossom," "she is going to love every morning").

---

## 2. First-Touch Templates (Inquiry Response)

### Template 2A: Standard inquiry, qualified, space likely available

**When this fires:** Inquiry arrives via email or Instagram DM. Child's age is 2 through 5. Basic criteria appear to be met. This is the large majority of inquiries.

**Goal:** Acknowledge quickly, confirm the right program by the child's age, offer tour times, and sound like Rebecca wrote it.

**Subject:** `Hi {{first_name}}, about {{child_name}} at the Loft`

**Body:**

```
Hi {{first_name}},

Thanks for reaching out about {{child_name}}. {{specific_detail_callback}}

Based on what you shared, the {{program_of_interest}} with Miss {{teacher_name}} sounds like the right fit for {{school_year}}. [NEEDS CONFIRMATION: one sentence on current availability for that specific classroom. Twos has room for a few more as of June 2026; Threes and Pre-K status must be confirmed before including any availability language.]

The best way to know if we are the right place for {{child_name}} is to come and see. I lead every tour myself. It takes about [NEEDS CONFIRMATION: typical tour length] and you will get to walk through the classrooms, ask whatever is on your mind, and get a real sense of what the mornings look like.

Tour times are here: {{sign_up_genius_link}}

If none of those work, just hit reply and we will figure something out.

- Rebecca
[NEEDS CONFIRMATION: signature block content]
```

**Notes for AI generators using this template:**
- `{{specific_detail_callback}}` references something specific from the inquiry's free-text field. Example: "Sounds like Noa is turning 3 in the fall, which puts her right in the Threes year." If the free-text field is empty or contains nothing usable, skip this line entirely. Do not invent a detail.
- Do not include tuition in this response. If the family asked about tuition in the same inquiry, use Template 2B instead and lead with the FAQ Bank answer for Q3.1.
- The CTA is exactly one thing: the Sign-Up Genius link. Do not list alternatives alongside it.

---

### Template 2B: Inquiry with a specific question

**When this fires:** Same as 2A, but the inquiry includes a direct question (most commonly: tuition cost, ratio, schedule options, Montessori philosophy, or classroom specifics).

**Subject:** `Hi {{first_name}}, about {{child_name}} at the Loft`

**Body:**

```
Hi {{first_name}},

Quick answer to your question about {{question_topic}}: {{faq_bank_answer}}

Beyond that, based on {{child_name}}'s age, the {{program_of_interest}} with Miss {{teacher_name}} is where {{he/she/they}} would be. [Availability sentence for that classroom, same as Template 2A.]

The best next step is to come and see the school. I lead every tour and we can go deeper on {{question_topic}} in person if you have more questions. Tour times are here:

{{sign_up_genius_link}}

- Rebecca
```

**Notes:**
- Lead with the direct answer. Do not bury it after a paragraph of standard inquiry language.
- Pull the FAQ Bank answer verbatim or within the approved adaptation range for that question. Do not freelance on factual questions.
- For tuition questions (Q3.1): the pre-approved answer explains that tuition is shared during the enrollment conversation, not before. The auto-responder and any human using this template follows that answer exactly. Do not quote or estimate tuition.

---

### Template 2C: Inquiry for a full or nearly full classroom

**When this fires:** Family inquires for a classroom that is at or near capacity. [NEEDS CONFIRMATION: Current waitlist status for Threes and Pre-K. Twos has confirmed room for a few more as of June 2026.]

**Subject:** `{{child_name}}'s inquiry: an honest update`

**Body:**

```
Hi {{first_name}},

Thank you for reaching out about {{child_name}}.

I want to be upfront: the {{program_of_interest}} for {{school_year}} is [full / nearly full], and I have a waitlist going. That said, I would still love to have you come and see the school. Families on the waitlist who have toured tend to have a much clearer sense of whether we are the right fit, and that helps both of us decide.

If you would like to see the school and get on the list: {{sign_up_genius_link}}

I will be honest with you about waitlist timing once we have talked. Movement depends on a few things I cannot predict right now, and I would rather tell you that directly than give you a number I am not confident in.

- Rebecca
```

**Notes:**
- Be honest about the waitlist. Do not create false hope with phrases like "we often have movement" and do not create pressure with "spots go quickly."
- Always invite to tour even for full classrooms. The tour serves both parties: the family learns what the school actually is, and Rebecca meets the family before any spot decision.

---

### Template 2D: Disqualified inquiry, child under age 2

**When this fires:** Inquiry arrives for a child who is not yet 2, or will not reach the program age cutoff by the intended program start date. [NEEDS CONFIRMATION: What is the exact age-eligibility cutoff date for the Twos program?]

**Subject:** `On your inquiry about {{child_name}}`

**Body:**

```
Hi {{first_name}},

Thank you for reaching out. I want to be upfront: Little Friends Learning Loft is licensed for children who are 2 and older. Based on what you shared, {{child_name}} would be under the minimum age for the programs we offer.

This is a licensing requirement, not a preference, so there are no exceptions.

The good news is that the Twos year is a wonderful starting point. If you would like to get in touch again when {{child_name}} is approaching 2, I would love to hear from you. You can reply to this message when the time is right and I will make sure we are discussing the right program year.

- Rebecca
```

**Notes:**
- No apology pile-on. State the fact warmly and directly, consistent with Q1.3 in the FAQ Bank.
- Offer a genuine path forward: come back when the child approaches 2.
- Do not imply any exception is possible. The licensing limit is absolute.

---

### Template 2E: Disqualified inquiry, other mismatch

**When this fires:** Inquiry does not match the school on scope, child age (over Pre-K), or a specific requirement the school cannot meet. [NEEDS CONFIRMATION: Are there additional disqualification criteria beyond age, such as geographic limits, JCC membership requirements, or others?]

**Subject:** `On your inquiry about {{child_name}}`

**Body:**

```
Hi {{first_name}},

Thank you for reaching out. Based on what you shared, I want to be honest with you: {{honest_reason_one_sentence}}.

[If a referral is appropriate:] What you are describing might be a better fit for {{referral_name_or_type}}. [NEEDS CONFIRMATION: Does Rebecca have specific programs or schools she refers families to for situations that do not fit Little Friends?]

Wishing you the best as you find the right place for {{child_name}}.

- Rebecca
```

---

## 3. Follow-Up Sequence Templates

The post-tour follow-up sequence is the most important part of this document. The Sales Process Map identifies the primary enrollment leak as: Rebecca gives a strong tour, then goes quiet for approximately two weeks, and families enroll elsewhere in the meantime. Sequence B below is the direct fix. It implements the exact four-step cadence from the Sales Process Map: same-day warm thank-you, Day 2-3 application and registration information, Day 7 gentle nudge, Day 14 final warm follow-up before marking the family dormant.

### Sequence A: After first response, no reply from the family

**Trigger:** First response sent (Template 2A or 2B), no reply from the family within 5 business days.

**Template 3A.1: Day 7 check-in**

Subject: `Still thinking about {{child_name}} at the Loft?`

```
Hi {{first_name}},

Just checking in. Did the information I sent help? Happy to answer more questions before a tour, or if {{child_name}}'s age or timing has changed since you wrote, let me know and I will make sure we are pointing you to the right program.

Tour link is still here: {{sign_up_genius_link}}

- Rebecca
```

**Template 3A.2: Day 14 final note**

Subject: `One more note on your inquiry`

```
Hi {{first_name}},

Last note from me on this. If the timing was not right or you have gone in a different direction, that is completely fine. Just let me know and I will close out my file. If you are still thinking about it, I am here.

- Rebecca
```

**Notes:**
- Keep both touches short. Do not add new information at this stage. The goal is to lower the barrier to replying, not to resell.
- Naming this as the final note often re-engages people who have been intending to reply but keep deferring.

---

### Sequence B: After the tour, no enrollment decision

**Trigger:** Tour completed. No application submitted and no clear verbal next step agreed on. This is the primary enrollment leak named in the Sales Process Map.

The four steps below follow the exact cadence from the Sales Process Map.

---

**Template 3B.1 / Template 4E: Same-day warm thank-you (the first step of this sequence)**

[NOTE: This template also appears as Template 4E in Section 4. The same-day thank-you is both the close of the tour experience and the opening of the post-tour follow-up sequence. It fires the evening of the tour, or no later than the close of the next business day.]

Subject: `Great meeting you today`

```
Hi {{first_name}},

It was really good to meet you and {{child_name}} today. I hope the visit gave you a clear picture of what the mornings here actually look like.

{{one_specific_observation_from_the_tour}}

Take your time thinking it through. If anything came up on the drive home that you forgot to ask, just hit reply.

- Rebecca
```

**Note on the personal observation line:** This line is what prevents the email from feeling like a form. Write one sentence about something specific from the visit: the child's reaction to a material, a question the parent asked that was worth sitting with, something happening in a classroom that day. If nothing specific comes to mind, omit the line. Do not write a generic placeholder. One real sentence does more work than three careful ones.

---

**Template 3B.2: Day 2-3, application and registration information**

Subject: `The next step, when you are ready`

```
Hi {{first_name}},

If you are ready to move forward, here is what the enrollment process looks like:

1. Complete the application: {{application_link}}
2. Pay the $75 registration fee, which secures your application
3. I will confirm the enrollment and walk you through the deposit and next steps from there

If you have questions before filling out the application, or if you want to talk through the program or the transition, just reply. Happy to get on a quick call.

- Rebecca
```

**Notes:**
- This is the action-enabling step. Name the $75 registration fee because it is the only publicly shareable amount and it gives the family a concrete first move. Do not quote tuition or deposit amounts here; those are shared during the enrollment conversation.
- One path, stated clearly. Do not add alternatives alongside the application link.

---

**Template 3B.3: Day 7 gentle nudge**

Subject: `Checking in after your tour`

```
Hi {{first_name}},

Wanted to check in. If you are still deciding, I am happy to answer any questions that came up. If you are ready to move forward, the application link is here:

{{application_link}}

If you have gone in a different direction, just let me know.

- Rebecca
```

---

**Template 3B.4: Day 14 final warm follow-up before marking dormant**

Subject: `Final note from me`

```
Hi {{first_name}},

This will be my last follow-up for now. The {{program_of_interest}} still has [NEEDS CONFIRMATION: availability language for this classroom] and the door is open whenever you are ready. If life got busy and the timing is not right yet, I understand.

If anything changes, you know where to find me.

- Rebecca
```

**Notes:**
- Naming this as the final note is not giving up; it respects the family's time. It also frequently triggers a reply from families who have been meaning to respond.
- If the classroom genuinely has limited space remaining, that is accurate information worth naming once in this template. Do not repeat it as pressure across earlier touches.

---

### Sequence C: After verbal commitment, no application submitted

**Trigger:** Family said they want to enroll during or after the tour, but has not submitted the application or paid the $75 registration fee within 5 business days.

**Template 3C.1: Day 5**

Subject: `Anything I can help with on the application?`

```
Hi {{first_name}},

Wanted to check in on the application for {{child_name}}. Sometimes there is a question or a piece of information that slows things down. Happy to walk through it on a quick call if that would help.

Application link: {{application_link}}

- Rebecca
```

**Template 3C.2: Day 10**

Subject: `Should I hold {{child_name}}'s spot?`

```
Hi {{first_name}},

I want to be straightforward: I have been informally holding {{child_name}}'s spot while waiting for the application, but I cannot keep it open indefinitely without something in writing. If you are still planning to move forward, even a quick reply helps me know. If your situation has changed, that is completely fine. Just let me know and I will open the spot back up.

- Rebecca
```

---

### Sequence D: Lost-lead closeout

**Trigger:** Family has declined, gone silent past Day 14 of the post-tour sequence, or explicitly said no.

**Template 3D.1**

Subject: `Closing out our file`

```
Hi {{first_name}},

Closing out the file on {{child_name}} for now. Thank you for taking the time to come and see the school. If your situation changes, or if you know a family looking for a Montessori preschool in Newburgh, please keep us in mind.

Wishing you the best.

- Rebecca
```

---

## 4. Conversion Event Templates (Tour)

### Template 4A: Tour confirmation

**When this fires:** Family schedules a tour via Sign-Up Genius.

**Subject:** `You are confirmed for {{tour_date}}`

**Body:**

```
Hi {{first_name}},

You are set for {{day_of_week}}, {{tour_date}} at {{tour_time}}. Looking forward to meeting you and {{child_name}}.

A few details:
- Address: {{school_address}} [NEEDS CONFIRMATION: full address with any parking-specific entrance note]
- Parking: [NEEDS CONFIRMATION: parking instructions]
- Tour length: about [NEEDS CONFIRMATION: typical tour duration]
- Dress: comfortable; we will walk through the classrooms [NEEDS CONFIRMATION: does the tour typically include time outside?]
- Who you will meet: me, Rebecca

If you need to reschedule, just hit reply.

- Rebecca
```

---

### Template 4B: 48-hour tour reminder

**Subject:** `See you {{day_of_week}}`

**Body:**

```
Hi {{first_name}},

Quick reminder: you are confirmed for {{tour_date}} at {{tour_time}}. Address and parking details are in the confirmation I sent earlier.

Looking forward to it.

- Rebecca
```

---

### Template 4C: Day-of tour reminder (email)

**Subject:** `Today at {{tour_time}}`

**Body:**

```
Hi {{first_name}},

See you today at {{tour_time}}. Let me know if anything comes up.

- Rebecca
```

---

### Template 4D: Tour no-show / reschedule offer

**When this fires:** Family does not appear for their scheduled tour, or cancels with short notice.

**Subject:** `Rescheduling your tour`

**Body:**

```
Hi {{first_name}},

Looks like today did not work out. These things happen. Would you like to reschedule? Here is the current Sign-Up Genius with available times:

{{sign_up_genius_link}}

Or just reply and we will find something that works.

- Rebecca
```

---

### Template 4E: Post-tour same-day thank-you

This template is identical to Template 3B.1 in Sequence B. See the notes in that section on writing the personal observation line. The same-day thank-you IS the opening of the post-tour follow-up sequence; there is no separate "thank you" email that exists outside that sequence.

---

## 5. Closing and Onboarding Templates

### Template 5A: Application received and deposit confirmed, family is enrolled

**When this fires:** Application submitted, $75 registration fee paid, deposit received. The family is officially enrolled.

**Subject:** `{{child_name}} is enrolled`

**Body:**

```
Hi {{first_name}},

It is official. {{child_name}} is enrolled in the {{program_of_interest}} for {{school_year}} with Miss {{teacher_name}}.

Here is what happens next:

1. [NEEDS CONFIRMATION: first milestone, such as orientation, supply list, health forms, etc.]
2. [NEEDS CONFIRMATION: second milestone, such as a transition visit or parent meeting]
3. First day: [NEEDS CONFIRMATION: first day of school date for the upcoming year]

In the meantime, [NEEDS CONFIRMATION: any action item for the family before school starts, such as submitting health records or completing an emergency contact form].

If anything comes up between now and the first day, you have my email. I am here.

- Rebecca
```

---

### Template 5B: Pre-school-year information and preparation

**When this fires:** After enrollment confirmation, as the school year approaches. [NEEDS CONFIRMATION: When does Rebecca send this? 4 weeks out, 6 weeks out? Is there an existing welcome packet?]

**Subject:** `Getting ready for {{school_year}}`

**Body:**

```
Hi {{first_name}},

We are getting close to the start of the school year. A few things to have in place before {{child_name}}'s first day:

- [NEEDS CONFIRMATION: required documentation, such as health forms, vaccination records, and emergency contacts]
- [NEEDS CONFIRMATION: supply list or what to bring]
- [NEEDS CONFIRMATION: first-day drop-off logistics (time, location, procedure)]
- [NEEDS CONFIRMATION: transition or orientation schedule, if any]

Nothing here is a cause for alarm. Just logistics. If you have questions about any of it, reply and I will sort it out.

One thing I want to say plainly: during the first weeks, some children transition right in and some take more time. Both are completely normal, and both have happened many times in every classroom here. If {{child_name}}'s first days are hard, I will let you know, and we can talk it through together.

Warmly, Rebecca
```

---

### Template 5C: Milestone scheduling (transition visit, parent orientation, or equivalent)

**When this fires:** [NEEDS CONFIRMATION: What pre-start-of-year meetings or visits does the school schedule? Are there transition visits, parent information nights, or classroom orientations? Which apply by program?]

**Subject:** `Time to schedule {{child_name}}'s {{milestone_name}}`

**Body:**

```
Hi {{first_name}},

We are [X weeks] out from the start of {{school_year}}, which means it is time to schedule {{child_name}}'s {{milestone_name}}.

Here is what it involves: [NEEDS CONFIRMATION: 2-3 sentence description of what the milestone meeting or visit covers and how long it takes.]

To pick a time: [NEEDS CONFIRMATION: Is this Sign-Up Genius, direct email, or another process?]

- Rebecca
```

---

## 6. Pre-School-Year and First-Days Templates

### Template 6A: Back-to-school countdown and first-day logistics

**When this fires:** Approximately 2 weeks before the first day of school, sent to all enrolled families.

**Subject:** `Two weeks to the first day`

**Body:**

```
Hi {{first_name}},

Two weeks from [NEEDS CONFIRMATION: first day date for the school year]. Here is the practical information for that morning:

- Drop-off: [NEEDS CONFIRMATION: drop-off time, location, and procedure by program]
- Pick-up: [NEEDS CONFIRMATION: pick-up time and procedure]
- What to bring: [NEEDS CONFIRMATION: confirmed list]
- Aftercare pickup: [NEEDS CONFIRMATION: if applicable]

One note for families whose child is starting school for the first time: the first drop-off is sometimes hard, even when you feel ready. That is so normal. Miss {{teacher_name}} has done this many times and will tell you how {{child_name}} is doing once you are out the door.

Anything between now and the first day, just reply.

- Rebecca
```

---

### Template 6B: First-week check-in for new families

**When this fires:** End of the first week of school, sent to all newly enrolled families. Existing families who are returning to the school do not receive this email.

**Subject:** `How was the first week?`

**Body:**

```
Hi {{first_name}},

Made it through the first week. How did {{child_name}} do?

If the mornings were hard, that is completely normal, and Miss {{teacher_name}} can tell you more about how {{he/she/they}} was doing once you were out of sight. If you have specific questions about what the days looked like for {{child_name}}, just reply.

If everything was fine and you are already forgetting to worry, that is also great.

Either way, I am glad you are here.

Warmly, Rebecca
```

---

### Template 6C: First-day morning note (SMS, with opt-in)

**When this fires:** Morning of the first day of school. Sent only to families who gave explicit SMS opt-in during enrollment. Sent by Rebecca.

```
Hi {{first_name}}, Rebecca at Little Friends. {{child_name}}'s first day today. We are ready for them. Text this number if you need anything.
```

---

## 7. Retention and Year-End Templates

### Template 7A: End-of-year thank-you

**When this fires:** Last week of the school year, sent to all enrolled families.

**Subject:** `{{school_year}}: thank you`

**Body:**

```
Hi {{first_name}},

The {{school_year}} school year is almost done. I wanted to send a note before the summer gets away from me.

Watching {{child_name}} in Miss {{teacher_name}}'s classroom this year was [use something real and specific here if possible; if not, "a genuine pleasure" is accurate and honest]. The work {{he/she/they}} got into over the year showed something real.

Thank you for trusting us with this year. I mean that.

If {{child_name}} is returning in the fall, you will hear from me soon about {{next_school_year}} enrollment. If this was the last year before kindergarten, I hope the next chapter is everything you are hoping for.

Warmly, Rebecca
```

---

### Template 7B: Re-enrollment invitation for returning families

**When this fires:** [NEEDS CONFIRMATION: When does Rebecca open re-enrollment? Typically mid-year for the following school year, before opening enrollment to new families.] Sent to currently enrolled families before the waitlist or new inquiries are addressed.

**Subject:** `Holding {{child_name}}'s spot for next year`

**Body:**

```
Hi {{first_name}},

Before I open enrollment for {{next_school_year}} to families on the waitlist and new inquiries, I want to give current families the first chance to hold their spot.

{{child_name}} would move into the {{next_program}} with Miss {{next_teacher}} next fall. To confirm, I need [NEEDS CONFIRMATION: what action is required (re-registration, a deposit, or a form)?] by {{re_enrollment_deadline}}.

If your plans for next year have changed, no problem. Just let me know and I will open the spot to the next family waiting.

- Rebecca
```

---

### Template 7C: Review request

**When this fires:** 2-4 weeks after the close of the school year.

**Subject:** `A quick ask`

**Body:**

```
Hi {{first_name}},

Hope the start of summer is going well. Two things, both quick:

First, if your experience at the Loft this year was good, a Google review is one of the best ways to help other Newburgh families find us. Most families find us through word of mouth. A review is that, written down. Here is the link: {{google_review_link}}

Second, if anything this year was not good, please tell me directly (in a reply to this email, not in a review). That is the only way I actually learn what to fix.

Thank you either way.

- Rebecca
```

---

### Template 7D: Referral request

**When this fires:** 4-8 weeks after the end of the school year, sent to families who have not already referred someone or whose referral is not already in the inquiry pipeline.

**Subject:** `A small ask`

**Body:**

```
Hi {{first_name}},

I do not do this often, so I will keep it short.

Most of our families find us through other families. If you know someone with a child who is 2, 3, or 4 and looking for a Montessori preschool in Newburgh, I would love an introduction. You can send them to me directly or share the tour link.

No pressure, no awkward follow-up. Just appreciate you keeping us in mind if it ever comes up.

- Rebecca
```

---

## 8. Lifecycle and Long-Tail Templates

### Template 8A: Quarterly newsletter (skeleton)

**When this fires:** Quarterly, sent to enrolled families and opted-in past families and community contacts. [NEEDS CONFIRMATION: Does Rebecca currently send any newsletter or email to a broader list? Is there an existing email list outside of enrolled families?]

**Subject:** `[Theme for the quarter, e.g., "The last weeks before summer at the Loft"]`

**Body:**

```
Hi {{first_name}},

{{intro_2_to_3_sentences_tied_to_the_season_or_a_specific_moment}}

{{feature_section: describe one specific thing that happened in the school; a particular child's work, a moment in a classroom, a new addition to the environment. Specific over general. "Three children in the Twos room spent four mornings at the pouring work" beats "children are engaged in practical life activities."}}

{{practical_news: re-enrollment dates, upcoming events, schedule notes for the following season}}

{{one_sentence_close: personal, not a boilerplate sign-off}}

- Rebecca
[Unsubscribe link]
```

**Notes:**
- Sentence case throughout. First-person singular. Calm tone.
- The feature section is the one that makes this worth opening. Write one real thing that happened, not a category of thing. This is where the school's actual character comes through.

---

### Template 8B: Lost-lead reactivation (6 months after inquiry went cold)

**When this fires:** Family inquired, did not tour, or toured and did not enroll, and is now 6 or more months out from the original contact. [NEEDS CONFIRMATION: Seasonal enrollment patterns. Should this be timed to when enrollment for the next year opens, rather than a flat 6-month interval?]

**Subject:** `Checking in`

**Body:**

```
Hi {{first_name}},

We last talked back in {{month_of_inquiry}} about {{child_name}} and the {{program_of_interest}} for {{school_year}}. Wanted to follow up and see how things landed.

If you found the right school, I hope it has been a good year. If your plans changed or the timing never worked out, and {{child_name}} is still approaching school age, I would love to hear from you.

- Rebecca
```

---

### Template 8C: Waitlist notification, spot has opened

**When this fires:** A family on the waitlist for a specific classroom now has an actual available spot.

**Subject:** `A spot opened up for {{child_name}}`

**Body:**

```
Hi {{first_name}},

A spot opened up in the {{program_of_interest}} for {{school_year}}. I wanted to reach you before moving down the list.

If you are still interested, here is what the next step looks like: complete the application ({{application_link}}) and pay the $75 registration fee. That secures the spot. I need to hear from you by {{decision_deadline}}.

If your situation has changed or you have already enrolled {{child_name}} somewhere else, no problem at all. Just let me know and I will move on to the next family.

- Rebecca
```

---

## 9. AI Auto-Responder Specification

### What the auto-responder is

A first-touch acknowledgment system that fires within 60 seconds of an inquiry arriving via the school's email intake or Instagram DM. The auto-responder is a **handoff tool, not an autonomous responder.** Its job is to:

1. Confirm the inquiry was received
2. Answer basic program and eligibility questions using the FAQ Bank's pre-approved language
3. Offer the Sign-Up Genius tour link as the next step
4. Set a clear expectation for when Rebecca will follow up personally

Rebecca follows up within 1 business day of the auto-reply. The auto-responder does not replace that follow-up; it prevents the gap between "inquiry submitted" and "Rebecca sees it" from feeling like silence to the family.

### What the auto-responder MUST do

- Fire within 60 seconds of inquiry submission via email or Instagram DM
- Address the parent by first name if captured from the form; use a generic but warm greeting ("Hi there,") if not
- Reference the child's age and name the corresponding program, if the child's age was provided
- Offer the Sign-Up Genius tour link as the explicit next step
- Answer basic FAQ questions included in the inquiry text, using the FAQ Bank's pre-approved language
- Set the expectation that Rebecca will be in touch within 1 business day (or "the next school day" if outside school hours)
- Sign off as Rebecca, not as "the team" or anonymously

### What the auto-responder MUST NOT do

- Quote tuition or estimate tuition in any form. The only dollar amount it may name is the $75 registration fee, and only in the enrollment-step context (not in an initial inquiry response)
- State or imply specific classroom availability or lack thereof. Leave availability confirmation to Rebecca.
- Confirm enrollment, hold spots, or make any commitment beyond "I will be in touch"
- Generate any factual claim not supported by the Business Facts Reference
- Use any banned phrase from the Brand Voice Guide (nurturing environment, where children thrive, second family, whole child, lifelong learners, play-based learning, safe space, etc.)
- Send if the inquiry indicates the child is under 2. Route to a human review queue for Template 2D instead.
- Send if the inquiry contains red flags (spam pattern, no child information, no contact information, message is clearly not an enrollment inquiry)
- Claim that Rebecca will respond immediately outside of school hours; instead, name the next school day honestly
- Use em dashes anywhere in the message

### Variables pulled from the inquiry form

Required for auto-response:
- `first_name` (parent)
- `email`
- `child_age` or indication of child's age (used to name the right program)

Optional (used to improve personalization and routing):
- `child_name`
- `program_interest`
- `free_text_note` (scanned for FAQ-triggering questions; also used to detect infant/under-2 inquiries for escalation)
- `phone_number`

### Variables pulled from the Business Facts Reference

- Program-to-teacher mapping: Twos with Miss Tova (1:5 ratio), Threes with Miss Carla (1:7), Pre-K with Miss Dana (1:8)
- $75 registration fee: the only dollar figure the auto-responder may name
- Sign-Up Genius link for tour scheduling
- Rebecca's name and contact information

### Escalation triggers: skip auto-response, route to human review

- Child's age appears to be under 2 based on the inquiry. Route to Template 2D, to be sent by Rebecca or a human reviewer.
- Inquiry does not include a child's age or any enrollment-related context (may be spam, a press inquiry, or an administrative message)
- Message contains language indicating an exceptional circumstance: significant accessibility need, behavioral concern requiring direct conversation, or medical complexity
- Message appears to be from a currently enrolled family rather than a prospective family (route to Brightwheel or direct email to Rebecca; the inquiry auto-responder is not the right channel)
- Same email address or phone number has submitted 3 or more inquiries within 24 hours (spam pattern)
- [NEEDS CONFIRMATION: Any additional escalation triggers Rebecca identifies in the first 30 days of auto-responder operation]

### How the auto-responder handles FAQ Bank questions

When the inquiry's free-text field contains a question covered in the FAQ Bank:
1. Identify the FAQ category (program, enrollment, pricing, logistics, pedagogy)
2. Pull the FAQ Bank's pre-approved answer verbatim or adapted within the approved range
3. Lead the response with the direct answer, then continue with the standard acknowledgment and tour link (per Template 2B structure)
4. Follow each FAQ's "do-not-say" guidance for that question

For tuition questions (Q3.1): the only answer available to the auto-responder is that tuition is shared during the enrollment conversation, not before. This is not a limitation of the auto-responder's capability; it is a deliberate policy. The auto-responder follows it exactly.

For infant/under-2 inquiries (Q1.3): do not fire the standard auto-response. Route to human review queue so Template 2D can be sent with appropriate warmth and care.

### Quality assurance loop

- First 30 days post-launch: every auto-response is also forwarded to Rebecca for review
- Rebecca flags any response she would not have sent herself: voice drift, factual error, missed escalation, inappropriate use of banned language, or a template that felt wrong for the specific inquiry
- Flags are collected weekly and translated into prompt or template updates before the following week
- After 30 days of clean operation: Rebecca reviews escalated cases and a 10% random sample of all auto-responses
- Quarterly: full audit of 20-30 auto-responses for voice accuracy, factual correctness, and any drift from the Brand Voice Guide
- Any update to Section 2 first-touch template language triggers a parallel review of the auto-responder instructions for consistency
