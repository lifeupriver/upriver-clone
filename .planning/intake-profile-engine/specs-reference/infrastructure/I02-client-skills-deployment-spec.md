# Spec I02: Client Skills Deployment Spec

## What This Spec Is

This spec defines which of my skills get deployed into each client's Claude environment, how they get there, how they stay in sync when I update them, and what to do when a skill needs to be customized for a specific client. Skills are the most leveraged part of my operating model. A well-deployed skill turns a repeatable task (blog post publishing, voice cleanup, vendor content research) into a one-command operation inside the client's own Claude account.

Without this spec, skills deployment is ad-hoc: I remember to give one client the blog publisher, I forget to give another client the stop-slop voice cleaner, and a third client ends up building their own broken version of something I already have. With this spec, every new client gets a curated starter set on day one, updates propagate cleanly, and client-specific customizations live in the right place without polluting my master skills library.

Skills in the Claude ecosystem are the same underlying standard across Claude.ai and Claude Code, but the deployment path is different for each. This spec covers the Claude.ai path (ZIP upload via Settings) in depth because that's where most clients live. It covers the Claude Code path briefly because only clients with a technical collaborator need that, and that case is fully handled in I06.

## Quick Reference

| Field | Value |
|---|---|
| Doc number | I02 |
| Priority | Critical, build right after I01 |
| Total length target | Starter skill set of 3-6 skills per client plus customization notes per skill |
| Time to produce | 30-60 minutes per client depending on how many skills need customization |
| Client time required | 10 minutes to accept, enable, and test each deployed skill |
| Delivery format | Skill ZIP files uploaded to the client's Claude account, plus a one-page skill reference sheet |
| File naming | `[skill-name]-v[major.minor].zip` for the packaged version; `[client]-skill-deployment-log.md` for my tracking |
| Prerequisite | I01 complete; client has code execution enabled in Settings > Capabilities |

## When This Document Gets Built

**Triggers:**

- Client Project (I01) is live and the client has confirmed they can access it
- Client has enabled code execution in Settings > Capabilities (required for skills to function)
- I have identified at least three skills from my library that match this client's workflow needs based on the kickoff questionnaire
- For Team plan clients: the organization owner has enabled Skills in Organization settings > Skills

**Blocks:**

- I03 (Client Routines) can't set up Cowork routines that depend on skills until those skills are installed
- I09 (Client Artifacts and Deliverable Templates) depends on certain skills being present to generate the artifacts
- Any deliverable where I've told the client "we'll automate this" is blocked until the automation skill is deployed

## Section-by-Section Template

### 1. Skill Inventory Decision

For each new client, I work through a decision table to determine which skills get deployed. The inventory is divided into three buckets.

**Bucket A: Universal skills (deployed to every client regardless of industry).**

- `stop-slop` — removes AI writing patterns from prose. Every client produces content, every client benefits.
- `brand-voice-check` — a skill I build per-client that loads their Brand Voice Guide (Doc 01) and reviews any pasted text against it. Technically this is a client-specific skill, but it's universal in that every client gets a version.

**Bucket B: Industry-specific skills (deployed based on client archetype).**

- Wedding venues: `vendor-content-writer`, `venue-content-writer`, `wedding-venue-research`, `pictime-gallery-downloader` (if they use Pic-Time)
- Content-heavy clients (any industry): `blog-post-publisher` (if they blog on WordPress)
- Service businesses: not many fits from my current library; more likely to build a custom skill for them

**Bucket C: Client-specific custom skills (built for this client only).**

- Whatever workflow is unique to this client that repeats more than three times a month. Example for Audrey's Farmhouse: a `venue-inquiry-responder` skill that drafts initial replies to HoneyBook inquiries pulling from their FAQ Bank.

**Bucket D: Internal-only skills (never deployed to clients).**

- `idea-to-app`, `expert-audit`, `backend-audit`, `frontend-audit`, `app-deploy`, `find-skills`, `skill-creator` — these are builder tools I use to run my consulting operation. No client has a use case for them.
- Any skill that references my personal infrastructure, credentials, or internal workflows.

### 2. Skill Packaging and Customization

**Packaging:** Every skill I deploy lives in a folder containing at least `SKILL.md`. For skills that use scripts or reference files, the folder also contains those. To deploy to Claude.ai, the entire folder is zipped (the ZIP must contain the folder, not just the files inside it).

**Customization tiers:**

- **No customization needed.** Deploy the skill as-is. Examples: `stop-slop` (works for any client). I zip it straight from my `/mnt/skills/user/` source and upload.
- **Config-file customization.** The skill's core logic is universal but it needs client-specific config (their WordPress URL, their Cloudinary account, their voice guide path). I copy the skill folder, edit the config file, zip, upload.
- **Full fork.** The skill needs substantial changes for this client's specific domain. I copy the skill, rename it to include the client prefix (e.g., `audreys-inquiry-responder`), modify the SKILL.md and any scripts, zip, upload. This becomes a client-specific skill and lives in my `/mnt/skills/user/clients/[client]/` folder in my own system for tracking.

**Versioning:** Every deployed skill gets a version number in the SKILL.md frontmatter. I use semver: v1.0 for first deployment, v1.1 for minor updates, v2.0 for breaking changes. The version shows up in the filename of the ZIP (`stop-slop-v1.2.zip`) so the client knows what they have.

### 3. Deployment Mechanics

**For Claude.ai (the primary path for most clients):**

1. Confirm code execution is enabled: Settings > Capabilities > Code execution.
2. Confirm Skills feature is enabled: Settings > Capabilities > Skills. On Team plans, an owner must have enabled this at the organization level first.
3. Navigate to Settings > Capabilities > Skills > Upload.
4. Upload the ZIP file.
5. Toggle the skill on.
6. Test the skill in a conversation inside the client's Project by invoking it (e.g., asking Claude to do the task the skill handles) or via `/skill-name` if the skill supports direct invocation.

**For Team plan clients specifically:** If the client has multiple users who all need the same skill, the owner can provision it organization-wide instead of each user uploading individually. Path: Organization settings > Skills > upload and share. Once shared, all users see it in their Shared section and can toggle it on. Shared skills are view-only, which is the behavior I want: the client's team can use the skill but not modify it, and when I push an update it propagates to all of them automatically.

**For Pro plan clients:** Each user uploads the skill to their own account. No sharing. This is one of the operational reasons I push Team plan for any client with more than one user.

### 4. Skill Reference Sheet Deliverable

After deployment, I hand the client a one-page reference sheet titled `[Client] - Your Claude Skills`. For each deployed skill, the sheet lists:

- Skill name
- One-sentence description of what it does
- How to invoke it (trigger phrases or slash command)
- A one-line example prompt
- Current version number
- Last updated date

The reference sheet is a PDF, and I also upload it to the client's Claude Project knowledge base as `your-claude-skills.md` so it's always retrievable from inside any conversation.

### 5. Update Propagation

When I update a skill in my master library (`/mnt/skills/user/`), updates propagate to clients through one of three paths:

**Path 1: Team plan, owner-provisioned skill.** I update the master, rebuild the ZIP, re-upload to the owner's organization skills. All users on the client team get the update automatically because shared skills push updates to recipients. This is the cleanest path.

**Path 2: Individual upload (Pro plan or un-shared on Team).** I update the master, rebuild the ZIP, send it to the client with a note. The client re-uploads. Manual step; I track which clients are behind.

**Path 3: Client-specific fork.** The fork diverges from the master over time. I maintain the fork as its own file in `/mnt/skills/user/clients/[client]/` and update it independently. When I update the master, I manually review whether the fork needs the same update. This is more work but it's the right pattern because the fork exists precisely because the client needed something different.

### 6. Maintenance and Retirement

**Quarterly audit (handled fully in I15).** Every quarter I review each client's deployed skills and ask: is this still being used? Is it still working? Is there a newer version? This prevents skills from rotting in client accounts.

**Retirement path.** When a skill is deprecated (I've built a better one, or the underlying integration broke), I notify the client, ship the replacement, and have them delete the old skill from their account. I never leave a broken skill sitting in a client's Claude for them to trip over.

## How to Build This Document

**Step 1: Review the kickoff questionnaire (5 minutes).** Look for signals about what the client does repeatedly. Blog posts? Inquiry responses? Content for specific venues or vendors? Each repeated workflow is a candidate for a skill.

**Step 2: Map to my skill inventory (5 minutes).** Cross-reference the client's needs against the four buckets above. Produce a list: universal skills this client needs, industry-specific skills this client needs, client-specific skills I'll need to build.

**Step 3: Prioritize the starter set (5 minutes).** The starter set is the skills I deploy on day one. Keep it to three to six. More than that and the client is overwhelmed. Fewer and they don't see the power. I choose skills with the fastest time-to-first-value.

**Step 4: Package each skill (5-15 minutes per skill).**
- For no-customization skills: copy folder from `/mnt/skills/user/[skill-name]/`, zip.
- For config-customization skills: copy folder, edit the config file (typically a line or two at the top of `SKILL.md` or a separate `config.md`), zip, rename to include client prefix if the config changes are substantial.
- For custom skills: build from scratch using the `skill-creator` skill, save to `/mnt/skills/user/clients/[client]/[skill-name]/`, zip.

**Step 5: Upload to the client's Claude (10 minutes, done on a shared call).** Walk through the upload path live so the client sees how it works. Upload each skill, toggle on, run a quick test in a conversation. On Team plans, upload to the organization level via Organization settings.

**Step 6: Build the reference sheet (10 minutes).** I keep a Canva template. Fill in each skill's name, description, invocation, example, version, date.

**Step 7: Upload reference sheet to Project knowledge base (2 minutes).** Also email the PDF to the client.

**Step 8: Log deployment (3 minutes).** Update my client-tracker with the skills deployed, versions, and deployment date. Also update `/mnt/skills/user/clients/[client]/deployment-log.md` with the full list for my reference.

## Definition of Done

- [ ] Code execution is enabled in the client's Claude account
- [ ] Skills feature is enabled (at organization level for Team/Enterprise plans)
- [ ] The client's starter skill set has been packaged with correct version numbers in ZIP filenames
- [ ] Each skill has been uploaded, toggled on, and tested with a live prompt
- [ ] Team plan clients have the shared skills provisioned at the organization level, not uploaded individually
- [ ] The skill reference sheet has been generated and handed to the client
- [ ] The reference sheet is uploaded to the client's Project knowledge base
- [ ] My `/mnt/skills/user/clients/[client]/deployment-log.md` reflects the deployment
- [ ] My client-tracker entry shows the deployed skills and versions
- [ ] Client has successfully invoked at least one skill in a test conversation while I'm watching

## Common Failure Modes

**Failure 1: Skills feature not enabled at the organization level on Team plans.** The owner has to enable Skills in Organization settings before any user can upload or use them. I've walked into deployment calls assuming this was done, only to find it wasn't. Now I check in Step 1 before I touch anything.

**Failure 2: Code execution not enabled.** Skills require code execution. If the client toggled code execution off (or it was never on), the skill uploads but does nothing. Always verify before uploading.

**Failure 3: Deploying too many skills on day one.** Six is my ceiling. Ten skills on day one means the client uses none of them because they don't know which one to reach for. Start with three to six that cover the highest-value repeated work and add more in weeks two through four as the client gets comfortable.

**Failure 4: Forgetting to include the client prefix on forked skills.** If I deploy `blog-post-publisher` as-is for a client without config changes, that's fine. If I fork it and customize for the client but leave the name unchanged, and then I update the master version and push the update, the client's customizations get overwritten. Forked skills always get a client prefix (`audreys-blog-publisher`).

**Failure 5: Shipping a skill that references my internal infrastructure.** Some of my skills reference `/mnt/skills/user/[other-skill]/` or my personal Cloudinary account or my `jbp` CLI. When I copy a skill to a client, I strip those references out or replace them with the client's equivalents. I've shipped skills where the client got an error about a path that doesn't exist on their system.

**Failure 6: No reference sheet.** Without the one-page reference, the client forgets which skills exist within a week. The skills sit there unused. The reference sheet is the lightweight artifact that keeps skills top of mind.

**Failure 7: Skipping the test invocation on the deployment call.** A skill can upload successfully and still not trigger because the description field doesn't match how the client actually phrases requests. I always run one real prompt before leaving the deployment call and adjust the description if the skill doesn't load.

## Full Worked Example: Audrey's Farmhouse

**Client context:** Team plan, four seats, wedding venue and boutique stays. Marketing lead produces blog posts and social content. Owner and GM field inquiries. All published content needs voice cleanup.

**Skill inventory decision:**

Universal bucket:
- `stop-slop` — voice cleanup on anything written
- `audreys-voice-check` — custom skill that loads Doc 01 (their Brand Voice Guide) and reviews pasted text against it

Industry-specific bucket (wedding venue archetype):
- `wedding-venue-research` — not deployed directly (this is a research skill I use to build content for them, not something they need)
- `blog-post-publisher` — deployed, customized for Audrey's WordPress

Client-specific bucket:
- `audreys-inquiry-responder` — new skill built specifically for Audrey's that drafts first replies to HoneyBook inquiries using the FAQ Bank (Doc 07) and Sales Process Map (Doc 03)
- `audreys-monthly-content-brief` — new skill that produces a monthly content brief pulling from SEO Keyword Strategy (Doc 06) and Content Library (Doc 04)

Internal-only bucket: skipped entirely.

**Starter set for day-one deployment:** 5 skills.

1. `stop-slop-v1.2.zip` (universal, no customization)
2. `audreys-voice-check-v1.0.zip` (custom, wraps Doc 01)
3. `audreys-blog-publisher-v1.0.zip` (forked from `blog-post-publisher`, configured for their WordPress URL and Cloudinary account)
4. `audreys-inquiry-responder-v1.0.zip` (custom, built with `skill-creator`)
5. `audreys-monthly-content-brief-v1.0.zip` (custom, built with `skill-creator`)

**Deployment path:** Team plan, so the owner provisions all five skills at the organization level. All four users (owner, GM, marketing lead, operations lead) see them in their Shared section and toggle on. When I ship `audreys-blog-publisher-v1.1.zip` with a bug fix in two weeks, I re-upload at the org level and all four users get the update automatically.

**Reference sheet entries:**

*Skill 1 — Stop Slop (v1.2)*
- What it does: Removes AI writing tells from any prose you paste in.
- How to invoke: Paste a draft and say "run stop-slop on this" or ask Claude to clean up AI writing patterns.
- Example: "Run stop-slop on this blog draft."
- Updated: 2026-04-22

*Skill 2 — Audrey's Voice Check (v1.0)*
- What it does: Reviews any pasted text against the Audrey's Brand Voice Guide and rewrites sections that violate the rules.
- How to invoke: "Voice check this."
- Example: "Voice check this Instagram caption before I post it."
- Updated: 2026-04-22

*Skill 3 — Audrey's Blog Publisher (v1.0)*
- What it does: Takes a blog post outline or draft and produces a WordPress-ready draft with SEO meta, alt text, and featured image suggestions.
- How to invoke: "Run the blog publisher for this draft."
- Example: "Run the blog publisher on this draft about fall wedding timelines."
- Updated: 2026-04-22

*Skill 4 — Audrey's Inquiry Responder (v1.0)*
- What it does: Drafts a first-reply email to a HoneyBook inquiry using the FAQ Bank and Sales Process Map. Produces a draft for human review; does not send.
- How to invoke: "Draft an inquiry response."
- Example: "Draft an inquiry response for this lead asking about June Saturday availability for 120 guests."
- Updated: 2026-04-22

*Skill 5 — Audrey's Monthly Content Brief (v1.0)*
- What it does: Produces a monthly content brief with three blog topics, six social post concepts, and two email newsletter themes, pulling from the SEO Keyword Strategy and Content Library.
- How to invoke: "Generate this month's content brief."
- Example: "Generate the July 2026 content brief."
- Updated: 2026-04-22

**Deployment log entry in `/mnt/skills/user/clients/audreys-farmhouse/deployment-log.md`:**

```
2026-04-22 — Initial deployment
- stop-slop v1.2 (universal, no customization)
- audreys-voice-check v1.0 (custom, points at /projects/audreys/01-brand-voice-guide.md)
- audreys-blog-publisher v1.0 (fork of blog-post-publisher, WordPress URL: audreysfarmhouse.com, Cloudinary account: audreys-farmhouse)
- audreys-inquiry-responder v1.0 (custom, references Docs 03 and 07)
- audreys-monthly-content-brief v1.0 (custom, references Docs 04 and 06)

Org-provisioned by: owner at 2026-04-22
Test invocation run: yes, stop-slop and audreys-inquiry-responder tested live on deployment call
Next review: 2026-07-22 (quarterly per I15)
```

**Client-tracker entry updated:**

```
Skills deployed: 5
Last skill deployment: 2026-04-22
Skills pending: audreys-social-scheduler (planned for month 2)
```

That's I02 complete. Ready to produce I03 when you say continue.
