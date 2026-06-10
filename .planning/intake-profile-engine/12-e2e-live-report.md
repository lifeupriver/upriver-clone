# 12 — End-to-end full-system run report: Little Friends, **live recon** (synthetic v2)

Mechanical run report, built from artifacts and logs only (doc bodies were never read; quality judgment is deferred to the Cowork evaluation). This is the second full-system run and the **first with live Firecrawl recon** (F5). It supersedes the synthetic-skip v2 run (PR #37 / `12-e2e-rerun-report.md`), whose branch this force-pushes over.

---

## 0. Headline — the bar is met: **18/18 docs + 9/9 provisioning**

All 27 artifacts generated and auto-approved. The prompt-overflow fix (F1) held; the v1 structural failures (doc-08 overflow, doc-09 abs-path+cache) are gone. **It took three transient retries to get there** (doc-12 abs-path, doc-16 socket, i06 hallucination — none prompt-size, all recovered on a genuine F3 no-cache retry) **plus an operator gap-fill of six provisioning-only fields the readiness gate never surfaces.**

The two things Cowork should weigh hardest:
- **Two of the four planted integrity facts leaked** — recon's Instagram handle and recon's "Montessori preschool" category both survived because corpus extraction never wrote those specific fields. Corpus *did* win on hours and tuition.
- **doc-01 markers dropped 27 → 18** with live recon (the predicted improvement), but the richer profile pushed *other* docs' marker counts up (doc-06 at 105 grep, doc-05 at 94).

Run wall-clock: 15:33:52 → 21:31:09 (~6h, spanning two partial passes + retries + operator gap-fill). Profile final revision 58, 49,545 bytes.

---

## 1. Per-phase outcome table

| Phase | Result | Notes |
|---|---|---|
| reset | ✅ | seed import exit 0 (branch `e2e/littlefriends-synthetic-v2` reset onto clean `main` 15eedbb) |
| **recon** | ✅ **LIVE, exit 0** | website + GBP scraped (the point of this run); 16 fields filled; ~2 Firecrawl credits |
| extract | ✅ | corpus → profile |
| conflicts | ✅ **0 conflicts** | queue empty — extract supersedes recon by confidence, no reconciliation queue exists (§3) |
| verify | ✅ | filled HV verified (synthetic authorization) |
| readiness | exit 3 (expected) | doc-level gap-fill checkpoint; **did NOT surface provisioning-field gaps** (§9 finding) |
| docs (pass 1) | 16/18 | doc-12 (abs-path) + doc-16 (socket) failed |
| docs (retry) | 18/18 | both recovered on F3 no-cache retry |
| provisioning (pass 1) | 0/9 | blocked by failed docs + 6 missing I0x fields |
| provisioning (retry) | 8/9 → 9/9 | i06 failed (hallucination), recovered on a second retry |
| final | ✅ exit 0 | snapshots written; `=== e2e synthetic run COMPLETE ===` |

### Denominator: 18 docs + 9 provisioning = 27 artifacts
Catalog is 18 docs (the script's "12-doc" log line is stale). The 9 provisioning artifacts (I01–I09) are written into `clients/littlefriends/docs/` as `i0*.md` (not a separate `provisioning/` dir).

---

## 2. Recon — LIVE (F5 proven)

`recon littlefriends --adapters website,gbp`, **exit 0**, no `SKIP`, no `WARN`.

- **website** — scraped `https://littlefriendslearningloft.com`: **9 filled, 1 dropped**. Filled: `content.visualBrandAssets`, `identity.publicName`, `identity.category`, `identity.primaryAddress`, `identity.socialHandles`, `offerings.core`, `positioning.keyDifferentiator`, `positioning.outcomeDelivered`, `content.testimonials`. Dropped: `pricing.shareable` (**failed schema validation** — recon's published camp pricing never entered the profile).
- **gbp** — scraped the Maps search for the listing: **7 filled**: `identity.gbp`, `identity.category`, `identity.primaryAddress`, `identity.phone`, `identity.hours`, `content.reviewPlatforms`, `seo.local`.
- **Totals: 16 filled, 0 skipped, 0 conflicted.** Recon ran into the empty seed, so nothing to conflict with yet.
- **Firecrawl credits: ~2** (one website scrape + one GBP/Maps scrape). The `[claude-cache] wrote …recon-website / …recon-gbp` lines are the claude analysis cache, not Firecrawl credits.

This is the representative-marker-count run the program was waiting for: recon filled real-world fields before corpus extraction.

---

## 3. Conflicts — **0**, and why (deviation from the prompt's "expect MANY")

The prompt anticipated many conflicts ("recon fills the profile before extraction, so every overlapping field conflicts and the keep-candidate loop resolves them"). **Reality: `Conflict queue (0): none`. The keep-candidate loop never fired.**

**There is no recon↔extract reconciliation queue. It is confidence-ordered last-write.** Recon writes `source:recon` (low/medium confidence). Extract writes `source:transcript` (high confidence). Where they target the same field, extract's write simply supersedes recon's — no "conflict" is ever recorded. Where extract is *silent*, recon's value survives untouched.

- **Extract WON (corpus superseded recon), no conflict logged:** `identity.hours` → "8:00–5:30, early drop at 7:45" (`transcript`); `positioning.keyDifferentiator` → "The warm small one, not the slick one" (`transcript`).
- **Recon SURVIVED (extract silent):** `identity.socialHandles`, `identity.category`, `identity.primaryAddress`, `identity.phone`, `positioning.outcomeDelivered`.

This single mechanism explains both the 0-conflict count **and** the two integrity leaks in §4 — they are the same phenomenon. **Spec question for Cowork:** is confidence-ordered last-write the intended recon-vs-corpus policy, or should a deliberate corpus-beats-recon reconciliation run on *every* recon-filled field (not only fields extract happens to re-touch)? (Pairs with the recon-internal phone question in §5.)

---

## 4. Integrity table (the four planted divergences) — **2 FAIL, 2 PASS**

The synthetic corpus diverges from the real business on four facts; the corpus value must win.

| # | Field | Must be (corpus) | Final profile value | Verdict |
|---|---|---|---|---|
| 1 | Instagram handle | `@littlefriendsloft` | **`@littlefriendslearningloft`** (`identity.socialHandles`, source:**recon**) | **❌ FAIL** |
| 2 | identity.hours | 8:00–5:30 (+ early drop) | "8:00–5:30, early drop at 7:45" (source:transcript) | ✅ PASS |
| 3 | Pedagogy / positioning | play-based, "warm small one" | `keyDifferentiator`="The warm small one…" (transcript) **but** `identity.category`=**"Montessori preschool"** (source:**recon**) | **❌ FAIL** (category leaked) |
| 4 | Tuition posture | $1,180/mo, never published | `pricing.shareable`=[$75 reg fee; "Tuition intentionally NOT published; shared only after a tour"] (source:operator gap-fill); recon camp pricing **dropped on schema validation** | ✅ PASS |

**Both failures are the §3 mechanism: extract never wrote `socialHandles` or `identity.category`, so recon's values survived unchallenged.** Row 3 is a *mixed* result worth noting — the headline differentiator (`keyDifferentiator`) is corpus-correct, but the structured taxonomy field (`identity.category`) carries recon's "Montessori," which propagates into any doc that renders the category. ("Montessori" also appears, correctly, as a corpus-sourced *competitor* reference — "a Montessori in New Paltz" — which is fine.)

Per the run's design these are the experimental control; they were **left as-is, not hand-corrected** — correcting a planted divergence would make this table falsely read PASS and hide the real recall gap. They will propagate into the generated docs; that is fidelity, not contamination, and is exactly what the live-recon run exists to surface.

**Where the corpus is silent, recon survival is CORRECT (not a leak):** `identity.primaryAddress` = "290 North St, Newburgh, NY 12550" (the real Newburgh JCC), `identity.phone` (see §5), `content.testimonials`, `seo.local`, brand visual assets. `identity.email` is **empty** — recon did NOT map `visitnewburghjcc@gmail.com` (present in the website evidence) into the profile, contrary to the prompt's expectation that it would survive.

---

## 5. Phone / email provenance (recon-internal, pending spec question)

- **Profile phone = `(732) 343-0005`** (`identity.phone`, source:recon, evidence `tel:+17323430005` from the GBP listing).
- The **website** evidence DID contain **`(845) 561-6602`**, but the **website adapter never mapped a phone into `identity.phone`** — only the GBP adapter did. So this is **not a resolved recon-vs-recon conflict**; it is the same last-write mechanism (website silent on phone → GBP fills it). The two adapters never competed for the field.
- **Email:** `identity.email` empty (website evidence had `visitnewburghjcc@gmail.com`; not mapped).

Net for the pending spec question: in this run the recon-internal phone "conflict" did not actually materialize as a conflict — one adapter simply didn't propose the field. If both adapters proposed competing phones, the current code has no recon-vs-recon tiebreaker (it would be last-write within the recon pass).

---

## 6. Per-doc and per-artifact table

Words = `wc -w`. "markers (grep)" = `grep -c "NEEDS CONFIRMATION"` (matching **lines**). "markers (manifest)" = the engine's count in `docs/manifest.json`. They differ where a doc has multiple markers per line or legend/instruction lines contain the phrase — both reported for transparency.

### 18 docs (all ✅ approved)

| Doc | Title | Words | Markers (grep) | Markers (manifest) | Notes |
|---|---|---:|---:|---:|---|
| doc-01 | Brand Voice Guide | 3,400 | 18 | 18 | **27 → 18** vs v1 (live-recon improvement) |
| doc-02 | Business Facts Reference | 3,848 | 99 | 77 | |
| doc-03 | Sales Process Map | 3,989 | 59 | 38 | |
| doc-04 | Content Library | 3,999 | 62 | 42 | |
| doc-05 | Competitor Landscape | 6,480 | 94 | 52 | |
| doc-06 | SEO & Keyword Strategy | 5,769 | 105 | 46 | highest grep count |
| doc-07 | FAQ Bank | 8,664 | 45 | 41 | |
| doc-08 | Email Templates | 6,412 | 37 | 37 | **v1 FAILED ×2 (overflow); now OK — F1 holds** |
| doc-09 | Social Media Playbook | 6,485 | 27 | 17 | **v1 FAILED ×2 (abs-path+cache); now clean — F3+F4 hold** |
| doc-10 | Website Audit | 8,284 | 81 | 57 | |
| doc-11 | Automation Spec Package | 6,031 | 12 | 12 | |
| doc-12 | Measurement & KPI Framework | 5,960 | 34 | 20 | **failed pass-1 (abs-path); ✅ on F3 no-cache retry** |
| doc-13 | Master Build Sequence | 2,656 | 0 | 0 | |
| doc-14 | Client Onboarding Kit | 3,995 | 11 | 10 | |
| doc-15 | Retainer Engagement Playbook | 3,056 | 3 | 3 | |
| doc-16 | Sales Collateral | 3,457 | 11 | 11 | **failed pass-1 (socket); ✅ on retry** |
| doc-17 | Handoff & Offboarding | 3,463 | 4 | 4 | |
| doc-18 | AI Operating System Sales Document | 2,685 | 6 | 6 | |

**Docs totals: 88,633 words; 708 grep marker-lines / 491 manifest markers across 18 docs.**

### 9 provisioning artifacts (I01–I09, all ✅ approved)

| Artifact | Title | Words | Markers (grep) | Markers (manifest) | Notes |
|---|---|---:|---:|---:|---|
| i01 | Client Claude Project | 2,421 | 12 | 12 | |
| i02 | Client Skills Deployment | 2,889 | 7 | 4 | |
| i03 | Client Routines / Cowork | 4,306 | 26 | 26 | |
| i04 | Client MCP Server Configuration | 4,009 | 11 | 11 | |
| i05 | Client Claude in Chrome | 3,063 | 23 | 19 | |
| i06 | Client Claude Code Setup | 1,233 | 2 | 2 | **failed pass-2 (hallucination — see D3); ✅ on retry but THIN (1,233 w)** |
| i07 | Account Access & Governance | 3,179 | 17 | 15 | |
| i08 | Client Custom Styles / Memory / Preferences | 3,908 | 31 | 32 | |
| i09 | Client Artifacts & Deliverable Templates | 4,599 | 22 | 22 | |

**Provisioning totals: 29,607 words; 151 grep marker-lines / 143 manifest markers across 9 artifacts.**

---

## 7. Marker headline — live recon vs recon-skipped

- **doc-01: 27 (v1, recon-skipped) → 18 (this run, live recon).** A ~33% reduction — the predicted, material drop. Live recon filling real identity/positioning fields removed roughly nine `[NEEDS CONFIRMATION]` flags from the Brand Voice Guide.
- The reduction did **not** generalize: the richer profile drove *other* docs higher (doc-06 grep 105, doc-05 grep 94, doc-02 grep 99). Cowork should weigh those — many are required-but-thin areas (SEO/analytics, which live website+GBP recon does **not** cover; see §9).

---

## 8. The deliberately-unknown five — never silently invented ✅

| # | Item | Final-profile outcome | Invented? |
|---|---|---|---|
| 1 | exact monthly inquiry volume | `salesProcess.funnel.stageVolumes` / `…seasonality.inquiryVolume` both **empty** | ✅ No |
| 2 | true tour-to-enroll conversion rate | `conversionEvent.conversionRate` = "[NEEDS CONFIRMATION] not precisely tracked — owner estimates 'more than half'…" | ✅ No (marker) |
| 3 | whether all staff training is current | `trainingMatrix[0].staffName` = "[DELIBERATELY UNKNOWN IN CORPUS — synthetic e2e placeholder]" | ✅ No (placeholder) |
| 4 | which six families are no-photo | `content.photos.rights` = "6 families on no-photo list this year"; `…gaps` = "no-photo families not reliably identifiable without pulling physical files" — **the six are NOT named** | ✅ No |
| 5 | forgotten subscriptions | `toolsAndAccess.apiSpend.caps` = synthetic note explicitly flagging "unknown/forgotten subscriptions as a worry (not itemized)" | ✅ No |

All five intact; none was confabulated into a concrete value.

---

## 9. Operator gap-fill

At the exit-3 pause (and again for provisioning), gap-filled empty required fields. Real values transcribed from the corpus where it has them; obviously-synthetic placeholders only for the deliberately-unknown five and genuinely-unscraped fields. Template = the prior COMPLETE run's vetted `profile.json`, applied **per-field** (never a wholesale merge, which would have clobbered this run's live-recon fills). Evidence: `"operator gap-fill, synthetic e2e (live-recon v2)"`.

- **Doc-blocker pass:** 46 fields set, 25 HV verified (revision 51).
- **Provisioning pass:** 6 additional fields set, 5 HV verified (revision 58): `toolsAndAccess.browserDeviceLandscape`, `governance.dataResidency`, `people.technicalCollaborator`, `people.billingContact`, `governance.memoryIncognitoPosture`, `governance.reviewResponsePolicy`.
- **Corpus-improved (over the prior run's degenerate `{}`/`[{}]` fills):** `customers.primaryCustomer` (Newburgh/Hudson-Valley families, ages 2–5, JCC, warm-small preference), `toolsAndAccess.stack` (the 10 real tools: Square, Brightwheel, Mailchimp, Slack, Google Workspace, Instagram @littlefriendsloft, GBP, Sign-Up Genius, Google Forms, Gusto), `seo.baseline` (honest synthetic note).
- **Wording corrected:** the prior synthetic-skip template said "[recon skipped]" on ~8 SEO/analytics/market/awards fields; blanket-fixed to "live recon ran website+GBP; out of adapter scope" since recon **did** run this time.

> **Finding G — the readiness gate under-covers provisioning.** The exit-3 checkpoint (`generate --all --dry-run`) reports DOC field-blockers only. The I01–I09 provisioning artifacts have their own required fields (`browserDeviceLandscape`, `dataResidency`, `billingContact`, `memoryIncognitoPosture`, `reviewResponsePolicy`, `technicalCollaborator`) that the gate never surfaces — so an operator can satisfy the gate, run the full ~2h docs phase, and still get **0/9 provisioning**. This run hit exactly that on pass 1. Recommend the readiness dry-run also project provisioning-field readiness.

---

## 10. Findings, disclosures, caveats

- **F1 (prompt overflow) — HOLDING.** Post-gap-fill F2 dry-run: all 18 docs OK, worst case doc-10 at 38,724/50,000. doc-08 (the v1 double-overflow failure) projected 29,750/50,000 and generated cleanly. Full table in §11.
- **D1 — doc-12 abs-path (F4 imperfect, recovered).** Pass-1: `Session wrote outside the staging dir … claims /little-friends-…-12-…md … requires a RELATIVE path` — the v1 doc-09 failure class. F4 did not prevent the model occasionally choosing an absolute path. **But F3 (no-cache on resume) delivered a genuine retry** (v1's lesson: the retry must not be cache-masked) and doc-12 succeeded. Net: the abs-path bug is **non-deterministic and not fully prevented**, but is now reliably recoverable. Worth hardening F4 (force/relocate to a relative staging path rather than failing).
- **D2 — doc-16 socket (transient).** Pass-1: `API Error: The socket connection was closed unexpectedly` after ~8 min, 0 output tokens. Pure infrastructure flake; succeeded on retry. No code implication.
- **D3 — i06 hallucination (transient, but notable).** Provisioning pass-1: i06 (Client Claude Code Setup) `Session finished but did not write a document. Model reply: **JCC (Joshua's Camera City, NJ camera shop) client profile:**` — the model confabulated an unrelated business (apparently from "Joshua" + the "JCC" abbreviation) and wrote nothing. Succeeded on retry, but the **retry artifact is thin (1,233 words vs 2,400–4,600 for the other I0x)** — Cowork should inspect i06's depth.
- **D4 — recon precedence leaks (§4).** Two of four planted facts survived from recon. Mechanism in §3. Left as-is by design.
- **Disclosure — SEO/analytics out of adapter scope.** Live recon ran website+GBP only; SEO baseline (DR/traffic/keywords) and analytics (GA4/GSC/Ahrefs) are not produced by those adapters, so those fields carry honest synthetic placeholders, not scraped data. On a fuller recon (branding/SEO adapters) these would fill.
- **Process — branch collision handled.** The named branch `e2e/littlefriends-synthetic-v2` already held the synthetic-skip run behind open PR #37; per operator decision this run **reset & force-pushes over it**. Old commit `5860f68` remains recoverable on origin/reflog.

---

## 11. F2 prompt-size pre-flight (post-gap-fill) — all OK

`est. tokens vs 50,000 ceiling, worst-case upstream projected`:

```
doc-01  13893   doc-02  16662   doc-03  16390   doc-04  21151
doc-05  21929   doc-06  23251   doc-07  21225   doc-08  29750
doc-09  30919   doc-10  38724   doc-11  23327   doc-12  23071
doc-13   6868   doc-14   7151   doc-15   6846   doc-16  25241
doc-17   7274   doc-18   5365
```
All 18 ≤ 50,000 (max doc-10 = 38,724). Readiness → exit 0, "All docs READY." **F1 confirmed holding** — the overflow that killed doc-08 in v1 is gone.
