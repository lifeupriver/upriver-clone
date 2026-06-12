import { z } from 'zod';

/**
 * F05 webhook event gate — pure decision logic for the `/webhook` route.
 *
 * Decides whether a (signature-verified) GitHub delivery becomes an
 * `admin/change.requested` Inngest event. Everything here is deterministic so
 * the accept/reject contract is unit-testable without HTTP or Inngest.
 *
 * Security posture: the webhook payload NEVER chooses what gets cloned. The
 * only payload-derived fields forwarded are the repo's `full_name` (used as
 * an allowlist KEY against `client_admins.repo_full_name`), the issue
 * number/title/body, and the delivery id. `clone_url` and every other
 * payload URL is deliberately dropped — the admin-webhook function rebuilds
 * the clone URL from the DB row it resolves.
 */

export const ADMIN_CHANGE_EVENT = 'admin/change.requested' as const;

/** Issue bodies are client-authored free text; cap before it enters Inngest state. */
export const ISSUE_BODY_CAP = 16_000;
export const ISSUE_TITLE_CAP = 300;

/** Deliveries older than this (by payload timestamp) are dropped as replays. */
export const MAX_EVENT_AGE_MS = 10 * 60_000;

/** The label a client request must carry to be processed at all. */
export const CHANGE_REQUEST_LABEL = 'change-request';

/** `owner/repo` — GitHub's allowed charset, no slashes beyond the separator. */
export const REPO_FULL_NAME_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;

export const adminChangePayloadSchema = z.object({
  repoFullName: z.string().regex(REPO_FULL_NAME_RE, 'must be owner/repo'),
  issueNumber: z.number().int().positive(),
  issueTitle: z.string().max(ISSUE_TITLE_CAP),
  issueBody: z.string().max(ISSUE_BODY_CAP),
  deliveryId: z.string().max(200),
});

export type AdminChangePayload = z.infer<typeof adminChangePayloadSchema>;

export type WebhookEventDecision =
  | { accept: true; data: Omit<AdminChangePayload, 'deliveryId'> }
  | { accept: false; reason: string };

/** Loose shape of the GitHub `issues` event payload — everything optional;
 * the gate validates field by field and rejects on anything unexpected. */
interface IssuesPayloadLoose {
  action?: unknown;
  issue?: {
    number?: unknown;
    title?: unknown;
    body?: unknown;
    labels?: unknown;
    updated_at?: unknown;
    created_at?: unknown;
  };
  repository?: { full_name?: unknown };
}

/**
 * Accept ONLY `issues` events with action `opened` or `labeled` whose issue
 * carries the `change-request` label, on a payload younger than 10 minutes.
 * Everything else is a quiet reject (the route answers 204).
 */
export function evaluateIssuesEvent(
  eventName: string | undefined,
  payload: unknown,
  nowMs: number,
): WebhookEventDecision {
  if (eventName !== 'issues') return { accept: false, reason: `ignored event: ${eventName ?? '(none)'}` };
  if (typeof payload !== 'object' || payload === null) {
    return { accept: false, reason: 'payload not an object' };
  }
  const p = payload as IssuesPayloadLoose;

  if (p.action !== 'opened' && p.action !== 'labeled') {
    return { accept: false, reason: `ignored action: ${String(p.action)}` };
  }

  const issue = p.issue;
  if (!issue || typeof issue !== 'object') return { accept: false, reason: 'no issue in payload' };

  const labels = Array.isArray(issue.labels) ? issue.labels : [];
  const hasLabel = labels.some(
    (l) =>
      typeof l === 'object' &&
      l !== null &&
      typeof (l as { name?: unknown }).name === 'string' &&
      (l as { name: string }).name.toLowerCase() === CHANGE_REQUEST_LABEL,
  );
  if (!hasLabel) return { accept: false, reason: `no ${CHANGE_REQUEST_LABEL} label` };

  // Replay guard, part 2: drop deliveries whose payload timestamp is older
  // than 10 minutes. `updated_at` moves on both `opened` and `labeled`;
  // unparseable/missing timestamps pass through (the "where available" rule)
  // — the delivery-id LRU still covers exact replays.
  const stamp = readTimestamp(issue.updated_at) ?? readTimestamp(issue.created_at);
  if (stamp !== null && nowMs - stamp > MAX_EVENT_AGE_MS) {
    return { accept: false, reason: 'stale delivery (payload older than 10 minutes)' };
  }

  const repoFullName = p.repository?.full_name;
  if (typeof repoFullName !== 'string' || !REPO_FULL_NAME_RE.test(repoFullName)) {
    return { accept: false, reason: 'missing or malformed repository.full_name' };
  }

  if (typeof issue.number !== 'number' || !Number.isInteger(issue.number) || issue.number <= 0) {
    return { accept: false, reason: 'missing or malformed issue.number' };
  }

  const title = typeof issue.title === 'string' ? issue.title : '';
  const body = typeof issue.body === 'string' ? issue.body : '';

  return {
    accept: true,
    data: {
      repoFullName,
      issueNumber: issue.number,
      issueTitle: title.slice(0, ISSUE_TITLE_CAP),
      issueBody: body.slice(0, ISSUE_BODY_CAP),
    },
  };
}

function readTimestamp(value: unknown): number | null {
  if (typeof value !== 'string') return null;
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : null;
}

/**
 * Replay guard, part 1: in-memory LRU of recently seen `X-GitHub-Delivery`
 * ids. Single-instance only (one Fly machine today) — a re-delivered or
 * replayed request with a previously seen id is dropped. Capacity-bounded so
 * a flood cannot grow memory; eviction is oldest-first.
 *
 * `has` and `record` are separate on purpose: the route records an id only
 * AFTER the event is successfully handed to Inngest, so a delivery that
 * failed with a 5xx can be legitimately redelivered by GitHub.
 */
export class DeliveryReplayCache {
  private readonly ids = new Set<string>();

  constructor(private readonly capacity = 500) {
    if (!Number.isInteger(capacity) || capacity <= 0) {
      throw new Error('DeliveryReplayCache capacity must be a positive integer');
    }
  }

  has(id: string): boolean {
    return this.ids.has(id);
  }

  record(id: string): void {
    if (this.ids.has(id)) return;
    this.ids.add(id);
    if (this.ids.size > this.capacity) {
      // Set iterates in insertion order — first value is the oldest.
      const oldest = this.ids.values().next().value;
      if (oldest !== undefined) this.ids.delete(oldest);
    }
  }

  get size(): number {
    return this.ids.size;
  }
}
