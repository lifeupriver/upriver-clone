# Little Friends Loft: MCP server configuration (I04)

**Client:** Little Friends Loft  
**Date produced:** 2026-06-09  
**Prepared by:** Upriver Consulting  
**Prerequisite docs:** I01 (Project), I07 (plan tier and governance)

---

## 1. Universal connector baseline

Every client gets Google Drive, Gmail, and Google Calendar as the starting three. Little Friends Loft uses Google Workspace, so the Google stack applies.

**Critical constraint before any of these can be set up:** the Little Friends Loft Google Workspace is administered through the JCC, not by Rebecca directly. A JCC Workspace admin can block third-party OAuth at the org level. If that restriction is in place, all three baseline connectors fail at the OAuth step.

[NEEDS CONFIRMATION: Who administers the JCC Google Workspace instance? Is third-party app OAuth access permitted for Rebecca's account? This must be confirmed before the setup call, or the call cannot proceed to any Google connector.]

### Google Drive

- **Scope:** Read access to shared drive folders where working documents, curriculum materials, and enrollment files live. Write access only if a specific Doc 11 routine requires generating documents into a shared folder.
- **Workspace managed by:** JCC
- **OAuth credential holder:** Rebecca (director)
- **Planned use:** Content retrieval, curriculum document access, Google Forms response Sheets (forms export to a connected Sheet), and any Gusto export CSVs Linda drops into a shared folder if a payroll-summary routine is later configured.
- **JCC dependency note:** If the JCC changes org-level third-party app permissions, this connector stops working. Include a live test in the I03 monthly health-check routine.

### Gmail

- **Scope:** Read inbox, create drafts. No send without explicit approval. I never configure send-without-approval for any client.
- **Workspace managed by:** JCC
- **OAuth credential holder:** Rebecca (director)
- **Planned use:** Inquiry reading, draft replies, and notification routing for services that have no direct MCP (Brightwheel billing alerts, Sign-Up Genius confirmations, Google Business Profile review notifications).
- **JCC dependency note:** Same as Google Drive above.

### Google Calendar

- **Scope:** Read events, create events with prompts.
- **Workspace managed by:** JCC
- **OAuth credential holder:** Rebecca (director)
- **Planned use:** Scheduling routines, weekly calendar view, any routine that references the week ahead.
- **JCC dependency note:** Same as Google Drive above.

---

## 2. Industry-specific connectors (preschool/childcare archetype)

### Brightwheel (enrollment data and daily reports): route-around, no direct MCP

Brightwheel is the billing and daily-parent-report system (profile: "working well; keep this year"). No Brightwheel MCP exists.

**Decision:** Route-around via Gmail. Brightwheel sends notification emails to Rebecca's inbox when billing events or messages arrive. The Gmail MCP reads those notifications and surfaces data to Claude as needed.

**Route-around dependency:** This relies on Brightwheel's notification email format staying consistent. If Brightwheel changes their email template, any routine that parses those notifications may need updating. This dependency is logged in the connector reference doc and in the I15 quarterly audit checklist.

**Child data note:** Under this route-around, Claude reads Brightwheel notification emails only, not Brightwheel's database directly. This is consistent with the data residency requirement (US, per the profile's governance.dataResidency field, Newburgh NY under NYS OCFS) and with minimum-scope principles.

### Mailchimp (parent newsletter distribution)

A Mailchimp MCP is available. The profile notes the account exists but is "barely used."

[NEEDS CONFIRMATION: Does Doc 11 include a parent newsletter automation? If yes, connect Mailchimp now. If no newsletter routine is the actual planned ask, defer this connector until it is. The Doc 11 digest provided at artifact generation was one line with no automation list; this cross-reference must happen before the setup call.]

If connected:

- **Scope:** Read subscriber lists, create campaign drafts. No send without approval.
- **Credential holder:** Rebecca (director)
- **Planned use:** Parent newsletter drafts

### Slack (teacher communications, optional)

Slack is in use for the #photos channel and teacher communications across all teachers (profile: "all teachers"). A Slack MCP exists, though it is listed in the spec's professional-services archetype layer rather than the preschool archetype layer.

[NEEDS CONFIRMATION: Does Doc 11 include a Slack-dependent routine, for example a photo ingestion or teacher communications workflow? If yes, include Slack. If not, defer to avoid granting permissions on a channel that includes all teaching staff without a specific workflow need.]

If connected:

- **Scope:** Read messages in specified channels only (minimum scope: #photos or a specific named channel). Post with approval. I do not request read access to all channels.
- **Credential holder for org-level add:** Rebecca (director)
- **Per-user OAuth:** Each teacher (Tova, Carla, Dana, Yael as applicable per their Doc 11 role) completes their own OAuth after Rebecca adds the connector at org level.
- **Planned use:** To be confirmed against Doc 11.

---

## 3. Tools with no direct MCP: route-around decisions

### Instagram (@littlefriendsloft)

No official Claude MCP exists for Instagram. Additionally, the profile notes the account login is stored "in her head / a sticky note" (profile, credential holder: Rebecca). Before any Instagram-adjacent workflow is built, even a draft-only one, the credential needs to move to a password manager and 2FA needs to be enabled.

[NEEDS CONFIRMATION: Has the Instagram login been moved to a secure password manager and 2FA enabled? This is a prerequisite before any Instagram routine is configured, even draft-only.]

**Route-around:** Claude drafts Instagram captions, hashtag sets, and image descriptions as text output. Rebecca copies the draft into Instagram manually. No direct connector attempted at this time.

### Google Business Profile

The profile notes GBP was "claimed once, uncertain" (profile, credential holder: Rebecca). No direct Claude MCP for GBP.

[NEEDS CONFIRMATION: Is GBP currently claimed and active under Rebecca's Google account, or under the JCC account? If the claim is stale or under a JCC account, re-verify ownership before building any routine that depends on GBP review notifications or post drafting.]

**Route-around:** GBP sends notification emails for new reviews and messages. The Gmail MCP reads those. Claude drafts review responses and post copy. Rebecca posts manually.

**Route-around dependency:** If GBP changes its notification email format, any routine parsing those emails needs updating. Logged in I15 quarterly audit.

### Sign-Up Genius (tours and conferences)

No MCP available. Sign-Up Genius sends confirmation and response summary emails.

**Route-around:** Gmail MCP reads Sign-Up Genius confirmation emails. Claude surfaces response summaries.

**Route-around dependency:** Same format-change risk as Brightwheel and GBP notifications.

### Google Forms (events)

No MCP needed directly. Google Forms response data routes through a connected Google Sheet in Drive.

**Route-around:** Drive MCP reads the connected response Sheet once it is placed in a shared folder Rebecca has access to.

### Square Online (old website, point-of-sale)

Profile: "old site, low traffic; I do not think anyone finds us through it." No automation dependency identified.

**Decision:** Defer. No connector built until a specific workflow requires it.

[NEEDS CONFIRMATION: Confirm Square Online is not needed for any Doc 11 workflow. If enrollment or payment automations are planned, revisit.]

### Gusto (payroll)

Profile: "in progress, Linda (JCC bookkeeper) setting it up." No Gusto MCP exists. The setup is not complete and the credential holder is Linda (JCC), a third party.

**Decision:** Defer until Gusto is fully configured. If a payroll-summary routine is planned in Doc 11, the route-around is Linda exporting a summary CSV to a shared Google Drive folder that the Drive MCP reads.

[NEEDS CONFIRMATION: Is a payroll-summary routine planned in Doc 11? If yes, coordinate with Linda on an export-to-Drive workflow before building the routine.]

---

## 4. Scope and permissions

Principles I apply to every connector at this client:

**Read before write.** Unless a specific workflow requires write access, I ask for read-only. The maximum planned write access is Gmail draft creation and Calendar event creation. No connector is granted send or delete access.

**Minimum scope.** I review each OAuth consent screen with Rebecca before she clicks Authorize and select only the narrowest option that meets the planned workflows. If a consent screen offers "read and send email" when the workflow only needs "read email and create drafts," I select the narrower option.

**Reviewable.** Every connector, scope, and authorization date is logged in the connector reference doc in Section 7 so Rebecca knows exactly what Claude can access through each connector.

**Revocable.** All OAuth grants can be revoked in Claude settings or directly in each service's security settings. Revocation instructions are in each connector entry. For the Google connectors, there is also a JCC Workspace admin revocation path: if the JCC admin removes third-party app access org-wide, all three Google connectors stop working simultaneously.

**JCC revocation risk.** Because Drive, Gmail, and Calendar all authenticate through the JCC Workspace, the JCC admin holds a unilateral off switch on all three connectors. This dependency is documented in the credential review schedule and flagged in the I03 monthly health-check.

---

## 5. Plan tier and setup workflow

[NEEDS CONFIRMATION: Plan tier from I07 confirmed? The profile is silent on Team vs Pro. Default recommendation: Team, given multiple users (Rebecca, Tova, Carla, Dana, Yael, and potentially Linda for Drive access if a Gusto routine is configured) and the operational friction of repeating the full setup per user on Pro.]

[NEEDS CONFIRMATION: Who is the Anthropic account Owner? If Team, the Owner must be present for the org-level connector adds. If the JCC controls the Anthropic account billing, identify the JCC contact who holds Owner access.]

**Assuming Team plan, Owner = Rebecca:**

1. Rebecca (Owner) logs into Claude, navigates to Organization settings > Connectors.
2. For each connector: clicks Add (pre-built from directory, or custom URL for any future custom build), reviews OAuth scopes before clicking Authorize, completes the consent flow.
3. The connector is now available org-wide.
4. Each team member who needs it goes to Customize > Connectors, finds the connector, clicks Connect, and completes their own OAuth consent. Their OAuth authenticates as their own account in the external service, so Claude only accesses what that person is authorized to see.
5. Per conversation: each user clicks + > Connectors and toggles the connector on. This is not automatic and is the single most common source of "the connector isn't working" confusion. I cover this explicitly in the handoff.

**If Pro plan instead:** Each user (Rebecca first, then any teachers who need access) repeats the full add-and-OAuth flow individually. This is the main operational friction that Team plan eliminates.

---

## 6. Testing every connection

I do not declare a connector live until it passes a test prompt. A successful OAuth screen is not proof the connector works for the intended workflow.

| Connector | Test prompt |
|---|---|
| Gmail | "Show me the subject lines of my last 5 emails." |
| Google Drive | "List the files in [specific folder name, to be confirmed at setup]." |
| Google Calendar | "What's on my calendar next Monday?" |
| Mailchimp (if connected) | "List the subscriber count and the date of the last campaign for the Little Friends Loft list." |
| Slack (if connected) | "Show me the last 5 messages in the #photos channel." |

If a test fails I diagnose immediately before moving on. Common causes: expired auth, wrong scope selected at the OAuth step, a rate limit, or the JCC Workspace OAuth restriction from Section 1. I do not mark a connector done until the test passes.

---

## 7. Connector reference document

The content below is the `little-friends-loft-connectors-reference.md` template to be completed at setup and uploaded to the Little Friends Loft Claude Project knowledge base.

---

```markdown
# Little Friends Loft: connected services

Last updated: [FILL IN date]

## Google Drive
- Scope: Read access to shared drive folders: [FILL IN folder names at setup]
- Connected by: Rebecca [FILL IN full email] via JCC Google Workspace
- Used by: [FILL IN from Doc 11 automation list]
- JCC dependency: JCC Workspace admin can revoke third-party OAuth org-wide.
  If Drive stops working after a JCC IT change, verify permissions before
  assuming the connector itself is broken.
- Revoke: Claude Settings > Connectors > Google Drive > Disconnect, or
  Google Account > Security > Third-party access

## Gmail
- Scope: Read inbox, create drafts (no send without approval)
- Connected by: Rebecca [FILL IN full email] via JCC Google Workspace
- Used by: [FILL IN from Doc 11 automation list]
- Route-around dependencies:
  - Brightwheel notifications: if Brightwheel changes notification email format,
    any routine parsing those emails needs updating
  - Sign-Up Genius confirmations: same format-change risk
  - Google Business Profile review notifications: same format-change risk
- JCC dependency: same as Google Drive
- Revoke: Claude Settings > Connectors > Gmail > Disconnect, or
  Google Account > Security > Third-party access

## Google Calendar
- Scope: Read events, create events with prompts
- Connected by: Rebecca [FILL IN full email] via JCC Google Workspace
- Used by: [FILL IN from Doc 11 automation list]
- JCC dependency: same as Google Drive
- Revoke: Claude Settings > Connectors > Google Calendar > Disconnect

## Mailchimp (if connected)
- Scope: Read subscriber lists, create campaign drafts (no send without approval)
- Connected by: Rebecca [FILL IN full email]
- Used by: Parent newsletter drafts
- Revoke: Claude Settings > Connectors > Mailchimp > Disconnect

## Slack (if connected)
- Scope: Read messages in specified channels: [FILL IN channel names at setup];
  post with approval only
- Connected by (org-level): Rebecca [FILL IN full email]
- Per-user connections: [FILL IN which team members completed their own OAuth
  and for which channels]
- Used by: [FILL IN from Doc 11 automation list]
- Revoke: Claude Settings > Connectors > Slack > Disconnect

## Route-around dependencies (no direct MCP)

| Service | Method | Format-change risk | Last verified |
|---|---|---|---|
| Brightwheel | Gmail notification emails | Medium | [FILL IN] |
| Instagram | Draft-only, manual posting | N/A | N/A |
| Google Business Profile | Gmail notifications + manual posting | Medium | [FILL IN] |
| Sign-Up Genius | Gmail confirmation emails | Medium | [FILL IN] |
| Google Forms | Drive MCP reads connected response Sheet | Low | [FILL IN] |
| Gusto | Drive export CSV (deferred; configure if/when needed) | Low | N/A |
| Square Online | Not connected; no automation dependency identified | N/A | N/A |

## Revoking any connector

For Claude-managed connectors: Claude Settings > Connectors > [name] > Disconnect.

For Google connectors: also revocable at Google Account > Security >
Third-party access. If the JCC Workspace admin revokes access org-wide,
all three Google connectors (Drive, Gmail, Calendar) are affected at once.
Notify the Upriver consultant if that happens.

## Credential review schedule

- Quarterly: all connectors tested end-to-end per I15 audit cadence
- Monthly: check for expired tokens via the I03 health-check meta-routine
- Immediately: revoke any connector when the person who authorized it leaves
  the team; for JCC Workspace accounts, also notify the JCC Workspace admin
- JCC Workspace: if JCC makes changes to third-party app permissions, re-test
  all three Google connectors immediately

## Authorized-by map

| Connector | Authorized by | Email | Date authorized |
|---|---|---|---|
| Google Drive | [FILL IN] | [FILL IN] | [FILL IN] |
| Gmail | [FILL IN] | [FILL IN] | [FILL IN] |
| Google Calendar | [FILL IN] | [FILL IN] | [FILL IN] |
| Mailchimp | [FILL IN if connected] | [FILL IN] | [FILL IN] |
| Slack (org-level) | [FILL IN if connected] | [FILL IN] | [FILL IN] |

Next scheduled audit: [FILL IN per I15 quarterly cadence]
Next credential check: [FILL IN per I03 monthly health-check]
```

---

## Operator runbook

Steps to stand this up, drawn from the spec's "How to Build This Document," in order.

### Step 1: confirm plan tier and Owner identity (2 minutes)

Pull the plan tier decision from I07. If Team or Enterprise, confirm Rebecca is the Anthropic account Owner, or identify who is. If the JCC controls the Anthropic account billing, identify the JCC contact who holds Owner access and confirm they will be available for org-level connector adds.

If Pro, confirm which user is doing the setup and note that every additional user repeats the full flow individually.

[NEEDS CONFIRMATION: Plan tier from I07. Who is the Anthropic account Owner?]

### Step 2: determine the baseline and archetype connector list (10 minutes)

Pull the universal baseline (Drive, Gmail, Calendar) plus the preschool/childcare archetype layer. Cross-reference against the full Doc 11 automation list to confirm every planned automation has its connector represented.

The Doc 11 digest provided at artifact generation was one line with no automation list. This cross-reference must happen with the full Doc 11 before the setup call. Specifically:

- Does Doc 11 include a parent newsletter routine? If yes, add Mailchimp.
- Does Doc 11 include a Slack-dependent routine? If yes, add Slack.
- Does Doc 11 include a payroll-summary routine? If yes, coordinate the Gusto export-to-Drive workflow with Linda before the setup call.
- Does Doc 11 include any routine requiring write access to Drive or Calendar? If yes, revisit the read-only default and scope accordingly.

### Step 3: check MCP availability and JCC gate (10 minutes)

| Service | MCP status | Decision |
|---|---|---|
| Google Drive | Available | Connect; JCC gate must be cleared first |
| Gmail | Available | Connect; JCC gate must be cleared first |
| Google Calendar | Available | Connect; JCC gate must be cleared first |
| Mailchimp | Available | Connect if Doc 11 requires it; defer otherwise |
| Slack | Available | Connect if Doc 11 requires it; defer otherwise |
| Brightwheel | No MCP | Route-around via Gmail notifications |
| Instagram | No MCP | Draft-only; manual posting |
| Google Business Profile | No MCP | Route-around via Gmail + manual posting |
| Sign-Up Genius | No MCP | Route-around via Gmail notifications |
| Google Forms | No MCP | Route-around via Drive (response Sheets) |
| Gusto | No MCP, not fully set up | Defer until Gusto is live and Linda confirms access |
| Square Online | No MCP | Defer; no automation dependency identified |

[NEEDS CONFIRMATION: Contact the JCC Workspace administrator before the setup call to confirm third-party OAuth is permitted for Rebecca's account. This is a prerequisite for Drive, Gmail, and Calendar. If the JCC has restricted it, all three connectors block at the OAuth step and the setup call cannot complete the Google baseline.]

### Step 4: setup call with Rebecca (45-60 minutes)

[OPERATOR ACTION: Schedule a shared-screen call with Rebecca as the Anthropic account Owner (Team plan) or primary user (Pro plan). For each connector in scope: open Organization settings > Connectors (Team) or Settings > Connectors (Pro), review the OAuth consent screen scopes with Rebecca before she clicks Authorize, select the narrowest available scope, complete OAuth, run the live test prompt, confirm the test passes, and add the entry to the connector reference doc. Do not move to the next connector until the current one passes its test.]

[OPERATOR ACTION: On each OAuth consent screen that offers broader scopes than the planned workflow requires, select the narrower option and document which broader scopes were declined and why.]

For the Google connectors: Rebecca authenticates with her JCC Workspace Google account. The JCC OAuth gate from Step 3 must have been cleared before this call.

For Mailchimp (if in scope): Rebecca authenticates with her Mailchimp credentials (she holds them per the profile).

For Slack (if in scope): Rebecca adds at org level. Teacher per-user OAuth is handled in Step 5.

### Step 5: have each team member add their own connection (10 minutes per user)

[OPERATOR ACTION: After Rebecca adds each connector at org level, walk each team member who needs it through their own OAuth in Customize > Connectors. Per the profile: Tova (Twos lead), Carla (Threes lead), and Dana (Pre-K lead) may need Calendar or Slack if any routine runs under their accounts. Yael (Aftercare) and Linda (JCC bookkeeper) may need Drive if specific routines involve their data. Confirm which team members need which connectors from the Doc 11 assignments before scheduling these steps.]

[OPERATOR ACTION: Cover the per-conversation toggle with each user: after a connector is connected, they must click + > Connectors in each conversation and toggle it on. This is not automatic. Showing this once is not enough; walk through it and confirm they can do it themselves.]

### Step 6: build and upload the connector reference doc (15 minutes)

Fill in the `little-friends-loft-connectors-reference.md` template from Section 7 with actual folder names, authorization dates, authorized-by emails, and confirmed scope details.

[OPERATOR ACTION: Upload `little-friends-loft-connectors-reference.md` to the Little Friends Loft Claude Project knowledge base.]

### Step 7: update the client-tracker and credential review schedule (2 minutes)

Log in the client-tracker:

- Connectors live: [list after setup]
- Custom connectors: none planned
- Route-around dependencies: Brightwheel (Gmail), GBP (Gmail + manual), Sign-Up Genius (Gmail), Google Forms (Drive Sheets)
- JCC Workspace dependency: flag for quarterly I15 audit and monthly I03 health-check
- Authorized-by map: [from reference doc]
- Next audit: [date, quarterly per I15]
- Next credential check: [date, monthly per I03]

### Step 8: send handoff to Rebecca

Short email confirming which connectors are live, linking to the reference doc in the Project, walking through how to revoke any connector (Claude Settings > Connectors or Google Account > Security > Third-party access), and flagging the three route-around format dependencies (Brightwheel, GBP, Sign-Up Genius notification emails) that need to be monitored.

---

## Operator must do (cannot be generated)

The items below require action inside the client's Anthropic account, a third-party OAuth consent screen, or a direct coordination step that cannot be completed from a file.

- [ ] [OPERATOR ACTION: Confirm plan tier from I07 (Team vs Pro) and identify who holds Anthropic account Owner access before any setup work begins.]
- [ ] [OPERATOR ACTION: Contact the JCC Workspace administrator to confirm third-party OAuth is permitted for Rebecca's account. This is a prerequisite for Google Drive, Gmail, and Google Calendar. Do this before the setup call.]
- [ ] [OPERATOR ACTION: Cross-reference the full Doc 11 automation list against the connector roster before the setup call. Confirm whether Mailchimp, Slack, and a Gusto export workflow are in scope.]
- [ ] [OPERATOR ACTION: Schedule and conduct the shared-screen setup call with Rebecca. For each connector: open Organization settings > Connectors (Team) or Settings > Connectors (Pro), review OAuth scopes before Rebecca clicks Authorize, select narrowest scope, complete OAuth, run the test prompt, and confirm the test passes before moving on.]
- [ ] [OPERATOR ACTION: On each OAuth consent screen, select only the minimum scope needed for planned workflows. Document any broader scopes declined and why in the connector reference doc.]
- [ ] [OPERATOR ACTION: After org-level adds, walk each team member (Tova, Carla, Dana, Yael as applicable per Doc 11 assignments) through their own OAuth in Customize > Connectors.]
- [ ] [OPERATOR ACTION: Demonstrate the per-conversation toggle (+ > Connectors) to Rebecca and each team member who completes OAuth. Confirm they can do it unassisted.]
- [ ] [OPERATOR ACTION: Complete all fields in `little-friends-loft-connectors-reference.md` (folder names, authorized-by emails, authorization dates, confirmed scopes) and upload the file to the Little Friends Loft Project knowledge base.]
- [ ] [OPERATOR ACTION: Confirm with Rebecca that the Instagram login has been moved from the sticky note to a password manager and that 2FA is enabled before any Instagram-adjacent routine is built.]
- [ ] [OPERATOR ACTION: Confirm Google Business Profile ownership (Rebecca's personal Google account vs JCC account) and re-verify the GBP claim if uncertain. Do this before any review-response or post-drafting routine is configured.]
- [ ] [OPERATOR ACTION: Coordinate with Linda (JCC bookkeeper) on a Gusto export-to-Drive workflow if Doc 11 includes a payroll-summary routine, after Gusto setup is complete.]
- [ ] [OPERATOR ACTION: Send the handoff email to Rebecca per Step 8 of the runbook, confirming live connectors, linking to the reference doc, and walking through the revocation path.]
