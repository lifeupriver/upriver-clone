import express from 'express';
import { serve } from 'inngest/express';
import { inngest } from './client.js';
import { functions } from './functions/index.js';
import { verifyGithubSignature } from './webhook-verify.js';
import {
  ADMIN_CHANGE_EVENT,
  DeliveryReplayCache,
  evaluateIssuesEvent,
} from './webhook-event.js';

/**
 * Standalone HTTP entrypoint for the worker. Hosts the Inngest serve handler
 * directly inside the container, so heavy CLI dependencies (claude, Lighthouse,
 * Playwright, squirrelscan) live in the same process that runs the function
 * steps. The dashboard's `/api/enqueue` only sends events; this is the
 * receiver.
 *
 * Production: deployed on Fly.io as a long-running machine. Inngest Cloud
 * delivers function invocations to `https://<fly-app>.fly.dev/api/inngest`,
 * which is registered via the Inngest dashboard at deploy time.
 *
 * Local dev: `pnpm --filter @upriver/worker run start` plus
 * `npx inngest-cli@latest dev -u http://localhost:8288/api/inngest`.
 */

// Env contract shim: ops docs/secrets historically said
// UPRIVER_SUPABASE_SERVICE_ROLE_KEY, but @upriver/core reads
// UPRIVER_SUPABASE_SERVICE_KEY. Accept the legacy name so machines
// provisioned either way boot with working storage sync, and nag toward the
// canonical one. Runs before any function step reads the env.
const legacyServiceKey = process.env['UPRIVER_SUPABASE_SERVICE_ROLE_KEY'];
if (legacyServiceKey && !process.env['UPRIVER_SUPABASE_SERVICE_KEY']) {
  process.env['UPRIVER_SUPABASE_SERVICE_KEY'] = legacyServiceKey;
  // eslint-disable-next-line no-console
  console.warn(
    '[worker] UPRIVER_SUPABASE_SERVICE_ROLE_KEY is deprecated — set UPRIVER_SUPABASE_SERVICE_KEY instead. Value copied across for this process.',
  );
}

const PORT = Number(process.env['PORT'] ?? 8288);

const app = express();

/**
 * F05 GitHub webhook receiver. Registered BEFORE the global JSON middleware:
 * HMAC verification needs the exact raw bytes GitHub signed, and
 * `express.json` would consume/normalize the body first.
 *
 * Contract (per-client setup in clients/<slug>/admin/OPERATOR_GUIDE.md):
 *   URL https://<worker>/webhook, content type application/json,
 *   secret GITHUB_WEBHOOK_SECRET, events: Issues only.
 *
 * Fail closed: no configured secret, or a missing/malformed/mismatching
 * X-Hub-Signature-256, answers 401 with no detail. Verified-but-irrelevant
 * deliveries (pings, other events/actions, no change-request label, stale
 * payloads, replayed delivery ids) answer 204. Accepted deliveries become
 * `admin/change.requested` Inngest events; the admin-webhook function then
 * resolves the repo against the `client_admins` allowlist — nothing from the
 * payload beyond the lookup key is trusted.
 */
const seenDeliveries = new DeliveryReplayCache(500);

app.post('/webhook', express.raw({ type: '*/*', limit: '2mb' }), (req, res) => {
  void (async () => {
    const rawBody: unknown = req.body;
    if (!Buffer.isBuffer(rawBody)) {
      res.status(400).json({ ok: false });
      return;
    }

    const verdict = verifyGithubSignature(process.env['GITHUB_WEBHOOK_SECRET'], req.headers, rawBody);
    if (!verdict.ok) {
      // eslint-disable-next-line no-console
      console.warn(`[webhook] rejected delivery: ${verdict.reason}`);
      res.status(401).json({ ok: false });
      return;
    }

    // Replay guard 1/2: drop exact re-deliveries of a signed request. The id
    // is recorded only after a successful inngest.send, so a delivery that
    // failed with 5xx can still be redelivered.
    const deliveryHeader = req.headers['x-github-delivery'];
    const deliveryId = typeof deliveryHeader === 'string' ? deliveryHeader : '';
    if (deliveryId && seenDeliveries.has(deliveryId)) {
      res.status(204).end();
      return;
    }

    let payload: unknown;
    try {
      payload = JSON.parse(rawBody.toString('utf8'));
    } catch {
      res.status(400).json({ ok: false });
      return;
    }

    const eventHeader = req.headers['x-github-event'];
    const eventName = typeof eventHeader === 'string' ? eventHeader : undefined;
    // Replay guard 2/2 (stale payloads) + the issues/opened|labeled/
    // change-request gate live in evaluateIssuesEvent.
    const decision = evaluateIssuesEvent(eventName, payload, Date.now());
    if (!decision.accept) {
      res.status(204).end();
      return;
    }

    try {
      await inngest.send({
        name: ADMIN_CHANGE_EVENT,
        data: { ...decision.data, deliveryId },
      });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(`[webhook] inngest.send failed: ${err instanceof Error ? err.message : String(err)}`);
      // 500 keeps the delivery marked failed in GitHub's UI so the operator
      // can redeliver once the event key issue is fixed.
      res.status(500).json({ ok: false });
      return;
    }

    if (deliveryId) seenDeliveries.record(deliveryId);
    // eslint-disable-next-line no-console
    console.log(
      `[webhook] accepted ${decision.data.repoFullName}#${decision.data.issueNumber} (delivery ${deliveryId || 'unknown'})`,
    );
    res.status(202).json({ ok: true });
  })();
});

// `inngest/express` requires the JSON body to be pre-parsed; without this
// middleware, sync and invocation requests reach the handler with no body
// and Inngest Cloud reports "Missing body when syncing".
// Cap is generous because Inngest step state can be large for long pipelines.
app.use(express.json({ limit: '10mb' }));

const serveHost = process.env['INNGEST_SERVE_HOST'];
app.use(
  '/api/inngest',
  serve({
    client: inngest,
    functions: [...functions],
    ...(serveHost ? { serveHost } : {}),
  }),
);

/** Health probe used by Fly's checks block. */
app.get('/healthz', (_req, res) => {
  res.status(200).type('text/plain').send('ok');
});

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`[worker] listening on :${PORT} (Inngest at /api/inngest)`);
});
