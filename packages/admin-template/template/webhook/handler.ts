// F05 GitHub webhook handling — RETIRED TEMPLATE.
//
// The real implementation lives in the worker and is registered by default:
//
//   packages/worker/src/serve.ts                       — POST /webhook
//     HMAC (X-Hub-Signature-256) verification against GITHUB_WEBHOOK_SECRET,
//     issues/opened|labeled + change-request label filtering, delivery-id
//     replay guard. Emits `admin/change.requested`.
//
//   packages/worker/src/functions/admin-webhook.ts     — Inngest function
//     Resolves the repo against the `client_admins` allowlist (the payload
//     never chooses what gets cloned), shallow-clones, runs the
//     `upriver admin-process` agent in a credential-scrubbed subprocess, and
//     opens a DRAFT PR labeled `pending-review` (or comments + labels
//     `needs-operator` when blocked). It never merges.
//
// Per-client activation steps are generated into
// clients/<slug>/admin/OPERATOR_GUIDE.md by `upriver admin-deploy`, and
// documented in docs/OPS.md.
//
// The previous file here was an inert @ts-nocheck scaffold that trusted the
// webhook payload's clone_url, skipped signature verification, and ran git
// outside step boundaries. Do not resurrect it — extend the worker instead.

export {};
