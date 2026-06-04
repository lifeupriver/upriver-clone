# Intake & Profile Engine — PRD

Date: 2026-06-04
Status: complete draft. §2 and §3 unblocked and written against `specs-reference/` (18 AI Operating System doc specs, I00–I15 infrastructure specs, dependency DAG from doc 13). Awaiting Joshua's confirmation before per-component build specs.
Grounding: `00-current-state.md` (Phase 0 recon), the locked decisions recorded below, and `specs-reference/`.

## Locked decisions

1. **Intake lives in the `upriver-clone` dashboard, not the marketing website.** The existing magic-link interview (`packages/dashboard/src/pages/deliverables/[slug]/interview.astro`, `validateInterviewToken`, `interview-guide.md → FormSpec`) evolves into the coverage-driven chatbot. `upriver-consulting` only links to it. No Supabase, auth, or chatbot is added to the marketing repo. *(Reverses the kickoff's `/intake/[token]`-on-the-website framing; flagged for Joshua's explicit confirmation.)*
2. **The Client Profile is the canonical superset.** `clients/<slug>/profile.json`, typed in `packages/schemas`. The existing `ClientIntake` folds in as the profile's audit-decisions section. One store, not two. "Profile" is the artifact; "intake" is the act of filling it.
3. **Storage stays single-Supabase-project** with `clients/<slug>/` prefixes via the existing `ClientDataSource` abstraction. Per-client projects deferred; `client-config.yaml`'s unused `supabase_project_ref` is the future seam. The chatbot writes through the same data source the dashboard already uses.
4. **Schema home is a new `packages/schemas` (`@upriver/schemas`)**: zod plus inferred TS, zero heavy deps, consumed via `workspace:*`. External distribution deferred — under decision 1 nothing outside the monorepo needs it.
5. **`generate` uses write-capable headless Claude Code** built on `packages/cli/src/util/claude-cli.ts` (acceptEdits + Write/Edit/Read; the options exist, no caller uses them yet). Sequential first, matching `run/all`'s spawn model; git-worktree parallelism only after single-doc generation is proven. Ordering comes from the master build sequence dependency DAG.

---

## §1 Problem and outcome

Delivering an AI Operations Transformation means producing 18-plus AI Operating System documents plus the I01–I15 provisioning artifacts (Claude Project, Skills, Cowork routines, MCP config, Claude Code CLAUDE.md and memory files) for each client. Today that production is manual: extract everything about the business from calls, documents, and the public web, then write each deliverable by hand. Extraction and writing eat the engagement. The Little Friends Learning Loft proposal is the live example — the deliverables are sold; the pipeline to produce them is the bottleneck.

The engine inverts the work. One canonical Client Profile is the contract: a structured schema whose fields are derived from what the deliverables require (the inversion principle — union the required fields across all 18 docs plus I01–I15; that union is the schema, and the must-ask subset drives the interview). Sources fill the profile in order of client effort: automated recon first (zero client effort), the recorded in-person session as the spine, a coverage-driven chatbot as gap-filler, and an operator gap-fill pass to close the remainder. Generators then run from the profile: `upriver generate` orchestrates headless Claude Code to write each doc against its existing spec, ordered by the dependency DAG, flagging anything uncertain with `[NEEDS CONFIRMATION]`. Joshua reviews and approves at Continue gates. Fields touching safety, compliance, money, or capacity stay locked until he verifies them; no generator consumes them unverified.

Outcome: operator time per client drops from weeks of manual extraction and writing to recon plus a review pass. The profile becomes the client's single source of truth; the generated docs become their institutional memory; the provisioning artifacts make their Claude fully dialed in.

What this build is NOT: the 18 doc specs, the dependency DAG, and the I01–I15 specs already exist (being added to `specs-reference/`). The build is only the schema, the source adapters, the coverage tracker, the generate command, and the wiring.

## §2 The Client Profile schema

Derived by inversion from `specs-reference/`: the union of input fields required by docs 01–12 (the core), docs 13–18 (operational context, mostly no new fields), and I01–I09 (client-facing provisioning; I10–I15 are Joshua's own setup and out of the per-client schema). Doc 14's 36–45 question onboarding questionnaire was reconciled in — every questionnaire topic maps to a schema field, so the questionnaire is superseded once the coverage-driven chatbot (M6) is proven. Until then the questionnaire and the static interview form remain the working intake path (per §4.2).

### 2.1 Field envelope (applies to every field)

Every profile value is wrapped:

```ts
ProfileField<T> = {
  value: T | null;
  source: 'recon' | 'interview' | 'transcript' | 'operator' | null;
  confidence: 'high' | 'medium' | 'low' | null;   // per-source default, overridable
  verified: boolean;                              // operator-confirmed
  humanVerifyRequired: boolean;                   // static per schema field
  evidence?: string;                              // quote/URL backing the value
  updatedAt: string;
}
```

Merge precedence: operator > transcript > interview > recon; same source last-write-wins; conflicts with a higher-precedence existing value queue for operator review instead of overwriting. `humanVerifyRequired` fields (marked **HV** below) never reach generators until `verified: true` — these are every field touching safety, compliance, money/pricing, capacity/availability, and hiring/routing.

### 2.2 Core schema sections

The structure below is the contract for `packages/schemas/client-profile.ts`. Field lists summarize the full extraction (recorded per-deliverable in §3's map); the zod schema enumerates them exhaustively.

**`identity`** — legal name, public name, DBAs; category + subcategory; year established, brief history; addresses (primary, mailing); service area; phone, email, website; GBP URL/status; social handles; hours. *Mostly recon-fillable.*

**`people`** — owners {name, role}; founding story; key team members {name, role, scope, public contact}; routing rules incl. who NOT to route to (**HV**); billing contact (**HV**); technical collaborator {exists, OS, stack comfort}.

**`offerings`** — core offerings {name, components, exclusions, use case, price range (**HV**)}; secondary offerings; discontinued offerings; explicit don't-do list (**HV** — the anti-over-promise list); seasonal/limited offers.

**`pricing`** (**HV throughout**) — shareable pricing {item, price, included, excluded, conditions}; non-shareable pricing {asked question, deflection answer}; seasonal pricing; discounts/exceptions; deposit/retainer; payment schedule; accepted methods; refund/cancellation policy; rescheduling policy; pricing visibility policy; last updated.

**`capacity`** (**HV throughout**) — industry-specific capacity metrics (module-defined: venue guest counts, preschool enrollment by age group, contractor project size range, restaurant seating); booking lead time (typical, minimum); blackout dates; event/engagement types yes-no-maybe.

**`customers`** — primary customer (demographic + psychographic); discovery channels; reasons they choose us; reasons we lose; what they praise; lifetime value estimate; decision criteria/timeline/options-considered; price sensitivity.

**`positioning`** — key differentiator; verifiable differentiators {claim, proof, marketing use}; outcome delivered; awards/certifications {name, date, source, link}; track-record numbers; comparison vs typical competitors; recommended positioning statement (operator analysis output, also stored).

**`voice`** — attributes (3–5, defined w/ examples); tone spectrum positions (formal–casual, serious–playful, traditional–modern, understated–bold); operating modes (marketing vs client); vocabulary to use (30–60 owner phrases); banned vocabulary by category; anti-AI writing rules; admired voices; sample communications (10–15 past customer emails, 3 representative social posts — stored as references).

**`salesProcess`** — lead sources {channel, volume/mo, % of total, quality, cost, landing point, first responder}; first-touch process (actual steps, response time by channel/season — secret-shopper-measured, not owner-stated); current first-touch template; qualifying questions; qualification/disqualification criteria; conversion event {name, format, length, location, owner, scheduling, agenda, show-up %, conversion %}; close {definition (**HV** — money), steps, tools, time-to-signed, drop-off}; follow-up cadences by scenario; funnel metrics {stage volumes, conversion rates, revenue per customer (**HV**), data-quality notes}; seasonality (inquiry/booking volume by season); top bottlenecks {evidence, cost, fix}; response SLA targets.

**`content`** — photo inventory {storage, access, counts, categories, hero shots, photographer rights (**HV** — legal), gaps}; video inventory {storage, counts, categories, Mux IDs, rights}; written content {blog count/range/cadence, top posts, long-form, existing FAQ, press, newsletter}; testimonials by theme {quote, attribution, use cases}; review platforms {platform, count, rating, response rate}; critical review themes; visual brand assets {logos, palette (hex), typography, templates, brand guidelines doc}; vendor/partner network {vendor, category, featurable?}; content themes that perform; production capacity {who creates, hours/week — interview-only, owners overestimate}; production gaps and 90-day priorities.

**`competitors`** — market context {geography, size, saturation, dynamics, search behavior, price range + client position}; direct competitors (3–5) {name, site, location, founded, size, offering, pricing position, capacity, differentiators, web/social/SEO presence, Ahrefs metrics, review themes, where they win, where we win, sales positioning language}; indirect/adjacent alternatives; positioning gaps.

**`seo`** — baseline {DR, traffic, keywords, backlinks, referring domains, indexed pages, top pages, branded vs non-branded}; primary keyword targets {keyword, volume, difficulty, current/target position, rationale}; long-tail clusters; local {GBP status detail, NAP consistency, citations, review strategy}; AEO {question keywords, schema status}; technical {CWV, indexation, mobile, top issues}; content plan {cadence, pillars, 90-day calendar}; measurement targets (90-day, 12-month).

**`toolsAndAccess`** (**HV throughout** — access/credentials) — tool stack inventory {CRM, email platform, scheduling, website CMS + platform, asset storage, analytics (GA4/GSC/Ahrefs/Umami), payment processor, e-sig, social accounts, automation platform (n8n), Supabase, Slack}; per-tool {name, URL, access status, who holds credentials, API/webhook capability}; access grant checklist state; Anthropic plan tier + billing owner; API key ownership + spend caps (**HV** — money); browser/device landscape {per-user browser, always-on machine for routines, OS}.

**`operationsAutomation`** — recurring task list {task, frequency, time cost, current method, priority} (feeds I02 Skills + I03 routines); automation triggers {inquiry form fields/location, contract-signed detection, event-completion marker}; escalation routing {type → person/channel} (**HV**); VIP indicators; error-handling/fallback preference; sensitive topics requiring human handling (**HV**); DM/inquiry response SLAs; automation spend cap (**HV**); monitoring cadence + owner.

**`governance`** (**HV throughout**) — regulated data handling (PHI/PCI/GDPR); data residency; compliance certs required (HIPAA, SOC 2, audit logs); IT/security function exists; review response policy; email compliance posture; data retention limits; memory/incognito posture per user; offboarding/ownership plan {who owns Vercel/Supabase/Cloudinary after engagement, credential rotation}.

**`goals`** — primary outcome sought; urgency/timeline; budget constraints (**HV**); content hours/week available; red lines (**HV** — things the business won't do); engagement scope decisions (fork choices from doc 13: website scope A/B/C, Phase 1 automation selection, content production, retainer continuation).

**`auditDecisions`** — the migrated `ClientIntake`: finding decisions {findingId → fix|skip|discuss}, page wants, reference sites, scope tier. Shapes preserved from `packages/core/src/types/intake.ts` per the migration section.

### 2.3 Modules

Core = sections above, required for every client. Modules add fields, never fork the core:

- **Industry modules** define the industry-specific slots the core declares: `capacity` metrics, `offerings` taxonomy, `operationsAutomation` archetype routines, compliance additions to `governance`. First module: **preschool** (Little Friends) — OCFS compliance status + filings (**HV**), NYS training matrix per staff (**HV**), immunization policy (**HV**), enrollment capacity by age group (**HV**), annual calendar, parent handbook inputs, admin runbook inputs. Others (venue, contractor, restaurant) follow the same pattern; the venue archetype is already implicit in the extraction (guest counts, preferred vendors, The Knot).
- **Engagement modules** gate which sections matter: a foundation engagement requires the full core; an audit-only engagement requires `identity`, `seo`, `competitors`, `auditDecisions`.

Zod shape: `clientProfileSchema = coreSchema.extend({ modules: { preschool?: preschoolModule, venue?: venueModule, ... } })` with every leaf wrapped in the §2.1 envelope. Lives in `packages/schemas/client-profile.ts`; the coverage map types live beside it.

### 2.4 Source-fill expectations (sets recon targets and the must-ask floor)

- **Recon-fillable (no client effort):** most of `identity`, public `pricing`, review/testimonial harvest, `content` web inventory, `competitors` (Ahrefs + manual), `seo` baseline, website platform, GBP status, social presence, secret-shopper response times.
- **Interview/transcript-only (the must-ask spine):** `voice` (attributes, vocabulary, modes), don't-do lists, non-shareable pricing + deflections, capacity numbers, internal process detail (`salesProcess` internals, CRM-held metrics), `toolsAndAccess` credentials/ownership, `operationsAutomation` (recurring tasks, escalation, VIPs), `governance`, `goals`, production capacity.
- **Operator analysis (computed, stored on the profile):** bottleneck assessment, positioning recommendation, keyword target selection, comparison matrix.

## §3 Field-to-deliverable coverage map

Per-deliverable required profile sections, plus the dependency DAG `generate` orders by. Section names refer to §2.2; "docs" in the requires column are upstream generated docs (consumed as context, not profile fields). The machine-readable form of this table plus the DAG ships in `packages/schemas/coverage-map.ts`; this section is its source of truth.

### 3.1 The dependency DAG (from doc 13, spec section 2)

```
01 Brand Voice ──────────────┐
                             ├──> 07 FAQ Bank ──┐
02 Business Facts ───────────┤                  │
                             │                  ├──> 08 Email Templates ──> 11 Automation Spec
03 Sales Process Map ────────┤                  │                              │
04 Content Library ──────────┤                  │                              │
05 Competitor Landscape ─────┴──> 06 SEO ───────┴──> 09 Social Playbook ──┐    │
                                                                          ├────┴──> 12 Measurement
                                                          10 Website ─────┘
```

Edges (doc 13 rationale list): 04←{01,02}; 05←{01,02}; 06←{01,02,05}; 07←{01,02,03}; 08←{01,02,03,07}; 09←{01,02,04,05,06}; 10←{01..09}; 11←{02,03,07,08}; 12←{03,06,09,11}. 03 runs parallel to 01–02. Parallel groups: {03,04,05} after 01–02 lock; {07,09}; {10,11} overlap. I-series ordering: I07 first (governance gates everything), then I01, then I02→I04→I03 (routines need skills + connectors), with I05/I06/I08/I09 parallel after I01. Docs 13–18 are operational docs produced once at business setup or per-engagement from existing fields; they add no DAG edges among 01–12.

### 3.2 Doc coverage (01–12)

| Doc | Requires profile sections | Requires docs | HV gates |
|----|---------------------------|---------------|----------|
| 01 Brand Voice | identity, customers, positioning, voice | — | voice samples confirmed by owner |
| 02 Business Facts | identity, people, offerings, pricing, capacity, positioning, governance (accessibility/insurance facts) | — | ALL pricing, capacity, don't-do, team routing, insurance/contract, accessibility |
| 03 Sales Process | people, salesProcess, toolsAndAccess (CRM), capacity (seasonality) | — | close definition, revenue/customer, response times (secret-shopper sourced) |
| 04 Content Library | content, toolsAndAccess (storage), positioning (awards) | 01, 02 | photographer/producer usage rights |
| 05 Competitor Landscape | competitors, customers, pricing (position), positioning | 01, 02 | pricing comparison claims |
| 06 SEO & Keywords | seo, identity (NAP), toolsAndAccess (Ahrefs/GSC/GA4), content (blog baseline) | 01, 02, 05 | keyword targets owner-confirmed |
| 07 FAQ Bank | offerings, pricing (deflections), capacity, operationsAutomation (sensitive topics, routing), customers | 01, 02, 03 | deflection language, routing |
| 08 Email Templates | people (names), salesProcess (stages, CTAs), toolsAndAccess (scheduling URL, CRM vars), operationsAutomation (SLAs) | 01, 02, 03, 07 | auto-responder must-not-do list, coordinator info, live URLs |
| 09 Social Playbook | content (capacity, pillars, hashtags), operationsAutomation (DM SLAs, protocols), toolsAndAccess (platform access) | 01, 02, 04, 05, 06 | production capacity, platform priorities |
| 10 Website Audit | seo (technical), toolsAndAccess (platform, GSC), salesProcess (conversion elements), pricing (visibility policy), goals (rebuild appetite) | 01–09 | pricing visibility, rebuild scope fork |
| 11 Automation Spec | operationsAutomation (full), toolsAndAccess (stack, webhooks, API keys), salesProcess (triggers) | 02, 03, 07, 08 | escalation routing, VIP rules, cost caps, fallback |
| 12 Measurement & KPI | seo (baseline), salesProcess (funnel), toolsAndAccess (analytics stack, dashboard pref), goals, operationsAutomation (monitoring) | 03, 06, 09, 11 | revenue/traffic/conversion targets, AI spend budget |

### 3.3 Operational docs (13–18)

13 Master Build Sequence: built once at business setup, not per-client; consumes goals.engagementScope per client for fork decisions. 14 Onboarding Kit: consumes identity, people, toolsAndAccess (access checklist), goals; its questionnaire stays the working intake path until the coverage-driven chatbot (M6) demonstrably covers the same ground, at which point this coverage map supersedes it. 15 Retainer Playbook: goals (retainer fork), operationsAutomation (monitoring cadence). 16 Sales Collateral: positioning, pricing, content (testimonials) + docs 01–07. 17 Handoff/Offboarding: governance (ownership/rotation plan), toolsAndAccess. 18 Sales Document: no per-client fields. None add schema fields beyond §2.

### 3.4 Provisioning coverage (I01–I09)

| Artifact | Requires profile sections | Requires docs |
|----------|---------------------------|---------------|
| I07 Account/Governance (first) | people (team, billing), governance (full), toolsAndAccess (plan tier, budget) | — |
| I01 Claude Project | identity, people (access roles), goals (scope) | all 18 (knowledge load); 01, 02 (custom instructions) |
| I02 Skills | operationsAutomation (recurring tasks), toolsAndAccess (tool URLs/keys), people (skill owners) | 01, 03, 04, 06, 07, 11 |
| I04 MCP Config | toolsAndAccess (full stack inventory, OAuth/API capability), governance (residency/compliance), people (emails) | 11 |
| I03 Routines/Cowork | operationsAutomation (cadenced tasks, owners), toolsAndAccess (always-on machine), people (notification owner) | 02, 04, 06, 07, 11, 12; needs I02 + I04 live |
| I05 Claude in Chrome | toolsAndAccess (browsers, web tools, allowlists + banned sites HV), people (web-working users) | 01, 02, 11 |
| I06 Claude Code | people (technical collaborator), toolsAndAccess (OS, stack, repo, hosting, secrets manager, API caps HV) | client repo, not 01–18 |
| I08 Styles/Memory/Prefs | people (per-user prefs), governance (memory/incognito posture) | 01 (compressed into Style) |
| I09 Artifact Templates | operationsAutomation (recurring deliverables), toolsAndAccess (publishing/storage prefs), governance (sharing approval) | 02, 04, 06, 11, 12 |

I10–I15 are Joshua's own infrastructure: out of the per-client map.

### 3.5 The must-ask subset (drives the interview)

Fields no recon source can fill, grouped by where they best come from:

- **Recorded session (the spine):** voice attributes/vocabulary/modes; founding story; don't-do lists; non-shareable pricing + deflections; definitive capacity numbers; sales process internals (qualification criteria, close steps, drop-off reasons); bottleneck candidates; goals and red lines.
- **Chatbot gap-fill (factual, low-friction):** tool stack inventory + access status; recurring task list; team roster/roles/emails; escalation routing; VIP indicators; SLA targets; browser/device landscape; production hours/week; engagement fork choices; module fields (e.g., preschool enrollment by age group).
- **Operator-mediated only (never the chatbot):** credentials and API keys (access checklist, not profile values); plan tier/billing approval (HV); compliance posture (HV); spend caps (HV); anything the client must approve on a consent screen (OAuth scopes, publishing).

Coverage math for `profile show` and the chatbot: a deliverable's readiness = required fields present ∧ required HV fields verified ∧ upstream docs generated. The interview's question queue = (must-ask fields required by the client's engagement scope) − (already filled), ordered by how many blocked deliverables each field unblocks.

## §4 Sources and adapters

All sources write the same profile fields through one write path (§7). Each write records provenance (`source`, `confidence`, timestamp) so later sources can fill gaps without silently overwriting higher-confidence values. Precedence and merge rules are finalized in §2; the working default is: operator > transcript > interview > recon, with same-source updates last-write-wins and `humanVerifyRequired` fields never auto-promoted to verified.

### 4.1 Recon (`upriver recon <slug>`) — zero client effort, runs before contact

Composes capabilities that are already wired, plus net-new adapters:

- **Wired today:** Firecrawl scrape (`packages/core/src/firecrawl/client.ts` — retry, cost logging; `FirecrawlBrandingProfile` type already exists in audit-package.ts), Playwright screenshots, GSC via `packages/core/src/gsc/client.ts`.
- **Net-new adapters:** socials (profile discovery + recent-activity summary), Google Business Profile (hours, categories, reviews, attributes), GEO checks (how AI assistants currently describe the business), secret shopper (scripted inquiry via the business's own contact channels, capturing response time and content).

Each adapter is a module that returns candidate field values typed against `@upriver/schemas`; the recon command merges them into `profile.json` with `source: 'recon'` and per-adapter confidence. Recon never writes `humanVerifyRequired` fields as verified. Extraction from raw scrape output to profile fields uses `claudeCliCall` with `--json-schema` (read-only mode), the same pattern `synthesize` uses today.

### 4.2 Coverage-driven interview — evolution of the FormSpec layer

The existing layer (verified in code): `clients/<slug>/interview-guide.md` is parsed by `packages/core/src/interview/parse-guide.ts` into a `FormSpec`; `deliverables/[slug]/interview.astro` renders it client-side behind `validateInterviewToken` (constant-time compare against `clients/<slug>/interview-share.json`); answers persist to `interview-responses.json` via `patchResponses` through the data source.

The evolution: replace the static, hand-authored guide with a coverage-driven conversation. The chatbot's system prompt embeds the coverage schema (§3's must-ask subset minus fields already filled), so it asks only what is missing, in plain language, and stops when coverage is met. Answers write profile fields directly (`source: 'interview'`) via tool calls against the same dashboard API layer — not a new direct Supabase client. The magic-link token mechanism is kept as-is; `interview-share.json` continues to gate access. The static FormSpec form remains as a no-JS fallback during transition and is retired once the chatbot covers it.

Model access: the dashboard runs on Vercel in Option B, where the operator's Claude Max CLI is unavailable, so the chatbot uses the Anthropic SDK directly (API key in the dashboard env) — the one LLM surface in this system that is not `claude-cli.ts`.

### 4.3 Transcript extractor (`upriver profile extract-transcript <slug> <file>`)

The recorded in-person session is the richest source. The extractor takes a transcript (text or VTT), runs `claudeCliCall` with the profile JSON schema (`--json-schema`, read-only tools), and emits candidate field values with quotes as evidence, `source: 'transcript'`. Candidates merge into `profile.json`; conflicts with existing higher-confidence values are queued for the operator rather than overwritten. The Little Friends recorded session plus the sent proposal are the first inputs — they hand-fill roughly half the profile before any new surface exists.

### 4.4 Operator gap-fill (`upriver profile <slug>` subcommands)

The operator seat: `profile show` (coverage report — which deliverables are unblocked, which fields are missing or unverified), `profile set <field> <value>` (writes `source: 'operator'`, highest precedence), `profile verify <field>` (flips `verified` on `humanVerifyRequired` fields — the only way they unlock), `profile import <file>` (bulk hand-fill, the day-one path for Little Friends). The dashboard mirrors `profile show` as a coverage view per client.

## §5 Generation engine mechanics

`upriver generate <slug> [--doc <id>] [--all]`:

1. **Load and gate.** Read `profile.json`, validate against `@upriver/schemas`. Compute coverage per deliverable from the §3 map. A doc is eligible only when its required fields are present AND none of its required `humanVerifyRequired` fields are unverified. Ineligible docs are reported with exactly which fields block them.
2. **Order.** Topologically sort eligible docs by the master build sequence DAG (machine-readable form lives in `specs-reference/`; `generate` consumes it directly).
3. **Generate one doc per headless session.** Each doc gets a fresh `claudeCliCall` with: system prompt = the doc's spec from `specs-reference/` plus brand voice rules; user prompt = the relevant profile slice plus any upstream docs it depends on; `permissionMode: 'acceptEdits'`, `allowedTools: ['Read','Write','Edit','Glob','Grep']` (the write-capable options that exist in `ClaudeCliCallOptions` but no caller uses yet). Output lands in `clients/<slug>/docs/<doc-id>.md`. The existing cache layer applies — unchanged profile slice plus unchanged spec means a cache hit, making re-runs cheap.
4. **Flag uncertainty.** The system prompt instructs the model to emit inline `[NEEDS CONFIRMATION: <question>]` markers wherever the profile is ambiguous or thin rather than inventing facts. Post-generation, the command scans output for markers and aggregates them into the run report.
5. **Continue gate.** After each doc (or each DAG tier in batch mode), `generate` pauses: prints the doc path, the `[NEEDS CONFIRMATION]` list, and waits for operator confirmation before the next session. `--yes` exists for re-runs of already-approved docs only.
6. **Sequential first, worktrees later.** v1 runs docs sequentially in-process, matching the `run/all` spawn model and avoiding conflict handling entirely (each doc writes a uniquely named file). Worktree parallelism (independent DAG branches in parallel `git worktree` checkouts, merged after the gate) is a v2 optimization, added only after single-doc generation is proven on Little Friends. The worker enqueue path (`api/enqueue/[command].ts` → Inngest `run-stage`) can carry `generate` later by adding it to the three mirrored allowlists; v1 is operator-CLI only.

Failure handling: a non-zero exit or error envelope from `claude` fails that doc only; the run report records it and the gate lets the operator retry, skip, or abort. Generated docs are committed per-gate so every approved state is recoverable.

## §6 Provisioning hooks

I01–I09 (the client-facing provisioning artifacts; I10–I15 are Joshua's own setup, out of scope) consume two kinds of input: generated docs and raw profile fields. The §3.4 table maps both per artifact. Mechanics:

- **DAG placement.** Provisioning artifacts are DAG nodes downstream of the docs they consume, with their own internal ordering: I07 first (governance — I07's spec says "build first of the client-facing specs"; I01 lists I07's tier decision as a prerequisite), then I01 (the Project container, which knowledge-loads all 18 docs), then I02 → I04 → I03 (routines need skills and connectors live), with I05/I06/I08/I09 parallel after I01. `generate` runs them through the same headless sessions, gates, and `[NEEDS CONFIRMATION]` flags as docs.
- **Output formats vary by what has an API surface.** I06's CLAUDE.md and memory files are written files — fully generatable. I01's custom instructions (Blocks A–C from identity, voice, and facts), I02's skill packages, I03's routine definitions, I08's Custom Style (a compressed Doc 01), and I09's artifact templates are generated as structured artifacts plus a per-artifact operator runbook for the steps that require clicking in the client's account (Project creation, OAuth consents, skill upload). I07's output is a decision document (tier, access map, governance posture) generated from `governance` + `people` + `toolsAndAccess` and confirmed by Joshua — nearly everything in it is HV.
- **HV gating is densest here.** OAuth scopes, allowlists/banned sites (I05), API spend caps (I06), plan tier and billing (I07), publishing approvals (I09) all stay locked until verified; the generated runbooks mark each verification point explicitly.

## §7 Architecture — where every piece lives

```
upriver-clone (pnpm monorepo)
├── packages/schemas            NEW  @upriver/schemas — zod + inferred TS, zero heavy deps
│     client-profile.ts              the contract; both CLI and dashboard import workspace:*
│     coverage-map.ts                field→deliverable map types (§3 data shape)
├── packages/core
│     data/                          ClientDataSource (local | supabase) — UNCHANGED, all
│                                    profile reads/writes go through it
│     interview/parse-guide.ts       legacy FormSpec parser — retained until chatbot replaces it
│     types/intake.ts                ClientIntake — folds into profile (see migration section)
├── packages/cli
│     commands/recon.ts         NEW  recon adapters → profile.json (source: recon)
│     commands/generate.ts      NEW  §5 engine; write-capable claude-cli sessions
│     commands/profile/         NEW  show | set | verify | import | extract-transcript
│     util/claude-cli.ts             UNCHANGED core; generate passes acceptEdits + write tools
├── packages/dashboard (Astro)
│     pages/deliverables/[slug]/intake-chat.astro   NEW  magic-link chatbot page
│     pages/api/profile/[slug].ts                   NEW  chatbot tool-call endpoint →
│                                                        data source → profile.json
│     lib/interview.ts               token validation reused as-is (interview-share.json)
├── packages/worker                  Inngest — generate added to allowlists in v2, not v1
└── clients/<slug>/
      profile.json              NEW  the canonical Client Profile artifact
      docs/                          generated AI Operating System docs
      interview-share.json           magic-link token (existing mechanism, reused)
      intake.json                    legacy — migrated into profile.json, then frozen

upriver-consulting (marketing site)   NO new infrastructure. One link per engaged client
                                      to the dashboard chatbot URL (slug + token), sent
                                      by the operator. No Supabase, no auth, no chatbot.

.planning/intake-profile-engine/
      00-current-state.md             recon (done)
      01-prd.md                       this file
      specs-reference/                18 doc specs + DAG + I01–I15 (being added)
      specs/                          per-component 8-section build specs (next phase)
```

Data flow: recon/transcript/operator fill `profile.json` via CLI (local data source); the chatbot fills it via the dashboard API route (data source resolves local or supabase per `UPRIVER_DATA_SOURCE`); `generate` reads it plus `specs-reference/` and writes `docs/`. One artifact, one schema package, one write abstraction, three seats (client → dashboard chatbot; operator → CLI; engineer → headless Claude Code inside `generate`).

Trust boundary: the chatbot endpoint is the only client-writable surface. It validates the magic-link token, accepts only whitelisted profile fields (never `verified`, never operator-source values), schema-validates every write with `@upriver/schemas`, and rate-limits per token.

## Relationship to the existing intake/interview layer

Stated concretely so nothing gets duplicated:

**`ClientIntake` → Profile migration.** `clients/<slug>/intake.json` (finding decisions, page wants, reference sites, scope tier) becomes the profile's `auditDecisions` section, same shapes, in `packages/schemas`. Migration: (1) schemas package ships `auditDecisions` mirroring `ClientIntake` minus the envelope; (2) a one-shot `profile migrate-intake <slug>` folds an existing `intake.json` in; (3) `intake-reader.ts` consumers (`fixes/plan`, `clone`, `report/bundle`, deep-audit passes, `improve/agent-runner`) switch to reading the profile via a thin compatibility reader so the change is one import swap per consumer; (4) `intake.json` is frozen (read-only fallback), then deleted after one full client cycle. The dashboard's `intake-writer.ts` and `api/intake/[slug].ts` are repointed at the profile in the same step.

**`interview-guide.md → FormSpec` → coverage-driven interview.** The static form is the ancestor of the chatbot: same magic-link gating (`interview-share.json`, `validateInterviewToken` — reused untouched), same data-source write path, but questions come from the live coverage gap instead of a hand-authored markdown file. `interview-responses.json` remains as a conversation/answer log for provenance; the authoritative values land in `profile.json` with `source: 'interview'`. `parse-guide.ts` and the static form are retired only after the chatbot demonstrably covers the same ground (the static form is the fallback until then).

**Naming.** "Profile" = the artifact (`profile.json`). "Intake" = the act of filling it (recon, interview, transcript, gap-fill are all intake). The legacy `ClientIntake` type name retires with the migration; nothing new is named "intake" except the client-facing chat page.

## §8 Value sequence and milestones

| # | Milestone | Proves | Depends on |
|---|-----------|--------|------------|
| 1 | `packages/schemas` + `profile import` + `generate` (sequential, one doc, Continue gate) against a hand-filled Little Friends profile from the proposal + recorded session | The bottleneck layer: profile → spec → headless write-mode session → reviewed doc. No new client-facing surface | §2/§3 (done) |
| 2 | `generate --all` across the 01–12 doc DAG with coverage gating, `[NEEDS CONFIRMATION]` aggregation, per-gate commits. Docs only — no provisioning artifacts | Full 18-doc set from one profile | M1 |
| 3 | `recon` (Firecrawl/Playwright/GSC composition + socials, GBP, GEO, secret shopper adapters) | Automated fill writes the same fields the hand-fill wrote; measured coverage % before any client contact | M1 (schema), independent of M2 |
| 4 | `ClientIntake → Profile` migration + `profile show/set/verify` + dashboard coverage view | One store; operator seat complete; legacy consumers swapped | M1 |
| 5 | Provisioning generation (I01–I09): configs + operator runbooks + explicit cannot-generate steps (OAuth consents, account clicks), per §6 | Provisioning artifacts from profile + generated docs; different output shape than M2's prose docs | M2 (docs exist), M4 (verify flow for the HV-dense I-series) |
| 6 | Dashboard coverage-driven chatbot behind the existing magic link | Client-facing gap-fill; built last because it is the most polish-dependent. Static form + questionnaire retire only after this is proven | M3/M4 (needs coverage gaps to drive questions) |
| 7 | Transcript extractor + final gap-fill pass woven in | Richest source automated; coverage closes without operator typing | M1 (schema); usable any time after |
| 8 | v2: worktree-parallel generation; `generate` in the worker enqueue allowlists | Throughput | M2 proven |

Little Friends is the worked example throughout: M1 runs against its hand-filled profile; M3's recon is validated by diffing automated fill against the hand-fill; M6's chatbot is exercised against its remaining coverage gaps.

---

## Per-component build specs

Next phase: one 8-section spec per component in `specs/`, in milestone order — `schemas`, `generate`, `profile` commands, `recon`, migration, chatbot, transcript extractor. Each handed to a fresh Claude Code session. Not written until §2/§3 unblock and Joshua confirms this architecture pass.
