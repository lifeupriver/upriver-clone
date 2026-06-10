# Client onboarding kit

**Prepared by:** Joshua Brown / Upriver Consulting
**Date:** June 2026
**Version:** 1.0

**For:** Internal operations. Defines the artifacts and sequence of the first 48 hours after contract signing with Little Friends Learning Loft.

**Companion documents:** 13 (Master Build Sequence, which orchestrates the overall engagement); 18 (Sales Document, which closes the sale that triggers this onboarding).

**Critical principle:** The first 48 hours after signing set the tone for the entire engagement. The director should feel like they made the right choice within 2 hours of signing, not 2 weeks.

---

## Section 1: Onboarding sequence overview

The goal of the first 48 hours is momentum. Every step has a time target. If I miss one, I note why and recover, rather than let the slip compound.

**Hour 0 (contract signed and deposit paid):**
- Automated confirmation from HoneyBook sent immediately
- Slack notification to me

**Hours 0-2 (my immediate response):**
- Welcome email sent personally, not automated
- Calendar invite for kickoff call sent
- Onboarding questionnaire link sent
- Access request checklist (Tier 1 only) sent

**Hours 2-24 (client completes initial setup):**
- Director completes questionnaire
- Director grants Tier 1 access: Google Business Profile, Brightwheel, Instagram, website admin
- I note the JCC ownership issues on Square and Instagram and confirm which items are blocked pending JCC transfer
- I initiate secret shopper test (inquiry via website contact form or phone, whichever is primary)
- I pull baseline local search data using my own Ahrefs account against the Little Friends Learning Loft domain

**Hours 24-48 (pre-kickoff):**
- I review questionnaire, secret shopper results, and baseline data
- I prepare kickoff call agenda with findings in hand
- Any Tier 1 access gaps are escalated to the director before the call, not surfaced for the first time on it

**Hour 48+ (kickoff):**
- Kickoff call happens
- Week 1 begins per Document 13

**Total client time in first 48 hours:** 90-120 minutes (questionnaire at roughly 45 minutes, access granting at roughly 30-45 minutes depending on JCC friction, kickoff call at 90 minutes).

**A note on this client's access complexity:** Little Friends Learning Loft operates under JCC, and several key accounts (Square, Instagram, possibly Google Workspace) are mid-transfer or held at the director level. The access request checklist below documents each item's status. I do not wait for JCC ownership transfer to proceed. I work around it in Week 1 and flag blocked items as Week 2 or Week 3 tasks.

**Why 48 hours:** Short enough to feel fast, long enough to accommodate the director's schedule. Any longer and momentum stalls. Any shorter and I'm rushing the director's attention away from children.

---

## Section 2: Welcome email template

**Timing:** Sent within 2 business hours of contract signing. Personal, not automated.

**Tone:** Warm but not effusive. Specific about what happens next. Answers the director's unspoken question: did I make the right call?

**Strip and re-read before sending:** this template contains placeholder variables. Every `{{variable}}` must be resolved. The email should read as if I typed it fresh, not as if I pasted a template.

---

**Subject:** Welcome, next steps inside

Hi {{first_name}}, [NEEDS CONFIRMATION: director's first name]

Thanks for trusting me with this. I saw the signed contract come through and wanted to send a proper note before the auto-confirmations start landing.

Three things happen in the next 48 hours.

First, I'm sending a short questionnaire in the next 30 minutes. It takes roughly 45 minutes to complete. It covers your voice, your school's history, your families, and your goals. The better your answers, the faster I can produce documents that actually sound like you and Dana and Carla and Tova, rather than a generic preschool website. If you can get through it before our kickoff call, do.

Second, I'm sending a short access checklist. It looks like a lot but most items take under 5 minutes each. Brightwheel I already know is working. Google Business Profile and Instagram are the two I need most urgently in the first 24 hours. I know Square and Instagram have some JCC ownership complexity, so I'll note which ones are blocked and we'll figure out the workaround together on the kickoff call.

Third, our kickoff call is on my calendar for {{kickoff_day}}. [NEEDS CONFIRMATION: kickoff date] Ninety minutes on Zoom. Calendar invite is coming separately. I'll walk through the full four-week timeline, confirm your priorities, and take any questions you've been saving up.

Between now and kickoff: if you have anything that gives me more context, just reply here with it. Enrollment brochures, past parent emails, any copy you've written that felt right, anything from the JCC. The more I go in knowing, the less I have to ask later.

Looking forward to it.

Joshua

---

**Notes for customization before sending:**
- Resolve `{{first_name}}` and `{{kickoff_day}}` before sending.
- If anything specific came up during the sales conversation, address it here, not later. If the director mentioned a specific frustration (returning to the classroom, the JCC complexity, inquiry response time), acknowledge it in one sentence.
- Do not send from template without editing at least the opening paragraph to reflect the actual sales conversation.

---

## Section 3: Onboarding questionnaire template

**Format:** Sent via Tally, Typeform, or Google Form. Do not use plain email. Completion rate drops significantly when the questionnaire arrives as a list of questions in an email body rather than a structured form with sections and a progress bar.

**Length target:** 30-40 questions, completable in 45 minutes.

**Framing to include at the top of the form:** "Your answers here feed every document I produce in the first four weeks. The more specific you are, the less I'll need to interrupt you with follow-up questions during the engagement."

---

**Section A: Business basics (5-7 questions)**
- Legal name and public-facing name (confirm: Little Friends Learning Loft)
- Website URL [NEEDS CONFIRMATION: website platform and URL]
- Primary contact email and phone for the school
- Physical address and whether it's publicly listed
- Year the school opened, and a short history in the director's own words
- Age groups served (Twos, Threes, Pre-K confirmed; confirm whether there are other programs)
- Hours of operation, including aftercare hours under Yael

**Section B: What you offer (5-7 questions)**
- Program descriptions in plain language: what does each room (Twos/Tova, Threes/Carla, Pre-K/Dana) actually do differently?
- What you do not offer (critical for AI accuracy downstream: no overnight care, no drop-in, no infant program, etc.) [NEEDS CONFIRMATION: full list of what the school explicitly does not do]
- Tuition range or structure, even if approximate [NEEDS CONFIRMATION]
- Top three reasons families choose Little Friends Learning Loft over alternatives
- Anything families ask for that you don't currently offer

**Section C: Families (5-7 questions)**
- Who is your ideal family? Demographics and what's going on in their life when they start looking for a preschool.
- How do families typically find you (word of mouth, Google, JCC connection, etc.)
- What families say when they refer you to another parent (exact language if possible)
- Most common reasons a family chooses a competitor instead
- What families praise most in Brightwheel daily reports or in-person

**Section D: Voice and brand (5-7 questions)**
- Three words that describe how the school sounds when it's at its best
- Three words you would never want used to describe it
- Any businesses or schools whose communication style you admire
- Specific phrases or words you use often in parent communication; phrases you would never use
- Please attach: the last 5-10 parent-facing emails or Brightwheel messages you sent, and 3 recent Instagram posts you felt good about

**Section E: Enrollment and inquiry process (5-7 questions)**
- Walk me through your most recent successful enrollment, from first inquiry to first day
- What does your current inquiry response process look like? (Who responds, how fast, which channel)
- Your target response time vs. your actual response time
- Your inquiry-to-enrollment conversion rate, even as a rough estimate (how many inquiries turn into a first visit, how many first visits turn into enrollments)
- Where do families most often drop out of the enrollment funnel
- Which tools are currently part of the enrollment process (Brightwheel, Google Forms, Sign-Up Genius, phone, email, or a combination) [NEEDS CONFIRMATION: current inquiry flow in detail]

**Section F: Competition (3-5 questions)**
- Name your top 3-5 direct competitors (other preschools or daycares families consider alongside you)
- What each competitor does better than Little Friends Learning Loft (be honest)
- What Little Friends Learning Loft does better than each
- Any competitor positioning you want to explicitly avoid

**Section G: Goals and constraints (3-5 questions)**
- Primary outcome you want from this engagement (confirmed from sales: return to classroom 3 days a week, with confidence the office runs without constant oversight)
- Timeline pressure: is there a specific enrollment cycle or deadline driving urgency?
- Team capacity for reviewing documents and giving feedback (hours per week realistically)
- Budget constraints that affect what I can build or recommend (e.g., tool subscriptions, paid ads, outside contractors)
- Red lines: anything you will not do or agree to

---

**If the questionnaire is less than 70% complete at kickoff:** I use the first 30 minutes of the kickoff call to fill gaps verbally. This works but pushes Week 1 drafting by 2-3 days. I note which sections were incomplete and why.

---

## Section 4: Access request checklist

**Format:** Shared as an editable Google Doc or Notion page. The director checks items off as they complete them. I send Tier 1 only in the welcome email. Tiers 2 and 3 come up during the kickoff call.

**Note on this client:** Several accounts have JCC ownership complexity. I document the current status of each item so I can work around blocked ones rather than stall. Items marked "ownership to JCC pending" or "needs JCC access" are not blocking Week 1 work unless explicitly noted.

---

**Tier 1: Critical for Week 1 (grant in first 24 hours)**

| Item | Why needed | Current status | How to grant | Time estimate |
|---|---|---|---|---|
| Google Business Profile | Local search audit and optimization | Claimed once; verify current owner | Add my Google account (joshua@joshuabrownphotography.com) as manager | 5 min |
| Brightwheel | Understand billing and daily report flow; audit inquiry handling | Access working | Add me as an admin-level team member | 5 min |
| Instagram | Social content audit; document current voice | Director login only; JCC ownership pending | Add me as an admin via Instagram's "Add people" setting in the business account | 10 min (or share read-only access via later step if ownership is blocked) |
| Website admin | Page-by-page content audit; understand current contact/inquiry flow | [NEEDS CONFIRMATION: website platform and whether director has admin access] | Add user with editor or admin role | 5 min |
| Photo and video storage | Content Library inventory; what assets exist | [NEEDS CONFIRMATION: where photos are stored, likely Google Drive via JCC] | Share the folder with my Google account | 5 min |

---

**Tier 2: Critical for Weeks 2-3 (grant by end of Week 1 or at kickoff)**

| Item | Why needed | Current status | How to grant | Time estimate |
|---|---|---|---|---|
| Square | Billing and sales funnel data; understand current payment flow | Held by director; ownership transfer to JCC pending | Add me as a team member with reports access | 5 min (or defer if JCC transfer is blocking) |
| Google Workspace / Google account | Email templates, Drive access, Google Forms audit | Via JCC | Add my account as a guest or collaborator on relevant Drive folders | 5 min |
| Google Search Console | Verify domain and pull search query data | [NEEDS CONFIRMATION: whether GSC is set up; likely not yet] | Add my Google account as delegated owner | 3 min |
| Google Analytics | Traffic baseline | [NEEDS CONFIRMATION: whether GA is installed on the current site] | Add my account as a viewer or editor | 3 min |
| Mailchimp | Audit existing lists and templates before deciding whether to retire | Barely used; retirement candidate | Add me as a manager | 5 min |

---

**Tier 3: Needed later or during automation phase (grant by Week 4)**

| Item | Why needed | Current status | How to grant | Time estimate |
|---|---|---|---|---|
| Sign-Up Genius / Google Forms | Understand current event signup flow before retiring into new site | Retire into new site | Read-only access or share the form links | 5 min |
| Domain DNS | Required if email deliverability setup is in scope | [NEEDS CONFIRMATION: who holds DNS, likely the domain registrar via JCC] | One-time DNS record entry; I'll provide the records | 10 min |

---

**Explicitly not requested:**
- Gusto (payroll). Linda is setting this up and it is out of scope for this engagement. I do not need payroll access.
- Financial account access (never)
- Customer payment data
- Passwords for any service where I can be added as a user with a role (I will always use invite, never shared passwords)
- Access to personal accounts; only school business accounts

---

**Security notes for the director:**
- Every access request uses invite or user-role mechanics. I will never ask for a shared password unless there is genuinely no other way and I flag it explicitly.
- Access can be revoked at any time without affecting the engagement.
- At the end of the engagement, I will walk through access removal or confirm a retainer transition.
- Shared credentials go into 1Password. Nothing in email. Nothing in plaintext.

---

**Known friction points for this client:**

**Square and Instagram JCC ownership transfer.** Both accounts are currently held at the director level, with ownership transfer to JCC pending. I do not wait for this to proceed. For Instagram, I audit what I can from the director's login in the first week. For Square, I request reports-level access via the director's account and note the transfer timeline separately.

**Google infrastructure via JCC.** Google Workspace and Google Business Profile operate through JCC. This means access grants may require a JCC administrator. I identify the JCC point-of-contact during the kickoff call and confirm who at JCC can add me to Google accounts that are managed centrally.

**Website platform unknown.** I do not know the current website platform. If the director does not have admin access, I request it from the person who does before the end of Week 1. The website audit happens in Week 4, so this is not blocking early drafting.

**Brightwheel as a non-standard CRM.** Brightwheel is the primary tool for billing and daily reports, not a traditional CRM. I treat it as the closest analog to a CRM for this client and audit the inquiry-handling workflow within it during Week 1 rather than a separate CRM.

---

## Section 5: Kickoff call agenda

**Format:** 90-minute Zoom. Recorded with the director's consent. Agenda shared in the calendar invite and on screen during the call.

---

**0-5 min: Welcome and framing**
- Thank the director for signing and for getting through the questionnaire
- Confirm the engagement scope as agreed during the sales process
- Confirm the four-week timeline
- Set the tone: this will be organized but intensive; tell me when something is unclear

**5-15 min: The director walks through the school**
- Even with the questionnaire, I let the director tell the story verbally
- I listen for things the form didn't catch: what they're proud of, where they feel friction, how they talk about Tova, Carla, Dana, and Yael when not in writing mode
- I note emotional language; it feeds the Brand Voice Guide

**15-30 min: I walk through the four-week plan**
- Share screen with Document 13 summary
- Explain each document's purpose and how they connect
- Confirm the primary outcome: the director back in the classroom 3 days a week, office running without constant oversight
- Address "what if" questions about timeline

**30-50 min: Review questionnaire responses**
- I have pre-read everything; this is clarification, not first exposure
- Deep-dive on Section D (voice): who is Dana's voice vs. Tova's vs. the school's overall voice? Is there a unified voice I should write to?
- Deep-dive on Section E (inquiry process): walk me through what happens when a family submits the contact form right now, step by step
- Deep-dive on Section F (competitors): confirm the top 3-5 for Document 05 work

**50-65 min: Access and logistics**
- Walk through the Tier 1 checklist: what's done, what's blocked, what needs JCC
- Identify who at JCC can grant access to Google Workspace and Business Profile if the director cannot do it herself
- Identify the timeline on Square and Instagram JCC ownership transfer so I know how to plan around it
- Assign each outstanding item to either me or the director with a due date

**65-80 min: Scope, priorities, and decisions**
- Confirm which automation I build first in Phase 1 (inquiry responder is the most likely candidate given the goal of reducing the director's operational load)
- Confirm whether content production (Instagram, email) is in scope during the foundation phase or deferred
- Confirm retainer intent post-foundation

**80-90 min: Questions and close**
- Open floor for the director's questions
- Confirm next touchpoints: Day 4 fact-check email, end-of-Week-1 checkpoint
- Confirm the best way to reach me for urgent items during the engagement
- Recording available by end of day

---

**What I do immediately after the kickoff call:**
- Send a summary email within 2 hours recapping decisions made, access items outstanding, and next steps with owners
- Update internal project tracker
- Begin drafting Document 01 (Brand Voice Guide) and Document 02 (Business Facts Reference) starting Day 2

**What is not on the kickoff agenda:**
- Detailed competitor analysis (Document 05, Week 2)
- Website audit walkthrough (Document 11, Week 4)
- Automation technical detail (that comes when the automation spec is in scope)
- Pricing or payment discussions (settled before signing; redirect if raised)

---

## Section 6: Week-by-week "what to expect" email series

All four emails go on a scheduled send at the start of kickoff. They do not get written on the fly. If they are not scheduled, they do not happen.

**Tone:** Short. Scannable. Specific about what I am doing and what I need from the director. Never effusive.

---

**Email 1: Sent end of Week 0, before Week 1 starts**

Subject: What to expect this week

Hi {{first_name}},

Quick preview. This week I am drafting the Brand Voice Guide and the Business Facts Reference, the two documents everything else is built on. The Brand Voice Guide is especially important for a school where the director, the lead teachers, and the school itself each have a slightly different voice. I am going to try to capture the unified version. If it does not sound like you, tell me.

What you will see from me:
- Day 3 or 4: drafts of both documents, with specific sections flagged where I need your input
- Day 4 or 5: about 48 hours of review time on your side

What I need from you:
- Turn around the review within 48 hours. Even faster is better.
- Flag anything that sounds wrong. Do not be diplomatic. Wrong voice on Document 01 compounds into every document after it.

Not much else to do on your side this week. Go be in the classroom.

Joshua

---

**Email 2: Start of Week 2**

Subject: Week 2 update

Hi {{first_name}},

Foundation documents are in place. Good work getting through the reviews last week.

This week I am working on the Sales Process Map, Content Library, Competitor Landscape Brief, and the SEO Strategy. These are more research-heavy for me and less hands-on for you.

What you will see:
- Secret shopper results (I ran the test during Week 0; I will share my findings mid-week with specific observations about what a new family experiences when they try to reach Little Friends Learning Loft)
- End of week: four new documents ready for review

What I need:
- A 30-minute window on Thursday or Friday for a brief walkthrough
- If there are any access items still outstanding from the Tier 1 or Tier 2 checklist, please get those in before Thursday

Joshua

---

**Email 3: Start of Week 3**

Subject: Week 3 update

Hi {{first_name}},

This week is the hands-on stretch: the FAQ Bank, the email templates, and the Social Media Playbook.

These three documents contain the actual language that will go out to families from automations and scheduled posts. If the voice is wrong here, it is wrong everywhere downstream. This week I need more of your attention than Week 2.

What you will see: drafts of all three by Thursday.

What I need: 60-90 minutes of review time spread across the week. Read them the way a new family would read them. If anything sounds off, flag it.

Joshua

---

**Email 4: Start of Week 4**

Subject: Week 4 update

Hi {{first_name}},

Last week of the foundation. This week: the website audit, the automation specification for your first system (most likely the inquiry responder), and the measurement framework.

At the end of this week we have a 60-minute call to walk through the website recommendations and decide scope on the automation build. Calendar invite coming.

After this week, we move into retainer or a 30-day check-in depending on what we decided at kickoff. Either way, the foundation is done and you have 12 documents that give anyone running the office a clear picture of how things work.

Joshua

---

## Section 7: Internal tracking and handoff

**Project tracker setup (done at or immediately after kickoff):**
- New client folder in Google Drive under the Upriver Consulting client directory
- New Claude Project created for Little Friends Learning Loft, with the questionnaire responses, Document 13, and this onboarding kit loaded
- Tracking document noting: kickoff date, access checklist status per item (granted / pending / blocked), questionnaire completion percentage, document status per Document 01-12, weekly checkpoint dates

**Status reporting:**
- Internal: self-review of the tracker each Monday morning. If something is blocked, it gets surfaced before the client notices.
- Client-facing: the four week-by-week emails above are the primary touchpoints. No surprises.
- If Zach is involved in the automation phase: a Slack channel (#client-lfll or similar) is created when he joins, not before.

**What gets saved:**
- Signed contract
- Completed questionnaire responses (exported from Tally or Typeform as PDF)
- Kickoff call recording and transcript (stored in client Drive folder)
- Access credentials in the 1Password vault under "Little Friends Learning Loft"
- All email correspondence related to access granting and JCC transfer status

**Specific items to track for this client:**
- JCC ownership transfer status for Square and Instagram (date initiated, date resolved)
- Google Business Profile verification status (claimed once; confirm current verified owner)
- Gusto setup status (Linda is handling; not my task, but worth noting for Week 3 if it affects billing flows I am documenting)

**Handoff to Document 13:**
Once the kickoff call is complete and Tier 1 access is granted (or blocked items are documented), the engagement enters Week 1 per Document 13 Section 3. This kit's job is finished. The 12-document production process takes over.

**Kit review cadence:** After every third engagement, review this spec and the artifacts it produces. The JCC-complexity pattern at Little Friends Learning Loft may recur with other institutional clients. If it does, add a dedicated "institutional access" section to the access checklist template.
