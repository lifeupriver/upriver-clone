# Document Production Spec 14: Client Onboarding Kit

## What This Spec Is

This spec defines the artifacts a client receives in the first 48 hours after signing an engagement contract. The onboarding window is where momentum is most easily lost — clients are still emotionally warm from deciding to hire, but practical friction (unclear next steps, access requests they don't know how to fulfill, long gaps between signing and feeling "in progress") kills that momentum fast.

The kit is not a single document — it's a set of artifacts produced consistently for every client: welcome email, access request checklist, onboarding questionnaire, kickoff call agenda, and week-by-week "what to expect" email. This spec defines how each artifact is produced, what it contains, and when it gets sent.

The goal is to make the first 48 hours feel inevitable. Client signs. Within 2 business hours, welcome email arrives. Within 24 hours, questionnaire is in progress and access requests are being fulfilled. Within 48 hours, kickoff call is scheduled and secret shopper test has fired. Momentum never stalls.

---

## Quick Reference

| Attribute | Value |
|---|---|
| **Document number** | 14 of 18 |
| **Priority** | High — required before onboarding any new client |
| **Total length target** | 2,500-4,000 words (contains multiple artifact templates) |
| **Total time to produce** | 3-4 hours |
| **Joshua's time** | 2-3 hours |
| **Claude's time** | 45 minutes |
| **Client's time** | Zero (this spec is internal; the artifacts it produces go to clients) |
| **Delivery format** | Markdown spec file plus a templates folder with each artifact ready to use |
| **File naming convention** | Spec: `14-client-onboarding-kit-spec.md`. Artifacts: `/onboarding-kit/welcome-email.md`, `/onboarding-kit/access-checklist.md`, etc. |
| **Foundation for** | Every new client engagement |

---

## When This Document Gets Built

**Once, at business setup.** Updated annually or when engagement structure changes materially.

**Triggers:** Documents 01-13 complete. First foundation engagement ready to sell.

**Blocks:** Smooth Week 0 of any new engagement.

---

## Section-by-Section Template

### Header Block

```markdown
# Client Onboarding Kit Production Spec

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** [Month Year]
**Version:** 1.0

**For:** Internal operations. Defines the artifacts and sequence of the first 48 hours after contract signing.

**Companion documents:** 13 (Master Build Sequence — orchestrates the overall engagement); 18 (Sales Document — closes the sale that triggers this onboarding).

**Critical principle:** The first 48 hours after signing set the tone for the entire engagement. Clients should feel like they made the right choice within 2 hours of signing, not 2 weeks.
```

---

### Section 1: Onboarding Sequence Overview

**Purpose:** The 48-hour timeline.

**Word count target:** 200-300 words.

Required content:

**Hour 0 (contract signed + deposit paid):**
- Automated confirmation from HoneyBook sent immediately
- Slack notification to Joshua

**Hour 0-2 (Joshua's immediate response):**
- Welcome email sent personally (not automated)
- Calendar invite for kickoff call sent
- Onboarding questionnaire link sent
- Access request checklist sent

**Hour 2-24 (client completes initial setup):**
- Client completes questionnaire
- Client grants initial access (Ahrefs, CRM, GBP, social most critical)
- Joshua initiates secret shopper test
- Joshua pulls baseline Ahrefs data

**Hour 24-48 (pre-kickoff):**
- Joshua reviews questionnaire + secret shopper + baseline data
- Joshua prepares kickoff call agenda
- Any access gaps identified and escalated to client

**Hour 48+ (kickoff):**
- Kickoff call happens
- Week 1 begins per Document 13

**Total client time in first 48 hours:** 90-120 minutes (questionnaire + access granting + kickoff call)

**Why 48 hours specifically:**
Short enough to feel fast, long enough to accommodate client time zones and schedules. Any longer and momentum stalls; any shorter and we're rushing the client's attention.

---

### Section 2: Welcome Email Template

**Purpose:** The first personal message after signing.

**Word count target:** 300-500 words including template.

Required content:

**Timing:** Sent within 2 business hours of contract signing. Personal, not automated.

**Tone rules:**
- First-person singular (Joshua writing)
- Warm but not effusive
- Specific about what happens next
- Answers the client's unspoken question: "did I make the right call?"

**Template:**

```
Subject: Welcome — here's what happens next

Hi {{first_name}},

Thanks for trusting me with this. Just saw the signed contract come through and wanted to send a proper note before the auto-confirmations start cluttering your inbox.

Three things happen in the next 48 hours:

1. You'll get a short questionnaire from me in the next 30 minutes. Takes about 45 minutes to fill out. It covers your voice, your business, your customers, and your goals. Answer it before our kickoff call if you can — the better your answers, the better the documents I produce for you.

2. I'll send a list of access I need: Ahrefs, your CRM, Google Business Profile, social accounts, website admin, and a few others. This looks like more than it is. Most of it is read-only and most of it takes under 5 minutes per item. Granting access in the first 48 hours is the single biggest thing you can do to keep the engagement on schedule.

3. Kickoff call is on my calendar for {{kickoff_day}}. 90 minutes. Calendar invite coming separately. I'll walk you through the full timeline, confirm priorities, and answer any questions you've stored up.

Between now and kickoff: if you have documents, brand files, past customer emails, pricing sheets, anything that gives me more context, just reply to this email with them. The more I know going in, the less I have to ask later.

Looking forward to Monday.

— Joshua
```

**Notes for customization:**
- Adjust `{{kickoff_day}}` based on when the kickoff is scheduled (often "Monday" or a specific date)
- If the client asked questions during the sales process that weren't fully answered, address them here
- Never send this as a mass template — always personalize based on what was discussed during sales

---

### Section 3: Onboarding Questionnaire Template

**Purpose:** The structured information gather that feeds every Document 01-12 draft.

**Word count target:** 400-700 words describing the structure; the actual questionnaire is a separate file.

Required content:

**Format:** Sent via Typeform, Tally, Google Form, or Content Snare. Avoid plain email — lower completion rate.

**Length target:** 30-40 questions, completable in 45 minutes.

**Section breakdown:**

**Section A: Business basics (5-7 questions)**
- Legal and public-facing name
- Website, primary email, phone, physical address
- Year established, brief history
- Service area
- Hours of operation

**Section B: What you sell (5-7 questions)**
- Primary offerings (what you sell, to whom, for what price range)
- What you DON'T offer (critical for AI accuracy)
- Your top three differentiators
- Things customers commonly ask for that you don't do

**Section C: Customers (5-7 questions)**
- Who your ideal customer is (demographics, psychographics, buying triggers)
- How customers typically find you
- Most common reasons customers choose you over alternatives
- Most common reasons you lose to competitors
- What customers praise you for most

**Section D: Voice and brand (5-7 questions)**
- Three words that describe your brand voice
- Three words you'd never want used to describe you
- Examples of businesses whose voice you admire
- Specific phrases or words you use; phrases you'd never use
- Sample attachments: past 10 customer emails, 3 social posts, website copy you feel represents the voice well

**Section E: Sales process (5-7 questions)**
- Walk me through your best recent customer, from first contact to signed
- Your response time target vs. reality
- Your conversion rate (inquiries → customers)
- Where customers most often drop out of the funnel
- Existing CRM, scheduling tools, email tools in use

**Section F: Competition (3-5 questions)**
- Your top 3-5 direct competitors by name
- What each competitor does better than you (honest)
- What you do better than each competitor
- Any competitor positioning you want to explicitly avoid

**Section G: Goals and constraints (3-5 questions)**
- Primary outcome you want from this engagement
- Timeline pressure (when do you need to see results)
- Budget constraints that affect what we can do
- Team capacity for ongoing content production (hours per week)
- Red lines — things you won't do or agree to

**Completion incentive:**
Clients who complete the full questionnaire before kickoff get an extra 2-3 weeks of document quality because Joshua has more context going into drafting. Communicate this framing in the welcome email.

**What happens if incomplete:**
If questionnaire is less than 70% complete at kickoff, Joshua uses the kickoff call itself to fill gaps verbally. This works but stretches Week 1 by 2-3 days.

---

### Section 4: Access Request Checklist

**Purpose:** The list of accounts Joshua needs access to, organized by priority and simplicity.

**Word count target:** 300-500 words.

Required content:

**Format:** Single checklist document shared as editable Google Doc or Notion page so client can check items off as they complete them.

**Tier 1 — Critical for Week 1 (grant in first 24 hours):**

| Item | Why needed | How to grant | Time estimate |
|---|---|---|---|
| Ahrefs for your domain | SEO baseline | Share email to invite as user; role: Viewer | 3 min |
| Google Business Profile | Local SEO audit | Transfer admin access or add manager | 5 min |
| Google Search Console | Verify and pull query data | Add email as owner or delegated user | 3 min |
| Website admin | Page-by-page audit; content updates | Add user role (editor minimum; admin preferred) | 5 min |
| Photo/video storage | Content Library inventory | Share Cloudinary/Drive/Dropbox folder | 5 min |

**Tier 2 — Critical for Week 2-3:**

| Item | Why needed | How to grant | Time estimate |
|---|---|---|---|
| CRM (HoneyBook, etc.) | Sales funnel data | Add as team member; role: admin | 5 min |
| Email platform | Template review | Add as user | 5 min |
| Instagram, Facebook, Pinterest | Social audit | Add business manager access or share login via 1Password | 10 min |
| Google Analytics | Traffic baseline | Add email as user | 3 min |
| Scheduling tool (Cal.com) | Tour confirmation automation | Add as admin | 5 min |

**Tier 3 — Needed later (grant by Week 4):**

| Item | Why needed | How to grant | Time estimate |
|---|---|---|---|
| Anthropic console (if client has their own API key) | Automation building | Share API key or add team member | 5 min |
| n8n (if client already has) | Automation building | Add user | 5 min |
| Domain DNS (for email setup) | Resend domain verification | One-time DNS records | 10 min |

**What's NOT being requested:**
- Financial account access (never)
- Customer credit card data (never)
- Passwords for services where role-based access is available (always use invite, never share passwords)
- Access to personal accounts (only business accounts)

**Security notes for the client:**
- Every access request uses invite/user-role mechanics where possible, not shared passwords
- Access can be revoked at any time without affecting the engagement
- At the end of the engagement, access is voluntarily removed unless continuing in retainer
- Joshua uses 1Password for any shared credentials; nothing stored in email or plaintext

**Common friction points:**
- Client doesn't have Ahrefs; acceptable — Joshua uses his own account to audit client's domain
- Client has Squarespace but doesn't know how to add a user; include 30-second loom video in the checklist
- Client has old social accounts where original admin is unreachable; note the constraint, adapt audit scope

---

### Section 5: Kickoff Call Agenda

**Purpose:** The structured 90-minute kickoff call that starts Week 1.

**Word count target:** 300-500 words.

Required content:

**Format:** 90-minute Zoom, Meet, or video call. Recorded (client consent). Agenda sent in calendar invite; shared on screen during call.

**Timing structure:**

**0-5 min: Welcome and framing**
- Thank client for signing
- Confirm the engagement scope as agreed in the sales process
- Confirm the 4-week timeline (or variant)
- Set the tone: "this will be intense but organized; tell me when you're lost"

**5-15 min: Client walks through their business**
- Even though questionnaire was filled out, let client tell the story verbally
- Listen for gaps the questionnaire didn't catch
- Note emotional language about the business — customers, staff, challenges

**15-30 min: Joshua walks the 4-week plan**
- Share screen with Document 13 summary
- Explain each document's purpose and how they connect
- Confirm deliverable expectations at each weekly checkpoint
- Address "what if X happens" questions

**30-50 min: Review questionnaire responses**
- Joshua has pre-read; now asks clarifying questions on specific answers
- Deep-dive on Section D (voice and brand)
- Deep-dive on Section E (sales process) — set up for secret shopper discussion
- Deep-dive on Section F (competitors) — confirm top 3-5 for Doc 05 work

**50-65 min: Access and logistics**
- Walk through access request checklist
- Confirm Tier 1 access granted or in progress
- Identify any friction points (platforms client doesn't know how to grant access to)
- Assign Joshua or client for each outstanding item

**65-80 min: Scope, forks, and decisions**
- Confirm any Document 13 Section 5 forks the client wants to make upfront
- Confirm Phase 1 automation preference (inquiry responder + which follow-up sequence)
- Confirm whether content production is in-scope for foundation
- Confirm retainer intent (continue, pause, evaluate)

**80-90 min: Q&A, next steps, send-off**
- Open floor for client questions
- Next touchpoints: Day 4 fact-check email, end-of-week-1 checkpoint email
- Joshua's direct contact for urgent items
- Recording available by end of day

**What Joshua does immediately after kickoff:**
- Send summary email within 2 hours recapping decisions and next steps
- Update internal project tracker
- Begin Document 01-02 drafting Day 2

**What's NOT on the kickoff agenda:**
- Detailed Document 05 competitor review (happens in Week 2)
- Website audit walkthrough (happens in Week 4)
- Automation technical detail (happens when Zach joins)
- Pricing discussions (already settled; redirect if raised)

---

### Section 6: Week-by-Week "What to Expect" Email Series

**Purpose:** Short emails at start of each week managing client expectations.

**Word count target:** 300-500 words including all four email templates.

Required content:

**Email 1 — Sent end of Week 0, before Week 1 starts:**

```
Subject: What to expect this week

Hi {{first_name}},

Quick preview. This week I'm drafting your Brand Voice Guide and Business Facts Reference — the two documents everything else is built on.

What you'll see from me:
- Day 3 or 4: drafts for both documents, flagged where I need your input
- Day 4 or 5: about 48 hours of review time on your side

What I need from you:
- Turn around the review within 48 hours if you can. Even faster is better.
- Flag anything that sounds off-voice or factually wrong. Don't be diplomatic.

Not much else to do on your side this week. Focus is on getting the foundation right.

— Joshua
```

**Email 2 — Start of Week 2:**

```
Subject: Week 2 — what we're doing

Hi {{first_name}},

Foundation is in place. Good work last week.

This week: Sales Process Map, Content Library, Competitor Landscape Brief, and SEO Strategy. More documents but less hands-on for you.

What you'll see:
- Secret shopper results (I already ran this; I'll share findings mid-week)
- End of week: 4 new documents ready for review

What I need:
- 30-minute window for a quick walkthrough on Thursday or Friday
- Access to anything we haven't yet connected (I'll follow up separately if needed)

— Joshua
```

**Email 3 — Start of Week 3:**

```
Subject: Week 3 — content and channels

Hi {{first_name}},

We're in the hands-on stretch. This week: FAQ Bank, Email Templates, Social Media Playbook.

These three documents are where I most need you to pay attention. They contain the actual language that will go out to your customers from automations. If voice is wrong here, it's wrong everywhere downstream.

Review time this week: 60-90 minutes ideally. Spread across the week or batched however you want.

— Joshua
```

**Email 4 — Start of Week 4:**

```
Subject: Week 4 — the execution layer

Hi {{first_name}},

Last week of the foundation. This week: website audit, automation spec for your first system, and the measurement framework that tells us whether any of this is working.

End of this week we're having a 60-minute call to walk through the website recommendations and decide scope on the automation build. Calendar invite coming.

After this week, we transition to retainer if you're continuing (or to a 30-day check-in if you're pausing).

— Joshua
```

**Tone consistency:**
- All four emails follow Brand Voice Guide (first-person, no em dashes, no banned phrases)
- Short paragraphs; scannable
- Specific about what will happen and what's needed
- Never effusive or salesy

---

### Section 7: Internal Tracking and Handoff

**Purpose:** How the onboarding kit plugs into internal operations.

**Word count target:** 200-300 words.

Required content:

**Project tracker setup (done at kickoff):**
- New project folder in Google Drive / Notion / whatever system Joshua uses
- New Claude Project created for the client with spec documents loaded
- Tracking doc noting key dates, access status, questionnaire completion %, document status

**Status reporting:**
- Internal daily standup with self (or with Zach/team) reviewing what's blocked
- Client-facing weekly summary email (Section 6 above)
- Slack channel for the client (#client-[name]) if Zach is involved

**What gets saved:**
- Signed contract
- Completed questionnaire response
- Kickoff call recording and transcript
- Access credentials in 1Password vault
- All email correspondence

**Handoff to Document 13 (Master Build Sequence):**
Once the kickoff call is complete and access is granted, the engagement enters Week 1 per Document 13 Section 3. This kit's job is done; the 12-document production process takes over.

---

## How to Build This Document

**Step 1: Review existing onboarding artifacts (30 min).** Joshua's current welcome email, questionnaire, and any existing kit pieces.

**Step 2: Audit against what actually went well and poorly in past engagements (30 min).** Where did momentum stall? What access took longer than expected? What was missing from the welcome email?

**Step 3: Draft welcome email template (30 min).** Voice-aligned, specific.

**Step 4: Build questionnaire structure (45 min).** 30-40 questions across 7 sections.

**Step 5: Build access request checklist (30 min).** Tiered by urgency; specific on how to grant.

**Step 6: Build kickoff call agenda (30 min).** 90-minute structure.

**Step 7: Draft the 4 week-by-week emails (30 min).**

**Step 8: Document internal tracking setup (15 min).**

**Step 9: Test the full kit on next new client (variable time).** First real run is the real test.

---

## Definition of Done

- [ ] All 7 sections complete
- [ ] Welcome email template drafted and voice-aligned
- [ ] Questionnaire structure defined with all 7 sections and question counts
- [ ] Access request checklist has all Tier 1/2/3 items with "how to grant" instructions
- [ ] Kickoff call agenda has 90-minute structure with time blocks
- [ ] Week-by-week email templates drafted for Weeks 1-4
- [ ] Internal tracking setup documented
- [ ] Individual artifact files produced in `/onboarding-kit/` folder
- [ ] Tested on at least one real engagement; iteration notes captured
- [ ] File saved and accessible to team

---

## Common Failure Modes

**Failure 1: Welcome email is generic.** Sounds templated from sentence one. Client senses it. Fix: always personalize based on sales conversation notes; never send from template without editing.

**Failure 2: Questionnaire is too long.** 60+ questions; client abandons at question 20. Fix: 30-40 questions max; test completion time on a friend.

**Failure 3: Access request checklist overwhelms.** All tiers shown at once; client feels insurmountable list. Fix: show Tier 1 in the initial email; Tier 2 and 3 come up in kickoff call.

**Failure 4: Kickoff call runs long.** 90 minutes turns into 2 hours; client loses energy for the rest of Week 1. Fix: hard-stop at 90 minutes; followup email covers anything unfinished.

**Failure 5: Week-by-week emails stop after Week 1.** Started strong, then drifted. Client feels abandonment. Fix: calendar all four emails at kickoff; set them as scheduled sends.

**Failure 6: Tracking doesn't stay current.** Project tracker created, never updated. When something slips, nobody knows. Fix: weekly self-review of tracker (Monday mornings) alongside weekly email to client.

**Failure 7: No feedback loop on the kit itself.** Kit stays static as engagement patterns evolve. Fix: after every 3rd engagement, revisit this spec and the artifacts it produces.
