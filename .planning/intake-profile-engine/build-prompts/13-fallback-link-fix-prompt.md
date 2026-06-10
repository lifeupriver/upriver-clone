# Build prompt 13 — fix the no-JS fallback link's missing `?t=` (supabase-mode gate)

Paste into a fresh Claude Code session at the root of `upriver-clone`, clean working copy. `git checkout main && git pull` first (PR #43 build/12 may or may not be merged yet — this fix is independent of it and touches a different line, so it applies cleanly either way). PRECONDITION: `pnpm build` clean before you start; if not, STOP and report.

This is a **one-line surgical fix**, not a feature. Do not expand scope.

---

## The bug (confirmed, with line numbers on `main`)

The dashboard gates client-facing `/deliverables/<slug>/*` pages with **two independent mechanisms**, and a working client link must satisfy **both**:

1. **Middleware** (`packages/dashboard/src/middleware.ts`, ~line 103–107): in `supabase` data-source mode, an anonymous (non-operator) request to any `/deliverables/<slug>/*` path is allowed through **only** if the URL carries `?t=<token>` and `validateShareToken(slug, token)` passes. No `?t=` → the request is bounced to `/login` **before the page code runs**.
2. **The page** (`interview.astro` line 52 / `intake-chat.astro` line 12): separately reads `?token=<token>` for `validateInterviewToken`.

The operator-minted portal URL correctly carries **both** (`?t=X&token=X`) — that path is fine. The bug is a single hardcoded link inside the chatbot page:

`packages/dashboard/src/pages/deliverables/[slug]/intake-chat.astro`, **line 58**:

```astro
Prefer a form? The <a href={`/deliverables/${slug}/interview?token=${token}`}>question list</a> still works.
```

This fallback link carries only `?token=`, **not `?t=`**. So a client who is served the chatbot (via a valid both-param link), then clicks "Prefer a form?", gets redirected to the operator login in supabase mode — a dead end for an anonymous client. In `local` mode there's no middleware share-token gate, so it only manifests in the deployed (supabase) configuration — which is exactly go-live.

## The fix

Make the fallback link carry **both** params, same single token value, exactly as the portal flow builds its URLs:

```astro
Prefer a form? The <a href={`/deliverables/${slug}/interview?t=${token}&token=${token}`}>question list</a> still works.
```

That's the whole change — one line. `t` satisfies the middleware share-token gate; `token` satisfies the page's `validateInterviewToken`. Both already validate the same minted value.

## Guardrails

- **Only** that line in **only** `intake-chat.astro`. Do NOT modify the middleware, `share-token.ts`, `validateInterviewToken`, the interview page, or anything in `packages/cli|schemas|core`. If you find yourself wanting to "also fix" the gate logic, STOP — the gates are correct; only this link was malformed.
- Grep the dashboard for any **other** hand-built `/deliverables/.../interview?token=` or `…/intake-chat?token=` links that omit `?t=` (search `interview?token=` and `intake-chat?token=`). If you find more of the same bug, fix them identically (both params). If you find none, note that in the changelog. Do not invent new links.
- If a test asserts the old single-param href, update it to the both-param form (that's a correct test change, not scope creep). If no such test exists, add one short route/render test to `packages/dashboard/test/` asserting the fallback href contains both `t=` and `token=`.

## Definition of Done

- [ ] `intake-chat.astro` fallback link carries `?t=${token}&token=${token}`; grep-proven no other `/deliverables/...?token=`-only client links remain (or noted none found)
- [ ] `pnpm build` clean; dashboard test suite green; a test asserts the fallback href has both params
- [ ] `git diff --name-only` shows only `intake-chat.astro` (+ optionally one test file); no cli/schemas/core/middleware/auth changes
- [ ] Changelog: one line — "fix: no-JS fallback link in intake-chat carries `?t=` so the supabase middleware share-token gate admits anonymous clients on the form fallback (was `?token=`-only, a dead end in deployed mode)."

Branch `fix/intake-chat-fallback-token`. Open a PR; do not merge — I review, then Joshua merges alongside PR #43.
