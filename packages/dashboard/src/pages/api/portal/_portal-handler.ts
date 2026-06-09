/**
 * Operator portal-creation handler (Build Spec 12 §C).
 *
 * Turns "engaged client" into "client has a working portal link." Mints ONE
 * magic-link that lands the client on the coverage chatbot (intake-chat) for
 * their slug. Operator-gated; sends nothing — the operator copies the link and
 * hands it over by hand (the human-gate on client comms).
 *
 * NO new token system. The client-facing intake-chat surface sits behind TWO
 * existing gates, so the link reuses BOTH existing mechanisms with a single
 * token value:
 *   - the Postgres `share_tokens` row (mintShareToken / share-token.ts) clears
 *     the middleware `?t=` gate on /deliverables/<slug>/* (validateShareToken);
 *   - the SAME token, written to interview-share.json THROUGH the data source,
 *     clears the intake-chat page's `?token=` gate (validateInterviewToken).
 * Regenerating rotates the token — it revokes the prior portal `share_tokens`
 * row and rewrites interview-share.json — which kills the old link on both gates.
 *
 * The handler is auth-agnostic (it takes an injected `getOperator`) so it can be
 * unit-tested against the local data source; the route file wires the real
 * Supabase-Auth resolver. Keeping `lib/auth` out of this module's import graph
 * also keeps it out of the NodeNext test compile.
 */
import { resolveClientDataSource } from '../../../lib/data-source.js';
import { clientExists } from '../../../lib/fs-reader.js';
import { record as recordEvent } from '../../../lib/dashboard-events.js';
import {
  type MintShareTokenOptions,
  type ShareTokenRecord,
} from '../../../lib/share-token.js';

/** Marks a token as the client's portal link, distinct from other share links. */
export const PORTAL_LABEL = 'portal';

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

function originOf(request: Request): string {
  const host =
    request.headers.get('x-forwarded-host') ??
    request.headers.get('host') ??
    new URL(request.url).host;
  const proto =
    request.headers.get('x-forwarded-proto') ??
    new URL(request.url).protocol.replace(':', '');
  return `${proto}://${host}`;
}

/**
 * The client-facing portal URL. Carries the token as BOTH `?t=` (middleware
 * gate) and `?token=` (intake-chat page gate) — see the file header.
 */
export function portalUrl(origin: string, slug: string, token: string): string {
  const t = encodeURIComponent(token);
  return `${origin}/deliverables/${encodeURIComponent(slug)}/intake-chat?t=${t}&token=${t}`;
}

export interface PortalPostDeps {
  /** Resolve the operator for this request, or null if the caller isn't one. */
  getOperator: (ctx: { request: Request; cookies: unknown }) => Promise<{ id: string } | null>;
  /** Mint a Postgres share token (the `?t=` gate). */
  mint: (opts: MintShareTokenOptions) => Promise<ShareTokenRecord>;
  /** Revoke a Postgres share token by id (rotation). */
  revoke: (id: string) => Promise<void>;
  /** List a slug's share tokens, so prior portal tokens can be rotated out. */
  listTokens: (slug: string) => Promise<ShareTokenRecord[]>;
  now?: () => string;
}

/**
 * Testable handler. The route's `POST` injects the real share-token + auth
 * plumbing; tests inject fakes so the whole flow exercises the local data source.
 */
export async function handlePortalPost(
  ctx: { params: { slug?: string }; request: Request; cookies?: unknown },
  deps: PortalPostDeps,
): Promise<Response> {
  // Operator gate FIRST — a non-operator learns nothing about the slug.
  const operator = await deps.getOperator({ request: ctx.request, cookies: ctx.cookies });
  if (!operator) {
    return json(401, { ok: false, error: 'operator session required' });
  }

  const slug = ctx.params.slug;
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    return json(400, { ok: false, error: 'slug must be kebab-case' });
  }
  if (!(await clientExists(slug))) {
    return json(404, { ok: false, error: 'no such client' });
  }

  const origin = originOf(ctx.request);
  const now = (deps.now ?? (() => new Date().toISOString()))();

  // Rotate: revoke any prior PORTAL token(s) so the old link dies on the `?t=`
  // gate. Other share links (audit reports, etc.) for this slug are left alone.
  const prior = (await deps.listTokens(slug)).filter((t) => t.label === PORTAL_LABEL);
  const rotated = prior.length > 0;
  for (const t of prior) {
    await deps.revoke(t.id);
  }

  // Mint the new token. No expiry — the link lives until the operator
  // regenerates, mirroring the one-token interview-share model.
  const record = await deps.mint({
    slug,
    label: PORTAL_LABEL,
    expiresInDays: null,
    createdBy: operator.id,
  });

  // Persist the SAME token to interview-share.json THROUGH the data source so
  // the intake-chat page's `?token=` gate accepts it. Overwriting also kills the
  // old link's `?token=` value.
  const ds = resolveClientDataSource();
  const share = { token: record.token, createdAt: now, baseUrl: origin };
  await ds.writeClientFile(slug, 'interview-share.json', `${JSON.stringify(share, null, 2)}\n`);

  const url = portalUrl(origin, slug, record.token);

  await recordEvent({
    actorUserId: operator.id,
    action: rotated ? 'portal.regenerate' : 'portal.create',
    slug,
    payload: { tokenId: record.id, rotated },
  });

  return json(200, {
    ok: true,
    url,
    token: record.token,
    expiresAt: record.expiresAt,
    rotated,
  });
}
