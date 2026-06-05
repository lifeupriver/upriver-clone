# Build Spec 06: coverage-driven chatbot + dashboard coverage view (M6)

Component: M6 — the client-facing coverage-driven intake chatbot (the evolution of the static `interview-guide.md → FormSpec` layer) plus the operator-facing dashboard coverage view (the dashboard mirror of `profile show`). Built last of the per-component specs because it is the most polish-dependent (PRD §8 M6) and needs real coverage gaps to drive its questions (depends on M3 recon / M4 profile so there is a gap to fill).
Built: tier-3, fresh Claude Code session, after the tier-2 integration merged to `main`.
Source of truth: `01-prd.md` locked decision 1 (intake lives in the dashboard, not the marketing site), §4.2 (coverage-driven interview), §3.5 (must-ask subset + the chatbot gap-fill bucket), §6/§7 (trust boundary, architecture file map), §8 M6; `specs/03-profile-commands-spec.md` (the `ShowModel` the coverage view renders). Where this spec is more specific, it wins.

---

## File ownership (parallel-build boundary)

This session OWNS, all under `packages/dashboard/`: NEW `src/pages/deliverables/[slug]/intake-chat.astro` (the magic-link chatbot page), NEW `src/pages/api/profile/[slug].ts` (the chatbot's tool-call write endpoint), NEW `src/lib/coverage-chat.ts` (question selection + the Anthropic SDK loop), NEW `src/lib/profile-coverage.ts` (compute the coverage gap + the view model from a profile), and NEW `src/pages/clients/[slug]/coverage.astro` (the operator coverage view). It must NOT modify: the CLI (`packages/cli` — read-only; the chatbot does not shell out, since Option B Vercel has no CLI), `packages/schemas` (read-only — consume `deliverableReadiness`, `COVERAGE_MAP`, `MUST_ASK`, `SOURCE_EXPECTATIONS`, `mergeCandidate`, `clientProfileZ`), the existing static `interview.astro` / `parse-guide.ts` / `interview-share.json` mechanism (REUSED untouched — it is the fallback until this is proven), and the M5/M4 intake routes. New dep: the Anthropic SDK (`@anthropic-ai/sdk`) in `packages/dashboard` only — PRD §4.2 names this the one LLM surface that is not `claude-cli.ts`.

## 1. Purpose and scope

Two surfaces over the one Client Profile, both through the existing `ClientDataSource` (never a direct Supabase client — PRD §7 trust boundary).

### 1a. Dashboard coverage view (operator) — `clients/[slug]/coverage.astro`

The dashboard mirror of `profile show`: per-deliverable readiness (ready / blocked-by-fields / blocked-by-HV / blocked-by-docs), the conflict queue, per-section fill counts, and generated-but-unapproved docs that block downstream — i.e. the `ShowModel` shape (Build Spec 03 `profile/show-model.ts`). Because the CLI is unavailable in Option B, the view computes the model server-side in `lib/profile-coverage.ts` from `@upriver/schemas` primitives (`deliverableReadiness` over `COVERAGE_MAP`, leaf-fill counts, the manifest, `profile-conflicts.json`) — the same inputs the CLI's `buildShowModel` uses. To prevent CLI/dashboard drift, the build should **promote the pure `buildShowModel` into `@upriver/schemas`** (or `@upriver/core`) and have BOTH the CLI and this view import it; if that shared move proves larger than a lift-and-shift, re-implement here and changelog the convergence as a follow-up rather than forking silently.

### 1b. Coverage-driven chatbot (client) — `deliverables/[slug]/intake-chat.astro` + `api/profile/[slug].ts`

- **Gate.** Reuse `validateInterviewToken(slug, token)` against `interview-share.json` exactly as the static form does — same magic link, no new auth.
- **Question source.** `coverage-chat.ts` builds the gap: the must-ask subset (`MUST_ASK` / `SOURCE_EXPECTATIONS` chatbot-fillable fields, §3.5's "chatbot gap-fill" bucket — NOT the operator-only credential/HV-money fields) minus fields already filled, scoped to the client's engagement scope, ordered by how many blocked deliverables each field unblocks. The Anthropic SDK system prompt embeds this gap so the bot asks only what is missing, in plain language, and stops when the gap is closed.
- **Write path.** Each captured answer is a tool call → `POST /api/profile/[slug]` → the endpoint enforces the §7 trust boundary, then `mergeCandidate(existing, { value, source: 'interview' }, now)` through the data source (revision bump; conflicts queue to `profile-conflicts.json`, never overwrite higher precedence). The raw conversation/answers also append to `interview-responses.json` as the provenance log (authoritative values live in `profile.json`).
- **Trust boundary (PRD §7), enforced in `api/profile/[slug].ts`:** valid token required; only whitelisted, chatbot-fillable field paths accepted (reject `verified`, any operator-source write, and every HV/credential/money field — those are operator-only); `clientProfileZ`-validate every write; rate-limit per token. The endpoint is the only client-writable profile surface.
- **Fallback.** The static FormSpec form stays as the no-JS fallback and is retired only once this chatbot demonstrably covers the same ground (PRD §4.2 / §8 M6).

Model access: the Anthropic SDK with the API key in the dashboard env (Option B Vercel). No `claude-cli.ts`.

Out of scope: changing the magic-link minting (`upriver interview-link`), retiring the static form in this build, recon/transcript/operator write paths (their specs), any marketing-site change (locked decision 1), per-client Supabase projects.

## 2. Layout

```
packages/dashboard/src/
├── pages/
│   ├── deliverables/[slug]/intake-chat.astro   NEW magic-link chatbot UI (client-side chat,
│   │                                           posts answers to the endpoint; SSR-gated by token)
│   ├── api/profile/[slug].ts                   NEW tool-call write endpoint (trust boundary +
│   │                                           mergeCandidate via ClientDataSource)
│   └── clients/[slug]/coverage.astro           NEW operator coverage view (renders the ShowModel)
└── lib/
    ├── coverage-chat.ts                        NEW gap computation + ordering + Anthropic SDK loop
    │                                           (model injectable so it tests without live calls)
    └── profile-coverage.ts                     NEW profile → ShowModel (shared builder; see §1a)

Reused untouched: lib/interview.ts (validateInterviewToken), lib/data-source.ts,
lib/intake-writer.ts merge path, interview-share.json, the static interview.astro fallback.
```

## 3. Definition of Done

- [ ] Root `pnpm build` clean; `pnpm --filter @upriver/dashboard test` green (existing 15 + new); the only new dep is `@anthropic-ai/sdk` in `packages/dashboard`
- [ ] Coverage-gap tests: must-ask-minus-filled excludes already-filled and operator-only/HV fields; ordering by unblock-count; "gap closed → no more questions" terminates the loop (Anthropic SDK mocked)
- [ ] Endpoint security tests (the trust boundary): rejects an invalid/absent token; rejects a non-whitelisted path, an HV/credential/money path, a `verified` write, and an operator-source write; rejects a schema-invalid value; rate-limits per token; an accepted write merges as `source:'interview'` (conflict queues, never overwrites operator/verified)
- [ ] Coverage view renders the `ShowModel` (ready/blocked groupings, conflict queue, section fill, unapproved-blocking) from a fixture profile; matches the CLI `profile show --json` for the same profile (oracle test) — via the shared builder if promoted, else a documented parity test
- [ ] The static FormSpec form still works unchanged (fallback intact); magic-link gating reused, not reimplemented
- [ ] Live acceptance: against `clients/littlefriends/` remaining coverage gaps, a scripted chat session fills ≥1 chatbot-fillable field end-to-end (token → question → answer → `source:'interview'` write → revision bump → gap shrinks), with at least one rejected write (HV or non-whitelisted) demonstrating the boundary; transcript + the before/after coverage in the changelog
- [ ] No direct Supabase client (all profile I/O via `ClientDataSource`); no CLI shell-out; no file > ~300 lines
- [ ] Spec changelog: deviations, the acceptance transcript, follow-ups (retire the static form + Doc 14 questionnaire once parity is shown; promote `buildShowModel` to shared if not done here)

## Changelog

- 2026-06-04: spec written (tier-3, after the tier-2 integration merged). Canonical spec number 06 per the PRD §"Per-component build specs" order (schemas, generate, profile, recon, migration, **chatbot**, transcript). Bundles the dashboard coverage view with the chatbot since both render/serve the one profile through the dashboard's data source and were called out together as the tier-3 input. Decision flagged for the build session: whether to promote `buildShowModel` into `@upriver/schemas` (preferred — one source for CLI + dashboard) or re-implement in `profile-coverage.ts` with a parity test.

- 2026-06-05: **BUILT.** The coverage-driven chatbot + the operator coverage view shipped, all under `packages/dashboard/` plus the one sanctioned shared-package touch. `pnpm --filter @upriver/dashboard test` green at **34** (15 baseline + 19 new); root `pnpm build` clean (incl. `astro build` of both new pages); the only new dashboard dep is `@anthropic-ai/sdk`.

### Resolved open decision — promote `buildShowModel`

**Promoted into `@upriver/schemas`** (the preferred path). The pure `buildShowModel`/`buildDeliverableDetail` + their model types, plus the `Manifest`/`ManifestEntry` shape, `generatedIds`, and `leafPaths` they depend on, now live in `@upriver/schemas/show-model.ts` (`leafPaths` in `coverage.ts`). The CLI re-exports them from `generate/manifest.ts`, `generate/profile-merge.ts`, and `profile/show-model.ts` (behavior byte-unchanged — its 336-test suite stays green); the dashboard coverage view imports the same builder. One source, no drift. The CLI re-export is the unavoidable consequence of "have BOTH import it" and is kept to thin re-exports; it is committed separately from the dashboard feature for review clarity.

### Definition of Done — verification table

| DoD item | Result |
|---|---|
| Root `pnpm build` clean; `@upriver/dashboard test` green (existing 15 + new); only new dep `@anthropic-ai/sdk` in dashboard | **PASS** — build clean; dashboard 34/34; schemas 39→44, cli 322→336 (re-export + promoted-builder tests), all green; `@anthropic-ai/sdk` added to `packages/dashboard` only |
| Coverage-gap tests: must-ask-minus-filled excludes filled + operator-only/HV; ordering by unblock-count; gap-closed → loop terminates (SDK mocked) | **PASS** — `coverage-chat.test.ts`: whitelist = chatbot must-ask ∩ non-HV (excludes `toolsAndAccess.stack`/`escalationRouting`/…); `chatbotGap` excludes filled, ordered desc; empty-gap system prompt forbids tool calls and `runChatTurn` terminates with no write |
| Endpoint security (the trust boundary): invalid/absent token; non-whitelisted path; HV/credential/money path; `verified` write; operator-source write; schema-invalid value; rate-limit; accepted write merges `source:'interview'` (conflict queues, never overwrites operator/verified) | **PASS** — `route-profile.test.ts` (9): 401 on bad/missing token; rejects `identity.legalName` (non-whitelist), `toolsAndAccess.stack` (HV), a `…verified` path segment, an envelope-shaped value (operator/verified smuggle), and a schema-invalid value; 429 after 20/min; accepted write is `source:'interview'`, `verified:false`; an operator value is preserved and the interview candidate queues to `profile-conflicts.json` |
| Coverage view renders the `ShowModel` from a fixture; matches CLI `profile show --json` (oracle, shared builder) | **PASS** — `profile-coverage.test.ts`: `loadCoverageModel` deep-equals `buildShowModel(profile, manifest, conflicts)` (the same builder the CLI emits) + structural checks; `coverage.astro` renders ready/blocked groupings, conflict queue, section fill, unapproved-blocking |
| Static FormSpec form still works (fallback intact); magic-link gating reused, not reimplemented | **PASS** — `interview.astro`/`parse-guide.ts`/`interview.ts` untouched; `intake-chat.astro` reuses `validateInterviewToken` against `interview-share.json` and links to the static form as the no-JS fallback |
| Live acceptance vs `clients/littlefriends/`: scripted chat fills ≥1 chatbot field end-to-end + ≥1 rejected write; before/after coverage | **PASS** — transcript below (isolated dir; tracked worked example untouched) |
| No direct Supabase client (all via `ClientDataSource`); no CLI shell-out; no file > ~300 lines | **PASS** — grep clean (no `createClient`/`@supabase`, no `writeFileSync`→`clients/`); endpoint uses `resolveClientDataSource`; largest new file `profile-coverage.ts` 226 lines |
| Spec changelog: deviations, transcript, follow-ups | **PASS** (this entry) |

### Live acceptance transcript (`clients/littlefriends/`, `UPRIVER_DATA_SOURCE=local`, isolated `UPRIVER_CLIENTS_DIR`, Anthropic SDK scripted — zero live calls)

Driving the real endpoint (`handleProfilePost`) with a scripted model:
```
BEFORE  revision=2  gap=["people.keyTeam","operationsAutomation.recurringTasks","content.productionCapacity"]
ACCEPT  {"ok":true,"writes":[{"path":"people.keyTeam","revision":3}],"rejected":[],"revision":3,
         "gap":["operationsAutomation.recurringTasks","content.productionCapacity"]}
REJECT  {"ok":true,"writes":[],"rejected":[{"path":"toolsAndAccess.stack",
         "reason":"human-verify-required — handled by the operator, not here"}],"revision":3}
NOAUTH  status=401
AFTER   revision=3  gap=["operationsAutomation.recurringTasks","content.productionCapacity"]
FIELD   people.keyTeam.source=interview  verified=false  value=[{"name":"Erin","role":"Owner / Director"}]
```
Token → question → answer → `source:'interview'` write → revision 2→3 → gap shrinks (one field closed); the HV write (`toolsAndAccess.stack`) is refused at the boundary; a bad token is 401. The tracked `clients/littlefriends/` was not mutated.

### Deviations & build decisions

1. **`leafPaths` + the `Manifest` type moved with the builder.** `buildShowModel` depends on `leafPaths` (fill counts) and the manifest shape (`generatedIds` + unapproved-blocking); both came along to `@upriver/schemas` so there is exactly one implementation. `generate/manifest.ts` keeps its I/O (`readManifest`/`writeManifest`/`hashContent`/…) and re-exports the type + `generatedIds`; `generate/profile-merge.ts` keeps `mergeProfiles`/`planImport` and re-exports `leafPaths`.
2. **Trust-boundary order: token → rate-limit → HV → whitelist → envelope-shape → schema → merge.** The HV check runs before the whitelist so an HV path is rejected *as* HV (the whitelist already excludes HV fields, so this is the explicit operator-only signal). Envelope-shaped values are refused so a tool input can't smuggle `verified:true`/`source:'operator'`; `mergeInterviewField` also hardcodes `source:'interview'`, so `verified` can never be set on this path.
3. **Model injected, not imported, into the tested unit.** `runChatTurn` and `handleProfilePost` take an injectable `create` (the Anthropic `messages.create`); the `POST` route constructs the real `Anthropic` client and passes it through. Tests inject a scripted `create` — zero live calls. Default model `claude-opus-4-8` (overridable via `UPRIVER_CHATBOT_MODEL`).
4. **Chatbot-fillable whitelist = `MUST_ASK` (askVia `chatbot`) ∩ non-HV** = `people.keyTeam`, `operationsAutomation.recurringTasks`, `content.productionCapacity`. PRD §3.5 lists a few HV fields (`toolsAndAccess.stack`, `escalationRouting`, `browserDeviceLandscape`, `enrollmentCapacity`) under "chatbot gap-fill", but §7's HV rule wins — they are operator-only and the endpoint rejects them. Those HV-in-the-bucket fields are the natural rejected-write test cases.
5. **Provenance log.** Accepted answers append to `interview-responses.json` under a `chatbotFills` array, preserving the static form's `answers` (the authoritative values live in `profile.json` with `source:'interview'`).

### Follow-ups

- **Retire the static form + Doc 14 questionnaire** once the chatbot demonstrably covers the same ground (PRD §4.2 / §8 M6) — it remains the no-JS fallback for now.
- **Rate limit is in-memory** (single instance). For multi-instance Vercel, move the per-token window to a shared store (e.g. Supabase/KV).
- **`buildShowModel` promotion is done here** (not deferred) — the earlier "promote if not done here" follow-up is closed.
