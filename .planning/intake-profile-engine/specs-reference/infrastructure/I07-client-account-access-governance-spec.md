# Spec I07: Client Account, Access, and Governance Spec

## What This Spec Is

This spec is the foundation governance layer that sits beneath every other client-facing spec in the infrastructure suite. It answers the questions that have to be resolved before I01 through I06 can safely proceed: which Anthropic plan tier is right for this client, who gets added at what role, how data retention and privacy are handled, who pays for what, how usage gets monitored, what happens when someone leaves, and when Incognito mode is appropriate. None of the other specs in Group A work cleanly if these decisions are made ad-hoc.

Without this spec, I've had engagements where I set up a Project in I01 only to discover the client couldn't share it because they were on Pro plan, or where I connected MCPs in I04 to a user account that the client later couldn't retrieve when that employee left, or where an engagement's privacy posture didn't match the client's regulatory reality. With this spec, the plan tier, access map, privacy posture, and billing flow are set at engagement start and documented in the client-tracker so every subsequent infrastructure decision fits the governance frame.

The tier choice matters more than it looks. Pro plan and Max plan don't support shared Projects, multi-user governance, SSO, or audit logs. Team plan opens up shared Projects, central billing, admin controls, spend caps, SSO, and domain capture. Enterprise adds SCIM, audit logs, custom data retention, the Compliance API, and ZDR addendum eligibility. Most of my clients fit Team plan cleanly. A minority need Enterprise. A few solo operators stay on Pro. Knowing which from the start shapes everything downstream.

## Quick Reference

| Field | Value |
|---|---|
| Doc number | I07 |
| Priority | Critical, build first of the client-facing specs |
| Total length target | Completed access map, tier decision documented, privacy posture confirmed, billing flow agreed |
| Time to produce | 30-45 minutes of structured conversation during kickoff plus 15 minutes of documentation |
| Client time required | 30 minutes of kickoff call plus whatever tier change they need to execute |
| Delivery format | Governance section of the client-tracker, an access map document in the Project knowledge base, any plan-upgrade confirmation |
| File naming | `[client]-access-governance.md` in the Project knowledge base |
| Prerequisite | Signed agreement, kickoff call scheduled |

## When This Document Gets Built

**Triggers:**

- Kickoff call scheduled
- Client has signed the engagement agreement
- Before any work begins on I01 (Project setup) because the tier decision determines what I01 can do

**Blocks:**

- All of I01 through I06, I08, I09 block on this because every one of them assumes a specific plan-tier workflow
- Any work involving sensitive data (client-of-client data, PHI, financial records) blocks on the privacy posture decision

## Section-by-Section Template

### 1. Plan Tier Decision

I walk the client through a structured decision during kickoff. The answer is usually obvious once the criteria are on the table.

**Pro plan fits when:**

- Single user operating the business (true solo operator with no employees)
- No need to share Projects with team members
- No compliance requirements beyond basic privacy
- Budget is the dominant constraint
- Claude Code use is light to moderate (developer using it a few hours a day at most)

**Max plan fits when:**

- Single user but with heavy Claude usage (5-hour rolling window on Pro is insufficient)
- Developer doing serious Claude Code work
- Solo consultant or creator who hits Pro limits regularly
- Still no team, still no compliance requirements

**Team plan fits when:**

- 2+ users need access
- Shared Projects are required (every client who'll have multiple team members touching the Project)
- Central billing is preferred over individual subscriptions
- Admin controls for seat management matter
- SSO integration is desired (not required)
- Team size is 5 to 150 (minimum is 5 seats)
- Pricing: $25/seat/month (Standard, annual) or $30/month (Standard, monthly). Premium seats at $100/month annual or $125/month monthly include Claude Code and significantly higher usage.

**Enterprise plan fits when:**

- Organization has compliance requirements (HIPAA, GDPR residency, regulated industry)
- Audit logs are required for governance
- SCIM provisioning tied to corporate IdP is required
- Custom data retention controls are needed
- ZDR addendum is required for sensitive data processing
- Compliance API access for programmatic chat history and activity log retrieval is needed
- 500K context window on the default model is a meaningful upgrade
- Annual contract with minimum seat commitment is acceptable
- Pricing is custom via sales

**My default recommendation for most client engagements:** Team plan, 5-seat minimum, Standard seats for everyone except any technical user who'll use Claude Code heavily (upgrade that seat to Premium). Team plan unlocks the shared Project model I01 is built around and is the cheapest path to multi-user governance.

**The 5-seat minimum issue.** Team plan requires a minimum of 5 seats. For a client with only 2-3 users, that means paying for seats that sit empty. I still recommend Team in these cases because the alternative (multiple Pro accounts with no sharing, no central billing, no admin controls) creates more friction and risk than the cost of 2-3 unused seats. For truly small clients, I may use one of the empty seats for myself (reducing their effective cost) or for a subcontractor who's temporarily on the engagement.

### 2. Billing Ownership

Three billing relationships get decided at kickoff.

**Claude.ai subscription (Project, chats, Cowork, Skills, etc.):** The client always pays Anthropic directly for their own Claude plan. I do not reseller or pass-through Claude subscriptions; the client owns the billing relationship with Anthropic and I am a collaborator inside their account. This is non-negotiable because account ownership stays with the client after the engagement ends.

**API usage (if applicable per I06):** The client funds their own Anthropic Console account. Same principle: their account, their billing, their keys. The only exception is very short prototype engagements where I pre-provision an API key on my Console for testing, and those migrate to the client's Console before any production traffic.

**Shared infrastructure I host (website hosting, Vercel, Supabase, Cloudinary, Mux if I'm the holder):** Billed monthly through my Upriver Consulting retainer or billed separately depending on engagement type. I document whose name each service account is in and what the transition plan is when the engagement ends.

**My subcontractors (Annmarie, Louis, Zach, Megan):** Paid by me out of the client retainer. The client never pays them directly. This keeps the client relationship clean and gives me control over subcontractor work quality.

### 3. Access Map

Every engagement gets an access map that documents who has access to what, at what role, authorized by whom. The map lives in `[client]-access-governance.md` in the Project knowledge base and is the source of truth.

Template:

```markdown
# [Client] - Access Map

## Anthropic Claude Account
- Plan tier: [Pro/Max/Team/Enterprise]
- Organization owner: [client owner email]
- Primary Owner role: [client owner]
- Admin role: [if Enterprise, client admin]
- Members: 
  - [Email 1] — Member, [date added]
  - [Email 2] — Member, [date added]
  - [Email 3] — Member, [date added]
- Subcontractors (temporary):
  - [Louis email] — Member, added [date], scheduled removal [date]

## Project Access (from I01)
- Project: "[Client] - Operating System"
- Can edit: [list]
- Can use: [list]

## Connectors (from I04)
- [Gmail] authorized by [email]
- [Drive] authorized by [email]
- [Ahrefs] authorized by [email]
[...one line per connector per authorizer]

## Claude Code / API (from I06)
- Claude Code users: [none / list]
- API keys: [name — spending cap — last rotated]

## Departure triggers
- If [email] leaves the team, revoke: [list of connectors and roles tied to their account]
```

### 4. Role Assignment Discipline

For any plan with multiple users:

**Primary Owner.** Always the client's principal (owner, founder, managing partner). This role owns billing, owns everything. Never me, never a subcontractor.

**Admin (Enterprise only).** For clients with more than a few users, an internal admin on the client's side gets this role. They manage policies, users, audit logs. Billing stays with the Primary Owner.

**Members (Team and Enterprise).** Individual team members. Each gets Member role.

**Me.** I get Member role by default, not Admin. I need edit access to Projects and connectors, which Member role provides. I don't need admin access, and keeping me at Member reduces blast radius if my account is compromised.

**Subcontractors.** Member role, added only when actively working on the engagement, removed at scope end. The access map tracks the scheduled removal date.

### 5. Data Retention and Privacy Posture

I ask every client three questions at kickoff:

**Question 1: Does your work involve PHI, financial records, or any regulated data category?**

- No → Standard retention and posture are fine. Anthropic retains interaction data for 30 days by default under standard operational terms. No ZDR needed.
- Yes → The client needs Enterprise plan plus a ZDR addendum. ZDR prevents Anthropic from storing prompts or model outputs beyond immediate processing and is contractually arranged through the client's Anthropic account team. This is a mandatory prerequisite for processing regulated data.

**Question 2: Do you have specific data residency requirements (GDPR, state-level data laws, contractual obligations to your own clients)?**

- No → Standard deployment is fine.
- Yes → Enterprise plan plus discussion with the Anthropic account team about the specific residency options. For US-only inference, Anthropic offers it at 1.1x standard pricing; for EU, deployment through AWS Bedrock with EU regions is the path.

**Question 3: Do you need audit logs of every user action and every model call for compliance or internal governance?**

- No → Standard Team plan is fine.
- Yes → Enterprise plan. Audit logs capture authentication events, model calls with metadata, and file interactions. Default retention is 30 days in the Admin Console; logs can be exported to JSON or CSV or streamed to SIEM platforms.

**For most of my clients, all three answers are No, and the governance posture is Team plan with standard retention.** Enterprise becomes necessary for a specific subset: regulated professional services clients (healthcare-adjacent, legal, financial advisory), any client whose own clients impose contractual retention requirements, and any client with an internal IT/security function that requires SSO and audit logs.

### 6. Usage Monitoring and Tier Adjustment

Once the engagement is live, I watch usage against the plan for the first 60 days and then quarterly:

**Under-utilization signal.** Client has 5 Team seats, only 2 are ever active. Extra seats cost $50-60/month. If this pattern holds for 90 days, I flag it. Options: repurpose seats for subcontractors, add planned team members, or accept the overhead as the cost of the governance model. I don't downgrade from Team to Pro because that would break the shared Project model.

**Over-utilization signal.** User hitting 5-hour window or weekly limit regularly. Options: upgrade specific users to Premium seats (gives 5x more usage, includes Claude Code), enable extra usage (pay-as-you-go beyond seat limit), or upgrade the whole plan to a higher tier.

**Upgrade trigger: Team to Enterprise.** Happens when:
- Team size exceeds 150 seats (Team plan cap)
- Audit logs become required
- SSO moves from nice-to-have to required
- A compliance requirement emerges that needs ZDR or custom retention
- The client wants 500K context window on their default model

**Downgrade consideration.** I rarely recommend downgrading. The pain of losing shared Projects, admin controls, and central billing outweighs the savings unless the team genuinely shrinks below the minimum.

### 7. Audit Log Review (Enterprise Only)

For Enterprise clients, audit logs exist but they aren't self-reviewing. I set up a review cadence:

**Monthly light review.** I look at the previous month's auth events and flag anything unusual (sign-ins from unexpected geographies, mass file deletions, role changes that weren't planned). 15 minutes.

**Quarterly deep review (handled in I15).** Full audit log export, review against access map, look for drift.

**Immediate review trigger.** Any departure, any known security event, any report from the client that something looks off.

Audit log review is only possible on Enterprise. For Team and Pro clients, I don't have this visibility; instead, I rely on the client-tracker access map and regular access audits per I15.

### 8. Incognito Mode and Privacy Conversations

Claude has an Incognito Conversation mode that doesn't persist to chat history or to Claude's memory system. This matters for specific situations with client data.

**When I tell clients to use Incognito:**

- Any conversation that involves their clients' sensitive personal data (a contractor discussing a specific homeowner's financial situation, a venue discussing a specific wedding's private family dynamics)
- Any conversation where they want to brainstorm or vent about a team member or partner without that conversation becoming part of their account's memory
- One-off explorations they don't want persisted (salary research, personal financial planning that happens to use their business Claude account)

**When NOT to use Incognito:**

- Any work that the Project knowledge base or memory should learn from (which is most work)
- Any conversation that produces a deliverable the client wants to find later
- Any conversation whose context the routines or automations need to reference

I cover this in the client-facing walkthrough (part of I01's handoff deliverable) so the client knows Incognito exists and when to reach for it.

### 9. Offboarding Pre-Plan

At kickoff I document the offboarding plan so when the engagement ends (whenever that is), the transition is predictable.

**At engagement end:**
- I am removed from the client's organization
- Any of my connector authorizations are revoked
- Any shared infrastructure still in my name is transferred (domain ownership, Vercel projects, Supabase projects, Cloudinary account structure)
- API keys I provisioned are rotated and the old ones revoked
- The client keeps their Claude account, their Project, their knowledge base, their skills, their connectors, their history

**What I do not take:**
- Any data produced during the engagement
- Any insight, content, or working documents that were the client's to begin with
- Any residual access

**What I may keep (with client permission):**
- Anonymized case study material
- Non-confidential operational learnings

## How to Build This Document

**Step 1: Kickoff call governance block (30 minutes).** I run this section of the kickoff as a structured conversation. Plan tier, billing ownership, access roles, privacy questions, Incognito orientation. I take notes live.

**Step 2: Client executes plan-tier upgrade or setup (client action).** If they need to move from Pro to Team, or from Team to Enterprise, that happens on their side. I provide the URLs and the reasoning; they make the billing decision. For Enterprise, this involves their Anthropic sales contact and can take 1-4 weeks.

**Step 3: Draft the access map document (15 minutes).** Use the template above, fill in what's known, mark everything else as "TBD at I01 setup."

**Step 4: Upload access map to Project knowledge base (2 minutes).** Even before I01 is fully set up. The access map becomes the anchor document.

**Step 5: Update client-tracker (5 minutes).** Plan tier, billing contact, privacy posture, initial role assignments, offboarding plan notes.

**Step 6: Revisit at every subsequent spec (ongoing).** I01, I02, I04, I06 all update the access map as they add users, connectors, and keys. I07 isn't a one-time artifact; it's a living document.

## Definition of Done

- [ ] Plan tier has been decided and documented with rationale
- [ ] Client has executed any required plan upgrade (or confirmed staying on current tier)
- [ ] Billing ownership is agreed and documented for Claude subscription, API usage, shared infrastructure, and subcontractors
- [ ] Primary Owner role is assigned to the client's principal
- [ ] Admin role (Enterprise only) is assigned to an internal client admin if applicable
- [ ] My role is Member (not Admin)
- [ ] Data retention posture is decided (standard or ZDR)
- [ ] If ZDR is needed, the ZDR addendum process has been initiated with Anthropic
- [ ] Client is aware of Incognito mode and when to use it
- [ ] Offboarding plan is documented
- [ ] Access map exists in the Project knowledge base
- [ ] Client-tracker governance section is filled in

## Common Failure Modes

**Failure 1: Starting I01 before the tier decision is confirmed.** If I start setting up a Project on the client's Pro account and discover mid-setup that they need Team for shared access, I have to rebuild. Always confirm tier first.

**Failure 2: Team plan 5-seat minimum surprise.** Clients with 2-3 users see the $25/seat × 5 = $125/month minimum and balk. I raise this expectation before they commit, not after. The alternative explanations (no shared Projects on Pro, no central billing, no admin controls) justify the cost for most engagements, but the client needs to understand the math going in.

**Failure 3: Leaving me at Admin role on Enterprise.** Admin role lets me manage users and policies, which I don't need. Member role is sufficient. I've caught myself provisioned as Admin and removed it.

**Failure 4: Missing the ZDR trigger.** A client in a regulated industry might not mention regulation at kickoff because it's implicit to their work. I always ask Question 1 explicitly, even for clients I "know" don't need it. Better to confirm than to assume.

**Failure 5: No offboarding plan at start.** When engagements end without a pre-planned offboarding, transitions turn messy. Who owns the Vercel project? Who rotates the API key? Who has the Cloudinary login? Document at kickoff, review at engagement end.

**Failure 6: Team plan with no SSO and mismatched email domains.** If the client's team uses a mix of personal and corporate email addresses, domain capture doesn't work cleanly and SSO can't be fully enforced. I check email addresses at Step 1 and flag mismatches.

**Failure 7: Treating the access map as a one-time artifact.** The access map is living. Every time I add a connector in I04 or a user in I01 or an API key in I06, the map updates. If it falls behind, it becomes worse than useless because it misrepresents reality.

**Failure 8: Assuming Pro plan users can do things that require admin controls.** Pro plan has no admin console, no SSO, no audit logs, no spend caps, no domain capture, and no shared Projects. I've explained this wrong to clients before. The shortest accurate summary: Pro is a single-user tool, everything governance-related starts at Team.

## Full Worked Example: Audrey's Farmhouse

**Kickoff governance conversation (30 minutes, April 2026):**

Plan tier decision:
- Team size: 4 core team members (owner, GM, marketing lead, operations lead)
- Shared Projects required: yes, all four need access
- Compliance requirements: none (hospitality, no PHI, no regulated data)
- Audit logs required: no
- Conclusion: **Team plan, 5-seat minimum (4 team + 1 for me)**, Standard seats for all. Premium seats not needed because no heavy Claude Code use on their side.

Billing:
- Claude Team subscription: Audrey's pays Anthropic directly at $25/seat × 5 = $125/month annual billing
- API usage: Not applicable at this time (may change if the n8n lead gen pipeline moves to production — triggered revisit in I06)
- Shared infrastructure: TBD at website rebuild (Vercel, potentially Supabase under my Upriver account temporarily, transitioning to Audrey's)
- Annmarie's work on the website build: Paid by me out of retainer, not by Audrey's

Privacy questions:
1. PHI or regulated data? No. Standard retention is fine.
2. Residency requirements? No. Standard US deployment.
3. Audit logs required? No.

Conclusion: Standard Team plan, no ZDR needed, no Enterprise trigger.

**Access map (initial, populated from kickoff + updated at I01 setup):**

```markdown
# Audrey's Farmhouse - Access Map

## Anthropic Claude Account
- Plan tier: Team
- Organization owner: owner@audreysfarmhouse.com
- Primary Owner role: [Audrey's owner]
- Members: 
  - gm@audreysfarmhouse.com — Member, added 2026-04-22
  - marketing@audreysfarmhouse.com — Member, added 2026-04-22
  - ops@audreysfarmhouse.com — Member, added 2026-04-22
  - joshua@upriverhv.com — Member, added 2026-04-22
- Subcontractors (temporary):
  - annmarie@[domain] — Member, added 2026-04-22, scheduled removal 2026-06-30

## Project Access
- Project: "Audrey's Farmhouse - Operating System"
- Can edit: owner, GM, marketing lead, me, Annmarie
- Can use: operations lead

## Connectors
- Gmail authorized by: owner, GM, marketing
- Drive authorized by: all four + me
- Calendar authorized by: owner, GM
- Cloudinary authorized by: marketing
- Mux authorized by: marketing
- Ahrefs authorized by: owner

## Claude Code / API
- Claude Code users: none (skipped per I06 decision tree)
- API keys: none

## Departure triggers
- If marketing lead leaves: revoke Cloudinary, Mux auth; rotate any skills that reference her specific asset access
- If GM leaves: revoke Gmail, Calendar auth; reassign inquiry routine owner
- If Annmarie's scope ends 2026-06-30: remove from Project, remove Drive access, confirm no other entanglements
```

**Client-tracker governance section:**

```
Plan: Team (5 seats, annual billing, $125/month)
Primary Owner: owner@audreysfarmhouse.com
Billing contact: [owner]
Privacy posture: standard (no ZDR, no custom retention)
My role: Member
SSO: not configured (team uses mix of business and personal domains; not worth the setup friction at this scale)
Audit logs: not available (Team tier)
Offboarding plan: at engagement end, remove me from org, transfer any Vercel/Supabase projects to Audrey's accounts, rotate API keys if any exist by then, keep client's Project and knowledge intact
Next governance review: 2026-07-22 (quarterly per I15)
```

**Incognito orientation:** Covered in the I01 handoff walkthrough. Flagged one specific case for GM: when a difficult wedding-client situation comes up and she wants to vent or brainstorm without that context becoming part of the venue's operating memory.

**Post-kickoff action items:**
- Audrey's owner: upgrade from Pro (which they were on) to Team, 5 seats, annual billing. Completed 2026-04-22.
- Me: verify 5 seats active, then proceed to I01.

That's I07 complete. Ready to produce I08 when you say continue.
