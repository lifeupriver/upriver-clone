# Decisions needed

> **You accepted all my recommendations.** This doc has been collapsed
> to show only the items that genuinely still need your input — values,
> credentials, and copy I can't author for you. Resolved items are
> archived at the bottom.

---

## What's actually left

Everything below needs a real value or credential. I can't act on any
of it autonomously. Six items, grouped by how cheap they are to answer.

### 5-second answers (paste a value)

#### A. `UPRIVER_REPORT_HOST`

`upriver report send` builds share URLs as
`<UPRIVER_REPORT_HOST>/<slug>-<token>`. Default is
`https://reports.upriver.com`.

**Tell me:** the host, or "use the default".

---

#### B. Firecrawl USD/credit rate

`upriver cost <slug>` shows dollar estimates using
`DEFAULT_USD_PER_CREDIT = 0.001`. If your plan rate is different the
displayed cost is proportionally wrong.

**Tell me:** actual USD/credit (last invoice ÷ credits used), or "use
the default".

---

#### C. `UPRIVER_RUN_TOKEN` policy

Dashboard `/api/run/*` is open to any same-origin caller until you set
this env var. Local-only is fine if you never deploy.

**Tell me:** "local-only forever" (we leave it unset by design), or
provide a token value (any random 24+ char string;
`openssl rand -hex 24` is fine).

---

#### D. `ANTHROPIC_API_KEY` deploy plan + model tier

Deep audits in production need this in the deploy env. Default model is
`claude-sonnet-4-6`; override via `UPRIVER_DEEP_MODEL`.

**Tell me:** "set in deploy, use Sonnet 4.6" (most likely), or specify
a different model tier.

---

### 30-second answers (pick a thing)

#### E. SMTP provider for `upriver report send`

Currently logs the email body for manual forwarding. Real delivery
needs a provider.

My recommendation was Resend (clean API, Vercel-native).

**Tell me:** which provider — or "skip, keep manual" — plus an API key
(at whichever env var name fits the provider).

---

#### F. Pricing copy for `next-steps.astro`

Three scope tiers display "Contact us" placeholders to live prospects
right now.

**Tell me:** for each tier, either a price or "contact us":

```
Polish:           $___  — "<one-line description>"
Rebuild:          $___  — "<one-line description>"
Rebuild + content:$___  — "<one-line description>"
```

---

### Credential drops (when you're ready to wire infra)

These three were architecturally decided (see "Resolved"). All they
need to land in code is credentials.

#### G. Vercel project handle/token (preview-deploy infra)

Decided: **one Vercel project, branch-per-client, branch URL = preview**
(item 10). To wire, I need a Vercel project handle and a deploy token.

**Tell me:** Vercel team/project slug + a `VERCEL_TOKEN` value, or
"hold — local-only for now".

---

#### H. Supabase project URL + service-role key

Decided conventions for buckets and storage (item 11):
- One bucket, prefixed (`clients/`, `reports/`)
- Signed-URL TTL: 90 days, refreshable
- Retention: keep client data; rotate report shares every 90 days
- Reports use signed URLs, not public

To wire the F.6 full sync + A.6 report hosting, I need the Supabase
project credentials.

**Tell me:** are the existing `UPRIVER_SUPABASE_URL` /
`UPRIVER_SUPABASE_SERVICE_KEY` env vars the right project? Or new
project URL + service-role key.

---

## Resolved (your "accept all my recommendations" reply)

These are now closed. Code and docs are in sync with the accepted
choice; cross-references in `PRODUCT-ROADMAP.md` and `DRIFT-REPORT.md`
have been updated.

| # | Decision | Resolution |
|---|----------|-----------|
| 1 | C.6 flag name | **Keep `--mode=base|deep|all`.** `sales|operator` framing dropped from the spec. |
| 2 | C.7 estimatedImpact schema | **Keep current `{scorePoints, description}`.** A.4 hero metrics and C.7 finding impact stay as parallel paths by design. |
| 3 | Push the 52-commit branch | **Moot.** `main` is synced after your `ff2fd67` merge. |
| 9 | `Co-Authored-By` trailer | **No-op.** The trailer requirement isn't actually in `/Users/joshua/CLAUDE.md`; it's built into Claude Code's commit-message template, which the harness rejects. Commits continue without it. |
| 10 | Preview-deploy infra (architecture) | **One Vercel project, branch-per-client, branch URL = preview.** Implementation pending Vercel credentials — see item G above. |
| 11 | Supabase storage conventions | **One bucket prefixed; 90-day signed URLs; keep client data + rotate reports; signed not public.** Implementation pending Supabase credentials — see item H above. |
| 12 | Auth provider for dashboard | **Supabase Auth.** Pairs with #11. Implementation pending Supabase credentials. |
| 14 | Two deep-pass flags | **Consolidated.** `--mode=all` now triggers both LLM and tooling tracks. `--deep` stays as legacy alias for tooling-only. Help text + summary JSON updated. Committed. |
| 15 | Roadmap scope for new passes | **New Workstream I added to `PRODUCT-ROADMAP.md`** — covers I.1–I.9 (the 9 merged tooling passes) plus I.10–I.13 follow-on items (run-all integration, AgentRunner consolidation, test coverage, dimension surfacing in reports). |

---

## Out-of-list / no decision needed yet

These I noticed but they're not blocking anything. Mention them when
they become relevant:

- **Test runner for the dashboard package.** No tests today. Two
  shared utilities could use coverage but nothing's broken.
- **Remove the now-unused `PipelineTrack.astro`.** Replaced by
  `PipelineStages.tsx` in F.2; one commit to delete it. Left in for
  easy revert.
- **Relationship between this repo and `marketingskills-main/`.**
  Skills are symlinked in via H.2. If either repo moves, `.gitignore`
  rules need updating.
