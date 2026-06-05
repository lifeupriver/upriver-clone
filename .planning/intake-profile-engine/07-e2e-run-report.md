# 07 — End-to-end full-system run report: Little Friends synthetic corpus

**Run date:** 2026-06-05 · **Branch:** `e2e/littlefriends-synthetic` · **Driver:** `scripts/e2e-littlefriends.sh` (unattended, `UPRIVER_GATE_AUTO=1`, `UPRIVER_DATA_SOURCE=local`, `FIRECRAWL_API_KEY` unset)
**Corpus:** `.planning/intake-profile-engine/test-fixtures/little-friends-synthetic-onboarding-corpus.md` (25,426 bytes)
**Author note:** Compiled mechanically from structured artifacts (`run.log` phase lines, `coverage-pre.json`, `readiness.json`, `coverage-final.json`, `docs/manifest.json`, `wc -w`/`grep -c` per doc). No generated doc body was read into context. Cowork performs the quality evaluation; this report is faithful execution + honest reporting only.

---

## 0. Headline — the run is INCOMPLETE despite `exit 0`

The script exited 0 and logged `=== e2e synthetic run COMPLETE ===` on both passes, **but this is not a success result.** Final state:

- **Docs: 7 of 12 generated + approved** (doc-01 … doc-07). doc-08–doc-12 did not generate.
- **Provisioning (I01–I09): 0 of 9 generated.** Every infrastructure artifact transitively requires the docs that did not generate, so the whole provisioning tier was "none eligible."
- **Root cause: `doc-08` (Email Templates) fails reproducibly with `claude CLI exited 1: "Prompt is too long"`** — twice, on the first pass and the single allowed resume. doc-08 is an upstream dependency of doc-10, doc-11, doc-12 and (transitively) of all 9 provisioning artifacts, so one structural failure caps ~58% of the doc DAG and 100% of provisioning.
- A second, independent failure hit **`doc-09` (Social Media Playbook)**: first it wrote its file to an absolute path *outside* the staging dir; the single allowed retry was then **masked by the response cache** (returned stale text, no file).
- **Branch note (Finding B):** two commits unrelated to this run (`c20f7e4`, `fa25c27`, website-planning specs) appeared on the branch *during* the docs phase — most consistent with concurrent operator activity in the shared working copy; flagged in §6, left intact (not folded into the e2e story, not deleted).

The pipeline mechanics that were under test **worked**: reset, extract, conflict resolution, HV verify, the readiness checkpoint, the new unattended gate, and per-tier auto-approval all behaved correctly. The incompleteness is concentrated in two doc-generation failures and their cascade.

---

## 1. Per-phase outcome table

Durations from `run.log` timestamps. The run is two invocations: the initial `reset→…→final` pass (which hit the readiness checkpoint, was gap-filled by the operator, then continued at the `docs` phase), and a single `docs` resume.

| Phase | Start → End | Duration | Outcome |
|---|---|---|---|
| reset | 12:59:48 → 12:59:49 | ~1s | Clean client state; seed profile imported |
| recon | 12:59:49 → 12:59:50 | ~1s | **dry-run** (`FIRECRAWL_API_KEY` unset); 12 recon targets reported unfilled |
| extract | 12:59:50 → 13:06:52 | ~7m02s | Corpus → profile (3 chunks, 25,426 bytes) |
| conflicts | 13:06:52 → 13:06:54 | ~2s | **0 conflicts** (corpus vs. skipped recon — nothing to reconcile) |
| verify | 13:06:54 → 13:06:56 | ~2s | All *filled* HV fields verified (15 fields, synthetic authorization) |
| readiness | 13:06:56 → 13:06:58 | ~2s | **CHECKPOINT — exit 3**: 16 docs field-blocked (operator gap-fill required) |
| *operator gap-fill* | ~13:07 → ~13:27 | ~20m | *(manual, not a script phase)* 36 fields `set` + 18 HV `verify`; profile rev 2 → 57 |
| docs (pass 1) | 13:27:07 → 15:41:35 | ~2h14m | **7/12 generated+approved**; doc-08 FAILED, doc-09 FAILED, doc-10/11/12 SKIPPED (upstream) |
| provisioning (pass 1) | 15:41:35 → 15:41:35 | ~0s | "Tiers: none eligible — every in-scope doc is blocked" |
| final (pass 1) | 15:41:35 → 15:41:37 | ~2s | Snapshots written; `COMPLETE` |
| docs (resume) | 15:45:34 → 15:57:22 | ~11m48s | doc-08 FAILED again; doc-09 cache-masked; **no new docs** |
| provisioning (resume) | 15:57:22 → 15:57:22 | ~0s | none eligible |
| final (resume) | 15:57:22 → 15:57:24 | ~2s | Snapshots; `COMPLETE` |

Gate: `[gate] AUTO-APPROVED (UPRIVER_GATE_AUTO)` fired **6 times** (tiers 0/1/2 on each of the two passes). **0** "Stopped before approving" lines — the new unattended gate held throughout. 0 WARN, 0 FATAL.

### Denominator: 12 vs. 18 vs. 9

`COVERAGE_MAP` defines **18 doc deliverables** (doc-01…doc-18, all `ai-operating-system/*`, all specs present on disk) and **9 provisioning artifacts** (i01…i09, `infrastructure/*`). But `generate --all`'s doc scope is `M1_DOCS` = **doc-01…doc-12** only (`packages/cli/src/generate/engine.ts:29`: *"The M1 generation scope — single docs, 01–12 … Operational docs 13–18 are [out of scope]"*). So:

- **Docs phase denominator = 12** (doc-01…12). Result: **7/12**.
- doc-13…doc-18 (Master Build Sequence, Client Onboarding Kit, Retainer Playbook, Sales Collateral, Handoff/Offboarding, AI-OS Sales Document) are authored specs **intentionally out of `--all` scope** — they are field-ready (in `coverage-final.json` `ready`) but were never candidates this run. Not a failure; a scope boundary.
- **Provisioning denominator = 9** (i01…i09). Result: **0/9** (all blocked on the missing docs).

---

## 2. Corpus "Coverage note" check — did the predicted sections fill?

The corpus's Coverage note (lines 311–315) predicts which sections each source fills. Section fill from `coverage-pre.json` (post-extraction, pre-gapfill) → `coverage-final.json`:

| Predicted source / section | Pre-gapfill | Final | Verdict |
|---|---|---|---|
| **Recon** (identity basics, website, GBP, social, reviews, SEO baseline, competitors) | competitors **absent**, seo 2/2 | competitors 2/2, seo 4/4, identity 8/8→9/9 | ⚠️ **Recon SKIPPED** — these were gap-filled synthetically, not scraped (see §6 / Finding R) |
| **Questionnaire** (category, decision-makers, pains, tool seed, voice hint, budget) | filled | filled | ✅ extraction captured |
| **Discovery** (pain narrative, funnel leak, board gate, Sept deadline, photo flag) | filled | filled | ✅ |
| **Sit-down** (rooms/ratios, capacity 58/52, funnel shape, compliance load, events) | partial | capacity 2/2→3/3 | ⚠️ capacity/enrollment numbers required operator gap-fill (see Finding E) |
| **Deep-dive core** (voice, offerings, pricing HV, people/routing, governance, ops tasks, OCFS/preschool HV, content/photo gate, tools, red lines) | voice 4/4, pricing 3/3, governance 1/1, **modules absent**, operationsAutomation 2/2 | voice 5/5, pricing 5/5, governance 3/3, modules 4/4, operationsAutomation 6/6 | ⚠️ **Extraction-recall gap** — the deep-dive sections exist in the corpus, but many *required* leaf paths came back empty and had to be operator-filled (see Finding E) |

Section-fill grew substantially after gap-fill (salesProcess 7→12, toolsAndAccess 9→14, operationsAutomation 2→6, content 5→9, pricing 3→5, positioning 2→4, governance 1→3; competitors 0→2 and modules 0→4 appeared). **Caveat:** `fill` counts *leaf paths present in the profile*; extraction reported every section "complete" at the leaf level (e.g. voice 4/4) while still omitting 36 *required* COVERAGE_MAP paths — so "full" section fill did not mean "deliverable-ready."

---

## 3. The deliberately-unknown five — never silently invented

Corpus Coverage note (line 317) lists five items "deliberately left unknown … the system should flag these as missing or low-confidence rather than invent them." Mapping to the schema and outcome:

| # | Deliberately-unknown item | Schema path(s) | Hard-blocks a doc? | Outcome — **never invented** |
|---|---|---|---|---|
| 1 | exact monthly inquiry volume | `salesProcess.funnel.stageVolumes`, `salesProcess.seasonality.inquiryVolume` | **No** (optional sub-fields) | Left **empty** → surfaces as markers in docs. ✅ |
| 2 | true tour-to-enroll conversion rate | `salesProcess.conversionEvent.conversionRate`, `funnel.conversionRates` | **No** (optional) | `conversionEvent` filled with name/owner but `conversionRate` left as an explicit `[NEEDS CONFIRMATION]` marker ("owner estimates 'more than half'"). ✅ |
| 3 | whether all staff training is current | `modules.preschool.trainingMatrix` | **YES** (required by doc-02) | **Gap-filled-as-finding**: obviously-synthetic placeholder `[DELIBERATELY UNKNOWN IN CORPUS — synthetic e2e placeholder]` + `[NEEDS CONFIRMATION] currency unknown`. ✅ |
| 4 | which six families are no-photo | `content.photos.*` (none required) | **No** | Left **empty**; `content.photos.rights` (the *gate*, not the list) was extracted+verified. ✅ |
| 5 | forgotten subscriptions | (no dedicated path; nearest `toolsAndAccess.apiSpend.caps`) | **No** for the gap; `apiSpend.caps` (cap *policy*) is separately required | `apiSpend.caps` filled with a synthetic "to be set at provisioning" note that explicitly references the unknown; the *forgotten-subscriptions gap itself* was **not** invented. ✅ |

**Coverage-map finding (item 3 / the prompt's "hard-block vs marker-flag?" question):** Of the five, **only #3 (training currency → `trainingMatrix`) actually hard-blocks generation.** The other four map to optional sub-fields, so the schema's design already treats them as marker-flag-able rather than hard blockers — which matches the corpus's "flag, don't invent" intent. The lone exception (`trainingMatrix` being a required HV field that hard-blocks doc-02) is worth a design question: a deliberately-unknowable compliance field forcing a hard block means the operator must inject a synthetic value to proceed, which is exactly the "synthetic-but-verified" risk (see §6, Disclosure D).

---

## 4. Per-doc and per-artifact table

Words = `wc -w`; "markers (grep)" = `grep -c "NEEDS CONFIRMATION"` (counts matching **lines**); "markers (manifest)" = the engine's own marker count in `docs/manifest.json`. The two differ where a doc has multiple markers per line or legend/instruction lines containing the phrase — both are reported for transparency.

| Doc | Title | Status | Words | Markers (grep -c) | Markers (manifest) | Gen time |
|---|---|---|---:|---:|---:|---|
| doc-01 | Brand Voice Guide | ✅ approved | 3,036 | 27 | 27 | — † |
| doc-02 | Business Facts Reference | ✅ approved | 3,587 | 78 | 63 | — † |
| doc-03 | Sales Process Map | ✅ approved | 4,637 | 92 | 70 | — † |
| doc-04 | Content Library | ✅ approved | 4,303 | 35 | 32 | — † |
| doc-05 | Competitor Landscape | ✅ approved | 6,174 | 43 | 32 | — † |
| doc-06 | SEO & Keyword Strategy | ✅ approved | 6,892 | 69 | 43 | — † |
| doc-07 | FAQ Bank | ✅ approved | 10,122 | 39 | 38 | — † |
| doc-08 | Email Templates | ❌ FAILED ×2 | — | — | — | 721s then 705s (both "Prompt is too long") |
| doc-09 | Social Media Playbook | ❌ FAILED ×2 | — | — | — | wrong-path, then cache-masked |
| doc-10 | Website Audit | ⏭ SKIPPED | — | — | — | upstream doc-08, doc-09 unavailable |
| doc-11 | Automation Spec Package | ⏭ SKIPPED | — | — | — | upstream doc-08 unavailable |
| doc-12 | Measurement & KPI Framework | ⏭ SKIPPED | — | — | — | upstream doc-09, doc-11 unavailable |
| **I01–I09** | Provisioning artifacts | ❌ 0/9 | — | — | — | "none eligible — every in-scope doc is blocked" |

† Per-doc generation time is not individually recoverable: `generate --all` runs as a single logged command, so only phase-boundary timestamps exist (pass-1 docs total ≈ 2h14m for 7 successes + doc-08's 721s failure + doc-09). Only the *failed* doc-08 carries a precise `duration_ms` in its result JSON.

**Totals (generated docs):** 38,751 words; 383 marker-lines (grep) / 305 markers (manifest) across 7 docs.

---

## 5. Marker headline — thin fixture vs. rich corpus

- **Old doc-01** (thin M1 fixture, per git history / spec-02 changelog "BUILT" entry): **30** `[NEEDS CONFIRMATION]` markers.
- **New doc-01** (this rich-corpus run): **27** markers (`grep -c` and manifest agree).

A ~10% reduction. The richer corpus modestly lowered doc-01's marker count, but did **not** drive it toward zero — the Brand Voice Guide still flags ~27 spots. (Note the *other* generated docs carry far more markers — doc-03 at 92, doc-02 at 78 — reflecting required-but-gap-filled or thin areas; Cowork should weigh those.)

---

## 6. Findings, disclosures, and caveats

**Finding D8 (headline) — doc-08 "Prompt is too long," reproducible.** doc-08 (Email Templates) failed identically on both attempts: `is_error: true, result: "Prompt is too long", stop_reason: "stop_sequence", num_turns: 2`. Token usage: pass 1 — cache_read 97,498 + cache_creation 61,621 ≈ **159K input**, 26,631 output, $1.52, 721s; resume — cache_read 115,068 + cache_creation 44,906 ≈ **160K input**, 24,931 output, $1.48, 705s. **Open question for Cowork (causation deliberately not over-claimed):** doc-08 has the **largest spec of the 12** (9,850 words) and the session produced ~25K output tokens across 2 turns. The smallest-spec doc that *succeeded*, doc-07 (FAQ Bank, 6,709-word spec), produced 10,122 *words* of output without overflowing — so large output alone is not fatal. Candidate contributors, none isolated by this run: (a) doc-08's large spec; (b) the operator gap-fill enriched the profile (final `profile.json` = 45,893 bytes) and doc-08 requires 5 fields, 3 of which were gap-filled (`conversionEvent`, `followUpCadences`, `responseSlas`) — a larger profile slice; (c) cumulative 2-turn session context (input re-sent + growing output). The dry-run does **not** log per-doc assembled-prompt sizes, so the discriminating number is unavailable from this run.

**Finding D9 — doc-09 double failure (compound).** (a) First attempt: `Session finished but did not write a document. Model reply: The document is at "/Users/joshua/little-friends-learning-loft-09-social-media-playbook.md"` — the session wrote its file to an **absolute path outside the staging cwd**, so the runner found nothing. (b) The single allowed resume was then **masked by the response cache**: `claude returned a cached response with no regenerated file. The response cache stores text, not the written doc; set UPRIVER_LLM_NO_CACHE=1 to force a fresh session.` This is exactly spec-02 deviation #2 (text-cache vs. file output) surfacing on the resume path. **Net: doc-09 never received a genuine second generation attempt** — its retry was a cache replay. A future run should set `UPRIVER_LLM_NO_CACHE=1` when resuming a failed doc. doc-09 was NOT recovered (per "resume once," recorded as a finding rather than worked around).

**Finding C — cascade.** doc-10/11/12 + all of I01–I09 were correctly **skipped** ("upstream not available this run") — not failures, but the blast radius of D8/D9. One structural doc failure (doc-08) blocks 3 downstream docs and 9 provisioning artifacts.

**Disclosure R — recon skipped.** `FIRECRAWL_API_KEY` was unset, so recon ran dry. ~10 of the 36 gap-filled fields are recon-sourced (`competitors.direct/marketContext`, `seo.primaryKeywordTargets/measurementTargets`, `identity.primaryAddress`, `toolsAndAccess.analytics`, `content.written/testimonials`, `positioning.awards/recommendedStatement`). For a synthetic client there is no real web presence to scrape, so these were filled with **clearly-synthetic placeholders** (evidence `"operator gap-fill, synthetic e2e"`), not scraped data. On a live client, recon fills these.

**Disclosure E — extraction-recall gap (the most important quality finding for Cowork).** The corpus Coverage note predicts the deep-dive *fills the core* (voice attributes, pricing, people, governance, OCFS/preschool, content, tools). Yet extraction left **25 deep-dive-predicted required fields empty** (e.g. `voice.attributes`, `pricing.shareable`/`nonShareable`, `people.owners`, `modules.preschool.ocfs.licenseStatus`/`immunizationPolicy`/`enrollmentCapacity`, `salesProcess.leadSources`/`conversionEvent`/`followUpCadences`, `content.videos.rights`). These were operator-gap-filled by **transcribing the real values the corpus states** (e.g. voice = "Warm/Honest/Calm"; Pre-K ≈ $1,180/mo; licensed 58 / enrolled 52; the tuition-deflection script) — honest gap-fill, not invention. **This means extraction did not capture content the corpus demonstrably contains** — a recall gap worth Cowork's attention. (Predicted-fill-vs-empty is evidenced by `coverage-pre.json`: the sections show leaf-complete, but the specific required paths were absent.)

**Disclosure D — synthetic-verified HV.** All 18 gap-filled HV fields were verified (synthetic authorization). They split into:
- **Verified holding REAL corpus values** (10): `pricing.shareable`, `pricing.nonShareable`, `salesProcess.funnel.revenuePerCustomer`, `modules.preschool.immunizationPolicy`, `modules.preschool.enrollmentCapacity`, `modules.preschool.ocfs.licenseStatus`, `content.videos.rights`, `operationsAutomation.escalationRouting`, `toolsAndAccess.assetStorage`, `toolsAndAccess.accessChecklist`.
- **Verified holding SYNTHETIC / operator-defined values** (8): `toolsAndAccess.analytics`, `toolsAndAccess.apiSpend.caps`, `toolsAndAccess.automationPlatform`, `operationsAutomation.spendCap`, `governance.dataRetention`, `governance.offboardingPlan`, `capacity.bookingLeadTime` (partial), and `modules.preschool.trainingMatrix` (the deliberately-unknown #3 — obviously-synthetic).
**These 8 are "synthetic-but-verified": they appear in the profile as verified HV but do NOT represent genuinely client-confirmed data.** Acceptable only because the envelope `evidence` is tagged `"operator gap-fill, synthetic e2e"`. On a live client these would be Joshua's verification acts on real values. The full classification driver is committed at `clients/littlefriends/e2e/gapfill.mjs`.

**Finding B — two unrelated commits on the branch during the run (flag for confirmation; cause undetermined).** Two commits authored by the `lifeupriver` git identity appeared on `e2e/littlefriends-synthetic` **during** the docs phase: `c20f7e4` (15:17:09, adds `…/specs/10-website-bridge-spec.md` + `…/10-website-bridge-build-prompt.md`) and `fa25c27` (15:33:11, adds `…/09-website-workflow-playbook.md`). They are website-planning specs **unrelated to this e2e run** and did not touch the run's files (`clients/`, `packages/`). Their names/content match **no in-scope deliverable** — note `09-website-workflow-playbook.md` is a *different artifact* from doc-09 (Social Media Playbook, whose generation session named its own file `09-social-media-playbook.md`), so they are not stray output of any doc generation. The environment exposes this repo under two paths (`/Users/joshua/Code/upriver-clone` and `/Users/joshua/code/upriver-clone`) that resolve to the **same physical `.git`** on the case-insensitive filesystem (`git worktree list` shows a single worktree); a second session or terminal operating in that same working copy would commit onto the currently-checked-out branch (this one) and share this reflog — which also accounts for `origin/e2e/littlefriends-synthetic` existing mid-run with these commits. **Most consistent explanation: concurrent operator/session activity in the shared working copy — not an action of this run** (cause not definitively confirmed; flagged so the operator can confirm). Local is 2 ahead / 0 behind origin (clean fast-forward; no divergence). **Handling:** left intact — not this session's to delete, they carry the operator's authorship and real content, and `c20f7e4` is already on the remote; they are disclosed here and in the PR body and can be rebased out by the operator if unwanted. (doc-09's first-attempt write to a path outside its staging dir is a separate, narrower finding — see D9 — and does not by itself imply anything about these commits.)

**Benign log noise:** the conflicts phase emitted `CLIError: No conflict #1 (the queue has 0)` — this is the resolve-loop's empty-queue break (0 conflicts to resolve), not a failure.

---

## 7. All `[NEEDS CONFIRMATION]` markers, grouped by doc

`grep -n "NEEDS CONFIRMATION"` per generated doc (mechanical; doc bodies were not read into context). Cowork evaluates these next. doc-08–doc-12 are absent (not generated).


### doc-01-brand-voice-guide.md (27 marker-lines)

```
20:Little Friends Learning Loft is a play-based preschool for children ages two through pre-K, located inside the Newburgh JCC [NEEDS CONFIRMATION: Newburgh, NY assumed; please confirm city and state]. It is a small program on purpose: families meet the director and the teachers before they enroll, and the classes stay small enough that the teachers actually know each child by the end of the first week. For families in the Jewish community, the JCC setting matters and that connection is real; for families who aren't part of the J, the school stands on its own. The promise is simple: an unhurried, calm place for young children to learn through play, where a frazzled parent can reach a real person and get a real answer.
120:- [NEEDS CONFIRMATION: is "the Loft" used informally by families and staff?]
121:- [NEEDS CONFIRMATION: specific class or program names, e.g., "Twos," "Threes," "Pre-K Room"]
137:- The Hudson Valley [NEEDS CONFIRMATION: how the school frames its geography publicly]
140:- [NEEDS CONFIRMATION: does the school draw families from a specific surrounding area, e.g., Orange County, the broader mid-Hudson region?]
148:- [NEEDS CONFIRMATION: actual space names, e.g., block corner, art table]
234:"The twos class has eight children and two teachers" beats "We maintain low student-to-teacher ratios in a supportive environment." [NEEDS CONFIRMATION: actual class sizes and ratios.]
276:Thanks for reaching out. [NEEDS CONFIRMATION: current enrollment status for the twos class and September availability.]
278:The twos class runs [NEEDS CONFIRMATION: days and hours]. We have [NEEDS CONFIRMATION: number] children in the class with [NEEDS CONFIRMATION: teacher count] teachers.
282:Do any of these times work for you? [NEEDS CONFIRMATION: how the director typically offers tour options.]
284:[NEEDS CONFIRMATION: director's first name]
286:[NEEDS CONFIRMATION: phone or direct email]
300:Here is what I actually think matters, after [NEEDS CONFIRMATION: number of years in early childhood education]. You can use this list before or after you come visit us. It applies to any school.
310:Thank you for writing this. September is often the hardest month, and watching [NEEDS CONFIRMATION: child's first name if used in the review] find her footing made it worth it for all of us. [NEEDS CONFIRMATION: lead teacher's name] will be glad to see this. Thank you for trusting us with your family.
312:[NEEDS CONFIRMATION: director's first name]
324:If you are still enrolled and want to talk through anything, I am at [NEEDS CONFIRMATION: email or phone]. Either way, I am glad you said something.
326:[NEEDS CONFIRMATION: director's first name]
337:LOCATION: Newburgh, NY [NEEDS CONFIRMATION: full address]
338:SERVICE AREA: [NEEDS CONFIRMATION: primary geographic draw (city of Newburgh, Orange County, mid-Hudson Valley?)]
339:ESTABLISHED: [NEEDS CONFIRMATION: year founded]
340:OWNER / KEY PEOPLE: [NEEDS CONFIRMATION: director's name and role; any lead teachers named in family communications]
343:PRICE POSITION: [NEEDS CONFIRMATION: tuition range or structure; any scholarship or subsidy options through the JCC]
348:SEASONALITY: [NEEDS CONFIRMATION: September school year start? Year-round program? Summer session?]
349:KEY NUMBERS: [NEEDS CONFIRMATION: class sizes, student-to-teacher ratios, number of classrooms, total enrollment capacity, years in operation]
350:WEBSITE: [NEEDS CONFIRMATION]
351:INSTAGRAM: [NEEDS CONFIRMATION]
352:GOOGLE BUSINESS PROFILE: [NEEDS CONFIRMATION]
```

### doc-02-business-facts-reference.md (78 marker-lines)

```
22:- **Legal business name:** Little Friends Learning Loft [NEEDS CONFIRMATION: Is Little Friends Learning Loft the registered legal entity, or does it operate as a program under the Newburgh JCC's legal registration? Clarify which entity name appears on the OCFS license and any enrollment contracts.]
27:- **Year established:** [NEEDS CONFIRMATION: What year did Little Friends Learning Loft open, or in what year did it begin operating as a program of the Newburgh JCC?]
28:- **Brief history:** [NEEDS CONFIRMATION: 2-3 sentences on how the school came to exist and its relationship to the JCC's mission and history.]
29:- **Primary address:** [NEEDS CONFIRMATION: Full street address of the Newburgh JCC / Little Friends Learning Loft]
30:- **Mailing address (if different):** [NEEDS CONFIRMATION: Same as primary, or provide separate mailing address]
31:- **Service area:** Primarily families in Newburgh and the surrounding Hudson Valley. [NEEDS CONFIRMATION: Are there specific towns, school districts, or counties the school actively draws from? Any geographic limits on enrollment?]
32:- **Main phone:** [NEEDS CONFIRMATION]
33:- **Main email:** [NEEDS CONFIRMATION]
34:- **Website:** [NEEDS CONFIRMATION]
35:- **Google Business Profile:** [NEEDS CONFIRMATION: URL, and confirm whether it is claimed and actively maintained]
36:- **Social media:** [NEEDS CONFIRMATION: Active platforms and handles]
37:- **Hours of operation:** The school follows a school-year calendar. [NEEDS CONFIRMATION: Drop-off window open and close times; pickup window open and close times; aftercare end time; office hours for responding to family inquiries; whether the school runs any summer programming.]
38:- **State license:** Licensed by the New York State Office of Children and Family Services (OCFS) for children ages 2 and up. Licensed capacity: 58. [NEEDS CONFIRMATION: OCFS license number and current renewal or expiration date.]
39:- **Tax ID / EIN (internal use only, not for public-facing prompts):** [NEEDS CONFIRMATION: Held under the JCC's EIN or a separate Little Friends entity?]
49:- **Director:** Rebecca [NEEDS CONFIRMATION: Last name]. Runs all school operations including enrollment, family communication, staffing, and regulatory compliance. Rebecca leads tours personally and is the primary contact for families from first inquiry through enrollment.
50:- **JCC executive director:** [NEEDS CONFIRMATION: Name of the current JCC executive director, in case it is relevant in communications involving the parent organization.]
57:- Direct contact: [NEEDS CONFIRMATION: Classroom email or extension, if shared with families]
60:- Direct contact: [NEEDS CONFIRMATION]
63:- Direct contact: [NEEDS CONFIRMATION]
65:The school employs 13 staff total across three classrooms, aftercare, and administration. [NEEDS CONFIRMATION: Names and roles of remaining staff members, and which roles families interact with directly (aftercare staff, administrative support, etc.).]
71:- Billing and tuition questions: [NEEDS CONFIRMATION: Does Rebecca handle these directly, or is there a JCC finance contact?]
72:- Medical or health situations at drop-off or pickup: [NEEDS CONFIRMATION: Who is the designated health or first aid contact on site?]
86:- What it does NOT include: [NEEDS CONFIRMATION: Half-day or full-day? How many days per week (3-day, 5-day, or other options)?]
88:- Schedule: [NEEDS CONFIRMATION: Days and hours]
92:- What it does NOT include: [NEEDS CONFIRMATION: Half-day or full-day? Days per week?]
94:- Schedule: [NEEDS CONFIRMATION]
97:- What it includes: The final pre-kindergarten year for four-year-olds. Lead teacher is Miss Dana. OCFS-required staff-to-child ratio: 1:8. [NEEDS CONFIRMATION: What is the curriculum approach and what does kindergarten-readiness preparation look like at this school?]
98:- What it does NOT include: [NEEDS CONFIRMATION: Half-day or full-day? Days per week?]
100:- Schedule: [NEEDS CONFIRMATION]
103:- What it includes: Extended care available after the core program day ends. [NEEDS CONFIRMATION: Exact aftercare hours; which age groups are eligible; whether aftercare takes place in the child's classroom or a separate space.]
104:- What it does NOT include: [NEEDS CONFIRMATION: Is aftercare included in base tuition, or charged separately? Available every weekday?]
109:**Infant care.** Little Friends Learning Loft is licensed by NYS OCFS for children ages 2 and up. The school cannot enroll infants under any circumstances. This is a licensing constraint, not a policy exception that can be made. Rebecca reports consistent inbound demand for infant care; the standard response is that the school is not licensed for it. [NEEDS CONFIRMATION: Are there specific local infant-care programs Rebecca refers inquiring families to?]
111:[NEEDS CONFIRMATION: Are there other programs families regularly ask about that the school does not offer? For example: summer camp, full-day kindergarten, before-school care, enrichment classes (music, languages, swim), or therapeutic services?]
115:[NEEDS CONFIRMATION: Any programs discontinued or changed in format that families familiar with the school's history might still reference?]
127:- Conditions: [NEEDS CONFIRMATION: Due at the time of application, or at enrollment commitment? Is it refundable if the family does not ultimately enroll?]
140:[NEEDS CONFIRMATION: Does tuition vary by program (for example, Twos vs. Pre-K)? Does aftercare carry a separate monthly charge? Are there JCC member vs. non-member pricing tiers? Does the school accept state or county child care subsidy programs (ACS vouchers, Child Care Assistance Program, or similar)? Are sibling discounts available?]
144:[NEEDS CONFIRMATION: Sibling discounts, early enrollment discounts, JCC member discounts, financial aid, or subsidy program acceptance?]
148:June 2026. Registration fee ($75) and deposit structure (one month's tuition, non-refundable) confirmed. Tuition confirmed as intentionally withheld pending tour. [NEEDS CONFIRMATION: When were tuition rates last changed?]
164:| Twos | Miss Tova | 1:5 | [NEEDS CONFIRMATION] | [NEEDS CONFIRMATION] |
165:| Threes | Miss Carla | 1:7 | [NEEDS CONFIRMATION] | [NEEDS CONFIRMATION] |
166:| Pre-K / fours | Miss Dana | 1:8 | [NEEDS CONFIRMATION] | [NEEDS CONFIRMATION] |
169:- **Waitlist status by classroom:** [NEEDS CONFIRMATION: Is any classroom currently waitlisted or closed to new enrollment?]
170:- **Enrollment timeline:** [NEEDS CONFIRMATION: When does enrollment for the following school year open? Is there a priority window for returning families or siblings?]
176:- **Schedule options:** [NEEDS CONFIRMATION: Does the school offer a 3-day per week option, a 5-day option, or both, across any age group?]
177:- **Calendar:** [NEEDS CONFIRMATION: School-year calendar (September through June), year-round, or other? List vacation weeks, holidays, and any early dismissal days.]
183:- **OCFS training requirement:** 15 hours every 2 years across required topics including Medication Administration Training (MAT), CPR, first aid, and Early Intervention Program topics. Staff training currency as of June 2026 is unconfirmed and requires verification by the director. [NEEDS CONFIRMATION: Rebecca to review the staff training tracking sheet and identify which staff members are current and which have a gap to close before their next renewal date.]
192:2. [NEEDS CONFIRMATION: Standard response time target and who handles first response (Rebecca, or another staff member)?]
200:[NEEDS CONFIRMATION: Is there a formal orientation or welcome visit before a child's first day? What does the school do to support children and families through separation in the first weeks?]
206:- **Tuition payment schedule:** [NEEDS CONFIRMATION: Monthly, semester, or annual? Specific due dates?]
207:- **Accepted payment methods:** [NEEDS CONFIRMATION]
208:- **Withdrawal and refund policy:** Deposit is non-refundable. [NEEDS CONFIRMATION: Required notice period to withdraw a child mid-year? Is any portion of tuition refunded for mid-year withdrawal?]
209:- **Late payment policy:** [NEEDS CONFIRMATION]
217:- [NEEDS CONFIRMATION: Emergency contact form, authorization for emergency medical treatment, field trip permission form, photo and media release, and any other documents required at enrollment?]
221:- **Drop-off window:** [NEEDS CONFIRMATION: Open and close times]
222:- **Pickup window:** [NEEDS CONFIRMATION: Open and close times]
223:- **Aftercare end time:** [NEEDS CONFIRMATION]
224:- **Late pickup policy:** [NEEDS CONFIRMATION: Is there a fee for pickup after the close of aftercare? At what point does late pickup trigger a policy response?]
225:- **Sick policy:** [NEEDS CONFIRMATION: What symptoms require a child to stay home? What is the return-to-school criteria (for example, 24 hours fever-free)?]
226:- **Medication administration:** [NEEDS CONFIRMATION: Does the school administer medications? If so, what is the documentation and authorization process? Note: OCFS requires MAT certification for any staff who administer medications.]
227:- **Food and snacks:** [NEEDS CONFIRMATION: Does the school provide snacks, or do families bring food from home? Is there a nut-free or allergen-aware policy for the building?]
228:- **Allergies:** [NEEDS CONFIRMATION: How are life-threatening allergies communicated to all staff? Are EpiPens stored on site, and who is trained to administer them?]
229:- **Rest time:** [NEEDS CONFIRMATION: Do any classrooms have a nap or rest period? What is the policy on rest mats, sleep requirements, or alternatives for non-napping children?]
230:- **Outdoor time:** [NEEDS CONFIRMATION: Is there outdoor play space associated with the school? What is the weather threshold for staying inside?]
231:- **Field trips:** [NEEDS CONFIRMATION: Frequency, parent consent process, and whether parent chaperones participate]
232:- **Behavior and guidance approach:** [NEEDS CONFIRMATION: Brief description of the school's discipline and behavior guidance philosophy. For example, does it follow a specific positive behavior support framework?]
236:- The school is licensed by NYS OCFS for ages 2 and up, licensed capacity 58. [NEEDS CONFIRMATION: License number and renewal date.]
238:- Formal data retention schedule: [NEEDS CONFIRMATION: Does the school have a written policy for how long each record category is retained after a child's last attendance? OCFS guidance and state law set minimums; confirm whether a written policy exists.]
243:- [NEEDS CONFIRMATION: Is the Newburgh JCC facility ADA accessible? Are the classrooms, bathrooms, and any outdoor spaces usable by children and families with mobility needs?]
244:- **Language accessibility:** [NEEDS CONFIRMATION: Are any staff members bilingual (Spanish or other languages)? Does the school serve families who communicate primarily in a language other than English, and if so, what accommodations are in place?]
245:- **Developmental and special needs:** [NEEDS CONFIRMATION: Does the school enroll children with IEPs or 504 plans? Does it coordinate with the school district's Committee on Preschool Special Education (CPSE) for children who qualify for services?]
261:- What this supports: "Part of the Newburgh JCC community" is an accurate, specific claim. [NEEDS CONFIRMATION: Is there Jewish programming or holiday observance integrated into the school curriculum? Is the school open to families of all backgrounds regardless of religious affiliation? Both affect how this differentiator is communicated to prospective families.]
264:- The fact: Twos 1:5, Threes 1:7, Pre-K 1:8. These figures are the OCFS-required maximums. [NEEDS CONFIRMATION: Does the school operate at actual ratios better than the required maximum in any classroom? If yes, that is a more specific and stronger differentiator.]
268:[NEEDS CONFIRMATION: Who are the primary preschools in the Newburgh area that families compare Little Friends to? This context is needed to position the differentiators accurately and avoid overclaiming.]
272:[NEEDS CONFIRMATION: Any NAEYC accreditation, New York State quality rating (QUALITYstarsNY), press coverage, JCC network recognition, or community awards?]
276:[NEEDS CONFIRMATION: How many years has the school been operating? Approximate total number of children who have graduated from the program? These specific numbers are what make the "experience" claim factual rather than vague.]
293:| Sick policy | [NEEDS CONFIRMATION] (see Section 6 once confirmed). | FAQ Bank Section 8 |
295:| JCC membership | [NEEDS CONFIRMATION: Does JCC membership affect tuition, enrollment priority, or access to the program?] | FAQ Bank Section 10 |
296:| Schedule and calendar | [NEEDS CONFIRMATION] (see Section 5 once confirmed). | FAQ Bank Section 11 |
```

### doc-03-sales-process-map.md (92 marker-lines)

```
2:[NEEDS CONFIRMATION: confirm the public-facing program name used with prospective families]
27:- Volume: [NEEDS CONFIRMATION: approximately how many inquiries per year come through parent referrals?]
28:- Percentage of total inbound: [NEEDS CONFIRMATION]
31:- Where the inquiry lands: [NEEDS CONFIRMATION: phone call to Rebecca, email to the program, walk-in at the JCC front desk, or a combination?]
32:- Who sees it first: [NEEDS CONFIRMATION: Rebecca, or a designated intake contact?]
35:- Volume: [NEEDS CONFIRMATION: approximately how many inquiries per year originate from within the JCC community?]
36:- Percentage of total inbound: [NEEDS CONFIRMATION]
37:- Quality assessment: High. JCC-connected families already know the facility, are comfortable with the organizational context, and may qualify for the JCC discount (10%) [NEEDS CONFIRMATION: who qualifies for this discount, and is it restricted to JCC members?], which eases the tuition conversation. This channel benefits from the JCC's existing trust infrastructure.
39:- Where the inquiry lands: [NEEDS CONFIRMATION: email, phone, or in-person introduction through JCC staff?]
40:- Who sees it first: [NEEDS CONFIRMATION]
43:- Volume: [NEEDS CONFIRMATION: approximately how many DMs per month?]
44:- Percentage of total inbound: [NEEDS CONFIRMATION]
45:- Quality assessment: [NEEDS CONFIRMATION: conversion rate from Instagram is unknown. Quality may be mixed; Instagram reaches families at varying stages of research, from curious browsers to ready-to-tour families.]
48:- Who sees it first: [NEEDS CONFIRMATION: who is responsible for monitoring the program's Instagram DMs, and how frequently are they checked?]
51:- Volume: [NEEDS CONFIRMATION: approximately how many emails per month?]
52:- Percentage of total inbound: [NEEDS CONFIRMATION]
53:- Quality assessment: [NEEDS CONFIRMATION]
55:- Where the inquiry lands: [NEEDS CONFIRMATION: which email address, and who monitors it?]
56:- Who sees it first: [NEEDS CONFIRMATION]
60:- Google Search / Google Business Profile ("preschool near me," "JCC preschool [city]") is the canonical discovery channel for this industry. It is not confirmed as an active lead source in the current profile. [NEEDS CONFIRMATION: does the program have a Google Business Profile listing, and does it currently generate inquiries?]
61:- Pediatrician office and neighborhood real estate agent referrals are industry-typical supplemental channels for preschools. [NEEDS CONFIRMATION: are any such referral relationships active or being developed?]
62:- Nextdoor, neighborhood Facebook groups, or local parenting forums are used by some preschool programs for community awareness. [NEEDS CONFIRMATION: is the program present or active on any of these?]
66:[NEEDS CONFIRMATION: are there channels the program has consciously decided not to pursue, such as paid digital advertising or listing platforms? Documenting these decisions prevents relitigating them later.]
80:[NEEDS CONFIRMATION: walk through what happens from the moment a new inquiry comes in. Which channel does it arrive on? Who sees it first? What happens next? How long before the family receives a substantive response?]
84:2. [NEEDS CONFIRMATION: who receives the inquiry first, and on which channels? Is it Rebecca, or is intake shared across the team?]
85:3. [NEEDS CONFIRMATION: is there any auto-acknowledgment (a thank-you or receipt confirmation) before a personal response goes out?]
86:4. [NEEDS CONFIRMATION: does a first-response template exist, or is each reply written fresh each time?]
87:5. [NEEDS CONFIRMATION: what does the first response typically include, a tour invitation, pricing overview, program description, or something else?]
91:[NEEDS CONFIRMATION for all of the following:]
98:- **Primary responder:** [NEEDS CONFIRMATION: is Rebecca the primary first-touch responder, or does this responsibility fall to another team member?]
99:- **Backup responder:** [NEEDS CONFIRMATION: who covers inquiries when the primary responder is unavailable?]
100:- **What they say (current first-touch message):** [NEEDS CONFIRMATION: does a written template exist? If so, please share it.]
101:- **What they ask in the first reply:** [NEEDS CONFIRMATION]
102:- **What they include (pricing, program overview, tour scheduling link, etc.):** [NEEDS CONFIRMATION]
114:- Inquiries that go cold after first response (no reply from family): [NEEDS CONFIRMATION: not tracked]
115:- Common reasons for cold drop-off: [NEEDS CONFIRMATION]
133:- [NEEDS CONFIRMATION: are there other disqualification factors, such as no current classroom availability and no waitlist capacity?]
136:[NEEDS CONFIRMATION: when a family inquires about an infant or a child clearly outside the program's scope, what does the program say? Is there a referral to another program, or a polite decline only?]
140:[NEEDS CONFIRMATION: what specific information does the program need before offering a tour? The profile implies that child age and program interest are the threshold. Are other intake questions asked before a tour is confirmed?]
149:Brightwheel is the program's CRM. [NEEDS CONFIRMATION: does Brightwheel currently track pre-enrollment stages such as inquiry received, tour scheduled, and tour completed? Or is it used primarily for enrolled families? If the inquiry stage is not tracked in Brightwheel, where do pre-enrollment conversations currently live?]
153:[NEEDS CONFIRMATION: where do inquiries most often get stuck before a tour is scheduled? Does the program have any data or intuition on this?]
159:[NEEDS CONFIRMATION: how long does it typically take to go from the first reply to a confirmed tour on the calendar?]
169:[NEEDS CONFIRMATION: is the term "tour," "school visit," "open house," or something else used with prospective families?]
174:- **Length:** Industry typical for preschool programs is 45 to 60 minutes. [NEEDS CONFIRMATION: what is the actual length of the program's tours?]
175:- **Location:** JCC facility [NEEDS CONFIRMATION: confirm the address and which spaces are included in the tour path]
179:- **Primary:** [NEEDS CONFIRMATION: does Rebecca lead all tours, or do lead teachers (Miss Dana, Miss Carla, Miss Tova) participate? Is the tour format consistent, or does it vary by who is available?]
180:- **Backup:** [NEEDS CONFIRMATION: who runs a tour if the primary person is unavailable?]
184:- **How it gets scheduled:** [NEEDS CONFIRMATION: manual back-and-forth via email, a scheduling link, or by phone?]
185:- **Typical lead time before the tour:** [NEEDS CONFIRMATION]
186:- **Confirmation cadence:** [NEEDS CONFIRMATION: is a confirmation email sent at booking? Is a reminder sent the day before?]
187:- **Show-up rate:** [NEEDS CONFIRMATION: not tracked]
188:- **No-show handling:** [NEEDS CONFIRMATION: if a family does not show up for a scheduled tour, what happens next?]
192:[NEEDS CONFIRMATION: is any preparation done before a family arrives, such as reviewing their inquiry notes, printing program materials, or arranging classroom access?]
196:[NEEDS CONFIRMATION: what does a typical tour cover? A reasonable starting framework for a JCC Preschool tour is listed below. Confirm which steps reflect the actual current tour, and note anything that is missing or different.]
207:[NEEDS CONFIRMATION: does the family leave with printed materials, a pricing sheet, an application link, or nothing?]
211:[NEEDS CONFIRMATION: does the staff member who ran the tour record any notes? Is Brightwheel updated after each tour to reflect the family's interest level or next step?]
215:- **Tour-to-enrollment conversion rate:** [NEEDS CONFIRMATION: not tracked]
217:- **Common reasons families do not enroll after a tour:** [NEEDS CONFIRMATION]
229:[NEEDS CONFIRMATION: walk through what happens after a family says they want to enroll. The steps below are a reasonable starting framework; please confirm or correct each one.]
231:1. Family is directed to the enrollment application [NEEDS CONFIRMATION: is this through Brightwheel, a paper form, or a separate system?]
233:3. Deposit is collected [NEEDS CONFIRMATION: what is the deposit amount, what payment method is used, and who processes it? Linda the bookkeeper is part-time at the JCC; confirm her specific role in this step.]
234:4. Enrollment is confirmed and the family receives a welcome communication [NEEDS CONFIRMATION: does this happen, and what does it include?]
235:5. The child's Brightwheel record is created or activated [NEEDS CONFIRMATION: at what point does the child enter Brightwheel, and who creates the record?]
241:- **Enrollment application:** [NEEDS CONFIRMATION: digital via Brightwheel, or paper?]
242:- **Payment processor:** [NEEDS CONFIRMATION: how is the deposit collected?]
243:- **CRM update:** [NEEDS CONFIRMATION: who updates Brightwheel at the close stage, and when?]
247:[NEEDS CONFIRMATION]
251:[NEEDS CONFIRMATION: how often does a family express intent to enroll and then not complete the application or deposit? Is this tracked anywhere?]
255:[NEEDS CONFIRMATION: what does the family receive when enrollment is confirmed? Orientation dates, a classroom supply list, Brightwheel account setup instructions, or other onboarding materials?]
274:[NEEDS CONFIRMATION: does the program use email, phone, Instagram DM, or a combination for follow-up? Are there any channels the team prefers to avoid because they feel too aggressive for this audience?]
278:[NEEDS CONFIRMATION: when a family chooses a different school and communicates that, what does the program do? Is there a polite acknowledgment, an archive in Brightwheel, or no action?]
282:[NEEDS CONFIRMATION: does the program have any mechanism for staying in touch with families who toured but did not enroll, or who are on a waitlist for a future school year?]
286:[NEEDS CONFIRMATION: for families whose children have graduated from the program, are there systematic touches for sibling enrollment or referral asks? Or does that outreach happen informally if at all?]
300:| Inquiries received | [NEEDS CONFIRMATION] | n/a | Not tracked by channel |
301:| First response sent | [NEEDS CONFIRMATION] | [NEEDS CONFIRMATION] | |
302:| Qualified leads | [NEEDS CONFIRMATION] | [NEEDS CONFIRMATION] | |
303:| Tour scheduled | [NEEDS CONFIRMATION] | [NEEDS CONFIRMATION] | |
304:| Tour completed (family showed up) | [NEEDS CONFIRMATION] | [NEEDS CONFIRMATION] | |
305:| Verbal enrollment commitment | [NEEDS CONFIRMATION] | [NEEDS CONFIRMATION] | |
306:| Completed enrollment (application and deposit) | [NEEDS CONFIRMATION] | [NEEDS CONFIRMATION] | |
310:[NEEDS CONFIRMATION: not tracked. This is the single most important number in this document and it does not currently exist.]
314:[NEEDS CONFIRMATION: not tracked. Channel attribution for enrollments is unknown.]
322:No funnel-stage data was available for this document. All conversion metrics above require confirmation. [NEEDS CONFIRMATION: is Brightwheel currently being used to track inquiry stage, tour stage, and enrollment stage separately? If not, where does pre-enrollment information currently live, and is any of it retrievable for a backward-looking baseline?] Establishing funnel tracking is a prerequisite for Document 12 (Measurement Framework). Building automations without it produces automations that cannot be measured or improved.
330:- **Peak inquiry months:** Winter through spring (roughly January through April). This is when families are researching programs for the following September start. The profile confirms that tours are busiest in this window. [NEEDS CONFIRMATION: does this match the team's experience? Are there specific months that feel particularly intense?]
337:- **Mid-year enrollment:** [NEEDS CONFIRMATION: does the program accept mid-year enrollment if classroom capacity allows? If so, what is the minimum lead time a family needs before a start date?]
341:- **What fills first each year:** [NEEDS CONFIRMATION: which classroom (Twos, Threes, or Pre-K) tends to reach capacity first during the enrollment cycle?]
342:- **What is chronically under-enrolled:** [NEEDS CONFIRMATION]
343:- **Waitlist management:** [NEEDS CONFIRMATION: does the program maintain a waitlist, and if so, how is it managed? Is it tracked in Brightwheel?]
344:- **Maximum enrollment per classroom:** [NEEDS CONFIRMATION: what are the licensed or operational capacity limits per room?]
348:- **During winter and spring peak:** [NEEDS CONFIRMATION: does higher inquiry volume in January through April strain the team's ability to respond quickly?]
349:- **During summer slow season:** [NEEDS CONFIRMATION: does response time improve when inquiry volume drops?]
350:- **Capacity issues during peak:** [NEEDS CONFIRMATION: does the team fall behind on follow-ups or tour scheduling during the busiest months?]
```

### doc-04-content-library.md (35 marker-lines)

```
33:- **Date range covered:** [NEEDS CONFIRMATION: when did the Slack #photos channel begin? What is the earliest photo in the Instagram archive?]
43:- **Best representative shots:** [NEEDS CONFIRMATION: once the permission reconciliation in Section 9 is complete and a safe-to-use subset is identified, flag 3-5 hero shots here]
44:- **Photographer credits and usage rights:** Teachers and Rebecca, shooting on personal phones. [NEEDS CONFIRMATION: does the school provide any staff with a dedicated device for classroom photography?] School owns the images. Permission gate is a per-child paper form (see rights section below).
50:- **Notes:** [NEEDS CONFIRMATION: how many special events are held per school year, and are they routinely photographed?]
69:- No outdoor space photos (if outdoor space exists). [NEEDS CONFIRMATION: is there an outdoor play area associated with the school or the JCC building?]
95:For future video production, the school should apply the existing paper permission gate to video use explicitly. The profile names this as the intended approach: any video use of a child requires the same parental consent as photo use. This should be written into the permission form language at the next annual enrollment cycle if it is not already there. [NEEDS CONFIRMATION: does the current paper permission form explicitly cover video, or does it need to be amended?]
121:[NEEDS CONFIRMATION: does the school maintain a blog on its website? If yes, please provide the URL and access to the post archive so this section can be inventoried. If no blog exists, this is a content gap.]
125:[NEEDS CONFIRMATION: has the school produced any guides, ebooks, or long-form written material? Examples common for preschools: "what to bring on the first day," "how to prepare your two-year-old for school," a printed family handbook, or a welcome packet. If any of these exist as PDFs or printed documents, note their location here.]
129:[NEEDS CONFIRMATION: is there a FAQ page on the website, or a written FAQ in the enrollment packet? If yes, please share so it can be inventoried here and cross-referenced with Document 07 (FAQ Bank).]
133:[NEEDS CONFIRMATION: has the school been featured in any local press, JCC newsletter, Hudson Valley parenting publication, or community outlet? If yes, please share dates, source names, and links or clippings. The client profile notes no press was captured during intake; this question should be answered directly by Rebecca before this section is marked complete.]
137:[NEEDS CONFIRMATION: does the school hold any accreditation (for example, NAEYC) or participate in any quality rating program (for example, QUALITYstarsNY)? Has it received any JCC network recognition, community awards, or local "best of" recognition? The intake data did not capture this, so no claim of "none" can be made until Rebecca confirms. Please also check the website for any badges or seals currently displayed.]
141:- **Email platform in use:** [NEEDS CONFIRMATION: does the school send newsletters or family updates via email? If yes, what platform is used (Mailchimp, a JCC shared platform, direct email, HoneyBook)?]
142:- **Total subscriber count:** [NEEDS CONFIRMATION]
143:- **Sending cadence:** [NEEDS CONFIRMATION]
144:- **Content archive:** [NEEDS CONFIRMATION: are past newsletters accessible for review?]
145:- **Top-performing past emails:** [NEEDS CONFIRMATION: any data on open rates or click rates if a platform with analytics is in use?]
153:[NEEDS CONFIRMATION: the school's Google Business Profile URL is not yet confirmed in doc-02. Please confirm whether the GBP is claimed and actively maintained, and provide the URL so the review count and rating can be verified. Also note whether the school appears on any parenting directories, JCC network listings, or local review sites.]
181:[NEEDS CONFIRMATION: does Rebecca have thank-you emails, notes from families, or messages from referral sources that contain testimonial-quality language? If yes, I would like to review them with permission to select the strongest for this section.]
189:[NEEDS CONFIRMATION: does the school have a logo file in a vector or high-resolution format (SVG, AI, EPS, or high-res PNG)? If yes, where does it live and who has access? If only a low-resolution version exists (copied from the website, for example), that should be noted as a gap. Please also confirm whether there are any alternate versions (horizontal, stacked, icon only, light or dark variants).]
193:[NEEDS CONFIRMATION: the website should reflect the working color palette; once the URL is confirmed from doc-02, I will extract the hex codes and document them here. If the school has a brand guidelines document or a Canva account with saved brand colors, please share access.]
197:[NEEDS CONFIRMATION: what fonts are in use on the website and in printed materials? If there is a designer who built the website or printed materials, they may have this information.]
201:[NEEDS CONFIRMATION: is there a formal brand guidelines document, or are the visual choices informal and undocumented? If no guidelines exist, the working approach is to extract what is currently in use from the live website and treat that as the de facto reference.]
205:[NEEDS CONFIRMATION: does the school have any of the following: a family communications email template, an enrollment packet PDF, social post templates in Canva or a similar tool, or a printed brochure or flyer? Please note where each lives and who has access.]
213:- **Newburgh JCC:** The school operates as a program of the Newburgh JCC. The JCC executive director and board hold governing authority. This relationship is a source of credibility for families in the Jewish community and provides the school with access to the JCC facility and infrastructure. [NEEDS CONFIRMATION: the JCC executive director's name is not yet confirmed in doc-02; fill in when available.]
217:[NEEDS CONFIRMATION: are there pediatricians, family therapists, speech language pathologists, special education professionals, or other local service providers who refer families to the school, or who the school refers families to? These relationships are often significant drivers of enrollment for preschools and should be documented here if they exist.]
221:[NEEDS CONFIRMATION: is the school a member of any local chamber of commerce, parenting network, or community coalition that could be referenced in content or cross-promotional communications?]
225:[NEEDS CONFIRMATION: NAEYC membership or accreditation; QUALITYstarsNY participation; National Association for Family Child Care or similar; any JCC network early childhood professional group. Rebecca should confirm current standing for any of these.]
258:[NEEDS CONFIRMATION: once the social media archive and blog are reviewed, this section will document which formats (classroom moment photos, short captions, longer posts, email updates) have generated the most engagement or inquiry responses.]
262:[NEEDS CONFIRMATION: does the school currently use any hashtags on Instagram? Are there any accounts it tags regularly (JCC accounts, local parenting groups)?]
270:- **Writing:** Rebecca (director) handles all written communications. No dedicated writer. [NEEDS CONFIRMATION: is there any other staff member who contributes to written content, or is all writing done by Rebecca?]
273:- **Social posting:** [NEEDS CONFIRMATION: who posts to the Instagram account? Rebecca only, or do teachers contribute? Is there a posting schedule or is posting ad hoc?]
277:[NEEDS CONFIRMATION: how many hours per week does Rebecca realistically spend on content (writing, posting, responding to comments, shooting photos)? This matters for setting realistic content calendar expectations.]
283:- [NEEDS CONFIRMATION: email platform; design tools such as Canva; any scheduling tools for social posting]
289:- [NEEDS CONFIRMATION: is there budget for a professional photographer to shoot facility and staff photos? Even a single half-day shoot would address multiple gaps at once.]
338:**Against doc-02 (Business Facts Reference):** No testimonials exist in Section 4, so no factual claims require cross-checking. The one photo-count fact used in this document ("hundreds" in Slack) traces to the client profile. All other specific numbers and names (licensed capacity 58, enrolled 52, 13 staff, Miss Tova, Miss Carla, Miss Dana, Rebecca) trace to doc-02 without conflict. Fact fields confirmed as unresolved in doc-02 (website URL, GBP, review platforms) are flagged as [NEEDS CONFIRMATION] in this document rather than restated or invented.
```

### doc-05-competitor-landscape.md (43 marker-lines)

```
11:**A note on this version:** This document was built from intake data and a limited competitor scan. No Ahrefs pull was completed; no competitor websites were reviewed end-to-end for this draft. Every section with [NEEDS CONFIRMATION] should be treated as scaffolding, not final content. The positioning and voice sections (5 and 8) are ready for use. The SEO section (7) and pricing tables (6) require a research pass before they can support the SEO Strategy (Document 06).
27:- **Geographic market:** Newburgh, NY and the surrounding Orange County area. Preschool decisions are geographically constrained; most families are looking within a 15-20 minute drive. [NEEDS CONFIRMATION: Does the school draw primarily from within Newburgh city limits, or from surrounding towns such as New Windsor, Marlboro, or Cornwall? This affects how competitor geography gets framed in SEO and content.]
29:- **Estimated market size locally:** [NEEDS CONFIRMATION: No market-size data was available in the intake materials. A useful number here would be the approximate count of children ages 2-5 in Newburgh and Orange County, or total licensed preschool seats within a 15-mile radius. This feeds the keyword-targeting work in Document 06.]
30:- **Market saturation:** [NEEDS CONFIRMATION: Recon was not completed for this engagement phase. My read from general market dynamics is that Newburgh has several preschool options and competition for enrolled slots is real, but I cannot confirm whether the market is growing, flat, or contracting without primary research.]
31:- **Market dynamics worth knowing:** New York State OCFS licensing creates a meaningful barrier to entry; programs cannot open without meeting ratio and facility requirements. The JCC affiliation is stable, but some JCC-affiliated preschool programs nationally have contracted or closed as JCC membership has shifted over the past decade. [NEEDS CONFIRMATION: Has Little Friends' enrollment been growing, stable, or contracting over the past 3-5 years? This is the most important market-dynamics signal available without a full competitive recon.]
35:- **Typical search behavior:** Word of mouth from other parents, Google search, local parenting Facebook groups or Nextdoor, and for JCC-connected families, word from within the JCC community. [NEEDS CONFIRMATION: Where does most of the school's inquiry traffic actually originate? Rebecca would have this from asking families at tours, and it is worth capturing explicitly.]
42:- **Typical price range for preschool in this area:** [NEEDS CONFIRMATION: Tuition ranges were not researched for this version. The Orange County preschool market likely spans from subsidized or sliding-scale programs around $500-$700 per month at the low end to franchise preschools at $1,200-$1,600 per month or higher. These are directional estimates only; actual competitor rates should be pulled before using this section in any pricing strategy conversation.]
43:- **Where Little Friends sits in the range:** [NEEDS CONFIRMATION: Requires knowing the actual tuition rate.]
45:- **Discounting norms in the category:** Sliding-scale and subsidy programs exist at the lower end of the market. Straight discounts are uncommon at the franchise and mid-tier level. [NEEDS CONFIRMATION: Does Little Friends participate in any state or county child care subsidy programs? See Document 02 Section 4 for the open question.]
61:- **Website:** goddardschool.com (national franchise site; individual location pages live at the same domain). [NEEDS CONFIRMATION: URL for the specific Newburgh location page.]
62:- **Location:** Newburgh, NY, toward the highway, per the client profile. [NEEDS CONFIRMATION: Street address. "Toward the highway" likely means the Route 9W or I-87 corridor, which places it in a different part of Newburgh from the JCC.]
63:- **Founded / how long in business:** The Goddard School is a national franchise founded in the late 1980s. [NEEDS CONFIRMATION: Exact founding year for the franchise; and when the Newburgh location specifically opened and how long it has been in this market.]
64:- **Ownership / leadership:** Each Goddard School location is independently owned by a local franchisee operating under the national brand. [NEEDS CONFIRMATION: Name of the Newburgh franchisee and any named director or lead staff who families interact with.]
65:- **Size of operation:** Goddard locations are typically larger than independent preschools, serving multiple classrooms and higher total enrollment. [NEEDS CONFIRMATION: Licensed capacity, number of classrooms, and total staff for the Newburgh location.]
70:- **Pricing position:** More expensive than Little Friends, per the client profile. [NEEDS CONFIRMATION: Actual tuition rates. Goddard franchise pricing is typically not published and requires a direct inquiry call to the local location.]
71:- **Capacity / scope:** Goddard locations typically serve more children and a broader age range than independent programs, often from infancy through pre-K. [NEEDS CONFIRMATION: Age range and licensed capacity for the Newburgh location specifically.]
76:- **Website quality:** [NEEDS CONFIRMATION: Requires a visit to the specific Newburgh location page. Goddard franchise sites follow a national template, which is professionally designed but not locally distinctive.]
77:- **Blog activity:** [NEEDS CONFIRMATION]
78:- **Social media:** [NEEDS CONFIRMATION: Handles and activity for the Newburgh location specifically. National Goddard handles exist; local pages are more relevant for this analysis.]
79:- **YouTube / video content:** [NEEDS CONFIRMATION]
80:- **Email / newsletter activity:** [NEEDS CONFIRMATION]
84:[NEEDS CONFIRMATION: No Ahrefs data was collected for this version. Pull Domain Rating, estimated organic traffic, organic keyword count, and top keywords for the Newburgh Goddard location page URL before finalizing the SEO Strategy (Document 06). Note that the Newburgh location page sits on the national goddardschool.com domain, which likely carries substantial domain authority from the franchise network. This structural advantage means Little Friends should not compete with Goddard on brand-adjacent search terms and should focus on geography-plus-philosophy keywords instead.]
88:- **Google rating and review count:** [NEEDS CONFIRMATION: Pull from the Google Maps listing for the Newburgh Goddard location. Read at least 15-20 reviews.]
89:- **Common positive themes in their reviews:** [NEEDS CONFIRMATION: Based on Goddard's national positioning, families typically praise consistent routines, clean facilities, and the comfort of a recognizable brand. Whether these patterns hold for the Newburgh location is worth confirming.]
90:- **Common critical themes in their reviews:** [NEEDS CONFIRMATION: This is the most useful section for positioning work. Common Goddard franchise criticisms nationally include staff turnover, administrative processes that feel standardized rather than personal, and a sense that the program is more corporate than warm. Whether these themes appear in the Newburgh location's reviews should drive how Little Friends positions against them in enrollment conversations.]
118:[NEEDS CONFIRMATION: No specific program names were provided in the client profile for this category. Before this section can be completed, identify the 1-3 most active church-affiliated preschools in Newburgh that families are actually comparing to Little Friends. Rebecca likely knows these by name.]
126:Typically less expensive than Little Friends and significantly less expensive than Goddard. This is the budget tier of the independent preschool market. [NEEDS CONFIRMATION: Actual tuition rates at the specific Newburgh programs competing with Little Friends.]
130:[NEEDS CONFIRMATION: Requires visits to specific program websites and social accounts. Most church preschool websites are low-investment; this is worth confirming because it affects the SEO analysis.]
134:[NEEDS CONFIRMATION]
138:[NEEDS CONFIRMATION]
163:**Montessori, specifically the New Paltz Montessori.** New Paltz is in Ulster County, across the Hudson River from Newburgh, roughly 35-40 minutes by car. A small number of Newburgh-area families consider making that drive for a Montessori program because the Montessori approach is genuinely different from play-based or curriculum-based models: it emphasizes child-led learning at individual pace, mixed-age classrooms, and specific tactile materials. Families who specifically want Montessori are not primarily price-shopping against Little Friends; they are philosophy-shopping. The comparison only comes up when a family is still deciding which philosophy fits their child. [NEEDS CONFIRMATION: Name, address, tuition range, age range, and enrollment size of the specific New Paltz Montessori program referenced in the client profile. There may be more than one Montessori-affiliated school in that area.]
173:**Private independent schools with early childhood programs.** Some families in the broader Hudson Valley look at programs connected to independent schools with nursery and K-12 programs, typically in Dutchess County. These are more expensive, farther away, and a different category of decision. [NEEDS CONFIRMATION: Are any private school early childhood programs actively drawing Newburgh-area families? If yes, it matters for positioning. If no, this category can be ignored.]
249:| Local church preschools | [NEEDS CONFIRMATION: Requires reading actual program websites. Likely: community-focused, faith-adjacent framing even when secular, heavy use of "family" and "community."] | Don't say "school family" or "our community" in ways that sound identical to a congregation-based program. |
250:| New Paltz Montessori | [NEEDS CONFIRMATION] Method-specific, philosophy-proud, materials-focused. Montessori programs tend to write about what the children do with the materials, not what the teachers do to the children. | The Montessori method is specific. Don't borrow its language (prepared environment, works, practical life). Little Friends is play-based; name that specifically instead. |
260:[NEEDS CONFIRMATION: Requires a review of each competitor's website and Instagram to document the dominant visual style. My working assumption is that Goddard leans on bright primary colors and produced franchise photography; church preschool sites likely use phone-quality images and a template design. The open visual space for Little Friends is probably documentary-style photography of children doing actual things, without the staged quality of franchise materials. This should be confirmed visually before shaping the Social Media Playbook (Document 08).]
271:| Goddard School (Newburgh) | [NEEDS CONFIRMATION] | [NEEDS CONF: likely inquiry-only] |
272:| Local church preschools | [NEEDS CONFIRMATION] | [NEEDS CONF: often posted on program site] |
273:| New Paltz Montessori | [NEEDS CONFIRMATION] | [NEEDS CONF] |
277:[NEEDS CONFIRMATION: Requires actual tuition data from both Little Friends and competitors.]
285:[NEEDS CONFIRMATION: Deferred until actual tuition numbers are in hand. The most important question to answer first: does the current rate reflect what the program actually delivers, or has it been held artificially low out of community-pricing instinct? Each scenario leads to a different recommendation.]
297:[NEEDS CONFIRMATION: No Ahrefs data was collected for this version. Before finalizing the SEO Strategy (Document 06), pull Domain Rating, estimated organic traffic, organic keyword count, and backlink count for Little Friends Learning Loft and the Newburgh Goddard location. The New Paltz Montessori is in a different geographic market and is lower priority for this comparison. Church preschool programs should be pulled once named programs are confirmed in Section 2.]
327:[NEEDS CONFIRMATION: Requires visiting each competitor's website to assess blog or content activity. Most preschool websites in this market have minimal content investment. If that holds for the Newburgh competitors, even a modest cadence (1-2 posts per month) would create a meaningful long-term SEO and authority advantage for Little Friends.]
385:*This document was produced from intake data and a limited competitor scan as noted in the header. Sections marked [NEEDS CONFIRMATION] should be completed by Joshua before this document is loaded into the client's Claude Project or before the SEO Strategy (Document 06) is produced. The positioning and voice sections (5 and 8) are ready for use.*
```

### doc-06-seo-keyword-strategy.md (69 marker-lines)

```
21:**A note on this version.** The SEO baseline in this document could not be completed before drafting. Google Search Console access has not been provisioned, no Ahrefs pull has been performed, and the client website URL and analytics tools are unconfirmed. This means all quantitative measurements in Section 1, Section 2 (volumes and difficulty scores), and Section 8 are scaffolded with [NEEDS CONFIRMATION] tags rather than real data. The strategic sections, including keyword candidates, content clusters, local SEO priorities, AEO targets, and the 90-day calendar, are substantive and ready to use. They are drawn from the business's confirmed differentiators and the competitive gap analysis in Document 05. The correct order of operations: provision GSC and Ahrefs access, pull the baseline numbers, and fill in every [NEEDS CONFIRMATION] in Sections 1 and 8 before loading this document into the client's Claude Project or using it to drive a content budget. This document is production-ready as a strategic framework and a content calendar. It is not production-ready as a performance-measurement baseline.
29:- **Domain Rating (Ahrefs):** [NEEDS CONFIRMATION: Pull from Ahrefs once the site URL is confirmed. Given the school's profile, a DR in the low single digits or unranked is the most likely starting point.]
30:- **Estimated organic traffic:** [NEEDS CONFIRMATION: Pull from Ahrefs and cross-reference with GSC once connected. Rebecca's description of the school as "basically invisible" on Google suggests near-zero non-branded organic traffic.]
31:- **Number of organic keywords:** [NEEDS CONFIRMATION]
32:- **Total backlinks:** [NEEDS CONFIRMATION]
33:- **Referring domains:** [NEEDS CONFIRMATION]
34:- **Indexed pages (Google Search Console):** [NEEDS CONFIRMATION: Requires GSC access. For a small school site, 10-30 indexed pages would be typical. Provisioning GSC is the first technical action before any content work begins.]
38:[NEEDS CONFIRMATION: Requires GSC access (top pages by clicks, last 90 days) and Ahrefs site explorer. Once pulled, populate the table below with the pages currently driving the most organic traffic.]
46:[NEEDS CONFIRMATION: Pull from GSC "Search results" filtered to positions 1-10, last 90 days. For a school with minimal content history, I expect this list to be short and anchored almost entirely on brand-name searches and possibly the JCC-name-plus-preschool term.]
50:[NEEDS CONFIRMATION: Pull from GSC filtered to positions 11-30. These are the highest-ROI targets because a modest optimization push can move them onto page one.]
58:- **Branded traffic:** [NEEDS CONFIRMATION: Pull from GSC filtered to queries containing "little friends learning loft" and name variations.]
59:- **Non-branded traffic:** [NEEDS CONFIRMATION: Everything except brand-name queries.]
60:- **Ratio:** [NEEDS CONFIRMATION. Given the school's heavy reliance on word-of-mouth and JCC referrals, I expect the branded share to be high relative to discovery-driven traffic. A ratio that is 70% or more branded tells me the site is doing almost no organic discovery work, which is consistent with Rebecca's own description of the situation.]
64:[NEEDS CONFIRMATION: Once GSC, GA4, and Ahrefs are connected, document which tool sourced each metric and the date range pulled. Until then, this section has no confirmed data and no measurement baseline exists.]
197:- **Combined monthly search volume across all clusters:** [NEEDS CONFIRMATION: Sum after Ahrefs validation]
198:- **Estimated traffic if top-3 positions achieved for half of cluster keywords:** [NEEDS CONFIRMATION: Set after baseline and volume pulls are complete]
209:[NEEDS CONFIRMATION on all fields below. GBP audit is a required first action before any other local SEO work begins.]
211:- **Profile claimed:** [NEEDS CONFIRMATION: Verify by searching "Little Friends Learning Loft Newburgh" in Google Maps. If it is claimed, confirm the account owner email is one Rebecca controls. If it has been auto-generated by Google and never actively claimed, claiming it is the first priority above everything else.]
212:- **Primary category:** [NEEDS CONFIRMATION: Should be "Preschool" or "Early childhood education center." Confirm what is currently set and whether it matches how families actually search.]
213:- **Secondary categories:** [NEEDS CONFIRMATION: Potential additions may include "Child care agency" if it fits the OCFS license category. Avoid categories that signal the wrong service type or age range.]
214:- **Hours accuracy:** [NEEDS CONFIRMATION: Confirm drop-off and pickup windows are accurately listed. Incorrect hours are among the most damaging trust signals a local business listing can carry.]
215:- **Photos:** [NEEDS CONFIRMATION: Count and date of most recent upload. Classroom photos, outdoor space if any, and the general building entrance are the most useful categories for a preschool GBP.]
216:- **Posts (GBP Posts feature):** [NEEDS CONFIRMATION: Active or inactive. For a school, enrollment-season and open-house posts are the most natural cadence.]
217:- **Q&A section:** [NEEDS CONFIRMATION: Check for unanswered questions and for whether any incorrect crowd-sourced answers have accumulated. Unseeded Q&A sections often get filled with wrong information from well-meaning strangers.]
218:- **Service listings:** [NEEDS CONFIRMATION: Should include: Twos class, Threes class, Pre-K program, Aftercare. These map to the programs confirmed in Document 02 §3.]
225:4. Upload a fresh batch of recent classroom and space photos. [NEEDS CONFIRMATION: How old are the most recent GBP photos? If the last upload was more than six months ago, a new batch is a fast, high-impact action.]
233:- Address: [NEEDS CONFIRMATION: Full street address of the Newburgh JCC. Document 02 §1 flags this as pending. This is the most important operational gap to close before any citation work begins. Everything in local SEO depends on a verified, exact address.]
234:- Phone: [NEEDS CONFIRMATION: Document 02 §1 flags this as pending.]
238:[NEEDS CONFIRMATION: No citation audit has been performed. Once the verified NAP is confirmed, run a scan using BrightLocal or Whitespark to document (1) which directories have a correct listing, (2) which have inconsistent or outdated entries, and (3) which high-value directories are missing a listing entirely.]
240:- Consistent citations: [NEEDS CONFIRMATION]
241:- Inconsistent or outdated citations: [NEEDS CONFIRMATION]
247:  - The Newburgh JCC website itself: [NEEDS CONFIRMATION: Does the JCC site link clearly to the school's own page? If not, this is a high-authority local backlink sitting unused.]
252:- **Review request process:** [NEEDS CONFIRMATION: What is the current practice? A well-timed, personal request from Rebecca to enrolled families at approximately 4-6 weeks after a child's start date tends to produce the most thoughtful responses. The timing matters: too early and the family does not have enough to say; too late and the moment has passed.] The review request should feel like a personal note, not a template.
292:- Include specific numbers and facts rather than adjectives. [NEEDS CONFIRMATION: Once the class-size numbers are confirmed per Document 02 §5, those numbers belong in every post that touches on class size. "Eight children, two teachers" is extractable. "A warm, small environment" is not.]
298:[NEEDS CONFIRMATION: A full schema audit requires access to the website source. The prioritized list below is based on what is most impactful for this type of school and most commonly absent from small program sites.]
310:[NEEDS CONFIRMATION: Run the website URL through Google's Rich Results Test and the Schema.org validator once the URL is confirmed. Most small school websites have minimal schema beyond whatever a theme provides by default. Confirm before assuming anything is in place.]
319:- **Current cadence:** [NEEDS CONFIRMATION: Requires a website content inventory. Based on the client's own description of being "basically invisible" on Google, I expect the published content is minimal or close to zero.]
320:- **Gap to close:** [NEEDS CONFIRMATION once current cadence is known.]
386:[NEEDS CONFIRMATION: All of the following requires access to the website, Google Search Console, and the Rich Results Test tool. None of this can be assessed without a verified URL and active GSC connection.]
389:- Largest Contentful Paint (LCP): [NEEDS CONFIRMATION]
390:- Cumulative Layout Shift (CLS): [NEEDS CONFIRMATION]
391:- Interaction to Next Paint (INP): [NEEDS CONFIRMATION]
394:- Pages indexed: [NEEDS CONFIRMATION]
395:- Pages excluded from indexing: [NEEDS CONFIRMATION]
396:- Indexing errors to resolve: [NEEDS CONFIRMATION]
398:**Mobile usability:** [NEEDS CONFIRMATION]
400:**HTTPS and security:** [NEEDS CONFIRMATION: Verify the site is served over HTTPS. An HTTP site in 2026 is a security and ranking issue.]
404:[NEEDS CONFIRMATION: The list below reflects typical gaps for a small school website with minimal ongoing maintenance. Each item should be validated against an actual technical audit before scheduling work.]
417:[NEEDS CONFIRMATION: Requires reviewing the actual site navigation and URL structure. For a school of this size, the recommended structure is: homepage, per-program pages (Twos, Threes, Pre-K, Aftercare), an About page, a Blog, a Contact or Tour page, and an Enrollment page. Internal linking between blog posts and program pages is where most small school sites have the largest gap and the easiest short-term fix.]
421:- Sitemap status: [NEEDS CONFIRMATION: Verify at [domain]/sitemap.xml. If no sitemap exists, generate and submit one to GSC. This is typically 30 minutes with most CMS platforms.]
422:- robots.txt status: [NEEDS CONFIRMATION: Verify at [domain]/robots.txt. Check that key pages (homepage, program pages, blog) are not accidentally blocked from crawling.]
426:- **GA4:** [NEEDS CONFIRMATION: Document 02 §1 notes analytics tools as "to be provisioned." GA4 connection is a prerequisite for measuring the targets in Section 8.]
427:- **Google Search Console:** [NEEDS CONFIRMATION: Same as above. This is the single most important tool to connect before any SEO work begins.]
428:- **Conversion tracking:** [NEEDS CONFIRMATION: The primary conversion events for this school are: tour inquiry form submitted, phone call initiated, and tour scheduled (if an online scheduling tool exists). All three should be tracked as GA4 conversion events before any content campaign begins.]
437:[NEEDS CONFIRMATION: Every row below requires GSC, Ahrefs, and GA4 access. Pull all of these before any other measurement work begins. Without a confirmed baseline, the 90-day and 12-month targets that follow are frameworks, not commitments.]
441:| Domain Rating | [NEEDS CONFIRMATION] |
442:| Organic keywords ranking | [NEEDS CONFIRMATION] |
443:| Estimated organic traffic | [NEEDS CONFIRMATION] |
444:| Keywords in top 10 | [NEEDS CONFIRMATION] |
445:| Keywords in top 3 | [NEEDS CONFIRMATION] |
446:| Backlinks | [NEEDS CONFIRMATION] |
447:| Referring domains | [NEEDS CONFIRMATION] |
448:| Branded search volume | [NEEDS CONFIRMATION] |
449:| GBP calls (last 30 days) | [NEEDS CONFIRMATION] |
450:| GBP website clicks (last 30 days) | [NEEDS CONFIRMATION] |
463:| Organic keywords ranking | [NEEDS CONFIRMATION: set as baseline + 20-30% once baseline is known] |
464:| Organic traffic | [NEEDS CONFIRMATION: set as baseline + 25-40% once baseline is known] |
470:| Domain Rating | [NEEDS CONFIRMATION: Set as baseline + 4-6 points. Realistic for a consistent 12-month content and local citation effort.] |
471:| Estimated organic traffic | [NEEDS CONFIRMATION: For a local preschool starting from near-zero, a realistic 12-month target with consistent content output is 400-800 organic visits per month. This should be revised up or down once the baseline is confirmed.] |
```

### doc-07-faq-bank.md (39 marker-lines)

```
94:Little Friends has four programs: the Twos class for two-year-olds, the Threes class for three-year-olds, Pre-K for four-year-olds, and aftercare for families who need extended hours beyond the school day. Each classroom has its own lead teacher and stays small enough that the teacher knows your child by name from the first week. [NEEDS CONFIRMATION: days and hours for each program]
122:The school serves children from age two through four, the year before kindergarten. The Twos class is for two-year-olds, the Threes class for three-year-olds, and Pre-K for four-year-olds. Aftercare is available to enrolled families who need extended care beyond the school day. [NEEDS CONFIRMATION: exact minimum age cutoff, for example, must a child turn two by September 1st?]
152:If you're looking for infant or toddler care in the area, I'm happy to point you toward options. [NEEDS CONFIRMATION: specific local infant-care programs Rebecca refers families to]
186:[NEEDS CONFIRMATION: actual days, hours, and any curriculum framework for each program]
214:It means the morning is structured around what children do when left to explore with good materials and an adult close by. The classrooms have a block corner, an art table, a dramatic play area. [NEEDS CONFIRMATION: confirm actual space names and whether there is dedicated outdoor time and space] The teachers watch and step in, but they're not running a worksheet-style class.
218:[NEEDS CONFIRMATION: specific curriculum framework, if any, for example High/Scope or Reggio-influenced, or no named framework]
280:Yes, there is a $75 registration fee per child. This covers the administrative processing of the enrollment application. [NEEDS CONFIRMATION: is the fee due at the time of submitting the application, or at the point of enrollment commitment? Is it refundable if the family decides not to enroll after paying it?]
307:[NEEDS CONFIRMATION: when is the deposit due, at signing the enrollment agreement or at a different point? What payment method is accepted?]
332:[NEEDS CONFIRMATION: sibling discounts, JCC member discounts, early enrollment discounts, and financial aid options have not been confirmed for public sharing as of June 2026. Once confirmed, this answer will include the specific discount types, amounts, and who qualifies for each.]
360:[NEEDS CONFIRMATION: does the school accept ACS vouchers, the Child Care Assistance Program, or any other state or county subsidy programs? This has not been confirmed in the Business Facts Reference as of June 2026.]
391:[NEEDS CONFIRMATION: current waitlist status by classroom; which classrooms, if any, are at or near capacity as of the writing date]
423:[NEEDS CONFIRMATION: is the enrollment application in Brightwheel, on paper, or a separate online form?]
486:[NEEDS CONFIRMATION: is there a priority enrollment window for siblings or returning families? What is the application deadline for a September start?]
511:[NEEDS CONFIRMATION: does the school currently maintain a waitlist? How does it operate? Can families request a specific classroom, and do returning families or siblings receive enrollment priority?]
540:[NEEDS CONFIRMATION: what other required documents are collected at enrollment, for example: emergency contact form, medical treatment authorization, photo and media release, field trip permission, allergy action plan?]
568:[NEEDS CONFIRMATION: drop-off window open and close times; pickup window open and close times; aftercare end time. The school runs on a school-year calendar, so hours follow the school-year schedule, but specific times have not been confirmed in the Business Facts Reference as of June 2026.]
595:[NEEDS CONFIRMATION: whether programs are offered three days per week, five days per week, or both, and which specific days each age group meets. The answer may differ by program.]
622:Yes, the program runs on a school-year calendar. [NEEDS CONFIRMATION: September through June? Specific vacation weeks, observed holidays, early dismissal days, and whether there is any summer programming]
648:Children arrive at drop-off and get settled. Most of the morning is free play time in the block corner, the art table, or the dramatic play area, with a morning routine that includes circle time and snack. [NEEDS CONFIRMATION: confirm actual space names; whether there is a dedicated outdoor area and when outdoor time happens; full daily schedule structure]
678:[NEEDS CONFIRMATION: what specific symptoms require a child to stay home; what the return-to-school criteria are, for example 24 hours fever-free; OCFS-required illness exclusion rules]
706:[NEEDS CONFIRMATION: whether the school provides snacks or families bring them; whether the building has a nut-free or allergen-aware policy; any other food restrictions families should know about]
735:Aftercare is extended care available after the regular school day ends. It is available for enrolled children in the program. [NEEDS CONFIRMATION: whether all three age groups (Twos, Threes, Pre-K) are eligible or only certain ones; whether aftercare takes place in the child's classroom or a separate space]
759:[NEEDS CONFIRMATION: exact aftercare start and end times; whether it runs every weekday; any exceptions tied to the school calendar]
784:Aftercare pricing is part of the tuition conversation, which I go over with families during the tour. [NEEDS CONFIRMATION: is aftercare included in base tuition, or is it a separate add-on? If separate, what is the monthly or per-day rate?]
846:[NEEDS CONFIRMATION: is there any integration of Jewish holiday observance or JCC programming into the school calendar or classroom? If so, what specifically?]
872:[NEEDS CONFIRMATION: does JCC membership affect tuition rates, enrollment priority, or access to the program? Who qualifies for any member pricing, and what does it look like?]
901:Rebecca [NEEDS CONFIRMATION: last name] is the director. She runs the school day to day: enrollment, family communication, staffing, and anything that rises above the classroom. If you're a new family reaching out, she's who you'll hear from. Every tour is led by her in person.
928:The school has 13 staff total, including classroom assistants and aftercare staff. [NEEDS CONFIRMATION: names and roles of any remaining staff who interact with families directly]
953:For new family inquiries and enrollment questions, reach out to Rebecca directly. [NEEDS CONFIRMATION: Rebecca's direct email or phone; main school email or phone for general inquiries]
981:For enrolled families, day-to-day communication goes through the lead teacher for your child's classroom. The school uses Brightwheel, an app for family communication and notes. [NEEDS CONFIRMATION: confirm Brightwheel is the family-facing communication tool and add to Business Facts Reference; also confirm whether the school sends daily updates via Brightwheel, how quickly messages are typically read and responded to, and how teachers and families use it in practice]
1011:[NEEDS CONFIRMATION: which specific features the school uses Brightwheel for, for example daily updates, messaging, billing, or check-in and check-out; how families get set up and onboarded to it]
1065:[NEEDS CONFIRMATION: what is the school's protocol when a child becomes ill during the school day? Who contacts the parent? What symptoms trigger a call home? Is there a designated health contact on site?]
1092:[NEEDS CONFIRMATION: what is the school's allergy policy? Is the building nut-free? Who is trained to administer an EpiPen if needed? How are life-threatening allergies communicated to all staff?]
1119:Yes. Little Friends Learning Loft is licensed by the New York State Office of Children and Family Services (OCFS). The license covers children ages two and up, and the licensed capacity is 58 children total. [NEEDS CONFIRMATION: OCFS license number and renewal date]
1151:[NEEDS CONFIRMATION: does the school have a specific transition support process, a gradual entry option, or a recommended first-day approach?]
1197:- Deflection language: "Little Friends is licensed by New York State OCFS for children ages two and up. I can't enroll infants or children under two, and that's a licensing requirement rather than a policy I can make exceptions to. If you're looking for infant care in the area, I'm happy to help point you toward options. [NEEDS CONFIRMATION: local infant-care referral resources] If you also have a child who's two or older and are interested in the program for them, I'd be glad to help with that."
1247:3. AI offers: Referral if available [NEEDS CONFIRMATION]; and if the family also has a two-year-old, notes that the school could be a fit for that child
1269:- The parent's budget is clearly below the program's floor [NEEDS CONFIRMATION: what is the minimum realistic program cost after confirmed discounts?]
1296:| 1.0 | June 2026 | Initial publication | Joshua Brown + [NEEDS CONFIRMATION: director's last name] |
```
