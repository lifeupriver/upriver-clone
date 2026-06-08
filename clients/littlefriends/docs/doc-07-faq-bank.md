# Little Friends Learning Loft FAQ and common questions bank

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

**Critical principle:** Every question here has a single authoritative answer. When the chatbot, the auto-responder, Rebecca, and the lead teachers all answer the same customer question differently, trust erodes. This document establishes the single answer for each common question, then all downstream systems reference it. Variations in phrasing are fine and encouraged; variations in substance are not.

---

## 1. Categorized question inventory

Total questions covered: 35

**Category A: Programs and age eligibility**
- Q1.1: What programs do you offer?
- Q1.2: What ages do you accept?
- Q1.3: Do you accept infants or children under two?
- Q1.4: What is the difference between the Twos, Threes, and Pre-K classes?
- Q1.5: What does "play-based" mean in practice?

**Category B: Tuition and fees**
- Q2.1: How much does tuition cost?
- Q2.2: Is there a registration fee?
- Q2.3: What is the deposit, and is it refundable?
- Q2.4: Do you offer discounts for JCC members or siblings?
- Q2.5: Do you accept child care subsidy programs or state vouchers?

**Category C: Availability and enrollment**
- Q3.1: Do you have openings for the upcoming school year?
- Q3.2: How do I enroll my child?
- Q3.3: Do I have to tour before enrolling?
- Q3.4: How far in advance should I apply?
- Q3.5: Do you have a waitlist?
- Q3.6: What paperwork or documents do I need to submit?

**Category D: Daily schedule and operations**
- Q4.1: What are your hours?
- Q4.2: What days of the week does school run?
- Q4.3: Do you follow the school-year calendar?
- Q4.4: What does a typical morning look like?
- Q4.5: What is your sick policy?
- Q4.6: Do you provide snacks, or do children bring food from home?

**Category E: Aftercare**
- Q5.1: What is aftercare, and who is eligible?
- Q5.2: What are aftercare hours?
- Q5.3: How much does aftercare cost?

**Category F: The JCC connection**
- Q6.1: Is this school only for Jewish families?
- Q6.2: What does being inside the JCC mean for the program?
- Q6.3: Does JCC membership affect enrollment or tuition?

**Category G: Staff and communication**
- Q7.1: Who is the director?
- Q7.2: Who are the classroom teachers?
- Q7.3: How do I contact the school with a question or concern?
- Q7.4: How do you communicate with families day to day?
- Q7.5: What is Brightwheel?

**Category H: Health and safety**
- Q8.1: What immunizations are required?
- Q8.2: What happens if my child gets sick at school?
- Q8.3: How do you handle children with allergies?
- Q8.4: Is the school licensed by the state?
- Q8.5: How do you handle separation anxiety and the first weeks of school?

### How to use this document

- **Chatbot:** Match the customer's question to the closest Q, return the A adapted slightly for context
- **Auto-responder:** The answer_template in each Q is the default; adapt tone to match the specific inquiry
- **Email templates:** Pull answers from here as pre-written blocks; customize greeting and close per template
- **Rebecca (and all staff):** Reference when a family asks something and you want to confirm the single correct answer

---

## 2. Programs and age eligibility

### Q1.1: What programs do you offer?

**Answer (pre-approved):**

Little Friends has four programs: the Twos class for two-year-olds, the Threes class for three-year-olds, Pre-K for four-year-olds, and aftercare for families who need extended hours beyond the school day. Each classroom has its own lead teacher and stays small enough that the teacher knows your child by name from the first week. [NEEDS CONFIRMATION: days and hours for each program]

**Facts referenced:**
- Doc 02, Section 3: core programs (Twos, Threes, Pre-K, aftercare)
- Doc 02, Section 2: lead teachers named per classroom

**Voice notes:**
- This is often a first-contact question; answer it clearly and invite the natural next step
- "Small enough that the teacher knows your child by name" is the actual proof point from doc-02's differentiators, not a generic warm phrase
- Don't describe the programs in abstract developmental terms; stick to what they are

**When to deflect to a human:**
- Never; this is a basic orientation question with no risk attached

**Follow-up prompt:**
"How old is your child, or will be this September?"

**Don't say:**
- "We offer a variety of programs tailored to your family's needs" (vague marketing language)
- "Childcare" (this is a preschool; see doc-01 banned vocabulary)
- "Curriculum" as a selling point without describing what it looks like in practice

---

### Q1.2: What ages do you accept?

**Answer (pre-approved):**

The school serves children from age two through four, the year before kindergarten. The Twos class is for two-year-olds, the Threes class for three-year-olds, and Pre-K for four-year-olds. Aftercare is available to enrolled families who need extended care beyond the school day. [NEEDS CONFIRMATION: exact minimum age cutoff, for example, must a child turn two by September 1st?]

**Facts referenced:**
- Doc 02, Section 3: program descriptions by age group
- Doc 02, Section 5: age range served (2 through 5), minimum age 2, OCFS license does not cover children under 2

**Voice notes:**
- Plain and specific; give the actual age range
- Parents asking this often have a child who just turned two or is approaching two; they want a direct answer, not a paragraph
- Don't bury the answer in program description language

**When to deflect to a human:**
- If a parent asks about a child under two, follow Q1.3

**Follow-up prompt:**
"How old is your child?"

**Don't say:**
- "We welcome children of all ages" (false; there is an age floor)
- "Toddlers and preschoolers" (vague; use the actual class names)
- Any implication that exceptions can be made on the minimum age

---

### Q1.3: Do you accept infants or children under two?

**Answer (pre-approved):**

No. Little Friends is licensed by New York State OCFS for children ages two and up. I can't enroll infants or children under two, and that's a licensing requirement, not a policy I can make exceptions to.

If you're looking for infant or toddler care in the area, I'm happy to point you toward options. [NEEDS CONFIRMATION: specific local infant-care programs Rebecca refers families to]

**Facts referenced:**
- Doc 02, Section 3: "infant care, licensed two-and-up only; high inbound demand but always declined"
- Doc 02, Section 5: minimum age two, OCFS license does not cover children under age two
- Doc 02, Section 1: licensed by OCFS for ages 2 and up, licensed capacity 58

**Voice notes:**
- Be direct and clear; don't soften the "no" into ambiguity or a future possibility
- Acknowledge the underlying need and offer a referral if available
- Don't make the parent feel bad for asking; this is one of the most common questions the school receives

**When to deflect to a human:**
- Never for the core answer; it is firm. If the parent is frustrated, route to Rebecca.

**Follow-up prompt:**
If the parent also has a two-year-old: "Do you have a child who's two or older? I'd be happy to help with that."

**Don't say:**
- "Unfortunately, we are unable to accommodate infants at this time" (implies this might change)
- "We may be expanding our programs in the future" (do not suggest infant care is coming)
- "That would depend on availability" (it doesn't; it is a license limit, not a capacity decision)
- "Let me check and get back to you" on this question

---

### Q1.4: What is the difference between the Twos, Threes, and Pre-K classes?

**Answer (pre-approved):**

The three classrooms are organized by age and staffed separately. The Twos room has Miss Tova and a 1:5 staff-to-child ratio, which is the highest level of adult attention in the building. The Threes room is with Miss Carla at a 1:7 ratio. Pre-K is with Miss Dana at a 1:8 ratio, in the final year before kindergarten.

The classes aren't just sorted by age; the pacing and expectations are different. The Twos room is usually the first group setting for those children, so separation is expected and the teachers handle it directly. The Threes room is where the social piece develops in earnest. Pre-K has more structured time, and the children are getting used to kindergarten routines.

[NEEDS CONFIRMATION: actual days, hours, and any curriculum framework for each program]

**Facts referenced:**
- Doc 02, Section 3: program descriptions, OCFS-required ratios (1:5 Twos, 1:7 Threes, 1:8 Pre-K)
- Doc 02, Section 2: Miss Tova (Twos), Miss Carla (Threes), Miss Dana (Pre-K)

**Voice notes:**
- Parents asking this often want to know which class their child belongs in, or whether the school is the right fit for where their child is developmentally
- Describing the practical difference in pacing across the three rooms is more useful than quoting ratios alone
- Don't frame Pre-K as "rigorous" or "academic"; say what actually happens

**When to deflect to a human:**
- If a parent wants curriculum specifics or has a question about whether their child will be developmentally ready to move up, route to Rebecca

**Follow-up prompt:**
"How old is your child? That will tell us which room is the right fit."

**Don't say:**
- "Age-appropriate activities" (banned phrase in doc-01; describe what actually happens instead)
- "Developmentally appropriate" without explaining what it means in this specific room
- "Rigorous Pre-K curriculum" (doc-01 explicitly cautions against "curriculum" as a selling point without concrete specifics)

---

### Q1.5: What does "play-based" mean in practice?

**Answer (pre-approved):**

It means the morning is structured around what children do when left to explore with good materials and an adult close by. The classrooms have a block corner, an art table, a dramatic play area. [NEEDS CONFIRMATION: confirm actual space names and whether there is dedicated outdoor time and space] The teachers watch and step in, but they're not running a worksheet-style class.

Play-based doesn't mean unstructured. There's a morning routine, circle time, snack. But the learning that matters at this age, the social skills, language, problem-solving, happens when children are playing next to and with each other. The teachers are trained to see and support that, not direct it.

[NEEDS CONFIRMATION: specific curriculum framework, if any, for example High/Scope or Reggio-influenced, or no named framework]

**Facts referenced:**
- Doc 02, Section 7: play-based as a key differentiator
- Doc 01, Section 5: "play, explore, exploring" as vocabulary; block corner and art table as space names

**Voice notes:**
- Parents asking this are often comparing play-based to academic preschools; the real underlying question is "will my child be ready for kindergarten?" Address it
- Don't claim the method is innovative or novel; just describe what actually happens
- Use specific space names once confirmed; that specificity is part of the brand voice

**When to deflect to a human:**
- If a parent asks detailed questions about kindergarten readiness benchmarks or specific learning standards, route to Rebecca

**Follow-up prompt:**
"Do you have questions about what the morning actually looks like?"

**Don't say:**
- "Child-centered learning" (explicitly banned in doc-01)
- "Our innovative play-based curriculum" ("innovative" overclaims novelty; doc-01 says say what it is specifically, don't claim it's novel)
- "Holistic development" (banned)
- "A love of learning" (banned)

---

## 3. Tuition and fees

### Q2.1: How much does tuition cost?

**Answer (pre-approved):**

I'd love to show you the space first before getting into tuition. The number depends on the program and the number of days, and out of context it tends to lose families who would have loved us once they saw what they were actually getting.

The best next step is a tour with me. I walk you through the classrooms, introduce whoever is around that day, and go over all the details including pricing before you leave. No pitch, no pressure. Can I help you set that up?

**Facts referenced:**
- Doc 02, Section 4: tuition is intentionally withheld from public-facing materials; shared only after tour
- Client profile, pricing.nonShareable: deflection language provided directly by client

**Voice notes:**
- This is the most common question in any first inquiry; use language close to the client's own deflection: "the number out of context tends to lose families who would have loved us"
- Don't apologize for the policy; frame it as a benefit to the family, not as a rule they have to comply with
- Warm but not evasive; acknowledge the question directly, name the reason briefly, make the next step concrete

**When to deflect to a human:**
- If the parent pushes back and refuses to consider a tour before getting a number, route to Rebecca for a judgment call; don't override the no-tuition policy

**Follow-up prompt:**
The answer itself contains the prompt: "Can I help you set up a tour?"

**Don't say:**
- Any dollar amount for tuition (this is a standing policy; see doc-02 Section 4)
- "Our tuition is competitive with other programs in the area" (vague)
- "Pricing varies" without immediately pairing it with the tour offer
- "For pricing information, please contact our office" (sounds like a brush-off; always frame it as a tour, not an office call)

---

### Q2.2: Is there a registration fee?

**Answer (pre-approved):**

Yes, there is a $75 registration fee per child. This covers the administrative processing of the enrollment application. [NEEDS CONFIRMATION: is the fee due at the time of submitting the application, or at the point of enrollment commitment? Is it refundable if the family decides not to enroll after paying it?]

**Facts referenced:**
- Doc 02, Section 4: registration fee $75 confirmed

**Voice notes:**
- Answer directly; this is a concrete factual question and hedging sounds evasive
- The deposit question usually follows immediately; see Q2.3

**When to deflect to a human:**
- If a family disputes the fee or asks for it to be waived, route to Rebecca or Linda (bookkeeper)

**Follow-up prompt:**
"Do you have questions about the rest of the enrollment process?"

**Don't say:**
- "A small administrative fee" (the real number is $75; use it)
- Any implication that the fee is negotiable

---

### Q2.3: What is the deposit, and is it refundable?

**Answer (pre-approved):**

To hold your child's spot in a classroom, there is a deposit equal to one month's tuition. The deposit is non-refundable.

[NEEDS CONFIRMATION: when is the deposit due, at signing the enrollment agreement or at a different point? What payment method is accepted?]

**Facts referenced:**
- Doc 02, Section 4: deposit equals one month's tuition, non-refundable, confirmed

**Voice notes:**
- Be direct about non-refundable; softening it in a way that creates false expectations causes more friction downstream
- Families ask this because they want to know their financial risk before committing; the honest answer respects that

**When to deflect to a human:**
- Any request for an exception to the non-refundable policy (family emergency, sudden move) routes to Rebecca; billing and money matters belong with a human

**Follow-up prompt:**
"Do you have questions about what comes next after the deposit is paid?"

**Don't say:**
- "Typically non-refundable" (it is non-refundable; don't introduce ambiguity)
- Any implication that the deposit can be returned under special circumstances without routing to Rebecca first

---

### Q2.4: Do you offer discounts for JCC members or siblings?

**Answer (pre-approved):**

[NEEDS CONFIRMATION: sibling discounts, JCC member discounts, early enrollment discounts, and financial aid options have not been confirmed for public sharing as of June 2026. Once confirmed, this answer will include the specific discount types, amounts, and who qualifies for each.]

Until confirmed, this question routes to Rebecca for a direct answer.

**Facts referenced:**
- Doc 02, Section 4: discounts and exceptions listed as pending confirmation as of June 2026

**Voice notes:**
- Do not state a JCC discount percentage; this has not been approved for public-facing use
- Route warmly, not dismissively

**When to deflect to a human:**
- Always, until this section of the Business Facts Reference is confirmed

**Follow-up prompt:**
"Can I have Rebecca reach out to you directly with the details on pricing and any discounts that apply to your situation?"

**Don't say:**
- Any specific discount percentage
- "We have great discounts available for JCC families" (overclaims something unconfirmed)
- "We do not offer discounts" (also unconfirmed)

---

### Q2.5: Do you accept child care subsidy programs or state vouchers?

**Answer (pre-approved):**

[NEEDS CONFIRMATION: does the school accept ACS vouchers, the Child Care Assistance Program, or any other state or county subsidy programs? This has not been confirmed in the Business Facts Reference as of June 2026.]

Until confirmed, this question routes to Rebecca. Families asking this are often working with a tight budget and need a real answer, not a placeholder.

**Facts referenced:**
- Doc 02, Section 4: subsidy program participation listed as pending confirmation

**Voice notes:**
- This is a practically necessary question for some families; don't leave them with "I don't know" as the final answer
- Route with warmth and a concrete next step

**When to deflect to a human:**
- Always, until confirmed

**Follow-up prompt:**
"I want to make sure you get the right answer on this. Can I have Rebecca follow up with you directly?"

**Don't say:**
- "Unfortunately, we do not accept subsidies" (not confirmed)
- "Yes, we work with many subsidy programs" (not confirmed)

---

## 4. Availability and enrollment

### Q3.1: Do you have openings for the upcoming school year?

**Answer (pre-approved):**

As of June 2026, 52 of the 58 licensed spots are filled. Whether a spot is open in the specific classroom your child needs depends on their age, and that figure changes through the enrollment cycle. The best way to get a current answer is to reach out to Rebecca.

[NEEDS CONFIRMATION: current waitlist status by classroom; which classrooms, if any, are at or near capacity as of the writing date]

**Facts referenced:**
- Doc 02, Section 5: licensed capacity 58, current enrollment 52 as of June 2026; flagged as time-sensitive
- Doc 02, Section 5: waitlist status by classroom listed as pending confirmation

**Voice notes:**
- The 52 of 58 figure is dated June 2026; flag it as time-sensitive and direct to Rebecca for a current number
- Don't imply there's definitely a spot, and don't imply there definitely isn't one
- Honest urgency is fine; pressure language is not

**When to deflect to a human:**
- When the parent wants a specific answer about a specific classroom, route to Rebecca for the current headcount

**Follow-up prompt:**
"How old is your child, and are you thinking about September or a different start date?"

**Don't say:**
- "We have plenty of availability" (potentially false)
- "We are completely full" (also potentially false)
- "Spots go fast, so act now!" (pressure language)

---

### Q3.2: How do I enroll my child?

**Answer (pre-approved):**

The first step is a tour. Rebecca leads all the tours in person, walks you through the classrooms, introduces whoever is around that day, and goes over everything including tuition before you leave.

Once you've toured and decided it's the right fit, you fill out an enrollment application, pay a $75 registration fee and a one-month deposit to hold the spot, and submit your child's current immunization records.

[NEEDS CONFIRMATION: is the enrollment application in Brightwheel, on paper, or a separate online form?]

**Facts referenced:**
- Doc 02, Section 6: enrollment process steps
- Doc 02, Section 4: $75 registration fee, one-month deposit (non-refundable)
- Doc 02, Section 6: immunization records required

**Voice notes:**
- Give the actual sequence; families want to know exactly what they're committing to
- The tour-first model is both policy and a differentiator; describe it as a benefit, not a barrier
- Don't make it sound like a complicated multi-step process; it's a tour, then paperwork and payment

**When to deflect to a human:**
- Never for this overview; for specific paperwork questions, direct to Rebecca

**Follow-up prompt:**
"Want to set up a tour? What times generally work for you?"

**Don't say:**
- "Simply fill out our enrollment form" (skips the tour requirement and sounds transactional)
- "The enrollment process is seamless" ("seamless" is a banned word in doc-01)
- Any version that implies tuition details are shared before the tour

---

### Q3.3: Do I have to tour before enrolling?

**Answer (pre-approved):**

Yes. Rebecca leads every tour personally, and the tour is how tuition details get shared. But it's also just how this school works. Families meet me and the teachers before anyone signs anything.

Think of it as a first meeting rather than a sales visit. Nobody is pushing you to enroll at the end.

**Facts referenced:**
- Doc 02, Section 6: tour precedes enrollment as a stated process step
- Doc 02, Section 4: tuition shared after the tour
- Doc 01, Section 4: "They meet me and the teachers" as director language

**Voice notes:**
- Use Rebecca's actual language: "families meet me and the teachers"
- The tour is a differentiator, not a hurdle; frame it that way
- Don't apologize for requiring it

**When to deflect to a human:**
- If a family is genuinely unable to visit in person (out-of-state relocation, military family), route to Rebecca for a judgment call on how to handle

**Follow-up prompt:**
"Would you like to schedule a time to come see the school?"

**Don't say:**
- "Unfortunately, we do require a tour before enrollment" (no apology; it's a feature)
- "We need to do a tour first before we can discuss pricing" (technically accurate but sounds like gatekeeping; lead with the warmth of the meeting, not the requirement)

---

### Q3.4: How far in advance should I apply?

**Answer (pre-approved):**

Most families who enroll in September start inquiring and touring between January and April. That's when available spots move. By late spring, the fall cohort is usually mostly set.

If your child needs to start mid-year because of a move or a schedule change, that's possible when there's classroom availability, though it's less common.

[NEEDS CONFIRMATION: is there a priority enrollment window for siblings or returning families? What is the application deadline for a September start?]

**Facts referenced:**
- Doc 03, Section 8: peak inquiry January through April, most enrollments finalized by spring

**Voice notes:**
- Give real guidance rather than "apply early"; parents want to know when their actual window is
- Don't create false urgency

**When to deflect to a human:**
- Never for this informational answer

**Follow-up prompt:**
"What September were you thinking, and how old will your child be?"

**Don't say:**
- "Apply as soon as possible to secure your spot" (generic; also pressure language)
- "Spots go fast, don't wait!" (pressure-sales tone)

---

### Q3.5: Do you have a waitlist?

**Answer (pre-approved):**

[NEEDS CONFIRMATION: does the school currently maintain a waitlist? How does it operate? Can families request a specific classroom, and do returning families or siblings receive enrollment priority?]

Until confirmed, this question routes to Rebecca.

**Facts referenced:**
- Doc 02, Section 5: waitlist status by classroom listed as pending confirmation

**Voice notes:**
- Don't promise a waitlist exists if it hasn't been confirmed
- Don't tell a family there's no waitlist option if that hasn't been ruled out either

**When to deflect to a human:**
- Always, until confirmed

**Follow-up prompt:**
"Let me have Rebecca follow up with you on current availability and whether a waitlist spot makes sense for your timeline."

**Don't say:**
- "We don't have a waitlist right now" (not confirmed)
- "Yes, I'd love to add you to the waitlist" (not confirmed)

---

### Q3.6: What paperwork or documents do I need to submit?

**Answer (pre-approved):**

Once you've toured and decided to enroll, you'll need to complete an enrollment application, pay the $75 registration fee and a one-month tuition deposit, and submit your child's current immunization records. Immunizations need to be up to date; New York State requires this, and a copy goes into your child's file.

[NEEDS CONFIRMATION: what other required documents are collected at enrollment, for example: emergency contact form, medical treatment authorization, photo and media release, field trip permission, allergy action plan?]

**Facts referenced:**
- Doc 02, Section 6: enrollment application, registration fee, deposit, immunization records required
- Doc 02, Section 5: immunization requirements noted

**Voice notes:**
- Parents asking this are close to enrolling; give them what they need to move forward
- Don't make the list sound onerous; it's standard for any licensed preschool

**When to deflect to a human:**
- If a family has a specific question about an immunization exemption (religious or medical), route to Rebecca

**Follow-up prompt:**
"Do you have questions about the immunization requirements or the enrollment application itself?"

**Don't say:**
- "A significant amount of required documentation" (sounds like a barrier)
- Any implication that immunization requirements are optional or flexible without a documented exemption

---

## 5. Daily schedule and operations

### Q4.1: What are your hours?

**Answer (pre-approved):**

[NEEDS CONFIRMATION: drop-off window open and close times; pickup window open and close times; aftercare end time. The school runs on a school-year calendar, so hours follow the school-year schedule, but specific times have not been confirmed in the Business Facts Reference as of June 2026.]

Until confirmed, this question routes to Rebecca or to the school directly. Hours are a basic planning question for families and should be one of the first facts confirmed and updated in this document.

**Facts referenced:**
- Doc 02, Section 1: hours of operation listed as pending confirmation
- Doc 02, Section 6: drop-off and pickup windows listed as pending confirmation

**Voice notes:**
- Don't guess at hours; a wrong answer here creates real operational problems for families
- Update this answer as a first priority when the Business Facts Reference is completed

**When to deflect to a human:**
- Always, until confirmed

**Follow-up prompt:**
"Would it help to have Rebecca send you the full schedule for the program your child would be in?"

**Don't say:**
- Any specific time not confirmed in the Business Facts Reference

---

### Q4.2: What days of the week does school run?

**Answer (pre-approved):**

[NEEDS CONFIRMATION: whether programs are offered three days per week, five days per week, or both, and which specific days each age group meets. The answer may differ by program.]

Until confirmed, this question routes to Rebecca. Once confirmed, this answer should include specific days by classroom.

**Facts referenced:**
- Doc 02, Section 3: schedule for each program listed as pending confirmation
- Doc 02, Section 5: schedule options unconfirmed

**Voice notes:**
- A common follow-up to "what ages do you accept"; families need this for work-schedule planning
- Being vague here is frustrating; confirm and update as soon as possible

**When to deflect to a human:**
- Always, until confirmed

**Follow-up prompt:**
"Let me have Rebecca confirm the current schedule for the program that fits your child's age."

**Don't say:**
- Any specific schedule that hasn't been confirmed in the Business Facts Reference

---

### Q4.3: Do you follow the school-year calendar?

**Answer (pre-approved):**

Yes, the program runs on a school-year calendar. [NEEDS CONFIRMATION: September through June? Specific vacation weeks, observed holidays, early dismissal days, and whether there is any summer programming]

**Facts referenced:**
- Doc 02, Section 1: school-year calendar noted; specifics pending confirmation
- Doc 02, Section 5: calendar pending confirmation

**Voice notes:**
- Brief factual answer; expand once the calendar is confirmed and loaded into this document
- Families asking this are often comparing against year-round care options

**When to deflect to a human:**
- If a family needs specific dates for planning, route to Rebecca for the confirmed calendar

**Follow-up prompt:**
"Are you thinking about a September start, or is there a different timeline you're working around?"

**Don't say:**
- "We follow the local school district calendar exactly" (not confirmed)
- Any specific dates not yet in the Business Facts Reference

---

### Q4.4: What does a typical morning look like?

**Answer (pre-approved):**

Children arrive at drop-off and get settled. Most of the morning is free play time in the block corner, the art table, or the dramatic play area, with a morning routine that includes circle time and snack. [NEEDS CONFIRMATION: confirm actual space names; whether there is a dedicated outdoor area and when outdoor time happens; full daily schedule structure]

The rooms are small enough that the teachers know exactly where each child is at any point and what they're working on. When a morning is hard for a child, the teacher notices and handles it directly.

**Facts referenced:**
- Doc 02, Section 6: daily operations; most operational detail pending confirmation
- Doc 01, Section 5: block corner, art table, snack as vocabulary; morning routine as a preferred phrase
- Doc 02, Section 7: small enrollment and personal teacher relationships

**Voice notes:**
- Concrete over abstract; describe what actually happens, not the philosophy behind it
- "When a morning is hard for a child, the teacher notices" is more useful and honest than any generic warmth claim
- Use space names once confirmed; specificity is part of the brand

**When to deflect to a human:**
- Never; standard informational answer

**Follow-up prompt:**
"Do you have questions about what drop-off looks like in the first few weeks?"

**Don't say:**
- "Our teachers facilitate rich, structured play experiences" (exactly the kind of language doc-01 prohibits)
- "Children thrive in our stimulating environment" (banned phrases)

---

### Q4.5: What is your sick policy?

**Answer (pre-approved):**

[NEEDS CONFIRMATION: what specific symptoms require a child to stay home; what the return-to-school criteria are, for example 24 hours fever-free; OCFS-required illness exclusion rules]

Until confirmed, the general principle is: children who are sick stay home. For the specific thresholds and return criteria, Rebecca is the right contact.

**Facts referenced:**
- Doc 02, Section 6: sick policy listed as pending confirmation

**Voice notes:**
- Families need the real policy, not generic reassurance
- Once confirmed, this answer should be specific: temperature threshold, symptom list, return criteria
- Any situation involving a currently sick child routes to Rebecca immediately

**When to deflect to a human:**
- Any actual situation involving a specific sick child right now routes to Rebecca; child wellbeing is explicitly listed as a sensitive escalation topic in the operational profile

**Follow-up prompt:**
"Would you like Rebecca to send you the full sick policy document before your child starts?"

**Don't say:**
- "We take the health of our children very seriously" (empty reassurance without the substance of the actual policy)
- Any specific symptom threshold not yet confirmed

---

### Q4.6: Do you provide snacks, or do children bring food from home?

**Answer (pre-approved):**

[NEEDS CONFIRMATION: whether the school provides snacks or families bring them; whether the building has a nut-free or allergen-aware policy; any other food restrictions families should know about]

Until confirmed, this question routes to Rebecca.

**Facts referenced:**
- Doc 02, Section 6: snack and food policy listed as pending confirmation

**Voice notes:**
- Families with allergies are especially attentive to this question; route carefully
- Once confirmed, the answer should name both the snack source and the allergen policy in the same response

**When to deflect to a human:**
- If a parent raises a severe allergy concern at the same time, route to Rebecca immediately; don't let the chatbot handle life-threatening allergy questions

**Follow-up prompt:**
"Would it help to have Rebecca confirm the snack policy and allergen guidelines before your child starts?"

**Don't say:**
- "We provide a variety of healthy snack options" (not confirmed)
- "Families should bring nut-free snacks" (not confirmed)

---

## 6. Aftercare

### Q5.1: What is aftercare, and who is eligible?

**Answer (pre-approved):**

Aftercare is extended care available after the regular school day ends. It is available for enrolled children in the program. [NEEDS CONFIRMATION: whether all three age groups (Twos, Threes, Pre-K) are eligible or only certain ones; whether aftercare takes place in the child's classroom or a separate space]

**Facts referenced:**
- Doc 02, Section 3: aftercare described as available; exact eligibility and logistics pending confirmation

**Voice notes:**
- Parents who work full or part-time days ask this right after learning the school hours
- Answer clearly; the most useful information is eligibility by age group and what the space looks like

**When to deflect to a human:**
- Never for this overview; for specific eligibility questions, route to Rebecca

**Follow-up prompt:**
"Do you know approximately what hours you'd need aftercare to cover?"

**Don't say:**
- "We have a wonderful aftercare program" (describe what it is, not how wonderful it is)

---

### Q5.2: What are aftercare hours?

**Answer (pre-approved):**

[NEEDS CONFIRMATION: exact aftercare start and end times; whether it runs every weekday; any exceptions tied to the school calendar]

Until confirmed, route to Rebecca for specific aftercare hours.

**Facts referenced:**
- Doc 02, Section 3: aftercare hours listed as pending confirmation

**Voice notes:**
- Hours are the most practical information a parent needs here; confirm as soon as possible and update this answer

**When to deflect to a human:**
- Always, until confirmed

**Follow-up prompt:**
"What time do you need pickup by? I can find out whether aftercare covers it."

**Don't say:**
- Any specific time not confirmed in the Business Facts Reference

---

### Q5.3: How much does aftercare cost?

**Answer (pre-approved):**

Aftercare pricing is part of the tuition conversation, which I go over with families during the tour. [NEEDS CONFIRMATION: is aftercare included in base tuition, or is it a separate add-on? If separate, what is the monthly or per-day rate?]

**Facts referenced:**
- Doc 02, Section 3: aftercare cost structure listed as pending confirmation
- Doc 02, Section 4: tuition details shared after tour; the same logic applies to aftercare pricing

**Voice notes:**
- Follow the same deflection pattern as the main tuition question; aftercare cost is part of the pricing conversation Rebecca has in person
- Don't separate aftercare cost from the overall program cost conversation

**When to deflect to a human:**
- Route to the tour for cost specifics, same as tuition

**Follow-up prompt:**
"Want to set up a tour where we can walk through the full program and pricing together?"

**Don't say:**
- Any specific aftercare rate
- "Aftercare is included in tuition" or "Aftercare is extra" (neither is confirmed)

---

## 7. The JCC connection

### Q6.1: Is this school only for Jewish families?

**Answer (pre-approved):**

No. Little Friends is open to all families. The school is a program of the Newburgh JCC, and for some families that connection matters a lot, especially if you're part of the Jewish community here. But the school stands on its own for families with no connection to the J.

If you're looking for a small, play-based preschool and the JCC setting appeals to you as a community anchor, great. If it's not a factor for you, that's fine too. The program is what it is either way.

**Facts referenced:**
- Doc 02, Section 7: JCC affiliation described; "open to all families" explicitly stated
- Doc 01, Section 1: "for families who aren't part of the J, the school stands on its own"

**Voice notes:**
- Answer directly and without over-explaining; the question deserves a plain answer
- Use the director's own language from doc-01: "for some families that connection matters a lot; for others, the school stands on its own"
- Don't make the JCC connection sound unavoidable or central if the family hasn't signaled it matters to them

**When to deflect to a human:**
- Never; this deserves a direct, confident answer

**Follow-up prompt:**
None required; the question is fully answered

**Don't say:**
- "We welcome families of all backgrounds and beliefs" (sounds corporate; just say it's open to all)
- "While we are a JCC program, we do not discriminate..." (legalistic framing that implies the question is edgier than it is)
- Anything that implies Jewish holiday observance is required or unavoidable for all families

---

### Q6.2: What does being inside the JCC mean for the program?

**Answer (pre-approved):**

The school operates inside the Newburgh JCC building. Rebecca and the teachers are there; the classrooms are there. Families who already know the building often feel comfortable from the first time they walk in.

For families new to the JCC, the setting mostly means: the building is a community building with other programming nearby. The school itself is its own world within it.

[NEEDS CONFIRMATION: is there any integration of Jewish holiday observance or JCC programming into the school calendar or classroom? If so, what specifically?]

**Facts referenced:**
- Doc 02, Section 1: school "operates inside the Newburgh JCC" confirmed
- Doc 02, Section 7: JCC affiliation as differentiator

**Voice notes:**
- Answer the practical question (what does "inside the JCC" actually mean day to day) without overstating the institutional tie
- Save Jewish community language for families who signal it matters to them

**When to deflect to a human:**
- Never; informational answer

**Follow-up prompt:**
"Would you like to come see the space?"

**Don't say:**
- "The JCC is a world-class facility" (banned language)
- "Being part of the JCC community enriches your child's experience" (vague marketing speak)

---

### Q6.3: Does JCC membership affect enrollment or tuition?

**Answer (pre-approved):**

[NEEDS CONFIRMATION: does JCC membership affect tuition rates, enrollment priority, or access to the program? Who qualifies for any member pricing, and what does it look like?]

Until confirmed, this question routes to Rebecca.

**Facts referenced:**
- Doc 02, Section 4: JCC member pricing tier listed as pending confirmation

**Voice notes:**
- Don't state a discount percentage; that figure has not been approved for public-facing use
- Families who are JCC members may be asking because they want to know their membership carries value here; be responsive to that

**When to deflect to a human:**
- Always, until confirmed

**Follow-up prompt:**
"Let me have Rebecca confirm the details on that before I give you a number."

**Don't say:**
- Any specific percentage or dollar discount (not approved for public sharing)
- "Membership has no effect on enrollment" (not confirmed)

---

## 8. Staff and communication

### Q7.1: Who is the director?

**Answer (pre-approved):**

Rebecca [NEEDS CONFIRMATION: last name] is the director. She runs the school day to day: enrollment, family communication, staffing, and anything that rises above the classroom. If you're a new family reaching out, she's who you'll hear from. Every tour is led by her in person.

**Facts referenced:**
- Doc 02, Section 2: Rebecca as director; her responsibilities and role in enrollment

**Voice notes:**
- Use Rebecca's first name; that's how the school operates, and it's part of the small-school identity
- Describe what she does rather than describing her with adjectives

**When to deflect to a human:**
- If a family has a concern they want to direct to the director rather than the chatbot, confirm that Rebecca is the right person and offer to pass along the request

**Follow-up prompt:**
"Would you like me to have Rebecca reach out to you?"

**Don't say:**
- "Our passionate and dedicated director" (banned language)
- "Rebecca leads our school with warmth and vision" (marketing speak)

---

### Q7.2: Who are the classroom teachers?

**Answer (pre-approved):**

Each classroom has its own lead teacher. The Twos class is with Miss Tova, the Threes class with Miss Carla, and Pre-K with Miss Dana. Once a child is enrolled, the lead teacher for that room is the family's primary contact for day-to-day questions.

The school has 13 staff total, including classroom assistants and aftercare staff. [NEEDS CONFIRMATION: names and roles of any remaining staff who interact with families directly]

**Facts referenced:**
- Doc 02, Section 2: Miss Tova (Twos), Miss Carla (Threes), Miss Dana (Pre-K); total staff 13

**Voice notes:**
- Named teachers are a genuine trust signal; use the names, not "our experienced teaching team"
- Miss Dana appears by name in reviews; that personal identity matters to the brand

**When to deflect to a human:**
- Classroom questions about a specific enrolled child route to the lead teacher for that classroom, not to classroom assistants, and not to Rebecca unless the issue is director-level

**Follow-up prompt:**
"If your child is already enrolled, which classroom are they in? I can point you to the right teacher."

**Don't say:**
- "Our highly qualified and dedicated teaching staff" (banned language)
- Route new enrollment inquiries to classroom teachers (the routing rules in the operational profile explicitly prohibit this)

---

### Q7.3: How do I contact the school with a question or concern?

**Answer (pre-approved):**

For new family inquiries and enrollment questions, reach out to Rebecca directly. [NEEDS CONFIRMATION: Rebecca's direct email or phone; main school email or phone for general inquiries]

For enrolled families with questions about your child's day, classroom, or schedule, the lead teacher for your child's room is the first contact. Rebecca handles anything that rises above the classroom level.

**Facts referenced:**
- Doc 02, Section 1: main phone and email listed as pending confirmation
- Doc 02, Section 2: routing structure (new inquiries to Rebecca; classroom questions to lead teacher; do not route to classroom assistants)

**Voice notes:**
- Be specific about who handles what; vague "contact us" language frustrates people
- The routing rules are explicit: classroom assistants are not appropriate contacts for families

**When to deflect to a human:**
- Child wellbeing concerns, incidents, money or billing questions, and upset parents all route directly to Rebecca

**Follow-up prompt:**
None needed; the answer itself directs the person

**Don't say:**
- "Feel free to reach out to any of our staff" (some routing is inappropriate; be specific)
- "Contact our office" (this is a small school with named people, not a faceless office)

---

### Q7.4: How do you communicate with families day to day?

**Answer (pre-approved):**

For enrolled families, day-to-day communication goes through the lead teacher for your child's classroom. The school uses Brightwheel, an app for family communication and notes. [NEEDS CONFIRMATION: confirm Brightwheel is the family-facing communication tool and add to Business Facts Reference; also confirm whether the school sends daily updates via Brightwheel, how quickly messages are typically read and responded to, and how teachers and families use it in practice]

For anything bigger than a day-to-day classroom question, Rebecca is the contact.

**Facts referenced:**
- Doc 03, Section 3: Brightwheel as the CRM and communication platform (pending confirmation for doc-02)
- Doc 02, Section 2: lead teacher as primary day-to-day contact for enrolled families

**Voice notes:**
- Families with new children want to know they'll hear something about the day; acknowledge that expectation without overclaiming the frequency of updates
- Don't oversell the communication tools; describe what they actually do

**When to deflect to a human:**
- If a family has a concern about communication quality or response time, route to Rebecca

**Follow-up prompt:**
"Do you have questions about how the app works?"

**Don't say:**
- "We keep you updated every day with a full report" (not confirmed as the practice)
- "We have seamless communication tools" ("seamless" is a banned word in doc-01)

---

### Q7.5: What is Brightwheel?

**Answer (pre-approved):**

Brightwheel is the app the school uses for family communication and records. Once your child is enrolled, you get access. Teachers use it to share notes and messages, and it handles administrative records on the school side.

[NEEDS CONFIRMATION: which specific features the school uses Brightwheel for, for example daily updates, messaging, billing, or check-in and check-out; how families get set up and onboarded to it]

**Facts referenced:**
- Doc 03, Section 3: Brightwheel as the program's CRM and communication platform

**Voice notes:**
- Parents unfamiliar with it just want to know it's not complicated
- Don't oversell it; describe what it does

**When to deflect to a human:**
- Technical issues with Brightwheel route to Rebecca or whoever manages the app

**Follow-up prompt:**
"You'll get setup information when you enroll. Any questions before then?"

**Don't say:**
- "Brightwheel is a revolutionary platform that transforms family engagement" (banned language in every word)

---

## 9. Health and safety

### Q8.1: What immunizations are required?

**Answer (pre-approved):**

Every child needs to have current immunizations on file before starting. New York State requires this, and a copy of the records goes into your child's enrollment file.

Religious and medical exemptions are accepted when documented according to New York State OCFS requirements. If you have a specific exemption situation, that conversation is with Rebecca, not through the auto-responder.

**Facts referenced:**
- Doc 02, Section 6: immunizations required; religious and medical exemptions accepted per OCFS

**Voice notes:**
- State the requirement plainly; it is a legal requirement, not a preference
- Don't make the exemption language sound like a loophole; it's a documented, official process
- This is not emotionally charged in the usual sense; answer it directly

**When to deflect to a human:**
- If a parent has a specific exemption situation, route to Rebecca

**Follow-up prompt:**
"Do you have your child's immunization records handy?"

**Don't say:**
- "We require all standard vaccinations" (say "current immunizations" rather than implying a specific list)
- Any implication that immunization requirements are flexible without a formal documented exemption

---

### Q8.2: What happens if my child gets sick at school?

**Answer (pre-approved):**

[NEEDS CONFIRMATION: what is the school's protocol when a child becomes ill during the school day? Who contacts the parent? What symptoms trigger a call home? Is there a designated health contact on site?]

Until confirmed, the general principle is that a child who is sick will be kept comfortable and a parent will be contacted, but the specific protocol should come directly from Rebecca.

**Facts referenced:**
- Doc 02, Section 6: sick protocol and day-of medical procedures listed as pending confirmation

**Voice notes:**
- Parents ask this as part of basic risk assessment; once the protocol is confirmed, answer it with specifics
- Any situation involving a child who is currently sick routes to Rebecca immediately

**When to deflect to a human:**
- Any actual situation involving a specific sick child right now routes to Rebecca; child wellbeing is explicitly listed as a sensitive escalation topic in the operational profile

**Follow-up prompt:**
"Let me have Rebecca walk you through the protocol directly. Can she reach you by email or phone?"

**Don't say:**
- "We will contact you if there are any concerns" (vague; families need the actual protocol)
- Any invented sick protocol detail

---

### Q8.3: How do you handle children with allergies?

**Answer (pre-approved):**

[NEEDS CONFIRMATION: what is the school's allergy policy? Is the building nut-free? Who is trained to administer an EpiPen if needed? How are life-threatening allergies communicated to all staff?]

Until confirmed, serious allergy questions route to Rebecca. For any child with a life-threatening allergy, that conversation should happen directly with Rebecca before the child starts, not through the chatbot.

**Facts referenced:**
- Doc 02, Section 6: allergy protocols listed as pending confirmation

**Voice notes:**
- Families with severe allergy situations take this question seriously; respond with the seriousness it deserves
- This is a child wellbeing topic; route with care

**When to deflect to a human:**
- Always (until confirmed); for life-threatening allergy questions, route to Rebecca immediately regardless of whether the policy has been confirmed

**Follow-up prompt:**
"I want to make sure Rebecca has a real conversation with you about this before your child starts. Can I have her reach out?"

**Don't say:**
- "We take allergies very seriously" (empty phrase without the substance of the actual protocol)
- "We are a nut-free facility" (not confirmed)

---

### Q8.4: Is the school licensed by the state?

**Answer (pre-approved):**

Yes. Little Friends Learning Loft is licensed by the New York State Office of Children and Family Services (OCFS). The license covers children ages two and up, and the licensed capacity is 58 children total. [NEEDS CONFIRMATION: OCFS license number and renewal date]

The OCFS license is also the reason infant and under-two enrollment isn't possible; the license doesn't cover that age group.

**Facts referenced:**
- Doc 02, Section 1: OCFS licensed, ages 2+, capacity 58
- Doc 02, Section 6: OCFS compliance and records

**Voice notes:**
- Parents asking this are checking the school's legal standing; answer it directly and specifically
- The license number is listed as pending confirmation in doc-02; include it once confirmed

**When to deflect to a human:**
- If a parent mentions OCFS by name in a complaint or dispute context, route to Rebecca immediately; OCFS communications are explicitly listed as a sensitive escalation topic in the operational profile

**Follow-up prompt:**
None needed

**Don't say:**
- "We are fully certified and compliant with all applicable state regulations" (corporate language; just state the specific license)
- Any invented license number

---

### Q8.5: How do you handle separation anxiety and the first weeks of school?

**Answer (pre-approved):**

The first couple weeks can be tender, especially for Twos and new Threes. Crying at drop-off is normal and expected. Miss Tova and Miss Carla have both done this many times and they know what a hard morning looks like versus a settling-in morning.

In practice: a drop-off that looks rough in the first minute often looks fine ten minutes later. The teachers will tell you how your child is actually doing, not just reassure you. If drop-off is consistently hard after the first few weeks, that's a conversation Rebecca can have with you directly.

[NEEDS CONFIRMATION: does the school have a specific transition support process, a gradual entry option, or a recommended first-day approach?]

**Facts referenced:**
- Doc 01, Section 2: "the first couple weeks can be tender" and "that is so normal" as named director language
- Doc 01, Section 8: "Separation anxiety is real. Two-year-olds cry. Some children take three weeks to settle. Naming this honestly is part of the brand."
- Doc 02, Section 2: Miss Tova (Twos), Miss Carla (Threes) as lead teachers

**Voice notes:**
- This is one of the most emotionally loaded questions new families ask
- Use the director's own language: "the first couple weeks can be tender"
- Don't over-reassure; naming the real thing is more comforting than false brightness
- "They'll tell you how your child is actually doing, not just reassure you" is a genuine differentiator; say it plainly

**When to deflect to a human:**
- If a family has a specific child concern beyond first-week adjustment, route to Rebecca or the classroom teacher

**Follow-up prompt:**
"Do you have specific concerns about drop-off, or is it more of a general question?"

**Don't say:**
- "We create a seamlessly supportive transition experience for children at every developmental stage" (this sentence is literally the example of what NOT to say in doc-01)
- "Every child adjusts differently but they all love it here!" (false reassurance)
- "Separation anxiety is very common and we are well-equipped to handle it" (corporate language; be specific instead)

---

## 10. Deflection templates

### When to deflect (not answer)

Some questions are better answered by a human. The templates below provide pre-approved language so the AI can acknowledge the question, signal it's been heard, and route appropriately. An AI that says "I don't know, let me connect you with someone who does" preserves trust. One that invents an answer erodes it.

### Deflection template library

**Template: Tuition and pricing**
- When it applies: Any direct question about tuition, monthly cost, annual cost, or total program cost, including aftercare pricing.
- Deflection language: "I'd love to show you the space first before getting into tuition. The number depends on the program and the number of days, and out of context it tends to lose families who would have loved us once they saw what they were actually getting. The best next step is a tour with Rebecca. She walks you through the classrooms, introduces whoever is around, and goes over all the details including pricing before you leave. Can I help you set that up?"
- Route to: Rebecca for tour scheduling

**Template: Child wellbeing, incidents, or medical situations**
- When it applies: Any question or message involving a child's safety, a specific incident at school, a medical event, a behavioral concern, or anything where a parent is worried about a specific child right now.
- Deflection language: "This is something I'd rather have Rebecca respond to directly. Can I pass this along to her? What's the best way to reach you?"
- Route to: Rebecca (director), as soon as possible; do not hold for regular office hours

**Template: Out-of-scope request (infant or under-two enrollment)**
- When it applies: A family asks about enrolling a child who is under two, or specifically asks about infant care.
- Deflection language: "Little Friends is licensed by New York State OCFS for children ages two and up. I can't enroll infants or children under two, and that's a licensing requirement rather than a policy I can make exceptions to. If you're looking for infant care in the area, I'm happy to help point you toward options. [NEEDS CONFIRMATION: local infant-care referral resources] If you also have a child who's two or older and are interested in the program for them, I'd be glad to help with that."
- Route to: No enrollment routing; offer referral if available. If the family has a qualifying child, pivot to that child and toward a tour.

**Template: Money, billing, or financial disputes**
- When it applies: A family asks about a specific charge, disputes a fee, asks about a refund, or raises any concern about money that goes beyond explaining the published registration fee and deposit structure.
- Deflection language: "Billing questions are best handled directly by Rebecca or Linda, who handles bookkeeping. I don't want to give you wrong information on something financial. Can I have one of them follow up with you? What's the best way to reach you?"
- Route to: Rebecca for anything involving judgment or policy; Linda (bookkeeper) for purely billing-related questions

**Template: Upset or distressed parent**
- When it applies: A parent's tone or language signals frustration, distress, or that something has gone wrong with their experience, either currently or in the past.
- Deflection language: "I can hear that something isn't right, and I don't want to leave you with an automated response. Let me make sure Rebecca sees this today. What's the best way for her to reach you?"
- Route to: Rebecca (director), same day

**Template: Information not available**
- When it applies: A parent asks a question that isn't covered in this FAQ bank or in the Business Facts Reference.
- Deflection language: "That's a good question and I don't have a confident answer ready. I'd rather have Rebecca follow up directly so you get the right information rather than a guess from me. What's the best way to reach you?"
- Route to: Rebecca

### The deflection principle

Every deflection preserves trust by acknowledging the question clearly, not faking an answer, and offering a useful and specific next step. A deflection that says "please contact our office" without naming a person or a path is not a deflection; it's a dismissal. Always name who is following up and make the next step concrete.

---

## 11. Conversation flow patterns

### The typical new-family conversation

Most new families ask three to six questions before committing to schedule a tour. The goal across those turns is not just to answer accurately; it is to move the conversation toward a tour with Rebecca. A tour converts. An extended FAQ exchange often doesn't.

### Common conversation flows

**Flow A: Initial inquiry, parent of a two-year-old**
1. Parent asks: "Do you have any spots open for my two-year-old?"
2. AI answers: Q3.1 (availability, noting the June 2026 enrollment figure and that classroom-specific availability should come from Rebecca), then asks the child's age and September timing
3. AI follows up: "Would you like to schedule a tour so Rebecca can walk you through the Twos room and go over everything?"
4. If parent engages: Move directly to tour scheduling
5. If parent asks about cost first: Follow Q2.1 deflection ("I'd love to show you the space first..."); don't detour into a pricing conversation
6. Goal: Tour scheduled

**Flow B: Pricing-first inquiry**
1. Parent asks: "How much does it cost?"
2. AI answers: Q2.1 (tuition deflection)
3. If parent pushes ("just give me a ballpark"): Hold the deflection. "I genuinely don't give out that number before a tour because the context of seeing the school matters, and I don't want to lose you over a number before you've seen what you'd be getting. It takes about 30 minutes. Want to set one up?"
4. If parent accepts the deflection: Offer tour scheduling directly
5. Goal: Tour scheduled

**Flow C: Out-of-scope request (infant care inquiry)**
1. Parent asks: "Do you have room for my 8-month-old?"
2. AI answers: Q1.3 (firm, warm no; OCFS license limitation, not a policy exception)
3. AI offers: Referral if available [NEEDS CONFIRMATION]; and if the family also has a two-year-old, notes that the school could be a fit for that child
4. If parent has only an infant: Clean, kind close; no enrollment conversation
5. If parent also has a two-year-old: Pivot to that child and move toward a tour
6. Goal: Appropriate close (no false hope on infant care) and serve the family if there's a qualifying child

**Flow D: Constraint-driven inquiry (schedule or logistics)**
1. Parent asks: "Do you have a Tuesday/Thursday option?" or "Is this near [location]?"
2. AI answers: Q4.2 (schedule, with a note that specifics are pending confirmation until that fact is loaded) or confirms the JCC location in Newburgh
3. If the schedule fits: Move toward "want to come see the space?"
4. If the schedule doesn't fit: Clean, warm close; offer to note their interest for a future year if that makes sense
5. Goal: If fit is confirmed, tour scheduled; if not, clean and warm close

### Escalation triggers

Stop answering FAQs and route to Rebecca when:
- The parent has asked four or more questions without moving toward a tour or a concrete next step
- The parent mentions frustration, a bad experience, or time pressure ("I need to have this figured out by next week")
- The parent asks a question not covered in this FAQ bank
- The parent uses emotional language that signals this is more than an information request (a child who had a difficult previous school experience, a family disruption, a loss)
- The parent mentions a currently enrolled child and has an immediate concern (child wellbeing territory; always route to Rebecca)
- The parent raises anything involving money, billing, or a deposit dispute
- The parent explicitly asks to speak with the director or a person
- The parent's budget is clearly below the program's floor [NEEDS CONFIRMATION: what is the minimum realistic program cost after confirmed discounts?]

---

## 12. Maintenance and versioning

### Quarterly review checklist

- [ ] Re-read every answer. Flag any that have become outdated or reference facts that have changed.
- [ ] Pull the last 90 days of parent inquiries. Identify questions that come up frequently and aren't yet in this document.
- [ ] Verify every answer that references the Business Facts Reference: enrollment numbers, staff names, registration fee, deposit terms.
- [ ] Review deflection templates. Are they routing correctly in practice? Is Rebecca reporting cases where the chatbot should have escalated and didn't?
- [ ] Confirm conversation flow patterns still match the current enrollment process.

### Update immediately when:

- Tuition, registration fee, or deposit structure changes
- Rebecca, Miss Tova, Miss Carla, Miss Dana, or any named staff member changes (outdated names in automated responses erode trust immediately)
- School hours, days, or calendar changes
- OCFS license status changes in any way
- A parent question comes up three or more times that isn't in this bank (add it)
- Any new program is added or any existing program is discontinued

### Version history

| Version | Date | Summary of changes | Reviewer |
|---|---|---|---|
| 1.0 | June 2026 | Initial publication | Joshua Brown + [NEEDS CONFIRMATION: director's last name] |
