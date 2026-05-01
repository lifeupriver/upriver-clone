# Upriver — Organization Setup Playbook

This document explains how Upriver moves from a sole-proprietor proof of concept into a properly run small agency. It is a one-time setup guide that complements `docs/TEAM-WORKFLOW.md` (which covers day-to-day collaboration once the company is set up). It is meant to be read top to bottom and used as a working checklist. A companion document, `docs/SETUP-PROMPTS.md`, contains the Claude Code and Cowork prompts that automate most of the technical work below.

## Audience

This document is written for Joshua as the person doing most of the setup. Anne-Marie is brought in for the technical migration steps; Megan is brought in for the business-operations onboarding. Future hires (Zack joining for video work, others later) follow the per-person template at the end.


## The team today

Upriver is currently three people.

**Joshua** is the founder. He runs sales, holds client relationships, generates content, and makes the financial and strategic decisions. His mailbox is `joshua@upriverhudsonvalley.com`. He owns every account.

**Anne-Marie** is the lead developer. She is responsible for the web rebuild work that sits at the core of every engagement and for helping Joshua build out Upriver's internal tooling. She works as a 1099 subcontractor, with a side-letter giving her first-right-of-refusal on paid web work that Joshua's pipeline produces. Her mailbox is `dev@upriverhudsonvalley.com`.

**Megan** is the operations and administration lead. She handles the office-side of the business: client communications, calendar, billing reconciliation, vendor invoices, and other ongoing administrative work. She is the only team member currently on regular pay. Her mailbox is `office@upriverhudsonvalley.com` (it already exists today).

Zack is expected to join later in a focused video-production role; that addition is out of scope for this setup. Group aliases are defined further down in this document so that future additions inherit access cleanly.


## The two governing principles

Two rules shape every decision in the rest of this playbook.

**Every login uses an `@upriverhudsonvalley.com` identity.** Personal-account logins for company tools are never created, and existing ones are migrated. When someone leaves, suspending their Workspace user revokes their access to every service tied to that identity. When the company is audited, sold, or takes investment, the ownership trail is clean. We are never one personal-Gmail-recovery-flow away from losing the business. This is the single most important rule in the document.

**Every tool we adopt must be operable by Claude.** Concretely: each tool ships either an MCP server, an official CLI, or a public API we can wrap in our own MCP server. Most of Upriver's actual work runs through Claude — through the upriver CLI, the dashboard's agent flows, and the headless `claude` features. Every tool that cannot be operated by Claude is a piece of work that has to live in a human's head and clicks. We accept rare gaps consciously and put "build an MCP adapter" on the backlog.

A practical corollary follows from these two principles: wherever a setup task can be done by Claude Code (with MCP and CLI access) or by Cowork (with browser automation), we delegate the task. Setup work that genuinely requires a human is limited to identity verification and signing — opening a bank account, signing the LLC paperwork, accepting Workspace administrator on a phone with biometric verification. Everything else is Claude work, captured in `docs/SETUP-PROMPTS.md`.


## Tooling principles in practice

Because we are at the very beginning of growing into a real company, the default for every paid tier choice in this playbook is **start on the free tier and upgrade only when we hit a real limit**. We have a small handful of clients today, three operators, and a clear path to validate the upgrade decision later.

For the same reason, we prefer building small custom tools inside the existing `upriver-clone` monorepo over subscribing to single-purpose SaaS for things we can build in a day or two. Time tracking and scheduling fall into that category and are listed in the build-roadmap section rather than as line items in the budget.


---


# Phase 0 — Legal foundation

This phase exists because every business-tier account in Phases 1 through 3 expects a legal entity, an EIN, and a card on file in the entity's name. None of the rest of the playbook can run cleanly until this is done. Joshua personally funds the setup costs in this phase; once the business banking is open, the LLC reimburses Joshua from the operating account.

## Form the entity

Form **Upriver Hudson Valley LLC** in New York. The mechanical filing is done through the New York Department of State Division of Corporations website, or via a service like Northwest Registered Agent or LegalZoom that handles filing and the New York-specific publication requirement together. The base filing fee is $200, and the LLC is required to publish a notice in two newspapers in the county of formation within 120 days; published-notice costs are typically $500 to $2,000 depending on the county. Northwest's filing service handles the publication for a flat add-on fee and is the recommended path. The biennial state fee is $25 every two years.

Apply for the **EIN** directly on the IRS website at irs.gov/ein. This is free, takes ten minutes, and the EIN is issued in the same session.

Draft a single-member **operating agreement**. Northwest provides one for free; LegalZoom's template is also fine. This document does not get filed publicly but is needed when opening the bank account.

If you want to operate publicly under "Upriver" rather than "Upriver Hudson Valley LLC," register a **DBA** at the relevant New York county clerk's office. This is twenty-five to a hundred dollars and a one-day filing.

## Open business banking

Open **Chase Business Complete Checking** in the LLC's name using the EIN and operating agreement. The monthly fee is $15 and is waived with a $2,000 average ledger balance, which should be the case in normal operation. Apply for the **Chase Ink Business Cash** card under the same entity. The card has no annual fee and earns 5% cash back on internet, phone, and cable up to $25,000 a year, which captures most SaaS billing. Joshua holds the card; Anne-Marie and Megan do not carry company cards.

## Accounting and insurance

Sign up for **Kick** at kick.co for bookkeeping. Kick is built for solo and small-team operators, integrates directly with Chase via Plaid, auto-categorizes transactions, and handles the tax workflow at year-end. It is significantly less work to operate than Quickbooks for a business at this stage and works well for a non-bookkeeper to keep current.

Get **General Liability and Professional Liability (Errors & Omissions)** insurance. Any agency that builds websites for clients carries E&O. Hiscox, Next Insurance, and Embroker are the usual options for small agencies; expect $400 to $1,200 a year combined. Higher limits cost more but the baseline is enough for early engagements.

## Contractor agreement

Engage an attorney to draft the base **1099 services agreement** that Anne-Marie signs and that Zack will eventually sign as well. The contract should cover scope of services, hourly or per-project rates, IP assignment to Upriver Hudson Valley LLC for any work product, confidentiality, and a no-non-compete clause appropriate to New York contractor law. A side letter for Anne-Marie documents the working-equity arrangement: she invests time in Upriver's infrastructure now (not only on billed engagements), and in return she gets first-right-of-refusal on paid web and development work for a defined number of hours of paid engagement, with a checkpoint at month six or twelve to revisit either a retainer or W-2 conversion if Upriver's revenue supports it. Allow $300 to $500 for the first attorney draft; subsequent contractors use the same template.

## Output of Phase 0

At the end of Phase 0, Upriver Hudson Valley LLC exists, has an EIN, has a Chase business checking account and a Chase Ink card, has Kick set up for bookkeeping, has E&O insurance bound, and has signed contractor agreements with Anne-Marie. From this point forward every account in Phases 1 through 3 is opened under the LLC's name with the company card on file.


---


# Phase 1 — Identity foundation

This is the layer that everything else sits on. The principle of one identity (`@upriverhudsonvalley.com` for every login) becomes mechanically true here.

## Domain and DNS

Sign up for **Cloudflare** using `joshua@upriverhudsonvalley.com` and add `upriverhudsonvalley.com` as a zone. The domain is currently registered through Google Domains (now Squarespace Domains since Google's exit from the registrar business); change the nameservers at Squarespace to point at Cloudflare's two name servers. Propagation usually completes within an hour. Once Cloudflare is authoritative, transfer the registration itself to Cloudflare for ten dollars a year, which removes the Squarespace login from the surface entirely.

The subdomain plan worth establishing now, even where the underlying service does not yet exist, is the following: `upriverhudsonvalley.com` is the marketing site (already live); `app.upriverhudsonvalley.com` is the operator dashboard, currently `upriver-platform.vercel.app`; `reports.upriverhudsonvalley.com` already serves client share links; `crm.upriverhudsonvalley.com` will eventually point at Attio's custom-domain feature; `api.upriverhudsonvalley.com` is reserved for a future public API; `status.upriverhudsonvalley.com` will host the BetterStack status page; `docs.upriverhudsonvalley.com` is reserved for internal and public methodology documentation.

Once Cloudflare is set up, invite Anne-Marie as Administrator and Megan as Billing.

## Email and productivity

The default recommendation is **Google Workspace Business Starter** at six dollars per user per month, three users, totaling eighteen dollars a month. Workspace gives us Gmail at the custom domain, Calendar with shared scheduling, Drive with collaborative document editing, Meet with screen recording for client interviews, an admin console for governance, and the broadest integration ecosystem of any productivity suite. Domain verification is a single TXT record in Cloudflare; the MX records replace any prior email routing.

The strongest alternative worth considering is **Fastmail** at five dollars per user per month for the Standard tier, or nine dollars per user for the Professional tier with the larger mailbox. Fastmail handles email, calendar, and contacts at a custom domain extremely well and is the most respected non-Google, non-Microsoft email host. Because the entire Upriver team is on Macs, Fastmail pairs naturally with iCloud Drive for storage, Apple Calendar for scheduling, and Pages/Numbers/Keynote for documents. The trade-off is that we lose Drive's collaborative-editing model (real-time multi-cursor editing of the same document) and Workspace's admin console, and we pick up some seams between providers. If we expect to do a lot of multi-author document work with clients, Workspace remains the easier choice; if we expect mostly read-and-comment client document flows, Fastmail-plus-iCloud is cheaper, more private, and more aligned with the all-Mac team.

The recommendation for the initial setup is Workspace Starter, with a planned re-evaluation at month six.

Once the chosen email provider is up, create the user accounts (`joshua@`, `dev@`, `office@`) and the group aliases (`hello@` delivering to all three, `clients@` delivering to Joshua and Anne-Marie, `billing@` delivering to Joshua and Megan, plus the existing `noreply@` and `reports@` for the Supabase Auth and report-delivery flows already wired in `OPS.md`). On Workspace, also stand up shared Drives for Operations, Engineering, Clients (one folder per slug), and Brand & Marketing.

## Password management

Because the entire team is on Macs and on recent versions of macOS, the default plan is to use **Apple Passwords with a shared password group**. Apple Passwords supports shared groups since macOS Sonoma and iOS 17. Members of a shared group see and edit the same passwords; sharing is end-to-end encrypted; everything is included with iCloud at no extra cost. Set up one shared group called "Upriver" and one called "Upriver — Clients" so that per-engagement credentials can be scoped without giving everyone access to everything.

The fallback if Apple Passwords proves insufficient (for example, if we eventually need a non-Apple device on the team or finer-grained vault separation) is **Bitwarden Teams Starter** at four dollars per user per month for three users. Bitwarden gives us discrete vaults, audit logs, SSO via Workspace, and the `bw` CLI which integrates cleanly into shell workflows.

## Claude Team

Upgrade the existing personal Claude Max into (or sign up fresh as) a **Claude Team** workspace. Three seats at twenty-five dollars each is seventy-five dollars a month. Each operator signs in with their `@upriverhudsonvalley.com` identity and re-runs `claude login` on their machine; the headless `claude` CLI continues to drive the upriver pipeline as before, simply on the new workspace's billing.

## Internal communication

Sign up **Slack Free** with the team's three accounts. The free tier limits message history visibility to ninety days but is otherwise functional for an active team. Set up channels for general discussion, engineering, sales, and per-active-client conversations as they come up. Slack Pro is a known eventual upgrade once we want long-term searchable history; staying on Free until that pain is real keeps the monthly run-rate down.


---


# Phase 2 — Engineering migration

This phase moves every existing engineering asset from Joshua's personal credentials to Upriver-owned org accounts. The mechanics for each platform vary; the principle is the same.

## GitHub

The `lifeupriver` GitHub organization already exists, but its owner today is Joshua's personal GitHub user. Best practice for a small team using the Free tier is the following.

Joshua adds his `joshua@upriverhudsonvalley.com` address to his existing personal GitHub user as a verified email; the GitHub user itself does not need to change identity. He then sets the organization billing email to `billing@upriverhudsonvalley.com`. The organization stays on the **Free** plan at this team size; the Free tier supports unlimited public repositories and unlimited private repositories with up to three collaborators on private repos, which is exactly our shape.

Inside the org, create a single team called `operators` with Anne-Marie as a member. Configure the organization-level default repository permission so that the `operators` team is granted **Write** by default on every new repository. This is what makes `upriver scaffold github <slug>` work without per-repo permission edits when a new client repo is created. Add Megan as an outside collaborator only on documentation repositories where her input is needed; she does not need general engineering access.

Branch protection on `lifeupriver/upriver-clone` `main`: require pull request before merge, require the typecheck and build status checks to pass, and disable force pushes. With one reviewer of record on a two-developer team this is realistic and not blocking. Configure CODEOWNERS so that Anne-Marie owns `packages/` and Joshua owns `docs/`. Enable Dependabot security updates so dependencies do not rot.

## Vercel

Create a new **Vercel team** named "Upriver Hudson Valley" using `joshua@upriverhudsonvalley.com`. Stay on the **Hobby (free) tier** for this team while the project count is small; Vercel allows commercial use on the free tier for non-revenue-generating sites and the dashboard plus a few client preview deployments fit comfortably. Vercel Pro at twenty dollars per user per month becomes worth it once we hit the bandwidth or build-minute caps, or once we want team-level analytics; mark that as a known upgrade trigger.

Transfer the `upriver-platform` project and any per-client `<slug>-site` projects from Joshua's personal Vercel team to the new Upriver team. Vercel makes this a single-button operation with no downtime as long as the GitHub connection is re-authorized to the new team. After the transfer, re-paste environment variables (Vercel does not move them with the project) from Apple Passwords into the new team. Add `app.upriverhudsonvalley.com` as a custom domain for `upriver-platform`; the DNS record is a single CNAME in Cloudflare.

Anne-Marie joins as a Member; Megan joins as a Viewer for billing visibility only. The engineering best practice on the free tier is to use Preview deployments for every PR (which is the default), keep the `main` branch deployment as production, and disable any feature that requires a paid tier (such as Edge Config or Speed Insights at the Pro tier).

## Supabase

The Supabase project `qavbpfmhgvkhrnbqalrp` currently lives under Joshua's personal Supabase organization. Open a support ticket with Supabase asking to transfer this project to a new "Upriver Hudson Valley" organization; Supabase typically does this within a couple of business days at no cost. If the support flow stalls, the alternative is creating a new project under the new org, running every migration in `supabase/migrations/`, exporting and re-importing auth users and bucket contents, and rotating the URL and keys everywhere they appear; this is a longer maintenance window and should only be the path if the in-place transfer fails.

The project stays on the **Free tier** while we are at this scale. The free tier covers the storage we use, the modest auth volume, and the database size we are at today. Supabase Pro becomes worth it only when we want daily backups (which Free does not provide) or when we exceed the free auth or storage limits; that is a known upgrade trigger but not a current need.

After the org transfer, Joshua remains owner, Anne-Marie joins as Developer, Megan does not join. The bucket name `upriver` and the `clients/<slug>/` path layout remain the same. Existing tables (`share_tokens`, `dashboard_events`, `usage_log`) come along with the project transfer.

## Worker, queue, email, and storage

The remaining engineering services (Fly.io, Inngest, Resend, Backblaze B2) all have rich official CLIs. The MCP-first principle is satisfied by their CLIs; we are not building MCP wrappers for any of them. The migration steps below assume the CLIs are installed locally on Anne-Marie's and Joshua's machines.

**Fly.io.** Create a new Fly organization called `upriver-hv` using `joshua@`. Run `fly apps move upriver-worker --org upriver-hv` to move the existing worker app to the new org. Re-set the secrets listed in `OPS.md` using `fly secrets set` once the move is complete. Anne-Marie joins as a member; Megan does not. Hook the new org's billing to the Chase Ink card.

**Inngest.** Create a new Inngest org "Upriver" using `joshua@`. Recreate the `upriver-worker` app in the new org and obtain new event and signing keys. Update `INNGEST_EVENT_KEY` and `INNGEST_SIGNING_KEY` in Vercel, in Fly, and in the team's Apple Passwords vault. Wire failure notifications into the Slack `#alerts` channel via Inngest's built-in Slack integration. Stay on the free tier; the Team upgrade at forty dollars a month is not needed until function runs exceed the free quota.

**Resend.** Create a new Resend org "Upriver" using `joshua@`. Re-verify `upriverhudsonvalley.com` as a sending domain — Cloudflare auto-creates the required DKIM and SPF CNAME records in about five minutes. Generate fresh API keys, rotate them everywhere they are used, and update Supabase Auth's SMTP settings per `OPS.md` so sign-in emails route through the new account. Verify by signing into the dashboard. The free tier covers our current send volume; upgrade to the twenty-dollar Pro tier when we approach the daily send cap or want a dedicated IP.

**Backblaze B2.** Create a Backblaze B2 account using `joshua@`. Recreate the bucket the CLI's archive command writes to. Re-paste credentials into Apple Passwords and `.env.example`. The B2 CLI handles every operational task we need; no MCP wrapper required.

## Anthropic API key

A few CLI features still call the Anthropic SDK directly with an API key (the `UPRIVER_USE_API_KEY` flag in the README). For these, create a workspace under the Upriver Anthropic Team org, generate a fresh `sk-ant-...` key for the workspace, store it in Apple Passwords under the engineering group, rotate any existing personal-account API key off, and update each operator's local `.env`. Most LLM-backed features in the upriver pipeline use the operator's headless Claude Team session and do not need this key, but the few that do should be cleanly attributed to the LLC.

## Video, content, and SEO accounts

Three more service accounts get opened under the LLC during this phase because they are core to the work, not optional add-ons.

**Cloudinary** is the asset pipeline for client images. Create an Upriver account on the free tier. Cloudinary's free tier covers twenty-five gigabytes of storage and twenty-five gigabytes of monthly bandwidth, which is enough to store and serve assets for a handful of small-business clients. The `mcp__7975e32e-...` Cloudinary MCP server is already wired in our development sessions. Anne-Marie and Joshua are both members; the API credentials live in Apple Passwords.

**Mux** handles video hosting and analytics for any client work that includes video on the rebuilt site, and for Upriver's own marketing video work. Sign up using `joshua@`. The Mux video MCP is also already wired in our development sessions, and there is a `mux` CLI for one-off operations. Mux has no free tier in the strict sense; it is pay-as-you-go and the cost on a small-business site is typically a few dollars a month.

**Remotion** is a programmatic video tool — it lets us produce short videos as React code, which is useful both for client deliverables (animated explainers, social cuts) and for Upriver's own marketing content. Remotion is open-source and self-hosted; the only paid component is the optional cloud-render service. Add Remotion as a development dependency in the monorepo when the first video deliverable lands; no account setup is required for the open-source library itself.

**Ahrefs** is the SEO data provider. The current `marketingskills` audit passes can use Ahrefs data when an account is configured. Sign up for **Ahrefs Lite** at $129 a month under the Upriver name; this is the smallest paid tier and it gives us domain rating, backlink, and keyword data for the audit passes. Joshua and Anne-Marie share the seat; the credentials live in Apple Passwords.

**Loom** is the screen-recording tool for sales demos, client walk-throughs of audit findings, and internal handoffs. Loom Starter is free and includes up to twenty-five videos per person; Loom Business is fifteen dollars per user per month for unlimited videos and improved analytics. Start on Starter for all three operators; upgrade as soon as anyone hits the limit, which happens quickly in practice.


---


# Phase 3 — Business operations

This is the layer that turns infrastructure into a business: how we get paid, how we book meetings, how we keep track of clients, how we know what is broken.

## Stripe

Sign up Stripe with the LLC's name and EIN. Bank-link to Chase Business Complete Checking via Plaid. Create products that match the engagement structure documented elsewhere: an audit-only engagement at a flat fee, audit-plus-rebuild at a flat or staged fee, a retainer for ongoing monitor and follow-up work as a monthly subscription, and the standalone deliverables (voice guide, schema build, blog topics, video plan, custom-tools proposal) as one-time line items.

Wire a Stripe webhook into the dashboard at `packages/dashboard/src/pages/api/stripe/webhook.ts` so that paid invoices automatically progress an engagement to the next phase, and so that `billing@` receives copies of every receipt. Turn on Stripe Tax and have the accountant sort out New York's specific position on website-build services at year end.

The Stripe MCP server is mature and well-documented; once the products and webhook are configured, ongoing operations (refunds, customer adjustments, invoicing edge cases) can be done via Claude rather than through the Stripe dashboard.

## Attio (CRM)

Sign up `attio.com` with `joshua@upriverhudsonvalley.com`. Stay on the **Attio Free tier**, which supports up to three users — exactly the team's current size. The free tier gives us the full data model, integrations, and pipeline views; it caps the number of records and removes some advanced reporting that we do not need yet. The known upgrade trigger is when we exceed the record cap or add a fourth user; that is a $29 per seat per month decision, deferred.

The data model worth setting up early covers four objects: Companies (the prospect or client business), People (the decision makers and contacts inside each company), Engagements (one record per `<slug>` we work on, referencing the GitHub repo, the dashboard URL, the Stripe customer, and the current pipeline phase), and Deliverables (each sellable line item the client has bought or could buy). Two pipelines run on top of these objects: the Sales pipeline runs from initial conversation through audit-purchased, rebuild-signed, live, and retainer; the Engagement pipeline mirrors the CLI pipeline from `init` through `launch`.

Connect Gmail (via Workspace) so incoming and outgoing email automatically attaches to the right contact and company, connect Stripe so paid invoices flip an engagement stage, and stand up a custom webhook from the dashboard so that `upriver init <slug>` creates a new Engagement record automatically. The Attio integration code lives in `packages/core/src/integrations/attio.ts`.

There is a community Attio MCP server worth evaluating; if it is thin, we build `@upriver/mcp-attio` ourselves (see the build roadmap below).

## Bookkeeping

**Kick at kick.co** handles the bookkeeping. Sign up using the LLC name and EIN. Connect Chase Business Complete Checking and the Chase Ink card via Plaid; transactions auto-pull and Kick auto-categorizes them with tax-aware logic. Connect Stripe so paid invoices auto-create deposits. Joshua is the admin; Megan gets standard access for day-to-day reconciliation. Year-end tax handoff is significantly less work than Quickbooks at this stage; the accountant can be brought in directly through Kick if desired.

## Status, errors, and observability

**BetterStack** is the status page and uptime monitor at `status.upriverhudsonvalley.com`. The free tier covers the monitor count we need: the dashboard health endpoint, the worker health endpoint, the reports subdomain, and the homepage of each per-client `<slug>-site` we have shipped. Slack `#alerts` integration on the same free tier.

**Sentry** is error tracking for the dashboard (Astro) and worker (Express). Sign up for the free tier under `joshua@`; invite the team. Wire Sentry into both packages and configure source-map upload on every Vercel and Fly deploy. The free tier covers a small monthly error volume which is plenty for current usage.

## Issue tracking

**GitHub Projects** is the issue tracker. We do not bring in Linear at this size; GitHub's built-in projects view is sufficient and has the advantage of being tightly coupled to the place where the work actually happens. Set up one project named "Upriver — All" that pulls in issues from `upriver-clone` and from each per-client `<slug>-site` repository. Configure swimlanes by status (backlog, in progress, in review, done) and labels by client slug.

The known upgrade trigger to Linear is when we have more than two engineers, more than ten active issues across the team at once, and the GitHub Projects view is genuinely getting in the way. We are nowhere near that point.


---


# Phase 4 — What we build next

The minimum viable product is shipping: the upriver CLI, the operator dashboard, and the F01 through F12 pipeline features. With a real organization and real working capital, the next investments are in custom internal tooling — small, focused, owned by us — that compounds the team's leverage rather than adding to monthly SaaS spend.

## The custom MCP server suite

The single highest-leverage build investment is a small library of MCP servers that expose Upriver's data and operations to Claude. The audit in the principles section identified a handful of gaps and a handful of high-value places where wrapping our own data behind an MCP interface multiplies the team's effectiveness. The full list:

**`@upriver/mcp-pipeline`** — exposes the entire upriver CLI as MCP tools. When this exists, Joshua working in Claude Code can say *"start a new audit on Audrey's Farmhouse"* and Claude calls `upriver init`, then `upriver scrape`, then `upriver audit`, then `upriver synthesize` in sequence — surfacing each command's output back into the conversation rather than requiring Joshua to alt-tab. Anne-Marie, working through a complex client's fixes-apply phase, uses Claude as the operator: she can say *"apply the next three P0 findings on littlefriends and open the PRs"* and let Claude handle the orchestration. This server is trivial to build because the CLI already has structured arguments and JSON output flags. It is the highest-leverage server in the set and the first one to build.

**`@upriver/mcp-engagements`** — read-only over the Supabase tables (`engagements`, `usage_log`, `dashboard_events`, `share_tokens`). This is the answer to every status question. Joshua asks Claude *"where are we on audreys?"* and Claude returns the current pipeline phase, the time since the last advance, the active operator, and any P0s that have been logged. Megan asks *"which clients are due to invoice this week?"* and gets a list with Stripe customer IDs ready to act on. Joshua asks *"which engagements have stalled in the audit phase for more than two weeks?"* and gets exactly that. Build alongside `mcp-pipeline`.

**`@upriver/mcp-attio`** — wraps Attio's REST API for the workflows the community MCP does not handle well. After a sales call Joshua tells Claude *"log a thirty-minute discovery call with Audrey from yesterday, mark them ready-for-proposal, schedule a follow-up Tuesday"* and Claude updates the Attio records accordingly. Megan asks *"show me every Hudson Valley wedding venue we have talked to but have not sent a proposal to"* and gets a list. The build versus adopt decision depends on what the community MCP supports; assume we build at least a thin wrapper to fill gaps.

**`@upriver/mcp-content`** — searches across all client work in the bucket and the local `clients/` directories. This is where the team's collective experience becomes searchable. Joshua starting a new wedding-venue engagement asks Claude *"summarize the voice-guide patterns we landed on across our last three wedding clients"* and Claude returns a comparative summary drawn from each `voice/` directory. Anne-Marie debugging an unfamiliar clone-fidelity issue asks *"have we hit this before?"* and Claude finds the answer in a prior client's `qa-report.md`. Zack, when he is brought in for video work, asks *"what shotlist patterns have worked for hospitality businesses?"* and gets a synthesis from prior `video-audit/` directories.

**`@upriver/mcp-scheduling`** — wraps the home-grown scheduling tool we are building in place of Calendly. Operator-side, when Joshua tells Claude *"find me thirty minutes Tuesday afternoon for an Audrey call,"* Claude queries the scheduling database, checks calendar availability, books the slot, and emails the calendar invite. Client-side, the tool exposes a public booking page at a per-event-type URL where prospects can self-serve. The home-grown tool is small — a handful of database tables, a public booking page, calendar integration via the Workspace or iCloud APIs — and it removes a recurring SaaS line item.

**`@upriver/mcp-time`** — wraps the home-grown time-tracker we are building in place of Toggl. The CLI surface is `upriver time start <slug>` and `upriver time stop`, with structured tags for the engagement phase. The MCP surface lets the team simply tell Claude *"log two hours on littlefriends fixes-apply"* and the row gets written. End-of-week, Joshua asks Claude *"how many billable hours did we log on each engagement this week?"* and gets a summary that feeds the invoicing flow.

**`@upriver/mcp-routines`** — wraps Claude Routines, which is the scheduled-recurring-Claude-task primitive that replaces the n8n / Zapier role for our purposes. A routine is a Claude conversation that runs on a schedule with a fixed prompt and tools. Use cases include the weekly monitor delta report (already a CLI command, becomes a routine that runs every Monday and emails the operator), the every-Friday "what landed this week" digest (queries `usage_log`, summarizes), and the every-evening client-portal-events digest (any client-side approvals in the past 24 hours, surfaced into Slack). The MCP wrapper lets us create, edit, and inspect routines from Claude itself.

These seven servers ship as packages inside the existing monorepo (`packages/mcp-<name>/`), publish to a private npm scope, and are wired into each operator's `~/.claude/mcp.json` so the surface is identical for everyone on the team.

## Custom internal tools

A few tools are worth building inside the dashboard (rather than subscribing to) because they are tightly coupled to our data model and the build is cheap.

**Custom scheduling.** A small set of database tables for event types and bookings, a public booking page styled to match the marketing site, and a calendar integration that holds free/busy from each operator's Workspace or iCloud calendar. Replaces Calendly's twelve-to-sixteen-dollar-per-user-per-month subscription with a tool that lives at `app.upriverhudsonvalley.com/book/<event-type>` and integrates natively with the engagement records. A few days of work for Anne-Marie.

**Custom time tracking.** Two database tables (entries and engagements), a CLI surface, a dashboard view, and an export to the invoicing flow. The MCP wrapper makes it agent-driven. Replaces Toggl. Half a day of work.

**Profitability dashboard.** A view inside the operator dashboard that pulls together time-tracker hours, Stripe revenue, and the LLM cost rows from `clients/<slug>/token-and-credit-usage.log`, surfacing revenue minus labor cost minus API cost as a per-engagement margin. This is the tool that tells us which client types and engagement shapes actually make money. Builds on top of the home-grown time tracker.

**Public client portal.** Today, share-links on `reports.upriverhudsonvalley.com` are unauthenticated tokens. The eventual upgrade is a logged-in client view at `app.upriverhudsonvalley.com/c/<slug>` where the client sees their deliverables, sees pending approvals (the fixes-plan-scope sign-off, for example), can submit change requests that the F05 admin webhook handles, and can comment on individual audit findings inline. This is a multi-week project that becomes worth doing once we have ten or so clients on retainer.

## Marketing site enhancements

The marketing site at `upriverhudsonvalley.com` is live; this is not a from-scratch build. The investments worth making on top of it include drawing case studies automatically from the `clients/<slug>/followups/case-study.md` outputs that `upriver followup` already produces, building a public methodology page from the F09 gap-analysis content, and adding the home-grown scheduling tool's booking pages where the existing site has contact forms.


---


# Migration runbook

The runbook below describes the order of operations rather than assigning each task to a person. Anne-Marie handles the technical migration steps that require an engineer; Joshua handles every step that involves a legal entity, identity verification, or money. Many of the technical steps can be partially or fully automated through Claude Code (with MCP and CLI access) or through Cowork (with browser automation). The companion document `docs/SETUP-PROMPTS.md` contains the prompts that drive that automation.

## Wave 1 — Legal and banking

File the LLC paperwork; apply for the EIN; open Chase Business Complete Checking and the Chase Ink Business Cash card; engage an attorney to draft the base contractor agreement. These are exclusively human tasks involving identity verification and signing. Total active time is roughly three hours over a week, with the LLC publication requirement running in the background for six weeks.

## Wave 2 — Domain, identity, and password management

Move `upriverhudsonvalley.com` from Squarespace Domains to Cloudflare and transfer the registration. Stand up Workspace (or Fastmail-plus-iCloud, depending on the email decision) and create the user accounts and groups. Set up the Apple Passwords shared groups (or Bitwarden Teams, if that path is chosen). Sign up Claude Team and re-authenticate the headless `claude` CLI on each machine. Sign up Slack Free and create the channels. Roughly four hours of work, mostly automatable through Cowork once the domain is in Cloudflare.

## Wave 3 — Engineering migration

Migrate the GitHub organization billing, configure the `operators` team and default permissions, set branch protection. Create the new Vercel team and transfer projects. File the Supabase support ticket for project transfer (or run the new-project migration if support stalls). Move the Fly app to the new org. Create the new Inngest, Resend, Backblaze, Cloudinary, Mux, Ahrefs, and Loom accounts and rotate keys. Roughly six hours of work; almost all of it can be driven through Claude Code with the corresponding MCPs and CLIs.

## Wave 4 — Business operations

Stand up Stripe with products and webhook. Set up Attio and the data model. Set up Kick and connect bank, card, and Stripe. Set up BetterStack monitors and Sentry projects. Roughly three hours of work; most of it is web-UI-driven and runs through Cowork.

## Wave 5 — Onboarding

Send Anne-Marie and Megan their per-person onboarding checklists. Run a full upriver pipeline end-to-end on a throwaway slug to verify the migrated infrastructure works. Decommission the old personal-account services after a five-day stability window. Roughly two hours of active work plus the validation pipeline run.

The full migration is realistically ten to fourteen elapsed days, with most days having only a handful of hours of active work because of waiting periods (LLC filing, bank account opening, Supabase support response).


---


# Per-person onboarding

## Joshua

Joshua's role through the migration is to handle every step that requires a legal entity or identity verification, and to verify access at the end. The post-migration check is straightforward: confirm that he can sign into every service from his `joshua@upriverhudsonvalley.com` identity, that his local `.env` matches Apple Passwords, that he has revoked or migrated every personal-account session that has now been replaced, and that Kick is reflecting current bank and card transactions correctly.

## Anne-Marie

Anne-Marie's onboarding is the technical onboarding. She accepts invites to Workspace, Apple Passwords (the shared groups), GitHub (with her existing GitHub username and `dev@` as a verified email), Vercel, Supabase, Fly.io, Inngest, Resend, Cloudflare, Claude Team, Slack, Attio, Cloudinary, Mux, Ahrefs, Loom, BetterStack, Sentry, and Stripe (read access). On her local machine she clones `lifeupriver/upriver-clone`, runs `pnpm install && pnpm build`, links the CLI globally (`cd packages/cli && npm link`), copies `.env.example` to `.env` with values from Apple Passwords, and verifies `upriver doctor` returns all-green. The final step is a read-through of `docs/TEAM-WORKFLOW.md`.

## Megan

Megan's onboarding is the operations onboarding. She accepts invites to Workspace, Apple Passwords (operations group only), Slack, Attio (Editor access), Calendar (so she can manage Joshua's scheduling when needed), Kick (standard user), Stripe (read-only), Chase (view-only access for reconciliation), Vercel (Viewer for billing visibility), and Cloudflare (Billing). She does not get GitHub, Supabase, Fly, Inngest, or any other engineering account.


---


# Budget summary

The budget below assumes the recommendations in this document and reflects the team at three operators, mostly on free tiers, with paid SaaS only where the work genuinely requires it.

## One-time

| Item | Cost |
| --- | --- |
| LLC filing (NY Department of State) | $200 |
| NY publication requirement | $1,000 to $1,500 |
| Operating agreement | $0 to $200 |
| EIN | $0 |
| DBA (optional) | $25 to $100 |
| First contractor agreement (attorney draft) | $300 to $500 |
| Domain transfer to Cloudflare | $10 |
| **Total one-time** | **roughly $1,600 to $2,500** |

## Monthly recurring

| Service | Cost / month |
| --- | --- |
| Google Workspace Business Starter (3 users) | $18 |
| Apple Passwords (with iCloud) | $0 (already paid) |
| Claude Team (3 seats) | $75 |
| GitHub Free | $0 |
| Vercel Hobby | $0 |
| Supabase Free | $0 |
| Fly.io (worker app) | $10 to $30 |
| Inngest Free | $0 |
| Resend Free | $0 |
| Slack Free | $0 |
| Attio Free | $0 |
| Cloudflare DNS | $0 |
| Cloudinary Free | $0 |
| Mux (pay-as-you-go) | $5 to $15 |
| Ahrefs Lite | $129 |
| Loom Starter | $0 |
| BetterStack Free | $0 |
| Sentry Free | $0 |
| Kick bookkeeping | $0 to $40 |
| Backblaze B2 | $5 |
| **Subtotal** | **roughly $240 to $290 per month** |

## Annual recurring

| Item | Cost / year |
| --- | --- |
| Domain renewal | $10 |
| LLC biennial fee (NY, every two years) | $25 |
| E&O and General Liability insurance | $400 to $1,200 |
| Tax filing (CPA) | $500 to $1,500 |
| Chase Business Complete Checking | $0 (waived with avg balance) |
| Chase Ink card | $0 |
| **Annual total** | **roughly $1,000 to $2,800** |

## Stays out of the run-rate until needed

Linear, Notion, Cloudinary paid tiers, Toggl, Loom Business, Slack Pro, Attio Plus, Vercel Pro, Supabase Pro, Stripe transaction fees (volume-based, not a fixed cost), contractor pay (variable, billed against client work, not a fixed monthly run-rate cost).

## Year-one all-in

Roughly $4,500 to $6,500 in tools and setup combined. That is approximately the margin on one or two audit-only engagements, or a fraction of one rebuild engagement. Manageable.


---


# Open decisions

A small number of decisions in this document were assumed rather than confirmed. Flag any of these that are wrong before the migration starts.

The first is the **email scheme**: the document assumes role-based aliases (`dev@`, `office@`) for Anne-Marie and Megan, with Joshua keeping his name-based alias because he is the public face of the business. The trade-off is that role aliases transfer cleanly when someone changes seats, while name aliases are more personal in client-facing email signatures. A defensible alternative is to give every team member a name-based alias and use the role aliases as forwards-only.

The second is the **email and productivity provider**: Workspace Starter is the recommendation, with Fastmail-plus-iCloud as the strong alternative. The document carries Workspace as the default; if Joshua wants to give Fastmail-plus-iCloud a real trial, the migration runbook needs about four extra hours and the Drive replacement needs to be settled.

The third is the **password manager**: Apple Passwords with shared groups is the default, with Bitwarden Teams Starter as the fallback. If we hit any non-Mac access need (a virtual machine, a contractor on Windows for any reason, a CI runner that needs vaulted secrets), Bitwarden becomes the better answer.

The fourth is **Ahrefs versus a smaller-tier SEO data provider**. Ahrefs Lite at $129 a month is the recommendation because the audit passes use SEO data heavily and Ahrefs has the cleanest data quality. If that monthly cost is uncomfortable until revenue ramps, we can fall back on free tools (DataForSEO, manual GSC, free-tier Semrush) and budget Ahrefs for after the first paid rebuild engagement.

The fifth is the **timing of the build investments in Phase 4**. The seven custom MCP servers and the home-grown scheduling and time-tracking tools are work — probably four to six weeks of Anne-Marie's time, spread across a couple of months alongside client work. If the prevailing constraint is shipping client engagements rather than building tooling, the build roadmap shifts later in the calendar.


---


# TL;DR

Form **Upriver Hudson Valley LLC**, get the EIN, open Chase business banking and the Chase Ink card. Move DNS to **Cloudflare**. Sign up Workspace (or Fastmail), Apple Passwords sharing, Claude Team, Slack Free. Migrate every engineering account from Joshua's personal credentials to Upriver-owned org accounts, almost all on free tiers. Stand up Stripe, Attio Free, Kick for bookkeeping, BetterStack, Sentry. Add Cloudinary, Mux, Ahrefs, Loom for the work the team actually does. Onboard Anne-Marie and Megan with the per-person checklists.

After that: every login is `*@upriverhudsonvalley.com`, every tool can be operated by Claude through MCP or CLI, and the next investment goes into the custom MCP suite and the small internal tools that compound the team's leverage rather than into more SaaS.
