/**
 * Route binding for the operator lock-scope endpoint.
 *
 * Thin wrapper: wires the real Supabase-Auth operator resolver into the
 * testable `handleLockScope` (see `_intake-handler.ts`). Operator-only —
 * share tokens never authorize a scope lock; the action lives on the
 * `/clients/<slug>/intake` admin view.
 */
import type { APIRoute } from 'astro';

import { intakeRouteDeps } from '../_intake-auth.js';
import { handleLockScope } from '../_intake-handler.js';

export const prerender = false;

export const POST: APIRoute = async (ctx) => handleLockScope(ctx, intakeRouteDeps);
