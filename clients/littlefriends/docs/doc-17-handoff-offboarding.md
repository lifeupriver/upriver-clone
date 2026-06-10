# Handoff and offboarding spec

**Prepared by:** Joshua Brown / Upriver Consulting  
**Date:** June 2026  
**Version:** 1.0

**For:** Internal operations. Covers six scenarios: client engagement ending cleanly, client engagement pausing and reconvening, client-initiated transfer to internal team, client engagement ending under stress, team member handoff mid-engagement, and team member departure.

**Companion documents:** 13 (Master build sequence); 15 (Retainer playbook, where continuation decisions are made).

**Critical principle:** The end of an engagement matters as much as the start. Endings that feel clean preserve the relationship; endings that feel loose damage it. A damaged relationship eliminates referrals and future re-engagement, which are the two highest-ROI client types.

**Client context for Little Friends Loft:** Rebecca (the director) currently holds the credentials for Square, Instagram, and Google on a sticky note or in her head. The official handoff target is JCC the organization, not Rebecca personally. Rotating all credentials to JCC ownership is the primary task of this offboarding, independent of which scenario applies. That ownership gap was flagged during the engagement and this spec exists partly to resolve it cleanly.

---

## Section 1: Scenario types

This spec covers six scenarios. Each shares a common core checklist covering access, documentation, tools, data, and relationships. The timing and tone differ.

**Scenario A: Planned end of engagement**

The most likely outcome for Little Friends Loft if the engagement winds down under normal conditions. The program has captured value from the new digital presence and does not need ongoing retainer. Common causes: strong internal capacity to maintain the operating system; a change in the JCC's budget or strategic priorities; end of a contract term with no extension; or enrollment is stable and no further build-out is warranted.

**Scenario B: Pause and reconvene**

Little Friends Loft does not want to end entirely but needs to pause for operational reasons (school-year calendar, JCC budget cycle, transition in leadership). The retainer pauses for 60 to 180 days. Access stays in place. No active work is produced during the pause. A clear restart date or trigger condition is agreed before the pause begins.

**Scenario C: Client-initiated transfer to internal team**

The JCC hires an internal marketing or operations person who will take ownership of the new website, automations, and documents. This requires structured knowledge transfer. The internal person needs to understand how Vercel, Supabase, and Cloudinary interact, what each automation does, and how to update the 12 documents going forward.

**Scenario D: Engagement ending under stress**

Budget cut unexpectedly by JCC leadership, a relationship mismatch surfaced late, or the program's enrollment situation changed in a way that deprioritized this work. Handoff happens faster and with more friction. The goal is a clean exit regardless of cause. A clean exit preserves any future possibility.

**Scenario E: Team member handoff (mid-engagement)**

I am transitioning work to Annmarie, Zach, or Megan during a live engagement. Little Friends Loft continues as a client; internal ownership shifts. Rebecca and the JCC should experience no disruption.

**Scenario F: Team member departure**

A team member (Zach, Annmarie, a subcontractor) is leaving Upriver. Their client-facing and internal work on the Little Friends Loft engagement needs to transfer cleanly.

Each scenario has a different emphasis but shares the same core checklist.

---

## Section 2: Client offboarding, standard checklist

This checklist applies regardless of scenario. Scenario D (stress) adds the constraints in Section 5.

### Pre-offboarding (2 to 4 weeks before end)

- Confirm end date and reason in writing with Rebecca and with the relevant JCC contact. JCC is the organizational owner, so I confirm with the org, not only the director.
- Produce the offboarding summary document (see deliverables below).
- Schedule a final review call (60 minutes).
- Begin access revocation planning. The sticky-note credential situation for this client means I cannot assume any account can be revoked instantly. Before the end date, I coordinate with Rebecca and JCC to confirm who holds what and where credentials currently live.

### Final deliverables (last 2 weeks)

1. **Current-state report.** Where KPIs landed vs. baseline. What worked, what did not. For Little Friends Loft specifically: enrollment inquiry volume before and after the new site; any tracked change in Google Business Profile visibility; any change in Brightwheel billing workflow efficiency.

2. **Ownership document.** What the client has, what is theirs, and what persists after the engagement ends. For this client: confirms that Vercel, Supabase, and Cloudinary accounts have transferred to JCC ownership.

3. **Source document export.** All 12 documents at their latest version, delivered in the format Rebecca and JCC prefer (PDF, Google Docs, or Markdown).

4. **Claude Project transfer.** [NEEDS CONFIRMATION: Was a Claude Project created for this client? If yes, confirm whether it lives in a Joshua-owned or JCC-owned Anthropic account. If Joshua-owned, transfer access to JCC before engagement ends.]

5. **Automation disposition.** Each automation receives a named disposition decision before I close out. See Section 3.

6. **Access inventory.** A complete list of every account where I or the Upriver team has access, and what is happening to each. See the revocation schedule below.

### Access revocation schedule

**Important client-specific note before executing:** Google Business Profile is listed as "claimed once, uncertain." Before revoking, I verify the current ownership status and confirm that JCC holds the primary owner role, not just Rebecca's personal Google account.

| Access / account | When to revoke | Method | Notes |
|---|---|---|---|
| Vercel (website hosting) | On engagement end date | Transfer project and org ownership to JCC; remove Joshua's account | Governance plan: JCC owns at handoff |
| Supabase | On engagement end date | Transfer project ownership to JCC; remove Joshua's account | Governance plan: JCC owns at handoff |
| Cloudinary | On engagement end date | Transfer account to JCC; rotate API keys | Governance plan: JCC owns at handoff |
| Instagram (@littlefriendsloft) | Within 7 days | Rotate password; store in JCC-managed credential system, not a sticky note | Currently Rebecca-only; credential hygiene is the primary task here |
| Google Business Profile | Within 7 days | Verify JCC holds primary owner role; rotate if needed | Claimed status uncertain; verify before revoking |
| Google Workspace (email + calendar) | Within 7 days | Remove any Joshua / team access granted during engagement; JCC already owns the org | Workspace is already via JCC, so revocation is limited to any delegated access added during engagement |
| Square Online (old site + POS login) | Within 14 days | Confirm JCC or Rebecca has standing access; migrate credentials out of sticky-note form | Low-traffic site; not a security priority, but credential hygiene still applies |
| Mailchimp | Within 14 days | Remove Joshua as user or admin; confirm Rebecca or JCC retains login | Barely used; stale access should not linger |
| Brightwheel (billing + parent reports) | Within 14 days | Remove any Upriver access added during engagement | Working well; keep operational; confirm Rebecca and JCC own credentials |
| Slack (#photos + teacher comms) | Within 7 days | Remove Joshua and any Upriver team from the workspace | All teachers already in Slack; this is a simple removal |
| Sign-Up Genius | Within 14 days | Remove any added access | Director-owned; confirm she operates independently |
| Google Forms (events) | Within 14 days | Confirm JCC or Rebecca own all forms; remove any co-editor access | Director-owned |
| Gusto (payroll) | Within 14 days | Confirm Linda (JCC bookkeeper) has ownership; remove any Upriver access | In progress at time of engagement. [NEEDS CONFIRMATION: Was Upriver given Gusto access during the engagement?] |
| Anthropic API (if used) | Within 14 days | If Joshua's API key was used in any automation, rotate and transfer to JCC's account | |
| 1Password shared vault | Delete within 14 days | Delete all shared entries on Joshua's side; confirm JCC holds their own copies | |

**Timing exceptions.** If the JCC needs continued access to my knowledge during a defined transition period, I extend by an agreed window with an explicit end date in writing. I do not leave access lingering "indefinitely." Every extension gets a named end date.

### Final call agenda (60 minutes)

1. Walk through the current-state report (15 minutes).
2. Confirm ownership of all artifacts and documents (10 minutes).
3. Discuss automation disposition (10 minutes).
4. Access revocation timeline and credential rotation plan, specifically addressing the accounts currently on sticky notes (10 minutes).
5. Future relationship: referrals, re-engagement, staying in touch (10 minutes).
6. Client questions (5 minutes).

### Post-engagement, days 1 to 30

- All access revoked per the schedule above.
- Final invoice sent.
- Little Friends Loft / JCC listed in past-client CRM with last-contact date.
- 30-day check-in email: light touch, "how is it going, any questions, I am here."

### Post-engagement, day 30 and beyond

- No active work unless re-engaged.
- Light questions answered free. Anything substantive is scoped before I begin.
- Referrals from the JCC and from Rebecca personally are welcomed and acknowledged directly.

---

## Section 3: Automation disposition

[NEEDS CONFIRMATION: Which specific automations were built during this engagement? The governance plan identifies Vercel, Supabase, and Cloudinary as the infrastructure stack but does not enumerate individual automations. The disposition framework below applies once the automation inventory is confirmed. Each automation must be assigned one of the five options before the engagement ends. No automation continues running without a named owner.]

I present the options below at the final review call with a specific recommendation for each automation.

**Option A: Client takes over entirely**

The JCC has or acquires technical capacity to maintain the automation independently. Requirements: JCC creates or has the relevant accounts; the automation is exported and deployed to JCC's own infrastructure; the Anthropic API key is transferred to JCC's account; Supabase tables are migrated to JCC's Supabase project; JCC receives a written spec and a short video walkthrough for each automation. I revoke my access; automations run independently. This option is realistic only if the JCC has an internal technical person.

**Option B: Client transfers to another vendor**

The JCC engages a different consultant or agency to take over automation maintenance. Requirements: I export full automation specs to the new vendor; credentials are transferred securely via 1Password shared, then deleted on my side; I hold a walkthrough call with the new vendor; I revoke my personal access.

**Option C: Client pauses automation**

The automation is disabled but not deleted. All data is preserved in Supabase. The JCC pays a minimal infrastructure cost (roughly $25 to $50 per month) or I maintain the pause state under a defined timeline. Restart conditions are agreed in writing before the pause begins.

**Option D: Client retires automation entirely**

The automation is deleted. Any customer-facing automated flows return to manual or are removed. Data is archived or deleted per JCC's preference. Webhooks are removed from any connected source systems. No client data remains in my infrastructure.

**Option E: Joshua continues to operate automation as a paid service**

The JCC wants automations to continue running but without a full retainer. A light-touch maintenance arrangement is set up (typically a Tier 1 retainer per Document 15). I monitor; Zach handles issues on-call. Monthly or quarterly fee covers infrastructure plus monitoring. Scope is defined clearly in writing: what is included, and what triggers a scope conversation.

**Default recommendation logic:**

- Automations that are "set and forget" (inquiry auto-response, confirmation emails): Option A if JCC has technical capacity; Option E if not.
- Automations with ongoing complexity (multi-step sequences or integrations): Option E.
- Automations that saw little to no use during the engagement: Option D.

---

## Section 4: Claude Project handoff

[NEEDS CONFIRMATION: Was a Claude Project created for Little Friends Loft during this engagement? If not, this section does not apply operationally but is kept in the spec for future engagements. If yes, confirm whether the Project lives in Joshua's Anthropic account or in a JCC-owned account, and confirm whether all 12 documents were loaded as knowledge.]

Assuming a Claude Project was created for this client:

**What the JCC owns at end of engagement.** The Claude Project itself (it should live in their Anthropic account, not mine); all 12 documents loaded as knowledge at their latest version; any custom instructions or preferences configured during the engagement; chat history up to their account's retention policy.

**What changes at offboarding.**

1. Access revocation: I remove my collaborator access from the Claude Project. If credentials were shared during the engagement, the JCC rotates the Anthropic account password and I delete the 1Password entry on my side.
2. Document state at handoff: all 12 documents are at their latest version. Any client-initiated updates I am aware of before the end date are incorporated before I close out.
3. Document maintenance responsibility shifts fully to JCC. The quarterly refresh cadence becomes their responsibility. Document 02 and Document 07 drift fastest and need updating most often.

**Training the client (30 to 60 minutes at the offboarding call).**

I walk whoever is taking ownership at JCC through: how the 12 documents interact with each other; which documents drift fastest and need updating most often (Document 02 and Document 07); how to prompt Claude to produce content using the system; and the common failure mode of letting Document 02 go stale (everything downstream degrades along with it).

**Leave-behind materials.**

- One-page reference sheet listing all 12 documents and their roles.
- Calendar reminder templates for quarterly refresh cycles.
- My contact information for non-retainer consultation at rate-card pricing.

---

## Section 5: Stress offboarding (Scenario D)

**Common causes for this engagement.** JCC leadership cuts the program's digital budget unexpectedly; a change in JCC direction de-prioritizes Little Friends Loft's operating system; a disagreement on strategic direction between me and JCC leadership; or the school's enrollment situation changes in a way that makes the work irrelevant.

**Principles.**

1. Do not argue the facts on exit. Even if I believe the engagement produced measurable results, a stressed exit is not the moment to litigate outcomes. The current-state report documents the facts. The exit conversation does not.

2. Deliver everything owed. Every document, every deliverable, every access transfer, cleanly and on schedule. I do not withhold anything as negotiating leverage.

3. Short, professional communications. Less is more. Do not over-explain, do not re-pitch, do not try to reverse their decision in exit communications.

4. Protect future possibility. Rebecca may leave to start her own program. The JCC may re-engage in two years. A burned exit eliminates both.

5. Document everything internally. What was delivered, what was approved, what was signed off on. Not for argument, but for clarity if the relationship ever resumes.

**Final communication template for stressed exits.**

```
Subject: Wrapping up

Hi [first name],

Confirming where we are on closing out the engagement.

Delivered:
- [List of key deliverables]
- [Confirmation of access revocation schedule]
- [Any outstanding items]

Final invoice attached, due [date] per our agreement.

Wishing you well on what comes next. If anything changes, my email works.

Joshua
```

**What not to do.**

- Do not send a defensive email explaining why their dissatisfaction is unjustified.
- Do not discuss the engagement negatively with other clients or publicly.
- Do not mishandle data or credentials as leverage.
- Do not publish any case study referencing Little Friends Loft or the JCC without written permission.

---

## Section 6: Internal team handoff

### Scenario E: Joshua hands work to Annmarie, Zach, or another team member mid-engagement

Common triggers for this engagement: Zach takes over all automation maintenance (already largely the case); Annmarie picks up web implementation; I scale and delegate day-to-day client contact to free up my time for new engagements.

**Handoff checklist.**

- I brief the receiving team member on the Little Friends Loft client in a 30 to 60 minute call. Topics: Rebecca's communication style, the JCC's organizational structure, the credential situation (Rebecca holds most passwords on sticky notes), and any relationship sensitivities.
- I review the status of all 12 documents with the team member before they take lead.
- I introduce the team member to Rebecca (and the relevant JCC contact) via email before they take over. No surprise introductions.
- The team member joins any ongoing client calls or Slack threads for one to two weeks before officially taking lead.
- Client communication channels are updated (email threads, Slack access) before the formal handoff date.
- A formal "you are driving now" handoff at an agreed date with explicit confirmation to the client.

**Email template for Scenario E.**

```
Subject: Introducing [team member]

Hi Rebecca,

Wanted to introduce you to [team member], who will be taking over [specific scope] 
for your engagement. [One sentence on why, for example: Zach is leading all 
technical work going forward.]

Nothing changes on what we deliver or the timeline. [Team member] has been fully 
briefed on the engagement and will be your primary contact for [specific scope]. 
I remain available for [oversight / quarterly reviews / escalations].

[Team member] will reach out shortly to confirm communication preferences.

Joshua
```

### Scenario F: Team member departing Upriver

Triggers: a subcontractor moves on; Zach, Annmarie, or Megan takes a full-time role elsewhere; a mutual decision to end a working relationship.

**Handoff checklist.**

- Departing team member documents their active work on the Little Friends Loft engagement before their last day (2 to 4 hours of documentation).
- I review the documentation and fill any gaps before they leave.
- I hold a brief, calm transition conversation with Rebecca and the relevant JCC contact.
- All credentials and access held by the departing team member are transferred or rotated before their last day.
- 1Password entries are transferred to remaining team.
- Departing team member's contact information is removed from client communications before their last day.
- NDA and non-solicit reminders as applicable, per the subcontractor agreement.

**Email template for Scenario F.**

```
Subject: Team update

Hi Rebecca,

Brief update: [team member] is moving on from Upriver at end of [month]. 
[Replacement or I] will take over [specific scope]. Same work, same standards, 
same timeline.

[Replacement] will be in touch next week.

Joshua
```

**Internal documentation required when a team member departs.**

- Active status of the Little Friends Loft engagement: open tasks, open questions, anything mid-flight.
- Where to find all their work: specific Drive folder paths, Supabase project names, any GitHub repos, n8n workflow names or IDs.
- Client-specific context not captured elsewhere: Rebecca's preferences, JCC organizational sensitivities, anything relational.
- Credentials transferred or rotated with 1Password updated accordingly.

---

## Section 7: Post-engagement relationship management

The JCC's network (other JCC programs, peer directors at similar schools, families who move on to other programs) is a real referral pool. A clean exit and a maintained relationship is the highest-ROI outcome for both sides.

**30 days post-end.** Light-touch check-in from me: "How is the system working? Any questions that have come up? I am available if you need a quick input." No sales content.

**90 days post-end.** If the JCC is running the system well independently, I send a relevant observation or resource. For example, a note about enrollment inquiry trends or a change in local search behavior relevant to childcare programs. The goal is to acknowledge their progress and stay useful without being intrusive.

**6 months post-end.** A more substantive check-in. Little Friends Loft has a natural seasonal trigger: late summer, when families are planning for fall enrollment. I may share an observation about inquiry trends for preschool programs or ask how specific KPIs are tracking vs. baseline.

**12 months post-end.** Anniversary touch. More substantive than a check-in. May include an offer for a light refresh engagement, for example, a competitive landscape refresh (Document 05) or a site audit at a defined fee.

**Referrals.** I make the ask explicitly at the offboarding call and reinforce it lightly in annual touches. Referred clients receive a warm introduction, not a cold pitch. A consistent referral incentive (for example, 10% of the first month of a new retainer) is offered the same way to every former client.

**Re-engagement.** If the JCC or Rebecca returns, I onboard with lighter ceremony. I do not re-run the full kickoff kit. Prior documents are updated rather than rebuilt, unless meaningful time has passed (generally more than 18 months). Pricing reflects any rate changes since the original engagement.

**Case studies and public mentions.** I ask for written permission before publishing any case study that references Little Friends Loft or the JCC. I anonymize if they prefer. I do not name them publicly without permission and do not discuss details that would identify the program in any forum, including referral conversations.
