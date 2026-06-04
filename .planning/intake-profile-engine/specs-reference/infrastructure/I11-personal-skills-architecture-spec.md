# Spec I11: Personal Skills Architecture Spec

## What This Spec Is

This spec defines how I organize, maintain, version, and evolve my personal skill library. Skills are the single highest-leverage part of my Claude setup because a well-written skill turns a multi-step workflow into a one-command operation, and because skills compound: every new client engagement either reuses skills I already have or inspires a new one that gets added to the library. Without a deliberate architecture, skills accumulate as a random bag of files in `~/.claude/skills/` or `/mnt/skills/user/`, with duplicates, stale versions, inconsistent naming, and unclear ownership. With this spec, the library stays tight, every skill has documentation, and I know at any moment which skills are shareable, which are personal-only, and which are already deployed to which clients.

I15 handles the quarterly audit. I02 handles deployment to clients. This spec is the middle layer: how I actually run the library. It defines the folder structure, the naming conventions, the documentation standards, the creation workflow, and the retirement path. It also establishes the relationship between skills in my personal library and skills that get forked for clients per I02's three customization tiers.

## Quick Reference

| Field | Value |
|---|---|
| Doc number | I11 |
| Priority | High, build after I10 |
| Total length target | Fully documented skill library with folder structure, manifest, and maintenance rules |
| Time to produce | 2-3 hours for initial library audit and organization; ongoing per-skill work as the library evolves |
| Delivery format | Organized skill library in `/mnt/skills/user/` plus `clients/` subfolder for client forks, plus a manifest doc |
| File naming | `skill-library-manifest.md` in the root of the skills directory or in my Obsidian vault |
| Prerequisite | I10 (Upriver Consulting Project exists so I can load the manifest as knowledge) |

## When This Document Gets Built

**Triggers:**

- The skill library has grown beyond 5-6 skills and I've lost track of what's where
- I'm about to onboard a new client and need to decide which skills get deployed (I02 depends on an organized library to make this decision fast)
- A skill has drifted into multiple versions and I'm unsure which is authoritative
- I want to document the library so it's not all in my head

**Blocks:**

- I02 (Client Skills Deployment) can't function cleanly if the library is disorganized
- I14 (Obsidian integration) references the skill library for cross-linking
- I15 (Audit spec) needs a baseline library state to audit against

## Section-by-Section Template

### 1. Folder Structure

The root of my skill library is `/mnt/skills/user/` in the shared filesystem I work with inside Claude, and the equivalent `~/.claude/skills/` on my MacOS workstation for Claude Code use. These two locations are kept in sync manually (via my `jbp` CLI as it matures, per I14).

**Top-level structure:**

```
/mnt/skills/user/
├── [skill-name]/                 # Personal/shared skills available to me
│   ├── SKILL.md                  # Required
│   ├── scripts/                  # Optional
│   ├── references/               # Optional
│   └── assets/                   # Optional
├── clients/                      # Client-specific forks
│   ├── [client-slug]/
│   │   ├── [skill-name]/
│   │   │   └── SKILL.md
│   │   └── deployment-log.md    # Per-client deployment history
└── skill-library-manifest.md    # The master manifest for the whole library
```

**The `clients/` subdirectory is critical.** Any skill I fork for a specific client lives under `clients/[client-slug]/` so it doesn't pollute the shared library and so I never accidentally push a client-specific version as an update to the master. Per I02's three customization tiers (no customization, config-only, full fork), full forks always land here.

### 2. Skill Categories

I organize skills mentally into five categories. The folder structure doesn't enforce the categories, but the manifest does.

**Category A: Universal shared skills.** Skills that work across any client archetype and are safe to deploy as-is. Current members: `stop-slop`.

**Category B: Industry-specific shared skills.** Skills built for a specific industry archetype. Most get deployed to clients in that archetype with config-only customization. Current members: `blog-post-publisher`, `vendor-content-writer`, `venue-content-writer`, `wedding-venue-research`, `pictime-gallery-downloader`.

**Category C: Internal builder skills.** Skills I use to build client deliverables, run audits, or produce specs. Never deployed client-facing. Current members: `idea-to-app`, `expert-audit`, `frontend-audit`, `backend-audit`, `app-deploy`, `find-skills`, `frontend-design`, `web-design-guidelines`, `vercel-react-native-skills`.

**Category D: Client-specific forks.** Skills under `clients/[client-slug]/`. Current members: depends on active engagements.

**Category E: Experimental or in-development.** Skills I'm iterating on that aren't ready for production. Either in `/mnt/skills/user/_dev/[skill-name]/` (prefix underscore to indicate development) or not yet moved into the user skills directory at all.

### 3. Naming Conventions

**Skill folder names.** Kebab-case, 1-64 characters, descriptive action or domain verb-noun. Examples: `blog-post-publisher` (action-object), `wedding-venue-research` (domain-purpose), `stop-slop` (action). Avoid: `jb-tool`, `helper`, `v2-blog-post-publisher`.

**Client-fork prefix.** For any fork under `clients/[client-slug]/`, the skill folder still uses the original name without the client prefix, because the folder hierarchy already scopes it. Example: `clients/audreys-farmhouse/blog-post-publisher/` not `clients/audreys-farmhouse/audreys-blog-post-publisher/`. The client is implicit from the path.

**When a fork is packaged for deployment (ZIP per I02).** The deployed filename takes the client prefix so it's unambiguous in the client's Settings > Skills list. `audreys-blog-post-publisher-v1.0.zip` is what gets uploaded to the client's account.

**Version numbers.** Every SKILL.md frontmatter has a version field in semver. v1.0 is first stable release. v1.1 is a minor change. v2.0 is a breaking change (different invocation phrase, different required inputs, different outputs).

### 4. SKILL.md Documentation Standard

Every skill, regardless of category, has a SKILL.md that follows a consistent structure. The YAML frontmatter is what Claude actually reads to decide when to load the skill; the markdown body is the instructions Claude follows once the skill is invoked.

**Required frontmatter fields:**

```yaml
---
name: skill-name-in-kebab-case
description: One-to-two-sentence description that includes likely user trigger phrases. Claude under-triggers skills, so write descriptions that surface clearly when a user asks for something matching this skill. Use phrases like "Use when..." or "Triggers on...".
version: 1.2
category: A | B | C | D | E
compatibility: claude-code, claude.ai, cowork  # where the skill works
---
```

**Markdown body structure:**

```markdown
# Skill Name

## What this does
[2-3 sentences describing the workflow from the user's perspective]

## When to use it
[Bullet list of 3-6 trigger scenarios; also the phrases that should surface this skill]

## Inputs
[What the user needs to provide when invoking; any files, URLs, or parameters]

## What it produces
[The output format, where it saves, what the user gets]

## Workflow
[Step-by-step what the skill does when invoked, including any sub-skills or scripts it calls]

## Configuration
[Any config values in scripts/ or references/ that might need to be updated per client or per use]

## Known limitations
[Things the skill doesn't handle; edge cases]

## Changelog
[Version history: v1.0 date reason, v1.1 date reason, etc.]
```

**Description field discipline.** Anthropic's engineering team explicitly flags that Claude under-triggers skills. The description field is the highest-leverage place to fix this. I write descriptions that are slightly pushy: "Use this skill whenever..." rather than "A tool for..." The description has to match the phrases the user (or I) will actually say.

### 5. Skill Creation Workflow

When I identify a repeatable workflow that would benefit from being a skill, I use the `skill-creator` skill (from the examples in `/mnt/skills/examples/skill-creator/`) to build the new one. The workflow:

**Step 1: Confirm the workflow is worth a skill (2 minutes).** The bar: repeated at least three times a month or likely to be repeated once a week going forward. Less than that isn't worth the skill authoring cost; I just run the workflow manually with a prompt template.

**Step 2: Pick a category (1 minute).** A (universal), B (industry), C (builder), D (client-specific fork), or E (experimental).

**Step 3: Invoke `skill-creator` (20-30 minutes).** Walks me through a structured interview, produces a first-pass SKILL.md. I refine.

**Step 4: Test the skill live (15 minutes).** Invoke it in a real conversation against a real workflow. Adjust the description and body based on how it actually performs.

**Step 5: Add to manifest (5 minutes).** Update `skill-library-manifest.md` with the new skill's entry.

**Step 6: If it's a category D client fork (additional 10 minutes).** Add deployment entry to `clients/[client-slug]/deployment-log.md` per I02.

### 6. Skill Update Workflow

When a skill needs to change:

**Minor update (v1.1, v1.2).** Description tweak, additional trigger phrase, small behavioral adjustment. I edit SKILL.md directly, bump version in frontmatter, update changelog, save. If deployed to clients, the update either propagates automatically (Team plan org-shared) or I notify them to re-upload (per I02's update propagation paths).

**Major update (v2.0).** Different invocation phrase, different inputs, different outputs, or a breaking change. I treat this as a near-new skill. Write a new SKILL.md as if from scratch, test thoroughly, bump to v2.0, update changelog. If deployed, I explicitly notify clients of the breaking change and coordinate the rollout.

**Retirement.** When a skill no longer gets invoked or has been replaced by a better version, I move it to `/mnt/skills/user/_retired/` rather than deleting. Retired skills stay accessible for reference for 6 months, then get deleted during the next quarterly audit. Retirement reason goes into the changelog.

### 7. Shared vs. Personal vs. Client-Specific

Each skill is marked in the manifest as one of:

- **Shared**: deployable to any client, no customization needed. Category A.
- **Industry**: deployable to clients in a specific archetype, possibly with config-only customization. Category B.
- **Personal/internal**: never deployed to clients. Used by me for consulting work. Category C.
- **Client-specific**: exists only for a specific client. Category D, lives under `clients/`.
- **Experimental**: in development, not ready for production. Category E.

When I add a new skill, I explicitly mark the category. When I promote a skill (e.g., from experimental to industry), I update the manifest and move the folder if needed.

### 8. The Skill Library Manifest

The manifest is the single doc that describes the whole library. It lives at `/mnt/skills/user/skill-library-manifest.md` and is the source of truth for what skills exist, what they do, and where they're deployed.

```markdown
# Upriver Consulting Skill Library Manifest

Last updated: [date]
Total skills: [count]

## Category A: Universal Shared Skills

### stop-slop (v1.2)
- Purpose: removes AI writing patterns from prose
- Deployed to: all active clients
- Location: /mnt/skills/user/stop-slop/
- Last updated: [date]

## Category B: Industry-Specific Shared Skills

### blog-post-publisher (v1.3)
- Purpose: full SEO blog writing + WordPress publishing pipeline for joshuabrownphotography.com and Upriver Hudson Valley blog
- Industry: wedding, photography, any WordPress-backed client
- Deployed to: Audrey's Farmhouse (forked), joshuabrownphotography.com (direct)
- Location: /mnt/skills/user/blog-post-publisher/
- Last updated: [date]

### vendor-content-writer (v1.1)
[...]

### venue-content-writer (v1.2)
[...]

### wedding-venue-research (v1.0)
[...]

### pictime-gallery-downloader (v1.0)
[...]

## Category C: Internal Builder Skills

### idea-to-app (v1.0)
- Purpose: turns a raw app idea into a complete spec suite + Claude Code kickoff prompt
- Internal use only; never deployed client-facing
- Last invoked: [date]
[...continue for expert-audit, frontend-audit, backend-audit, app-deploy, find-skills, frontend-design, web-design-guidelines, vercel-react-native-skills]

## Category D: Client-Specific Forks

### audreys-farmhouse/blog-post-publisher (v1.0, forked from blog-post-publisher v1.3)
- Customization: WordPress URL swapped to audreysfarmhouse.com, Cloudinary account set to audreys-farmhouse
- Deployed: 2026-04-22
- Diverged from master: yes (no auto-propagation; manual review when master updates)

### audreys-farmhouse/inquiry-responder (v1.0, new)
- Purpose: drafts first-reply to HoneyBook inquiries using Docs 03 and 07
- Client-specific: yes
- Deployed: 2026-04-22

### audreys-farmhouse/voice-check (v1.0, new)
- Purpose: reviews text against Audrey's Brand Voice Guide
- Client-specific: yes
- Deployed: 2026-04-22

### audreys-farmhouse/monthly-content-brief (v1.0, new)
[...]

## Category E: Experimental / In-Development

### _dev/lead-enrichment (v0.3)
- Purpose: enriches a contact record with business info via web search
- Status: testing; reliability needs work before promotion
- Next decision point: [date]

## Retired

### _retired/[skill-name] (last v)
- Reason retired: [date + reason]
- Delete after: [date]
```

### 9. Cross-Surface Skill Availability

Some of my skills work in multiple Claude surfaces (claude.ai, Claude Code, Cowork). I track this in the skill's frontmatter via the `compatibility` field.

**Claude.ai-only skills.** Most content-generation skills (blog publisher, content writers) are claude.ai-focused. They might technically work in Claude Code but the context is wrong.

**Claude Code-focused skills.** The audit skills (`expert-audit`, `frontend-audit`, `backend-audit`, `app-deploy`) are primarily invoked in Claude Code against real codebases. They can work in claude.ai but lose the "operate against the actual repo" capability.

**Cowork-focused skills.** Some routines from I12 invoke specific skills during Cowork execution. Those skills need to be present in my Claude Desktop's skill list, which is automatic for skills I've uploaded to my Claude account.

**When a skill's surface changes.** If I build a skill originally for claude.ai and later want it in Claude Code, I update the compatibility field, test it in the new surface, and add any surface-specific considerations to the SKILL.md body.

### 10. The `jbp` CLI Integration

My personal workflow CLI (in development, documented more fully in I14) will eventually automate several parts of this skill library:

- `jbp skill new [name] [category]` — scaffolds a new skill folder with the SKILL.md template
- `jbp skill test [name]` — runs the skill against a canned test prompt and reports
- `jbp skill deploy [name] [client]` — packages the skill for client deployment per I02
- `jbp skill audit` — reports on the library state: stale skills, missing changelog entries, version drift between master and client forks
- `jbp skill sync` — syncs `/mnt/skills/user/` with `~/.claude/skills/` on the workstation

Until `jbp` is stable, I do these manually. The commands above are aspirational but capture the automation surface.

## How to Build This Document

**Step 1: Audit the current library (30 minutes).** Walk `/mnt/skills/user/`, list every skill, read every SKILL.md, note which have inconsistent or missing frontmatter, which are out of date, which aren't documented.

**Step 2: Create the folder structure (15 minutes).** If it doesn't already exist: add `clients/`, `_dev/`, `_retired/` subdirectories. Move any misplaced skills into the right location.

**Step 3: Standardize every SKILL.md (10-20 minutes per skill).** Update frontmatter, add version, add changelog, tighten descriptions. For skills that pass an audit cleanly, this is just confirming current state.

**Step 4: Build the manifest (1 hour).** Populate `skill-library-manifest.md` with all current skills, categorized, with their metadata.

**Step 5: Upload manifest to the Upriver Consulting Project (2 minutes).** Per I10, so Claude can answer "what skills do I have for X?" from inside the Project.

**Step 6: Set up the maintenance cadence.** Quarterly audit (per I15) reviews the whole library. Monthly: spot-check the manifest against actual library state. On creation or retirement: update the manifest immediately.

## Definition of Done

- [ ] `/mnt/skills/user/` folder structure exists with `clients/`, `_dev/`, `_retired/` subdirectories
- [ ] Every active skill has a SKILL.md with standardized frontmatter (name, description, version, category, compatibility)
- [ ] Every active skill has a markdown body covering the required sections (what it does, when to use, inputs, outputs, workflow, config, limitations, changelog)
- [ ] The skill library manifest exists and is current
- [ ] Manifest is uploaded to the Upriver Consulting Project knowledge base
- [ ] Client forks are under `clients/[client-slug]/` with deployment logs
- [ ] Retired skills are in `_retired/` with reason and deletion date
- [ ] The quarterly audit reminder is on my calendar

## Common Failure Modes

**Failure 1: Skill descriptions that don't match how I actually ask for the skill.** The description is what makes Claude auto-load the right skill when I ask for something. If my blog publisher skill's description says "generates blog posts" but I actually say "write up a post about X," the match might miss. I test trigger phrases against description fields when I create or update a skill.

**Failure 2: Letting client forks diverge silently.** I fork `blog-post-publisher` for Audrey's, customize it, deploy it. Six weeks later I update the master. The Audrey's version is now behind. Without a version-diff review process, I might accidentally overwrite Audrey's customizations when I update the master and push. The manifest tracks which client forks have diverged; quarterly audit reviews each for manual merge decisions.

**Failure 3: Category drift.** I build an internal audit skill (Category C), later decide it'd be useful for clients, deploy it without re-categorizing, never update the manifest. Six months later I don't remember whether `frontend-audit` is internal-only or deployable. The manifest is the source of truth; when a skill changes category, the manifest updates.

**Failure 4: Too many experimental skills.** I build three half-done skills in a month and leave them in `_dev/`. They accumulate. The quarterly audit forces a decision on each: promote to production, or delete. No skill stays in `_dev/` for more than one quarter.

**Failure 5: Missing changelog entries.** I update a skill, forget to bump version or note the change. Three weeks later I can't remember what I changed. Every skill update requires a changelog line; this is a muscle-memory discipline.

**Failure 6: Inconsistent skill packaging.** Per I02, deployed skills take the client prefix in the ZIP filename. I've sometimes forgotten this and shipped `blog-post-publisher-v1.0.zip` to a client instead of `audreys-blog-post-publisher-v1.0.zip`, which then conflicts with the master when I update it. The naming convention is non-negotiable at packaging time.

**Failure 7: Storing sensitive config inside SKILL.md.** API keys, client-specific URLs with credentials in them, personal access tokens. Any of this ends up in the skill library folder, including in ZIPs, and can leak. I configure skills to read secrets from environment variables or secrets managers, never from the SKILL.md itself.

**Failure 8: Not syncing between `/mnt/skills/user/` and `~/.claude/skills/`.** The shared filesystem and my local Claude Code skills directory drift if I edit one without updating the other. Until `jbp sync` exists, I do this manually whenever I touch a skill.

## Full Worked Example: My Current Skill Library (April 2026)

This is the actual state as of this writing.

**Library location:** `/mnt/skills/user/` (13 active skills, 0 currently retired, 0 currently in `_dev/`)

**Category breakdown:**

*Category A (universal shared):*
- `stop-slop` — Brand voice cleanup. Universal. Deployed to every client who produces content.

*Category B (industry-specific shared):*
- `blog-post-publisher` — SEO blog + WordPress publishing. Deployed to joshuabrownphotography.com directly; forked for Audrey's.
- `vendor-content-writer` — Wedding vendor ACF content. Used for joshuabrownphotography.com vendor pages.
- `venue-content-writer` — Wedding venue ACF content. Used for joshuabrownphotography.com venue pages.
- `wedding-venue-research` — Comprehensive venue research pipeline. Feeds `venue-content-writer`.
- `pictime-gallery-downloader` — Pic-Time to Cloudinary + Mux pipeline. Wedding/photography work.

*Category C (internal builder):*
- `idea-to-app` — Spec suite + Claude Code kickoff for new app ideas.
- `expert-audit` — 20-dimension exhaustive code audit.
- `frontend-audit` — 20-panel frontend design and UX audit.
- `backend-audit` — 20-panel backend and API audit.
- `app-deploy` — Vercel/Supabase deployment orchestration.
- `find-skills` — Helps discover and install new skills.
- `frontend-design` — Production-grade frontend creation.
- `web-design-guidelines` — UI code review against guidelines.
- `vercel-react-native-skills` — RN/Expo best practices.

*Category D (client-specific forks):*
- `clients/audreys-farmhouse/blog-post-publisher` (forked, WordPress URL customized)
- `clients/audreys-farmhouse/inquiry-responder` (new, client-specific)
- `clients/audreys-farmhouse/voice-check` (new, wraps Audrey's Doc 01)
- `clients/audreys-farmhouse/monthly-content-brief` (new, client-specific)

*Category E (experimental):*
- None active. (Any skills I'm currently drafting live outside the user skills directory entirely until they're ready for initial deployment.)

**Manifest file:** `/mnt/skills/user/skill-library-manifest.md`. Currently reflects the inventory above.

**Cross-sync status:** `/mnt/skills/user/` and `~/.claude/skills/` on my workstation are in sync as of this spec being written. Any skill edits I make in one location get propagated to the other manually within a day.

**Open items:**

- Write SKILL.md standardization pass on skills that predate this spec's frontmatter requirements. Most skills already have the required fields; a few need version numbers or compatibility fields added.
- Build out the `jbp` CLI commands for library management per Section 10.
- Consider promoting `vendor-content-writer` and `venue-content-writer` to universal shared (Category A) with config-only customization for non-wedding clients, since the ACF content pattern generalizes to many WordPress-based directory sites. Deferred decision.

**Quarterly audit:** Next one July 22, 2026. Will cover:

- Every SKILL.md reviewed for freshness
- Every client fork compared against its master for drift
- Experimental skills decisioned (promote or delete)
- Retired skills older than 6 months deleted

**Client deployment tracker example (from `clients/audreys-farmhouse/deployment-log.md`):**

```
2026-04-22 — Initial deployment (5 skills)
- stop-slop v1.2 (universal, no customization)
- audreys-voice-check v1.0 (custom, wraps Doc 01)
- audreys-blog-post-publisher v1.0 (fork of master v1.3, WordPress URL customized)
- audreys-inquiry-responder v1.0 (custom, references Docs 03 and 07)
- audreys-monthly-content-brief v1.0 (custom, references Docs 04 and 06)

Skills pending: audreys-social-scheduler (planned month 2, not yet built)

Next review: 2026-07-22 (quarterly per I15)
```

That's I11 complete. Ready to produce I12 when you say continue.
