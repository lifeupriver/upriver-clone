# Build Spec 14: fidelity hardening (provenance-aware generation)

Component: close the six pipeline gaps the live-recon e2e run surfaced (`13-e2e-live-evaluation.md`, fix list P1–P6), so an unverified recon field can never again rewrite a client's identity through the doc DAG, every generation session knows who the client is, and the readiness gate tells the operator the whole truth before the docs phase burns two hours. This is the spec that takes the system from "writes well but believes a stranger on the internet over the client in the room" to client-safe unattended.

Source of truth: `13-e2e-live-evaluation.md` (fix list P1–P6) and `12-e2e-live-report.md` (findings D1, D3, G, §3 precedence mechanism). Build against the existing modules — this hardens them, it does not redesign them. The DAG, merge model, F1 digests, and retry machinery are vindicated and stay as-is.

## File ownership

OWNS: `packages/cli/src/generate/profile-slice.ts`, `prompt-builder.ts`, `runner.ts`, `engine.ts`, `batch.ts` (dry-run readiness projection only), a new `packages/cli/src/generate/identity-assert.ts`, `packages/cli/src/transcript/catalog.ts`, `extract.ts` (prompt text only), `packages/schemas/src/coverage-map.ts` (requiresFields additions + SOURCE_EXPECTATIONS.transcript additions — data, not shape), and tests beside each. MUST NOT touch: the merge model (`packages/schemas/src/merge.ts` precedence is correct — last-write was never the bug; visibility was), recon adapters, the dashboard, the e2e script's phase structure, generated client artifacts (content fixes are explicitly out of scope per operator decision — the 27 artifacts on the eval branch stay as the run record).

## P1 — provenance-aware generation (the gate fix)

**Problem (the Montessori metastasis):** recon wrote `identity.category = "Montessori preschool"` (source: recon, unverified, low confidence). `profile-slice.ts` strips the envelope metadata (source/confidence/verified) from every field, so doc-01 saw a bare fact, adopted it as identity, and propagated a false pedagogy through ~10 downstream docs — including a fabricated staff credential (doc-05:152) and an inversion that banned the client's own self-description ("play-based") as off-brand. doc-02 resisted only because its spec demands provenance rigor; nothing at the engine level enforces it.

**Fix — show the generator what the profile knows about its own facts.**

- `profile-slice.ts`: `SliceField` gains `confirmed: boolean`. A field is **unconfirmed** when `source === 'recon' && verified !== true && confidence !== 'high'` (read from the same envelope the slice already resolves; only the boolean travels — full metadata stays stripped for tokens). `renderSlice` tags unconfirmed lines:
  `- identity.category: Montessori preschool [UNCONFIRMED — found by automated recon, not confirmed by the client]`
- `prompt-builder.ts`: extend the marker instruction with a hedge rule, applied to ALL deliverables (doc-01, the DAG root and contagion vector, most of all):
  > Fields tagged [UNCONFIRMED] are automated web-recon findings the client has not confirmed. They may inform your work but must NEVER be asserted as fact, identity, or positioning. Either hedge them explicitly ("appears to be", "according to its online listing") or restate them inside a [NEEDS CONFIRMATION: …] marker. Never build structure (keyword sets, competitive positioning, vocabulary rules) on an [UNCONFIRMED] field without flagging that dependency.
- No readiness change: an unconfirmed field still counts as filled (recon's marker-count payoff is real — doc-01 dropped 27→18); it just can't masquerade as confirmed truth.
- Cache keys already hash the rendered slice (`profileSliceHash`), so tagged slices naturally bust stale caches.

Verification leans on the asymmetry the run proved: the same engine produced both doc-02 (hedged correctly, by spec) and doc-01 (asserted, no spec backstop). The unit tests assert the tag renders exactly when the envelope is recon+unverified+non-high, and the assembled doc-01 system prompt carries the hedge rule.

## P2 — identity slice everywhere + post-generation identity assert

**Problem (D3 + the placeholder cluster):** only 4 of 27 deliverables list `identity.publicName` in `requiresFields`, so most sessions never see the client's name. i06's retry confabulated a different business ("JCC, Joshua's Camera City") into the header; i03 wrote `[organization name]` ×6 and i08 `[program name]` ×16 while the name sat in the profile. Nothing post-generation checks the artifact names the right client.

**Fix (two halves):**

1. **Coverage:** add `identity.publicName` to `requiresFields` for every deliverable that lacks it (all 27 must carry it — a doc that doesn't know the client's name cannot be client-grade). Audit pass, not blind append: keep the lists sorted/grouped as they are. `identity.publicName` is recon-fillable and was filled from day one, so this adds zero readiness friction.
2. **Assert:** new `generate/identity-assert.ts`:
   ```ts
   export interface IdentityAssertInput {
     content: string;
     publicName: string;          // this client's identity.publicName
     foreignNames: string[];      // other clients' publicNames (the denylist)
   }
   export function assertIdentity(input: IdentityAssertInput): void; // throws with a precise message
   ```
   - Artifact MUST contain `publicName` (case-insensitive substring).
   - Artifact MUST NOT contain any foreign name (case-insensitive; names shorter than 4 chars skipped to avoid false positives).
   - The engine calls it after `runDoc` returns content, before persist/manifest. A failure throws → the doc records as `error`, surfaces exactly like other generation failures, and recovers via the existing retry path (which would have caught both the "Camera City" attempt and the "JCC" mislabel).
   - Denylist source: the CLI gathers `identity.publicName` from the other `clients/*/profile.json` the data source can see (local mode) — injected as a plain `string[]` so the unit stays pure and Supabase mode can supply its own list. Missing/empty denylist degrades gracefully to the publicName-presence check alone.

## P3 — extraction recall, round 2 (the leak's root cause)

**Problem (Disclosure E, twice now):** extraction never wrote `identity.socialHandles`, `identity.category`, or `voice.bannedVocabulary` even though the corpus states all three. That recall gap is WHY both planted recon facts leaked: corpus-beats-recon precedence only works when the corpus value actually gets written. The catalog ★-flags only `MUST_ASK` + `SOURCE_EXPECTATIONS.transcript`, and none of the three is in either set.

**Fix:**

- `coverage-map.ts`: add `identity.category`, `identity.socialHandles`, `voice.bannedVocabulary` to `SOURCE_EXPECTATIONS.transcript` (clients state who they are, their handles, and the words they hate in interviews — these are exactly transcript-expected). Audit the rest of the recon list for the same dual-source pattern: any recon-fillable field a client would plausibly state in an interview belongs in both lists, because the transcript value is what overrides a wrong recon value.
- `extract.ts` (prompt text): two recall pushes in the system prompt — (a) "★ fields are session-priority: when the transcript states one anywhere, you MUST emit a candidate for it, even if phrased casually"; (b) a closing self-check instruction: "before finishing, re-scan the chunk against the ★ list for fields you skipped."
- `catalog.ts`: no structural change; tests pin that the three new paths render with `★`.

Live acceptance (cheap, one extraction run): re-run `profile extract-transcript` against the littlefriends synthetic corpus on a scratch copy of the profile and confirm candidates appear for the three named fields. This is the one fix whose proof needs a live call; everything else is unit-provable.

## P4 — slice under-consumption (stop wasting the recon spend)

**Problem:** recon filled `content.testimonials` (the Renata Kero quote) and `content.reviewPlatforms` (the 5.0 Google rating), but doc-04 claimed "no reviews available" and doc-12 marked the rating `[NEEDS CONFIRMATION]` — their slices never included those fields. doc-02's ~30% false-positive markers are the same class.

**Fix:** `coverage-map.ts` requiresFields additions, driven by the eval's named false positives:

- doc-04 (Content Library): + `content.testimonials`, `content.reviewPlatforms`
- doc-12 (Measurement & KPI): + `content.reviewPlatforms` (the ratings baseline)
- doc-02 (Business Facts Reference): + `identity.publicName` (via P2), `identity.category`, `identity.primaryAddress`, `identity.hours`, `identity.socialHandles`, `content.reviewPlatforms` — the facts doc should consume every identity-cluster field the profile holds rather than asking for them.
- doc-16 (Sales Collateral): + `content.testimonials` (it used the testimonial only because the retry happened to; make it guaranteed).

Each addition must be justified against a named marker false positive from the eval — this is a targeted audit, not a "give every doc everything" pass (that road leads back to prompt overflow; F2's dry-run table is the regression check that no doc's prompt estimate crosses the ceiling after the additions).

## P5 — readiness gate projects provisioning (Finding G)

**Problem:** the exit-3 checkpoint (`generate --all --dry-run`) reports doc-level blockers only. The i01–i09 fields (`browserDeviceLandscape`, `dataResidency`, `billingContact`, `memoryIncognitoPosture`, `reviewResponsePolicy`, `technicalCollaborator`) never surface, so the run passed the gate, burned the ~2h docs phase, then went 0/9 on provisioning pass 1.

**Fix:** the `--all --dry-run` report gains a **provisioning readiness projection**: for each of i01–i09, run `deliverableReadiness` and report `missingFields` + `unverifiedHv` only — `missingDocs` is excluded (upstream docs are by definition not generated yet at the checkpoint; reporting them would make the projection all-red and useless). Render as a second table after the prompt-size table: `artifact | missing fields | unverified HV`, listing the union of blocking paths at the bottom so the operator has a copy-pasteable gap-fill list. The projection is informational by default; `--strict-provisioning` (new flag) makes a non-empty projection exit non-zero for unattended runs. The e2e script's readiness phase adopts the flag.

Implementation locus: `batch.ts` (a pure `projectProvisioningReadiness(profile): …` next to `planBatch`) + the dry-run rendering in the command layer; `coverage.ts` is already sufficient and does not change.

## P6 — F4 hardening: self-heal the abs-path failure class (D1)

**Problem:** doc-12 pass-1 failed with `Session wrote outside the staging dir … claims /little-friends-….md, but no file is there`. F4's relocation handles claimed paths that EXIST; a claimed path with no file is currently a hard error that costs an operator round-trip, even though the F3 retry reliably fixes it (non-deterministic model behavior, genuine retry succeeds).

**Fix:** in `runner.runDoc`, when the no-file branch hits (claimed-but-absent OR no claim at all — D3's i06 hallucination is the same recover-by-retry class), auto-retry ONCE with `noCache: true` before throwing — the exact F3 pattern, extended from "cache hit with no file" to "session with no file." Order of operations per attempt stays: find file → relocate claimed-existing → else retry → else throw the current precise errors. Guard: exactly one auto-retry per `runDoc` call total (a cache-replay that then writes nothing live must not loop).

## Definition of Done

- [ ] Root `pnpm build` clean; all suites green
- [ ] P1: slice tests prove `[UNCONFIRMED]` renders exactly for recon+unverified+non-high envelopes (and not for transcript/operator/verified/high); prompt-builder test pins the hedge rule in every deliverable's system prompt
- [ ] P2: all 27 COVERAGE_MAP entries carry `identity.publicName`; `identity-assert` tests cover present-name pass, missing-name throw, foreign-name throw, short-name skip, empty denylist; engine wires the assert between content and persist (tested with injected call)
- [ ] P3: catalog test pins ★ on the three added paths; extract prompt carries the recall push + self-check; live extraction re-run on the littlefriends corpus yields candidates for `identity.category`, `identity.socialHandles`, `voice.bannedVocabulary` (recorded in changelog with counts)
- [ ] P4: each requiresFields addition traces to a named eval false positive; post-addition `--all --dry-run` F2 table all-OK (no prompt re-overflow)
- [ ] P5: dry-run renders the provisioning projection (missingFields + unverifiedHv, no missingDocs); `--strict-provisioning` exits non-zero on a non-empty projection; e2e script readiness phase passes the flag; a profile fixture reproducing Finding G's six fields shows them all
- [ ] P6: runner test proves a no-file first attempt triggers exactly one fresh `noCache` retry then succeeds/fails precisely; cache-replay-then-no-file does not double-retry
- [ ] Changelog: fix→finding map (P1→Montessori metastasis, P2→D3+placeholders, P3→Disclosure E, P4→marker false positives, P5→Finding G, P6→D1), with any deviations called out

## Changelog

- 2026-06-10: spec written from `13-e2e-live-evaluation.md` (P1–P6). Operator-decided scope: pipeline fixes only; the 27 eval-branch artifacts stay untouched as the run record; content gets regenerated through the fixed pipeline on the next run. P1 approach decided: provenance tags in the slice + universal hedge instruction (not field-blocking, not an operator reconciliation gate).
