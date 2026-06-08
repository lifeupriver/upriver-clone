# 11 — Cowork evaluation of the synthetic e2e run (PR #34)

Date: 2026-06-08. Evaluator: Cowork. Subject: `e2e/littlefriends-synthetic` (`575a667`), the session's own `07-e2e-run-report.md`, and direct reading of the generated doc bodies (which the run session was forbidden to read — this is the quality judgment it deferred to me).

## Verdict in one line

The pipeline mechanics are sound and the prose quality is genuinely good; the run is **incomplete (7/12 docs, 0/9 provisioning)** because of **one fixable architectural flaw — prompt-size overflow when a late doc ingests its upstream docs whole**. Do not merge PR #34 to main as a delivery; merge it as the **evidence record** of the run, and fix the overflow before the next full run. This is a "the machine works, one bearing is undersized" result, not a "back to the drawing board" result.

## What the run proves works (and it's most of the system)

Reset → extract → conflict-resolve → HV-verify → readiness-checkpoint → unattended gate → per-tier auto-approval all behaved exactly as designed. The `UPRIVER_GATE_AUTO` gate fired 6 times and never once silently skipped. The readiness checkpoint correctly caught 16 field-blocked docs and handed off to operator gap-fill. The deliberately-unknown five were **never invented** — I verified each against the corpus: the conversion rate came through as a quoted, low-confidence `[NEEDS CONFIRMATION]` ("owner estimates more than half"), not a fabricated number; training currency hard-blocked and got an obviously-synthetic placeholder. That integrity property — the one that matters most for a system that touches a children's facility's compliance posture — held under a fully unattended run. That is the single most important thing this test confirmed.

The session's own report is exemplary: it called its own run INCOMPLETE in the headline despite `exit 0`, refused to over-claim causation on doc-08, and disclosed the synthetic-verified HV fields honestly. Trust it.

## The prose is the good news the marker count hides

I read the doc bodies. Doc-01's brand voice guide is genuinely in Rebecca's voice — the "what to avoid" examples ("We create a seamlessly supportive transition experience…") are exactly the brochure-speak she said she hates in the questionnaire, and the "how it sounds" examples ("two-year-olds are a lot") match her register. Doc-07 is 10,122 words of plausible FAQ. This is not slop; it is usable first-draft consulting output. **The headline metric needs reframing:** doc-01 went 30→27 markers, which looks like a ~10% disappointment — but reading the markers reveals they are almost entirely *identity facts a real client supplies in thirty seconds* (city/state, address, founding year, director's last name, phone, the actual tuition number, exact class sizes), NOT voice failures. They are unfilled *because* this is a synthetic client with no real web presence and recon was skipped (`FIRECRAWL_API_KEY` unset). On a live client, recon fills the address/phone/GBP/social cluster and the deep-dive supplies the names — most of those 27 markers never appear. The marker count is measuring the synthetic fixture's gaps, not the generator's quality.

## Root cause of the incompleteness — confirmed mechanically

doc-08 (Email Templates) failed twice with `"Prompt is too long"` (~160K input tokens). I confirmed why, and it is structural, not random: doc-08's prompt = its own spec (9,850 words, the largest of the 12) + the **full text of all four upstream docs it depends on** (doc-01+02+03+07 = 3,036 + 3,587 + 4,637 + **10,122** = ~21,400 words) + the gap-fill-enriched profile slice. doc-07 alone is 10K words and gets injected wholesale. As generation proceeds down the DAG, later docs ingest more and larger upstream docs — so the prompt grows monotonically and doc-08 is simply where it crossed the ceiling. doc-10/11/12 would likely have hit the same wall even if doc-08 had passed (doc-10 depends on docs 01–09). **This is the real finding of the run, and it's a known shape with known fixes.**

## The fix list (priority order)

| # | Fix | Why | Effort |
|---|-----|-----|--------|
| F1 | **Stop injecting upstream docs whole.** Pass a generated *summary/extract* of each `requiresDoc` (or only the sections the consuming spec actually needs), not the full body. doc-08 needs doc-07's *question list*, not its 10K-word answers. | Removes the monotonic prompt growth at the source; this is the one true fix | Medium — a summarizer pass + a per-doc "what downstream consumers need" contract |
| F2 | **Pre-flight prompt-size guard in `--dry-run`.** The dry-run already exists but doesn't log assembled prompt sizes; make it estimate tokens per doc and flag any that approach the limit *before* a 2-hour run burns on a doc that can't fit. | Turns a 12-minute mid-run failure into a 2-second pre-run warning | Small |
| F3 | **`UPRIVER_LLM_NO_CACHE=1` on any resume of a failed doc.** doc-09's retry was a cache replay (text cache returned stale, no file) — it never got a genuine second attempt. The script's resume path must disable the cache. | doc-09 was never actually retried; this is a one-line script + a runner guard | Small |
| F4 | **Staging-dir enforcement.** doc-09 wrote its file to `/Users/joshua/…` (absolute, outside cwd). The runner must reject or relocate an out-of-staging write rather than report "no file." | Second independent doc-09 failure; recurs on any doc whose model picks an absolute path | Small |
| F5 | **Recon must run for a faithful test.** This run skipped it (no key), so ~10 fields were synthetic-gap-filled that recon fills on a live client — and the marker count was inflated by it. Next full run: set the key, or accept the marker count is not representative. | Makes the headline metric mean something | Operator action |

F1 is the fix; F2–F4 are guardrails that should exist regardless. None require rethinking the architecture — the DAG, gating, and merge model are all vindicated.

## Schema / coverage-map findings (the unmapped list paid off)

- The extraction's `unmapped` list and the gap-fill both surfaced real schema gaps worth a small amendment pass: **OCFS staff-to-child ratio as an operational constraint** (schema has capacity counts, no ratio slot), **enrollment availability per room** ("could take a few more twos"), and the **per-reference "why" notes** the website paths need. Batch these into one schema-amendment spec.
- **Extraction-recall gap (Disclosure E) is the second-most-important finding.** Extraction left 25 deep-dive-predicted required fields empty that the corpus *demonstrably contains* (voice.attributes, pricing.shareable, people.owners, the OCFS module fields). The operator transcribed the real values by hand. Section-fill counters said "voice 4/4 complete" while required leaf paths were absent — so "complete" is misleading. This is a catalog/extraction-prompt tuning problem (the catalog likely under-specifies which leaf paths are required), worth its own investigation before live use — it's the difference between recon-plus-review and recon-plus-substantial-retyping.
- The "training currency hard-blocks doc-02" case is a genuine design question: a deliberately-unknowable compliance field forcing a hard block means the operator must inject a synthetic value to proceed. Consider marker-flagging it instead of hard-blocking.

## Process finding (not a code issue)

Two unrelated website-planning commits (`c20f7e4`, `fa25c27` — the spec-10 and playbook files you and I wrote) landed on the e2e branch mid-run, because a second session was active in the same working copy. No harm done (they didn't touch run files), but it confirms the lesson from earlier: **one working copy per concurrent session.** For the next run, the e2e session gets the repo to itself.

## Recommendation

1. **Merge PR #34 as the run record** (it carries the report + artifacts + this evaluation), not as production delivery. The littlefriends client dir is a synthetic test fixture, not a real engagement.
2. **Build F1–F4 as a small "generation hardening" spec** before any further full runs or live clients — F1 is the gate to completing a 12-doc run at all.
3. **Then re-run the synthetic e2e with recon live (F5)** to get a representative marker count and prove the full 12+9 completes.
4. The extraction-recall gap (Disclosure E) gets its own investigation — it's the quietest finding and the one most likely to erode the "weeks → review pass" promise if left unfixed.

Bottom line: this run did its job. It proved the spine, the gates, and the integrity guarantees under unattended operation, produced genuinely good prose, and surfaced exactly one architectural flaw with a clear fix — which is the best possible outcome for a first full-system test. The system is close. It is not yet ready for a live client, by a margin measured in one hardening spec, not a rebuild.
