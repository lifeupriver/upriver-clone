# Build prompt 02: `upriver generate` + minimal `profile import`

Paste this into a fresh Claude Code session at the root of the `upriver-clone` repo (pull main first; `@upriver/schemas` must be present from commit `8264219`). Self-contained; the named files hold the detail.

---

You are building one component: the `upriver generate` command (M1 scope: one doc per run, sequential, Continue gate) plus a minimal `upriver profile import`. You build only this, then stop.

## Read first, in this order

1. `.planning/intake-profile-engine/specs/02-generate-spec.md` — your spec, the source of truth. File layout, mechanics, gating rules, the worked example, and the Definition of Done are all there.
2. `.planning/intake-profile-engine/01-prd.md` §5 — the engine mechanics this implements.
3. `packages/schemas/src/index.ts` and the modules it exports — your contract. Key imports: `clientProfileZ`, `deliverableReadiness`, `generationOrder`, `assertGeneratable`, `unverifiedHvFields`, `mergeCandidate`, `conflictEntry`, `COVERAGE_MAP`. Read `coverage.ts`, `merge.ts`, `hv.ts` to use them correctly.
4. `packages/cli/src/util/claude-cli.ts` — the headless wrapper you invoke (do not rewrite; one additive change permitted per spec §5).
5. `packages/cli/src/base-command.ts` and `packages/cli/src/commands/voice-extract.ts` — the oclif command conventions to match.
6. `packages/dashboard/src/lib/data-source.ts` and `packages/core/src/data/` — the `ClientDataSource` pattern your CLI resolver mirrors.
7. `.planning/intake-profile-engine/specs-reference/ai-operating-system/01-brand-voice-guide-spec.md` — read one deliverable spec end-to-end so the prompt builder's system-prompt assembly is grounded in what these specs look like.

## What you are building

Per spec §2's file layout exactly: `commands/generate.ts`, `commands/profile/import.ts`, and the `generate/` module directory (data-source resolver, profile-io, spec-loader, prompt-builder, profile-slice, runner, markers, manifest, report). Mechanics per spec §3 (import) and §4 (generate): readiness gate → HV gate (no force-through) → prompt assembly (spec + voice rules + marker instruction; profile slice + upstream docs) → one `claudeCliCall` with `acceptEdits` and Write tools into a staging dir → persist via `ClientDataSource` → marker scan → manifest entry → interactive Continue gate (`--yes` only for previously-approved re-runs).

Hard constraints: no new dependencies; ~300-line file cap, thin commands; all client-artifact I/O through `ClientDataSource`; `--dry-run` must make zero `claude` invocations; an unverified HV field must block generation with the exact paths named.

## How you work

Phased, compile-verify after each file:

1. `generate/data-source.ts` + `generate/profile-io.ts` + tests (revision bump, conflict append).
2. `commands/profile/import.ts` + merge-walk tests → at this point run the real import of `packages/schemas/src/fixtures/littlefriends.profile.json` and show the output.
3. `generate/spec-loader.ts`, `profile-slice.ts`, `prompt-builder.ts` + tests.
4. `generate/runner.ts` (mock-tested), `markers.ts`, `manifest.ts`, `report.ts` + tests.
5. `commands/generate.ts` wiring + gating tests + `--dry-run` assertion.
6. The spec §6 worked example, live, steps 1–5 — including step 5's REQUIRED failure (doc-02 blocked by unverified HV pricing). Commit the produced `clients/littlefriends/` artifacts.

After each phase, state what you built and show typecheck/test results. If the spec proves wrong against reality (e.g., `claude-cli.ts` needs more than the permitted `cwd` addition), stop and record the deviation in the spec's changelog before proceeding.

## Definition of Done

Spec §7, verbatim, all boxes green. Then stop and report: file list, test summary, the §6 run transcript (abridged), deviations, and follow-ups you noticed for Build Spec 03 (profile show/set/verify, data-source default flip to supabase, pull/push).

Do not build `--all`, provisioning, recon, the dashboard, or any profile subcommand beyond `import`.

## Context you should know but not act on

- Canonical store is Supabase via `ClientDataSource` (confirmed), but THIS build keeps the CLI default `local`; the flip ships with Build Spec 03's pull/push. Your resolver just has to make the flip a one-line env change.
- Generated docs are drafts for Joshua's review at the gate; quality judgment at the gate is his, not yours. Your marker instruction exists precisely so the model never papers over a thin profile.
- Brand voice for generated client docs comes from the system prompt rules; the Upriver house rules: first-person singular, no em dashes, no marketing clichés, real tool names, sentence case in body.
