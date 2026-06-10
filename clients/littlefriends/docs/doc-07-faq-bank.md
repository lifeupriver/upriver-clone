# Little Friends Learning Loft FAQ and Common Questions Bank

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** June 2026
**Version:** 1.0
**Last review:** June 2026
**Next scheduled review:** September 2026

**For:** Chatbot answers, inquiry auto-responder content, website FAQ page, customer service email templates, and any AI-generated customer-facing response.

**Companion documents:**
- Document 01: Brand Voice Guide (voice for all answers)
- Document 02: Business Facts Reference (facts behind all answers)
- Document 08: Email Templates (email-specific application of these answers)
- Document 10: Automation Spec Package (where these answers get wired into automated systems)

**Critical principle:** Every question here has a single authoritative answer. When the chatbot, the auto-responder, the coordinator, and the director all answer the same customer question differently, trust erodes. This document establishes the single answer for each common question, then all downstream systems reference it. Variations in phrasing are fine and encouraged; variations in substance are not.

---

## 1. Categorized Question Inventory

Total questions covered: 35

**Category A: Programs and age eligibility**
- Q1.1: What programs do you offer?
- Q1.2: What ages do you serve?
- Q1.3: Do you accept infants or children under 2?
- Q1.4: What is the Twos program?
- Q1.5: What is the Threes program?
- Q1.6: What is the Pre-K program?
- Q1.7: Do you offer aftercare?

**Category B: Enrollment and tours**
- Q2.1: How do I find out if there is space for my child?
- Q2.2: How do I schedule a tour?
- Q2.3: What happens at a tour?
- Q2.4: Is there a waitlist?
- Q2.5: When does enrollment open for the next school year?
- Q2.6: What is the enrollment process once we decide to move forward?

**Category C: Pricing and costs**
- Q3.1: How much does tuition cost?
- Q3.2: Is there a registration fee?
- Q3.3: What is the deposit?
- Q3.4: Are there sibling discounts or other financial considerations?

**Category D: Schedule and calendar**
- Q4.1: What are the school hours?
- Q4.2: Do you offer part-week enrollment (fewer than 5 days)?
- Q4.3: Do you offer summer school or summer care?
- Q4.4: Do you offer transportation?
- Q4.5: Do you offer before-school care?

**Category E: Curriculum and approach**
- Q5.1: What approach does Little Friends Learning Loft use?
- Q5.2: How is Montessori different from a regular preschool?
- Q5.3: Is there homework or worksheets?
- Q5.4: How do you handle challenging behavior?

**Category F: Meals, health, and safety**
- Q6.1: Do you provide meals or snacks?
- Q6.2: Can you accommodate food allergies?
- Q6.3: What is your sick child policy?
- Q6.4: What are the drop-off and pickup procedures?

**Category G: Transition and settling in**
- Q7.1: My child has never been in school before. How do you handle the first days?
- Q7.2: What if my child cries every morning at drop-off?

**Category H: Staff, ratios, and the school community**
- Q8.1: How many children are in each classroom, and how many teachers?
- Q8.2: Do we need to be JCC members to enroll?
- Q8.3: How do I reach my child's teacher?

### How to use this document

- **Chatbot:** Match the customer's question to the closest Q in this document, return the A adapted slightly for context.
- **Auto-responder:** The answer_template field in each Q is the default; adapt tone to match the specific inquiry.
- **Email templates:** Pull answers from here as pre-written blocks; customize greeting and close per template.
- **Human representatives:** Reference when a family asks something and the "official" answer isn't immediately clear.

---

## 2. Programs and Age Eligibility

### Q1.1: What programs do you offer?

**Answer (pre-approved):**

Little Friends Learning Loft offers four programs: the Twos class (for children who are 2 years old), the Threes class (for children who are 3), Pre-K (for children who are 4, sometimes called the fours), and Aftercare after the school day ends. All three classroom programs follow the Montessori approach. The classes are small and each is led by a named, consistent teacher: Miss Tova in the Twos, Miss Carla in the Threes, and Miss Dana in Pre-K.

The school serves children ages 2 through 5. It is not licensed for infant care.

**Facts referenced:**
- Doc 02, Section 3: core program offerings (Twos, Threes, Pre-K, Aftercare)
- Doc 02, Section 2: teacher names by classroom (Tova, Carla, Dana)
- Client profile, offerings.core

**Voice notes:**
- Conversational and factual. Families asking this are usually early in research and want a clear picture, not a pitch.
- Name the teachers by name. "Miss Tova, Miss Carla, Miss Dana" is more personal than "our experienced staff."

**When to deflect to a human:**
- Never, for this question. It is foundational and always safe to answer directly.

**Follow-up prompt:**
"Which age is your child? I can tell you more about the specific class that would be the right fit."

**Don't say:**
- "We offer a rich array of programs" (vague and corporate)
- "Our programs are designed to help children thrive" ("thrive" is a banned word per doc-01)
- "We have something for every child" (not accurate; not every child is the right fit for Montessori)

---

### Q1.2: What ages do you serve?

**Answer (pre-approved):**

Little Friends Learning Loft is licensed for children ages 2 through 5. The three classroom programs are the Twos, the Threes, and Pre-K (for fours). Children who turn 2 by [NEEDS CONFIRMATION: What is the age-eligibility cutoff date for the Twos program?] are eligible for the Twos program. Pre-K is the final year before kindergarten.

If your child is under 2, the school is not able to help with that. Little Friends is licensed by NYS OCFS for age 2 and up, and there are no exceptions to that line.

**Facts referenced:**
- Doc 02, Section 1 (Identity): licensed for ages 2 through 5, NYS OCFS
- Doc 02, Section 3 (Programs): Twos, Threes, Pre-K
- Client profile, offerings.dontDo

**Voice notes:**
- The infant limitation comes up frequently, often from parents who are planning well in advance. Answer directly but warmly.
- Don't apologize at length. State the fact, then offer a useful next step.

**When to deflect:**
- Never, for this. A factual answer is appropriate every time.

**Follow-up prompt:**
"How old is your child, and when were you hoping to start?"

**Don't say:**
- "Unfortunately we can't take infants" (the "unfortunately" implies negotiability; just state the fact)
- "We only serve a limited age range" (vague; be specific: 2 through 5)

---

### Q1.3: Do you accept infants or children under 2?

**Answer (pre-approved):**

No. Little Friends Learning Loft is licensed by NYS OCFS for children ages 2 and up. That licensing line is firm, and there are no exceptions.

If your child is not yet 2, I'd be glad to follow up when they are closer to that age. Many families stay in touch and check back in when their child turns 2. Is that something that would be helpful?

**Facts referenced:**
- Doc 02, Section 1: NYS OCFS licensed, ages 2 and up
- Client profile, offerings.dontDo

**Voice notes:**
- Parents asking this often have a baby and are planning ahead. The tone should be warm and not dismissive.
- Offer a path forward: stay in touch for when the child is older.

**When to deflect:**
- Never. This is a factual limitation. State it clearly.

**Follow-up prompt:**
"When will your child turn 2? I can let you know the right time to reach back out about the Twos program."

**Don't say:**
- "We'd love to help but unfortunately..." (false sympathy)
- "That's a great question" (filler)
- Any implication that exceptions exist

---

### Q1.4: What is the Twos program?

**Answer (pre-approved):**

The Twos class is led by Miss Tova and is one of the smallest and most intentional programs in the school: one teacher for every five children. For many families, this is their child's first school experience.

The program follows the Montessori approach, which means children work with hands-on materials and real, purposeful tasks rather than worksheets or group instruction. The morning centers on building the habits that make school feel safe and consistent.

[NEEDS CONFIRMATION: What are the schedule options for the Twos (days per week, half-day vs. full-day, start and end times)?]

**Facts referenced:**
- Doc 02, Section 2: Miss Tova leads the Twos
- Doc 02, Section 5: 1:5 ratio for the Twos class
- Client profile, capacity.metrics

**Voice notes:**
- Families asking about the Twos are often new to the whole idea of school. Keep the answer warm and reassuring. Emphasize the small ratio and Tova's role by name.
- Don't oversell readiness or academic outcomes; emphasize safety and consistency.

**When to deflect:**
- If a parent has specific concerns about whether their child is "ready," route to Rebecca after acknowledging the question.

**Follow-up prompt:**
"Is this your child's first school experience, or have they been in any care setting before?"

**Don't say:**
- "Your child will love it" (narrates the child's future; doc-01 forbids this)
- "Nurturing environment" (banned phrase per doc-01)
- "Second family" (banned phrase per doc-01)

---

### Q1.5: What is the Threes program?

**Answer (pre-approved):**

The Threes class is led by Miss Carla. The ratio is one teacher for every seven children. Children in this program are building on what they started at 2 (or entering school for the first time), and the Montessori work in this class begins to layer in more intentional pre-literacy, pre-numeracy, and social practice.

[NEEDS CONFIRMATION: What are the schedule options for the Threes (days per week, half-day vs. full-day, start and end times)?]

**Facts referenced:**
- Doc 02, Section 2: Miss Carla leads the Threes
- Doc 02, Section 5: 1:7 ratio for the Threes

**Voice notes:**
- This is often the first school experience for children who skipped the Twos year. Acknowledge that gently if the parent indicates it.

**When to deflect:**
- Never for factual questions about program structure. Route to Rebecca for anything touching specific child readiness or a particular child's situation.

**Follow-up prompt:**
"Is your child currently in the Twos here, or would this be a new enrollment?"

**Don't say:**
- "Your child will develop a love of learning" (narrates the child's future)
- "Play-based" (doc-01 flags this as muddying the Montessori philosophy)

---

### Q1.6: What is the Pre-K program?

**Answer (pre-approved):**

The Pre-K class is led by Miss Dana and serves four-year-olds in their last year before kindergarten. The ratio is one teacher for every eight children. In the Montessori framework, this is the year when the abstract connections begin to land: children who have been handling physical materials for two or three years start making the leap from concrete to symbolic understanding.

Pre-K at Little Friends is the final year of the mixed-age arc. Children who have been in the environment since the Twos typically move through Pre-K with real confidence.

[NEEDS CONFIRMATION: What are the schedule options for Pre-K (days per week, half-day vs. full-day, start and end times)?]

**Facts referenced:**
- Doc 02, Section 2: Miss Dana leads Pre-K
- Doc 02, Section 5: 1:8 ratio for Pre-K
- Doc 01, Section 5: "concrete to abstract" Montessori vocabulary; "mixed-age"

**Voice notes:**
- Parents asking about Pre-K are often thinking about kindergarten readiness. Don't use the phrase "school-ready" (doc-01 flags it as a loaded phrase). Describe what children actually gain in concrete terms.

**When to deflect:**
- Never for program overview questions. Route to Rebecca for specific kindergarten transition questions.

**Follow-up prompt:**
"Is your child turning 4 this year, or are you planning a year ahead?"

**Don't say:**
- "School-ready" (doc-01 explicitly flags this)
- "Your child will be fully prepared for kindergarten" (overpromises)
- "Emerging readers" (banned phrase per doc-01)

---

### Q1.7: Do you offer aftercare?

**Answer (pre-approved):**

Yes. Aftercare runs after the regular school day and is available for enrolled families. It is staffed by Yael.

[NEEDS CONFIRMATION: What hours does aftercare run?]
[NEEDS CONFIRMATION: Is aftercare available to all enrolled age groups, or only some?]
[NEEDS CONFIRMATION: Is aftercare priced separately from tuition, and if so, what does it cost?]
[NEEDS CONFIRMATION: Is there a waitlist for aftercare?]

For the specifics on aftercare availability and cost, the right conversation is with Rebecca.

**Facts referenced:**
- Doc 02, Section 3: Aftercare listed as a core program
- Doc 03, Section 3: "Aftercare with Yael" referenced in qualification criteria

**Voice notes:**
- Parents asking about aftercare are usually weighing a real logistical question (can I make pickup work?). Answer with what you have and route quickly for the rest. Don't speculate.

**When to deflect:**
- All cost questions route to Rebecca (director) or Linda (bookkeeper). See Section 10, Deflection Templates.

**Follow-up prompt:**
"Do you have a specific pickup time window you need coverage for? That helps Rebecca answer the right question."

**Don't say:**
- "We have a great aftercare program" (vague)
- Any specific hours or costs that are not confirmed

---

## 3. Enrollment and Tours

### Q2.1: How do I find out if there is space for my child?

**Answer (pre-approved):**

The best first step is a tour. Little Friends Learning Loft has 58 licensed spots total across all three classrooms. Right now, there is room for a few more children in the Twos. I can share what's open and walk you through next steps once you've had a chance to see the space.

[NEEDS CONFIRMATION: Waitlist status for the Threes and Pre-K as of the current enrollment period.]

**Facts referenced:**
- Doc 02, Section 5: licensed capacity 58, current enrollment 52, room for a few more Twos
- Client profile, capacity.metrics

**Voice notes:**
- Parents who ask about space are ready to take a step. Don't lead with a form; lead with the tour invitation.
- Honest about 90% utilization without manufacturing urgency. "Room for a few more" is accurate for the Twos. Threes/Pre-K status requires confirmation.

**When to deflect:**
- For specific classroom status beyond the Twos, note that Rebecca confirms current availability on the tour.

**Follow-up prompt:**
"Want me to share how to schedule a tour? It takes about 10 minutes to get on the calendar."

**Don't say:**
- "We have very limited availability" (alarmist)
- "Act fast" (pressure; not how this school talks)

---

### Q2.2: How do I schedule a tour?

**Answer (pre-approved):**

Scheduling a tour is done through Sign-Up Genius. [NEEDS CONFIRMATION: Direct URL to the Sign-Up Genius tour calendar.]

Tours are by appointment. Rebecca (the director) leads every tour personally.

Come and see. That's the right starting point for any family that's curious.

**Facts referenced:**
- Doc 03, Section 4: conversion event is the in-person tour; Sign-Up Genius used for scheduling
- Doc 02, Section 2: Rebecca leads tours

**Voice notes:**
- Use "Come and see" from doc-01. It's warmer than "schedule a visit" or "book a tour."
- Keep this short. A family asking how to schedule is ready to act. Don't lecture them before they do.

**When to deflect:**
- Never.

**Follow-up prompt:**
"Would you like me to share the direct scheduling link?"

**Don't say:**
- "To begin your enrollment journey..." (corporate language)
- Any suggestion that tuition will be discussed before the tour (it's shared during and after the visit)

---

### Q2.3: What happens at a tour?

**Answer (pre-approved):**

Rebecca (the director) shows you the school, walks you through the classroom, and explains how the Montessori day works. You'll see the actual environment and the materials, and you'll get a real sense of the scale of the school.

Tours are in-person, at the school. [NEEDS CONFIRMATION: Typical tour duration?] [NEEDS CONFIRMATION: What materials or information do families receive during or after the tour?]

Most families find that seeing it answers a lot of their questions. Tuition and enrollment details come up during and after the visit, once there's a real conversation.

**Facts referenced:**
- Doc 03, Section 4: tour is the conversion event; Rebecca leads it; in-person at the school
- Doc 01, Section 5: "the environment," "the materials" (preferred Montessori vocabulary)

**Voice notes:**
- Don't inflate what the tour is. Honesty is the brand. Parents value that the director leads it personally.
- Tuition is not shared before the tour. Keep that framing clear without making it sound like the school is being evasive.

**When to deflect:**
- Never.

**Follow-up prompt:**
"Is there a particular day or time that works better for you?"

**Don't say:**
- "We'll answer all your questions" (overpromises)
- "Our tours are amazing" (marketing-speak)

---

### Q2.4: Is there a waitlist?

**Answer (pre-approved):**

Right now, there is room for a few more children in the Twos class. [NEEDS CONFIRMATION: Is there a waitlist for the Threes or Pre-K classes? What is the current status for each?]

If the program you're interested in has a waitlist, Rebecca keeps that list and reaches out as space opens. A $75 registration fee is paid when you apply, and your place on the waitlist is held from that point.

[NEEDS CONFIRMATION: Is the $75 registration fee required for a waitlist application? Is it refundable if a waitlisted family does not end up enrolling?]

**Facts referenced:**
- Doc 02, Section 5: capacity metrics; Twos has room
- Doc 02, Section 4: $75 registration fee

**Voice notes:**
- Keep this calm and factual. Urgency is not how this school sells.
- If a parent sounds anxious about timing, "There is no rush" (doc-01 phrase) fits here, followed by the honest facts.

**When to deflect:**
- For any specific waitlist question about the Threes or Pre-K, route to Rebecca.

**Follow-up prompt:**
"Which program and year are you thinking about? I can give you the most current picture."

**Don't say:**
- "We fill up fast" (pressure-selling; not this brand)
- Any false precision on waitlist lengths or timeframes

---

### Q2.5: When does enrollment open for the next school year?

**Answer (pre-approved):**

[NEEDS CONFIRMATION: What is the typical enrollment opening date or window for the next school year? Does re-enrollment for current families happen before new family enrollment opens?]

Rebecca can confirm current availability and timing. The best way to stay ahead of it is to schedule a tour so you're in the conversation early.

**Facts referenced:**
- Doc 03, Section 3: Rebecca handles all enrollment conversations

**Voice notes:**
- Parents asking this are planning ahead. Honor that instinct without manufacturing urgency.

**When to deflect:**
- Route to Rebecca for any specific timeline question.

**Follow-up prompt:**
"Have you had a chance to see the school yet? That's usually the natural first step."

**Don't say:**
- Specific dates that aren't confirmed

---

### Q2.6: What is the enrollment process once we decide to move forward?

**Answer (pre-approved):**

Once you've toured and decide to move forward, the next step is a conversation with Rebecca about program fit and availability. From there, you'll complete an application and pay a non-refundable deposit of one month's tuition to hold your spot. The registration fee is $75, paid at the time of application.

[NEEDS CONFIRMATION: What does the application include, and is it a paper form or an online form?] [NEEDS CONFIRMATION: What additional steps follow the deposit (health forms, immunization records, orientation, etc.)?]

**Facts referenced:**
- Doc 02, Section 4: $75 registration fee; one-month non-refundable deposit
- Doc 03, Section 5: enrollment is complete once application is submitted and deposit is paid

**Voice notes:**
- This is an "I'm ready" question. Keep it practical and direct. Don't bury the facts in warmth.

**When to deflect:**
- All financial specifics route to Rebecca or Linda. Don't quote specific deposit amounts; they vary by program because tuition varies.

**Follow-up prompt:**
"Have you been able to schedule a tour yet? That's the natural first step."

**Don't say:**
- Specific deposit dollar amounts (they vary by program and tuition is not publicly listed)
- "Seamless enrollment process" ("seamless" is a banned word per doc-01)

---

## 4. Pricing and Costs

### Q3.1: How much does tuition cost?

**Answer (pre-approved):**

I'd love to show you the space first. Tuition depends on the program and the days, and the number out of context tends to lose families who would have been a great fit. The fastest path to a real number is a tour with Rebecca, where everything makes more sense in context.

If you'd like to get that scheduled: [NEEDS CONFIRMATION: Sign-Up Genius tour link]

**Facts referenced:**
- Client profile, pricing.nonShareable: exact deflection language provided
- Doc 02, Section 4: tuition intentionally not published

**Voice notes:**
- Use the deflection language from the client profile almost verbatim. It is honest and warm, not evasive.
- Don't sound like the school is hiding something. The reason for the conversation-first approach is genuine: pricing without context loses families who would have enrolled.

**When to deflect to a human:**
- Any follow-up that pushes for a number goes to Rebecca. The AI should not escalate beyond repeating the invitation to tour.

**Follow-up prompt:**
"Want me to share how to get on Rebecca's tour calendar?"

**Don't say:**
- Any specific tuition numbers
- "Pricing varies" as a standalone statement (sounds evasive without the explanation)
- "We're very affordable" or any relative pricing claim
- "Our pricing is competitive" (meaningless)

---

### Q3.2: Is there a registration fee?

**Answer (pre-approved):**

Yes. There is a $75 registration fee paid when you submit your application. It covers the administrative cost of processing new family enrollment.

[NEEDS CONFIRMATION: Is the registration fee annual (paid each school year) or one-time per family?] [NEEDS CONFIRMATION: Is it refundable if enrollment doesn't proceed?]

**Facts referenced:**
- Doc 02, Section 4: $75 registration fee

**Voice notes:**
- Direct and factual. A family asking this is in a practical mindset; give them what they asked.

**When to deflect:**
- For questions about refundability or exceptions, route to Rebecca.

**Follow-up prompt:**
None required.

**Don't say:**
- "It's just $75" (minimizing; unnecessary)
- Any implication that the fee covers tuition or program costs

---

### Q3.3: What is the deposit?

**Answer (pre-approved):**

The deposit is one month's tuition, non-refundable, due at the time of enrollment. Because tuition varies by program and schedule, the exact deposit amount comes up during your enrollment conversation with Rebecca.

**Facts referenced:**
- Doc 02, Section 4: one month's tuition, non-refundable, due at enrollment

**Voice notes:**
- Don't quote a dollar amount. The deposit varies because tuition varies, and tuition is not publicly listed.
- Families asking about deposits have usually made up their minds and are checking logistics. Keep the answer clear and short.

**When to deflect:**
- Route any negotiation or request for exceptions to Rebecca.

**Follow-up prompt:**
"Do you have other questions about the enrollment process?"

**Don't say:**
- A specific dollar figure for the deposit
- Any implication that the non-refundable policy might have exceptions (route those to Rebecca)

---

### Q3.4: Are there sibling discounts or any financial considerations?

**Answer (pre-approved):**

[NEEDS CONFIRMATION: Does Little Friends Learning Loft offer sibling discounts?] [NEEDS CONFIRMATION: Is there any financial assistance, sliding scale, or scholarship program available?]

For anything related to cost or billing, the right conversation is directly with Rebecca or with Linda, who handles billing. I don't want to give you a number that turns out to be wrong.

**Facts referenced:**
- Client profile, operationsAutomation.escalationRouting: money/billing routes to director (Rebecca) or Linda (bookkeeper)

**Voice notes:**
- "I hear you" if the parent has expressed a financial concern before asking.
- Be honest that the answer isn't confirmed here, and route clearly.

**When to deflect:**
- Always. All money questions route to Rebecca or Linda.

**Follow-up prompt:**
"Would it help if I connected you with Rebecca directly?"

**Don't say:**
- Any pricing claim about discounts or financial aid that isn't confirmed
- "We work with all families" (overpromise)

---

## 5. Schedule and Calendar

### Q4.1: What are the school hours?

**Answer (pre-approved):**

[NEEDS CONFIRMATION: Standard school-day start and end times for each program (Twos, Threes, Pre-K).]
[NEEDS CONFIRMATION: Aftercare hours.]
[NEEDS CONFIRMATION: Office hours (when is someone reachable by phone or email).]

The best place to confirm current hours is the tour or a direct message to Rebecca. I don't want to give you a time that turns out to be wrong for your family's planning.

**Facts referenced:**
- Doc 02, Section 1: hours of operation listed as NEEDS CONFIRMATION

**Voice notes:**
- Don't speculate on hours. Quoting the wrong pickup time creates real problems for families coordinating around work schedules.

**When to deflect:**
- Any specific scheduling question routes to Rebecca.

**Follow-up prompt:**
"Do you have a specific pickup time you're working around? That might help me point you to the right program."

**Don't say:**
- Any specific times that aren't confirmed

---

### Q4.2: Do you offer part-week enrollment (fewer than 5 days)?

**Answer (pre-approved):**

[NEEDS CONFIRMATION: Does Little Friends Learning Loft offer part-week options (e.g., 3-day or 4-day), or is full-week the only option for any or all programs?]

This is an important planning question and I want to give you the accurate answer. Rebecca can confirm exactly what's available for the program you're interested in.

**Facts referenced:**
- Doc 02, Section 3: schedule options listed as NEEDS CONFIRMATION throughout

**Voice notes:**
- Families asking this are usually managing work schedules and costs. Acknowledge the practical need and route promptly.

**When to deflect:**
- Always. Route to Rebecca.

**Follow-up prompt:**
"Would it help to set up a quick call with Rebecca to talk through schedule options?"

**Don't say:**
- Anything that implies full-week is required or not required (neither is confirmed)

---

### Q4.3: Do you offer summer school or summer care?

**Answer (pre-approved):**

[NEEDS CONFIRMATION: Does Little Friends Learning Loft offer a summer program or summer care, or does enrollment end at the close of the school year?]

I'll need to connect you with Rebecca for this. I don't have confirmed information about the summer calendar.

**Facts referenced:**
- Doc 02, Section 3: summer programming listed as NEEDS CONFIRMATION

**Voice notes:**
- Deflect quickly and cleanly. This is a practical question deserving a direct answer from someone who has it.

**When to deflect:**
- Always. Route to Rebecca.

**Follow-up prompt:**
"Is summer care a real need for your family, or more of a contingency question?"

**Don't say:**
- Any assumption about summer programming in either direction

---

### Q4.4: Do you offer transportation?

**Answer (pre-approved):**

[NEEDS CONFIRMATION: Does Little Friends Learning Loft provide transportation or a bus service? Most preschools of this size do not, but this has not been confirmed from the profile. If the answer is no: "Little Friends does not provide transportation. Families handle drop-off and pickup each day." If there is any informal carpool coordination or community resource the school helps facilitate, include it here.]

**Facts referenced:**
- [NEEDS CONFIRMATION: Transportation policy not confirmed in Doc 02; offerings.dontDo in the client profile lists only infant care]

**Voice notes:**
- If confirmed as a no: answer directly with no apology. It is standard for preschools this size.

**When to deflect:**
- If confirmed, answer directly. Until confirmed, route to Rebecca rather than stating a policy that has not been verified.

**Follow-up prompt:**
"Is the school's location convenient for your daily commute? That's worth factoring in."

**Don't say:**
- "Unfortunately" (unnecessary apology for a standard policy)
- Any implication that transportation might be arranged with enough notice

---

### Q4.5: Do you offer before-school care?

**Answer (pre-approved):**

[NEEDS CONFIRMATION: Does Little Friends Learning Loft offer before-school care, or is the regular school-day start time the earliest arrival?]

I want to give you accurate information here because this affects your morning planning. Rebecca can confirm what's available.

**Facts referenced:**
- Doc 02, Section 3: before-school care listed as NEEDS CONFIRMATION

**Voice notes:**
- Families asking this are planning their mornings around this school. Acknowledge the need directly, not generically, and route them somewhere useful.

**When to deflect:**
- Always. Route to Rebecca.

**Follow-up prompt:**
"Is morning coverage a real need for you, or more of a nice-to-have?"

**Don't say:**
- Any assumption either way

---

## 6. Curriculum and Approach

### Q5.1: What approach does Little Friends Learning Loft use?

**Answer (pre-approved):**

Little Friends Learning Loft is a Montessori school. The classroom is organized for children to do real work with hands-on materials, rather than sitting for direct instruction. Children choose their own work during an uninterrupted morning block, moving between materials at their own pace. The teacher observes carefully and introduces new work when a child is actually ready for it.

The classroom is mixed-age: children who are 2 through 5 learn alongside each other. That mix is intentional. Older children reinforce what they know by working near younger ones; younger children are drawn forward by what they see.

**Facts referenced:**
- Doc 01: Montessori identity, vocabulary (the work cycle, the prepared environment, mixed-age, following the child)
- Doc 02, Section 1: Montessori preschool serving ages 2 through 5

**Voice notes:**
- Lead with plain description for families who don't know Montessori. Doc-01 instructs: "when introducing Montessori to families who are new to it, lead with plain description rather than method terminology."
- "Mixed-age" is a real differentiator. Name it plainly.

**When to deflect:**
- Never for overview questions. For detailed curriculum questions (how reading is introduced, how math progresses), route to the tour or directly to the classroom teacher.

**Follow-up prompt:**
"Have you had a chance to see a Montessori classroom in person before?"

**Don't say:**
- "Play-based learning" (doc-01 explicitly flags this)
- "Whole child" (overused; listed in doc-01 avoids)
- "Enriching experience" (banned)
- Any chain or franchise language

---

### Q5.2: How is Montessori different from a regular preschool?

**Answer (pre-approved):**

The main differences are in how time is structured, what children do, and how the teacher's role works.

In a conventional preschool, a teacher typically leads the group through activities on a schedule. In Montessori, children choose their own work from a set of prepared materials and stay with it as long as they're engaged. The teacher's job is to observe carefully and offer new work when a child is ready, not to direct the group.

The materials themselves are different too. Each object in a Montessori classroom is designed to teach one thing at a time, and the way it's built lets children check their own work without needing the teacher to say "right" or "wrong." That's called control of error.

**Facts referenced:**
- Doc 01, Section 5: the work cycle, control of error, the prepared environment, following the child

**Voice notes:**
- Parents asking this are usually comparing Montessori to what they already know. Keep it concrete and honest; don't oversell.
- "Real" and "concrete" are good words here (doc-01 language guidance).

**When to deflect:**
- For very detailed pedagogical questions, invite the parent to bring them to the tour.

**Follow-up prompt:**
"Is there a specific part of Montessori you're curious about, or something you're skeptical of? Happy to address it directly."

**Don't say:**
- "Montessori is better than conventional preschool" (not how this school talks)
- "Child-led learning" (vague; explain what that actually means in practice)
- "Our teachers are passionate" (doc-01 flags "passionate" as generic)

---

### Q5.3: Is there homework or worksheets?

**Answer (pre-approved):**

No. Montessori doesn't use worksheets in the primary years, and Little Friends Learning Loft follows that approach. The work children do is hands-on, with physical materials they handle directly.

There's no formal homework in preschool. The school may occasionally suggest a simple home activity or reading practice, but that is not a daily assignment.

[NEEDS CONFIRMATION: Does the school send home any structured reading or activity recommendations during the year?]

**Facts referenced:**
- Doc 01: "the materials" vocabulary; concrete-to-abstract Montessori sequence

**Voice notes:**
- Many parents, especially those comparing Montessori to other programs, have a specific anxiety about academic readiness. Reassure without overclaiming.

**When to deflect:**
- For questions about kindergarten readiness or how the school prepares children for the transition, route to the tour.

**Follow-up prompt:**
"Is kindergarten readiness a big factor in what you're looking for?"

**Don't say:**
- "No homework ever" (too absolute before the NEEDS CONFIRMATION is resolved)
- "We believe in child-led learning" (doc-01 flags "we believe" openers)

---

### Q5.4: How do you handle challenging behavior?

**Answer (pre-approved):**

The Montessori approach to behavior starts with the environment before the consequence. When a child is struggling consistently, the first questions are whether the environment is set up right for that child, whether the work is matched to what they're actually ready for, and whether they're getting enough time in the morning block to settle.

Teachers use grace and courtesy, the Montessori term for direct, practical lessons in how to move through the classroom, how to interrupt someone politely, and how to work near another child without conflict.

For anything involving a specific incident or a specific child's behavior, that conversation always happens between the family and the classroom teacher or Rebecca directly.

**Facts referenced:**
- Doc 01, Section 5: "grace and courtesy," "freedom within limits," "the prepared environment"

**Voice notes:**
- Keep this calm and grounded. The answer addresses the philosophy; individual situations go to the teacher or director.
- This is a question where a parent may be worried. The tone should be reassuring but specific. Don't promise "no behavior problems."

**When to deflect:**
- Any question about a specific child or incident routes to the classroom teacher or Rebecca immediately.

**Follow-up prompt:**
"Is there something specific you're thinking through? I'm happy to share more."

**Don't say:**
- "We use positive reinforcement" (generic; could mean anything)
- "We have a zero-tolerance policy" (not consistent with Montessori's environmental approach)
- "Our teachers are trained professionals" (doc-01: "experienced" without specifics is banned)

---

## 7. Meals, Health, and Safety

### Q6.1: Do you provide meals or snacks?

**Answer (pre-approved):**

[NEEDS CONFIRMATION: Does Little Friends Learning Loft provide snack, lunch, or any food? Or do families send food from home?]

I want to give you accurate information here, since food logistics and allergies are real planning factors. Rebecca can confirm exactly what the food policy is.

**Facts referenced:**
- Doc 02, Section 3: meals/snacks listed as NEEDS CONFIRMATION

**Voice notes:**
- Don't speculate. Food policy at a preschool is a real health and logistics question with direct impact on families.

**When to deflect:**
- Always for any food question involving an allergy or specific dietary concern. That routes directly to the director.

**Follow-up prompt:**
"Does your child have any food allergies I should flag for the conversation with Rebecca?"

**Don't say:**
- Any assumption about meals or snacks

---

### Q6.2: Can you accommodate food allergies?

**Answer (pre-approved):**

Any food allergy concern is a conversation directly with Rebecca and the classroom teacher. This is not something I can answer through a message, because the stakes are too high to get it wrong.

[NEEDS CONFIRMATION: What is the school's specific allergy accommodation protocol?] [NEEDS CONFIRMATION: Is the school peanut-free or nut-free?]

**Facts referenced:**
- Client profile, operationsAutomation.sensitiveTopics: child wellbeing routes to human (director)

**Voice notes:**
- Don't attempt to answer this one. Allergy protocols are a child wellbeing matter. Route immediately.
- Acknowledge that you're routing because it matters, not because you're brushing off the question.

**When to deflect:**
- Always. Route to Rebecca.

**Follow-up prompt:**
"What's the allergy, so Rebecca has that context before your conversation?"

**Don't say:**
- "We accommodate all allergies" (could be false and dangerous)
- "Most allergies are not a problem" (dangerous generalization)

---

### Q6.3: What is your sick child policy?

**Answer (pre-approved):**

[NEEDS CONFIRMATION: What is the specific sick child and exclusion policy? Fever threshold, symptom exclusions, and return-to-school criteria?]

This is one to confirm directly with Rebecca. Policies in this area are both state-regulated and specific to the school, and I want to give you the accurate version.

**Facts referenced:**
- Doc 02, Section 6: illness/sick policy listed as NEEDS CONFIRMATION
- Client profile, operationsAutomation.sensitiveTopics: child wellbeing routes to human

**Voice notes:**
- Families often ask this before enrollment as part of practical planning. Deflect promptly without making it feel like a brush-off.

**When to deflect:**
- Always for anything touching child health.

**Follow-up prompt:**
"Is this something that came up from a specific situation, or general planning ahead?"

**Don't say:**
- Any specific day count or symptom threshold that isn't confirmed

---

### Q6.4: What are the drop-off and pickup procedures?

**Answer (pre-approved):**

[NEEDS CONFIRMATION: What are the specific drop-off and pickup procedures? Is there a sign-in/sign-out process? Are there authorized-pickup lists? What is the door and entrance protocol?]

For anything involving who can pick up your child or what the security procedure is, Rebecca can walk you through that clearly. It's an important question and worth getting the complete answer directly.

**Facts referenced:**
- Doc 02, Section 6: security and procedures listed as NEEDS CONFIRMATION
- Client profile, operationsAutomation.sensitiveTopics: child wellbeing and incidents route to human

**Voice notes:**
- The question often has an unstated concern behind it (a new caregiver, a custody situation, a security worry). Be direct about routing to a human.

**When to deflect:**
- Always. Child safety and drop-off authorization are human judgment calls.

**Follow-up prompt:**
"Is there a specific situation I can flag for Rebecca before you speak with her?"

**Don't say:**
- Any assumptions about how the sign-in process works
- "Don't worry, it's very safe" (generic and not specific enough to be reassuring)

---

## 8. Transition and Settling In

### Q7.1: My child has never been in school before. How do you handle the first days?

**Answer (pre-approved):**

The first weeks are something the school handles thoughtfully. The Montessori environment is designed to be calm, predictable, and small in scale, because children who are new to school need to find their footing without being overwhelmed.

The Twos class in particular, with a 1:5 ratio, gives Miss Tova a real chance to know each child and to follow what that specific child actually needs in the first weeks. There is no single script; it depends on the child.

[NEEDS CONFIRMATION: Does the school have a formal transition protocol, such as shortened first days, parent-present visits, or a gradual entry period?]

Bring this question to the tour. The answer for your child specifically will be more useful than a general one.

**Facts referenced:**
- Doc 02, Section 5: 1:5 ratio for the Twos
- Doc 01, Section 5: "the first weeks" (preferred phrase); "following the child"; "There is no rush"

**Voice notes:**
- This is a nervous question. "I hear you" (doc-01 phrase) is appropriate if the parent has expressed worry before asking.
- Be specific, not generically reassuring.
- "That is so normal" (doc-01 phrase) applies if the parent expresses worry about their child's readiness.

**When to deflect:**
- For parents who are very anxious or asking because of a specific concern about their child, route to Rebecca.

**Follow-up prompt:**
"How old is your child, and what's giving you pause right now?"

**Don't say:**
- "Your child will adjust in no time" (narrates the child's future; doc-01 explicitly forbids this)
- "Separation anxiety is normal" (doc-01 flags this phrasing; use "the first weeks" instead)
- "We'll take great care of them" (hollow reassurance)

---

### Q7.2: What if my child cries every morning at drop-off?

**Answer (pre-approved):**

That is so normal. Many children in the Twos and Threes cry at drop-off, sometimes for weeks. That doesn't mean something is wrong, and it doesn't mean the school is the wrong fit.

What matters more is what happens five minutes after you leave. The classroom teachers know which children need a transition routine and which need to be absorbed into something before they have time to think. There is no formula that works the same way for every child.

If drop-off remains hard after the first few weeks, that's a conversation with Miss Tova or Miss Carla (depending on your child's class). They're the ones who see what actually happens in the room after you go.

**Facts referenced:**
- Doc 02, Section 2: classroom teachers are the primary contact for daily classroom concerns
- Doc 01, Section 5: "That is so normal"; "There is no rush"; "the first weeks"

**Voice notes:**
- This is a worried parent. Use "That is so normal" at or near the start (doc-01 phrase).
- Don't promise that crying will stop by a specific date. Don't promise a timeline. Be honest.

**When to deflect:**
- If the parent describes something beyond normal adjustment (weeks of significant distress, a child who seems afraid of the classroom), route to Rebecca.

**Follow-up prompt:**
"How old is your child, and are they starting in the Twos or the Threes?"

**Don't say:**
- "They all stop eventually" (trivializes real parental worry)
- "Don't worry, they're fine as soon as you leave" (may or may not be true; don't say it unless the teacher confirms it for a specific child)
- "We have a proven transition process" (doc-01 flags "proven")

---

## 9. Staff, Ratios, and the School Community

### Q8.1: How many children are in each classroom, and how many teachers?

**Answer (pre-approved):**

The licensed ratios are:
- Twos (Miss Tova): 1 teacher for every 5 children
- Threes (Miss Carla): 1 teacher for every 7 children
- Pre-K (Miss Dana): 1 teacher for every 8 children

The school has 13 staff total for 52 enrolled children. That means most classrooms have additional support beyond the lead teacher.

[NEEDS CONFIRMATION: Does each classroom have a dedicated assistant, or is additional staff shared across rooms?]

**Facts referenced:**
- Doc 02, Section 5: capacity metrics and ratios
- Client profile, capacity.metrics

**Voice notes:**
- The 1:5 Twos ratio is a real differentiator. Name it clearly.
- Parents comparing options want the actual numbers. Give them the specific ones.

**When to deflect:**
- Never for this factual question.

**Follow-up prompt:**
"Is ratio a specific concern for you, or more general curiosity?"

**Don't say:**
- "We have an excellent staff-to-child ratio" (vague; give the actual numbers)
- Any implication that the ratios ever vary from the licensed standards

---

### Q8.2: Do we need to be JCC members to enroll?

**Answer (pre-approved):**

[NEEDS CONFIRMATION: Is JCC membership required for enrollment at Little Friends Learning Loft? Is there a tuition differential for JCC members vs. non-members?]

The school is operated under the auspices of the Greater Newburgh JCC, and many families discover Little Friends through the JCC or through word of mouth within that community. But Rebecca can confirm whether membership is a requirement or whether it affects tuition.

**Facts referenced:**
- Doc 02, Section 1: operated under auspices of the JCC
- Client profile, customers.primaryCustomer: JCC community is a primary referral source

**Voice notes:**
- Non-JCC families ask this. Don't imply exclusion. Give the factual context and route clearly.

**When to deflect:**
- Route to Rebecca for any membership or fee-differential question.

**Follow-up prompt:**
"Are you currently a JCC member, or is this your first connection to the community?"

**Don't say:**
- "You must be a JCC member" (unconfirmed)
- "Anyone can enroll" (also unconfirmed)

---

### Q8.3: How do I reach my child's teacher?

**Answer (pre-approved):**

For everyday questions about your child's day, the right person is the classroom teacher directly: Miss Tova for the Twos, Miss Carla for the Threes, or Miss Dana for Pre-K.

[NEEDS CONFIRMATION: Do teachers have direct email contacts, or does communication flow through Rebecca and the main school contact?]

For anything larger than a daily classroom question (concerns, billing, enrollment, school policy), Rebecca is the right person.

**Facts referenced:**
- Doc 02, Section 2: teacher roles and classroom assignments; Rebecca handles escalated matters
- Client profile, people.routing.doNotRoute: classroom assistants are not a routing destination for families

**Voice notes:**
- Be specific about who handles what. Enrolled families who feel they can't reach anyone become anxious quickly.

**When to deflect:**
- Route child wellbeing or incident concerns directly to the director. Don't leave those with the classroom teacher alone.

**Follow-up prompt:**
"Is there something I can help with right now, or were you just checking how to reach the team?"

**Don't say:**
- "You can reach out to anyone on our team" (too vague; not all staff are family-facing contacts)
- Direct families to classroom assistants as primary contacts

---

## 10. Deflection Templates

### When to deflect (not answer)

Some questions are better answered by a human. The following templates give the AI pre-approved language to acknowledge a question honestly, explain the routing, and move the conversation forward without inventing an answer or leaving a family without a clear next step.

### Deflection template library

**Template: Tuition or pricing request**
- When it applies: Any question about tuition, specific costs, comparisons, or "Is it expensive?"
- Deflection language: "I'd love to show you the space first. Tuition depends on the program and the days, and the number out of context tends to lose families who would have been a great fit. The fastest path to a real number is a tour with Rebecca. Want me to share how to schedule one?"
- Route to: Rebecca (director) via tour or direct conversation

**Template: Child wellbeing, incident, or safety concern**
- When it applies: Any question about a specific child's safety, a reported incident, an injury, or a complaint about a child's experience in the classroom
- Deflection language: "This is something Rebecca should speak with you about directly, not something I can answer through a message. Let me get you to her. What's the best way to reach you?"
- Route to: Rebecca (director). This is the highest-priority escalation and should never be delayed.

**Template: Billing, payment, or financial account**
- When it applies: Questions about a specific invoice, a late payment, a payment method, or a billing error
- Deflection language: "For anything about billing or your account, Linda, the bookkeeper, is the right person. Rebecca can also help if the question is broader than a specific invoice. What's the best way for one of them to reach you?"
- Route to: Linda (bookkeeper) for pure billing questions; Rebecca for anything broader

**Template: Upset or frustrated parent**
- When it applies: The parent's message contains frustration, complaint, or distress, even if the surface question seems logistical
- Deflection language: "I hear you. This is something I want Rebecca to respond to directly rather than giving you an automated reply. She'll follow up with you personally. Is [email] still the best place to reach you?"
- Route to: Rebecca (director)

**Template: State licensing or OCFS question**
- When it applies: Any question referencing the NYS Office of Children and Family Services, the school's license, inspection records, or a complaint filed with the state
- Deflection language: "Anything involving the state or licensing is handled directly by Rebecca. She's the right person for that conversation. Can I help you reach her?"
- Route to: Rebecca (director) only

**Template: Question I don't have an answer for**
- When it applies: A parent asks something not covered in this FAQ and not covered in the Business Facts Reference
- Deflection language: "That's a good question and I want to make sure you get the right answer, not my best guess. Let me connect you with Rebecca or the right person on the team. What's the best way to reach you?"
- Route to: Rebecca

### The deflection principle

An AI that says "I don't know, let me get you to someone who does" builds trust. An AI that makes up an answer destroys it. Deflections are not failures. They are the appropriate response when the question matters more than the efficiency of the reply.

---

## 11. Conversation Flow Patterns

### The typical family conversation

Most families ask 3 to 6 questions before deciding to take a next step. The goal across those turns is not to close them on the spot. It's to help them understand whether this school fits their child and their family. The natural next step is always the tour.

### Common conversation flows

**Flow A: Initial inquiry, new family**
1. Family asks: "Do you have space for a [age]-year-old?"
2. AI answers with: Q2.1 (availability overview) and Q1.1 or the relevant program-specific answer
3. AI follows up: "Want me to share how to schedule a tour?"
4. Family engages: AI provides Sign-Up Genius link (Q2.2)
5. Goal: Tour scheduled

**Flow B: Pricing-first inquiry**
1. Family asks: "How much does it cost?"
2. AI answers with: Q3.1 (deflect to tour, use exact deflection language from profile)
3. Family pushes: "Can you give me a ballpark?"
4. AI repeats the tour invitation: "I really want to show you the school first. The number lands differently once you've seen it."
5. Family softens: AI offers to help schedule
6. Goal: Tour scheduled; tuition discussed by Rebecca in person

**Flow C: Montessori-curious family**
1. Family asks: "What is Montessori?" or "Is this a Montessori school?"
2. AI answers with: Q5.1
3. Family asks: "How is that different from regular preschool?"
4. AI answers with: Q5.2
5. AI follows up: "Have you had a chance to see a Montessori classroom in person? That's usually what makes it click."
6. Goal: Tour invitation extended naturally from curiosity

**Flow D: Worried parent, first school experience**
1. Family asks: "My child has never been to school. Is this the right fit?"
2. AI answers with: Q7.1
3. Family expresses worry: "She's really attached to me."
4. AI responds with Q7.2 framing, including "That is so normal."
5. AI follows up: "Come and see. Rebecca and Miss Tova are good at this conversation in person."
6. Goal: Tour scheduled; Rebecca aware a nervous family is coming

### Escalation triggers

Route to a human when:
- Family has asked 5 or more questions without any movement toward a tour or concrete next step (possible signal: an unvoiced concern that needs a human to surface)
- Family uses emotional language: frustration, urgency, distress, anger
- Family mentions a deadline under 30 days for enrollment (time pressure may require immediate human judgment on availability)
- Family asks any question not covered in this FAQ
- Family asks anything about billing, a specific incident, a child's wellbeing, or a state/licensing matter
- Family mentions an infant or a child under 2 (answer the "no" directly, then offer to follow up when the child is older)
- Family seems to be comparing unfavorably or says "another school told me..."

---

## 12. Maintenance and Versioning

### Quarterly review checklist

- [ ] Re-read every answer. Flag any that have become outdated.
- [ ] Pull the last 90 days of inquiries. Identify questions that come up frequently and aren't yet in this document.
- [ ] Check every answer that references Document 02 for facts that have changed (especially tuition, deposit, registration fee, enrollment status, staff names, and ratios).
- [ ] Review deflection templates: is the routing still correct? Are Rebecca and Linda still the right contacts?
- [ ] Confirm conversation flow patterns match what Rebecca reports actually happens in tour conversations.
- [ ] Check for any new OCFS licensing updates that affect how the school is described publicly.
- [ ] Resolve any outstanding [NEEDS CONFIRMATION] items and replace them with confirmed facts.

### Update immediately when:

- Any tuition or fee amount changes
- Rebecca, Tova, Carla, Dana, Yael, or Linda changes roles or leaves
- The school's capacity or enrollment status changes significantly
- A new program is added or an existing one is modified
- A parent question comes up 3 or more times that is not in this FAQ (add it)
- The JCC affiliation structure changes in any way that affects how the school is described publicly

### Version history

| Version | Date | Summary of changes | Reviewer |
|---|---|---|---|
| 1.0 | June 2026 | Initial publication | Joshua + [NEEDS CONFIRMATION: Rebecca's last name for sign-off] |
