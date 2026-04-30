import { serve } from 'inngest/astro';
import { inngest, functions } from '@upriver/worker';

export const prerender = false;

/**
 * Inngest serve handler — Inngest delivers function invocations to this URL
 * (production: `https://<host>/api/inngest`). The dev server polls it as well
 * once you run `npx inngest-cli@latest dev` locally.
 *
 * The actual job logic lives in `@upriver/worker`; this route just registers
 * the function manifest and dispatches incoming step requests. No CLI is
 * spawned here — the worker container (Phase 3.5) owns that.
 */
const handler = serve({
  client: inngest,
  functions: [...functions],
});

export const GET = handler.GET;
export const POST = handler.POST;
export const PUT = handler.PUT;
