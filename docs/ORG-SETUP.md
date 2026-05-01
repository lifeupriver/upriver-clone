# Upriver — Organization Setup Playbook

How we go from "Joshua's personal-account proof-of-concept" to a legitimately
operated four-person company. Companion to `docs/TEAM-WORKFLOW.md` (which
covers day-to-day operating rhythm); this doc is the one-time setup that
makes that rhythm possible.

**Audience:** Joshua (driver of most of this) + Anne-Marie (lead dev) for
the technical migration steps + Megan (admin) for the business-operations
steps.

**Status today (the honest snapshot):**

- No legal entity. Operating as Joshua personally. No EIN, no business
  banking, no business credit card.
- Domain `upriverhudsonvalley.com` registered through **Google Domains**
  (now Squarespace Domains since the Google Domains shutdown), under
  Joshua's personal Google account.
- Two Upriver-domain mailboxes: `joshua@upriverhudsonvalley.com` (Joshua),
  `office@upriverhudsonvalley.com` (Megan). Everything else uses
  personal-account credentials.
- All technical infra (GitHub `lifeupriver` org, Vercel `upriver` team,
  Supabase project `qavbpfmhgvkhrnbqalrp`, Fly app `upriver-worker`,
  Inngest workspace, Resend domain `upriverhudsonvalley.com`, Anthropic
  Claude Max subscription) lives under Joshua's personal credentials.
- One MVP product shipping: the `upriver-clone` CLI + the
  `upriver-platform.vercel.app` dashboard.
- Team about to grow from 1 → 4 people.

**Decision context for this plan** (locked with Joshua before writing):

1. Migration mode = **clean cutover** — move existing infra to org-owned
   accounts now, accept ~1-2 weeks of careful work and short downtime
   windows, end up clean.
2. CRM = **adopt off-the-shelf now, build later** — Attio (recommended)
   or HubSpot Free integrated via webhooks; revisit "build into the
   dashboard" as a Q3+ project.
3. DNS migration target = **Cloudflare** under a new Upriver-owned
   Cloudflare account (separates registrar/DNS from hosting and from
   Google's ecosystem).
4. Entity = **form an LLC as step zero** — Upriver Hudson Valley LLC,
   EIN, business banking, business card, accounting before opening
   business-tier accounts that demand a real company name on the bill.
5. Employment model = **1099 subcontractors** for Anne-Marie and Zach,
   with the option to convert to retainer or W-2 once Upriver has the
   revenue to support it. Joshua handles sales and finds clients;
   Anne-Marie does the web/dev work; Zach does the automation +
   content work; Megan handles administration. The arrangement with
   Anne-Marie specifically is mutually-incentivized: she's investing
   her time helping build the org infrastructure now (not just on
   billed engagements) on the understanding that Joshua's wedding-
   industry pipeline will produce paid work she gets dibs on. See
   §2.2 for how this translates into contractor agreements.
6. Banking = **Mercury (checking) + Ramp (cards & spend management)**.
   Mercury is the operating account; Ramp issues the company cards
   used for SaaS subscriptions and gets us category-level spend
   reporting + auto-coded transactions feeding accounting.
7. Tooling principle = **MCP-first.** Any tool we adopt must expose
   itself to Claude — either via an existing MCP server, an official
   CLI, or a public API we can wrap in our own MCP server. We'll
   build adapters for the few gaps. See §1.3.

---

## 1. The North Star: org chart, email scheme, principle of one identity

### 1.1 People and roles

| Person | Role | Primary mailbox | Group aliases | GitHub role | Vercel role | Supabase role | Claude role |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **Joshua** | Founder, content | `joshua@` | `hello@`, `clients@`, `billing@` | Org Owner | Owner | Owner | Workspace Owner |
| **Anne-Marie** | Lead developer (web) | `dev@` | `hello@`, `clients@` | Member, Maintainer of `operators` team | Developer | Developer | Workspace Member |
| **Zach** | Automation engineer + content | `content@` | `hello@`, `clients@` | Member, on `operators` team | Member (Limited) | Read-only initially | Workspace Member |
| **Megan** | Operations / admin | `office@` (existing) | `hello@`, `billing@`, `clients@` | None (org outside-collaborator on docs only if needed) | Viewer (for billing visibility) | None | Workspace Member |

> **Convention.** People-aliases (`joshua@`, `dev@`, `content@`, `office@`)
> are role-tied — when Anne-Marie hands off the lead-dev seat someday, the
> `dev@` mailbox transfers without changing every account password. Group
> aliases (`hello@`, `clients@`, `billing@`) deliver to multiple people
> via Google Workspace Groups.

### 1.2 The principle

> **Every login to every Upriver service uses an `@upriverhudsonvalley.com`
> identity. Personal-account logins for company tools are never created
> and existing ones are migrated.**

Why it matters:

- When someone leaves, we suspend the Workspace user; their access to
  Vercel/GitHub/Supabase/Claude/Stripe/Attio etc. evaporates because
  those services are tied to that identity.
- When the company sells / takes investment / gets audited, the
  ownership trail is clean.
- We're never one personal-Gmail-recovery-flow away from losing the
  business.

This is the single most important rule in this doc.

### 1.3 The MCP-first principle (the second-most-important rule)

> **Every tool we adopt must be operable by Claude.** Concretely: it
> ships an MCP server, an official CLI, or a stable public API we can
> wrap in our own MCP server. If a tool fails this bar and there's no
> good alternative, we accept the gap consciously and put "build an
> MCP adapter" on the backlog — we don't just live with the manual
> workflow.

Why it matters:

- Most of the work on a client engagement gets driven by Claude — the
  CLI, the dashboard agents, the headless `claude` features. Every
  tool that *can't* be operated by Claude is a piece of work that
  has to live in a human's head and clicks.
- One of the four people on the team will, on any given day, be in
  Claude Code rather than in a browser tab. The set of tools they can
  operate is the set with MCP / CLI access.
- Auditability — when Claude does the work, every action is logged in
  the conversation. When a human clicks through a UI, it isn't.

**Tool MCP / CLI status audit:**

| Tool | MCP? | CLI? | Notes |
| --- | --- | --- | --- |
| **GitHub** | ✅ Official MCP | `gh` | Already wired in our sessions |
| **Vercel** | ✅ Official MCP | `vercel` | Already wired |
| **Supabase** | ✅ Official MCP | `supabase` | Already wired |
| **Cloudflare** | ✅ Official MCP | `wrangler` | Add when we move DNS |
| **Stripe** | ✅ Official MCP | `stripe` | Wire after Stripe setup |
| **Cloudinary** | ✅ Official MCP | CLI exists | Wire when Zach's content workflow needs it |
| **Calendly** | ✅ Official MCP | API | Wire on Calendly setup |
| **Sentry** | ✅ Official MCP | `sentry-cli` | Wire on Sentry setup |
| **Linear** | ✅ Official MCP | `linear` | When we adopt Linear |
| **Notion** | ✅ Official MCP | API | When we adopt Notion |
| **Slack** | ✅ Official MCP | API | Wire post-Slack setup |
| **Google Workspace** (Gmail/Calendar/Drive) | ✅ Community MCPs (`@modelcontextprotocol/gdrive`, gmail, calendar) | `gcloud` for admin | Wire after Workspace setup |
| **1Password** | ✅ Official `op` CLI + MCP | `op` | The `op run` pattern injects secrets directly into commands |
| **Anthropic / Claude Team** | N/A — it *is* Claude | `claude` headless CLI | Already used by the upriver pipeline |
| **Attio** | ⚠️ Community MCP exists; verify before relying on it. Otherwise REST API + custom MCP. | API | If community MCP is thin, we build `@upriver/mcp-attio` (already on the roadmap in §6.2) |
| **Quickbooks Online** | ⚠️ Community MCP servers exist; quality varies | OAuth API | Build `@upriver/mcp-bookkeeping` if we end up doing automated reconciliation |
| **Mercury** | ❌ No MCP yet | OAuth API | Add `@upriver/mcp-banking` to backlog |
| **Ramp** | ❌ No MCP yet | OAuth API + Developer API | Same — fold into `@upriver/mcp-banking` |
| **Resend** | ❌ No first-party MCP | Node SDK | Wrap in `@upriver/mcp-email` if we automate transactional sends |
| **Inngest** | ❌ No first-party MCP | `inngest-cli` | The CLI is sufficient for now |
| **Fly.io** | ❌ No official MCP | `flyctl` | The CLI is rich enough; defer MCP |
| **Backblaze B2** | ❌ No MCP | S3-compatible API + `b2` CLI | Not high-priority for Claude-driven work |
| **Instatus** (status page) | ❌ No MCP | API | Low-priority gap |
| **Discord/Slack alerting** | Slack ✅ | — | Use Slack MCP to triage alerts |

**Implication for the Phase 4 build roadmap:** the four custom MCP
servers in §6.2 (`mcp-engagements`, `mcp-pipeline`, `mcp-attio`,
`mcp-content`) get joined by **`@upriver/mcp-banking`** (Mercury +
Ramp wrapper) and **`@upriver/mcp-email`** (Resend wrapper) as the
gaps that matter most. See §6.2 for the expanded list.

**Implication for tool selection in this doc:** every Phase 1-3 tool
choice was sanity-checked against this audit. If a future tool we
consider doesn't pass the bar, that's a real reason to look at an
alternative or to plan the MCP build alongside the adoption.

---

## 2. Phase 0 — Legal entity (the prerequisite for everything else)

Joshua-driven. Most of this can happen in parallel with Phase 1, but
nothing in Phase 2+ should open accounts in the LLC's name until the
EIN exists.

| Step | What | Who | Tools | Cost | Time |
| --- | --- | --- | --- | --- | --- |
| 0.1 | Form **Upriver Hudson Valley LLC** in NY | Joshua | NY Department of State (or use Northwest / LegalZoom / Stripe Atlas if you want it done-for-you) | $200 filing + $25/yr biennial | 1-2 weeks |
| 0.2 | NY publication requirement (LLC must publish in two newspapers within 120 days of formation — NY-specific quirk; Northwest/LegalZoom handles this for you) | Joshua | Filing service or directly with newspapers | ~$500-2,000 depending on county | 6 weeks total but background |
| 0.3 | Apply for **EIN** from IRS | Joshua | irs.gov/EIN — free, online, takes 10 min | $0 | Same day |
| 0.4 | Operating agreement (single-member, default-NY) | Joshua | LegalZoom template or Northwest's free one | $0-200 | 1 day |
| 0.5 | Open **business checking** at Mercury (operating account; tech-forward, online-only, fast funding) | Joshua | mercury.com | $0 | 1-3 days |
| 0.6 | Open **Ramp** for company cards + spend management (issues virtual + physical cards under the LLC, auto-codes transactions, syncs to Quickbooks). Works alongside Mercury rather than replacing it. | Joshua | ramp.com | $0 (Ramp is free; takes interchange) | 1-2 weeks |
| 0.7 | (Optional) **Chase Ink Business Cash** as a backup card in case a vendor doesn't accept Ramp's BIN. No annual fee; 5% on internet/phone/cable up to $25k/yr. | Joshua | chase.com | $0 annual | 1-2 weeks |
| 0.8 | **Accounting software** | Joshua | Quickbooks Online Simple Start ($30/mo) **or** Xero Starter ($20/mo) **or** Wave (free, weaker but workable for now) | $0-30/mo | 1 day |
| 0.9 | Register a **DBA** if you want to operate as just "Upriver" without "Hudson Valley LLC" everywhere | Joshua | NY county clerk | ~$25-100 | 1 day |
| 0.10 | Get **General Liability + Professional Liability (E&O) insurance** — agencies that build websites for clients absolutely need E&O | Joshua | Hiscox / Next Insurance / Embroker | $400-1,200/yr | 1 week |
| 0.11 | Sign **1099 subcontractor agreements** with Anne-Marie and Zach (see §2.2). | Joshua | Bonsai contract templates / Stripe Atlas / a lawyer for the first one | $200-500 one-time legal | 1 week |

### 2.1 Why Mercury + Ramp instead of just one or the other

- **Mercury** is the bank account: ACH in/out, wire, Stripe payouts
  land here, vendors that need bank-to-bank go through it.
- **Ramp** is the card layer + the spend-management UI: every SaaS
  subscription gets its own virtual Ramp card with a per-vendor
  spending limit, auto-coded by category. Receipts get emailed to
  Ramp and matched to transactions automatically. When Anne-Marie
  or Zach need to expense something, they get a card via Ramp without
  Joshua handing over his number.
- Both have clean APIs (gap on the MCP side per §1.3 — we'll build
  `@upriver/mcp-banking`). Both auto-sync to Quickbooks.
- Together they replace what would otherwise be "Joshua's personal
  Chase card with screenshots in a Slack channel," which is what
  most early-stage teams accidentally end up with.

### 2.2 The contractor / mutual-incentive arrangement

This is **not** a typical W-2 setup or even a typical 1099 setup, and
the contracts should reflect what's actually happening.

**Today's reality:**

- Joshua is the founder and the only person currently paid by the
  business. He's funding setup costs personally and will reimburse
  via the LLC once banking is in place.
- **Anne-Marie** is investing time into building Upriver's
  infrastructure and tooling — not just billed client work — on the
  understanding that Joshua's wedding-industry pipeline will produce
  a steady flow of paid engagements where she's the lead developer.
  Mutually beneficial: she's getting in on the ground floor of an
  agency that has a clear sales motion; Upriver is getting senior dev
  capacity it couldn't otherwise afford.
- **Zach** is similarly a 1099 — content + automation work, billed
  per project or per retainer block.
- **Megan** is doing administrative work and is the only one currently
  receiving regular pay (continuing the existing arrangement).

**What the contracts need to capture:**

1. A **base 1099 services agreement** for each of Anne-Marie and Zach:
   scope of services, hourly or per-project rate, IP assignment to
   Upriver Hudson Valley LLC for any work product, confidentiality,
   no-non-compete (NY restricts these for contractors anyway).
2. A **side letter / addendum for Anne-Marie** that documents the
   infrastructure-building work she's contributing without immediate
   payment, and what she gets in exchange. Two reasonable patterns:
   - **First-right-of-refusal on web/dev work** — every paid client
     engagement Joshua brings in offers Anne-Marie the lead-dev role
     at a stipulated rate before going to anyone else, until X hours
     of paid work has been billed. Simple, no equity, no future
     obligation if Upriver fizzles.
   - **Profit-share or revenue-share on a defined client cohort** —
     Anne-Marie gets X% of the gross margin on Y clients during Z
     months. More complex but better aligned if Upriver hits scale.
   - **Recommend pattern 1** for the first six months. Easier to
     paper, easier to unwind if something doesn't work, no
     securities-law concerns.
3. A **conversion clause** noting both parties intend to revisit the
   relationship at month 6 or month 12, with the option to convert
   to a retainer (e.g. $X/mo guaranteed minimum) or to W-2
   employment if Upriver's revenue supports it.

Get the first agreement drafted by an actual attorney (~$300-500);
the second one (Zach's) can use the same template with the names
swapped. **Don't skip this.** Without paper, the IP-ownership story
gets murky if a dispute ever surfaces, and the working-now-for-paid-work-
later understanding becomes one party's word against the other's.

**Output of Phase 0:** an LLC, EIN, Mercury checking, Ramp company
cards, accounting software, insurance, signed contractor agreements
with Anne-Marie and Zach, ongoing arrangement with Megan documented.
You can now sign up for SaaS in the company's name with a company
card on file and bring contractors onto engagements with proper IP
assignment.

---

## 3. Phase 1 — Identity foundation

This is the layer everything else sits on. **Do this in order.**

### 3.1 Cloudflare account for DNS (move off Google Domains/Squarespace)

Google Domains was sold to Squarespace; renewals will get more annoying
over time and the operator UX is deteriorating. Cloudflare is free for
DNS, has the best DX in the industry, and is what we want as the long-
term root of trust.

1. Sign up `cloudflare.com` with **`joshua@upriverhudsonvalley.com`**
   (NOT a personal email).
2. Create a Cloudflare account named "Upriver Hudson Valley".
3. Add `upriverhudsonvalley.com` as a zone. Cloudflare scans existing
   DNS records.
4. Update nameservers at Squarespace Domains to Cloudflare's two NS
   records. Wait for propagation (24-48h, usually <1h).
5. Decide: **transfer the registration** to Cloudflare ($10/yr,
   at-cost) or keep registration at Squarespace ($12-15/yr, just point
   nameservers). **Recommend transfer** — reduces login surfaces.
6. Once nameservers move, **invite `dev@`** as Administrator and
   **`office@`** as Billing (read-only) on the Cloudflare account.

**Subdomains to provision now or soon** (DNS records, even if the
service isn't built yet):

| Subdomain | Purpose | Status |
| --- | --- | --- |
| `upriverhudsonvalley.com` | Marketing site (TBD) | Currently parked or used by old SquareSpace site — audit |
| `app.upriverhudsonvalley.com` | Operator dashboard (currently `upriver-platform.vercel.app`) | Migrate, see §4.2 |
| `reports.upriverhudsonvalley.com` | Client-facing share links (already wired) | Already configured per `OPS.md` |
| `api.upriverhudsonvalley.com` | Future public API (clients submitting work programmatically) | Reserve, not active |
| `crm.upriverhudsonvalley.com` | Custom CRM if/when we build (for now points at Attio's custom-domain feature) | Reserve |
| `status.upriverhudsonvalley.com` | Status page (BetterStack / Instatus) | Reserve, set up in Phase 3 |
| `docs.upriverhudsonvalley.com` | Internal docs / external method docs | Reserve |
| `intake.upriverhudsonvalley.com` | Intake form (currently `app/intake/<slug>`) | Optional CNAME |

### 3.2 Google Workspace

1. Sign up Workspace **Business Starter** at $6/user/mo (or Standard at
   $12/user/mo if you want unlimited shared drives + recording in Meet —
   recommend Standard for an agency that does client calls).
2. Domain verification — Cloudflare DNS record (TXT). Add MX records.
3. Create user accounts:
   - `joshua@upriverhudsonvalley.com` (transfer existing mailbox if it
     exists; otherwise create fresh)
   - `dev@upriverhudsonvalley.com` (Anne-Marie)
   - `content@upriverhudsonvalley.com` (Zach)
   - `office@upriverhudsonvalley.com` (Megan, already exists — migrate)
4. Create groups (group emails, multi-recipient delivery):
   - `hello@upriverhudsonvalley.com` → all four (public-facing inbox)
   - `clients@upriverhudsonvalley.com` → Joshua + Anne-Marie + Zach
     (active engagement comms; Megan can join later if she handles
     scheduling)
   - `billing@upriverhudsonvalley.com` → Joshua + Megan (Stripe receipts,
     vendor invoices)
   - `support@upriverhudsonvalley.com` → all four (post-launch client
     support; we'll define SLA when this matters)
   - `noreply@upriverhudsonvalley.com` (already used for Supabase Auth
     SMTP per `OPS.md` — keep)
   - `reports@upriverhudsonvalley.com` (already used for client report
     emails — keep)
5. Set up Google Drive shared drives:
   - `Upriver — Operations` (Megan + Joshua)
   - `Upriver — Engineering` (all)
   - `Upriver — Clients` (one folder per slug; everyone has access)
   - `Upriver — Brand & Marketing` (all)
6. Calendar:
   - Per-person calendars exist by default
   - Shared calendar `Upriver — Engagements` — events for client
     interviews, launches, milestone deadlines
   - Shared calendar `Upriver — Internal` — standups, review huddles

### 3.3 1Password Teams (or Bitwarden Teams) — secrets vault

This is the second-most-important account after Workspace. **Don't skip
or replace with Slack/email/notes.**

1. Sign up 1Password **Teams Starter Pack** ($19.95/mo flat for up to
   10 people — better deal than per-seat for a small org).
2. Vaults:
   - `Upriver — Founders` (Joshua only)
   - `Upriver — Engineering` (Joshua, Anne-Marie, Zach)
   - `Upriver — Operations` (Joshua, Megan)
   - `Upriver — All Hands` (everyone — for shared logins to passive
     services like Slack, Workspace recovery codes, etc.)
   - `Upriver — Clients/<slug>` per active engagement (operator
     credentials Anne-Marie/Zach need for that client only)
3. Migrate every secret listed in `docs/TEAM-WORKFLOW.md` §2.2 from
   wherever it lives now (Joshua's personal 1Password / Notes / .env
   files / browser passwords) into the right vault.
4. Install the 1Password CLI on every laptop. Set up
   [shell-plugin integration](https://developer.1password.com/docs/cli/shell-plugins/)
   so people don't even need to copy-paste secrets — `op run` injects
   them at command time.

### 3.4 Claude Team

1. Upgrade Joshua's Claude Max → **Claude Team** (or sign up a fresh
   Team workspace — recommend fresh, named "Upriver", to keep Joshua's
   personal Claude history out of the company).
2. $25/user/mo × 4 = $100/mo. Comparable to one Max ($100/mo) for one
   user, gives all four headless `claude` CLI access for the upriver
   pipeline's LLM features.
3. Invite all four to the Workspace using their `*@upriverhudsonvalley.com`
   identities.
4. Re-login `claude` CLI on every operator's machine using the new
   workspace account. The CLI continues to work; no code changes.
5. Update `docs/TEAM-WORKFLOW.md` §2.1 — replace "each operator's
   personal Claude Max" with "each operator's Upriver Workspace seat."

### 3.5 Slack (or Discord) — internal comms

1. Sign up Slack **Pro** ($8.75/user/mo for full message history and
   guest access — worth it for an agency that needs to find old client
   conversations).
2. Workspace name: Upriver. Sign-in: Google Workspace SSO so the
   `*@upriverhudsonvalley.com` identities are authoritative.
3. Channels (start small, add as needed):
   - `#general` — all hands
   - `#engineering` — CLI, dashboard, infra
   - `#clients` — active engagement updates (one thread per active
     client, or one channel per active client if we have many)
   - `#sales` — pipeline, prospects, lost deals
   - `#alerts` — Sentry / Inngest failures / deploy notifications
   - `#random` — hallway
4. Integrations to wire in Phase 2: GitHub (PR notifications), Vercel
   (deploy notifications), Inngest (function failures), Stripe (new
   payments), Attio (new contact / deal stage changes).

---

## 4. Phase 2 — Engineering infrastructure migration

Every existing technical asset moves from Joshua's personal credentials
to an Upriver-owned org account.

### 4.1 GitHub

The `lifeupriver` GitHub org **already exists** but is owned by Joshua's
personal GitHub account. The migration:

1. Create a new GitHub user `upriver-ops` linked to `joshua@`
   (or use `office@` as a "service identity" — but a real human is
   typically required for org owner). **Recommend:** add Joshua's
   `joshua@upriverhudsonvalley.com` as a verified email on his existing
   personal GitHub user, then accept org ownership transfer using that.
   Don't create a fake bot user as primary owner.
2. Upgrade the org from Free → **GitHub Team** ($4/user/mo).
3. Create teams in the org:
   - `@lifeupriver/operators` — Joshua, Anne-Marie, Zach. Write access
     to all client repos by default.
   - `@lifeupriver/admin` — Joshua only. Owner.
   - `@lifeupriver/contractors` — outside-collaborators with limited
     repo access (future-proofing for hiring help).
4. Configure org-wide **default repo permission** = team `operators`
   gets Write on every new repo. This is what makes
   `upriver scaffold github <slug>` automatically work for the team
   without per-repo permission edits.
5. Invite Anne-Marie (`dev@`), Zach (`content@`) — they accept using
   their personal GitHub usernames but with email tied to the
   Upriver-domain identity.
6. Branch protection on `lifeupriver/upriver-clone` `main`:
   - Require PR before merge
   - Require status checks (typecheck, build)
   - Require 1 approving review (we are 4 people; this is realistic)
   - No force push, no deletion
7. Set up **Renovate** or **Dependabot** for the monorepo so deps
   don't rot.
8. **CODEOWNERS** file — Joshua + Anne-Marie are owners of
   `packages/**`, Zach owns `automations/**` (when that exists).

### 4.2 Vercel

1. Create new **Vercel Team** "Upriver Hudson Valley" using
   `joshua@upriverhudsonvalley.com`. Pro tier ($20/user/mo) — Pro is
   what unlocks the production-grade observability we want.
2. **Transfer existing projects** from Joshua's personal Vercel team
   to the new Upriver team:
   - `upriver-platform` (the operator dashboard at
     `app.upriverhudsonvalley.com` after this migration; currently
     `upriver-platform.vercel.app`)
   - Each per-client `<slug>-site` project as it exists
3. Connect the Upriver team to the `lifeupriver` GitHub org (so PR
   preview deploys keep working).
4. Move env vars (re-paste from 1Password into the new team).
5. **Add custom domains:**
   - `app.upriverhudsonvalley.com` → upriver-platform
   - `reports.upriverhudsonvalley.com` → already mapped per OPS.md;
     re-verify after team transfer
6. Invite Anne-Marie + Zach as Members; Megan as Viewer (so she can
   see deploy status without breaking anything).
7. Update `OPS.md` URLs from `upriver-platform.vercel.app` →
   `app.upriverhudsonvalley.com`.

### 4.3 Supabase

This is the trickiest migration because Supabase doesn't have a clean
"transfer project ownership" flow.

**Option A — In-place organization transfer** (preferred if available):
contact Supabase support, ask them to move project
`qavbpfmhgvkhrnbqalrp` from Joshua's personal organization to a new
"Upriver Hudson Valley" organization. Free for paying customers; may
take a few days. **Try this first.**

**Option B — New project + migration** (fallback):
1. Create new Supabase org "Upriver Hudson Valley" + new project.
2. Run all migrations from `supabase/migrations/`.
3. Export auth users + storage bucket from old project; import into
   new project (Supabase has a CLI tool for this; may need a small
   amount of custom SQL).
4. Update env vars (`UPRIVER_SUPABASE_URL`, keys) in Vercel + Fly.
5. Plan a maintenance window; coordinate.
6. Keep old project read-only for 30 days for safety.

Whichever path:

- Upgrade to **Supabase Pro** ($25/mo) — gets us daily backups, no
  pause-on-inactivity, better support.
- Add team members:
  - Joshua = Owner
  - Anne-Marie = Developer
  - Zach = Read-only at first; promote to Developer once he's
    deploying automation
  - Megan = no access (she doesn't need it)
- Bucket name `upriver` stays the same (path: `clients/<slug>/`).
- The `share_tokens`, `dashboard_events`, `usage_log` tables come along.

### 4.4 Fly.io

1. Create new Fly **org** "upriver-hv" using `joshua@`.
2. Move `upriver-worker` app from Joshua's personal org to the
   Upriver org via `fly apps move upriver-worker --org upriver-hv`.
   Recommend doing this during a maintenance window — the move
   itself is fast but secrets need to be re-set after.
3. Re-set secrets: `fly secrets set ...` per the list in `OPS.md`.
4. Invite Anne-Marie + Zach as members. Megan: no access.
5. Hook Fly to a **business credit card** on the LLC's name (this is
   billed in advance, can hit your personal card if forgotten).

### 4.5 Inngest

1. Create new Inngest **org** "Upriver" using `joshua@`. Free tier is
   plenty for current usage; upgrade to Team ($40/mo) when monthly
   function runs exceed the free quota.
2. Recreate the apps: `upriver-worker` (production) and a `dev`
   environment for local testing.
3. Update `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` everywhere
   they're set (Vercel env, Fly secrets, 1Password).
4. Invite team.
5. Enable failure notifications → Slack `#alerts` channel.

### 4.6 Resend

1. Create Resend **org** "Upriver" using `joshua@`.
2. Re-verify `upriverhudsonvalley.com` as a sending domain (Cloudflare
   makes this 5 minutes — DKIM/SPF auto-CNAMEs).
3. Plan: **Pro at $20/mo** for the volume we expect (100k emails/mo,
   higher rate limits).
4. Re-create API keys, rotate everywhere they're used (Vercel, Fly,
   1Password).
5. Update Supabase Auth → SMTP settings per `OPS.md` — paste the new
   Resend key.
6. Verify auth-email delivery still works (sign-in to the dashboard
   should email; if not, check Resend logs).

### 4.7 Backblaze (referenced in `2f4eab6 feat(cli): demo command + image
    compression + Backblaze archive/restore`)

1. Create Backblaze B2 account using `joshua@`.
2. New bucket per the CLI's archive convention.
3. Re-paste credentials into 1Password and `.env.example`.

### 4.8 Anthropic API key (residual usage that bypasses Claude Max)

Some CLI features still call the Anthropic SDK directly with an API key
(see `UPRIVER_USE_API_KEY` in README). For these:

1. Create a Console workspace under the Upriver Anthropic Team org.
2. Generate a fresh `sk-ant-...` key for that workspace; store in
   1Password "Upriver — Engineering" vault.
3. Rotate any existing personal-account API key — disable it on the
   personal Console.
4. Update `.env` on every operator machine.

---

## 5. Phase 3 — Business operations stack

The non-engineering tools that make us look and act like a real company.

### 5.1 Stripe (payments)

1. Sign up Stripe with the LLC's name and EIN. Bank-link to Mercury.
2. Create products:
   - **Audit-only engagement** — flat fee
   - **Audit + Rebuild** — flat fee or staged
   - **Retainer (Monitor + Followup + Admin)** — monthly subscription
   - Standalone deliverables (voice guide, schema build, blog topics,
     video plan, custom-tools proposal) — flat fee per `README.md`
     "Sellable standalone deliverables"
3. Wire Stripe webhooks → the dashboard (new endpoint in
   `packages/dashboard/src/pages/api/stripe/webhook.ts`) so paid
   invoices automatically progress an engagement to the next phase.
4. Stripe Tax — turn it on; sort out NY sales-tax obligations once
   we know whether website-build services are taxable in NY (consult
   the accountant; it's a gray area).
5. Add `billing@` to receive Stripe receipts.

### 5.2 Calendly (or Cal.com) — scheduling

1. **Cal.com** Team plan ($12/user/mo) integrates better with
   Workspace + open source if we want self-host later.
   **Calendly** Team ($16/user/mo) is easier-to-use.
2. Create event types:
   - "Free 20-min audit consultation" (Joshua-owned, public)
   - "Findings call" (60 min, calendar-shared with the active
     operator on a given client)
   - "Client interview" (90 min)
   - "Project kickoff" (30 min)
3. Embed booking links on the marketing site and in the
   audit-delivery email template.

### 5.3 Attio (CRM — adopt now per the locked decision)

Why Attio over HubSpot:

- Better data model for an agency (not lead-and-deal-only; can model
  clients, engagements, deliverables as first-class objects).
- Cleaner API; we'll integrate with the dashboard.
- Free tier covers 3 users; Plus is $29/seat for what we need.

Setup:

1. Sign up `attio.com` with `joshua@upriverhudsonvalley.com`.
2. Create the workspace; invite Anne-Marie, Zach, Megan.
3. Custom objects:
   - **Companies** (the prospect/client business)
   - **People** (decision makers, contacts)
   - **Engagements** (one row per `<slug>` we work on; references
     the client repo, the dashboard URL, the Stripe customer, the
     status — synced from the dashboard)
   - **Deliverables** (audit, rebuild, retainer, standalones — each
     is sellable standalone, each ties to a Stripe product)
4. Pipelines:
   - **Sales** (lead → audit purchased → rebuild signed → live →
     retainer)
   - **Engagement** (init → scrape → audit → … → launch — mirrors
     the CLI pipeline phases)
5. Integrations:
   - **Gmail** sync (via Workspace) — incoming/outgoing emails
     attach to the right person/company automatically.
   - **Stripe** sync — paid invoices flip an engagement stage.
   - **Custom webhook** from `packages/dashboard` — on
     `upriver init <slug>`, POST a new Engagement record to Attio.
     New `packages/core/src/integrations/attio.ts` module.
6. Create dashboard views:
   - Active engagements (operator + phase + last-touched)
   - This week's pipeline — calls scheduled, proposals out, invoices
     awaiting payment
   - Lost deals — annotated with "why," for retros

### 5.4 Quickbooks Online (or Xero)

1. Sign up with the LLC EIN.
2. Connect Mercury checking + the Chase Ink card.
3. Add Joshua as Admin; Megan as Standard user (she'll do day-to-day
   bookkeeping if comfortable, otherwise hire a bookkeeper at
   $200/mo).
4. Connect Stripe — paid invoices auto-create deposits.
5. Tax filing — find a CPA familiar with NY single-member LLCs by
   end of Year 1; Northwest's "tax kit" is a fine MVP.

### 5.5 Status page

1. **Instatus** ($20/mo) or **BetterStack** (free tier OK) at
   `status.upriverhudsonvalley.com`.
2. Monitor:
   - `app.upriverhudsonvalley.com/api/health`
   - `upriver-worker.fly.dev/healthz`
   - `reports.upriverhudsonvalley.com`
   - Each per-client `<slug>-site.upriverhudsonvalley.com` (or their
     custom domain) — automated check on the homepage.
3. Slack `#alerts` integration.

### 5.6 Sentry (error tracking)

1. Free tier; org under `joshua@`. Invite team.
2. Wire into `packages/dashboard` (Astro) and `packages/worker`
   (Express).
3. Source maps uploaded on every Vercel/Fly deploy.

### 5.7 Linear (or GitHub Projects) — issue tracking

GitHub Issues works for now; if we hit critical mass, **Linear** at
$8/user/mo gives much better roadmap views, sprint planning, and an
API the dashboard can integrate with. Defer until Q3 unless we feel
the pain sooner.

### 5.8 Notion (or Coda) — internal wiki

The repo's `.planning/` and `docs/` directories are good for
engineering docs. For non-engineering docs (sales playbooks, brand
guidelines, vendor contacts, contractor agreements, retros), a
proper wiki is worth it.

- **Notion** Team ($10/user/mo) — most teams know it.
- **Coda** Team ($12/user/mo, more powerful).

Top-level pages:
- "Welcome to Upriver" (every new hire reads first)
- "How we sell"
- "How we deliver" (links to `docs/` in the repo for engineering
  details)
- "Brand & voice"
- "Vendor list" (with monthly cost, owner, login email)
- "Retros and post-mortems"

---

## 6. Phase 4 — What we build next (engineering roadmap)

The MVP is done. With a real team and proper infra, here's what to
build to make the agency 10x more efficient.

### 6.1 Custom CRM features (the eventual replacement for Attio)

When (not if) Attio limits start hurting, build these into the
dashboard. Don't build them yet — wait for the pain to be specific.

- **Engagement object** — one record per `<slug>`, joining
  `clients/<slug>/`, the GitHub repo, Stripe customer, current
  pipeline phase, and operator assignment.
- **Pipeline kanban view** — drag-and-drop; live-updates from
  CLI commands.
- **Activity log** — every CLI command run, every PR opened, every
  email sent, every share-link click.
- **Client portal** — signed-in client view (separate from operator
  dashboard) where the client sees their deliverables, pending
  approvals (e.g. fixes-plan-scope signoff), and submits change
  requests.

### 6.2 Custom MCP servers (closing the MCP-first gaps from §1.3)

Each MCP server we build is a tool surface for our own agents (and
potentially clients' agents) to call. Priority order:

- **`@upriver/mcp-pipeline`** *(P0 — biggest day-one win)* — exposes
  the upriver CLI commands as MCP tools so an operator running Claude
  Code on their laptop can say "run the audit on audreys" and the
  agent calls `upriver audit audreys` for them. Trivial to build —
  the CLI already has structured args + JSON output flags.
- **`@upriver/mcp-engagements`** *(P0)* — read-only over the Supabase
  `engagements` table (and related `usage_log`, `dashboard_events`).
  Gives any Claude session local-to-the-team the ability to answer
  "what's the status on audreys?" without re-running the dashboard.
- **`@upriver/mcp-attio`** *(P1 — only if community Attio MCP is
  insufficient)* — wraps Attio's REST API so agents can read/write
  contacts, companies, engagements, deals. Lets an operator do "log a
  call with Audrey from yesterday + bump the engagement to phase 4"
  without context-switching to the Attio UI.
- **`@upriver/mcp-banking`** *(P1)* — wraps Mercury's and Ramp's
  developer APIs. Read-only at first: balance, recent transactions,
  burn rate, runway, per-vendor SaaS spend. Eventually write-capable
  for things like "issue a new Ramp card for the audreys engagement
  with a $200 monthly limit." Closes the MCP gap on banking from
  §1.3 — until this exists, financial questions require Joshua to
  open two tabs.
- **`@upriver/mcp-email`** *(P2)* — wraps Resend so the dashboard's
  agentic flows can send transactional emails directly (delivery
  reports, share-link reminders, monitor-report callouts) without
  going through a separate `npm run send` step.
- **`@upriver/mcp-content`** *(P2)* — Zach's tool: search prior
  client voice guides, sample copy, photo libraries, video shotlists,
  etc., across all engagements at once.

Each server lives in `packages/mcp-<name>/` in the same monorepo as
the CLI, ships as an npm-publishable package (under the `@upriver`
scope), and gets added to the team's shared `~/.claude/mcp.json`
config so every operator has the same surface available.

**Architecture decision:** these MCPs are *workspace-internal* —
they're bound to Upriver's data shapes and aren't general-purpose. We
don't try to make them open-source-friendly; we optimize for fit with
our pipeline. (If we later open-source any, we extract the generic
slice and leave Upriver-specific behavior in a wrapper.)

### 6.3 Marketing site

`upriverhudsonvalley.com` should be a real marketing site, not a
parked domain.

- Astro 5 (same as the operator dashboard, share design tokens)
- Pages: home, services (audit, rebuild, retainer, standalones),
  case studies (drawn from `clients/<slug>/followups/case-study.md`
  output of `upriver followup`), about, contact, blog.
- "Get an audit" intake form → creates a new engagement in Attio
  + webhook to dashboard so operator can `upriver init` immediately.
- Blog driven by `packages/cli/src/commands/blog-topics.ts` output
  — publish what we generate.
- Maps the F09 gap-analysis methodology into a public "what we
  audit for" page (sales asset).

### 6.4 Public client portal

Right now share-links are unauthenticated tokens. Eventually:

- Client-side login (separate Supabase Auth project or a different
  role on the same project).
- Per-client dashboard at `app.upriverhudsonvalley.com/c/<slug>`
  (logged in) — shows deliverables, status, pending approvals.
- Approval flows: client clicks "Approve fixes-plan-scope" → emits
  a `dashboard_events` row → operator sees the approval in
  `#clients` Slack and can run `upriver fixes apply`.
- Comments per finding so client and operator can discuss
  individual audit findings inline.

### 6.5 Automation (Zach's domain)

What "automation work for clients" means concretely:

- **Per-client n8n / Make / Zapier instances** — booked-event sync
  (Calendly → CRM), inventory sync, review-request automation, etc.
  Probably scaffold this as `packages/automation-template` similar
  to `packages/admin-template`.
- **Internal automation** — the Inngest worker grows to handle
  more cron jobs (reminder emails, weekly client status reports
  to operators, etc.).

Add to backlog: a `packages/automations/` library where Zach
codifies reusable automation patterns and a CLI command
`upriver automation deploy <slug> <pattern>` that scaffolds it.

### 6.6 Internal ops tooling

- **Time tracking** — Toggl Track ($10/user/mo) per operator, tagged
  by `<slug>` so we know engagement profitability.
- **Profitability dashboard** — pull Toggl + Stripe + the LLM cost
  rows from `clients/<slug>/token-and-credit-usage.log` into one
  view per engagement: revenue − labor cost − API cost = margin.
- **Operator weekly digest** — Friday afternoon: each operator gets
  an email with their hours, their merged PRs, their handed-off
  engagements, and any red flags (P0s found in monitor reports).

---

## 7. Migration runbook (do these in order, ~1-2 weeks elapsed)

### Wave 1 — Day 1 (Joshua, ~3 hours)

- [ ] File LLC paperwork (NY DoS or Northwest)
- [ ] Apply for EIN (10 min)
- [ ] Open Mercury business checking
- [ ] Open Ramp account (cards + spend management)
- [ ] (Optional) Apply for Chase Ink Business Cash as backup card
- [ ] Have a lawyer draft the base 1099 services agreement (Anne-Marie
      version with the side-letter; Zach uses same template)

### Wave 2 — Day 2-3 (Joshua, ~4 hours total)

- [ ] Sign up Cloudflare with `joshua@`; add upriverhudsonvalley.com
- [ ] Move nameservers from Squarespace → Cloudflare
- [ ] Sign up Google Workspace Business Standard; verify domain;
      create user + group accounts
- [ ] Sign up 1Password Teams; create vaults; migrate every secret
- [ ] Sign up Claude Team workspace
- [ ] Sign up Slack Pro; SSO via Workspace; create channels

### Wave 3 — Day 4-5 (Joshua + Anne-Marie pair, ~6 hours)

- [ ] Migrate GitHub `lifeupriver` org ownership; upgrade to Team;
      configure teams, default permissions, branch protection
- [ ] Create Vercel team; transfer projects; re-set env vars; verify
      preview + production builds
- [ ] Open Supabase support ticket for org transfer (Option A); if
      denied within 48h, schedule a Saturday maintenance window
      for Option B
- [ ] Migrate Fly app to new Fly org; re-set secrets
- [ ] Migrate Inngest workspace; re-key everywhere
- [ ] Migrate Resend; re-verify domain; rotate keys; verify Supabase
      Auth SMTP

### Wave 4 — Day 6-7 (Joshua, ~3 hours)

- [ ] Stripe account; products configured; webhook endpoint
- [ ] Calendly team; event types
- [ ] Attio workspace; objects, pipelines, integrations
- [ ] Quickbooks; bank + Stripe + card connected
- [ ] Status page; Sentry

### Wave 5 — Day 8-10 (Joshua + each new hire, ~2 hours each)

- [ ] Send Anne-Marie her onboarding checklist (§9 below)
- [ ] Send Zach his onboarding checklist
- [ ] Send Megan her onboarding checklist
- [ ] Run a full pipeline on a throwaway slug end-to-end with the
      new infra to verify nothing broke

### Wave 6 — Day 11-14 (cleanup, ~3 hours)

- [ ] Decommission personal-account services (cancel Joshua's
      personal Vercel team, etc., AFTER verifying everything works
      on the org accounts for at least 5 days)
- [ ] Update `.env.example`, `OPS.md`, `TEAM-WORKFLOW.md` with new
      URLs and account references
- [ ] Audit 1Password — every secret in the legacy list now has a
      vault home

---

## 8. Per-person onboarding checklists

### 8.1 Joshua

He's doing most of the migration above; this is his personal
checklist after the dust settles:

- [ ] Set up `claude` CLI on laptop using new Workspace Claude Team
      identity (revoke personal Max if you keep it on a different
      account)
- [ ] Verify all `.env` values pulled from 1Password
- [ ] Verify access to every org account from
      `joshua@upriverhudsonvalley.com`
- [ ] Confirm Quickbooks bookkeeping is current and Megan has
      access if she's bookkeeping

### 8.2 Anne-Marie (`dev@`)

Anne-Marie's full account list. Each link goes to where she signs
up using `dev@upriverhudsonvalley.com`:

- [ ] Google Workspace — accept invite, set up 2FA via Authenticator app
- [ ] 1Password — accept invite; install app + browser extension; set up
      Secret Key + Master Password
- [ ] GitHub — accept org invite; verify her existing GitHub username is
      added with `dev@` as a verified email
- [ ] Vercel — accept team invite
- [ ] Supabase — accept org invite
- [ ] Fly.io — accept org invite
- [ ] Inngest — accept org invite
- [ ] Resend — read-only access (for delivery debugging)
- [ ] Cloudflare — Administrator access
- [ ] Claude Team workspace — accept invite; install Claude Code CLI;
      run `claude login`
- [ ] Slack — accept; SSO via Workspace
- [ ] Attio — accept invite
- [ ] Calendly — accept (so client-call bookings can route to her)
- [ ] Sentry — accept
- [ ] Linear/Notion — when those exist
- [ ] Local install: clone `lifeupriver/upriver-clone`,
      `pnpm install && pnpm build`, `cd packages/cli && npm link`,
      copy `.env.example` to `.env`, paste from 1Password,
      `upriver doctor` returns all-green
- [ ] Read `docs/TEAM-WORKFLOW.md` end-to-end

### 8.3 Zach (`content@`)

Same as Anne-Marie's list except:
- Supabase: read-only at first, upgrade later
- Vercel: Member, not Developer (he ships content + automations,
  not core infra)
- Add: **Cloudinary** (image asset management for blog/video work)
- Add: **Riverside** or **Descript** (video / podcast editing — for
  F12 video-audit deliverables)
- Add: **Frame.io** if we do client-facing video review
- Local install: same `upriver-clone` install steps. He should be
  comfortable opening his own PRs against the repo for automation
  and content code.

### 8.4 Megan (`office@`)

Most-restricted list — ops/admin, not engineering:

- [ ] Google Workspace — accept; she already has the inbox
- [ ] 1Password — accept (Operations vault only)
- [ ] Slack — accept
- [ ] Attio — Editor access
- [ ] Calendly — accept (so she can manage Joshua's calendar if needed)
- [ ] Quickbooks — Standard user
- [ ] Stripe — read-only Dashboard access (for receipt reconciliation)
- [ ] Mercury — Bookkeeper access (no payment authority unless we
      decide otherwise)
- [ ] Vercel — Viewer
- [ ] Cloudflare — Billing
- [ ] **No** GitHub, Supabase, Fly, Inngest access

---

## 9. Budget summary

### One-time costs

| Item | Cost |
| --- | --- |
| LLC filing (NY) | $200 |
| NY publication (LLC requirement) | ~$1,000-1,500 |
| Operating agreement | $0-200 |
| EIN | $0 |
| DBA (optional) | $25-100 |
| Insurance setup | $0 (premium is recurring) |
| **Total one-time** | **~$1,300-2,000** |

### Recurring monthly run rate (4 people, all team-tier)

| Service | Cost / mo |
| --- | --- |
| Google Workspace Business Standard ($12 × 4) | $48 |
| 1Password Teams Starter Pack | $20 |
| Claude Team ($25 × 4) | $100 |
| GitHub Team ($4 × 4) | $16 |
| Vercel Pro ($20 × 4) | $80 |
| Supabase Pro | $25 |
| Fly.io (worker app) | ~$10-30 |
| Inngest (free tier covers MVP; Team later) | $0 → $40 |
| Resend Pro | $20 |
| Slack Pro ($8.75 × 4) | $35 |
| Attio Plus ($29 × 4 — or stay on free for 3 users) | $0 → $116 |
| Calendly Team ($16 × 4) | $64 |
| Cloudflare DNS | $0 |
| Quickbooks Online Simple Start | $30 |
| Sentry (free tier) | $0 |
| Status page (Instatus) | $20 |
| Backblaze B2 | ~$5 |
| **Subtotal SaaS** | **~$475/mo @ free Attio, ~$590/mo @ paid Attio** |

### Recurring annual costs

| Service | Cost / yr |
| --- | --- |
| Domain renewal | $10 |
| LLC biennial fee (NY, every 2 years) | $25 |
| E&O + GL insurance | $400-1,200 |
| Tax filing (CPA) | $500-1,500 |
| **Annual total** | **~$1,000-2,800** |

### What's NOT in this budget yet (decide as we grow)

- Linear ($8/user/mo)
- Notion ($10/user/mo)
- Cloudinary ($89/mo when we exceed free tier)
- Toggl ($10/user/mo)
- Ahrefs / Semrush (current SEO tooling — already used in
  `marketingskills` library; check what tier we need)
- Loom / Descript / Riverside (for Zach's video work)
- Stripe fees (2.9% + 30¢ per transaction; not really a fixed cost)
- Mercury checking ($0/mo — free)
- Ramp cards + spend management ($0/mo — Ramp earns interchange, no
  user fee on the free tier)
- Contractor pay (Anne-Marie + Zach 1099s): variable, billed against
  client work. Not a fixed monthly run-rate cost.
- Legal: ~$300-500 one-time for the first 1099 services agreement
  draft; subsequent contractors reuse the template.

**Year-one all-in:** ~$8,000-12,000 in tools + setup. Roughly the
margin on 2-3 audits-only or 1 rebuild engagement. Manageable.

---

## 10. Timeline (waves, not dates)

- **Week 1:** LLC + EIN + bank + card (in parallel: domain to
  Cloudflare, Workspace stood up)
- **Week 2:** Engineering migration (GitHub, Vercel, Supabase, Fly,
  Inngest, Resend, Anthropic, Backblaze)
- **Week 3:** Business ops (Stripe, Calendly, Attio, Quickbooks,
  status page, Sentry)
- **Week 4:** Onboarding Anne-Marie and Zach; Megan migration to
  Workspace fully complete; first new client engagement under the
  new infra end-to-end
- **Week 5+:** Roadmap (Phase 4 build items) prioritized in the
  weekly Monday sync

The LLC publication requirement (NY-specific) is 6 weeks
background-running and doesn't block anything.

---

## 11. Open decisions (Joshua, please confirm)

These were assumed in the doc; flag if any are wrong. Items resolved
in conversation are removed.

1. **Email scheme**: confirm `dev@` for Anne-Marie and `content@`
   for Zach (vs personal aliases like `anne-marie@` / `zach@` —
   I recommend role aliases for transferability, but it's a call
   you might want to make differently).
2. **Workspace tier**: Standard ($12/user) vs Starter ($6/user).
   Doc assumes Standard for unlimited shared drives + Meet
   recording.
3. **CRM choice**: Attio (recommended) vs HubSpot Free vs
   Pipedrive. Attio fits an agency model best; Pipedrive cheaper.
4. **Accounting**: Quickbooks vs Xero vs Wave. Doc assumes
   Quickbooks Online — most CPAs default to it.
5. **Vercel tier**: Pro at $20/user. We could stay on Hobby (free)
   per-developer for a while; Pro unlocks team analytics and
   higher limits. Recommend Pro because the dashboard runs
   production traffic.
7. **Bank**: Mercury vs Chase Business. Mercury is faster to open
   and better DX; Chase has branches if you ever need a cashier's
   check.
8. **Insurance carrier**: Hiscox / Next / Embroker / a local broker.

---

## 12. TL;DR for whoever's stressed reading this

```
Week 1: form Upriver Hudson Valley LLC, EIN, Mercury, Chase Ink card.
Week 2: domain to Cloudflare; Workspace; 1Password; migrate every
        engineering account from Joshua-personal to Upriver-org.
Week 3: Stripe, Attio, Quickbooks, Calendly, status page.
Week 4: onboard Anne-Marie + Zach + Megan with the per-person checklists
        in §8.

After that: Joshua signs nothing in his personal name for Upriver
work, every team member logs in as *@upriverhudsonvalley.com, and
the pile of "what does Joshua's personal Gmail unlock" disappears.
```

That's the plan.
