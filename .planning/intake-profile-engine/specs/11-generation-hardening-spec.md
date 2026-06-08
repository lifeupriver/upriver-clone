# Build Spec 11: generation hardening (close the e2e run's one architectural flaw)

Component: fix the prompt-size overflow and two resilience gaps the synthetic e2e run (`11-e2e-evaluation.md`) surfaced, so a full 12-doc + 9-provisioning run completes without a mid-run wall. This is the spec that takes the system from "7/12, capped by doc-08" to "live-client ready."
Source of truth: `11-e2e-evaluation.md` (the fix list F1–F5) and `07-e2e-run-report.md` (findings D8/D9). Build against the existing `packages/cli/src/generate/*` modules — this hardens them, it does not redesign them. The DAG, gating, merge model, and unattended gate are vindicated and stay as-is.

## File ownership

OWNS: `packages/cli/src/generate/prompt-builder.ts`, `runner.ts`, `engine.ts`, `data-source.ts` (read-only — only if a no-cache flag needs threading), a new `packages/cli/src/generate/upstream-digest.ts`, the `e2e-littlefriends.sh` script's resume path, and tests beside each. MUST NOT touch: `packages/schemas` (read-only — no coverage-map or DAG changes; the dependency edges are correct, only how upstream docs are *passed* changes), recon/transcript/profile commands, the dashboard. The five generated docs' *content contract* is unchanged — only the prompt assembly changes.

## F1 (the fix) — stop injecting upstream docs whole

**Problem (confirmed mechanically):** `prompt-builder.ts:66` injects each upstream doc as `### Upstream document: ${d.id}\n\n${d.content}` — the FULL body. doc-08 ingests doc-01+02+03+07 = ~21,400 words (doc-07 alone is 10,122), plus its own 9,850-word spec, plus the enriched profile slice → ~160K input tokens → "Prompt is too long." Prompt size grows monotonically down the DAG; doc-08 is just where it crossed the ceiling. doc-10 (depends on 01–09) would hit it too.

**Fix — pass a digest, not the body.** Build `upstream-digest.ts`:

```ts
/** What a downstream doc actually needs from an upstream doc — its structure and
 *  key facts, not its full prose. Generated once per upstream doc, cached, reused. */
export interface UpstreamDigest { id: DeliverableId; title: string; digest: string; sourceWords: number; digestWords: number }
export async function buildUpstreamDigest(slug: string, upstreamId: DeliverableId, ds: ClientDataSource): Promise<UpstreamDigest>
```

The digest is a compact structural summary: headings, the doc's key facts/claims, and any lists a consumer needs (doc-08 needs doc-07's *question list*, not its 10K-word answers; doc-11 needs doc-03's *process stages*, not the prose). Two implementation options — spec the simpler, allow the better:

- **v1 (ship this): deterministic structural extract.** Pull headings + first sentence of each section + any bulleted/numbered lists + a hard char cap per upstream doc (configurable, default ~1,500 words). No LLM call, no cost, deterministic, cacheable by doc content hash. This alone takes doc-08's upstream payload from ~21,400 words to ~6,000 and clears the ceiling with margin.
- **v2 (follow-up, note don't build): LLM-summarized digest** tuned per consuming spec ("summarize doc-07 for an email-template author"). Better fidelity, adds cost + a call per edge. Defer unless v1 proves too lossy in the re-run.

`prompt-builder.ts` changes one line of intent: upstream section uses `digest` instead of `content`. The digest is computed in `engine.ts` before prompt assembly and cached at `clients/<slug>/docs/.digests/<id>.md` (regenerated when the upstream doc's hash changes). Keep a `--full-upstream` escape flag that restores the old whole-body behavior for debugging.

## F2 — pre-flight prompt-size guard

`engine.ts:153` already logs `system prompt: N chars` / `user prompt: N chars` in `--dry-run`. Extend it: estimate tokens (chars/3.5 is fine), compare against a configurable ceiling (default ~150K input to leave generation headroom under the model's window), and in `--dry-run --all` print a per-doc table with a **FAIL/OK flag** for any doc whose assembled prompt would approach the ceiling — computed with the F1 digests in place, so it reflects reality. A doc over the ceiling in dry-run is a hard pre-run error the operator sees in 2 seconds, not a 12-minute mid-run failure. The e2e script's readiness phase already runs `--all --dry-run`; this makes that step catch overflow.

## F3 — no-cache on resume of a failed doc

**Problem (D9):** doc-09's retry was a cache replay — the text cache returned a stale reply with no file, so the doc never got a genuine second attempt. **Fix:** the `e2e-littlefriends.sh` `docs`/`provisioning` resume paths set `UPRIVER_LLM_NO_CACHE=1` (the env the runner already honors). Additionally, in `runner.ts`: a cache-hit that yields **no written file** must be treated as a cache miss and force one fresh invocation automatically (not an error) — a cached *text* reply can never satisfy a *file* output, so reusing it is always wrong. This closes the gap without the operator needing to remember the env var.

## F4 — staging-dir enforcement

**Problem (D9a):** doc-09's session wrote to `/Users/joshua/…` (absolute, outside the staging cwd); `findGeneratedFile` searched only the staging dir and reported "no file." **Fix:** the system prompt's output contract states the file MUST be written inside the working directory with a relative path (strengthen the existing instruction). In `runner.ts`: if the staging dir is empty after the session, before erroring, check whether the model's reply text names an absolute path it claims to have written; if so, relocate that file into staging (if it exists) or fail with a precise message naming the offending path. Belt-and-suspenders: the contract discourages it, the runner recovers from it.

## F5 — recon for the re-run (operator action, not code)

Recorded for the re-run prompt, not built here: the next synthetic run sets `FIRECRAWL_API_KEY` so recon runs live, or explicitly accepts that ~10 fields are synthetic and the marker count is not representative. No code change.

## Definition of Done

- [ ] Root `pnpm build` clean; all suites green
- [ ] `upstream-digest.ts` + tests: digest of a long doc is under the char cap, preserves headings + lists, deterministic for a fixed input; cache hit when upstream hash unchanged
- [ ] `prompt-builder` uses digests; a unit test asserts the assembled doc-08 user prompt with the real generated doc-01/02/03/07 digests is **under the F2 ceiling** (this is the regression test for the actual bug — use the committed e2e docs as fixtures)
- [ ] `--dry-run --all` prints the per-doc prompt-size table with OK/FAIL; a doc over ceiling makes the dry-run exit non-zero with the offending doc named
- [ ] runner: cache-hit-with-no-file auto-forces a fresh call (tested with a mocked cache); absolute-path write is relocated or precisely errored (tested)
- [ ] `e2e-littlefriends.sh` resume paths export `UPRIVER_LLM_NO_CACHE=1`; `--full-upstream` escape flag exists
- [ ] Changelog: which fix closed which finding (F1→D8, F3+F4→D9, F2→prevention); note v2 LLM-digest deferred; confirm no schemas/DAG change

## Changelog

- 2026-06-08: spec written from `11-e2e-evaluation.md`. The single gate to a complete 12+9 run.
