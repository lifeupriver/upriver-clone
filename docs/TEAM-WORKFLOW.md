# Team Workflow — Operating Upriver as a Two-Person Team

How Joshua and Anne-Marie collaborate remotely on Upriver client engagements
using the CLI, the dashboard, the per-client GitHub repos, and the shared
Supabase Storage bucket. This is the operator playbook; pair it with
`README.md` (engineer setup), `docs/USER-GUIDE.md` (end-to-end command
reference), `docs/CLIENT-ONBOARDING.md` (per-client comms), and
`docs/OPS.md` (production surfaces).

---

## 1. Mental model — what is being "shared"

Three different things, each with its own transport:

| What | Where it lives | How we share it |
| --- | --- | --- |
| **The CLI itself** (`@upriver/cli` source + skills + scaffold templates) | `lifeupriver/upriver-clone` repo | `git pull`, `pnpm build` — there is no npm publish step |
| **Per-client work products** (`clients/<slug>/` — audit JSON, scrapes, screenshots, voice guides, schemas, design handoff bundles, etc.) | Supabase Storage bucket `upriver/clients/<slug>/` | `upriver sync push <slug>` / `upriver sync pull <slug>` (already implemented in `packages/cli/src/commands/sync/`) |
| **The rebuilt websites we ship** | `lifeupriver/<slug>-site` repos (one per client) created by `upriver scaffold github` | Standard GitHub: branches, PRs, reviews, Vercel preview deploys |

Hosted surfaces sit on top of all three:

- **Dashboard** — `https://upriver-platform.vercel.app` reads from the
  Supabase bucket; both operators see the same client list and deliverables.
- **Worker** — `https://upriver-worker.fly.dev` runs the Inngest crons
  (`monitor`, `followup`) and the F05 admin webhook handler.
- **Supabase** — Postgres + Auth + Storage, one project (`qavbpfmhgvkhrnbqalrp`).

Internalize this split before anything else. When a question comes up of the
form "how does Anne-Marie get X?" the answer always falls into one of those
three buckets, and the transport above is the answer.

---

## 2. One-time onboarding for Anne-Marie

### 2.1 Accounts and access

Joshua does these once, from his admin sessions:

- **GitHub org `lifeupriver`** — invite as a Member. Add to a new team
  `operators` with **Write** access to `lifeupriver/upriver-clone` and to
  every `lifeupriver/*-site` repo. Configure the org default repo permission
  so any future client repo created by `upriver scaffold github` automatically
  grants the team Write.
- **Vercel Upriver team** — invite as Developer. Grants preview-deploy
  visibility for every per-client site PR plus the platform dashboard.
- **Supabase project `qavbpfmhgvkhrnbqalrp`** — invite as Owner (needed for
  schema migrations) or Developer (read + bucket write only). After her first
  dashboard sign-in (which creates her `auth.users` row), grant operator role:
  ```sql
  update auth.users
    set raw_app_meta_data = jsonb_set(coalesce(raw_app_meta_data, '{}'), '{role}', '"operator"')
    where email = 'anne-marie@upriverhudsonvalley.com';
  ```
  Until that row updates she can sign in but every operator-only path bounces
  to `/login` (per `docs/OPS.md`).
- **Fly.io `upriver-worker`** — invite to the org if she will redeploy the
  worker. Optional for day-one.
- **Resend** — add as collaborator on the verified sender domain
  (`upriverhudsonvalley.com`) so she can read delivery logs when chasing
  email issues.
- **Inngest** — add to the org so she can see job runs and replay failed
  events.
- **Anthropic** — Anne-Marie should sign up for her own **Claude Max**
  subscription. The CLI's LLM-backed features (`voice-extract`,
  `audit-media`, `followup`, `custom-tools`, `admin-process`,
  `clone`, `fixes apply`) shell out to the headless `claude` binary and
  use whichever Max account is logged in on her machine. Don't share API
  keys for these — Max billing is per-seat and the headless flow is what
  the CLI is designed for.
- **Firecrawl** — single shared team key. Usage is metered and we want
  one bill. Store in 1Password.
- **Google Search Console** — share the existing service-account JSON via
  1Password. For each client property, add the service-account email as a
  verified user from the GSC console once.

### 2.2 Shared password manager

Stand up a 1Password vault `Upriver Operators` (or Bitwarden — anything with
shared vault semantics). It is the single source of truth for:

- `FIRECRAWL_API_KEY`
- `ANTHROPIC_API_KEY` (only for the few features that bypass the headless
  `claude` path — see `UPRIVER_USE_API_KEY` in the README)
- `GOOGLE_SERVICE_ACCOUNT_KEY` (the JSON file — store as an attachment)
- `UPRIVER_SUPABASE_URL`, `UPRIVER_SUPABASE_PUBLISHABLE_KEY`,
  `UPRIVER_SUPABASE_SERVICE_KEY`
- `RESEND_API_KEY`
- `INNGEST_EVENT_KEY`, `INNGEST_SIGNING_KEY`
- `UPRIVER_GITHUB_PAT` (for F05 admin worker auth)
- `GITHUB_WEBHOOK_SECRET`
- `ADMIN_OPERATOR_SLACK_WEBHOOK`

Anne-Marie copies values from there into her local `.env`. Never paste them
into Slack, GitHub issues, or PR descriptions.

### 2.3 Local install (Anne-Marie's machine)

```bash
# 1. Prerequisites
brew install node@20 pnpm gh
npm i -g @anthropic-ai/claude-code  # the `claude` binary
gh auth login                       # GitHub CLI auth
claude login                        # logs into her Claude Max account

# 2. Clone + build
git clone git@github.com:lifeupriver/upriver-clone.git
cd upriver-clone
pnpm install
pnpm build

# 3. Link the CLI globally
cd packages/cli && npm link
cd ../..
upriver --help                      # should print the command tree

# 4. Wire env
cp .env.example .env
# paste values from 1Password into .env

# 5. Verify
upriver doctor                      # all checks should be ok / warn,
                                    # never "missing" for FIRECRAWL or
                                    # the Supabase trio
```

`upriver doctor` is the gate. If any required check is missing the local
install isn't ready and we don't move on.

### 2.4 First real exercise

Pair on a throwaway slug end-to-end before touching a paying client:

```bash
upriver init https://example-bakery.com --slug example-bakery --name "Example Bakery"
upriver scrape example-bakery
upriver audit example-bakery
upriver synthesize example-bakery
upriver sync push example-bakery     # she watches it land in the dashboard
upriver sync pull example-bakery     # Joshua pulls it on his machine
```

Goal: she sees the full loop — local run → bucket → dashboard → other
operator's machine. After this she has a mental model for what every
later command is doing under the hood.

---

## 3. Sharing the CLI — keeping both versions in sync

The CLI is not published. Both operators run whatever is at HEAD on their
local checkout of `lifeupriver/upriver-clone`. Rules:

- **Pull before you start.** `git pull origin main && pnpm install && pnpm build`.
  If `pnpm install` is a no-op the build is fast (TypeScript incremental).
- **Branch model:**
  - `main` — protected. Always green CI. Always safe to run against a real
    client. Direct pushes blocked; everything goes through PR.
  - `feat/<topic>`, `fix/<topic>` — feature work. Open a PR, request
    review from the other operator, merge after CI is green.
  - `claude/<topic>-<slug>` — branches Claude Code agents create
    autonomously (like the one this doc is on). Treat them the same as
    `feat/` branches.
- **PR review SLA:** within one business day. We are two people; nothing
  blocks for long. If the reviewer is on a client call, the author can
  self-merge after a smoke test if the change is small (one file, no
  schema/migration, no env changes). Anything bigger waits for review.
- **Notify after merge to `main`.** Drop a one-liner in `#upriver-team`
  Slack: `merged #PR — voice-extract now supports --depth=fast. pull + rebuild.`
  This is the cue for the other operator to refresh their CLI.
- **CI gates** (already wired in `.github/workflows/`):
  - `pnpm typecheck` across the workspace
  - `pnpm build` (catches unbuildable code before it hits `main`)
  - Add `pnpm test` once the test bed grows (currently sparse)
- **Migrations** are special. `supabase/migrations/` changes only ship via
  the `automigrations` workflow (5a8036d). Only one operator applies a
  migration at a time — coordinate in Slack before merging a PR that
  touches that directory.

---

## 4. Sharing client artifacts — `clients/<slug>/`

`clients/` is gitignored deliberately: it contains scraped PII, large
screenshots, and per-engagement state that doesn't belong in the CLI repo.
The **Supabase Storage bucket** is the canonical store, and the CLI already
ships the transport.

### 4.1 The basic dance

```bash
# Pick up someone else's work on a client
upriver sync pull audreys

# Do work locally — run any pipeline command
upriver audit audreys
upriver synthesize audreys

# Hand it back
upriver sync push audreys
```

Both commands take `--dry-run` so you can see what would move before
committing to the network round-trip.

### 4.2 Convention: who owns the slug right now

There is no automatic locking yet. We use a soft convention:

- The first operator to touch a fresh client adds a row to a shared
  Notion/Airtable **"Active Engagements"** board:
  `slug | client name | active operator | phase | last sync | next action`.
- Before starting a session on a client, **check the board, then run
  `upriver sync pull <slug>`**. If you see another operator on the row,
  Slack them: "picking up audreys for an hour to run synthesize, ok?"
- Before walking away, **always run `upriver sync push <slug>`** and update
  the board's `last sync` and `next action` fields. The next operator
  starts from your latest state.

The board is the source of truth for "who is actively driving each
engagement". The bucket is the source of truth for the artifacts.

### 4.3 Conflict avoidance

What can go wrong without a real lock:

- Two operators run `upriver audit <slug>` simultaneously — both produce
  full `audit/` directories; the later push silently overwrites the earlier
  one. **Mitigation:** the active-engagements board + the Slack ping
  before touching a client.
- Operator A runs `upriver fixes apply <slug> --parallel` (which uses git
  worktrees) while Operator B does the same. **Mitigation:** never run
  `fixes apply` from two machines on the same slug; coordinate in Slack.
- Operator A pushes an old version of `audit-package.json` over Operator
  B's newer one. **Mitigation:** always `sync pull` before running any
  command that writes back, even if you "just" did one yesterday.

### 4.4 Backlog item: real lease/lock

The right long-term answer is a `.upriver-lock.json` file in the bucket
holding `{ operator, acquiredAt, expiresAt, command }`, plus
`upriver sync acquire <slug>` / `release <slug>` / `--force` semantics.
Tracked in `.planning/roadmap/BACKLOG.md` (add it). For now the soft
convention is sufficient at two operators.

### 4.5 What to exclude from sync

`upriver sync push` already skips `node_modules` and `.git`. Use
`--exclude` for anything regeneratable from cheaper inputs:

```bash
upriver sync push audreys \
  --exclude repo \
  --exclude screenshots/raw \
  --exclude app-prototype/node_modules
```

`repo/` is the scaffolded Astro site — that lives in its own GitHub repo.
`screenshots/raw/` are intermediate Playwright captures we don't need
in the bucket. `app-prototype/node_modules` is a 200MB Expo install.

---

## 5. Sharing per-client websites — the `<slug>-site` repos

When `upriver scaffold github audreys` runs it creates
`lifeupriver/audreys-site` and pushes the scaffolded Astro project. Because
the org default repo permission grants the `operators` team Write, both
operators automatically have access to every new client repo without any
per-repo invitation step.

### 5.1 Branch model inside a `<slug>-site` repo

- `main` — what's deployed to production via Vercel.
- `clone/page-<slug>` — branches the `upriver clone` agent opens, one per
  cloned page. Reviewer + merge.
- `fix/<finding-id>` — branches `upriver fixes apply` opens, one per
  audit finding. Reviewer + merge.
- `admin/<issue-num>-<slug>` — branches the F05 admin webhook opens for
  natural-language change requests from the client.

Keep the convention. The CLI's agent prompts assume these prefixes when
they generate PRs.

### 5.2 Review responsibilities

- The **operator who ran the command** is the PR author.
- The **other operator** is the reviewer of record. We do this even on
  cosmetic fix PRs because the second pair of eyes catches voice
  drift faster than any QA tool.
- Vercel preview deploys are automatic on every PR. Reviewer pulls the
  preview URL from the GitHub PR check and clicks through before
  approving.
- For `clone/` PRs, the reviewer also runs visual diff:
  ```bash
  upriver clone-fidelity <slug> --pr <pr-number>
  ```
  Approve only if pixel similarity is within the bar in
  `.agents/upriver-skills/clone-visual-fidelity.md`.
- For `fix/` PRs, the reviewer checks the linked finding in
  `clients/<slug>/audit-package.json` and confirms the fix actually
  addresses it (not just compiles).

---

## 6. Division of labor inside one engagement

The pipeline is linear (init → scrape → audit → synthesize → voice → design
brief → interview prep → interview → process-interview → scaffold → clone →
fixes plan → fixes apply → qa → launch). Most steps are short; some are
heavy. Default split:

| Phase | Primary | Secondary | Why |
| --- | --- | --- | --- |
| Sales + close | Whoever owns the relationship | — | Continuity |
| Discovery (`init`, `scrape`, `discover`) | Either | — | Mechanical |
| Audit (`audit`, `audit-media`, `synthesize`) | A | B reviews `summary.md` | Fresh eyes on the diagnosis |
| Voice + brief (`voice-extract`, `design-brief`, `interview-prep`) | A | B sanity-checks the brief | Brief is the spec |
| Client interview | Whoever has the relationship | Optional second seat for notes | Trust + presence |
| `process-interview` | Whoever ran the interview | — | They heard the inflection |
| Scaffold (`scaffold`, `scaffold github/supabase/deploy`) | A | — | One-shot, low risk |
| Clone (`clone`) | A drives, reviews own PRs first | B does final review on each clone PR | Reviewer enforces fidelity bar |
| Fixes plan | A drafts; **client signs** before continuing | B reviews scope before client sees it | Don't ship a plan with errors |
| Fixes apply | A runs `--parallel`; reviews + merges | B reviews subset of high-impact fix PRs | Volume = need help |
| QA (`qa`) | **B runs it.** Whoever didn't drive clone+fixes does QA. | A on standby | Independence on the gate |
| Launch checklist | Whoever has the relationship | The other proxies if needed | Trust |

Two principles behind the table:

1. **The reviewer is never the same person as the runner on quality
   gates** — synthesize, fixes plan, QA, launch. This is the entire reason
   we have two operators.
2. **The relationship-holder closes the loop with the client.** Internal
   work can flop between operators; client-facing comms stay consistent.

---

## 7. Reports, deliverables, and "acting on findings"

The reports the CLI produces (`audit-package.json`, `qa-report.md`,
`fixes-plan.md`, monitoring deltas, blog topic backlog, etc.) are how we
talk to each other about a client almost as much as how we talk to the
client.

### 7.1 Where reports surface

- **Dashboard** (`upriver-platform.vercel.app/clients/<slug>`) — the
  human-readable rollup. This is where Anne-Marie reviews Joshua's work,
  and vice versa. It reads from the bucket, so anything `sync push` puts
  there appears within seconds.
- **Per-client share link** (`/deliverables/<slug>?t=<token>`) — the
  client-facing version. Mint via the dashboard's share UI; defaults to
  90-day expiry. **Never** send clients a raw GitHub link to a `.md` file.
- **GitHub issues on `lifeupriver/upriver-clone`** — for cross-client
  feedback that affects the methodology (e.g. "the SEO pass is missing X
  for restaurants"). Tag with `methodology` + the relevant skill.
- **GitHub issues on `lifeupriver/<slug>-site`** — for client-specific
  rebuild work that needs another operator's input.

### 7.2 Reviewing a finding without acting yet

When Anne-Marie wants to flag a finding to Joshua before fixing, the
flow is:

```bash
upriver sync pull audreys
# open the dashboard at /clients/audreys/audit
# or open clients/audreys/audit/sales-narrative.md locally
# leave a note as a GitHub issue on lifeupriver/upriver-clone:
#   title: "audreys: rethink fix #SEO-014 (homepage h1)"
#   body: link to the finding line + her concern + a recommendation
```

We don't comment in the JSON files themselves — those are regenerated.
GitHub issues with the `client:audreys` label are the conversation
surface.

### 7.3 Acting on a finding

The CLI is the actuator. Once a finding has been reviewed:

```bash
upriver fixes plan audreys             # scope the fix into a plan
# (client signoff happens here)
upriver fixes apply audreys --parallel # opens one PR per finding
# both operators review and merge PRs
upriver qa audreys --preview-url <url> # confirms the fix landed
upriver sync push audreys              # other operator can see it
```

The CLI is opinionated about this loop on purpose — it keeps the
methodology consistent across operators.

---

## 8. Operating cadence

### 8.1 Daily (~15 min, async-first)

A pinned Slack thread in `#upriver-team`:

- What I shipped yesterday (link to merged PRs / sync pushes)
- What I'm picking up today (slug + phase)
- Any blockers (API key issue, client unresponsive, ambiguous finding)

This replaces a standup call. If a thread reply needs more than 5 minutes,
hop on a 15-min huddle.

### 8.2 Weekly (Mon, 30 min, video)

- Active engagements board walkthrough — who's on what, where each is in
  the pipeline, anything stuck.
- CLI improvements wishlist — pain points from the week, decide what
  becomes a `feat/` branch this week.
- Backlog review — `.planning/roadmap/BACKLOG.md` and `DECISIONS-NEEDED.md`.
- One thing each operator wants to learn / pair on this week.

### 8.3 Per-engagement

- **Kickoff call (internal, 15 min)** when a new client signs — operator
  assignment, target dates, anything specific to this client (industry
  quirks, brand sensitivities, deadline).
- **Mid-pipeline sync (15 min)** between `synthesize` and the client
  interview — second operator reads the audit and flags anything before
  the brief locks in.
- **Pre-launch QA huddle (15 min)** — the QA operator walks the launch
  operator through `qa-report.md`. Both sign off before the launch
  checklist runs.

### 8.4 Handoffs

When state needs to live longer than a Slack thread, write a handoff
under `.handoff/` — same template as `.handoff/2026-04-30-capture-all-pages.md`.
Examples:

- Picking up an engagement after a week off.
- Mid-task pause where the next steps aren't obvious from the CLI state
  alone.
- A client paused engagement we expect to resume.

Filename: `.handoff/<YYYY-MM-DD>-<slug-or-topic>.md`. Both operators
read these when picking up state.

---

## 9. Safety rules

Non-negotiable. These exist because the failure mode is silent and bad.

1. **Never commit `.env`** or any file under `clients/`. Both are
   gitignored; `git add -A` is banned (use specific filenames).
2. **Never share secrets in Slack, PRs, or issues.** Always 1Password.
3. **Always `sync pull` before you start, `sync push` when you stop.**
   Soft-lock convention only works if both operators do this religiously.
4. **Don't run `fixes apply --parallel` on the same slug from two
   machines.** It uses git worktrees and they will collide.
5. **Don't apply Supabase migrations from two machines simultaneously.**
   Coordinate in Slack; merge the migration PR; let the
   `automigrations` workflow apply it.
6. **Don't share Anthropic API keys between operators.** Each operator's
   Claude Max subscription is what powers the headless `claude` features
   on their machine. Sharing breaks attribution and blows quota.
7. **Don't bypass the QA gate.** If `qa-report.md` flags P0 issues, fix
   them before launch — even if the client is impatient.
8. **Treat client folders as confidential.** They contain scraped emails,
   phone numbers, and brand-internal copy. No screenshots into public
   threads, no pasting voice-guide drafts into ChatGPT.
9. **`clone/` and `fix/` PRs need a human reviewer.** The CLI agent is
   good but not infallible — every PR ships through a person.

---

## 10. Anne-Marie's first two weeks

### Week 1 — shadow + setup

- **Day 1** — accounts (§2.1), local install (§2.3), `upriver doctor`
  green, read `README.md` + `docs/USER-GUIDE.md` end-to-end, this
  document, plus `docs/CLIENT-ONBOARDING.md` and `SALES-PLAYBOOK.md`.
- **Day 2** — pair with Joshua on a live engagement, watching every
  command. Joshua narrates what each phase is for, what the deliverable
  looks like, what's hard about the client.
- **Day 3** — run a parallel pipeline on a throwaway slug (her
  favourite local restaurant) end-to-end alone. Joshua reviews.
- **Day 4–5** — own the audit phase on a real new engagement (not the
  rebuild) — `init` through `synthesize` + `voice-extract`. Joshua
  reviews the audit-package and the voice guide.

### Week 2 — first solo phase

- Run the first interview with Joshua silent on the call as backup.
- Process the interview, do the `design-brief`, hand off to Joshua for
  scaffold + clone.
- Reviews Joshua's clone PRs.
- Owns the QA pass on Joshua's engagement (independent eyes).

By end of week 2 she's done every CLI command at least once on a real
engagement, has two clients she's owned a phase on, and has reviewed
the other operator's work at every gate.

---

## 11. Backlog this surfaces

Add to `.planning/roadmap/BACKLOG.md`:

- [ ] `upriver sync acquire/release` with a real lease in the bucket
      (eliminates the soft convention).
- [ ] Active-engagements board inside the dashboard — pivots
      `usage_log` rows by slug + operator, reads the lock file, links
      to deliverables. Replaces the Notion/Airtable hack.
- [ ] `upriver sync status <slug>` — diff local vs bucket, show stale
      files in either direction.
- [ ] Operator allowlist UI in the dashboard (already in OPS.md
      backlog §18) so operator role can be granted without raw SQL.
- [ ] Run-history view in the dashboard pivoted by operator, for
      monthly reviews and billing reconciliation.
- [ ] Codify GitHub team + org default permission for `lifeupriver/*-site`
      repos in a Terraform/`gh` script so future client repos never
      require a manual permission edit.

---

## 12. TL;DR for Anne-Marie

```
1. Accept your invites: GitHub, Vercel, Supabase, Resend, Inngest, 1Password.
2. brew install node@20 pnpm gh; npm i -g @anthropic-ai/claude-code; claude login
3. git clone lifeupriver/upriver-clone; pnpm install && pnpm build
4. cd packages/cli && npm link
5. cp .env.example .env; paste from 1Password
6. upriver doctor       # all checks ok / warn
7. Pick a slug from the active-engagements board.
8. upriver sync pull <slug>  → run any commands  →  upriver sync push <slug>
9. Open / review PRs on lifeupriver/upriver-clone and lifeupriver/<slug>-site.
10. Slack #upriver-team on big merges; weekly Mon sync.
```

Welcome aboard.
