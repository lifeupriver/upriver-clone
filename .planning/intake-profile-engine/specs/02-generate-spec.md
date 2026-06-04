# Build Spec 02: `upriver generate` + minimal `profile import`

Component: the generation engine (M1 scope: sequential, one doc per headless session, Continue gate) plus the thin `profile import` command M1 needs to load the hand-filled Little Friends profile. Together they make M1 end-to-end runnable: import a profile, generate doc-01 against its spec, review at the gate.
Consumed by: the operator (CLI). Later specs extend it (M2 `--all`, M5 provisioning, M8 worktrees/worker).
Built: second, in a fresh Claude Code session, after `@upriver/schemas` (built, commit `8264219`).
Source of truth: `01-prd.md` §5 (engine mechanics), §7 (architecture), §8 (M1/M2 scope); `specs/01-schemas-spec.md` §2 (canonical-Supabase, confirmed). Where this spec is more specific, it wins.

---

## 1. Purpose and boundaries

**Purpose.** `upriver generate <slug> --doc <id>` reads `clients/<slug>/profile.json`, gates on coverage and HV verification via `@upriver/schemas`, runs one write-capable headless Claude Code session against the deliverable's spec in `specs-reference/`, writes the doc to `clients/<slug>/docs/`, scans for `[NEEDS CONFIRMATION]` markers, and pauses at the Continue gate. `upriver profile import <slug> <file>` validates a hand-filled JSON against `clientProfileZ` and persists it through `ClientDataSource`.

**In scope (M1):**
- `profile import` (minimal: validate, merge-or-create, persist)
- `generate` for a single doc (`--doc doc-01` … `doc-12`), sequential only
- Coverage gating, HV gating, generation, marker scan, run report, Continue gate
- A `--dry-run` that reports readiness and the assembled prompts without calling `claude`
- Tracking which docs are generated (`clients/<slug>/docs/manifest.json`)

**Out of scope (explicitly NOT this build):**
- `--all` / DAG-batch mode (M2) — but `generationOrder` is already imported and used to validate `--doc` upstream deps, so M2 is an extension, not a rewrite
- Provisioning deliverables i01–i09 (M5); docs 13–18 (operational, generated rarely — M2 decides)
- `profile show/set/verify/extract-transcript` (Build Spec 03); `recon` (04); worktrees/worker enqueue (M8)
- Any dashboard surface

**Hard constraints:** no monolithic files (~300-line cap, split by concern); no new deps beyond what `packages/cli` already has; all profile/doc I/O through `ClientDataSource` (canonical-Supabase decision) — never raw `fs` for client artifacts; `claude-cli.ts` is reused, not modified, except as §4 specifies.

## 2. Files and layout

```
packages/cli/src/
├── commands/
│   ├── generate.ts              oclif command: args/flags, orchestration, gate loop
│   └── profile/
│       └── import.ts            oclif topic command: upriver profile import <slug> <file>
├── generate/
│   ├── data-source.ts           resolveClientDataSource() for the CLI (mirrors dashboard's
│   │                            packages/dashboard/src/lib/data-source.ts; UPRIVER_DATA_SOURCE
│   │                            env, 'local' | 'supabase', default 'local' for now — flipping
│   │                            the documented default to supabase happens in Build Spec 03
│   │                            with profile pull/push; the seam exists from day one)
│   ├── profile-io.ts            readProfile(slug) / writeProfile(slug, profile) through the
│   │                            data source; bumps _meta.revision on write; reads/writes
│   │                            profile-conflicts.json
│   ├── spec-loader.ts           loads a deliverable's spec md from specs-reference/ via
│   │                            COVERAGE_MAP[id].specPath; loads brand-voice rules
│   ├── prompt-builder.ts        system prompt (spec + voice rules + marker instruction) and
│   │                            user prompt (profile slice + upstream doc contents)
│   ├── profile-slice.ts         extracts only requiresFields paths from the profile into the
│   │                            prompt payload (value + evidence; envelope metadata stripped)
│   ├── runner.ts                one doc = one claudeCliCall with write tools; output capture
│   ├── markers.ts               scan output for [NEEDS CONFIRMATION: ...]; aggregate
│   ├── manifest.ts              docs/manifest.json read/write {id, path, generatedAt,
│   │                            specHash, profileSliceHash, markers: n, approved: bool}
│   └── report.ts                run report rendering for the gate (readiness, markers, paths)
└── (tests beside each module, node --test, mirroring existing cli test style)
```

`generate.ts` and `import.ts` stay thin: parse, delegate to `generate/` modules, render. Logic lives in the modules so M2's `--all` and the worker can reuse them without oclif.

## 3. `profile import <slug> <file>` (minimal)

1. Read the JSON file (operator-local path — plain `fs` is fine for the INPUT file; it is not a client artifact).
2. `clientProfileZ.parse()` — on failure, print zod issues grouped by section and exit non-zero. `_meta.slug` must equal the arg slug.
3. If no existing profile: write as-is (revision 1 if absent).
4. If a profile exists: per-field `mergeCandidate` walk. Imported leaves carry their own envelopes (the hand-fill is authored with `source: 'operator'` envelopes); fields whose envelope lacks a source default to `operator`. Conflicts (per merge rules — e.g., trying to lower a verified field) append to `profile-conflicts.json` and are reported, never applied. `--replace` flag skips the merge and overwrites wholesale (still revision-bumped), for fixture-style reseeding.
5. Print a summary: fields applied / conflicted / unchanged, new revision, and a one-line coverage teaser (`doc-01 ready; doc-02 blocked: 4 unverified HV fields`) using `deliverableReadiness`.

Flags: `--replace`, `--dry-run` (validate + report, no write).

## 4. `generate <slug> --doc <id>` mechanics

Per PRD §5, made exact:

**Gate 0 — load and validate.** `readProfile(slug)`; `clientProfileZ.parse`. Read `docs/manifest.json` for the generated set.

**Gate 1 — readiness.** `deliverableReadiness(profile, id, generatedIds)`. If not ready: print `missingFields`, `unverifiedHv`, `missingDocs` exactly, exit non-zero. `--dry-run` stops here with the full report plus assembled prompt sizes. No `--force` past HV — the only path through an HV block is `profile verify` (Build Spec 03); until that exists, the fixture's HV fields are verified by hand-editing the profile JSON and re-importing with `--replace` (documented in the run report's hint line).

**Prompt assembly.**
- System prompt: the deliverable's spec markdown (via `spec-loader`), the brand voice rules (Upriver house rules constant for now; the client's own doc-01 once generated is consumed as an upstream doc, not as system prompt), and the marker instruction: *"Where the profile is ambiguous, thin, or silent on something the spec requires, write `[NEEDS CONFIRMATION: <specific question>]` inline rather than inventing facts."* Plus the output contract: write exactly one file at the path given, markdown, follow the spec's file-naming and section template.
- User prompt: the profile slice (`profile-slice.ts` — only `requiresFields` paths, rendered as readable labeled values with evidence strings; envelope metadata like confidence/updatedAt stripped to keep tokens down), plus the full text of each `requiresDocs` upstream doc already generated.

**Session.** One `claudeCliCall` per doc with `permissionMode: 'acceptEdits'`, `allowedTools: ['Read', 'Write', 'Edit', 'Glob', 'Grep']`, `model` flag (default `sonnet`, `--model` to override). Working directory: a temp staging dir containing nothing but the target path — the session writes `clients/<slug>/docs/<id>-<slug-name>.md` content there; the CLI then persists it through `ClientDataSource` (the session never touches Supabase). The existing cache layer applies — `cacheKey` includes `specHash + profileSliceHash` so an unchanged slice + spec is a cache hit and re-runs are free. If the envelope errors or the expected file is absent/empty after the session: fail this doc, report, exit non-zero (operator retries; nothing is written to the manifest).

**Post.** `markers.ts` scans the produced doc; `manifest.ts` records the entry with `approved: false`; `report.ts` prints: doc path, word count, marker list (numbered, with the questions), readiness it unblocks downstream (`doc-04, doc-05 now unblocked` via `deliverableReadiness` over the map), and the gate prompt.

**Continue gate.** Interactive confirm (`Approve doc-01? [y/N]`): `y` sets `approved: true` in the manifest (approval is what makes it count as "generated" for downstream `requiresDocs`); `N` leaves it unapproved and exits 0 with the path so the operator can read/edit and re-run. `--yes` auto-approves only when the manifest already has a prior approved entry for this id (re-runs of already-approved docs, per PRD §5.5). Non-TTY without `--yes`: print report, exit without approving.

## 5. What `generate` reuses vs adds

| Reused unchanged | Added |
|---|---|
| `claude-cli.ts` (`claudeCliCall`, cache, usage logging) | write-mode invocation options (first caller of `acceptEdits` + Write tools) |
| `@upriver/schemas` (parse, readiness, order, HV, merge) | `generate/` modules above |
| `SupabaseClientDataSource` / `LocalFsClientDataSource` from `@upriver/core/data` | CLI-side resolver (`generate/data-source.ts`) |
| `BaseCommand` conventions (args/flags/examples style, `skipIfExists`) | `profile` oclif topic (first subcommand directory under `commands/profile/`) |

One permitted modification to `claude-cli.ts`: if write-tool sessions need a `cwd` option to point at the staging dir, add an optional `cwd?: string` to `ClaudeCliCallOptions` threaded to `spawn` — additive, no behavior change for existing callers. Record in the changelog if taken.

## 6. The M1 worked example (acceptance scenario)

The build finishes by actually running, against the real `clients/littlefriends/` (create the dir; the schemas fixture is the seed):

1. `upriver profile import littlefriends packages/schemas/src/fixtures/littlefriends.profile.json` → validates, writes, coverage teaser prints.
2. Hand-verify the fixture's doc-01-required HV fields if any are unverified (per the fixture, doc-01 should be ready as-is; doc-02 blocked — that asymmetry is the demo).
3. `upriver generate littlefriends --doc doc-01 --dry-run` → readiness report + prompt sizes.
4. `upriver generate littlefriends --doc doc-01` → doc generated, markers listed, gate shown.
5. `upriver generate littlefriends --doc doc-02` → exits non-zero, names the unverified HV pricing fields. This failure is a REQUIRED part of the acceptance: the HV gate must demonstrably block.

Step 4's actual output quality is reviewed by Joshua at the gate, not by the build session; the build session's responsibility ends at "the pipeline ran and produced a doc following the spec's template with markers where the profile is thin."

## 7. Definition of Done

- [ ] `pnpm build` and `pnpm --filter @upriver/cli test` clean at root; no new deps in `packages/cli/package.json`
- [ ] Unit tests: prompt-builder (slice rendering, upstream-doc inclusion), profile-slice (wildcard paths resolve, envelope stripped), markers (multi-marker, multiline), manifest (round-trip, approval), profile-io (revision bump, conflict append), import merge (applied/conflict/replace paths) — all pure-logic tests, `claudeCliCall` mocked
- [ ] Gating tests: unready doc exits non-zero naming the blockers; unverified HV blocks with the exact paths; `--yes` refuses on a never-approved doc
- [ ] `--dry-run` produces the full report with zero `claude` invocations (asserted via mock)
- [ ] The §6 worked example executed end-to-end (steps 1–5), output committed under `clients/littlefriends/` (profile.json, docs/, manifest.json) — including the step-5 expected failure captured in the report
- [ ] All client-artifact I/O goes through `ClientDataSource` (grep check: no `writeFileSync` targeting `clients/` outside the data-source implementations)
- [ ] No file > ~300 lines; `generate.ts` and `import.ts` thin
- [ ] `.planning/intake-profile-engine/` updated: this spec marked built, deviations changelogged, follow-ups for Build Spec 03 noted

## Changelog

- 2026-06-04: spec written. Scope decision (Joshua): includes minimal `profile import` so M1 is end-to-end runnable; full profile commands remain Build Spec 03. CLI data-source default stays `local` in this build; the canonical-Supabase default flip ships with Build Spec 03's pull/push.
