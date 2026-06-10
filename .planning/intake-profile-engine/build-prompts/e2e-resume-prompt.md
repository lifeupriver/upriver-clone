# E2E resume — finish the docs the overflow capped (post-hardening, no full restart)

Two prompts. PROMPT A is a free 2-second mechanical check (no token generation) — run it first, even in an already-open session. PROMPT B is the short resume that generates only the missing docs/provisioning — run it in a fresh session only if A passes.

Rationale: the prior run committed docs 01–07, a filled+verified profile, and the manifest. The only unproven thing is whether the F1 hardening lets generation get past doc-08 and finish 08–12 + the 9 provisioning artifacts. Everything upstream already passed clean and the hardening spec touched none of it (changelog confirms zero changes to extract/recon/profile). So resume the missing work; don't restart from reset.

---

## PROMPT A — the 2-second proof (paste anywhere, generates nothing)

Confirm the prompt-overflow fix mechanically without spending tokens. At the root of `upriver-clone`:

`git pull` (confirm `packages/cli/src/generate/upstream-digest.ts` exists; if not, STOP — hardening isn't merged). Then run the readiness dry-run, which now prints the F2 per-doc prompt-size OK/FAIL table against the real committed docs 01–07 as upstream context:

```
UPRIVER_GATE_AUTO=1 bash scripts/e2e-littlefriends.sh readiness
```

Read the size table in `clients/littlefriends/e2e/run.log` (tail it). Report:
- The full per-doc OK/FAIL table (doc-01 … doc-12), with each doc's projected prompt size.
- Whether doc-08 — the one that overflowed last run — and doc-10/11/12 (the deepest in the DAG) show OK.
- If ANY doc shows FAIL: that is an F1 regression. STOP, report which doc and its size vs the ceiling, do not proceed to PROMPT B.
- If the readiness phase exits 3 (field-blocked) rather than reaching the table: the profile lost its gap-fill (the reset phase didn't run, so this shouldn't happen on a resume — but if it does, report it; do NOT re-gap-fill blindly).

That table is the headline result. All-OK means the overflow fix is confirmed against real data and PROMPT B is just confirming the prose actually generates. Stop here and report; do not launch B yourself.

---

## PROMPT B — resume generation (fresh session, ~1 hour, only if A was all-OK)

At the root of `upriver-clone`, in a clean working copy no other session is using. PRECONDITION: PROMPT A's size table was all-OK; docs 01–07 + manifest + filled profile still present in `clients/littlefriends/` (a prior run committed them — do NOT reset, that would throw them away and force the full 2.5h run).

Launch the resume — it skips reset/recon/extract/verify and generates only what's missing (doc-08 … doc-12, then I01–I09). The resume path auto-sets `UPRIVER_LLM_NO_CACHE=1` (F3) so doc-09's prior cache-replay can't recur:

```
UPRIVER_GATE_AUTO=1 nohup bash scripts/e2e-littlefriends.sh docs > /tmp/e2e-resume-launch.log 2>&1 &
```

Poll `tail -25 clients/littlefriends/e2e/run.log` lazily. The docs phase generates doc-08–12; provisioning then generates I01–I09 (they become eligible once their upstream docs exist). Expect ~1 hour — about half the original run, since 01–07 are skipped.

Success criteria:
- doc-08 generates (the overflow doc — its success is the whole point) and doc-09 generates cleanly (no absolute-path / cache-replay failure — F3/F4).
- 12/12 docs present and approved in `docs/manifest.json`; 9/9 provisioning artifacts generated.
- Any doc that still fails on prompt-size = F1 regression; report it, do not gap-fill around it.

Report: write `.planning/intake-profile-engine/12-e2e-rerun-report.md` (mechanical, from artifacts — do not read doc bodies). Lead with the completion count (now 12/12 + 9/9, or the specific gap). Note this was a RESUME (docs 01–07 carried from the prior run, not regenerated), the F2 size table from PROMPT A, the per-doc/per-artifact word+marker table for the newly generated 08–12 + I01–I09, and doc-09's clean generation. Commit to branch `e2e/littlefriends-resume`, push, open a PR, do NOT merge — Cowork evaluates.

If A passed but you'd rather not spend the hour now: the all-OK size table plus the existing `prompt-overflow.test.ts` (which proves doc-08 fits, both ways) is strong enough evidence to start building in parallel. The resume only confirms generation end-to-end; it is not a blocker for writing the next spec.
