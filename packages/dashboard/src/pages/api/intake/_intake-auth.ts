/**
 * Real auth wiring for the intake routes. Lives in its own underscore module
 * (not a route) so `[slug].ts` and `[slug]/lock-scope.ts` share one resolver
 * while `_intake-handler.ts` — the module the tests import — never touches
 * `lib/auth` (which keeps `@supabase/ssr` out of the NodeNext test compile,
 * same trade as `api/portal/_portal-handler.ts`).
 */
import { getSessionUser, isOperator } from '../../../lib/auth.js';
import { getDataSource } from '../../../lib/data-source.js';
import { validateShareToken } from '../../../lib/share-token.js';
import type { IntakeRouteDeps } from './_intake-handler.js';

export const intakeRouteDeps: IntakeRouteDeps = {
  getOperator: async ({ request, cookies }) => {
    // Local data source = operator's laptop: there is no Supabase Auth (and
    // no login flow) to check against. The middleware gate makes the same
    // call — only `supabase` mode (hosted) enforces sessions.
    if (getDataSource() !== 'supabase') return { id: 'local-operator' };
    const user = await getSessionUser(request, cookies as Parameters<typeof getSessionUser>[1]);
    return user && isOperator(user) ? { id: user.id } : null;
  },
  validateToken: validateShareToken,
};
