# Document Production Spec 17: Handoff and Offboarding Spec

## What This Spec Is

This spec defines what happens when a client engagement ends — whether that's a retainer wind-down, a pause, a transfer to internal team, or a hard end. Without a structured handoff, engagements end messily: access lingers where it shouldn't, the client doesn't know what they own, and the relationship sours over loose ends. With a structured handoff, engagements end as cleanly as they started, which protects the relationship and the possibility of future re-engagement or referral.

The spec also covers mid-engagement team handoffs — moments when Joshua is transferring work to Annmarie, Zach, or Megan, or when a team member moves on and their work transfers to someone else. These internal handoffs need the same rigor as client offboarding.

---

## Quick Reference

| Attribute | Value |
|---|---|
| **Document number** | 17 of 18 |
| **Priority** | Medium-high — not needed for first client, but needed before the first client wind-down |
| **Total length target** | 2,000-3,000 words |
| **Total time to produce** | 2-3 hours |
| **Joshua's time** | 2 hours |
| **Claude's time** | 30 min |
| **Delivery format** | Markdown spec; per-engagement handoff artifact produced from the spec |
| **File naming convention** | `17-handoff-offboarding-spec.md` (spec); `[client-slug]-offboarding.md` (per-client) |

---

## When This Document Gets Built

**Once, at business setup.** Updated when operational patterns evolve.

**Triggers:** Documents 01-16 complete. Anticipation of first client transition.

---

## Section-by-Section Template

### Header Block

```markdown
# Handoff and Offboarding Spec

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** [Month Year]
**Version:** 1.0

**For:** Internal operations. Covers four scenarios: client engagement ending cleanly, client engagement ending under stress, team member handoff mid-engagement, and team member departure.

**Companion documents:** 13 (Master Build Sequence); 15 (Retainer Playbook — where continuation decisions are made).

**Critical principle:** The end of an engagement matters as much as the start. Endings that feel clean preserve the relationship; endings that feel loose damage it. A damaged relationship eliminates referrals and future re-engagement, which are the two highest-ROI client types.
```

---

### Section 1: Scenario Types

**Purpose:** The distinct scenarios this spec covers.

**Word count target:** 200-400 words.

Required content:

**Scenario A: Planned end of engagement**

Client has captured value, doesn't need ongoing retainer, and both parties agree the engagement has reached natural end. Most common scenarios:
- Client has strong internal capacity to maintain the operating system
- Client's business direction has changed (sold, merged, pivoted)
- Budget shift at client's business
- End of agreed contract term with no extension

**Scenario B: Pause and reconvene**

Client doesn't want to end entirely but needs to pause for business reasons (seasonal slowdown, cash flow, internal capacity). Retainer pauses for a defined window (60-180 days); access stays in place; no active work.

**Scenario C: Client-initiated transfer to internal team**

Client has hired internal marketing or operations person and wants to transfer ownership of the AI Operating System to them. Requires structured knowledge transfer — the internal person needs to actually know how the system works.

**Scenario D: Engagement ending under stress**

Client is dissatisfied, budget was cut unexpectedly, or relationship has soured. Handoff happens faster and with more friction. Goal: clean exit regardless of cause. Don't burn the relationship further on exit.

**Scenario E: Team member handoff (mid-engagement)**

Joshua transitioning work to Annmarie, Zach, or someone else during a live engagement. Client continues; internal ownership shifts.

**Scenario F: Team member departure**

A team member (Zach, Annmarie, subcontractor) is leaving Upriver. Their client-facing and internal work needs to transfer.

**Each scenario has a different emphasis** but shares the same core checklist: access, documentation, tools, data, relationships.

---

### Section 2: Client Offboarding — Standard Checklist

**Purpose:** The end-of-engagement checklist regardless of scenario.

**Word count target:** 500-800 words.

Required content:

**Pre-offboarding (2-4 weeks before end):**

- Trigger conversation with client: confirm end date and reason
- Produce offboarding summary document (template below)
- Schedule final review call
- Begin access revocation planning

**Final deliverables (last 2 weeks):**

1. **Current-state report** — Where KPIs landed vs. baseline; what worked; what didn't
2. **Ownership document** — What the client has, what's theirs, what persists after engagement ends
3. **Source document export** — All 12 documents delivered in client's preferred format (Markdown, PDF, Google Doc copies)
4. **Claude Project transfer** — Client's Claude Project stays with them (they own it); Joshua's access revoked
5. **Automation disposition** — Each automation: who maintains, who has access, who pays for infrastructure
6. **Access inventory** — Complete list of access Joshua/team has, and what's happening to each

**Access revocation schedule:**

Timing matters. Revoke too early and work breaks mid-engagement; revoke too late and security risk.

| Access type | When to revoke | Method |
|---|---|---|
| Ahrefs | On engagement end date | Remove from team |
| Google Search Console | On engagement end date | Remove owner access; client keeps ownership |
| Website admin | On engagement end date | Remove user; client removes email from admin list |
| CRM (HoneyBook, etc.) | Within 7 days of end | Client removes Joshua as team member |
| Google Business Profile | Within 7 days | Remove as manager |
| Social accounts | Within 7 days | Remove as business manager / user |
| Anthropic API | Within 14 days | If Joshua's key was used, transfer or rotate |
| Supabase / n8n infrastructure | Depends on automation disposition (Section 3) | |
| 1Password shared vault entries | Delete within 14 days | |
| Email (if shared) | Immediate | |

**Timing exceptions:**
- If client needs continued access to Joshua's knowledge during transition, extend by agreed window with explicit end date
- Never leave access lingering "indefinitely" — always set an end date

**Final call agenda (60 min):**

1. Walk through the current-state report (15 min)
2. Confirm ownership of all artifacts and documents (10 min)
3. Discuss automation disposition (10 min)
4. Access revocation timeline (5 min)
5. Future relationship: referrals, re-engagement, staying in touch (10 min)
6. Client questions (10 min)

**Post-engagement (Day 1-30):**

- All access revoked per schedule
- Final invoice sent
- Client listed in past-client CRM with last-contact date
- 30-day check-in email (light touch, "how's it going, any questions, I'm here if you need me")
- 6-month and 12-month annual touches per Document 16 nurture sequence

**Post-engagement (Day 30+):**

- No further active work unless re-engaged
- Response to client-initiated questions: free for light questions, scoped for anything substantive
- Referrals from past client always welcomed and acknowledged personally

---

### Section 3: Automation Disposition

**Purpose:** What happens to the automations Zach built during the engagement.

**Word count target:** 300-500 words.

Required content:

**Scenarios for each automation:**

**Option A: Client takes over entirely**

Client has internal technical capacity. Automation continues running on client's infrastructure.

Requirements:
- Client has or creates n8n account (self-hosted or cloud)
- Automation is exported and deployed to client's n8n
- Anthropic API key transferred to client's account
- Supabase tables migrated to client's Supabase
- Client receives spec + video walkthrough of the automation
- Joshua revokes access; automation runs independently

Works for: clients with internal technical capability; rare

**Option B: Client transfers to another vendor**

Client hires a different consultant or agency who will take over automation maintenance.

Requirements:
- Joshua exports full automation to new vendor
- Spec and documentation transferred
- Credentials transferred securely (1Password shared, then deleted from Joshua's side)
- Walkthrough call with new vendor to explain architecture
- Joshua revokes personal access

**Option C: Client pauses automation**

Client wants to pause rather than run or transfer.

Requirements:
- Automation disabled in n8n (not deleted)
- All data preserved in Supabase
- Client pays minimal infrastructure cost ($25-50/mo) or Joshua maintains if handoff is paused
- Clear restart conditions defined

**Option D: Client retires automation entirely**

Client doesn't want the automation to continue.

Requirements:
- Automation deleted from n8n
- All customer-facing automated flows returned to manual or removed
- Data retention per client's preference (archive and delete, or preserve archive)
- Webhooks removed from HoneyBook / source systems
- No client data remains in Joshua's infrastructure

**Option E: Joshua continues to operate automation as paid service**

Client wants to keep automations running but without full retainer. Light-touch maintenance arrangement.

Requirements:
- Formal light-touch agreement (typically Tier 1 retainer from Document 15)
- Joshua continues monitoring; Zach on-call for issues
- Monthly or quarterly fee for infrastructure + monitoring
- Clear scope: what's included, what triggers scope conversation

**Decision framework at offboarding:**

Joshua presents these options at the final review call with recommendation. Default recommendation unless other factors:
- Automations that are "set and forget" (inquiry auto-responder, confirmations) → Option A if capable, Option E if not
- Automations with ongoing complexity (multi-step nurture sequences) → Option E
- Automations barely used → Option D

---

### Section 4: Claude Project Handoff

**Purpose:** The Claude Project is the client's most valuable artifact — this section covers its specific handoff.

**Word count target:** 200-400 words.

Required content:

**What the client owns at end of engagement:**

- The Claude Project itself (lives in their Anthropic account, not Joshua's)
- All 12 documents loaded as knowledge
- Any custom instructions or preferences
- Chat history (up to their account's retention policy)

**What Joshua/team has during engagement:**

- Access to the Claude Project as a collaborator (if Claude Projects support multi-user; otherwise credentials shared via 1Password)
- Ability to update documents and knowledge
- Ability to use it for producing deliverables

**What changes at offboarding:**

1. **Access revocation:**
   - Remove Joshua from collaborator access (if multi-user)
   - Change credentials if previously shared (client rotates password)
   - Delete 1Password entry on Joshua's side

2. **Document state at handoff:**
   - All 12 documents at their latest version
   - Version history preserved
   - Any client-initiated updates incorporated before handoff

3. **Document maintenance responsibility:**
   - Shifts fully to client
   - Client may choose to engage separate consultant for maintenance
   - Document 12 refresh cadence becomes client's responsibility

**Training the client (30-60 min at offboarding call):**

Walk the client through:
- How the documents interact (dependency graph)
- Which documents drift fastest and need updating most often (Doc 02, Doc 07)
- How to ask Claude to produce content using the system
- Common pitfalls (e.g., if Doc 02 goes stale, everything downstream goes stale)

**Leave-behind materials:**

- Link to Upriver Consulting's own documentation site if public
- One-page cheat sheet of the 12 documents and their roles
- Calendar reminder templates for quarterly refresh cycles
- Contact info for emergency questions (rate-card pricing for non-retainer consultation)

---

### Section 5: Stress Offboarding (Scenario D)

**Purpose:** Special handling when engagement ends under friction.

**Word count target:** 200-400 words.

Required content:

**Common causes of stress offboarding:**

- Client cut budget unexpectedly
- Client is dissatisfied with outcomes
- Relationship mismatch surfaced late
- Client's business is struggling
- Major disagreement on strategic direction

**Principles for stress offboarding:**

1. **Don't argue the facts on exit.** Even if Joshua believes the engagement produced strong results, a stressed exit is not the moment to litigate. Facts go in the final report; exit is about clean transition, not justification.

2. **Deliver everything owed.** Every document, every deliverable, every access transfer — cleanly and on schedule. Don't withhold as negotiating leverage.

3. **Short, professional communications.** Less is more in stressed exits. Don't over-explain. Don't re-pitch. Don't try to change their mind in exit communications.

4. **Protect future possibility.** The client may return in 12 months. The client may refer someone in 6 months. Burned bridges eliminate both possibilities.

5. **Document everything for internal record.** What was delivered, what was approved, what they signed off on. Not for argument — for clarity if the relationship ever re-engages.

**Final communication template for stressed exits:**

```
Subject: Wrapping up

Hi [first name],

Wanted to confirm where we are on closing out the engagement.

Delivered:
- [List of key deliverables]
- [Confirmation of access revocation schedule]
- [Any outstanding items]

Final invoice: attached, due [date] per our agreement.

Wishing you well on what's next. If anything changes and you want to revisit, my email works.

— Joshua
```

**What not to do in stress exits:**

- Don't send a long defensive email explaining why the client's dissatisfaction is unjustified
- Don't bad-mouth the client to other clients or publicly
- Don't mishandle data or access as leverage
- Don't post case studies about the engagement without permission

---

### Section 6: Internal Team Handoff (Scenario E/F)

**Purpose:** Transitions within the Upriver team.

**Word count target:** 300-500 words.

Required content:

**Scenario E: Joshua hands work to Annmarie, Zach, or team member mid-engagement**

Common triggers:
- Joshua is scaling and delegating
- Specialization — Zach picks up all automation work; Annmarie picks up web implementation
- Capacity management

Handoff checklist:
- Joshua briefs receiving team member on the client (30-60 min call)
- Documents 01-12 status reviewed together
- Client is introduced to the team member via email (not surprise)
- Team member joins any ongoing client meetings
- Client communication channels updated (new email cc, Slack channel access)
- 1-2 week overlap period where Joshua stays involved for questions
- Formal "you're driving now" handoff at agreed date

**Client communication for Scenario E:**

```
Subject: Introducing [Team Member]

Hi [client first name],

Wanted to introduce you to [team member], who will be taking over [specific scope] for your engagement. [One sentence on why — capacity, specialization, growth].

Nothing changes about what we deliver or the timeline. [Team member] has been up to speed on your engagement and will be your primary contact for [specific scope]. I remain [oversight role / available for escalations / still in quarterly reviews, etc.].

[Team member] will reach out separately to introduce themselves and confirm communication preferences.

— Joshua
```

**Scenario F: Team member departing Upriver**

Triggers:
- Subcontractor moves on
- Team member takes full-time role elsewhere
- Mutual decision to end working relationship

Handoff checklist:
- Departing team member documents their active clients and work-in-progress (2-4 hours per client)
- Joshua reviews documentation and fills gaps
- Transition meeting with each affected client
- Credentials and access transferred or rotated
- 1Password entries transferred
- Departing team member's contact info removed from client communications
- NDA/non-solicit reminders if applicable (per subcontractor agreements)

**Client communication for Scenario F:**

Simple, not dramatic:

```
Subject: Team update

Hi [client first name],

Brief update — [team member] is moving on from Upriver at end of [month]. [Replacement] will take over [specific scope]. Same quality, same standards, same timeline.

[Replacement] will reach out next week to introduce themselves.

— Joshua
```

**Internal documentation required when team member departs:**

- Active client status for each of their clients
- Where to find all their work (Drive folders, Supabase tables, n8n workflows, Github repos)
- Any client-specific context that isn't captured elsewhere
- Key relationships and preferences for each client
- Passwords/access transferred or rotated

---

### Section 7: Post-Engagement Relationship Management

**Purpose:** How former clients become future referrals, re-engagements, or advocates.

**Word count target:** 200-300 words.

Required content:

**30 days post-end:**

Light-touch check-in email from Joshua. "How's it going? Any questions that have come up? I'm here if anything needs a quick input." No sales pitch; just relationship maintenance.

**90 days post-end:**

If client is running the system well on their own: send a relevant insight or resource. Acknowledge their progress.

**6 months post-end:**

Annual-ish check-in. May coincide with a seasonal trigger (engagement season for venues, planning season for contractors). Briefly share an industry observation or ask how specific KPIs are trending.

**12 months post-end:**

Anniversary touch. More substantive than check-in — may include an offer for a light refresh engagement (e.g., Document 05 competitive landscape refresh for $X).

**Referrals:**

- Every former client knows Joshua welcomes referrals
- Explicit ask at offboarding, gentle reinforcement annually
- Referral incentive (e.g., 10% of first-month retainer) if desired — consistent across clients
- Referred clients get a warm introduction, never a cold sale

**Re-engagement:**

- Former clients who return get onboarded with lighter ceremony (don't re-run the full kickoff kit; know each other already)
- Prior documents are updated, not rebuilt — unless meaningful time has passed
- Pricing may adjust (rate changes since original engagement)

**Case studies:**

- Ask permission before writing any case study involving a former client
- Anonymize if they prefer
- Share draft before publishing

**Public mentions:**

- Don't name clients without permission
- Don't discuss details that could identify them
- Positive mentions are generally welcomed by clients; check anyway

---

## How to Build This Document

**Step 1: Review existing engagement patterns (30 min).** What does an ending currently look like (if applicable)? What goes well, what goes poorly?

**Step 2: Define the five scenarios (30 min).** Clean, pause, transfer, stress, internal.

**Step 3: Build the standard offboarding checklist (45 min).**

**Step 4: Define automation disposition options (30 min).**

**Step 5: Claude Project handoff specifics (20 min).**

**Step 6: Stress offboarding principles (20 min).**

**Step 7: Internal team handoff (30 min).**

**Step 8: Post-engagement relationship (20 min).**

---

## Definition of Done

- [ ] All 7 sections complete
- [ ] Five scenarios distinctly defined
- [ ] Standard offboarding checklist has timing and methods for all access types
- [ ] Automation disposition options cover all realistic outcomes
- [ ] Claude Project handoff protocol documented
- [ ] Stress offboarding principles clear
- [ ] Internal team handoff covers both mid-engagement transfer and departure
- [ ] Post-engagement relationship management has specific touchpoint cadence
- [ ] Template emails drafted for key communications
- [ ] File saved and accessible

---

## Common Failure Modes

**Failure 1: Access lingers after engagement ends.** Joshua's email still has admin on client's Google Analytics 3 months later. Security risk and unprofessional. Fix: access revocation schedule is enforced on calendar; checklist is completed and signed off.

**Failure 2: Automations orphan at handoff.** Nobody's actively monitoring an automation that's still firing. Errors accumulate. Client notices weeks later. Fix: every automation has a disposition decision at offboarding; no automation continues running without a named owner.

**Failure 3: Final invoice dispute.** Scope ambiguity surfaces at exit. Client contests the final invoice. Fix: deliverables are specific; disputes addressed during engagement, not at exit.

**Failure 4: Stress exit becomes a fight.** Both sides get defensive; bridges burn. Fix: stick to the stress offboarding principles; short communications; deliver what's owed; close cleanly.

**Failure 5: Post-engagement ghosting.** Client goes silent; Joshua doesn't follow up; referral opportunity missed. Fix: 30-day / 90-day / 6-month / 12-month cadence calendared at offboarding.

**Failure 6: Team member departure creates client panic.** Client learns through grapevine or feels work is dropping. Fix: direct, calm communication; introduce replacement before removing departing member.

**Failure 7: Claude Project access remains.** Joshua can still access Claude Projects months after engagement end. Security and trust issue. Fix: Claude Project access is on the revocation checklist with specific verification step.
