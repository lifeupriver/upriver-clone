# Handoff — autopilot backlog burndown (2026-04-29)

This session ran the autopilot prompt against `BACKLOG.md`. 12 commits ahead
of `origin/main`, working tree clean, typecheck green across all packages,
CLI 72/72 tests passing. No destructive operations taken — every migration
is committed-but-unapplied; no Vercel env or production deploys touched.

## What landed

| # | Commit | Backlog item |
| --- | --- | --- |
| 1 | `e6ce0fa` | #9 — corrected stale "10 audit passes" copy in `audit.ts` |
| 2 | `b4302ee` | #15 — `/api/health` endpoint returning `{ ok, dataSource, version }` |
| 3 | `9b6a133` | #25 — verified `squirrelscan@0.0.38` on npm; Dockerfile annotated |
| 4 | `6570aaa` | #26 — render `pulled` / `pushed` file+byte counts on stage done |
| 5 | `c5f88ef` | #22 — retired `/auth/callback`; middleware handles `?code=` on any path |
| 6 | `0d057d3` | #4 — `PRODUCT-ROADMAP.md` C.6 updated to match shipped `--mode` flag |
| 7 | `087f5df` | #8 — consolidated `--deep` boolean into `--mode=base\|deep\|tooling\|all` (deprecated alias kept) |
| 8 | `3c786de` | #14 — branded `/auth/expired`, `/deliverables/expired`, `/clients/<slug>` 404 |
| 9 | `113d29e` | #21 — `docs/OPS.md` operations runbook (incl. Resend SMTP wiring) |
| 10 | `7897d9a` | #19 — `docs/SALES-PLAYBOOK.md` + `CLIENT-ONBOARDING.md` + `EMAIL-TEMPLATES.md` |
| 11 | `6eb4881` | #12 — `share_tokens` daily expiry-sweep migration **(committed, unapplied)** |
| 12 | `b8e87bf` | #13 — `dashboard_events` audit-log table + inert writer **(committed, unapplied)** |

Item #3 (hoist `PIPELINE_STAGES` into `run/all.ts`) was already shipped on
a prior session — `run/all.ts:6` imports + filters from
`PIPELINE_STAGES`. Marked complete in `BACKLOG.md` without a code
change.

## Pending operator action

These need operator-side dashboard or CLI moves before the related code
takes effect.

### Migrations committed, awaiting `pnpm dlx supabase db push --linked`

- `supabase/migrations/20260429000002_token_expiry_sweep.sql` — pg_cron
  daily delete of `share_tokens` past `expires_at + 7 day` grace
  (#12).
- `supabase/migrations/20260429000003_dashboard_events.sql` —
  audit-log table with operator RLS read + service-role insert (#13).
  Once applied, set `DASHBOARD_EVENTS_ENABLED=true` on Vercel to flip
  the writer at `lib/dashboard-events.ts` from no-op to live.

### Untouched DO-NOT-TOUCH items (still tracked in BACKLOG.md)

- #1 — Phase 3 worker provisioning (Inngest / Fly.io / GHCR)
- #2 — verify `UPRIVER_SUPABASE_SERVICE_KEY` on Vercel
- #5 — drift C.7 `estimatedImpact` schema decision
- #6 — drift D.1 token-adherence in clone-fidelity
- #7 — drift E.5 auto re-audit chain (blocked on #17)
- #10 — `automigrations` GitHub Actions workflow (needs repo secrets)
- #11 — Sentry / error tracking (needs DSN)
- #16 — back-migrate existing local clients to bucket
- #17 — preview-deploy story for cloned sites
- #18 — multi-operator allowlist (schema + RLS — defer to post-§13)
- #20 — drop dead `UPRIVER_RUN_TOKEN` env vars (`vercel env rm`)
- #23 — GitHub OAuth provider
- #24 — dashboard `/cost` view
- #27 — recent-activity feed (depends on Phase 3 live)
- #28 — per-slug operator scoping
- #29 — improvement-layer auto-chain (blocked on #17)
- #30 — View Transitions polish
- §31–§35 — future product directions

## Architecture changes worth knowing

- **Middleware now handles `?code=` exchange globally.** The dedicated
  `/auth/callback` route was redundant once middleware caught the param
  on any path; deleting it removed a divergence target. If exchange
  fails the user is sent to `/auth/expired` rather than rendering a
  plain-text 400. Site URL allowlist in Supabase still uses
  `/auth/callback` as the redirect target (configured operator-side),
  but middleware + the routing change together produce the same effect.
- **`audit --mode` is now four-valued.** `base` | `deep` | `tooling` |
  `all`. `--deep` boolean is deprecated and warns when used outside the
  new flow; preserve for one release. `run all --audit-mode` accepts
  the same set.
- **Public path allowlist gained `/deliverables/expired`.** Otherwise
  the share-link-expired page would loop through the operator gate.
- **`dashboard-events` writer is import-safe.** Calling `record(...)`
  before the migration is applied returns `false` — no throw — so
  callsites can be wired now and become live the moment the env flag
  flips.

## Verification (re-run after operator provisioning if anything below diverges)

```bash
git log --oneline origin/main..HEAD                # 12 commits, all listed above
pnpm -r run typecheck                              # 0 errors
pnpm --filter @upriver/cli run test                # 72/72
curl -sS -o /dev/null -w "%{http_code}\n" https://upriver-platform.vercel.app/clients
                                                   # → 302 (auth gate)
curl -sS -o /dev/null -w "%{http_code}\n" https://upriver-platform.vercel.app/login
                                                   # → 200
```

After deploy, also:

```bash
curl -sS https://upriver-platform.vercel.app/api/health
# → { "ok": true, "dataSource": "supabase", "version": "0.1.0" }
```

## Surface back

Backlog moved from 35 items to 23 (12 closed; one of those was already
done). Three of the closed items leave operator follow-up: applying the
two migrations, and (when ready) flipping `DASHBOARD_EVENTS_ENABLED`.
Everything else either ships immediately on `git push` or has no
runtime effect (docs).
