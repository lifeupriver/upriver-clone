# Autopilot prompt — burn down the backlog

Paste the block below into a fresh Claude Code session. It picks up the
project state, walks the prioritized backlog, and ships every item that
can be done without operator intervention.

The prompt is purpose-built to run **autonomously in auto mode**. It tells
the session what *not* to attempt (anything needing operator dashboard
clicks, billing, or shared-system writes the user hasn't pre-authorized).

---

## Paste this:

```
You're picking up the upriver-clone monorepo to burn down as much of the
backlog as can be done without operator intervention. Read these in order
before doing anything:

1. `.planning/roadmap/BACKLOG.md` — the prioritized list of pending work
   (35 items across P0/P1/P2/P3/Future). PRIMARY DRIVER FOR THIS SESSION.
2. `.planning/roadmap/HANDOFF.md` — current shipped state, locked
   architecture decisions, what's already done.
3. `docs/USER-GUIDE.md` — operator-facing usage doc; useful context for
   any UI/UX work.

## Verify state in the first 2 minutes

```
git log --oneline origin/main..HEAD | head     # expect 0 (or local-only commits)
git status                                      # clean
pnpm -r run typecheck                           # 0 errors across all packages
curl -sS -o /dev/null -w "%{http_code}\n" https://upriver-platform.vercel.app/clients
                                                # → 302 (redirects to /login — auth gate working)
curl -sS -o /dev/null -w "%{http_code}\n" https://upriver-platform.vercel.app/login
                                                # → 200
```

If any step diverges, stop and surface — something has changed since this
prompt was written. Do NOT proceed with destructive actions on a divergent
tree.

## Mission

Ship every backlog item I list as **AUTOPILOT-OK** below. Do them in the
listed order — earlier items unblock later ones or set up shared utilities.

For each item:
1. Read the relevant files.
2. Make the change as a tight, atomic commit per item.
3. Run `pnpm -r run typecheck` after every change. Tests where applicable
   (`pnpm --filter @upriver/cli run test`).
4. Update `.planning/roadmap/BACKLOG.md` to strike through the completed
   item with the commit SHA. Don't delete entries — keep the audit trail.
5. Move to the next item.

Atomic commits per item, no batching. Use the project convention
`feat|fix|refactor|docs|chore(<workstream>): <one-line summary>` and the
trailing-co-author trailer rejected by the harness — omit it.

## AUTOPILOT-OK items (do these autonomously, in order)

### Quick wins — ~2 hours total

1. **#9 — Update stale audit-command description.** `audit.ts` header says
   "Run all 10 audit passes concurrently"; actual is 12 base + up to 12
   deep. Edit one line. (5 min)

2. **#15 — `/api/health` endpoint.** New `packages/dashboard/src/pages/api/health.ts`
   returning `{ ok: true, dataSource: getDataSource(), version: '0.1.0' }`
   with a 200 / `application/json` response. Add to PUBLIC_PATH_PREFIXES
   in middleware so it's not auth-gated. (15 min)

3. **#25 — Verify `squirrelscan` install path.** `npm view squirrelscan
   versions` (or equivalent). If the package doesn't exist on npm, swap
   the Dockerfile install line to the actual path. If it does exist,
   leave a note in the Dockerfile confirming we verified. (10 min)

4. **#26 — Render pull/push byte counts on PipelineStages.** The Inngest
   `done` payload carries `{ pulled: { files, bytes }, pushed: { files,
   bytes } }`. After the existing stdoutTail/stderrTail rendering, emit
   one log line summarizing both. (20 min)

5. **#3 — Hoist pipeline-stage list out of `run/all.ts`.** `PIPELINE_STAGES`
   already exists in `@upriver/core/pipeline`. Refactor
   `packages/cli/src/commands/run/all.ts` to read from it instead of
   declaring its own list. Verify both `run all` and `PipelineStages.tsx`
   resolve to the same sequence. (30 min)

### Medium — ~3-5 hours

6. **#22 — Simplify `/auth/callback`.** Middleware now exchanges `?code=`
   on any path. The route is redundant. Decide: delete or keep as a
   no-op. Default: delete the route, leave middleware to handle. Update
   `lib/auth.ts` `signInWithOtp` calls if they reference the path
   directly. (30 min)

7. **#4 — Roadmap drift C.6, flag rename or alias.** Decide: keep
   `--mode=base|deep|all` and DELETE the `--audit-mode=sales|operator`
   spec language from `PRODUCT-ROADMAP.md`, OR add `sales|operator`
   aliases that map to `all|base`. Default: keep current names, update
   PRODUCT-ROADMAP.md to match shipped reality. (30 min)

8. **#8 — Consolidate `--deep` vs `--mode=deep|all`.** Two flags
   currently invoke different deep-pass sets. Consolidate to
   `--mode=base|deep|tooling|all`:
   - `base` → 12 base passes (current default)
   - `deep` → base + 3 LLM passes
   - `tooling` → base + 9 tooling passes
   - `all` → base + 3 LLM + 9 tooling
   
   Plumb through `run all` (`--audit-mode`). Document in `audit.ts`
   `--help`. Keep `--deep` boolean as a deprecated alias for one
   release. (1.5 hr)

9. **#14 — Better error pages.** Replace plain-text 400/302 responses
   with branded Astro pages:
   - `/auth/callback?code=<expired>` → "This sign-in link has expired or
     was already used. Request a new one." with a Sign In button.
   - `/deliverables/<slug>?t=<expired>` → "This share link has expired."
     with no operator login link (clients shouldn't see that path).
   - `/clients/<slug>` for unknown slug → branded 404 with "Back to
     Clients" CTA.
   
   Style on-brand using the same tokens as `/login`. Update middleware
   redirect targets. (2 hr)

### Architectural / writing — ~4-6 hours

10. **#21 — Document Resend SMTP setup.** Add a new `docs/OPS.md` (or
    extend `packages/worker/DEPLOY.md`) with the exact Auth → SMTP
    Settings values used in production:
    Host: `smtp.resend.com`, Port: 465, Username: `resend`,
    Password: `RESEND_API_KEY`, Sender: `noreply@upriverhudsonvalley.com`.
    Note that this lifts the 4/hour built-in rate limit. (30 min)

11. **#19 — Sales-team docs.** Three new files in `docs/`:
    - `SALES-PLAYBOOK.md` — how to pitch each deliverable, framing
      narrative for audit → clone → improvement, suggested pricing tiers.
    - `CLIENT-ONBOARDING.md` — what to send a new client (intake link,
      timeline, what to expect), email templates.
    - `EMAIL-TEMPLATES.md` — drafts for: audit-delivery, intake-request,
      clone-review, launch-handoff. Use real client examples from the
      codebase as anchors but generalize.
    
    Don't invent pricing or commitments — note explicit "$TBD" placeholders.
    (1.5–2 hr)

### Pre-cooked migrations — ship the file, do NOT apply

12. **#12 — Token-expiry sweep cron.** Write
    `supabase/migrations/<timestamp>_token_expiry_sweep.sql`:
    ```sql
    -- Daily cleanup of share_tokens past expires_at + 7-day grace.
    create extension if not exists pg_cron;
    select cron.schedule(
      'share_tokens_expiry_sweep',
      '0 4 * * *',
      $$delete from public.share_tokens
        where expires_at is not null
          and expires_at < now() - interval '7 days'$$
    );
    ```
    Commit the file. Do NOT call `apply_migration` — operator runs it
    explicitly. Note in commit message + BACKLOG.md that it's
    committed-but-unapplied. (15 min)

13. **#13 — Audit-log table migration.** Write
    `supabase/migrations/<timestamp>_dashboard_events.sql` adding a
    `dashboard_events(id, actor_user_id, action, slug, payload jsonb,
    created_at)` table with RLS allowing operators SELECT and the
    service role INSERT. Commit but do NOT apply.
    
    Stub the writer helper in `packages/dashboard/src/lib/dashboard-events.ts`
    behind a `DASHBOARD_EVENTS_ENABLED` env flag so the code is
    inert until the migration ships. (45 min)

### Stop after item 13

That's roughly 8–13 hours of work compressed. After completing it, write
a fresh `.planning/roadmap/HANDOFF.md` summarizing what landed and surface
back to me.

## DO NOT TOUCH (operator action required)

These backlog items need operator-side action this session can't take:

- **#1 — Phase 3 provisioning.** Inngest signup, Fly.io, GHCR. The user
  must do this in their dashboards.
- **#2 — `UPRIVER_SUPABASE_SERVICE_KEY` on Vercel.** Verify-only is fine
  via `vercel env ls`; adding requires the actual key the user has.
- **#5 — Drift C.7 schema decision.** Architectural call. Surface a
  recommendation; don't migrate.
- **#6 — Drift D.1 token-adherence.** Same — surface an approach; don't
  build the runtime piece.
- **#7 — Drift E.5 auto-chain.** Blocked on preview-deploy (P2 §17).
- **#10 — `automigrations` workflow.** Needs `SUPABASE_ACCESS_TOKEN`
  + `SUPABASE_DB_PASSWORD` repo secrets the user must set.
- **#11 — Sentry.** Needs Sentry org + DSN.
- **#16 — Back-migrate clients.** Operator decision per slug.
- **#17 — Preview-deploy story.** Architectural choice; surface options.
- **#18 — Multi-operator allowlist.** Schema change + RLS — needs the
  same migration-apply auth as #12/#13. Defer the migration; ship the
  code path stubbed.
- **#20 — Drop dead `UPRIVER_RUN_TOKEN` env vars.** `vercel env rm`,
  the user runs.
- **#23 — GitHub OAuth.** Needs OAuth app + callback URL config.
- **#27 — Recent activity feed.** Depends on Phase 3 being live.
- **#28 — Per-slug operator scoping.** Schema + RLS migration.
- **#29 — Improvement-layer auto-chain.** Blocked on #17.
- **#30 — View Transitions.** Optional polish; skip.
- **Future items §31–§35.** Product direction; not in scope.

## Code-side patterns to follow

- Atomic commits per backlog item. Squash later if needed.
- `pnpm -r run typecheck` must pass before each commit.
- `pnpm --filter @upriver/cli run test` if CLI changes (currently 72/72).
- Subprocess: `execFile` with arg arrays, never shell strings.
- New files: prefer adding to existing modules over creating new ones
  unless scope warrants it.
- Comments: WHY, not WHAT. No comments narrating the diff.
- No emojis in code or docs unless the user explicitly asks.

## Authorization scope

- **Allowed:** any local file edits, `git commit`, `pnpm install`,
  `pnpm test`, reading remote configuration via MCP tools, writing
  migration files (without applying).
- **Pause and ask before:** applying any DB migration, deploying to
  Vercel, pushing to remote, force operations, deleting files marked
  as "operator artifacts" (`clients/<slug>/`, `.env`).
- **Forbidden without explicit re-authorization:** production deploys,
  prod DB writes, force-pushes, `vercel env add` with operator-supplied
  values.

## Stop conditions

Pause and surface to me if any of these hit:

1. A backlog item you started reveals an unstated dependency on something
   marked DO NOT TOUCH.
2. A migration you've drafted would conflict with existing data.
3. typecheck fails after a change and the fix isn't obvious.
4. You're more than 30 commits in and the trail of changes is getting
   hard to summarize.
5. An item's effort estimate is more than 3× off — implies the spec
   missed something, surface for re-scoping.

## Begin

1. Read `.planning/roadmap/BACKLOG.md` and `.planning/roadmap/HANDOFF.md`
   end-to-end.
2. Run the verify-state block above.
3. Start with item #9 (smallest, builds momentum), then move down the
   AUTOPILOT-OK list in order.
4. After every commit, mark the BACKLOG.md item with the commit SHA.
5. After item 13, write a fresh HANDOFF.md and surface.
```

---

## When to refresh this prompt

Update this file whenever:
- The backlog priority list materially shifts (new P0 lands, P1 reshuffles).
- A previously-blocked item becomes autopilot-able (e.g., user provisions
  Phase 3 and #11 / #27 unlock).
- The "DO NOT TOUCH" list shrinks because authorization scope changes.
- The auth/permission posture changes (e.g., user adds a Bash allowlist
  for `vercel deploy`).

The pasteable block lives between the `---` markers above — keep it
self-contained.
