# Build Spec 07: transcript extractor (`upriver profile extract-transcript`)

Component: M7 — turn the recorded in-person session (the richest intake source) into profile field candidates with quoted evidence, merged through the same path every other source uses. Built early (parallel with tier-2) because it has no dependency on tier-2 components.
Built: parallel session D alongside tier-2 A/B/C, fresh Claude Code session.
Source of truth: `01-prd.md` §4.3; `@upriver/schemas` (merge, MUST_ASK, section schemas). Where this spec is more specific, it wins.

## File ownership (parallel-build boundary)

This session OWNS: `packages/cli/src/commands/profile/extract-transcript.ts`, `packages/cli/src/transcript/` (new dir, everything under it). It must NOT touch: `commands/profile/{show,set,verify,conflicts,pull,push,migrate-intake}.ts` (sessions A and C own those — disjoint filenames under the same directory, do not create a barrel/index there), `packages/cli/src/profile/` (session A's), `packages/cli/src/recon/` (session B's), `util/intake-reader.ts` and the dashboard (session C's), `packages/schemas` (read-only), `generate/*` (read-only — import `profile-io`, `data-source`, and reuse `claudeCliCall` patterns).

## 1. Purpose and mechanics

`upriver profile extract-transcript <slug> <file> [--dry-run] [--chunk-size <chars>]`:

1. **Ingest.** Read the transcript file (operator-local path, plain `fs` fine for input). Accept `.txt`, `.md`, `.vtt`, `.srt` — for VTT/SRT, strip cue numbers/timestamps into plain dialogue with speaker labels preserved when present. Reject empty/binary input with a clear error.
2. **Chunk.** Split into overlapping chunks (~12k chars, 500 overlap, configurable) on paragraph boundaries so a fact spanning a boundary isn't lost. Each chunk keeps an index for evidence references.
3. **Extract per chunk.** One `claudeCliCall` per chunk: read-only (`permissionMode: 'plan'`, no write tools), `--json-schema` enforcing the candidate envelope:
   ```ts
   { candidates: Array<{ path: string; value: unknown; quote: string; speaker?: string; confidence: 'high'|'medium'|'low' }> }
   ```
   System prompt: the profile's section catalog (paths + one-line descriptions generated from the schema — build a compact catalog renderer in `transcript/catalog.ts`, NOT the full zod source), the MUST_ASK list flagged as priority targets, and extraction rules: only claims the transcript actually supports; `quote` must be a verbatim excerpt; prefer the interview-or-session fields (`MUST_ASK` with `askVia: 'session'`); never fabricate paths — unknown topics go to a `unmapped` list (returned separately and reported, not merged). The cache layer applies (chunk hash in the key), so re-runs are free.
4. **Validate + dedupe.** Each candidate's `path` must resolve against `clientProfileZ` (reuse/replicate the AST walk; if session A's `profile/paths.ts` exists when you start, import it — if not, implement locally in `transcript/paths.ts` and note the consolidation follow-up). Each `value` must parse against the leaf's inner schema. Same-path candidates across chunks: keep the highest confidence, longest quote on tie.
5. **Merge.** Candidates become `Candidate` objects with `source: 'transcript'`, `evidence: quote (+ speaker)`, merged via `mergeCandidate` through `profile-io`. Transcript precedence beats interview/recon, loses to operator; conflicts queue to `profile-conflicts.json` as usual. Never writes `verified: true` (HV fields gain values but stay locked until `profile verify`).
6. **Report.** Per section: applied / conflicted / skipped-lower-precedence counts; the unmapped list (topics the model found no path for — these are schema-gap signals, print prominently); coverage delta (`deliverableReadiness` before/after over the engagement scope); MUST_ASK fields still empty after the run.
7. **Provenance artifact.** Write `clients/<slug>/transcripts/<basename>-extraction.json` via the data source: the full candidate list (applied or not) with quotes, for later audit. The raw transcript itself is NOT copied into the client dir by default (it may contain off-record content); `--keep-transcript` opts in.

`--dry-run`: extract + validate + report, no merge, no profile write (extraction LLM calls still run and cache).

## 2. Layout

```
packages/cli/src/
├── commands/profile/extract-transcript.ts    thin oclif
└── transcript/
    ├── ingest.ts        file reading, VTT/SRT stripping, chunking
    ├── catalog.ts       schema → compact path catalog for the system prompt
    ├── extract.ts       per-chunk claudeCliCall + json-schema, candidate parsing
    ├── reconcile.ts     cross-chunk dedupe, path/value validation, unmapped collection
    ├── apply.ts         candidates → mergeCandidate loop → profile-io write + provenance artifact
    └── report.ts        rendering
```

Tests beside each module; `claudeCliCall` mocked; recorded fixture transcript (synthetic preschool-owner session, ~3 chunks worth) in `transcript/fixtures/`. ~300-line cap per file.

## 3. Definition of Done

- [ ] Root `pnpm build` clean; cli tests green (existing + new)
- [ ] Unit tests: ingest (vtt/srt stripping, chunk overlap correctness, boundary-spanning fact present in two chunks); catalog (every MUST_ASK path appears; output well under 8k chars); reconcile (cross-chunk dedupe rules, invalid path dropped + reported, invalid value dropped + reported, unmapped collected); apply (transcript precedence vs operator/interview/recon, conflict queue, never-verified, provenance artifact written); report math
- [ ] `--dry-run` writes nothing to the profile or client dir (asserted)
- [ ] Live acceptance: run against the synthetic fixture transcript for littlefriends; commit the provenance artifact + report transcript in the changelog; show at least one HV field (e.g., a capacity number) gaining a value while remaining unverified, and at least one conflict with the existing operator-sourced fixture data queuing rather than overwriting
- [ ] If Joshua supplies the real Little Friends session transcript before the build finishes, run it as a second acceptance pass (markers from doc-01 should visibly collapse on a re-import + regenerate dry-run); otherwise note as the first post-merge action
- [ ] Ownership boundary respected (`git diff --name-only` ⊆ owned set + planning docs)
- [ ] Changelog: deviations, acceptance transcript, follow-ups (paths.ts consolidation with session A, real-transcript run if pending)

## Changelog

- 2026-06-04: spec written; runs as parallel session D alongside tier-2 (no tier-2 dependency).
