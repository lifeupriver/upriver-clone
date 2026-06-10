# [NEEDS CONFIRMATION: Client program full name] - Account access and governance

[NEEDS CONFIRMATION: The client organization's full legal program name. The profile refers to the institutional parent as "JCC" and the program as an early childhood program (Twos, Threes, Pre-K, Aftercare) in Newburgh, NY. Confirm before publishing this document to the Project knowledge base.]

**Document:** I07  
**Date drafted:** 2026-06-09  
**Engagement lead:** [NEEDS CONFIRMATION: Upriver Consulting email to use as the consultant seat for this engagement]  
**Status:** Draft, pending kickoff confirmation

---

## 1. Plan tier decision

**Recommendation: Team plan, Standard seats.**

The named key team is six people: Rebecca [NEEDS CONFIRMATION: role and title], Tova (Twos lead teacher), Carla (Threes lead teacher), Dana (Pre-K lead teacher), Yael (aftercare), and Linda (bookkeeper, part-time, JCC). Room assistants are mentioned in the profile but are not seated at launch.

Seat count and cost scenarios at launch:

- Owner seat: Rebecca (1 seat)
- Member seats: Tova, Carla, Dana, Yael, plus me (Upriver) = 5 seats
- Total without Linda: 6 seats at $25/seat/month (annual billing) = $150/month
- Total with Linda: 7 seats = $175/month (if Linda needs regular Claude access at launch)

Linda's part-time, JCC-employed status means I confirm at kickoff whether she needs a seat now or can be added when her involvement requires it. The seat count, dollar figure, and board-approval request must all be consistent with whichever scenario is confirmed.

Team plan clears every relevant threshold for this engagement:

- Multiple users need access to a shared Project. Pro plan does not support shared Projects.
- Central billing under the JCC's institutional account (not Rebecca's personal payment method) requires Team plan.
- Admin controls for seat management matter because staff turnover is a normal part of running an early childhood program.
- The 5-seat minimum is already satisfied by the core group above.

No Enterprise trigger exists in this profile: no HIPAA requirement, no audit log mandate, no SCIM provisioning requirement, no ZDR addendum needed at this time (see section 5).

**Seat type:** Standard for all. No one on the client side has been identified as a heavy Claude Code user. Premium seats are not warranted at this time.

**Budget note:** This program operates on a nonprofit budget. The board controls spending, and Rebecca can champion the subscription but cannot spend unilaterally. I present the 6-seat and 7-seat cost figures at kickoff so the client arrives at the billing decision with the correct numbers. If a formal budget request is required, I provide the breakdown and Rebecca prepares the request.

[NEEDS CONFIRMATION: Whether the board has already approved a Claude subscription or whether a formal request is required. All I01 through I06 work blocks until approval and account activation are complete.]

---

## 2. Billing ownership

**Claude.ai subscription:** JCC should own this account and the billing relationship with Anthropic. The profile confirms that billing currently sits with Rebecca personally, which is the account-ownership gap the profile describes: credentials held by the director on a sticky note. Transitioning from Rebecca's personal payment method to JCC institutional billing is a required action before this engagement is production-ready.

**API usage:** Not applicable at this time. If automation work in I06 moves to production and requires direct API calls, the JCC will fund its own Anthropic Console account at that point.

**Shared infrastructure (Vercel, Supabase, Cloudinary):** These accounts are provisioned under Upriver Consulting during the build. Per the offboarding plan confirmed in the client profile, JCC owns all three at handoff. During the engagement I absorb the infrastructure cost and recover it through the retainer. The transition plan is documented in section 9.

**Linda (bookkeeper, JCC):** Linda is the billing contact on the client side. She is the person I notify when an invoice is generated and the person who coordinates payment from JCC's accounts. The Anthropic account owner role sits under a JCC institutional email, not necessarily Linda's personal email.

[NEEDS CONFIRMATION: The institutional email address JCC will use for the Anthropic account owner role.]

**My subcontractors:** Paid by me out of the retainer. The client does not pay them directly.

---

## 3. Access map

```
# [NEEDS CONFIRMATION: Client program name] - Access map

## Anthropic Claude account
- Plan tier: Team
- Organization owner: [NEEDS CONFIRMATION: JCC institutional email]
- Primary Owner role: Rebecca [NEEDS CONFIRMATION: full name and institutional email]
- Members:
  - [Tova email], Member, added [date at I01 setup]
  - [Carla email], Member, added [date at I01 setup]
  - [Dana email], Member, added [date at I01 setup]
  - [Yael email], Member, added [date at I01 setup]
  - [Linda email], Member (conditional, confirm at kickoff), added [date]
  - [NEEDS CONFIRMATION: Upriver consultant email], Member, added [date],
    scheduled removal at engagement end
- Subcontractors (temporary): none at engagement start

## Project access (from I01)
- Project: "[NEEDS CONFIRMATION: Client program name] - Operating System"
- Can edit: TBD at I01
- Can use: TBD at I01

## Connectors (from I04)
- TBD at I04 setup. Likely includes Gmail, Google Drive, Google Calendar.
- Each connector listed as: [service], authorized by [email], date authorized

## Claude Code / API (from I06)
- Claude Code users: none
- API keys: none at engagement start

## Departure triggers
- If Rebecca leaves or changes roles: transfer Primary Owner to JCC successor;
  rotate any connectors authorized under her personal Google account
- If Tova, Carla, or Dana leaves: revoke Member access; update routines referencing
  that room or planning workflow
- If Yael leaves: revoke Member access; update aftercare routines
- If Linda leaves: revoke Member access; update billing contact in Anthropic account
- If engagement ends: remove Upriver consultant seat from organization; transfer
  Vercel, Supabase, and Cloudinary to JCC institutional accounts; rotate all API keys
```

---

## 4. Role assignment

**Primary Owner.** Rebecca holds the Primary Owner role. [NEEDS CONFIRMATION: Rebecca's exact title within the program and whether she is the appropriate long-term account owner, or whether a JCC institutional email should hold the role to reduce key-person risk.] The Primary Owner role owns billing and every seat-management action. This must remain with a client-side individual or institutional account. I do not hold this role.

**Admin.** Not applicable. Admin is an Enterprise-only role. At Team tier, seat management happens through the Owner account.

**Members.** Tova, Carla, Dana, Yael, and Linda (if seated) each get Member role. Assistants in each classroom are not seated initially. If that changes, I update this document and the client-tracker.

**My role.** I hold Member role. I do not need Owner or billing access. Member role gives me the Project edit access I need for I01 through I06. During account setup I confirm I am provisioned at Member level and not accidentally at a higher role.

**Subcontractors.** None at engagement start. If I bring in a subcontractor, they get Member role, their access is logged in this map with a scheduled removal date, and they are removed at scope end.

---

## 5. Data retention and privacy posture

I asked the three standard questions at kickoff. Here is the status:

**Question 1: Does your work involve PHI, financial records, or any regulated data category?**

This program is licensed under NYS OCFS (Office of Children and Family Services). The program handles children's enrollment records, developmental notes, and family contact information. This is not HIPAA-regulated data (no medical services), but it is children's PII and family records.

Practical guidance: staff should not paste individual children's names, birth dates, developmental assessments, or family addresses into Claude chat prompts. Those records belong in the program's enrollment and records system [NEEDS CONFIRMATION: which platform or system holds enrollment records and children's files]. Claude's role here is administrative: lesson plans, parent newsletters, staff communications, scheduling. Where a task requires referencing a specific child's situation, staff uses Incognito mode (see section 8) and does not paste raw records.

[NEEDS CONFIRMATION: Whether the JCC's parent organization has a data governance policy covering AI tool use. If the JCC has an IT or legal function, confirm that function has reviewed Anthropic's data processing terms before staff uses Claude for any work touching family data.]

Standard 30-day retention under Anthropic's operational terms is acceptable for this posture. ZDR is not required at this time.

**Question 2: Do you have data residency requirements?**

The profile indicates US-only data residency as the provisioning default for this engagement. The program is in Newburgh, NY under NYS OCFS, and all data should remain in US regions. Anthropic's standard US deployment satisfies this in all likelihood. [NEEDS CONFIRMATION at setup: whether any contractual or regulatory obligation demands a stricter residency posture or a specific US-region restriction beyond Anthropic's standard deployment.]

**Question 3: Do you need audit logs of user actions and model calls?**

No. The program is not subject to an audit log mandate. Team plan, no Enterprise upgrade on this basis.

**Conclusion:** Standard Team plan with standard 30-day retention. No ZDR, no custom retention, no Enterprise trigger from privacy posture.

---

## 6. Usage monitoring and tier adjustment

I monitor usage at 60 days post-launch and then quarterly per I15.

**Under-utilization signal.** If lead teachers are not using Claude regularly after 60 days, I work with Rebecca to identify what is blocking adoption before recommending seat changes. Reducing seats or downgrading to Pro would eliminate the shared Project, which is not acceptable.

**Over-utilization signal.** If a user hits session or weekly limits regularly, I flag upgrading that seat to Premium ($100/month annual). Given the nonprofit budget, I confirm with Rebecca and Linda before any per-seat upgrade.

**Team-to-Enterprise trigger.** No trigger exists in the current profile. If the JCC parent organization imposes an audit log requirement, SSO mandate, or if team size grows past 150, I revisit.

**Downgrade consideration.** I do not recommend downgrading below Team plan. Losing shared Projects would undermine the operating system that I01 through I06 build.

---

## 7. Audit log review

Not applicable. This client is on Team plan. Audit logs are an Enterprise-only feature. Governance review at this tier happens through the access map audit in I15.

---

## 8. Incognito mode and privacy conversations

I cover Incognito mode in the I01 handoff walkthrough. Specific cases flagged for this program:

**When staff should use Incognito:**

- Any conversation involving a specific child's behavior, developmental concern, or family situation. For example, if a lead teacher wants to draft a note to a parent about a difficult situation, she should use Incognito so that conversation does not persist to her account's chat history or the Project's memory.
- Any conversation involving a specific family's financial or billing situation (for example, a family on scholarship).
- Any conversation where a staff member wants to think through a personnel situation without that context persisting to shared Project memory.

**When NOT to use Incognito:**

- Lesson planning, room routines, parent newsletter drafting, scheduling, or any task where the output is something the team wants to find or reference later.
- Any conversation that feeds the operating system's memory or routines.

---

## 9. Offboarding pre-plan

The engagement ends with the JCC owning everything built during it. Specific transition map, drawn from the client profile:

**What transfers to JCC at engagement end:**

- Vercel project (in my name during the engagement): transfers to JCC institutional account.
- Supabase project (in my name during the engagement): transfers to JCC institutional account.
- Cloudinary account or folder structure (in my name during the engagement): transfers to JCC institutional account.
- Anthropic Claude account: JCC owns this if the billing transition in section 2 is completed during the engagement. No separate transfer needed.

**Credential rotation at offboarding:**

- All API keys I provisioned are rotated; old keys are revoked.
- Any connector authorizations linked to my accounts are revoked.
- The profile flags that every account (Square, Instagram, Google, and others) is currently held by the director on a sticky note. Part of what I build during the engagement is an account-ownership inventory giving the JCC a clean record of every credential and its institutional owner. That inventory, not the sticky-note system, is what gets handed off.

**What I remove:**

- My Upriver consultant seat is removed from the Claude organization at engagement end.
- Any subcontractor Member access is removed before engagement end.

**What the client keeps:**

- Their Claude Project, knowledge base, skills, connectors, and chat history.
- All content and deliverables produced during the engagement.

**What I may keep with client permission:**

- Anonymized operational learnings from building this type of program. No family data, no staff data, nothing identifiable.

---

## Operator runbook

These are the steps I follow to stand this up, in order.

### Step 1: Kickoff call governance block (30 minutes)

I run the governance section of the kickoff as a structured conversation with Rebecca and Linda. Topics:

- Plan tier and cost. I present the 6-seat ($150/month) and 7-seat ($175/month) scenarios and confirm which seats activate at launch. [NEEDS CONFIRMATION: whether all team members have JCC-domain email addresses or a mix of personal and business domains. Mixed domains affect domain capture and make SSO harder to enforce cleanly.]
- Board approval status. I confirm whether approval is already in place or whether a formal budget request is needed and who prepares it.
- Billing transition. I confirm the JCC institutional email that will own the Anthropic account and the payment method that will attach to it.
- Access roles. I confirm Rebecca as Primary Owner and collect each team member's email address for seat invitations.
- Privacy posture. I ask all three questions from section 5 explicitly. I ask about any JCC IT or legal function that reviews AI tool use, and about which system holds children's enrollment records.
- Account-ownership inventory. I flag the sticky-note credential problem and confirm that building an institutional account inventory is in scope.
- Incognito orientation. Brief explanation of when to use it, using the specific scenarios from section 8 as examples.

### Step 2: Client executes plan-tier upgrade or account transition

[OPERATOR ACTION: Rebecca (or the designated JCC contact) upgrades the Claude account to Team plan at claude.ai, attaches a JCC payment method, and designates the JCC institutional email as Primary Owner. I provide the URL and cost breakdown; they make the billing decision and complete the checkout inside their Anthropic account. If board approval is required first, this step waits for that approval to land.]

### Step 3: Confirm billing transition is complete

I ask Rebecca or Linda to confirm:

- The account is on Team plan.
- Billing is attached to a JCC payment method, not Rebecca's personal card.
- The Primary Owner is set to the correct institutional or designated email.

This confirmation is a prerequisite before I proceed to I01.

### Step 4: Confirm board approval and seat count

I confirm which seat scenario was approved (6 or 7 seats) and document it in the client-tracker. This is the figure Linda budgets for.

### Step 5: Team invitations sent and accepted

[OPERATOR ACTION: Rebecca (as Primary Owner) invites Tova, Carla, Dana, Yael, and Linda (if seated) to the Claude organization using each person's institutional or agreed-upon email. Each invitee accepts their invitation inside claude.ai. I confirm all acceptances are complete before I01 proceeds.]

### Step 6: Accept my own Member invitation

[OPERATOR ACTION: I accept my invitation to the organization at my confirmed Upriver consultant email. I verify I am at Member role, not Owner or Admin.]

### Step 7: Populate the access map with confirmed emails and dates

Once all invitations are accepted, I fill in the email addresses and invitation-accepted dates in section 3. All connector entries stay marked as "TBD at I04."

### Step 8: Upload this document to the Project knowledge base

[OPERATOR ACTION: Once the Project exists (after I01 is set up), I upload this document to the Project knowledge base. Until I01 is complete, I keep it in the client-tracker only.]

### Step 9: Update the client-tracker

I fill in: plan tier, seat count and monthly cost, billing contact (Linda), privacy posture (standard), initial role assignments, and offboarding pre-plan notes.

### Step 10: Revisit at every subsequent spec

Every time I04 adds a connector, I01 adds a user, or I06 adds an API key, I update section 3 of this document. This document is a living record, not a one-time artifact.

---

## Operator must do (cannot be generated)

These steps require action inside the client's Anthropic account or a third-party system and cannot be completed by generating a file.

- [ ] **Institutional email confirmed.** Confirm the JCC email address that will hold the Anthropic Primary Owner role before any account work begins.
- [ ] **Board or budget approval.** Confirm with Rebecca and Linda that the JCC board has approved (or is in the process of approving) the Team subscription at $150/month (6 seats) or $175/month (7 seats with Linda). If a formal budget request is required, Rebecca prepares it and I provide the cost breakdown.
- [ ] **Linda seat decision.** Confirm at kickoff whether Linda needs a seat at launch (7 seats, $175/month) or is added later.
- [ ] **Account transition.** Rebecca (or the designated JCC contact) upgrades the Claude account to Team plan at claude.ai, attaches a JCC payment method, and sets the Primary Owner to the correct institutional email. This requires access to the client's Anthropic account and cannot be done from outside it.
- [ ] **Team invitations sent and accepted.** Rebecca (as Primary Owner) invites Tova, Carla, Dana, Yael, and Linda (if seated) to the Claude organization. Each invitee accepts their invitation. I confirm all acceptances are complete before proceeding to I01.
- [ ] **Consultant seat accepted.** I accept my own Member invitation and confirm I am not provisioned at Owner or Admin level.
- [ ] **JCC IT or legal review.** [NEEDS CONFIRMATION] If the JCC has an IT or legal function, that function reviews Anthropic's data processing terms and approves Claude for administrative use before staff begins any work touching family or children's data.
- [ ] **Account-ownership inventory started.** At kickoff, I collect from Rebecca the full list of external accounts (Square, Instagram, Google, and others currently held under personal credentials). I document institutional ownership status for each and flag the ones that need a JCC takeover alongside the Claude transition.
- [ ] **Connector authorizations (from I04).** Each connector (Gmail, Google Drive, Google Calendar, and any others identified in I04) requires OAuth consent from the authorizing user inside the Claude Project. Rebecca or the designated connector owner completes each consent screen in their own browser.
- [ ] **Access map published to Project knowledge base.** Once the Project exists (after I01), this document is uploaded to the Project knowledge base. Until then it lives in the client-tracker. Requires the Project to exist before the upload can happen.
- [ ] **Offboarding transfers (at engagement end).** The Vercel project, Supabase project, and Cloudinary account each transfer to JCC institutional accounts at engagement end. Rebecca or a JCC contact accepts each transfer inside the respective platform.
