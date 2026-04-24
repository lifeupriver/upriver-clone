# upriver

Productized tool suite for Upriver Consulting. Audits small business websites, produces a branded deliverable, and clones the site to Astro — all in under 4 hours of human time.

## Prerequisites

- Node 20+
- pnpm 9+
- [Firecrawl](https://firecrawl.dev) API key (`FIRECRAWL_API_KEY`)
- Google service account JSON for GSC access (`GOOGLE_SERVICE_ACCOUNT_KEY`)
- Upriver Supabase project for usage tracking (`UPRIVER_SUPABASE_URL`, `UPRIVER_SUPABASE_SERVICE_KEY`)

## Install

```bash
pnpm install
pnpm build
```

## Usage

```bash
# Initialize a new client
upriver init https://audreysfarmhouse.com --slug audreys --name "Audrey's Farmhouse"

# Discover all URLs and content inventory
upriver discover audreys

# Deep scrape (screenshots, design tokens, structured extraction)
upriver scrape audreys

# Run all 10 audit passes
upriver audit audreys

# Compile audit-package.json
upriver synthesize audreys

# Generate Claude Design handoff brief
upriver design-brief audreys

# Generate interview guide
upriver interview-prep audreys

# Process interview transcript
upriver process-interview audreys --transcript ./transcript.txt

# Generate Astro scaffold
upriver scaffold audreys

# Visual clone pass
upriver clone audreys

# Apply audit fixes
upriver fixes plan audreys
upriver fixes apply audreys --parallel

# QA against preview
upriver qa audreys --preview-url https://audreys-preview.vercel.app

# Launch checklist
upriver launch-checklist audreys
```

## Sessions

| Session | Commands | Status |
|---------|----------|--------|
| 1 | `init`, `discover` | In progress |
| 2 | `scrape` | Planned |
| 3 | `audit` (all 10 passes) | Planned |
| 4 | `synthesize`, `design-brief` | Planned |
| 5 | `interview-prep`, `process-interview` | Planned |
| 6 | Scaffold template | Planned |
| 7 | `scaffold`, `clone` | Planned |
| 8 | `fixes`, `qa`, `launch-checklist`, skills, docs | Planned |
