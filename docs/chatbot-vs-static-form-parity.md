# Parity evidence: coverage chatbot vs. `interview-guide.md` → FormSpec

**Status:** Evidence for a gated decision — *should the static no-JS interview form be retired now that the coverage chatbot exists?*
**Verdict:** **No — not at parity.** The chatbot covers a deliberately narrow 3-field gap; the static form pipeline covers the entire intake surface. Retiring the static form today would remove the only no-JS path for ~95% of what intake collects. **Recommend: keep the static form; do not delete `parse-guide.ts`, `deliverables/[slug]/interview.astro`, or the Doc 14 questionnaire.**

This document is the proof requested before any retirement. The numbers below are machine-checked by `packages/dashboard/test/parity-evidence.test.ts`, which fails if the code drifts from what is claimed here.

---

## TL;DR

| | Static form pipeline | Coverage chatbot |
|---|---|---|
| Source of questions | `interview-guide.md` (LLM-generated, ~100 FAQ Qs + 6–8 voice probes + asset checklist + 8–15 integration Qs + 6–10 override prompts) and Doc 14 (30–40 Qs across 7 sections) | The `chatbotGap` — must-ask fields routed to `chatbot` and not human-verify-required |
| Fields it can populate | Effectively the whole `ClientProfile` (free-text answers → `process-interview` LLM extraction) | **Exactly 3:** `people.keyTeam`, `operationsAutomation.recurringTasks`, `content.productionCapacity` |
| MUST_ASK fields it covers | All 18 (via the recorded session + form) | 3 of 18 |
| Works without JavaScript | **Yes** (server-rendered `<form>`, progressive auto-save) | **No** (chat loop is client-side `fetch`) |

The chatbot is **not** a smaller version of the form that is "catching up." It is a different tool with a deliberately bounded scope (see [§5](#5-the-gap-is-by-design-not-a-backlog)).

---

## 1. The two pipelines

### Static form (the no-JS fallback)
1. `upriver interview-prep <slug>` generates `clients/<slug>/interview-guide.md` — an LLM-authored guide. The prompt hard-requires **exactly 100 FAQ questions**, plus brand-voice probes, an asset-gap checklist, technical-integration questions, and aesthetic/strategic override prompts. — `packages/cli/src/commands/interview-prep.ts:239-313`
2. `parseInterviewGuide(md)` turns that markdown into a `FormSpec` (`sections[] → items[]` of kind `q` / `check` / `override`). — `packages/core/src/interview/parse-guide.ts:13-156`
3. `deliverables/[slug]/interview.astro` renders the FormSpec as a server-side `<form>` and auto-saves answers to `interview-responses.json` via `POST /api/interview/<slug>`. — `packages/dashboard/src/pages/deliverables/[slug]/interview.astro:98-205`
4. `upriver process-interview <slug>` feeds the answers (and/or a recorded transcript) through an LLM that extracts structured values into many `ClientProfile` fields. — `packages/cli/src/commands/process-interview.ts`

### Coverage chatbot
1. `chatbotGap(profile)` = must-ask fields, routed to `chatbot`, not yet filled, not HV — ordered by deliverables unblocked. — `packages/dashboard/src/lib/profile-coverage.ts:120-124`
2. `intake-chat.astro` runs a client-side chat loop that `POST`s to `/api/profile/<slug>`. — `packages/dashboard/src/pages/deliverables/[slug]/intake-chat.astro:90-118`
3. `runChatTurn` embeds the gap in the system prompt; the model may call exactly one tool, `record_answer(path, value)`. — `packages/dashboard/src/lib/coverage-chat.ts:65-172`
4. The endpoint enforces the PRD §7 trust boundary and writes via `mergeInterviewField` as `source:'interview'`. — `packages/dashboard/src/pages/api/profile/[slug].ts:121-150`

The chatbot page itself already treats the form as its fallback, in code and in copy:

> `// The static FormSpec form stays as the no-JS fallback at deliverables/[slug]/interview.`
> — `intake-chat.astro:5-7`
>
> "Prefer a form? The **question list** still works." — `intake-chat.astro:57-59`

---

## 2. What the chatbot actually covers

The whitelist is derived, not hand-listed: `MUST_ASK` filtered to `askVia === 'chatbot'` **and** not human-verify-required.

```ts
// packages/dashboard/src/lib/profile-coverage.ts:100-102
export const CHATBOT_FILLABLE: string[] = MUST_ASK
  .filter((e) => e.askVia === 'chatbot' && !isHumanVerifyRequired(e.path))
  .map((e) => e.path);
```

`MUST_ASK` routes **7** fields to the chatbot (`coverage-map.ts:242-249`), but **4 of them are HV-gated** (`hv.ts:19-44`) and therefore excluded — credentials, tool stack, device landscape, enrollment capacity are operator-only. What remains:

| Chatbot-fillable field | Plain-language label (`profile-coverage.ts:88-92`) |
|---|---|
| `people.keyTeam` | key team members — names and roles |
| `operationsAutomation.recurringTasks` | recurring operational tasks the team handles (and how often) |
| `content.productionCapacity` | who creates your content and roughly how many hours per week |

The existing suite already asserts this is exactly the set: `coverage-chat.test.ts:31-39`.

---

## 3. What the static form covers

The static guide is a **full intake instrument**, not a 3-field form:

- **`interview-prep.ts` output** — exactly 100 FAQ questions (AEO gaps, sales/conversion gaps, general coverage), 6–8 brand-voice probes, a photography/video/logo/testimonial asset checklist, 8–15 technical-integration questions, and 6–10 aesthetic/strategic override prompts. — `interview-prep.ts:239-313`
- **Doc 14 questionnaire** — the canonical 30–40-question intake, **7 sections**: A Business basics, B What you sell, C Customers, D Voice & brand, E Sales process, F Competition, G Goals & constraints. — `.planning/intake-profile-engine/specs-reference/ai-operating-system/14-client-onboarding-kit-spec.md:147-213`

Those answers reach the profile through `process-interview`'s LLM extraction, so the static path can populate essentially any `ClientProfile` field — including all eight session-only must-ask fields (voice, offerings.dontDo, pricing.nonShareable, capacity, sales qualification/close, goals red-lines/primary-outcome) that the chatbot never touches.

---

## 4. The coverage delta

`MUST_ASK` has **18** fields (`coverage-map.ts:232-254`). The chatbot can fill **3**. The other **15** it cannot:

| Why uncovered | Count | Fields |
|---|---|---|
| `askVia: 'session'` (recorded interview) | 8 | `voice.attributes`, `offerings.dontDo`, `pricing.nonShareable`, `capacity.metrics`, `salesProcess.qualificationCriteria`, `salesProcess.close.definition`, `goals.redLines`, `goals.primaryOutcome` |
| `askVia: 'operator'` | 3 | `toolsAndAccess.apiSpend.caps`, `toolsAndAccess.plan.billingOwner`, `governance.dataResidency` |
| `askVia: 'chatbot'` but HV-gated → operator-only | 4 | `toolsAndAccess.stack`, `operationsAutomation.escalationRouting`, `toolsAndAccess.browserDeviceLandscape`, `modules.preschool.enrollmentCapacity` |

And that is **only the must-ask spine**. The static guide also collects the entire *narrative* surface — FAQ content for Doc 07, voice samples for Doc 01, competitor intel for Doc 05, asset inventory for Doc 04, integration mapping for Docs 08/10/11, and strategic overrides — none of which is in the chatbot's scope at all.

**Conclusion:** the chatbot covers ~17% of the must-ask fields and a small fraction of the overall intake surface. It does **not** cover the same ground as `interview-guide.md → FormSpec`.

---

## 5. The gap is by design, not a backlog

The routing is a deliberate architectural split (PRD §3.5, encoded in `MUST_ASK.askVia`):

- **session** → the recorded 90-minute interview captures voice, judgment, and sensitive narrative. The chatbot is explicitly told *not* to go here: "Never ask for passwords, API keys, pricing, capacity numbers, or anything sensitive." — `coverage-chat.ts:84`
- **operator / HV** → money, credentials, capacity, governance are human-verify-required and rejected at the endpoint before they could ever be chatbot-written. — `api/profile/[slug].ts:125-131`
- **chatbot** → only low-friction, non-sensitive factual gap-fill.

So the 3-field scope will not grow into form parity by iterating the chatbot; closing the gap would require moving session/HV/operator fields into the chatbot, which contradicts the trust boundary.

---

## 6. What true parity would require (today: unmet)

- [ ] A no-JS path for the chatbot (it is a client-side `fetch` loop; the form is server-rendered). — currently **unmet**
- [ ] Chatbot coverage of the 8 session must-ask fields — **unmet** (routed to the recorded interview by design)
- [ ] An operator path for the 7 HV/operator fields the form surfaces — **partially** handled elsewhere (operator console), not by the chatbot
- [ ] Capture of the narrative/FAQ/voice/competitor/asset/override surface the guide collects for Docs 01–12 — **unmet**
- [ ] A migration for in-flight `interview-responses.json` answers — **not started**

---

## 7. Recommendation

**Keep the static form. Do not retire it on parity grounds yet.** The three artifacts the retirement proposal would delete are all still load-bearing:

| Proposed deletion | Why it is still needed |
|---|---|
| `packages/core/src/interview/parse-guide.ts` (+ the CLI copy) | Only renderer of `interview-guide.md`; consumed by `interview.astro`, `interview.ts`, `process-interview`, `interview-link` |
| `deliverables/[slug]/interview.astro` (static path) | The **no-JS fallback**; the chatbot page links to it as the form |
| Doc 14 questionnaire | The 7-section, 30–40-question canonical intake — the chatbot replaces 3 of its fields |

If Joshua nonetheless wants to retire the no-JS fallback, the safe sequence is: (1) confirm no-JS clients are an acceptable loss, (2) move session/operator capture somewhere reachable, (3) migrate existing responses, (4) update `intake-chat.astro`'s fallback link, then (5) delete. This PR does **not** do any of that — it is evidence only, pending explicit go-ahead.

---

## 8. Reproducing this evidence

```
pnpm --filter @upriver/dashboard test
# parity-evidence.test.ts asserts: whitelist == 3 fields; 15 must-ask fields
# uncovered (8 session + 3 operator + 4 HV-in-chatbot-bucket); and that a
# representative interview-guide.md parses to far more items than the chatbot fills.
```

If someone later expands `MUST_ASK`, the HV registry, or the chatbot whitelist, that test breaks and this document must be revisited before any retirement.
