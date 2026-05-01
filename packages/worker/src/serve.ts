import express from 'express';
import { serve } from 'inngest/express';
import { inngest } from './client.js';
import { functions } from './functions/index.js';

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

const PORT = Number(process.env['PORT'] ?? 8288);

const app = express();

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
