# Spec I14: Obsidian + Claude Integration Spec

## What This Spec Is

This spec defines how my personal knowledge management system in Obsidian connects to my Claude-powered operating system. Obsidian is where I think. Claude is where I build. The two work well together, but only if the boundary between them is deliberate: what belongs in the vault, what belongs in a Project knowledge base, how they stay in sync, and which workflows move content across the boundary.

Without this spec, I end up with fragmented context. A client note lives in Obsidian, a client spec lives in `/mnt/project/`, a related decision lives in a Claude chat history. Six months later I can't remember where anything is. With this spec, the vault has a stable structure, the rules for what goes where are explicit, and the routines from I12 land in predictable locations. The vault becomes the private layer of my consulting practice's knowledge; the Claude Projects become the operational layer; the two cross-reference each other cleanly.

Obsidian isn't a hard dependency for my work. If I stopped using Obsidian tomorrow, most of the consulting system would still function. But as a thinking tool — capturing notes during calls, drafting posts before they become specs, archiving research threads — it's where my raw material lives. The Claude integration makes that raw material accessible when I need to turn it into polished output, and the spec boundaries prevent the vault from becoming a dumping ground.

## Quick Reference

| Field | Value |
|---|---|
| Doc number | I14 |
| Priority | Medium, build after I10 and I12 |
| Total length target | Documented vault structure, clear boundary rules, sync workflow, and `jbp` CLI integration path |
| Time to produce | 3-4 hours for initial vault cleanup and documentation; ongoing as the vault evolves |
| Delivery format | Reorganized Obsidian vault with documented structure, plus `my-obsidian-integration.md` reference doc |
| File naming | `my-obsidian-integration.md` in the Upriver Consulting Project knowledge base |
| Prerequisite | I10 (Upriver Consulting Project exists), I12 (routines library defined) |

## When This Document Gets Built

**Triggers:**

- Obsidian vault has grown beyond ~200 notes and I'm losing track of where things live
- Routines from I12 are writing to Obsidian and I want to codify the output directory convention
- I'm about to start using Obsidian more heavily for client work and want a boundary rule in place before habits form
- I want to eventually build the `jbp` CLI and need the vault structure to support it

**Blocks:**

- I12 routines depend on stable Obsidian paths
- Any future CLI automation depends on the vault structure being predictable
- Quarterly audit per I15 references the vault for stale-note review

## Section-by-Section Template

### 1. The Boundary: What Goes Where

The single most important rule of this spec is what belongs in Obsidian and what belongs in a Claude Project knowledge base.

**Belongs in Obsidian vault (private, local, thinking layer):**

- Raw capture: notes during calls, research while reading, half-formed ideas
- Personal journaling and daily notes
- Work-in-progress drafts before they're polished into deliverables
- Research threads that feed future deliverables
- Routine outputs (morning briefs, daily summaries, monthly reviews) per I12
- Meeting notes (from Granola or manually captured)
- Reference material I'm studying but haven't synthesized into specs yet

**Belongs in Upriver Consulting Project knowledge base (operational layer):**

- The 47 specs once polished
- Supporting reference docs (client-tracker, industry-playbook, etc.)
- The manifests (`skill-library-manifest.md`, `my-routines-library.md`, `my-mcp-stack.md`, `my-obsidian-integration.md`)
- Voice guides, pricing references, competitive positioning

**Belongs in client Project knowledge base (per I01):**

- Client-specific deliverables and the 18 AI Operating System docs for that client
- Never personal thinking notes, even about that client

**The boundary test.** "Would I be comfortable if my client or team opened this file and read it?" If yes, and it's operational, it belongs in a Project. If no, or if it's exploratory, it belongs in Obsidian. Drafts that are on their way from Obsidian to a Project cross the boundary when they're polished enough to stand on their own.

### 2. Vault Structure

The canonical structure I enforce:

```
~/Obsidian/
├── 00-daily/                      # Daily notes
│   └── YYYY-MM-DD.md
├── 01-inbox/                      # Ephemeral outputs from routines and captures
│   ├── morning-briefs/YYYY-MM-DD.md
│   ├── daily-summaries/YYYY-MM-DD.md
│   ├── weekly-plans/YYYY-Www.md
│   ├── captures/                  # Quick note captures
│   └── _review/                   # Things to process into permanent notes
├── 10-content-pipeline/           # Blog drafts and content ideation
│   ├── drafts/
│   ├── ideas/
│   └── research/
├── 20-client-work/                # Per-client folders, raw material only
│   ├── audreys-farmhouse/
│   │   ├── notes/
│   │   ├── meeting-recordings/
│   │   ├── research/
│   │   └── drafts/
│   └── [future-clients]/
├── 30-operations/                 # Business running
│   ├── monthly-reviews/
│   ├── quarterly-audits/
│   ├── spec-change-logs/
│   ├── subcontractor-checkins/
│   └── financial-notes/
├── 40-specs-drafts/               # Spec drafts before they're polished into Projects
│   ├── ai-operating-system/
│   ├── content-production/
│   └── infrastructure/
├── 50-reference/                  # Permanent reference notes (Zettelkasten-ish)
│   ├── concepts/
│   ├── tools/
│   ├── people/
│   └── industries/
├── 60-journal/                    # Personal journaling
├── 99-archive/                    # Everything past 30 days from inbox, plus retired notes
└── _templates/                    # Obsidian templates
```

**Numbering rationale.** Numeric prefixes control sort order. Inbox is 01 (near the top, reviewed daily). Client work is 20 (prominent, frequently accessed). Specs-in-progress are 40 (accessed weekly, less than client work). Reference is 50 (permanent, less urgent). Journal is 60 (personal, separate mental mode). Archive is 99 (always last).

**The `00-daily/` folder.** I use Obsidian daily notes as a thinking scratchpad. Each day starts a new note. Most content migrates to other locations within a week. Anything still in 00-daily after 30 days gets archived.

**The `01-inbox/_review/` subfolder.** Captures that need processing. When I take a quick note that doesn't fit anywhere yet, it lands in `_review/`. Weekly, I process the folder: promote notes to permanent locations, delete what's obsolete.

### 3. Naming Conventions Inside the Vault

**Daily notes:** `YYYY-MM-DD.md` (Obsidian default).

**Ephemeral outputs:** `YYYY-MM-DD.md` or `YYYY-Www.md` for weekly.

**Permanent reference notes (50-reference):** `kebab-case-descriptive-title.md`. Example: `mcp-server-stack.md`, `audreys-farmhouse-overview.md`, `cold-outreach-patterns.md`.

**Client work notes:** Inside `20-client-work/[client-slug]/notes/`, use descriptive filenames: `2026-04-15-onboarding-call.md`, `seo-audit-findings.md`, `pricing-discussion.md`. Date-prefix for meeting notes; topic-only for topical notes.

**Spec drafts:** Inside `40-specs-drafts/[suite]/`, use the spec number and short name: `I14-obsidian-integration-draft.md`. When polished, it gets copied (not moved) to `/mnt/project/` for loading into the Upriver Consulting Project. The Obsidian version stays as the working draft.

### 4. How Routines Write to the Vault

Per I12, several routines produce output in the vault. The convention:

- Every routine writes to a specific, documented path
- Every routine's output is markdown
- Every output has a consistent frontmatter:

```yaml
---
generated_by: routine_name
generated_at: 2026-04-22T07:30:00Z
routine_version: 1.2
sources: [Gmail, Calendar, client-tracker]
---
```

The frontmatter lets me (or the quarterly audit) trace any output back to its generating routine, and lets me spot when a routine is producing content that hasn't actually been used or referenced. The `sources` field flags when a routine depends on specific connectors — useful for catching stale routine behavior if a connector is revoked.

### 5. How Claude Accesses the Vault

**Option A: Direct path access via local filesystem MCP (Tier 3, per I13).** Claude Desktop has a filesystem MCP pointing at `~/Obsidian/`. This gives Claude read and write access to the vault from any conversation inside Claude Desktop. Used heavily: when I'm drafting a blog post in an Obsidian note and want Claude to extend it, I ask Claude to read the note directly rather than copy-paste.

**Option B: Copy specific files into the Project knowledge base.** For content I want to reference across many conversations without re-reading each time, I copy the file into the Upriver Consulting Project as knowledge. Example: I've copied `my-obsidian-integration.md` (this very doc, once it's finalized) into the Project.

**Option C: Manual paste into a conversation.** For one-off references, I just paste the relevant note content into the chat. Fine for occasional use.

**When to use which:**

- Editing or iterating on a note: Option A (direct access so changes persist to the vault)
- Using a note as ongoing context: Option B (copied into Project knowledge)
- One-time reference: Option C (paste into chat)

**The filesystem MCP permission model.** Every file operation Claude performs via the filesystem MCP requires my approval on the first run in a session (I can approve-for-session or approve-always-for-this-folder). This keeps Claude from mass-editing the vault without my awareness. I approve writes narrowly — specific subdirectories rather than the whole vault.

### 6. Sync Between Obsidian, Claude Projects, and Filesystem

The three locations where content might live:

1. Obsidian vault on my MacBook (`~/Obsidian/`)
2. Claude Project knowledge bases (Upriver Consulting, per-client Projects)
3. `/mnt/project/` shared filesystem accessed inside Claude conversations

These don't auto-sync. When I update a spec:

**Workflow for specs being authored/revised:**

1. Edit the spec draft in `40-specs-drafts/[suite]/` in Obsidian
2. When polished, copy to `/mnt/project/` (or equivalent local path that gets mirrored)
3. Re-upload to the Upriver Consulting Project knowledge base per I10's maintenance cadence
4. Keep the Obsidian version as the living draft for future edits

**Workflow for manifests (mcp stack, routines library, skills manifest):**

1. Edit in Obsidian (these typically live at the root of `30-operations/` or similar)
2. Copy to the relevant Project knowledge base
3. Update when underlying inventory changes

**What about `jbp sync`?** The aspirational `jbp` CLI command (per I11 Section 10) would automate this: when I flag a spec as "ready," `jbp` copies it to `/mnt/project/`, prompts for a Project re-upload, and logs the update. Until `jbp sync` exists, this is manual.

### 7. The `jbp` CLI and Obsidian

My personal workflow CLI (in development) integrates with the vault for several commands:

- `jbp note [title]` — creates a new note in `01-inbox/_review/` with templated frontmatter
- `jbp capture [text]` — appends a timestamped entry to today's daily note
- `jbp promote [file]` — moves a reviewed note from `_review/` to a permanent location based on type (content draft, client note, reference note)
- `jbp archive` — moves notes in `01-inbox/` older than 30 days to `99-archive/`
- `jbp vault audit` — reports on vault health: orphan files, empty folders, notes without frontmatter, broken links
- `jbp spec sync [spec-name]` — copies a polished spec from Obsidian drafts to `/mnt/project/` and prompts for Project re-upload

Until these exist, I do the equivalent manually. The commands are aspirational.

### 8. Personal Workflow Patterns

How I actually work across Obsidian and Claude:

**Morning.** Open Claude Desktop, read the morning brief (written to `~/Obsidian/01-inbox/morning-briefs/YYYY-MM-DD.md` by the routine per I12). The brief tells me what's on calendar, what's in inbox, and any overnight urgent items. I then open Obsidian and start the day's daily note, copying over the key items from the brief that I want to work on.

**During calls.** Granola MCP pulls meeting notes automatically. I also capture side notes in the current day's daily note via `jbp capture` (or manually). If the call is with a client, relevant action items migrate to `20-client-work/[client-slug]/notes/` after the call.

**Content drafting.** I draft blog posts in `10-content-pipeline/drafts/`. When a draft is ready, I open a Claude conversation inside the Upriver Consulting Project, give Claude read access to the draft file via filesystem MCP, and iterate. Claude edits in place when I grant write access; otherwise it suggests edits and I apply them in Obsidian.

**Spec authoring.** New specs start as drafts in `40-specs-drafts/infrastructure/`. I iterate with Claude inside the Upriver Consulting Project until the draft is polished. Then I copy to `/mnt/project/`, re-upload to the Project, keep the Obsidian draft as the living version.

**Client deliverable production.** I open the client's Project (not the Upriver master), produce the deliverable, save it to `20-client-work/[client-slug]/drafts/` in Obsidian for my records, and deliver to the client via their preferred channel.

**End of day.** Daily summary routine writes to `01-inbox/daily-summaries/`. I glance at it before closing the laptop; any open items get noted for tomorrow.

**Weekly.** The weekly plan routine writes to `01-inbox/weekly-plans/` on Monday. The weekly client tracker refresh writes an updated `client-tracker.md` that I review and that gets re-uploaded to the Project.

**Monthly.** Monthly business review writes to `30-operations/monthly-reviews/`. I read it, note any course-corrections, and mark the month done.

### 9. Vault Hygiene Rules

- Every note in `50-reference/` has at least one link to or from another note. Orphan reference notes are a signal that I didn't actually integrate the content; they get reviewed quarterly.
- Nothing stays in `01-inbox/_review/` for more than 7 days. Either it gets promoted or deleted.
- Daily notes older than 30 days that haven't been linked elsewhere get archived.
- Every file in `20-client-work/[client-slug]/` is tagged with the client slug in frontmatter so search can filter to that client cleanly.
- No credentials, API keys, or tokens ever go in the vault, period. Those live in 1Password.

## How to Build This Document

**Step 1: Audit current vault state (30-60 minutes).** Walk the current structure. Note what's there, what's orphaned, what doesn't fit the canonical structure.

**Step 2: Reorganize (1-2 hours).** Move files into the canonical structure. This is a one-time investment. Keep anything that doesn't clearly fit in `99-archive/` rather than deleting.

**Step 3: Configure the filesystem MCP in Claude Desktop (5 minutes).** Per I13; point at `~/Obsidian/`.

**Step 4: Write the reference doc (30-45 minutes).** `my-obsidian-integration.md` covering this spec's contents as adapted to current reality.

**Step 5: Upload to the Upriver Consulting Project (2 minutes).**

**Step 6: Document the boundary rules somewhere I'll see them.** Pinned note in Obsidian root, bookmark in Claude — whatever's sticky enough to remind me when I'm tempted to put client work in the wrong place.

**Step 7: Set up the weekly `_review` processing ritual.** Calendar 15 minutes on Friday afternoon to process `01-inbox/_review/`.

**Step 8: Update routine output paths.** If any I12 routines are writing to paths that don't match the canonical structure, update them.

## Definition of Done

- [ ] Vault follows the canonical structure from Section 2
- [ ] Filesystem MCP is configured in Claude Desktop with appropriate permissions
- [ ] `my-obsidian-integration.md` is in the Upriver Consulting Project
- [ ] Boundary rules are documented and visible where I'll see them
- [ ] All I12 routines write to canonical paths
- [ ] Weekly `_review` processing ritual is on my calendar
- [ ] No credentials or secrets live anywhere in the vault
- [ ] Every major folder has at least one file (structure is real, not aspirational)

## Common Failure Modes

**Failure 1: Client work leaking into Obsidian that should have stayed out.** A client shares a sensitive document; I drop it into `20-client-work/[client-slug]/`. It ends up in my local backup, potentially in cloud sync. Mitigation: for anything the client has marked confidential, I keep it in their Drive (which their MCP accesses) rather than my local vault. Only my notes about the engagement live in my vault.

**Failure 2: Personal content in client-adjacent notes.** I'm processing thoughts about a difficult client conversation in my journal, and I mention specifics. If the vault is ever compromised or shared, that's a professional risk. Personal reflections about clients belong in `60-journal/` with heavier access controls, not in `20-client-work/`.

**Failure 3: Letting the `_review` folder accumulate.** I capture ideas faster than I process them. `_review/` grows to hundreds of notes. Weekly processing is the only sustainable mitigation; without it the capture-to-promote pipeline dies.

**Failure 4: Spec drift between Obsidian draft and uploaded version.** I edit the Obsidian draft, forget to re-copy to `/mnt/project/`, forget to re-upload to the Project. Three weeks later I ask Claude about the spec and it returns outdated content. Fix: include re-upload as the explicit final step of any spec revision, not an optional follow-up.

**Failure 5: Orphan reference notes.** Notes in `50-reference/` that I wrote once and never linked to again. They're low-value (I wrote them but never used them) but they crowd search results. Quarterly audit flags and either deletes or links each orphan.

**Failure 6: Vault lock-in through Obsidian-specific features.** Heavy use of Obsidian plugins (Dataview queries, Canvas, etc.) that don't render in plain markdown means the vault becomes hard to use outside Obsidian. Fix: keep the base content plain markdown. Plugins are for my convenience, not the canonical data format.

**Failure 7: Broken links after reorganization.** Moving files breaks internal Obsidian links unless I use the "update links" option. After any mass reorganization, a vault audit catches broken links.

**Failure 8: Filesystem MCP over-permissioned.** Granting Claude write access to the whole vault from any conversation is convenient but risky — a bad prompt could result in unintended edits. I scope filesystem MCP write access to specific subdirectories (`01-inbox/`, `10-content-pipeline/drafts/`) and keep `60-journal/` and `50-reference/` read-only.

**Failure 9: Treating Obsidian as a backup.** The vault is local to my MacBook. If the machine dies, the vault is gone unless I've backed up. I sync the vault via iCloud (encrypted) and Time Machine. Neither is a substitute for deliberate export of critical content.

## Full Worked Example: My Current Obsidian Setup (April 2026)

**Vault location:** `~/Obsidian/` (synced via iCloud)

**Current folder state:**

```
~/Obsidian/
├── 00-daily/ (daily notes back to Jan 2026)
├── 01-inbox/
│   ├── morning-briefs/ (populated by routine; ~80 entries)
│   ├── daily-summaries/ (populated by routine; ~60 entries)
│   ├── weekly-plans/ (populated by routine; ~16 entries)
│   ├── captures/ (manual captures; ~40 notes)
│   └── _review/ (currently ~12 notes pending processing)
├── 10-content-pipeline/
│   ├── drafts/ (~15 drafts in progress)
│   ├── ideas/ (~30 seeds)
│   └── research/ (~20 threads)
├── 20-client-work/
│   └── audreys-farmhouse/
│       ├── notes/
│       ├── research/
│       └── drafts/
├── 30-operations/
│   ├── monthly-reviews/ (4 entries)
│   ├── quarterly-audits/ (1 entry)
│   ├── spec-change-logs/ (populated by routine)
│   └── subcontractor-checkins/ (paused routine, ~3 entries)
├── 40-specs-drafts/
│   ├── ai-operating-system/ (18 drafts)
│   ├── content-production/ (empty; suite not yet drafted)
│   └── infrastructure/ (14 drafts in progress — I01 through I14)
├── 50-reference/
│   ├── concepts/ (~20 permanent notes)
│   ├── tools/ (~15)
│   ├── people/ (~10)
│   └── industries/ (~5)
├── 60-journal/ (personal, not business-adjacent)
├── 99-archive/ (growing)
└── _templates/
    ├── daily-note.md
    ├── spec-draft.md
    ├── client-meeting-note.md
    └── blog-post.md
```

**Filesystem MCP configuration in Claude Desktop:**

Scoped to `~/Obsidian/` as read. Write access scoped to `~/Obsidian/01-inbox/`, `~/Obsidian/10-content-pipeline/drafts/`, and `~/Obsidian/40-specs-drafts/`. Read-only for `~/Obsidian/60-journal/` and `~/Obsidian/50-reference/`. Configured in `claude_desktop_config.json`.

**Boundary rules in practice:**

- *Audrey's Farmhouse:* Raw notes, meeting captures, research live in `20-client-work/audreys-farmhouse/`. Polished deliverables (the 18 AI Operating System docs) live in the Audrey's Project knowledge base per I01. I don't mix them.
- *Specs I'm drafting:* Working versions in `40-specs-drafts/infrastructure/`. Polished versions get copied to `/mnt/project/` and uploaded to the Upriver Consulting Project.
- *Morning brief routine output:* Always writes to `01-inbox/morning-briefs/YYYY-MM-DD.md`. Never anywhere else.

**Cross-reference with other specs:**

- I10 (Upriver Consulting Project): This spec's `my-obsidian-integration.md` is uploaded there.
- I11 (Personal Skills): Some skills read from or write to vault paths; skill documentation references canonical paths.
- I12 (Routines): All routine outputs go to vault locations per Section 4.
- I13 (MCP stack): Filesystem MCP is Tier 3 local STDIO per I13.

**`jbp` CLI integration status:** Commands from Section 7 are planned but not implemented. I do the equivalent manually: creating notes in `_review/` via Obsidian, promoting manually, archiving manually.

**Maintenance routines:**

- Daily: daily note created automatically by Obsidian templates
- Weekly: Friday 3pm, 15-minute `_review` processing ritual
- Monthly: vault audit scan (not yet automated)
- Quarterly: per I15, vault health audit including orphan reference note cleanup

**Open items:**

- Build `jbp vault audit` as the first real CLI command; it's the highest-leverage missing piece
- Decide whether to migrate `60-journal/` out of the main vault into a separate encrypted Obsidian vault; currently the folder has personal content that mixes awkwardly with business content
- Consider adding a `_review` auto-reminder as a Cowork routine that flags any note in `_review/` older than 7 days
- Revisit whether the full vault backs up adequately via iCloud (iCloud syncs but isn't a true archival backup); investigate Time Machine coverage or explicit git-based backup for specs
- Once Content Production suite is drafted, the `40-specs-drafts/content-production/` folder gets populated; structure is ready

That's I14 complete. One more spec remaining: I15 Claude Infrastructure Audit and Maintenance. Ready when you say continue.
