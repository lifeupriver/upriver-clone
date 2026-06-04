# specs-reference

These are the source specs the Intake & Profile Engine PRD depends on. Drop this folder into `.planning/intake-profile-engine/specs-reference/` in the `upriver-clone` repo. Their arrival unblocks PRD §2 (Client Profile schema) and §3 (field-to-deliverable coverage map).

## How to use these for the PRD

The schema is derived by inversion. For every deliverable below, read its spec, list the profile fields it requires as input, and union those across all specs. That union is the §2 schema. The per-deliverable field lists are the §3 coverage map. The must-ask subset (fields no recon source can fill) is what drives the interview.

Two structural inputs to read first:
- `ai-operating-system/13-master-build-sequence-spec.md` holds the dependency DAG that `generate` orders by, and each doc's declared input sources.
- `infrastructure/I00-infrastructure-specs-index.md` indexes the provisioning specs and how they fit together.

## ai-operating-system/ (the documents `generate` produces)

01 Brand Voice Guide · 02 Business Facts Reference · 03 Sales Process Map · 04 Content Library · 05 Competitor Landscape · 06 SEO & Keyword Strategy · 07 FAQ Bank · 08 Email Templates · 09 Social Media Playbook · 10 Website Audit · 11 Automation Spec Package · 12 Measurement & KPI Framework · 13 Master Build Sequence (orchestration, holds the DAG) · 14 Client Onboarding Kit (contains the current 30-40 question questionnaire, a direct input to the coverage map) · 15 Retainer Engagement Playbook · 16 Sales Collateral · 17 Handoff & Offboarding · 18 AI Operating System Sales Document.

The core profile schema is the union of the fields required by 01-12. Docs 13-18 are operational and provisioning context; 14 in particular is the existing questionnaire to reconcile against the coverage map.

## infrastructure/ (the provisioning artifacts that feed PRD §6)

I00 index · I01 Client Claude Project Setup · I02 Skills Deployment · I03 Routines / Cowork · I04 MCP Server Configuration · I05 Claude in Chrome · I06 Claude Code Setup (CLAUDE.md, memory files) · I07 Account Access Governance · I08 Custom Styles / Memory / Preferences · I09 Artifacts & Deliverable Templates · I10 Upriver Consulting Claude Project · I11 Personal Skills Architecture · I12 My Routines / Cowork · I13 My MCP Server Stack · I14 Obsidian / Claude Integration · I15 Claude Infrastructure Audit & Maintenance.

For the coverage map, treat I01-I09 as client-facing provisioning that each declare profile fields they need (tools in use → I04 MCP list; repetitive tasks → I02 Skills; scheduled work → I03 routines; brand tokens and stack → I06 CLAUDE.md). I10-I15 are Joshua's own setup, useful as reference but not part of the per-client coverage map.

## Note on naming

These specs predate the recon finding that `upriver-clone` already has a narrow `ClientIntake` artifact and an `interview-guide.md → FormSpec` layer. When writing the coverage map, reconcile this questionnaire (Doc 14) and that existing layer into the single Client Profile per the PRD's integration section. Do not create a third parallel field list.
