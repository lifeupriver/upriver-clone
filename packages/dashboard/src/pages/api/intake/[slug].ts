/**
 * Route binding for the client-intake endpoint.
 *
 * Thin wrapper: wires the real Supabase-Auth operator resolver and the live
 * share-token validator into the testable `handleIntakeGet`/`handleIntakePost`
 * (see `_intake-handler.ts` for the auth model and the sanitize/merge logic).
 * The route is intentionally NOT behind the middleware operator gate — the
 * share-token client portal's `IntakeForm` calls it from browser JS with
 * `?t=<share-token>`, and the handler enforces operator-OR-token itself.
 */
import type { APIRoute } from 'astro';

import { intakeRouteDeps } from './_intake-auth.js';
import { handleIntakeGet, handleIntakePost } from './_intake-handler.js';

export const prerender = false;

export const GET: APIRoute = async (ctx) => handleIntakeGet(ctx, intakeRouteDeps);

export const POST: APIRoute = async (ctx) => handleIntakePost(ctx, intakeRouteDeps);
