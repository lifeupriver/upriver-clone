import type { APIRoute } from 'astro';
import { getSessionUser, isOperator } from '@/lib/auth';
import { mintShareToken, revokeShareToken } from '@/lib/share-token';
import { record as recordEvent } from '@/lib/dashboard-events';

export const prerender = false;

interface MintBody {
  slug: string;
  expiresInDays?: number | null;
  label?: string | null;
}

interface RevokeBody {
  id: string;
}

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text.length === 0) return {};
  return JSON.parse(text);
}

/**
 * POST `/api/share-tokens` — mint a new share token.
 *
 * Operator session required (the auth middleware already enforces this for
 * /api/* paths under OPERATOR_PATH_PREFIXES; we re-verify here as
 * defense-in-depth so a future routing change can't accidentally open it
 * up).
 *
 * Body shape: `{ slug: string, expiresInDays?: number | null, label?: string }`.
 * Returns: the inserted row + a ready-to-copy share URL.
 */
export const POST: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(request, cookies);
  if (!isOperator(user)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  }

  let raw: unknown;
  try {
    raw = await readJson(request);
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON body' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (!isRecord(raw)) {
    return new Response(JSON.stringify({ error: 'body must be a JSON object' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const body = raw as Partial<MintBody>;
  const slug = typeof body.slug === 'string' ? body.slug.trim() : '';
  if (!slug || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) {
    return new Response(JSON.stringify({ error: 'slug must be kebab-case' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const expiresInDays =
    typeof body.expiresInDays === 'number' && body.expiresInDays > 0
      ? Math.min(Math.floor(body.expiresInDays), 365 * 5)
      : null;
  const rawLabel = typeof body.label === 'string' ? body.label.trim() : '';
  const label = rawLabel.length > 0 ? rawLabel.slice(0, 200) : null;

  try {
    const record = await mintShareToken({
      slug,
      expiresInDays,
      label,
      createdBy: user?.id ?? null,
    });
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host') ?? new URL(request.url).host;
    const proto = request.headers.get('x-forwarded-proto') ?? new URL(request.url).protocol.replace(':', '');
    const origin = `${proto}://${host}`;
    const shareUrl = `${origin}/deliverables/${encodeURIComponent(slug)}?t=${encodeURIComponent(record.token)}`;
    await recordEvent({
      actorUserId: user?.id ?? null,
      action: 'share_token.mint',
      slug,
      payload: { tokenId: record.id, label, expiresAt: record.expiresAt },
    });
    return new Response(
      JSON.stringify({ ...record, shareUrl }),
      { status: 201, headers: { 'content-type': 'application/json' } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};

/**
 * DELETE `/api/share-tokens` — revoke a token by id (UUID). Body: `{ id }`.
 */
export const DELETE: APIRoute = async ({ request, cookies }) => {
  const user = await getSessionUser(request, cookies);
  if (!isOperator(user)) {
    return new Response(JSON.stringify({ error: 'forbidden' }), {
      status: 403,
      headers: { 'content-type': 'application/json' },
    });
  }

  let raw: unknown;
  try {
    raw = await readJson(request);
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON body' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  if (!isRecord(raw)) {
    return new Response(JSON.stringify({ error: 'body must be a JSON object' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }
  const id = typeof (raw as Partial<RevokeBody>).id === 'string'
    ? String((raw as Partial<RevokeBody>).id)
    : '';
  // Loose UUID shape check: 36 chars, hyphens at standard positions. Avoids
  // a full regex match — DB constraint is the authoritative validator.
  if (id.length !== 36) {
    return new Response(JSON.stringify({ error: 'id must be a UUID' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  try {
    await revokeShareToken(id);
    await recordEvent({
      actorUserId: user?.id ?? null,
      action: 'share_token.revoke',
      payload: { tokenId: id },
    });
    return new Response(null, { status: 204 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    });
  }
};
