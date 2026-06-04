# Document Production Spec 13: Master Build Sequence and Engagement Playbook

## What This Spec Is

This is the connective tissue for the 12 document specs. It orchestrates them into a sequenced delivery timeline, names the dependencies between documents, and establishes the week-by-week rhythm of a standard foundation engagement. Without this document, anyone producing the AI Operating System has to re-derive the build order from 12 separate specs — slow, error-prone, and inconsistent across clients.

This document is the single source of truth for "here's what the first 4 weeks of an engagement look like, what happens when, and who's doing it." It assumes Documents 01-12 exist as specifications and focuses exclusively on orchestration.

---

## Quick Reference

| Attribute | Value |
|---|---|
| **Document number** | 13 of 18 (first of the orchestration docs) |
| **Priority** | High — required before running any full foundation engagement |
| **Total length target** | 2,000-3,500 words |
| **Total time to produce** | 2-3 hours (mostly synthesis from existing specs) |
| **Joshua's time** | 2 hours |
| **Claude's time** | 30 minutes |
| **Client's time** | Zero (this is internal operational doc) |
| **Delivery format** | Markdown file, loaded into the consulting Claude Project |
| **File naming convention** | `00-master-build-sequence.md` (lives at project root) |
| **Foundation for** | Every client foundation engagement going forward |

---

## When This Document Gets Built

**Once, at business setup.** Updated whenever the 12 document specs materially change or whenever engagement patterns evolve based on accumulated client experience.

**Triggers:** Documents 01-12 complete and stable.

**Blocks:** Standardized pricing and scoping of foundation engagements.

---

## Section-by-Section Template

### Header Block

```markdown
# Master Build Sequence and Engagement Playbook

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** [Month Year]
**Version:** 1.0
**Last update:** [Month Year]

**For:** Internal operations. Orchestrates the 12-document AI Operating System into a 4-week foundation engagement timeline.

**Companion documents:** 01 through 12 (the documents being orchestrated); 14 (Client Onboarding Kit, which handles the pre-Week-1 intake); 15 (Retainer Engagement Playbook, which handles post-Week-4 operations).

**Critical principle:** This is a default sequence, not a rigid schedule. Client readiness, access delays, and scope variations shift the timeline. The sequence captures the dependency graph, which is the part that doesn't change.
```

---

### Section 1: Engagement Overview

**Purpose:** The 30-second overview of what a foundation engagement actually is.

**Word count target:** 200-400 words.

Required content:

**What "foundation engagement" means:**
The 4-week sprint that produces all 12 documents of the AI Operating System, loads them into the client's Claude Project, and stands up the Phase 1 automations from Document 11.

**Deliverables:**
- 12 populated source-of-truth documents loaded into client's Claude Project
- Phase 1 automations live (typically inquiry auto-responder + first follow-up sequence)
- Website P0 fixes complete (per Document 10 Section 9)
- GBP P0 improvements complete
- Baseline measurement captured (per Document 12 Section 1)
- 30-day follow-up review scheduled

**What the foundation engagement is NOT:**
- A full website rebuild (that's a separate engagement, scoped from Document 10 Section 9)
- Ongoing content production (that's the retainer phase, per Document 15)
- All automations from Document 11 Section 2 (Phase 1 only; Phase 2-4 happen in retainer)

**Typical timeline:**
- 4 weeks end-to-end under normal circumstances
- Compressed to 3 weeks possible with cooperative client and pre-gathered access
- Extended to 6 weeks common when access gathering or client review cycles slip

**Team involved:**
- Joshua — lead strategist, document producer, client-facing
- Zach — automation implementation (joins in Week 3)
- Annmarie — web implementation for P0 fixes (joins in Week 3-4 as needed)
- Claude — document drafting throughout
- Client's booking coordinator or operations contact — responds to access requests, reviews drafts

---

### Section 2: The Dependency Graph

**Purpose:** Which documents depend on which. This is the part that doesn't flex regardless of timeline.

**Word count target:** 300-500 words.

Required content:

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

- **01-02 come first always.** Every downstream document references voice and facts. Nothing downstream can be produced reliably until these are locked.
- **03 can run in parallel with 01-02** — the Sales Process Map audits the current state; it doesn't require voice or facts to be locked, though it benefits from their alignment.
- **04 depends on 01 and 02** — the Content Library curates assets, which requires knowing what voice and facts the content serves.
- **05 depends on 01 and 02** — the Competitor Landscape evaluates the client's position, which requires clear sense of who the client is.
- **06 depends on 01, 02, 05** — keyword strategy must align with competitive context and brand voice.
- **07 depends on 01, 02, 03** — FAQ answers combine voice, facts, and customer-journey stage.
- **08 depends on 01, 02, 03, 07** — templates apply voice to facts at process stages, reusing FAQ language.
- **09 depends on 01, 02, 04, 05, 06** — social playbook pulls voice, facts, available assets, competitive differentiation, topic alignment.
- **10 depends on 01 through 09** — website audit evaluates the site against everything else.
- **11 depends on 02, 03, 07, 08** — automations operationalize facts, process, answers, and templates.
- **12 depends on 03, 06, 09, 11** — measurement tracks the outcomes those documents aim to produce.

**Soft dependencies (preferred order but not strict):**

- Pre-audit work (secret shopper test, CRM access, Ahrefs pulls) ideally happens before Week 1 but can shift into Week 1 if needed.
- Competitor website review (for Document 10 Section 8) can happen whenever Document 05 is being built.

**What can run in parallel:**

- Documents 03, 04, 05 can all run simultaneously after 01 and 02 are locked
- Documents 07 and 09 can run in parallel
- Document 11 spec writing and Document 10 auditing can overlap in Week 3-4

---

### Section 3: Week-by-Week Build Schedule

**Purpose:** The default timeline mapped to calendar weeks.

**Word count target:** 500-800 words.

Required content:

**Week 0: Pre-engagement (before the engagement formally starts)**

Triggered when the contract is signed and deposit paid. Handled by Document 14 (Client Onboarding Kit). Key milestones:
- Welcome email sent within 2 business hours of contract signing
- Access requests sent (full list from Document 14)
- Onboarding questionnaire sent
- Kickoff call scheduled for Day 1 of Week 1
- Secret shopper test initiated (Joshua submits fake inquiry)
- Ahrefs/Search Console data pulled for client and 3-5 competitors

**Week 1: Foundation (Documents 01, 02, 03)**

Day 1: Kickoff call (90 min). Joshua walks client through the engagement timeline, confirms priorities, locks scope.

Day 2-3: Document 01 (Brand Voice Guide) drafted.
- Input: onboarding questionnaire, 10-15 real samples of past customer communication
- Claude drafts from the spec
- Joshua voice-pass review

Day 3-4: Document 02 (Business Facts Reference) drafted.
- Input: questionnaire, website, GBP, brochures, pricing docs
- Claude drafts with [NEEDS CONFIRMATION] flags
- Joshua identifies gaps needing client input

Day 4-5: Client fact-check pass on Document 02 and voice-check on Document 01. Turnaround: 48 hours.

Day 5: Document 03 (Sales Process Map) begins in parallel — secret shopper results in hand, CRM walkthrough with client.

**End of Week 1 checkpoint:** Documents 01 and 02 at v1.0 delivered. Document 03 in draft.

**Week 2: Diagnostic and strategic (Documents 03, 04, 05, 06)**

Day 6-7: Document 03 finalized.
Day 7-8: Document 04 (Content Library) drafted — photo/video/testimonial inventory.
Day 8-10: Documents 05 (Competitor Landscape) and 06 (SEO Strategy) built in sequence — Competitor first, then SEO informed by competitor data.

Competitor work is time-intensive (2-3 hours per competitor profile). Plan Week 2 accordingly.

**End of Week 2 checkpoint:** Documents 03, 04, 05 at v1.0. Document 06 at v1.0 or in final review.

**Week 3: Content and channels (Documents 07, 08, 09)**

Day 11-12: Document 07 (FAQ Bank) — 30-50 pre-approved question-answer pairs.
Day 12-14: Document 08 (Email Templates) — full template library built from Documents 01, 02, 03, 07.
Day 13-14: Document 09 (Social Media Playbook) in parallel.

Day 14-15: Client review of Documents 07, 08, 09. Focus on voice confirmation in templates and social pillars.

**End of Week 3 checkpoint:** Documents 07, 08, 09 at v1.0. Zach joins for Document 11 scoping kickoff.

**Week 4: Execution layer (Documents 10, 11, 12)**

Day 16-17: Document 10 (Website Audit) — full page-by-page audit.
Day 18-19: Document 11 (Automation Spec Package) — parent doc + first individual spec (typically inquiry auto-responder).
Day 19-20: Document 12 (Measurement and KPI Framework) — baselines captured, targets set.

Day 20: Client review of Documents 10, 11, 12. Scope conversation for Document 10 recommendations (iterative vs. partial rebuild vs. full rebuild).

**End of Week 4 checkpoint:** All 12 documents at v1.0. First automation spec approved for build. Phase 1 automation implementation begins (typically runs through Week 5-6). Handoff to Document 15 (Retainer Playbook) for ongoing operations.

**Compressed 3-week timeline (when client readiness allows):**
- Week 1: 01, 02, 03
- Week 2: 04, 05, 06, 07
- Week 3: 08, 09, 10, 11, 12

Only works when pre-engagement access gathering and questionnaire completion happened before Week 1.

**Extended 6-week timeline (common when client review cycles or access delays slip):**
- Weeks 1-2: Documents 01-03
- Weeks 3-4: Documents 04-07
- Weeks 5-6: Documents 08-12

---

### Section 4: Transition Points

**Purpose:** The specific moments where orchestration matters most — where one phase hands off to the next.

**Word count target:** 300-500 words.

Required content:

**Transition 1: Pre-engagement → Week 1**

Triggered by: kickoff call completion.

Checklist:
- Client has received welcome email
- Questionnaire submitted
- Access granted to: Ahrefs (Joshua verifies), CRM, GBP, social, website admin, photo storage, email platform
- Secret shopper test sent
- Baseline Ahrefs data pulled for client + competitors
- Document 01 and 02 drafting begins Day 2

If checklist incomplete: document gaps, adjust Week 1 scope, communicate with client before starting.

**Transition 2: Week 2 → Week 3 (foundation → content)**

Triggered by: Documents 01-06 complete.

Checklist:
- All six foundation documents loaded into client Claude Project
- Cross-reference pass complete (facts align, voice aligns, competitive positioning aligns with SEO targets)
- Client has confirmed voice, facts, and strategic direction
- Document 07 (FAQ Bank) drafting begins Day 11

Why this transition matters: Documents 07-09 apply everything from 01-06. If 01-06 are wrong, 07-09 inherit the errors and amplify them.

**Transition 3: Week 3 → Week 4 (content → execution)**

Triggered by: Documents 07-09 complete and approved.

Checklist:
- Email templates voice-confirmed by client
- FAQ Bank factually confirmed
- Social pillars confirmed as right-sized to production capacity
- Zach briefed and joining for Week 4 automation work
- Annmarie briefed on any web implementation needs

Why this transition matters: The execution layer (10-12) makes the strategy layer (01-09) real. If execution is scoped incorrectly, the strategy never lands.

**Transition 4: Week 4 → Retainer**

Triggered by: Documents 10-12 complete; first Phase 1 automation approved for build.

Checklist:
- All 12 documents at v1.0 in client Claude Project
- Website P0 fixes scoped and in progress
- Phase 1 automation in development by Zach
- Baseline measurement captured
- Retainer engagement terms confirmed (if continuing)
- 30-day review scheduled

Handoff: Document 15 (Retainer Engagement Playbook) takes over from here.

---

### Section 5: Decision Points and Scope Forks

**Purpose:** The places where engagements commonly diverge from the default path.

**Word count target:** 300-400 words.

Required content:

**Fork 1: Scope of Document 10 recommendations**

After Week 4 Document 10 delivery, client chooses:
- **Option A (iterative improvements):** P0 fixes within the foundation engagement; P1/P2 into retainer
- **Option B (partial rebuild):** Separate engagement scoped from Document 10 Section 9
- **Option C (full rebuild):** Larger separate engagement

Default recommendation: Option A for clients with healthy current site; Option B when mobile performance or schema limitations are severe; Option C for clients where the website is a meaningful brand vulnerability.

**Fork 2: Phase 1 automation scope**

Foundation engagement includes Phase 1 automations (typically 2-3 automations from Document 11 Section 2). Client chooses which:
- Default: Inquiry auto-responder + post-inquiry 3-touch follow-up
- Alternative: Inquiry auto-responder + tour confirmation/reminder sequence
- Expansion: All 3 above

Additional Phase 2-4 automations go into retainer.

**Fork 3: Content production during foundation**

Foundation engagement typically doesn't include content production beyond the documents themselves. But some clients want an initial content push. Options:
- **Default:** No content production; planning only; retainer begins content cadence
- **Alternative:** 2-3 pillar pages produced as part of foundation (adds 1-2 weeks to timeline)

**Fork 4: Retainer continuation**

At end of Week 4:
- Continue to retainer (default for most clients)
- Pause and reconvene in 60-90 days
- Self-implement with quarterly check-ins only
- End engagement at foundation

Each fork should be a conscious decision captured in the updated engagement letter, not assumed.

---

### Section 6: Resource and Capacity Planning

**Purpose:** What the engagement costs in human hours, who does what, when.

**Word count target:** 200-400 words.

Required content:

**Joshua's time commitment (standard 4-week foundation):**

- Week 0 (pre-engagement): 2-4 hours
- Week 1: 12-16 hours
- Week 2: 14-18 hours
- Week 3: 12-16 hours
- Week 4: 10-14 hours
- Total: 50-68 hours

**Zach's time commitment:**
- Week 3: 2-4 hours (scoping, Document 11 input)
- Week 4: 6-10 hours (Phase 1 automation build initiation)
- Post-Week 4 (weeks 5-6): 15-25 hours (Phase 1 automation completion)

**Annmarie's time commitment:**
- Week 4: 2-4 hours (Document 10 P0 scoping)
- Post-Week 4: Variable based on scope fork (0-30 hours)

**Client's time commitment:**
- Week 0: 2 hours (questionnaire + access setup)
- Week 1: 2-3 hours (kickoff + fact-check)
- Week 2: 2 hours (reviews)
- Week 3: 2 hours (reviews)
- Week 4: 2-3 hours (reviews + scope conversation)
- Total: 10-12 hours

**Claude's role:**
- Document drafting throughout
- Per-document time per Document 01-12 specs
- Token usage estimate: ~1.5M-2.5M tokens across the full foundation engagement

**Capacity implications:**
Joshua can run 2-3 foundation engagements concurrently if client timelines are staggered. Cannot run more than one engagement starting in the same week — the Week 1 load is the bottleneck.

---

### Section 7: Failure Modes in Orchestration

**Purpose:** Specific orchestration failures that happen across engagements.

**Word count target:** 200-400 words.

Required content:

**Failure 1: Access gathering leaks into Week 1.** Client hasn't granted Ahrefs/CRM/social access by kickoff. Document 02 delays; everything downstream slides. Fix: access gathering is Week 0 work; if not complete by kickoff, push kickoff by 3-5 days.

**Failure 2: Client review cycles take 5+ days instead of 2.** Each document's review cycle was scoped at 48 hours; actual is a week. Timeline slips by 2-3 weeks. Fix: document review SLAs in the engagement letter; communicate impact of delays early.

**Failure 3: Document 05 (Competitor Landscape) takes 8 hours instead of 3.** Competitor research is time-hungry; scope creep happens. Fix: Document 05 Section 3 spec says 3-5 competitors max; resist profiling more.

**Failure 4: Voice drift in downstream documents.** Templates in Document 08 don't match Brand Voice Guide because Doc 01 wasn't fully locked when 08 started. Fix: hard-gate — Document 08 doesn't start until Document 01 has client sign-off.

**Failure 5: Fact conflicts surface in Week 3.** Capacity number on website differs from what client said in Document 02 fact-check. Fix: Document 02 fact-check is thorough; cross-reference passes happen at each transition.

**Failure 6: Phase 1 automation not actually launched at end of Week 4.** Document 11 is spec'd but Zach hasn't built yet. "Complete" is ambiguous. Fix: end-of-Week-4 checkpoint is "approved for build," not "live." Live happens in Week 5-6.

**Failure 7: Document 12 baselines never captured cleanly.** Measurement gets deferred because baselines feel tedious. Then post-engagement improvement is unmeasurable. Fix: Document 12 baseline capture is a hard checkpoint; no "complete" without it.

---

### Section 8: Outcomes Definition

**Purpose:** What "foundation engagement complete" means, objectively.

**Word count target:** 200-300 words.

Required content:

**The foundation engagement is complete when:**

- [ ] All 12 documents at v1.0 delivered and loaded into client Claude Project
- [ ] Each document's Definition of Done (per individual spec) is met
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

**What's explicitly not included in "complete":**
- Full rebuild of website (separate engagement)
- All automations from Document 11 (Phase 2-4 happen in retainer)
- Sustained content production (happens in retainer)
- Ongoing measurement review (happens in retainer per Document 15)

---

## How to Build This Document

**Step 1: Review all 12 document specs (45 min).** Map each spec's prerequisites, dependencies, time estimates.

**Step 2: Draft the dependency graph (30 min).** Visualize as above; identify critical path.

**Step 3: Map to 4-week default schedule (30 min).** Balance load across weeks; identify parallel opportunities.

**Step 4: Define transition points and forks (30 min).** Where do engagements most often diverge?

**Step 5: Resource modeling (20 min).** Hours by person by week.

**Step 6: Failure mode review (20 min).** Pull from accumulated client experience.

**Step 7: Definition of Done (15 min).** Objective checkpoints.

---

## Definition of Done

- [ ] All 8 sections complete
- [ ] Dependency graph accurately reflects all 12 specs
- [ ] Week-by-week schedule covers both default and common variant timelines
- [ ] Transition checklists are specific and testable
- [ ] Resource planning includes all team members
- [ ] Failure modes pulled from real engagement experience, not speculation
- [ ] Cross-referenced against each of the 12 specs' "when built" and prerequisite sections
- [ ] File saved with naming convention `00-master-build-sequence.md` at project root
- [ ] Loaded into consulting Claude Project

---

## Common Failure Modes

**Failure 1: Orchestration doc gets out of sync with individual specs.** A spec is updated; this document still shows old dependencies. Fix: any spec update triggers this document review.

**Failure 2: Timeline is aspirational.** Default 4-week schedule assumes perfect client responsiveness. Reality is longer. Fix: document the extended 6-week variant as equally default.

**Failure 3: Transitions aren't enforced.** "Week 2 complete" gets declared without cross-reference pass happening. Downstream errors compound. Fix: checkpoints have checklists; no moving on until boxes ticked.

**Failure 4: Scope forks aren't surfaced proactively.** Client discovers Week 5 that they wanted content production included. Fix: forks are discussed in kickoff; conscious decisions captured in engagement letter.

**Failure 5: Resource planning ignores concurrent engagements.** Joshua takes on three foundations starting the same week; Week 1 capacity exceeded. Fix: staggered start dates enforced in sales calendar.
