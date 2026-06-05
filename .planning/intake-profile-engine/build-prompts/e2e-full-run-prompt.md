# End-to-end full-system run: Little Friends synthetic corpus (autonomous driver)

Paste into a fresh Claude Code session at the root of `upriver-clone` (pull main first). This replaces the earlier long-form version of this prompt. The pipeline itself runs as a SHELL SCRIPT (`scripts/e2e-littlefriends.sh`) so 2.5 hours of generation output goes to a log file on disk, not into anyone's context window — yours included. Your role is thin: one small pre-authorized code change, launch the script in the background, check in on the log tail periodically, handle the single judgment checkpoint if it fires, then write the report from the structured artifacts. You should never read a generated doc body or the full log into context.

**Authorizations from Joshua, valid for THIS synthetic run only:** the gate-auto code change below; auto-approval of all Continue gates via that mechanism; blanket HV verification of filled fields; conflict resolution keeping candidate values; operator gap-fill of hard-blocking fields with clearly-synthetic values. On a live client, gates, verification, conflicts, and gap-fill are Joshua's acts.

## Step 0 — One small pre-authorized feature: unattended gate mode

The Continue gate currently has no non-interactive first-approval path (`--yes` honors only previously-approved docs; non-TTY skips). That is correct for live clients and wrong for unattended synthetic runs and the future worker enqueue. Add it:

- In `packages/cli/src/generate/gate.ts`: when env `UPRIVER_GATE_AUTO=1`, the decision for a never-approved doc/tier becomes `auto-approve`. Log loudly at each auto-approval: `[gate] AUTO-APPROVED (UPRIVER_GATE_AUTO) — unattended/synthetic runs only`.
- Unit tests: env set → first-time auto-approve; env unset → existing behavior byte-identical (all current gate tests stay green untouched).
- Note in the spec-02 changelog: gate-auto added for unattended runs (e2e + worker), Joshua-authorized.
- Commit: `gate: UPRIVER_GATE_AUTO unattended approval (synthetic/worker runs)` along with `scripts/e2e-littlefriends.sh`, this prompt file, and `.planning/intake-profile-engine/test-fixtures/little-friends-synthetic-onboarding-corpus.md` if untracked.

Sanity-check the script against the real CLI before launching: flag names (`--all`, `--provisioning`, `--dry-run`, `conflicts --resolve N --keep candidate`, `verify <paths> --evidence`, `show --json`) and the two `node -e` JSON parsers against the actual `show --json` shape (adjust the parsers if the model shape differs — that is expected script hardening, not a feature).

## Step 1 — Launch

```
UPRIVER_GATE_AUTO=1 nohup bash scripts/e2e-littlefriends.sh > /tmp/e2e-launch.log 2>&1 &
```

Then poll lazily — every few minutes at most: `tail -25 clients/littlefriends/e2e/run.log`. Do NOT cat the whole log. Phases: reset → recon → extract → conflicts → verify → readiness → docs (~12 generations, the long part) → provisioning (~9 more) → final. Expect 1.5–2.5 hours total.

## Step 2 — The one judgment checkpoint

If the script exits with code 3 at PHASE readiness, some docs are blocked by missing required fields. The log lists exact paths per doc. For each: if it is one of the corpus's deliberately-unknown five (inquiry volume, conversion rate, training currency, no-photo families, forgotten subscriptions), RECORD it as a coverage-map finding (should that field really hard-block vs marker-flag?) and then fill it with an obviously synthetic value; otherwise fill a corpus-consistent value. Use `profile set ... --evidence "operator gap-fill, synthetic e2e"`, re-run `profile verify` for any HV among them, then resume: `UPRIVER_GATE_AUTO=1 bash scripts/e2e-littlefriends.sh docs` (background again).

If a generation fails mid-run, the script names the resume phase. Resume once; a second failure of the same doc is a finding — record and continue past it with `--docs` excluding it if possible.

## Step 3 — Report (from structured artifacts only)

When the log shows COMPLETE, write `.planning/intake-profile-engine/07-e2e-run-report.md` using ONLY: the log's phase lines (grep for `--- PHASE`, `WARN`, `FATAL`, `CHECKPOINT`, exit codes), `clients/littlefriends/e2e/coverage-pre.json`, `readiness.json`, `coverage-final.json`, `docs/manifest.json`, the conflicts list, and per-doc word/marker counts gathered mechanically (`wc -w`, `grep -c "NEEDS CONFIRMATION"` per file — do not read doc bodies). Include:

1. Per-phase outcome table (durations from log timestamps).
2. The corpus Coverage-note check: per predicted section, filled or not (from coverage JSONs).
3. The deliberately-unknown five: confirm each is empty/flagged/gap-filled-as-finding — never silently invented.
4. Per-doc and per-artifact table: words, markers, generation time.
5. Headline: old doc-01 had 30 markers from the thin fixture (git history) — the new doc-01's marker count.
6. Every WARN/FATAL/retry/checkpoint, verbatim from the log.
7. All `[NEEDS CONFIRMATION]` markers across all docs, grouped by doc (grep -n output) — Cowork evaluates these next.

Commit everything (docs, provisioning artifacts, profile, e2e/ dir, the report) to branch `e2e/littlefriends-synthetic`, push, open a PR, do NOT merge. Stop. Cowork performs the quality evaluation; your job ends at faithful execution and honest reporting.
