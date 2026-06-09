# E2E run prompt — synthetic full-system, LIVE Firecrawl recon (v2 run)

Paste into a fresh Claude Code session at the root of `upriver-clone`, in a CLEAN working copy no other session is using (one repo per session — last run had stray commits from a concurrent session).

## Preconditions — verify ALL, STOP and report if any fail

1. On `main`, pulled. `packages/cli/src/generate/upstream-digest.ts` exists (spec 11 F1 merged) and the doc catalog shows **18 docs** (scope fix merged).
2. `pnpm install && pnpm build` clean.
3. `claude` CLI on PATH and authenticated.
4. **`FIRECRAWL_API_KEY` is set.** This is the point of this run (F5). If unset, STOP — do not fall back to the synthetic-skip path. Never touch `ANTHROPIC_API_KEY`; the operator manages keys.

## What this run proves

Second full-system run, first with live recon. Bar: **18/18 docs + 9/9 provisioning**, prompt-overflow fix (F1) holding, recon filling real-world fields so the marker count is finally representative. De-risk already done via Firecrawl MCP (2026-06-09): the real site (`littlefriendslearningloft.com`, Square Online) yields 14/16 website-adapter paths; the GBP Maps search resolves directly to the listing (address, phone, hours, category, 5.0 rating); `branding` format returns a palette. Expect ~2 Firecrawl credits.

## Launch

```
UPRIVER_GATE_AUTO=1 nohup bash scripts/e2e-littlefriends.sh > /tmp/e2e-live-launch.log 2>&1 &
```

Poll `tail -25 clients/littlefriends/e2e/run.log` lazily.

## Phase-specific handling

- **recon:** must run LIVE (log shows the website + gbp scrapes, not "SKIP: FIRECRAWL_API_KEY not set"). The script treats recon failure as WARN-and-continue; for THIS run a failed or skipped recon defeats the purpose — if recon errors, STOP and report rather than continuing to extract.
- **conflicts:** expect MANY more conflicts than last run — recon now fills the profile before corpus extraction, so every overlapping field conflicts and the keep-candidate loop resolves them (corpus beats recon, by design). Note the resolved count in the report.
- **readiness (exit 3):** expected — gap-fill values were wiped by reset. Gap-fill per the established procedure: real values transcribed from the corpus where it has them, obviously-synthetic placeholders only for the deliberately-unknown five. Then resume with `UPRIVER_GATE_AUTO=1 bash scripts/e2e-littlefriends.sh docs` (F3 no-cache applies automatically on resume).
- **exit 4 (F2 prompt-size FAIL):** an F1 regression. STOP and report the table — do not gap-fill around it, do not proceed into docs.

## Post-run integrity checks (mechanical — do NOT read doc bodies)

The synthetic corpus diverges from the real business on four facts. Recon proposes the real-world value; the corpus value MUST win. After the run, grep `clients/littlefriends/profile.json` and confirm:

| Field | Must be (corpus) | Recon proposed (must NOT survive) |
|---|---|---|
| Instagram handle | `@littlefriendsloft` | `@littlefriendslearningloft` |
| identity.hours | 8:00–5:30 (+ early drop-off/aftercare) | GBP "Tue 9 AM–5 PM" |
| Pedagogy/positioning | play-based, "warm small one" | Montessori (site + GBP both say it) |
| Tuition posture | $1,180/mo, never published | — (recon's published camp pricing in `pricing.shareable` MAY legitimately survive; record what happened) |

Any recon value surviving in the first three rows is an integrity FAILURE — report it prominently.

Where the corpus is silent, recon survival is CORRECT (not a leak): street address (290 North St — the real Newburgh JCC), phone, email (`visitnewburghjcc@gmail.com` — coherent, the JCC is the parent org in both fiction and reality), the Renata Kero testimonial, brand palette. Additionally: website and GBP propose DIFFERENT phones ((845) 561-6602 vs (732) 343-0005) — a recon-vs-recon conflict with no corpus tiebreaker. Record which number landed in the profile and its provenance trail; this feeds a pending spec question on recon-internal conflict policy.

And re-verify the deliberately-unknown five were never invented (same procedure as the first run).

## Success criteria

- 18/18 docs generated + approved, or the specific doc named with its exact failure (prompt-size = F1 regression — report, don't work around).
- 9/9 provisioning artifacts.
- F2 dry-run table all OK (include it in the report as proof the overflow is gone).
- Integrity table above: corpus won rows 1–3; deliberately-unknown five intact.
- doc-09 generates cleanly (F3+F4 should have fixed the cache-replay/absolute-path double failure).
- doc-01 marker count reported against the prior run's 27 — with live recon it should drop materially.

## Report

Write `.planning/intake-profile-engine/12-e2e-live-report.md`, same mechanical structure as `07-e2e-run-report.md` (from artifacts and logs — never read doc bodies; quality judgment is deferred to the Cowork evaluation). Lead with the completion count. Include: F2 size table, per-doc/per-artifact word+marker table, conflict-resolution count, the four-field integrity table with actual outcomes, phone/email provenance, recon credit usage, deliberately-unknown-five verification, doc-01 marker delta.

Commit to branch `e2e/littlefriends-synthetic-v2`, push, open a PR. Do NOT merge — Cowork evaluates first. Then stop.
