# Claude Code & Cowork Prompts for Org Setup

This document is the companion to `docs/ORG-SETUP.md`. Where the org setup playbook describes *what* needs to happen, this document gives the actual prompts that drive the work through Claude. Most of the technical setup is delegated either to Claude Code (running locally with MCP and CLI access) or to Cowork (running autonomously in a browser).

## How this document is organized

Each section below corresponds to a setup task from the org playbook. For each task, three things are listed:

A **Claude Code prompt** is given when the task can be done locally with MCP servers or CLIs already installed on the operator's machine. Paste the prompt into a Claude Code session in the `upriver-clone` repository and let Claude execute. The prompt includes the verification steps Claude should run before declaring done.

A **Cowork prompt** is given when the task requires browser automation — usually because the relevant service has no MCP, no CLI, or only a web admin console. Paste the prompt into a Cowork session and let it drive a Chrome instance through the steps. Cowork prompts assume Joshua has already signed in to the relevant service in the agent's browser session, since many web admin consoles require multi-factor authentication that the agent cannot solve unattended.

A **Human-only steps** note is given for the parts of the task that genuinely require a person — identity verification, signing, biometric multi-factor authentication, and similar. Do not try to delegate these.

## Prompt-writing conventions

Every prompt in this document follows the same structure: a short context paragraph that briefs Claude on what we are doing and why, a numbered list of the steps to take, and an explicit verification step at the end so Claude reports back whether the task actually succeeded rather than just that it ran. Edit the prompts before pasting if your situation differs from the assumed defaults.


---


# Phase 0 — Legal and banking

## Form the LLC

**Human-only steps.** Filing the LLC requires Joshua's signature and identity verification. The fastest path is to use Northwest Registered Agent's online filing service, which handles both the New York Department of State filing and the New York publication requirement together. Allow about 30 minutes of Joshua's time.

**Cowork prompt** *(useful only for filling in the form, not for signing or paying):*

> I am setting up a new single-member LLC in New York State called "Upriver Hudson Valley LLC." Open Northwest Registered Agent's New York LLC filing form at northwestregisteredagent.com. Fill in the form with the following details: entity name "Upriver Hudson Valley LLC"; member name "Joshua [last name]"; principal office address [Joshua's business address]; registered agent service "Northwest Registered Agent"; New York publication add-on selected; expedited filing not selected. Stop at the payment step and ask me to take over for the credit card and signature. Do not click "Submit" or enter any payment information yourself.

## Apply for the EIN

**Human-only.** The IRS EIN application at irs.gov/ein requires a real person to identify themselves as the responsible party. It takes ten minutes and the EIN is issued in the same session.

## Open Chase business banking

**Human-only.** Both the checking account and the credit card application at Chase require Joshua to identify himself, provide the EIN, and pass identity verification. Chase usually requires a phone or in-branch step for new business banking customers.

## Sign up Kick for bookkeeping

**Cowork prompt:**

> Sign up for a new Kick account at kick.co using the email "joshua@upriverhudsonvalley.com" for Upriver Hudson Valley LLC. Walk through the onboarding flow: enter the LLC's legal name and EIN; connect Chase Business Complete Checking via Plaid (Joshua will complete the Plaid login when prompted); connect the Chase Ink Business Cash card via Plaid; set the fiscal year to calendar year; set the default tax filing structure to single-member LLC. Once the connections are live, run a sync and confirm that recent Chase transactions are appearing and being auto-categorized. Report back the dashboard URL and the count of synced transactions.


---


# Phase 1 — Identity foundation

## Move DNS to Cloudflare

**Claude Code prompt** *(uses the Cloudflare MCP):*

> We are moving upriverhudsonvalley.com from Squarespace Domains to Cloudflare. The Cloudflare account is already created at joshua@upriverhudsonvalley.com. Add upriverhudsonvalley.com as a zone in Cloudflare; let Cloudflare scan existing DNS records. Compare the imported records to what we expect (MX records pointing at the existing email host, the A record for the marketing site, the CNAME for reports.upriverhudsonvalley.com, and any A or AAAA records for app.upriverhudsonvalley.com). Identify any discrepancies and report them. Do not yet change the nameservers at Squarespace — that is a manual step Joshua will do once the imported records are verified. Output the two Cloudflare nameserver values for the manual nameserver swap.

**Cowork prompt** *(for the Squarespace nameserver change, which has no API):*

> Open Squarespace Domains and sign in (Joshua will complete the login). Find the upriverhudsonvalley.com domain. Change the nameservers from the current Squarespace defaults to the two Cloudflare nameservers I will paste below. Confirm the change is saved. Take a screenshot of the success state and report back.

## Add subdomains in Cloudflare

**Claude Code prompt:**

> In Cloudflare, on the upriverhudsonvalley.com zone, add the following DNS records: a CNAME for `app.upriverhudsonvalley.com` pointing at `cname.vercel-dns.com` (proxy off — Vercel manages the SSL); a CNAME for `status.upriverhudsonvalley.com` pointing at BetterStack's CNAME target (we will fill this in when BetterStack is set up — for now create a placeholder); a TXT record reservation for `api.upriverhudsonvalley.com` and `crm.upriverhudsonvalley.com` and `docs.upriverhudsonvalley.com` so we have the names reserved without active records. Verify each record by running a DNS lookup and report back the results.

## Set up Google Workspace

**Cowork prompt** *(Workspace admin console requires browser access):*

> Sign up for Google Workspace Business Starter at workspace.google.com for Upriver Hudson Valley. Use the recovery email "joshua@[Joshua's personal Gmail]" for the initial admin setup since the new joshua@upriverhudsonvalley.com mailbox does not exist yet. During the setup, verify domain ownership by adding the TXT record Workspace shows you to the upriverhudsonvalley.com Cloudflare zone (use the Cloudflare MCP if available, or pause and ask me to do it manually). Once domain ownership is verified, configure MX records by replacing whatever Squarespace had with Workspace's MX records. Create three user accounts: joshua@upriverhudsonvalley.com (Joshua), dev@upriverhudsonvalley.com (Anne-Marie), office@upriverhudsonvalley.com (Megan — note this mailbox already exists if Squarespace email was previously routing it; in that case import the existing messages or set up forwarding). Create three group aliases: hello@upriverhudsonvalley.com delivering to all three users; clients@upriverhudsonvalley.com delivering to Joshua and Anne-Marie; billing@upriverhudsonvalley.com delivering to Joshua and Megan. Pause when complete and ask me to verify by sending a test message to each address.

## Set up Apple Passwords shared groups

**Human-only.** Apple Passwords shared groups are managed through System Settings on macOS or Settings on iOS, and creating a group plus inviting members is biometric-locked to Joshua's Apple ID. Allow ten minutes per device.

The steps are: open System Settings, click Passwords, click Get Started under Shared Groups, name the first group "Upriver" and add Anne-Marie's and Megan's Apple IDs. Repeat for "Upriver — Clients." Once members accept the invitation on their devices, all three operators see the same passwords. After the groups exist, every secret currently in Joshua's personal Apple Passwords that should be team-accessible gets moved into the appropriate shared group.

## Sign up Claude Team

**Cowork prompt:**

> Open claude.ai and sign in with joshua@upriverhudsonvalley.com. Upgrade to Claude Team. The plan I want is the standard $25/seat/month plan for three seats. Pay with the Chase Ink Business Cash card I will paste in when prompted. After billing is set, invite anne-marie@... wait, invite dev@upriverhudsonvalley.com and office@upriverhudsonvalley.com to the workspace. Set the workspace name to "Upriver." Confirm the workspace exists and report back the workspace URL.

After this, each operator runs `claude logout` then `claude login` on their own machine and selects the new Workspace account during the device pairing flow.

## Sign up Slack Free

**Cowork prompt:**

> Sign up for a new Slack workspace at slack.com using joshua@upriverhudsonvalley.com. The workspace name is "Upriver" and the URL slug is "upriverhv" (or upriverhudsonvalley if the shorter slug is taken). Stay on the Free tier. Configure SSO sign-in via Google Workspace so the @upriverhudsonvalley.com identities are authoritative. Create the following channels: #general, #engineering, #sales, #alerts, #random. Pin a brief welcome message in #general explaining the channel structure. Invite dev@upriverhudsonvalley.com and office@upriverhudsonvalley.com. Report back the workspace URL.


---


# Phase 2 — Engineering migration

## Configure GitHub organization

**Claude Code prompt** *(uses the GitHub MCP):*

> The lifeupriver GitHub org needs configuration for a small team operating on the Free tier. Do the following. First, set the organization billing email to billing@upriverhudsonvalley.com. Second, create a team called "operators" if it does not exist. Third, add the following member as a Member of the operators team (after they accept the org invite, which Joshua sends manually): Anne-Marie's GitHub username (Joshua will provide). Fourth, configure the organization's default repository permission so that the operators team is granted Write by default on new repositories. Fifth, on the lifeupriver/upriver-clone repo, configure branch protection on the main branch: require pull requests, require status checks for typecheck and build to pass, disable force pushes. Sixth, create a CODEOWNERS file at the repo root assigning packages/ to Anne-Marie and docs/ to Joshua (use the GitHub usernames; ask Joshua for the right handles). Verify each change and report any that could not be completed.

## Set up Vercel team and transfer projects

**Claude Code prompt** *(uses the Vercel MCP):*

> A new Vercel team called "Upriver Hudson Valley" was just created under joshua@upriverhudsonvalley.com on the Hobby (free) tier. The existing projects "upriver-platform" and any per-client "<slug>-site" projects are in Joshua's personal Vercel team and need to be transferred to the new team. List the projects in Joshua's personal team. For each one that should move, initiate the project transfer to Upriver Hudson Valley. After each transfer, the GitHub connection needs to be re-authorized on the destination team — pause and ask Joshua to do that step in the browser. Once the projects are transferred, list the environment variables on each one and report which are present, which are missing, and which look like they need rotation. Do not modify environment variables in this prompt; that is the next step.

**Cowork prompt** *(for the GitHub re-authorization step that Vercel does not expose via API):*

> Open vercel.com and sign in as joshua@upriverhudsonvalley.com. Go to the Upriver Hudson Valley team's Settings, then Git, then "Connect with GitHub." Authorize the lifeupriver organization. Verify that recently-transferred projects show their GitHub repository connection as live. Report back when done.

## Re-paste environment variables into Vercel

**Claude Code prompt:**

> The Vercel projects upriver-platform and any per-client <slug>-site projects need their environment variables restored after the team transfer. The values live in Apple Passwords under the "Upriver — Engineering" shared group. The list of variables expected on the dashboard production environment is documented in docs/OPS.md under "Vercel (dashboard)". Paste each one into the Vercel project's Environment Variables section, scoped to Production, Preview, and Development as appropriate. Trigger a redeploy of upriver-platform and verify it builds successfully. Report any variable that you do not have a value for.

## Request Supabase project transfer

**Human-only.** Supabase project transfers go through their support flow, not through self-service. Open a ticket at supabase.com/dashboard/support requesting that project `qavbpfmhgvkhrnbqalrp` be moved from Joshua's personal organization to a new "Upriver Hudson Valley" organization. Include the new org's owner email (`joshua@upriverhudsonvalley.com`). Allow one to three business days.

## Migrate Fly.io worker app

**Claude Code prompt** *(uses flyctl CLI):*

> The Fly.io worker app `upriver-worker` currently lives in Joshua's personal Fly org. We have created a new Fly org called `upriver-hv` under joshua@upriverhudsonvalley.com. Run `fly apps move upriver-worker --org upriver-hv` to move the app. Confirm the move succeeded by running `fly status -a upriver-worker`. Then re-set the secrets listed in docs/OPS.md under "Fly.io (worker)" using the values from Apple Passwords (paste them as one `fly secrets set` invocation per the OPS.md list). After secrets are set, redeploy with `fly deploy` and verify the /healthz endpoint returns ok.

## Recreate Inngest, Resend, Backblaze, Cloudinary, Mux, Ahrefs, Loom

For each of these, the workflow is the same: sign up the new account using `joshua@upriverhudsonvalley.com`, generate fresh API keys, store them in Apple Passwords, rotate them everywhere they are used (Vercel, Fly, the local `.env.example` template), and revoke the old keys on the personal account.

**Cowork prompt template** *(parameterize the `[SERVICE]`, `[URL]`, and `[KEY_VARIABLES]` per service):*

> Sign up for a new [SERVICE] account at [URL] using joshua@upriverhudsonvalley.com. The plan is the free tier. After sign-up, complete any required onboarding (verify email, accept terms, link Chase Ink card if billing requires a card on file). Generate API credentials and capture them. The variables we need are: [KEY_VARIABLES]. Save the values into Apple Passwords under the "Upriver — Engineering" shared group with item name "[SERVICE] — Upriver." Pause and ask me to confirm before continuing. Do not yet rotate the keys in Vercel or Fly; that is a separate prompt.

For the rotation step:

**Claude Code prompt:**

> The new credentials for [SERVICE] are in Apple Passwords under "[SERVICE] — Upriver." Update the corresponding variables in the Vercel upriver-platform project (Production, Preview, Development scopes) and in Fly's upriver-worker app secrets. The variables are [KEY_VARIABLES]. After updating, redeploy upriver-platform and upriver-worker. Verify the service still works by running [VERIFICATION COMMAND, for example: `upriver doctor`, or for Resend: send a test email through the Supabase Auth flow]. Report any failures.


---


# Phase 3 — Business operations

## Set up Stripe

**Cowork prompt:**

> Sign up for Stripe at stripe.com using joshua@upriverhudsonvalley.com. Select Upriver Hudson Valley LLC as the business; provide the EIN. Bank-link to Chase Business Complete Checking via Plaid (Joshua completes Plaid login). Once the account is active, set up the following products: "Audit-only engagement" as a one-time price; "Audit + Rebuild engagement" as a one-time price (we will set the actual amount per-engagement, so create as a custom-amount product); "Retainer" as a monthly recurring subscription; the standalone deliverables (voice guide, schema build, blog topics, video plan, custom-tools proposal) as one-time custom-amount products. Enable Stripe Tax for the United States; assume nexus in New York for now. Configure the receipt email to billing@upriverhudsonvalley.com. Report the publishable key and secret key for me to add to the dashboard's environment variables.

**Claude Code prompt** *(after the Stripe account exists, to wire the webhook handler in the dashboard):*

> The Stripe account is now set up and we need to add a webhook endpoint in the dashboard that listens for invoice.paid events. Create a new file at packages/dashboard/src/pages/api/stripe/webhook.ts following the Astro endpoint pattern used elsewhere in the project. The handler should verify the webhook signature using the STRIPE_WEBHOOK_SECRET env var, parse the invoice.paid event, look up the corresponding engagement in Supabase by Stripe customer ID, and advance the engagement's pipeline phase if appropriate. Add STRIPE_PUBLISHABLE_KEY, STRIPE_SECRET_KEY, and STRIPE_WEBHOOK_SECRET to .env.example. Add the webhook URL (https://app.upriverhudsonvalley.com/api/stripe/webhook) to the Stripe dashboard via the Stripe MCP. Run typecheck and build to verify nothing breaks. Open a PR.

## Set up Attio

**Cowork prompt:**

> Sign up for Attio at attio.com using joshua@upriverhudsonvalley.com on the Free tier. Once the workspace exists, create the following custom objects: "Companies" (already exists in Attio's defaults, configure attributes: business name, domain, industry, source, lifecycle stage); "People" (already exists, configure attributes: name, email, phone, role, primary contact bool, company link); "Engagements" (new custom object, attributes: slug — text, name — text, current phase — single-select with values matching the upriver pipeline phases, dashboard URL — link, GitHub repo — text, Stripe customer ID — text, lead operator — single-select Joshua/Anne-Marie, start date — date, last advanced — date); "Deliverables" (new custom object, attributes: name — text, type — single-select audit/rebuild/retainer/voice-guide/schema-build/blog-topics/video-plan/custom-tools, price — number, status — single-select draft/sent/signed/paid/delivered, engagement link). Set up two pipelines: a "Sales" pipeline on Companies with stages Lead/Qualified/Proposal-sent/Audit-purchased/Rebuild-signed/Live/Retainer/Lost; an "Engagement" pipeline on Engagements with stages mirroring the CLI phases (init/scrape/audit/synthesize/voice/brief/interview/scaffold/clone/fixes-plan/fixes-apply/qa/launch). Invite dev@ and office@ as members. Report the workspace URL when done.

## Set up BetterStack monitors

**Claude Code prompt** *(uses the BetterStack API):*

> Sign up for BetterStack at betterstack.com using joshua@upriverhudsonvalley.com on the free tier (we want the Uptime + Status page combination on Free). Create the following monitors: a heartbeat monitor on https://app.upriverhudsonvalley.com/api/health expecting a 200 response and a JSON body containing `"ok":true`; a heartbeat monitor on https://upriver-worker.fly.dev/healthz expecting 200 and body "ok"; a heartbeat monitor on https://reports.upriverhudsonvalley.com expecting 200. Set check interval to 3 minutes. Configure alerting to send to the Slack #alerts channel via the Slack integration. Create a public status page at status.upriverhudsonvalley.com with these monitors as components. Report the status page URL and the CNAME record I need to add in Cloudflare to point status.upriverhudsonvalley.com at BetterStack's hostname.

## Set up Sentry

**Cowork prompt:**

> Sign up for Sentry at sentry.io using joshua@upriverhudsonvalley.com on the Developer (free) plan. Create an organization "Upriver Hudson Valley." Create two projects under that org: "upriver-dashboard" with the Astro/Node.js platform, and "upriver-worker" with the Express/Node.js platform. Capture the DSN for each project and save them into Apple Passwords. Invite dev@upriverhudsonvalley.com as a Member. Report the DSNs.

**Claude Code prompt** *(after Sentry is set up):*

> Sentry projects upriver-dashboard and upriver-worker now exist. The DSNs are in Apple Passwords. Wire Sentry into packages/dashboard (Astro integration) and packages/worker (Express integration) following the official @sentry/astro and @sentry/node setup guides. Add SENTRY_DSN and SENTRY_AUTH_TOKEN to .env.example. Configure source-map upload on every Vercel deploy via the Sentry Vercel integration, and on every Fly deploy via a release hook in the Dockerfile. Run typecheck and build, open a PR.

## Set up GitHub Projects for issue tracking

**Claude Code prompt** *(uses the GitHub MCP):*

> Create a GitHub Project at the lifeupriver organization level called "Upriver — All." Configure the project to pull issues from the lifeupriver/upriver-clone repository and from any lifeupriver/<slug>-site repositories that exist. Set up swimlanes by status with values Backlog, In progress, In review, Done. Configure labels for client slugs (one label per active client engagement) and for issue types (bug, feature, infra, docs). Set the default view to a Board view grouped by status, with a separate Table view available. Confirm the project URL and report it.


---


# Per-person onboarding

## Generate Anne-Marie's onboarding email

**Claude Code prompt:**

> Generate an onboarding email for Anne-Marie addressed to dev@upriverhudsonvalley.com. The email should include: a welcome paragraph; a list of every account she needs to accept invitations for (Workspace, Apple Passwords shared groups, GitHub, Vercel, Supabase, Fly, Inngest, Resend, Cloudflare, Claude Team, Slack, Attio, Cloudinary, Mux, Ahrefs, Loom, BetterStack, Sentry, Stripe read access); a local-machine setup section with the exact commands from the README's Installation section plus `cd packages/cli && npm link` for global CLI access; a pointer to docs/TEAM-WORKFLOW.md for the day-to-day rhythm and to docs/ORG-SETUP.md for context on what was set up. Format the email in plain text — no markdown — so it renders well in Gmail. Output the email body for Joshua to send.

## Generate Megan's onboarding email

**Claude Code prompt:**

> Generate an onboarding email for Megan addressed to office@upriverhudsonvalley.com. Megan is in the operations and admin role. The accounts she needs to accept invitations for are Workspace (her existing mailbox is being migrated, not freshly created — note this), Apple Passwords (operations group only), Slack, Attio (Editor access), Calendar, Kick (standard user), Stripe (read-only Dashboard access), Chase Business (view-only access for reconciliation), Vercel (Viewer for billing visibility), and Cloudflare (Billing). Explicitly note that she does not need GitHub, Supabase, Fly, Inngest, Resend, or any other engineering account. Include a brief description of the operational responsibilities: client communications, calendar management, billing reconciliation, vendor invoices, monthly Kick close. Format in plain text. Output the email body for Joshua to send.


---


# Final verification

After every wave is complete, run a single end-to-end pipeline through the migrated infrastructure to verify nothing was missed.

**Claude Code prompt:**

> We just completed the org migration. Run a full upriver pipeline on a throwaway slug called "smoke-test" to verify the migrated infrastructure works end-to-end. The steps are: `upriver init https://example.com --slug smoke-test --name "Smoke Test"`, then `upriver scrape smoke-test`, then `upriver audit smoke-test`, then `upriver synthesize smoke-test`, then `upriver sync push smoke-test`. After each command, verify the expected output exists locally under clients/smoke-test/ and report any errors. After the sync push, verify the artifacts are visible at app.upriverhudsonvalley.com/clients/smoke-test on the dashboard. Report a pass/fail for each phase. If any phase fails, do not advance — investigate the failure and report what is broken. Do not delete the smoke-test slug afterwards; we keep it as a reference for future migration validation.
