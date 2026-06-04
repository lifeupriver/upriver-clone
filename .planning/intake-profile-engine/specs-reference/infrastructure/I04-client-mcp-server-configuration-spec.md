# Spec I04: Client MCP Server Configuration Spec

## What This Spec Is

This spec defines which MCP servers (Anthropic calls them Connectors in the consumer UI) each client should connect to their Claude account, the setup workflow for each, and the governance around what Claude can actually access via those connectors. MCPs are the bridge between Claude and the rest of the client's business stack. Without them, Claude is a very smart language model talking to the client's project knowledge in isolation. With them, Claude can read the client's inbox, draft events on their calendar, pull data from Ahrefs, and write to their CMS.

Without this spec, MCP setup is wildly inconsistent across clients. One venue has Gmail and Calendar connected but not Google Drive. Another has Ahrefs but not the Google Business Profile work needed for the weekly routine to run. A third has a custom MCP pointing at their booking system that works great until the OAuth token expires and nobody notices. With this spec, every client gets a baseline connector set on day one, industry-specific connectors layered on based on their archetype, and a governance layer that keeps auth fresh and access scoped.

Two things to be clear about from the top. First, MCPs run from Anthropic's cloud infrastructure, not from the client's device. This means the MCP server has to be publicly reachable on the internet. This matters when a client asks whether their on-prem CRM can be connected (usually not without extra infrastructure). Second, on Team and Enterprise plans, only Owners can add custom connectors at the organization level; individual team members then connect and toggle per-conversation. This shapes the whole setup workflow and is the reason I recommend Team plan for most engagements.

## Quick Reference

| Field | Value |
|---|---|
| Doc number | I04 |
| Priority | Critical, build early (before I03 because routines depend on connectors) |
| Total length target | Baseline set of 3-4 universal MCPs plus 2-4 industry-specific MCPs per client |
| Time to produce | 60-90 minutes per client for initial setup including per-connector testing |
| Client time required | 30-45 minutes (OAuth consent screens, granular permission reviews, test prompts) |
| Delivery format | Connected and tested MCPs in the client's account, a connector reference doc in the Project knowledge base, and a credential review schedule |
| File naming | `[client]-connectors-reference.md` in the client's Project knowledge base |
| Prerequisite | I01 (Project exists), I07 (plan tier and governance decisions made) |

## When This Document Gets Built

**Triggers:**

- Client Project is live
- Plan tier decision from I07 is confirmed (required because Team/Enterprise workflow differs materially from Pro)
- At least three automations planned in Doc 11 that depend on external data sources
- The client's team can identify which services they actually use (no point connecting Gmail if they run on Outlook)

**Blocks:**

- I03 (Routines) can't schedule any automation that relies on a connector until that connector is live
- Any skill that invokes an external service (blog publisher calling WordPress, inquiry responder pulling from HoneyBook notifications in Gmail) is blocked until the underlying connector is connected
- Doc 12 (Measurement KPI Framework) dashboards that pull live data depend on the source connectors being stable

## Section-by-Section Template

### 1. Universal Connector Baseline

Every client, regardless of industry, gets the same baseline set. These are the MCPs that support the widest range of work across any archetype.

**Google Drive.** Read access to the client's shared drive folders where their content, brand assets, and working documents live. The baseline scope is read-only for most clients; write access only gets added when a specific workflow requires it (e.g., generating a weekly report doc that writes into a shared folder).

**Gmail.** Read and draft-create access. Claude reads inbound inquiries, drafts replies, and sends nothing without explicit approval. I never configure send-without-approval for any client.

**Google Calendar.** Read events, create events with prompts. Used for the client's internal scheduling (routines that look at the week ahead) and for any workflow that involves booking meetings with prospects via scheduling tools integrated with Calendar.

These three are the floor. If the client uses Microsoft 365 instead of Google, I swap to Outlook, OneDrive, and Microsoft Calendar equivalents (connector availability permitting).

### 2. Industry-Specific Connector Layers

On top of the baseline, I layer in connectors matched to the client archetype.

**Wedding venue archetype (Audrey's Farmhouse pattern):**

- *Cloudinary.* Photo asset management. Claude reads the asset library when producing content, references specific images by ID when writing posts that need photos.
- *Mux.* Video asset management. Same role as Cloudinary but for video embeds.
- *Ahrefs.* Monthly and quarterly SEO pulse routines depend on this.
- *Google Business Profile (via available MCP or via the Gmail-based GBP notification pattern if no direct MCP exists).* Used for weekly post draft generation.

**Content-heavy clients (any industry that publishes regularly):**

- *WordPress (direct or via REST API connector).* For the blog post publisher skill and any routine that writes drafts.
- *Ahrefs.* For SEO tracking.
- *Canva.* For design asset generation tied to the content calendar.

**Contractor / home services:**

- *CRM MCP (JobNimbus, ServiceTitan, JobTread, Housecall Pro — depending on what the client uses).* Lead pipeline data.
- *QuickBooks MCP.* Financial summaries in monthly reports.
- *Google Ads MCP.* Ad performance data for the monthly report.

**Preschool / childcare:**

- *CRM MCP (LineLeader, Procare, or the client's equivalent).* Enrollment pipeline data.
- *Mailchimp or ConvertKit MCP.* Parent newsletter distribution.

**Restaurant:**

- *OpenTable MCP or POS MCP.* Reservation patterns and check averages.
- *Canva MCP.* For recurring social post design.

**Professional services:**

- *HubSpot, Salesforce, or Pipedrive MCP.* CRM pipeline data.
- *Slack MCP.* For internal team-visibility routines.

### 3. Custom Connectors (When an Official One Doesn't Exist)

When the client uses a service that doesn't have a pre-built MCP, there are three paths:

**Path 1: Wait for an official MCP.** The MCP ecosystem is growing fast. If the service is widely used, a Claude-verified or official MCP is likely coming. I check quarterly; the audit spec (I15) formalizes this cadence.

**Path 2: Build a custom MCP pointed at the service's public API.** If the service has a public API and the workflow is valuable enough to justify the build effort, I work with Louis (automations lead) or Annmarie (technical implementation) to build a small MCP server. Hosting goes on a small Vercel or Cloudflare Workers deployment. This requires OAuth setup if the service uses OAuth, or bearer-token auth if the service uses API keys.

**Path 3: Route around it.** If building a custom MCP is overkill, I use the Gmail MCP to read notification emails from the service, or the Google Drive MCP to read exported data files the client drops into a folder. This is the pattern for services that send notifications (HoneyBook inquiry emails) but don't have a direct MCP.

### 4. Scope and Permissions Discipline

Every MCP connection requires an OAuth consent screen where Claude asks for specific scopes. I review these scopes with the client before they click "Authorize."

**Principles:**

- *Read before write.* Unless a specific workflow requires write access, I ask for read-only. This limits blast radius if a prompt injection or misconfigured routine tries to modify data.
- *Minimum scope.* If the client only needs Gmail to read inquiries from HoneyBook, I don't also grant access to send emails on their behalf. Even if that blocks a future routine, we revisit it when that routine is the actual ask.
- *Reviewable.* Every connection and scope gets logged in the connector reference doc so the client knows exactly what Claude can do with each connector.
- *Revocable.* All OAuth grants can be revoked by the client at any time, either in Claude's settings or directly in the third-party service's security settings. I document how to revoke in the reference doc.

### 5. Team vs. Pro Plan Setup Workflow

The setup workflow differs meaningfully between plan tiers.

**Team or Enterprise plan (my default recommendation):**

1. Owner logs into Claude, navigates to Organization settings > Connectors.
2. Owner clicks Add, enters the connector URL (for custom) or clicks the pre-built connector from the directory.
3. Owner completes the OAuth consent flow if required.
4. The connector is now available organization-wide.
5. Individual users go to Customize > Connectors, find the connector, click Connect, complete their own OAuth consent (because access is scoped to each user's permissions in the external service).
6. In each conversation, users click + > Connectors to toggle the connector on per-conversation.

The critical point: on Team and Enterprise, the Owner-level "Add" is a one-time admin step, but each user still completes their own OAuth. This is intentional and correct. It means Claude can only access data that the specific user is authorized to see in the connected service.

**Pro plan:**

1. User logs into Claude, navigates to Settings > Connectors.
2. User clicks Add, enters URL or selects from directory.
3. User completes OAuth.
4. Connector is available for this user only.
5. Per-conversation toggle via + > Connectors.

If a client has multiple users and is on Pro, each user repeats the entire setup. This is one of the operational frictions Team plan eliminates.

### 6. Testing Every Connection

I never declare a connector "done" without a live test. For each connector I set up, I run a short test prompt that exercises the actual tool the connector exposes:

- *Gmail test:* "Show me the subject lines of my last 5 emails."
- *Google Drive test:* "List the files in the [specific folder] folder."
- *Google Calendar test:* "What's on my calendar next Monday?"
- *Ahrefs test:* "Pull domain rating and top 3 keyword positions for [client domain]."
- *Cloudinary test:* "Show me the 10 most recently uploaded assets."

If the test fails, I diagnose immediately: expired auth, wrong scope, rate limit, connector outage. I don't move on until the test passes.

### 7. The Connector Reference Document

Every client gets a `[client]-connectors-reference.md` in their Project knowledge base documenting exactly what's connected, what it can do, and how to manage it.

```markdown
# [Client] - Connected Services

## Gmail
- **Scope:** Read inbox, create drafts (no send without approval)
- **Connected by:** [user email]
- **Used by:** Daily inquiry digest routine, inquiry responder skill
- **Revoke:** Settings > Connectors > Gmail > Disconnect, or Google Account > Security > Third-party access

## Google Drive
- **Scope:** Read access to shared drives [list folders]
- **Connected by:** [user email]
- **Used by:** Content library retrieval, asset lookup
- **Revoke:** Settings > Connectors > Google Drive > Disconnect

[... one section per connector]

## Credential Review Schedule
- Quarterly: every connector tested end-to-end (handled in I15 audit)
- Monthly: check for expired tokens via the weekly health-check routine
- Immediately: revoke any connector when the person who authorized it leaves the team
```

## How to Build This Document

**Step 1: Confirm plan tier and Owner identity (2 minutes).** If Team/Enterprise, confirm who the Owner is because they're the only one who can add org-level connectors. If Pro, confirm which user is doing the setup.

**Step 2: Determine the baseline and archetype connector list (10 minutes).** Pull from the universal baseline (Drive, Gmail, Calendar) plus the industry-specific layer. Cross-reference against Doc 11 to ensure every planned automation has its connectors represented.

**Step 3: Check MCP availability for each service (10 minutes).** For each service, confirm there's a working MCP. If not, go to the custom connector decision tree in Section 3 and pick a path (wait, build, route around). Note which connectors are custom for the client-tracker.

**Step 4: Walk through the setup call with the client (45-60 minutes).** This is a shared-screen call with the Owner (Team/Enterprise) or primary user (Pro). For each connector:
- Open the connector in Settings or Organization settings
- Review the scopes requested on the OAuth consent screen before the client clicks Authorize
- Complete OAuth
- Run the live test prompt
- Fix any issues
- Add the entry to the connector reference doc

**Step 5: If Team/Enterprise, have each user add their own connection (10 minutes per user).** After the Owner has added the connector org-wide, each team member who needs it completes their own OAuth. I walk them through it on a separate short call if needed.

**Step 6: Build the connector reference doc (15 minutes).** Fill in one section per connector using the template above. Upload to the Project knowledge base.

**Step 7: Document the credential review schedule in the client-tracker (2 minutes).** Quarterly audit per I15, monthly checks via the I03 health-check meta-routine.

**Step 8: Send handoff.** Short email to the client confirming which connectors are live, linking to the reference doc, and reminding them they can revoke any time.

## Definition of Done

- [ ] Plan tier workflow confirmed (Team/Enterprise org-level adds, or Pro individual adds)
- [ ] All baseline universal connectors (Drive, Gmail, Calendar or M365 equivalents) are connected and tested
- [ ] All industry-specific connectors for the client's archetype are connected and tested
- [ ] For Team/Enterprise: every team member who needs a connector has completed their own OAuth
- [ ] Every connector has passed its live test prompt
- [ ] Scopes are documented and match the minimum needed for planned workflows
- [ ] Connector reference doc exists in the Project knowledge base with one section per connector
- [ ] Client-tracker entry lists all connectors, who authorized each, and review schedule
- [ ] Client has been explicitly walked through how to revoke any connector
- [ ] Any custom connectors have been built, deployed, and tested (or an alternative path chosen)

## Common Failure Modes

**Failure 1: Forgetting that Team/Enterprise requires Owner to add before users can connect.** If I walk into a setup call with a non-Owner team member and try to add a connector, they see no Add button. I always confirm Owner identity and have them on the call (or available for a 5-minute screen share) for any org-level adds.

**Failure 2: Granting too-broad scopes.** If the OAuth consent screen offers "read and send email" when the workflow only needs "read email," I don't take the broader scope just because it's available. I always pick the narrowest option that meets the need. I've seen clients grant full calendar write access for a routine that only needed read, and then forget it.

**Failure 3: Skipping the live test prompt.** A connector can "authorize successfully" and still not work (rate limit, wrong scope, API version mismatch). The OAuth success screen is not proof that the connector does what the routine needs. Every connector gets a test prompt, no exceptions.

**Failure 4: Custom connector blind spot.** A client needs HoneyBook or Jobber or some niche CRM that doesn't have an MCP. I've sometimes said "we'll route around it via Gmail notifications" and then the notification format changes silently and the routine breaks. When I route around a missing MCP, I note the dependency on the notification format in the reference doc and add it to the quarterly audit checklist.

**Failure 5: Leaving a connector authorized after the person leaves the team.** Connectors are user-scoped. If the marketing lead who authorized Gmail leaves in six months, that Gmail connection is still live against their account. The client-tracker has a column for "authorized by" and a trigger in I15 to review when anyone leaves.

**Failure 6: Trying to connect a service that isn't reachable from Anthropic's cloud.** If the client's CRM is behind a VPN or on a private network, no MCP connection will work because Anthropic's cloud infrastructure has to reach the MCP server over the public internet. I check this in Step 3 and flag it before the setup call.

**Failure 7: Assuming the per-conversation toggle is automatic.** Even after a connector is connected, the user has to click + > Connectors and toggle it on per-conversation. Clients who don't know this assume the connector "isn't working." The reference doc explicitly shows where the toggle lives.

## Full Worked Example: Audrey's Farmhouse

**Plan tier:** Team. Owner is the venue owner. Four total users.

**Baseline connectors:**

- *Google Drive.* Read access to the "Audrey's Marketing" shared drive where the Content Library and working files live. Each user who needs it completes their own OAuth.
- *Gmail.* Read and draft-create. Connected by the owner at org level; GM and marketing lead each complete their own OAuth since they receive and respond to inquiries. The operations lead doesn't need Gmail.
- *Google Calendar.* Read and create events. Owner and GM connect; marketing lead does not.

**Industry-specific connectors:**

- *Cloudinary.* The `joshua-brown-photography` Cloudinary account's Audrey's folders are shared with their account. Read-only scope for Claude to reference asset IDs when generating content. Connected by the marketing lead.
- *Mux.* Video asset IDs for the venue film and documentary embeds. Read-only. Connected by the marketing lead.
- *Ahrefs.* Domain tracking for audreysfarmhouse.com and the competitor set from Doc 05. Read-only. Connected by the owner.
- *HoneyBook.* No direct MCP at this time, so Gmail notifications route around this. Documented as a route-around dependency in the reference doc.

**Custom connectors:** None built. We're using route-arounds for HoneyBook and the Google Business Profile workflow goes through Gmail notifications + manual posting after Claude drafts.

**Setup call flow (actual timeline):**

1. Owner on a 60-minute call. Covered Drive, Gmail, Calendar, Cloudinary, Mux, Ahrefs at org level. Each was added, OAuth'd, tested, documented.
2. Short 15-minute follow-up call with the GM: GM added Gmail and Calendar for her specific account.
3. Short 10-minute follow-up with the marketing lead: added Drive, Gmail, Cloudinary, Mux.

**Live test prompts:**

- Gmail: "Show me the subjects of the last 10 emails in the inbox." Passed.
- Drive: "List files in 'Audrey's Marketing > Content Library'." Passed.
- Calendar: "What's on the calendar next Tuesday?" Passed.
- Cloudinary: "Show me the 10 most recent uploads to the audreys-farmhouse folder." Passed.
- Mux: "List the 5 most recent video assets." Passed.
- Ahrefs: "Pull domain rating for audreysfarmhouse.com and top 3 keyword positions." Passed.

**Connector reference doc entry (excerpt):**

```markdown
## Gmail
- **Scope:** Read inbox, create drafts (no send)
- **Connected by:** owner@audreysfarmhouse.com, gm@audreysfarmhouse.com, marketing@audreysfarmhouse.com
- **Used by:** Daily inquiry digest routine, inquiry responder skill, weekly health check
- **Route-around dependency:** HoneyBook inquiry format. If HoneyBook changes their notification email template, the inquiry digest routine may need updating.
- **Revoke:** Customize > Connectors > Gmail > Disconnect, or Google Account > Security > Third-party access

## Ahrefs
- **Scope:** Read-only, domain audreysfarmhouse.com plus competitor domains from Doc 05
- **Connected by:** owner@audreysfarmhouse.com (org-level)
- **Used by:** Quarterly SEO pulse routine, ad-hoc competitor checks
- **Revoke:** Organization settings > Connectors > Ahrefs > Remove
```

**Client-tracker update:**

```
Connectors live: 6 (Drive, Gmail, Calendar, Cloudinary, Mux, Ahrefs)
Custom connectors: 0
Route-around dependencies: HoneyBook (via Gmail), GBP (via Gmail + manual posting)
Authorized-by map: [documented in connector reference doc]
Next audit: 2026-07-22 (quarterly per I15)
Next credential expiry check: 2026-05-22 (monthly via I03 health check)
```

That's I04 complete. Ready to produce I05 when you say continue.
