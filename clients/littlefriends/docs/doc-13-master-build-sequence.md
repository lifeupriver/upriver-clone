# Master build sequence and engagement playbook

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** June 2026
**Version:** 1.0
**Last update:** June 2026

**For:** Internal operations. Orchestrates the 12-document AI Operating System into a 4-week foundation engagement timeline.

**Companion documents:** 01 through 12 (the documents being orchestrated); 14 (Client Onboarding Kit, which handles the pre-Week-1 intake); 15 (Retainer Engagement Playbook, which handles post-Week-4 operations).

**Critical principle:** This is a default sequence, not a rigid schedule. Client readiness, access delays, and scope variations shift the timeline. The sequence captures the dependency graph, which is the part that doesn't change.

---

## Section 1: Engagement overview

A foundation engagement is the 4-week sprint that produces all 12 documents of the AI Operating System, loads them into the client's Claude Project, and stands up the Phase 1 automations from Document 11.

**What the foundation engagement delivers:**

- 12 populated source-of-truth documents loaded into the client's Claude Project
- Phase 1 automations live (typically the inquiry auto-responder plus the first follow-up sequence)
- Website P0 fixes complete (per Document 10, Section 9)
- GBP P0 improvements complete
- Baseline measurement captured (per Document 12, Section 1)
- 30-day follow-up review scheduled

**What the foundation engagement is not:**

- A full website rebuild. That is a separate engagement, scoped from Document 10, Section 9.
- Ongoing content production. That is the retainer phase, per Document 15.
- All automations from Document 11, Section 2. The foundation covers Phase 1 only. Phases 2 through 4 happen in the retainer.

**Typical timeline:**

- 4 weeks end-to-end under normal circumstances
- Compressed to 3 weeks possible with a cooperative client and pre-gathered access
- Extended to 6 weeks common when access gathering or client review cycles slip

**Team involved:**

- Me (Joshua), lead strategist, document producer, client-facing throughout
- Zach, automation implementation, joins in Week 3
- Annmarie, web implementation for P0 fixes, joins in Week 3-4 as needed
- Claude, document drafting throughout
- Client's booking coordinator or operations contact, responds to access requests and reviews drafts

---

## Section 2: The dependency graph

Which documents depend on which. This is the part that doesn't flex regardless of timeline.

**Hard dependencies (must be complete before the next document can start):**

```
01 Brand Voice Guide ────────┐
                             ├──> 07 FAQ Bank ──┐
02 Business Facts ───────────┤                  │
                             │                  ├──> 08 Email Templates ──> 11 Automation Spec
03 Sales Process Map ────────┤                  │                              │
                             │                  │                              │
04 Content Library ──────────┤                  │                              │
                             │                  │                              │
05 Competitor Landscape ─────┴──> 06 SEO ───────┴──> 09 Social Playbook ──┐    │
                                                                          │    │
                                                                          ├────┴──> 12 Measurement
                                                                          │
                                                          10 Website ─────┘
```

**Rationale for each dependency:**

- **01 and 02 come first, always.** Every downstream document references voice and facts. Nothing downstream can be produced reliably until these are locked.
- **03 can run in parallel with 01 and 02.** The Sales Process Map audits current state. It doesn't require voice or facts to be locked, though it benefits from their alignment.
- **04 depends on 01 and 02.** The Content Library curates assets, which requires knowing what voice and facts the content is meant to serve.
- **05 depends on 01 and 02.** The Competitor Landscape evaluates the client's position, which requires a clear sense of who the client is.
- **06 depends on 01, 02, and 05.** Keyword strategy must align with competitive context and brand voice.
- **07 depends on 01, 02, and 03.** FAQ answers combine voice, facts, and customer-journey stage.
- **08 depends on 01, 02, 03, and 07.** Templates apply voice to facts at process stages, reusing FAQ language.
- **09 depends on 01, 02, 04, 05, and 06.** The social playbook pulls voice, facts, available assets, competitive differentiation, and topic alignment.
- **10 depends on 01 through 09.** The website audit evaluates the site against everything else.
- **11 depends on 02, 03, 07, and 08.** Automations operationalize facts, process, answers, and templates.
- **12 depends on 03, 06, 09, and 11.** Measurement tracks the outcomes those documents aim to produce.

**Soft dependencies (preferred order but not strict):**

- Pre-audit work (secret shopper test, CRM access, Ahrefs pulls) ideally happens before Week 1 but can shift into Week 1 if needed.
- Competitor website review (for Document 10, Section 8) can happen whenever Document 05 is being built.

**What can run in parallel:**

- Documents 03, 04, and 05 can all run simultaneously after 01 and 02 are locked.
- Documents 07 and 09 can run in parallel.
- Document 11 spec writing and Document 10 auditing can overlap in Weeks 3 and 4.

---

## Section 3: Week-by-week build schedule

**Week 0: Pre-engagement (before the engagement formally starts)**

Triggered when the contract is signed and deposit paid. Handled by Document 14 (Client Onboarding Kit). Key milestones:

- Welcome email sent within 2 business hours of contract signing
- Access requests sent (full list from Document 14)
- Onboarding questionnaire sent
- Kickoff call scheduled for Day 1 of Week 1
- Secret shopper test initiated (I submit a fake inquiry)
- Ahrefs and Search Console data pulled for client and 3-5 competitors

**Week 1: Foundation (Documents 01, 02, 03)**

Day 1: Kickoff call (90 min). I walk the client through the engagement timeline, confirm priorities, and lock scope.

Days 2-3: Document 01 (Brand Voice Guide) drafted. Input: onboarding questionnaire, 10-15 real samples of past customer communication. Claude drafts from the spec; I do the voice-pass review.

Days 3-4: Document 02 (Business Facts Reference) drafted. Input: questionnaire, website, GBP, brochures, pricing docs. Claude drafts with gaps flagged. I identify anything requiring client input.

Days 4-5: Client fact-check pass on Document 02 and voice-check on Document 01. Turnaround expected within 48 hours.

Day 5: Document 03 (Sales Process Map) begins in parallel, with secret shopper results in hand and a CRM walkthrough with the client.

**End of Week 1 checkpoint:** Documents 01 and 02 at v1.0, delivered. Document 03 in draft.

---

**Week 2: Diagnostic and strategic (Documents 03, 04, 05, 06)**

Days 6-7: Document 03 finalized.

Days 7-8: Document 04 (Content Library) drafted, covering the photo, video, and testimonial inventory.

Days 8-10: Documents 05 (Competitor Landscape) and 06 (SEO Strategy) built in sequence. Competitor profiling happens first; SEO strategy is then informed by the competitive data.

Competitor work is time-intensive, typically 2-3 hours per competitor profile. Week 2 planning needs to account for that.

**End of Week 2 checkpoint:** Documents 03, 04, and 05 at v1.0. Document 06 at v1.0 or in final review.

---

**Week 3: Content and channels (Documents 07, 08, 09)**

Days 11-12: Document 07 (FAQ Bank), 30-50 pre-approved question-and-answer pairs.

Days 12-14: Document 08 (Email Templates), full template library built from Documents 01, 02, 03, and 07.

Days 13-14: Document 09 (Social Media Playbook) runs in parallel with 08.

Days 14-15: Client review of Documents 07, 08, and 09. Focus is voice confirmation in templates and social pillar alignment.

**End of Week 3 checkpoint:** Documents 07, 08, and 09 at v1.0. Zach joins for the Document 11 scoping kickoff.

---

**Week 4: Execution layer (Documents 10, 11, 12)**

Days 16-17: Document 10 (Website Audit), full page-by-page audit.

Days 18-19: Document 11 (Automation Spec Package), parent doc plus the first individual spec (typically the inquiry auto-responder).

Days 19-20: Document 12 (Measurement and KPI Framework), baselines captured and targets set.

Day 20: Client review of Documents 10, 11, and 12. Scope conversation for Document 10 recommendations (iterative, partial rebuild, or full rebuild).

**End of Week 4 checkpoint:** All 12 documents at v1.0. First automation spec approved for build. Phase 1 automation implementation begins, typically running through Weeks 5 and 6. Handoff to Document 15 (Retainer Playbook) for ongoing operations.

---

**Compressed 3-week timeline (when client readiness allows):**

- Week 1: Documents 01, 02, 03
- Week 2: Documents 04, 05, 06, 07
- Week 3: Documents 08, 09, 10, 11, 12

This only works when pre-engagement access gathering and questionnaire completion happened before Week 1.

**Extended 6-week timeline (common when client review cycles or access delays slip):**

- Weeks 1-2: Documents 01-03
- Weeks 3-4: Documents 04-07
- Weeks 5-6: Documents 08-12

---

## Section 4: Transition points

The specific moments where orchestration matters most, where one phase hands off to the next.

**Transition 1: Pre-engagement to Week 1**

Triggered by: kickoff call completion.

Checklist:
- Client has received welcome email
- Questionnaire submitted
- Access granted to: Ahrefs (I verify), CRM, GBP, social, website admin, photo storage, email platform
- Secret shopper test sent
- Baseline Ahrefs data pulled for client and competitors
- Documents 01 and 02 drafting begins Day 2

If checklist is incomplete: document the gaps, adjust Week 1 scope, and communicate with the client before starting.

**Transition 2: Week 2 to Week 3 (foundation to content)**

Triggered by: Documents 01-06 complete.

Checklist:
- All six foundation documents loaded into the client's Claude Project
- Cross-reference pass complete (facts align, voice aligns, competitive positioning aligns with SEO targets)
- Client has confirmed voice, facts, and strategic direction
- Document 07 (FAQ Bank) drafting begins Day 11

Why this transition matters: Documents 07-09 apply everything from 01-06. If 01-06 are wrong, 07-09 inherit the errors and amplify them.

**Transition 3: Week 3 to Week 4 (content to execution)**

Triggered by: Documents 07-09 complete and approved.

Checklist:
- Email templates voice-confirmed by client
- FAQ Bank factually confirmed
- Social pillars confirmed as right-sized to production capacity
- Zach briefed and joining for Week 4 automation work
- Annmarie briefed on any web implementation needs

Why this transition matters: the execution layer (10-12) makes the strategy layer (01-09) real. If execution is scoped incorrectly, the strategy never lands.

**Transition 4: Week 4 to retainer**

Triggered by: Documents 10-12 complete, first Phase 1 automation approved for build.

Checklist:
- All 12 documents at v1.0 in client's Claude Project
- Website P0 fixes scoped and in progress
- Phase 1 automation in development by Zach
- Baseline measurement captured
- Retainer engagement terms confirmed (if continuing)
- 30-day review scheduled

Handoff: Document 15 (Retainer Engagement Playbook) takes over from here.

---

## Section 5: Decision points and scope forks

**Fork 1: Scope of Document 10 recommendations**

After the Week 4 Document 10 delivery, the client chooses:

- **Option A (iterative improvements):** P0 fixes within the foundation engagement; P1 and P2 improvements into the retainer
- **Option B (partial rebuild):** Separate engagement scoped from Document 10, Section 9
- **Option C (full rebuild):** Larger separate engagement

Default recommendation: Option A for clients with a healthy current site; Option B when mobile performance or schema limitations are severe; Option C when the website is a meaningful brand vulnerability.

**Fork 2: Phase 1 automation scope**

The foundation engagement includes Phase 1 automations (typically 2-3 automations from Document 11, Section 2). The client chooses which:

- Default: Inquiry auto-responder plus post-inquiry 3-touch follow-up
- Alternative: Inquiry auto-responder plus tour confirmation and reminder sequence
- Expansion: All three of the above

Phases 2 through 4 automations go into the retainer.

**Fork 3: Content production during foundation**

The foundation engagement typically doesn't include content production beyond the documents themselves. Some clients want an initial content push. Options:

- **Default:** No content production. Planning only. The retainer begins the content cadence.
- **Alternative:** 2-3 pillar pages produced as part of foundation, which adds 1-2 weeks to the timeline.

**Fork 4: Retainer continuation**

At the end of Week 4:

- Continue to retainer (default for most clients)
- Pause and reconvene in 60-90 days
- Self-implement with quarterly check-ins only
- End engagement at foundation

Each fork should be a conscious decision captured in the updated engagement letter, not assumed.

---

## Section 6: Resource and capacity planning

**My time commitment (standard 4-week foundation):**

- Week 0 (pre-engagement): 2-4 hours
- Week 1: 12-16 hours
- Week 2: 14-18 hours
- Week 3: 12-16 hours
- Week 4: 10-14 hours
- Total: 50-68 hours

**Zach's time commitment:**

- Week 3: 2-4 hours (scoping, Document 11 input)
- Week 4: 6-10 hours (Phase 1 automation build initiation)
- Post-Week 4 (Weeks 5-6): 15-25 hours (Phase 1 automation completion)

**Annmarie's time commitment:**

- Week 4: 2-4 hours (Document 10 P0 scoping)
- Post-Week 4: Variable based on scope fork (0-30 hours)

**Client's time commitment:**

- Week 0: 2 hours (questionnaire plus access setup)
- Week 1: 2-3 hours (kickoff plus fact-check)
- Week 2: 2 hours (reviews)
- Week 3: 2 hours (reviews)
- Week 4: 2-3 hours (reviews plus scope conversation)
- Total: 10-12 hours

**Claude's role:**

Claude drafts documents throughout the engagement, per the per-document time estimates in each of Documents 01-12. Token usage estimate: approximately 1.5M-2.5M tokens across the full foundation engagement.

**Capacity implications:**

I can run 2-3 foundation engagements concurrently if client timelines are staggered. I cannot run more than one engagement starting in the same week. The Week 1 load is the bottleneck.

---

## Section 7: Failure modes in orchestration

**Failure 1: Access gathering leaks into Week 1.** The client hasn't granted Ahrefs, CRM, or social access by kickoff. Document 02 delays, and everything downstream slides. Fix: access gathering is Week 0 work. If it's not complete by kickoff, push the kickoff 3-5 days.

**Failure 2: Client review cycles take 5 or more days instead of 2.** Each document's review cycle was scoped at 48 hours; the actual cycle stretches to a week. Timeline slips by 2-3 weeks. Fix: document review SLAs in the engagement letter and communicate the impact of delays early.

**Failure 3: Document 05 (Competitor Landscape) takes 8 hours instead of 3.** Competitor research is time-hungry and scope creep happens. Fix: Document 05, Section 3 specifies 3-5 competitors maximum. Resist profiling more.

**Failure 4: Voice drift in downstream documents.** Templates in Document 08 don't match the Brand Voice Guide because Document 01 wasn't fully locked when 08 started. Fix: hard gate. Document 08 doesn't start until Document 01 has client sign-off.

**Failure 5: Fact conflicts surface in Week 3.** A capacity number on the website differs from what the client confirmed in the Document 02 fact-check. Fix: the Document 02 fact-check is thorough, and cross-reference passes happen at each transition checkpoint.

**Failure 6: Phase 1 automation not actually launched at end of Week 4.** Document 11 is spec'd but Zach hasn't built yet. "Complete" becomes ambiguous. Fix: the end-of-Week-4 checkpoint is "approved for build," not "live." Live happens in Weeks 5-6.

**Failure 7: Document 12 baselines never captured cleanly.** Measurement gets deferred because baselines feel tedious. Post-engagement improvement is then unmeasurable. Fix: Document 12 baseline capture is a hard checkpoint. No "complete" without it.

---

## Section 8: Outcomes definition

**The foundation engagement is complete when:**

- [ ] All 12 documents at v1.0 delivered and loaded into the client's Claude Project
- [ ] Each document's definition of done (per individual spec) is met
- [ ] Cross-reference passes complete between dependent documents
- [ ] Client has reviewed and signed off on every document
- [ ] Phase 1 automations are spec'd and in active development (live or nearly live)
- [ ] Document 10 P0 fixes are either complete or scoped as a separate engagement
- [ ] Document 12 baselines captured with dated entries
- [ ] 30-day review scheduled with client
- [ ] Retainer engagement (if continuing) has terms confirmed
- [ ] Handoff to Document 15 (Retainer Playbook) complete

**Post-engagement artifacts:**

- Client has their Claude Project fully populated
- Client has a measurement baseline
- Client has at least one live automation producing measurable outcomes
- Client has a 90-day roadmap of what happens next (per Document 12)

**What is explicitly not included in "complete":**

- Full rebuild of website (separate engagement)
- All automations from Document 11 (Phases 2-4 happen in the retainer)
- Sustained content production (happens in the retainer)
- Ongoing measurement review (happens in the retainer, per Document 15)
