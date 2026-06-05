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
