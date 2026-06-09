/**
 * Route binding for the operator portal-creation endpoint (Build Spec 12 §C).
 *
 * Thin wrapper: wires the real Supabase-Auth operator resolver and the live
 * share-token plumbing into the testable `handlePortalPost`. The handler logic
 * (and its tests) live in `./portal-handler.ts`; this file keeps `lib/auth` out
 * of the NodeNext test compile while still gating the route on a real operator
 * session.
 */
import type { APIRoute } from 'astro';

import { getSessionUser, isOperator } from '../../../lib/auth.js';
import { listShareTokens, mintShareToken, revokeShareToken } from '../../../lib/share-token.js';
import { handlePortalPost } from './_portal-handler.js';

export const prerender = false;

export const POST: APIRoute = async (ctx) =>
  handlePortalPost(ctx, {
    getOperator: async ({ request, cookies }) => {
      const user = await getSessionUser(request, cookies as Parameters<typeof getSessionUser>[1]);
      return user && isOperator(user) ? { id: user.id } : null;
    },
    mint: mintShareToken,
    revoke: revokeShareToken,
    listTokens: listShareTokens,
  });
