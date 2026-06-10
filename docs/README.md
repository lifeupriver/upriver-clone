# Upriver documentation

Start with the repo [`README.md`](../README.md) for what Upriver is, setup, and env vars. Then pick by task:

## Using the product

| Doc | What it covers |
|---|---|
| [`USER-GUIDE.md`](USER-GUIDE.md) | **Start here.** Running a client engagement end to end: the pipeline walkthrough, the intake & profile engine, dashboard, deliverable distribution, retainer work, troubleshooting. |
| [`COMMAND-REFERENCE.md`](COMMAND-REFERENCE.md) | Every CLI command — flags, inputs/outputs, exit codes — grouped by function. |
| [`INTAKE-PROFILE-ENGINE.md`](INTAKE-PROFILE-ENGINE.md) | The `recon` / `profile` / `generate` engine: the Client Profile, coverage and verification gates, AI Operating System doc generation. |

## Working on the code

| Doc | What it covers |
|---|---|
| [`ARCHITECTURE.md`](ARCHITECTURE.md) | System map: the nine packages, data flow, local vs Supabase data sources, the Supabase data model, where decisions live. |
| [`TESTING.md`](TESTING.md) | Unit suites, the CLI smoke matrix, the Tier A e2e harness and wb-fixture, CI workflows, the exit-code contract. |
| [`marketing-skills-integration.md`](marketing-skills-integration.md) | The skill × command matrix and how to update/add marketing skills. |

## Operating the hosted surfaces

| Doc | What it covers |
|---|---|
| [`DEPLOYMENT-GUIDE.md`](DEPLOYMENT-GUIDE.md) | Standing up the hosted dashboard (Vercel + Supabase), migrations, Resend, worker deployment, DNS. |
| [`OPS.md`](OPS.md) | Day-to-day operations: auth/SMTP, operator allowlist, deploy/recovery, health checks, secrets. |
| [`ORG-SETUP.md`](ORG-SETUP.md) / [`SETUP-PROMPTS.md`](SETUP-PROMPTS.md) | Org-level account and tooling configuration. |

## Running the business

| Doc | What it covers |
|---|---|
| [`SALES-PLAYBOOK.md`](SALES-PLAYBOOK.md) | Pitching the engagement and the standalone deliverables. |
| [`CLIENT-ONBOARDING.md`](CLIENT-ONBOARDING.md) | The client-facing onboarding process. |
| [`EMAIL-TEMPLATES.md`](EMAIL-TEMPLATES.md) | Outbound comms templates. |
| [`TEAM-WORKFLOW.md`](TEAM-WORKFLOW.md) | Multi-operator workflow across the shared surfaces (bucket, dashboard, GitHub). |
| [`chatbot-vs-static-form-parity.md`](chatbot-vs-static-form-parity.md) | Decision record: intake chatbot vs static form. |

## History and direction

Build specs, plans, the drift report, and the current handoff prompt live in [`.planning/`](../.planning/) — specs 1–15 are shipped; the 2026-06-10 handoff (`.planning/roadmap/2026-06-10-next-phase-handoff-prompt.md`) defines specs 16–19.
