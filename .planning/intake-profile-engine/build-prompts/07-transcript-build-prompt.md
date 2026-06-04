# Build prompt 07 — Session D: transcript extractor (parallel with tier-2 A/B/C)

Paste into a fresh Claude Code session at the root of `upriver-clone` (pull main first). Self-contained; the named files hold the detail. Sessions A/B/C are building other components in parallel — your file-ownership boundary is what keeps that safe.

---

You are building one component: `upriver profile extract-transcript`, which turns a recorded client session transcript into profile field candidates with quoted evidence. You build only this, then stop.

## Read first, in this order

1. `.planning/intake-profile-engine/specs/07-transcript-extractor-spec.md` — your spec and HARD file-ownership boundary. You own `commands/profile/extract-transcript.ts` and a new `packages/cli/src/transcript/` only. Other parallel sessions own the rest of `commands/profile/`, `src/profile/`, `src/recon/`, intake-reader, and the dashboard — touch none of it, create no barrel/index files in shared directories.
2. `01-prd.md` §4.3 — what this source is for (the recorded session is the richest source and the spine).
3. `packages/schemas/src/merge.ts`, `coverage-map.ts` (`MUST_ASK`), `coverage.ts`, and two or three section files — the contract: transcript precedence beats interview/recon and loses to operator; conflicts queue; never `verified: true`.
4. `packages/cli/src/generate/profile-io.ts` + `data-source.ts` — your import-only write path.
5. `packages/cli/src/util/claude-cli.ts` — read-only `--json-schema` extraction calls (no write tools, `permissionMode: 'plan'`); the cache layer gives you free re-runs.
6. `packages/cli/src/generate/profile-slice.ts` and its test — prior art for walking schema paths.

## What you are building

Per spec §1–§2 exactly: ingest (.txt/.md/.vtt/.srt, cue-stripping, overlapping ~12k-char chunks on paragraph boundaries), a compact schema path catalog for the system prompt (NOT the raw zod source; well under 8k chars; MUST_ASK paths flagged as priority), per-chunk `--json-schema` extraction into `{path, value, quote, speaker?, confidence}` candidates, cross-chunk dedupe + path/value validation with an `unmapped` list for topics that fit no path, merge with `source: 'transcript'` and the verbatim quote as evidence, a provenance artifact at `clients/<slug>/transcripts/<basename>-extraction.json`, and a report (per-section counts, unmapped list prominent, coverage delta, MUST_ASK still empty). Raw transcripts are NOT copied into the client dir unless `--keep-transcript`.

Hard rules: never write `verified: true` from any path in this component (test it); quotes must be verbatim excerpts; invalid paths/values are dropped AND reported, never silently; `--dry-run` writes nothing (asserted); ~300-line cap; no new deps. If session A's `profile/paths.ts` exists on main when you start, import it for path validation; otherwise implement locally in `transcript/paths.ts` and changelog the consolidation follow-up.

## How you work

Phased, compile-verify after each file: ingest + tests (incl. a boundary-spanning fact appearing in two chunks) → catalog + tests → extract (mocked) + reconcile + tests → apply + provenance + tests → report → thin command → live acceptance. Author a synthetic preschool-owner session transcript (~3 chunks worth, with speaker labels, containing: facts that map cleanly, one fact contradicting the littlefriends fixture's operator data, one HV capacity number, and one topic with no schema home) as `transcript/fixtures/` — the acceptance run uses it against `clients/littlefriends/` and must show: the HV field gaining a value while staying unverified, the contradiction queuing as a conflict rather than overwriting, and the unmapped topic reported. Commit the provenance artifact and the report transcript into the spec changelog.

## Definition of Done

Spec §3, verbatim, all green. Branch: `build/07-transcript-extractor`. Run `git diff --name-only` before finishing and confirm every changed file is inside your owned set plus your spec's changelog. Then stop and report: file list, test summary, acceptance transcript, deviations, follow-ups. Do not build any other profile subcommand, recon adapter, or dashboard surface.
