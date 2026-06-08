# E2E re-run prompt — synthetic full-system, post-hardening

Paste into a fresh Claude Code session at the root of `upriver-clone`, in a CLEAN working copy no other session is using (the last run had stray commits from a concurrent session sharing the working copy — one repo per session this time). PRECONDITION: the generation-hardening PR (spec 11) is merged to main. `git pull`; confirm `packages/cli/src/generate/upstream-digest.ts` exists and `pnpm build` is clean. If not, STOP and report.

This is the second synthetic full-system run — the one that should COMPLETE 12/12 docs + 9/9 provisioning now that the prompt-overflow flaw is fixed. Same driver, two changes from last time.

## The two changes

1. **Pre-flight overflow check is now meaningful.** The readiness phase runs `generate --all --dry-run`, which now prints a per-doc prompt-size OK/FAIL table (F2). If ANY doc shows FAIL, STOP and report it before the docs phase — that means the digest fix (F1) didn't bring that doc under the ceiling and the spec needs another look. Do not proceed past a FAIL into a 2-hour run.
2. **Recon (F5): your call, stated explicitly in the report.** If `FIRECRAWL_API_KEY` is set, recon runs live and the marker count becomes representative — preferred. If not, recon dry-runs and ~10 fields are synthetic gap-fill, exactly as last run; that's acceptable for proving completion but the report must say the marker count is not representative. Either way, state which path was taken.

## Run it

Same as before: `git rm` is unnecessary — the script's reset phase clears `clients/littlefriends/` (git preserves history). Launch unattended:

```
UPRIVER_GATE_AUTO=1 nohup bash scripts/e2e-littlefriends.sh > /tmp/e2e-rerun-launch.log 2>&1 &
```

Poll `tail -25 clients/littlefriends/e2e/run.log` lazily. Handle the readiness checkpoint (exit 3) with operator gap-fill exactly as the e2e-full-run-prompt describes, then resume `docs` — and note the resume path now sets `UPRIVER_LLM_NO_CACHE=1` automatically (F3), so a retried doc gets a genuine fresh attempt.

## Success criteria (the bar this run must clear)

- **12/12 docs generated + approved**, OR a specific doc named with its exact failure (if it's prompt-size, that's an F1 regression — report, don't gap-fill around it).
- **9/9 provisioning artifacts generated** (they were 0/9 last run purely because docs were missing; with all docs present they should all become eligible).
- The deliberately-unknown five still never invented (re-verify against the corpus, same as last run).
- doc-09 generates cleanly this time (F4 staging enforcement + F3 no-cache retry should fix the absolute-path / cache-replay double failure).

## Report

Write `.planning/intake-profile-engine/12-e2e-rerun-report.md`, same structure as `07-e2e-run-report.md` (mechanical, from artifacts — do not read doc bodies). Lead with the completion count (12/12 + 9/9, or the specific gap). Include the F2 dry-run size table (proof the overflow is gone), per-doc/per-artifact word+marker table, the deliberately-unknown-five re-verification, and the new doc-01 marker count vs the prior run's 27. Commit to branch `e2e/littlefriends-synthetic-v2`, push, open a PR, do NOT merge — Cowork evaluates again.

Then stop. If the run completes 12/12 + 9/9 with integrity intact, that is the green light for a live client.
