# Capability Audit: upriver-clone vs the End-State Capability Map

Date: 2026-06-05. Auditor: Cowork. Charter: Joshua's "End-State Capability Map & Code Audit Charter."
Measured at: main `199c1a8`. Method: three parallel full-repo sweeps (front-of-funnel, spine, back half) + direct verification of spine claims, flag surfaces, and human-gate lines. Independent build/test re-run at this commit: root build clean; cli 358/358, dashboard 54/54, schemas 44/44.
Caveat: the synthetic end-to-end run (e2e prompt, corpus staged) has NOT executed yet — everything below is code-and-test verified, not yet full-lifecycle proven.

## What works, one line each (per charter §6)

Spine: 17-section profile + 4 modules + envelope + HV registry + 28-entry coverage map with all cross-check tests green (`packages/schemas`). Generate: single/`--all` DAG tiers/`--provisioning`/`--jobs` worktree parallelism, write-mode sessions, markers, Continue gate (`packages/cli/src/generate/`). Sources: recon (6 real adapters), transcript extractor, coverage-driven chatbot, operator commands (import/show/set/verify/conflicts/pull/push/migrate-intake) — all writing through one merge path, never `verified: true`. Store: Supabase-canonical default, pull/push, shared Postgres rate limiter, revision counter; chatbot trust boundary (token, whitelist, HV-reject, source hardcoded `interview`). Worker: `generate` enqueue-able end to end. Cold audit machinery: 15 heuristic + 8 tooling audit passes, hosted deliverables dashboard (scorecard/findings/next-steps + PDF), voice-extract, video-audit, secret-shopper logging, custom-tools (F11), scaffold→clone→improve→finalize website pipeline, monitor (F06). Provisioning: I01–I09 with runbooks + `[OPERATOR ACTION]` markers, live-proven on I07.

## Stage-by-stage classification

| Stage | Capability | Status | Evidence / gap |
|---|---|---|---|
| 0 Prospect | Pipeline entry | **Built** | `clients/new` page + `client-config.yaml`; no stage field (G2) |
| 1 Cold scan: multi-source | **Built** | recon adapters (website/gbp/socials/serp/geo) + scrape; no dedicated press scrape (minor) |
| 1 Deep website dive | **Built** | 23 audit dimensions across audit-passes + deep-audit (typography missing from the `AuditDimension` enum — G9) |
| 1 AEO/LLM readability | **Built** | `aeo` pass + `schema` pass + recon `geo`; not surfaced as a named "AI readiness" grade (G8) |
| 1 Design + video analysis | **Built** | design pass + Firecrawl branding + `video-audit` (10-type catalog, budgets); no social-specific design grade (minor) |
| 1 Light competitor pass | **Partial** | heuristic cold pass; LLM `competitor-deep` gated behind `--mode=deep`; competitor list is manually seeded — no discovery (G7; serp adapter seeds candidates when section empty) |
| 1 Secret shopper | **Built** | start/record logging, manual send (correctly human) |
| 2 Audit dashboard | **Built** | `deliverables/[slug]/` scorecard+findings+next-steps, token-gated, PDF export. "Balanced tone" is layout-implicit, not enforced (minor) |
| 2 Preliminary brand voice | **Built** | `voice-extract` from scrape alone; thin-Doc-01 role satisfied |
| 2 Rebuilt-homepage preview | **Partial** | clone can do one page, but only after scaffold (needs audit-package + intake); no lightweight pre-signature mockup path (G6) |
| 3 Qualifying questionnaire | **Not built** | nothing exists; intake surfaces are post-engagement (G3) |
| 4 Discovery call → profile | **Built** | `extract-transcript` handles any call transcript |
| 5 Full Ahrefs scan | **Not built** | env var accepted, API client is an explicit stub (`backlinks/index.ts` TODO) (G4) |
| 5 Full competitor analysis | **Built (deep)** | `competitor-deep` LLM pass + doc-05 generator |
| 5 Tool/account audit | **Partial** | `toolsAndAccess` schema + GBP/GSC ingestion exist; no active state validation (GA4 wired? GSC verified? Claude-readiness check) (G5) |
| 6 Proposal generator | **Partial → Not built** | prices are HARDCODED in `next-steps.astro` ($2,800/$9,500/$18,500); `custom-tools` makes per-tool proposals; no unified scoped/priced/timeline proposal generator pulling from tier/pricing specs (G1) |
| 7 Deep-dive → profile | **Built** | transcript extractor + chatbot + operator commands; coverage-driven |
| 8 Generate: 18 docs | **Built for 01–12; 13–18 map-only** | engine `GENERATABLE` excludes 13–18 by design; I01 lists all 18 as knowledge-load precondition — unresolved tension (G10) |
| 8 Generate: I01–I09 | **Built** | `--provisioning`, runbooks, `[OPERATOR ACTION]`, live I07 proof |
| 8 Website requirements doc | **Not built** | no generator, no coverage-map entry, no spec (G6) |
| 8 Design system (optional) | **Not built** | `design-brief` is legacy (reads audit-package); nothing profile-driven, no logo/palette generation (G6) |
| 8–9 Website build | **Partial** | scaffold→clone→improve→finalize works but reads `audit-package.json` + `intake.json` — NOT the profile. The spine stops before the website build (G6 — the biggest architectural gap) |
| 9 Deployment | **Partial** | admin-deploy scaffolds GitHub/Vercel with operator-manual steps (correctly human); no `deploy` command; sync push/pull mirrors client tree |
| 9 Custom tools | **Built** | F11 shipped |
| 10 Train & handoff | **Specced only** | doc-17 spec exists; no generator; correctly human-led, but quick-reference-guide generation absent |
| 11 Offboard/retain | **Specced only / monitor built** | F06 monitor ships weekly deltas; doc-15/17 not generatable |

## Spine verification (charter §3) — all confirmed at main

Schemas, generate engine, recon adapters, profile commands: as the one-liner above, with citations in the sweep records. Two charter-specific answers: **(a) the canonical-store divergence is actually resolved** — CLI default is `supabase` (`generate/data-source.ts`), pull/push merge with conflict queues, the chatbot writes through the same data source behind the full trust boundary, and the rate limiter is a shared Postgres store (not in-memory) when Supabase is configured; **(b) the lifecycle stage field does NOT exist** — `goals.engagementScope` holds fork decisions (website scope A/B/C, retainer), and `questionQueue(profile, scope)` already gates by deliverable scope, but nothing encodes prospect→qualified→signed→foundation→retainer, so `generate` and the dashboard cannot know "where in the lifecycle a client sits" except by inference.

## The gap report (prioritized; recommendations only, no fixes made)

| # | Gap | Severity | One-line recommendation | Spec home |
|---|---|---|---|---|
| G1 | **No proposal generator** (stage 6): prices hardcoded in a dashboard page; no scoped/priced/packaged/timeline proposal from audit + profile + tier specs | **High** — it's the money gate of the funnel and currently hand-made | New build spec: `generate --doc proposal` reading profile + audit findings + a pricing/tiers reference doc; HV gate on price; output feeds the existing marketing-site proposal/[id] viewer | New spec needed (doc-16 spec + next-steps.astro are inputs) |
| G2 | **No lifecycle stage field** on the profile | **High** — the end-state's organizing concept; cheap now, expensive later | Add `_meta.stage` enum (prospect/cold-audit/qualified/discovery/proposal/signed/foundation/retainer/offboarded) + per-stage deliverable scope presets; thread through `profile show`, coverage view, chatbot scope | Schemas spec amendment (01) |
| G3 | **No brief qualifying questionnaire** (stage 3) | **High** — the warm/cold signal the cold-email motion depends on | Small: a token-gated 5-question dashboard page writing `source: 'interview'` low-stakes fields + an interest flag; NOT the deep chatbot | New mini-spec (reuse chatbot plumbing from 06) |
| G4 | **Ahrefs is a stub** (stage 5 + doc-06 quality) | **Medium-high** — deep audit and SEO doc run heuristic-only | Implement the Ahrefs v3 client in `core` (key already env-wired) feeding backlinks/competitors passes + `seo` profile section; interim: Cowork's Ahrefs MCP hand-fill documented as the workaround | Recon spec follow-up (04) |
| G5 | **No tool/account state validation** (stage 5) | **Medium** | `upriver recon --adapters tooling`: probe GA4 presence, GSC verification, GBP claim, robots.txt/Claude-crawler access, schema presence → fills `toolsAndAccess.accessChecklist` + an AI-readiness summary | Recon spec extension (04) |
| G6 | **The profile→website bridge is missing**: build pipeline reads audit-package + intake, not the profile; no website-requirements doc; no design-system generator | **Medium-high strategically** (the "modern website" half of the end-state line) | One spec covering: a `doc-web-prd` coverage-map entry generated from profile (+doc-01/02/06/10), scaffold/clone reading profile-first with audit-package fallback, design-brief repointed to profile | New spec needed |
| G7 | **Competitor discovery is manual** | Medium | Promote serp adapter's candidate seeding into a curated discovery flow (`recon --adapters serp` → operator confirms → competitor-deep) | Recon spec follow-up (04) |
| G8 | **"AI readiness" not a named grade** | Low-medium | Add an `ai-readiness` dimension that composes aeo+schema+geo+tooling-probe results; render on scorecard | Audit-passes; rubric work in G9 |
| G9 | **Rubric scattered**: 23 dimensions across 26 files; `typography` missing from the `AuditDimension` enum; Doc-10's idealized rubric diverges from code | Medium | One `packages/core/src/audit/rubric.ts` registry (id, title, stage availability, what-good-looks-like) that passes register against and the dashboard renders; fix the enum | New small spec; reconcile with doc-10/16 specs |
| G10 | **Docs 13–18 not generatable** while I01 expects 18 docs knowledge-loaded | Medium | Decide: either add 13–18 to `GENERATABLE` (they're specced; mostly business-setup docs needing few client fields) or amend I01's knowledge-load list to 01–12 + selected ops docs | Decision + small engine change (spec 08/09 follow-up) |
| G11 | **`UPRIVER_GATE_AUTO` pending** (e2e step 0) and must stay env-gated, loud, never default | Note | Build as specced in the e2e prompt; add a test that default behavior is byte-identical | e2e prompt step 0 |
| G12 | Misc hygiene: stale `build/*` branch pointers; `specs/04-recon-evidence/` location; press-source scrape absent; social-design grade absent | Low | Batch into next housekeeping pass | — |

## Stays human (charter final section) — clean, two watch items

No code crosses money, safety, signatures, or brand-final-approval: provisioning emits `[OPERATOR ACTION]` for every account/billing/OAuth/publish step; secret-shopper never contacts the business itself; deployment steps are operator-manual by design; payment/signature handling lives only in the marketing site's human-driven proposal flow. Watch items: (1) the planned `UPRIVER_GATE_AUTO` is a deliberate gate bypass — keep it env-only, logged loudly, and never a default (G11); (2) hardcoded prices in `next-steps.astro` put a money artifact in code rather than behind an HV-verified field — G1's proposal generator should subsume it.

## Bottom line

The spine and back half match their specs with only intentional deviations, all changelogged. The delta is concentrated exactly where the charter predicted: stages 3, 5, and 6 of the front funnel (qualifier, Ahrefs, tool-state audit, and above all the proposal generator) plus the profile→website bridge. Recommended build order for the delta: G2 (stage field — small, unblocks scoping everywhere) → G1+G3 (the revenue path) → G4+G5 (deep-audit depth) → G6 (website bridge) → G8–G10. And before any of it: execute the staged synthetic e2e run — this audit verified the machine; that run proves the lifecycle.
